# ScrollFact 분석 API · v1

프론트엔드는 사용자가 분석 버튼을 누를 때 **현재 원문의 `document.documentElement.outerHTML` 전체**를 전달한다. 문단 분리, 요약, 주장 추출, 점수 산출, 판정, 근거 선택, watch 대상 결정은 모두 백엔드 책임이다. 프론트는 응답을 검증·표시하고 지정된 DOM 요소의 위치만 감지한다.

## 전송과 분석 비용

HTML을 JSON 문자열로 인라인 전송하던 방식을 **gzip 파일 업로드 + 비동기 분석 작업**으로 변경한다. HTML 내용과 DOM 구조는 보존한다. gzip은 전송량을 줄이지만 서버의 출처 검색·읽기·모델 추론 비용을 줄여 주지는 않는다. 프론트에서 본문을 제거하거나 요약해서 이 문제를 해결하지 않는다.

- 입력 범위는 현재 탭의 페이지 전체 스냅샷이다. 사이트의 모든 URL을 자동 순회한다는 의미는 아니다. 백엔드는 본문의 주장과 관련 출처 페이지를 분석한다.
- 서버는 압축 해제 → HTML 파싱 → 본문/주장/출처 추출 → 출처 확인 → 문단별/전체 결과 생성 순서로 처리한다. 전체 HTML을 그대로 LLM 프롬프트에 넣지 않는다.
- 스크립트·스타일·내비게이션 등은 서버에서 제외하고, watch 선택자는 **원래 DOM 구조 기준**으로 생성한다. DOM을 정리한 뒤 nth-of-type 경로를 새로 만들면 원문과 달라질 수 있다.
- 같은 출처 URL은 중복 제거하고 URL/콘텐츠 해시/분석 버전 기반 캐시를 사용한다. 출처 수집은 제한된 동시성·출처별 타임아웃·전체 작업 기한을 둔다. 출처 안의 링크를 무제한 재귀 탐색하지 않는다.
- 출처를 가져오지 못하면 실패를 진행 상태에 반영하고, 해당 문단 이유에도 검증 한계를 명시한다. 확인하지 못한 출처를 검증 완료한 근거로 취급하지 않는다.
- 출처 수집 시 http(s)만 허용하고 사설망·루프백·메타데이터 주소 및 그 주소로의 리다이렉트를 차단한다. 로그인 쿠키는 전달하지 않는다.

## 요청: 압축 파일로 접수

`POST {VITE_API_BASE_URL}/v1/analyses`

- `Content-Type: multipart/form-data; boundary=...` — 브라우저 FormData가 생성하므로 직접 설정하지 않는다.
- `Idempotency-Key: <snapshotId>` — 같은 키로 다시 접수하면 기존 작업을 반환하며 중복 작업을 만들지 않는다. 같은 키에 다른 입력이면 `409`.
- `metadata`: `metadata.json`, `application/json` 파트.
- `document`: `document.html.gz`, gzip 압축 바이너리 파트. base64로 변환하지 않는다. 요청 전체의 `Content-Encoding`은 설정하지 않는다.

metadata:

```json
{
  "snapshotId": "클라이언트가 이번 캡처에 생성한 UUID",
  "url": "https://example.com/article",
  "title": "document.title",
  "htmlBytes": 1240000,
  "encoding": "gzip"
}
```

`document`를 해제한 UTF-8 내용은 원문 탭의 `document.documentElement.outerHTML`과 동일하다. DOCTYPE, iframe 내부 문서, Shadow DOM 내부는 포함되지 않는다. ScrollFact 호스트/표시용 속성이 포함될 수 있으며 서버가 제외한다. 프론트에서 잘라 보내거나 문단을 선별하지 않는다.

상한은 **해제 후 HTML 20 MiB, 압축 파일 5 MiB**이다(1 MiB = 1,048,576 bytes). 프론트는 원문 크기를 탭 메시지 전송 전에도 검사하며 초과 시 안내한다. 서버도 metadata를 믿지 말고 압축 해제 중 누적 바이트를 검사하고 초과 시 `413`으로 중단한다. 프록시의 전체 multipart 요청 한도는 메타데이터와 경계 문자열을 고려해 6 MiB 이상으로 설정한다. 상한은 자원 보호를 위한 초기값이며 실제 페이지 측정 후 프론트/서버가 함께 변경한다.

## 작업 접수·진행 상태

접수는 분석 완료를 기다리지 않고 **HTTP `202`**를 반환한다.

```json
{
  "analysisId": "analysis-123",
  "snapshotId": "요청과 동일한 UUID",
  "status": "queued",
  "phase": "queued"
}
```

`GET /v1/analyses/{analysisId}` → HTTP `200`. 프론트는 1.5초 간격으로 이전 응답을 받은 뒤 조회한다. 서버는 `Cache-Control: no-store`를 설정한다.

```json
{
  "analysisId": "analysis-123",
  "snapshotId": "요청과 동일한 UUID",
  "status": "running",
  "phase": "checking_sources",
  "sources": { "completed": 3, "total": 12, "failed": 1 }
}
```

- 상태: `queued`, `running`, `completed`, `failed`, `cancelled`.
- 서버 단계: `queued`(접수/대기), `extracting`(본문·주장 분리), `checking_sources`(출처 확인), `summarizing`(결과 정리). `queued` 상태는 같은 이름의 단계만 사용한다. 단계는 이 순서로 진행한다.
- 클라이언트 단계 `capturing`, `compressing`, `uploading`은 로컬 실제 작업에서 발생한다. 업로드 퍼센트나 예상 남은 시간은 추정하지 않는다.
- `sources`는 선택 항목. `completed`는 성공/실패를 포함한 처리 완료 출처 수, `failed`는 그중 확인 실패 수다. 둘 다 음이 아닌 정수이며 `failed <= completed`.
- `total`은 중복 제거된 확인 대상 수. 미확정이면 `null`, 확정되면 `completed` 이상의 정수다. 없는 값이나 null을 0/100%로 바꾸지 않는다.
- 실패: `{ "analysisId": "...", "snapshotId": "...", "status": "failed", "error": "사용자에게 보여줄 설명" }`.
- 취소: `{ "analysisId": "...", "snapshotId": "...", "status": "cancelled" }`.
- 작업/스냅샷 ID는 모든 조회와 최종 결과에서 같아야 한다.

## 완료 결과

GET 응답은 `{ "analysisId": "analysis-123", "snapshotId": "...", "status": "completed", "result": <아래 객체> }`다. 완료 결과 스키마는 기존 `1.0`을 유지하되 전송/작업 계약은 비호환 변경이다.

```json
{
  "schemaVersion": "1.0",
  "analysisId": "analysis-123",
  "snapshotId": "요청과 동일한 UUID",
  "document": {
    "url": "https://example.com/article",
    "title": "분석한 글의 제목"
  },
  "overview": {
    "score": 78,
    "status": "good",
    "summary": "백엔드가 생성한 페이지 전체 요약과 종합 판단."
  },
  "sections": [
    {
      "id": "paragraph-1",
      "selector": "article > section:nth-of-type(1) > p",
      "title": "백엔드가 붙인 문단 제목",
      "excerpt": "해당 원문의 문단 본문",
      "score": 92,
      "status": "high",
      "summary": "해당 문단의 요약과 판단",
      "reasons": [
        { "title": "자료의 일관성", "detail": "어떤 근거로 점수를 부여했는지 설명." }
      ],
      "sources": [
        {
          "title": "참고한 자료의 제목",
          "publisher": "발행기관 또는 매체",
          "url": "https://example.com/report"
        }
      ]
    }
  ]
}
```

### 필드 규칙

- `score`: 0–100 정수. 전체 점수는 **백엔드의 종합 평가**이며 프론트에서 문단 점수 평균으로 계산하지 않는다.
- `status`: `high`, `good`, `caution`, `low`, `danger` 중 하나. 점수와 판정 기준은 백엔드에서 정한다. 프론트는 점수로 판정을 추정하거나 덮어쓰지 않는다.
- `overview.summary`, 문단 `title`, `excerpt`, `summary`: 비어 있지 않은 문자열. 프론트에서 첫 문장 추출이나 요약을 하지 않는다.
- `sections`: 원문 순서대로 배열. 백엔드가 나눈 문단마다 하나의 분석 페이지를 만든다. 비어 있으면 전체 분석과 문단 없음 안내를 표시한다.
- `sections[].id`: 응답 내에서 고유한 비어 있지 않은 문자열. 페이지 이동과 원문 watch를 연결한다.
- `selector`: 캡처한 원문에서 정확히 하나의 HTMLElement를 가리키는 유효한 CSS 선택자. 안정적인 기존 ID를 우선하고, 없으면 원문 DOM 경로를 사용한다. 새 ID를 만들어서 있다고 가정하지 않는다.
- `html`, `body`, `script`, `style`, `noscript`, `iframe`, ScrollFact 자체 호스트는 watch 대상으로 사용할 수 없다.
- `reasons`, `sources`: 배열이며 없으면 `[]`. 빈 경우 각각 이유/출처가 없음을 표시한다.
- 출처의 `title`, `publisher`는 비어 있지 않은 문자열이고 `url`은 절대 `http(s)` URL이어야 한다. 프론트는 링크만 표시하며 출처를 자동으로 요청하지 않는다.
- 응답은 HTML이 아닌 데이터다. 문구는 텍스트로 렌더링한다.

| status | 사용자 표시 | 게이지 색 |
| --- | --- | --- |
| high | 신뢰도 높음 | 초록 |
| good | 신뢰도 양호 | 초록 |
| caution | 주의 필요 | 노랑/황색 |
| low | 신뢰도 낮음 | 빨강 |
| danger | 위험 | 빨강 |

## 프론트 처리 흐름

1. 클릭한 패널이 속한 원문 탭에서 HTML과 새 `snapshotId`를 받는다.
2. 전체 HTML을 gzip 파일로 전송하고 작업 상태를 조회한다. 별도 분석 대기 화면에서 실제 단계, 경과 시간, 확인한 출처 수를 표시한다. 요청 하나는 60초, 전체 대기는 최대 10분이다. 취소/페이지 변경 시 대기를 중단하고 재시도를 지원한다.
3. 응답의 구조, 점수 범위, ID 중복, 출처 URL 형식 및 `snapshotId`/페이지 URL 일치를 검증한다. 이전 요청이나 다른 페이지의 결과는 표시하지 않는다.
4. 응답 `selector`를 원문에 등록한다. 0개 또는 여러 요소와 매칭되거나 잘못된 선택자는 동기화 대상에서 제외하고 안내한다. 분석 내용은 남는다.
5. 먼저 전체 신뢰도 게이지를 보여 준다. 원문을 스크롤하면 화면 중앙 근처의 지정 요소에 맞는 분석 페이지로 부드럽게 이동한다.
6. 패널 내부도 하나의 세로 스크롤 영역이다. 페이지 스냅, 하단 문단 탐색, PageUp/PageDown/Home/End를 지원한다. 긴 문단의 상세 내용은 끝까지 스크롤할 수 있다.
7. `원문 따라가기`를 끄면 원문 스크롤에 따른 패널 자동 이동을 멈춘다. `원문에서 이 문단 보기`는 해당 요소로 원문을 이동한다.
8. 원문 URL이 바뀌거나 등록한 요소의 텍스트가 변경되면 결과를 무효화하고 재분석을 안내한다. 같은 텍스트의 DOM 요소 교체는 선택자로 다시 연결한다.
9. 접기는 분석 상태를 유지한다. 닫기는 감지 작업을 정리하며, 다시 열면 새로 분석한다. 원문 새로고침 후에도 새로 분석한다.

## 취소와 작업 수명

`DELETE /v1/analyses/{analysisId}`는 멱등 취소 요청이다. 서버는 `202`로 접수하고 가능한 진행 작업·출처 요청을 중단한다. 이미 끝난 작업에는 `204`로 응답할 수 있다. 작업 ID는 추측하기 어렵게 발급하고, 인증 도입 시 작업 조회/취소 권한을 소유자로 제한한다.

프론트는 취소, 페이지 이동, 패널 닫기, 전체 시간 초과, 진행 중 오류 발생 시 알려진 작업 ID로 최선 노력 방식의 DELETE를 보낸다. 네트워크 단절 또는 ID 수신 전 취소는 서버 중단을 보장하지 않는다. 서버는 접수부터 최대 10분 작업 기한과 완료/실패 후 30분 보관 TTL을 두어 고아 작업을 정리해야 한다. 클라이언트는 자동 재접수하지 않고 사용자의 다시 분석으로 새 스냅샷을 만든다. 패널 닫기/새로고침 후 기존 작업 재연결은 현재 범위에 없다.

## 오류

```json
{ "error": "사용자에게 보여줄 짧은 오류 설명" }
```

| HTTP | 예시 |
| --- | --- |
| 400 | html 또는 URL 누락/잘못된 입력 |
| 413 | 서버가 지원하는 HTML 크기 초과 |
| 422 | 분석할 본문을 찾지 못함 |
| 429 | 요청량 초과 |
| 500 / 503 | 분석 실패 / 일시적인 서버 문제 |

POST 성공은 202, GET 성공은 200이다. 만료/없는 작업은 404 또는 410을 반환한다. 과거의 POST 200 + 최종 결과 응답은 더 이상 지원하지 않는다. SSE/WebSocket/로그인은 포함하지 않는다.

## 개발용 데이터와 서버 전환

샘플 응답은 **`src/sidepanel/main.tsx`의 `window.SCROLLFACT_MOCK_RESPONSE` 한 곳**에만 있다. UI 컴포넌트는 이 객체를 import하거나 샘플 데이터를 직접 만들지 않는다. 단계별 예상 진행 응답과 지연은 같은 루트의 `window.SCROLLFACT_MOCK_PROGRESS`에서 관리한다. 콘솔에서 객체를 수정하고 `다시 분석`을 눌러 상태를 확인할 수 있다.

기본 모드는 `mock`. 분석 시 실제 서버 요청은 하지 않고, 이 객체의 복사본을 응답으로 사용한다. 요청 식별자와 URL만 현재 캡처에 맞춘다. 화면에는 항상 샘플임을 표시한다. `public/demo.html`의 `#sf-demo-p1`–`#sf-demo-p4`가 샘플 선택자와 대응한다. 다른 기사에 샘플을 적용하면 위치를 찾지 못했다는 안내가 뜨는 것이 정상이다.

실제 서버를 사용하려면 `.env.local`을 설정하고 개발 서버를 재시작한다.

```dotenv
VITE_ANALYSIS_MODE=api
VITE_API_BASE_URL=http://localhost:8080
```

일반 웹 미리보기는 mock UI 확인용이다. API 모드의 실제 페이지 캡처는 Chrome 확장 프로그램에서 수행한다. API 서버는 확장 프로그램의 요청을 받을 수 있도록 접근 정책을 설정해야 한다. `VITE_` 값은 클라이언트에 노출되므로 비밀키를 넣지 않는다.

## 압축·비동기 개편의 기능 차이

- JSON의 HTML 문자열 → metadata + gzip 파일 multipart 업로드. HTML 내용은 유지.
- 동기 POST 완료 응답 → POST 202 접수 + GET 상태/결과 조회 + DELETE 취소.
- 무제한 크기 → 20 MiB 원문/5 MiB gzip 상한, 조용한 잘림 없이 오류 안내.
- 버튼 스피너 → 별도 분석 대기 화면, 실제 단계/경과 시간/출처 처리 건수 표시.
- 60초 전체 대기 → 60초 개별 요청, 10분 전체 대기. 서버 작업 수명/취소 명세 추가.
- 이 변경은 프론트와 계약만 구현했다. 백엔드의 압축 해제·작업 큐·캐시·출처 분석 구현은 별도다.

## 기존 버전과의 기능 차이

- 문단 텍스트 배열 전송 → 전체 HTML 전송.
- 프론트의 문단 선택/40자 필터/600자 자르기/첫 문장 요약 → 제거, 백엔드가 결정.
- 문단 인덱스에 샘플 5개 순환 배정 → 하나의 응답과 고유 문단 ID로 연결.
- 2열 카드와 두 개의 스크롤 영역 → 전체 분석 및 문단별 페이지가 이어지는 단일 스크롤.
- 페이지 전체 신뢰도 반원 게이지, 문단별 게이지, 판단 이유, CSS 선택자 watch 계약 추가.
- A/B 대립 시각, 별도 용어사전, 이전/다음 문단 요약, 전체 출처 모음·신뢰도 분포·읽기 완료율 UI 제거. 근거와 출처는 각 문단에 배치.
- Google 로그인 버튼·인증코드·리다이렉트 표시 제거. 기존 auth 소스는 후속 인증 개발 참고용으로 남겼으며 현재 앱에서 호출하지 않는다.
- 로그인 UI 제거에 따라 identity 권한을 제거했다. 툴바 아이콘은 기존 방식처럼 페이지 안의 확장 iframe 패널을 연다. 네이티브 sidePanel 진입점은 확장 HTML의 개발·배포 빌드를 위해 유지한다.


## 기술 참고

- [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API): 브라우저 내 gzip 처리.
- [HTTP 202 Accepted](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202): 접수와 완료를 분리하는 HTTP 응답.
