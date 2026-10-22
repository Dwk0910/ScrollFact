# ScrollFact REST API · v1

기계 판독용 계약: [OpenAPI 3.1](../../backend/ScrollFact/src/main/resources/static/openapi.yaml). 구현: Spring Boot + SQLite. AI 제공자는 `AnalysisEvaluator` 인터페이스로 교체한다.

프론트엔드는 사용자가 분석 버튼을 누를 때 **현재 원문의 `document.documentElement.outerHTML` 전체**를 전달한다. 문단 분리, 요약, 주장 추출, 점수 산출, 판정, 근거 선택, watch 대상 결정은 모두 백엔드 책임이다. 프론트는 응답을 검증·표시하고 지정된 DOM 요소의 위치만 감지한다.

## 리소스와 HTTP 의미

| 메서드 | 경로 | 역할 | 성공 |
| --- | --- | --- | --- |
| POST | `/v1/analyses` | 압축 원문으로 분석 리소스 생성 | 202 + Location + Retry-After |
| GET | `/v1/analyses/{analysisId}` | 처리 상태 조회 | 200 |
| GET | `/v1/analyses/{analysisId}/result` | 완료 결과 조회 | 200, 미완료/실패는 409 |
| DELETE | `/v1/analyses/{analysisId}` | 작업 중단 및 리소스/결과 삭제 | 204 |

GET은 상태를 변경하지 않는다. DELETE는 멱등이며 이미 없는 ID에도 204를 반환한다. 삭제 후 상태/결과 GET은 404다. 생성은 비동기 처리이므로 분석 성공을 의미하지 않는다. URL에 analyze/cancel 같은 동사를 넣지 않고 리소스와 HTTP 메서드로 동작을 구분한다.

## 전송과 분석 비용

HTML을 JSON 문자열로 인라인 전송하던 방식을 **gzip 파일 업로드 + 비동기 분석 작업**으로 변경한다. HTML 내용과 DOM 구조는 보존한다. gzip은 전송량을 줄이지만 서버의 출처 검색·읽기·모델 추론 비용을 줄여 주지는 않는다. 프론트에서 본문을 제거하거나 요약해서 이 문제를 해결하지 않는다.

- 입력 범위는 현재 탭의 페이지 전체 스냅샷이다. 사이트의 모든 URL을 자동 순회한다는 의미는 아니다. 백엔드는 본문의 주장과 관련 출처 페이지를 분석한다.
- 서버는 압축 해제 → HTML 파싱 → 본문/주장/출처 추출 → 출처 확인 → 문단별/전체 결과 생성 순서로 처리한다. 전체 HTML을 그대로 LLM 프롬프트에 넣지 않는다.
- 스크립트·스타일·내비게이션 등은 서버에서 제외하고, watch 선택자는 **원래 DOM 구조 기준**으로 생성한다. DOM을 정리한 뒤 nth-of-type 경로를 새로 만들면 원문과 달라질 수 있다.
- 같은 출처 URL은 fragment를 제거해 중복을 줄이고, 성공적으로 읽은 출처 본문을 URL 기준 10분 동안 캐시한다(최대 100개). 분석 결과 캐시는 아직 없다. 출처 수집은 제한된 동시성·출처별 타임아웃·전체 작업 기한을 둔다. 출처 안의 링크를 무제한 재귀 탐색하지 않는다.
- 출처를 가져오지 못하면 실패를 진행 상태에 반영하고, 해당 문단 이유에도 검증 한계를 명시한다. 확인하지 못한 출처를 검증 완료한 근거로 취급하지 않는다.
- 출처 수집 시 http(s)만 허용하고 사설망·루프백·메타데이터 주소 및 그 주소로의 리다이렉트를 차단한다. 로그인 쿠키는 전달하지 않는다. 현재 수집기는 모든 HTTP 리다이렉트를 확인 실패로 처리하며 PDF는 읽지 않는다.

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

접수는 분석 완료를 기다리지 않고 **HTTP `202`**를 반환한다. `Location: /v1/analyses/{id}`, `Retry-After: 2`, `Cache-Control: no-store`를 제공한다. AI 제공자가 미설정이면 리소스를 생성하지 않고 503으로 응답한다.

```json
{
  "analysisId": "analysis-123",
  "snapshotId": "요청과 동일한 UUID",
  "status": "queued",
  "phase": "queued"
}
```

`GET /v1/analyses/{analysisId}` → HTTP `200`. 프론트는 2초 간격으로 이전 응답을 받은 뒤 조회한다. 서버는 `Cache-Control: no-store`를 설정한다.

```json
{
  "analysisId": "analysis-123",
  "snapshotId": "요청과 동일한 UUID",
  "status": "running",
  "phase": "checking_sources",
  "sources": { "completed": 3, "total": 12, "failed": 1 }
}
```

- 상태: `queued`, `running`, `completed`, `failed`. 삭제한 분석은 상태 대신 404를 반환한다.
- 서버 단계: `queued`(접수/대기), `extracting`(본문·주장 분리), `checking_sources`(출처 확인), `summarizing`(결과 정리). `queued` 상태는 같은 이름의 단계만 사용한다. 단계는 이 순서로 진행한다.
- 클라이언트 단계 `capturing`, `compressing`, `uploading`은 로컬 실제 작업에서 발생한다. 업로드 퍼센트나 예상 남은 시간은 추정하지 않는다.
- `sources`는 선택 항목. `completed`는 성공/실패를 포함한 처리 완료 출처 수, `failed`는 그중 확인 실패 수다. 둘 다 음이 아닌 정수이며 `failed <= completed`.
- `total`은 중복 제거된 확인 대상 수. 미확정이면 `null`, 확정되면 `completed` 이상의 정수다. 없는 값이나 null을 0/100%로 바꾸지 않는다.
- 실패: `{ "analysisId": "...", "snapshotId": "...", "status": "failed", "error": "사용자에게 보여줄 설명" }`.
- 작업/스냅샷 ID는 모든 조회와 최종 결과에서 같아야 한다.

## 완료 결과

상태 GET은 `{ "analysisId": "...", "snapshotId": "...", "status": "completed", "sources": { "completed": 5, "total": 5, "failed": 0 } }`를 반환한다. 결과를 인라인으로 포함하지 않는다. 클라이언트는 **GET `/v1/analyses/{analysisId}/result`**를 한 번 더 호출하여 아래 객체를 받는다. 결과 스키마는 `1.0`을 유지한다.

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
- `selector`: 캡처한 원문에서 정확히 하나의 HTMLElement를 가리키는 유효한 CSS 선택자. 현재 서버는 원래 DOM의 태그별 형제 순번으로 `nth-of-type` 경로를 생성한다. 새 ID를 만들어서 있다고 가정하지 않는다.
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

`DELETE /v1/analyses/{analysisId}`는 작업을 중단 요청하고 SQLite 분석 리소스와 결과를 제거한다. 항상 204를 반환하며 이후 GET은 404다. 이미 시작된 외부 요청은 자체 타임아웃까지 종료가 지연될 수 있다.

프론트는 취소, 페이지 이동, 패널 닫기, 전체 시간 초과, 진행 중 오류 발생 시 알려진 작업 ID로 최선 노력 방식의 DELETE를 보낸다. 네트워크 단절 또는 ID 수신 전 취소는 서버 삭제를 보장하지 않는다. 작업은 접수부터 10분 후 실패 처리하고, 완료/실패 결과는 30분 후 정리한다(30초 주기). 삭제/만료 후에는 기존 Idempotency-Key 보관도 끝나므로 같은 키로 새 작업이 생성될 수 있다.

결과와 진행 상태는 SQLite에 저장한다. 큐는 단일 프로세스의 메모리 큐이므로 서버 재시작 시 queued/running은 실패 상태로 전환한다. 프론트는 새로 분석하며 기존 작업 자동 재연결은 아직 없다. 작업 ID는 UUID로 발급한다. 현재 인증/소유자 구분은 없고 서버 기본 바인딩은 127.0.0.1이다. 공개 서비스 배포에는 인증과 소유자 권한 검사가 추가로 필요하다.

## 오류: Problem Details

HTTP 오류는 `Content-Type: application/problem+json`이다. 표준 필드 `type`, `title`, `status`, `detail`, `instance`와 애플리케이션 오류의 `code`를 사용한다. Spring이 처리하는 입력/메서드 오류에는 code가 없을 수 있다. 프론트는 `detail`을 표시한다.

```json
{
  "type": "urn:scrollfact:problem:evaluator_unconfigured",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "AI 분석기가 아직 연결되지 않았습니다. 서버의 분석 제공자를 설정해 주세요.",
  "instance": "/v1/analyses",
  "code": "evaluator_unconfigured"
}
```

| HTTP | 의미 |
| --- | --- |
| 400 | gzip/UTF-8/메타데이터 오류, Idempotency-Key 불일치 |
| 404 | 없는/삭제된/만료된 분석 |
| 409 | 같은 키에 다른 입력, 아직 없는 완료 결과 |
| 413 | 압축/해제 후 크기 초과 |
| 415 | multipart 또는 metadata JSON 타입 오류 |
| 422 | 빈 HTML 입력 |
| 429 | 큐/보관 개수 상한, Retry-After: 5 |
| 500 / 503 | 서버 오류 / 분석 제공자 미설정 |

이미 접수된 작업에서 본문을 찾지 못하거나 출처/분석기 처리에 문제가 생기면 상태 GET은 HTTP 200 + `status: failed` + `error`를 반환한다. 상태 리소스 조회 성공과 분석 성공을 구분한다.

## 현재 파이프라인과 제한

- 본문: `p`, `li`, `blockquote`를 원문 순서로 분리한다. 스크립트·내비게이션·숨김 속성·확장 UI를 제외하며 중첩 블록은 가장 안쪽 문단을 선택한다. 렌더링 엔진 없이 HTML을 파싱하므로 CSS로만 숨겨진 요소나 특수한 div 기반 본문은 추가 개선이 필요하다.
- 원문: 최대 200개 문단/본문 20만 자. 초과 시 작업을 실패시키며 임의로 생략하지 않는다.
- 출처: 페이지에 실제로 링크된 http(s) 자료 최대 40개, 전체 동시 요청 4개, 호스트당 연결 2개. 성공한 출처만 인용 가능하다. 검색 엔진으로 독립 출처를 찾는 기능은 아직 없다.
- 출처별: 최대 2 MiB/추출 텍스트 5만 자, HTTP 요청 15초 제한. 큰 문서·PDF·리다이렉트·차단된 주소는 실패 건수로 반영하고 결과의 판단 이유에 제한을 명시한다.
- 분석 작업: 동시 2개 + 대기 8개, SQLite 보관 최대 1,000개. 다중 서버/분산 큐는 현재 범위에 없다.
- AI: 본문과 출처 텍스트를 전달받는 제공자가 요약·점수·판정·이유를 생성한다. 백엔드는 문단 누락/중복, 점수 범위, 출처 조작을 검사하며 선택자/원문은 제공자가 바꾸지 못한다.

## 개발용 데이터와 서버 전환

샘플 응답은 **`src/sidepanel/main.tsx`의 `window.SCROLLFACT_MOCK_RESPONSE` 한 곳**에만 있다. UI 컴포넌트는 이 객체를 import하거나 샘플 데이터를 직접 만들지 않는다. 단계별 예상 진행 응답과 지연은 같은 루트의 `window.SCROLLFACT_MOCK_PROGRESS`에서 관리한다. 콘솔에서 객체를 수정하고 `다시 분석`을 눌러 상태를 확인할 수 있다.

기본 모드는 `mock`. 분석 시 실제 서버 요청은 하지 않고, 이 객체의 복사본을 응답으로 사용한다. 요청 식별자와 URL만 현재 캡처에 맞춘다. 화면에는 항상 샘플임을 표시한다. `public/demo.html`의 `#sf-demo-p1`–`#sf-demo-p4`가 샘플 선택자와 대응한다. 다른 기사에 샘플을 적용하면 위치를 찾지 못했다는 안내가 뜨는 것이 정상이다.

실제 서버를 사용하려면 `.env.local`을 설정하고 개발 서버를 재시작한다.

```dotenv
VITE_ANALYSIS_MODE=api
VITE_API_BASE_URL=http://localhost:8080
```

일반 웹 미리보기는 mock UI 확인용이다. API 모드의 실제 페이지 캡처는 Chrome 확장 프로그램에서 수행한다. API 서버는 확장 프로그램의 요청을 받을 수 있도록 접근 정책을 설정해야 한다. `VITE_` 값은 클라이언트에 노출되므로 비밀키를 넣지 않는다.

## REST 개편의 기능 차이

- 상태 응답의 result → 별도 `/result` 조회로 이동. 프론트도 수정.
- DELETE 취소 접수(202) → 작업 중단 + 리소스 삭제(204), 이후 조회 404.
- `{error}` HTTP 오류 → Problem Details의 `detail`로 변경. 비동기 실패의 `error` 필드는 유지.
- AI 제공자 미설정 시 503. 서버에서 샘플 신뢰도 점수를 만들지 않는다.

## 압축·비동기 개편의 기능 차이

- JSON의 HTML 문자열 → metadata + gzip 파일 multipart 업로드. HTML 내용은 유지.
- 동기 POST 완료 응답 → POST 202 접수 + GET 상태/결과 조회 + DELETE 취소.
- 무제한 크기 → 20 MiB 원문/5 MiB gzip 상한, 조용한 잘림 없이 오류 안내.
- 버튼 스피너 → 별도 분석 대기 화면, 실제 단계/경과 시간/출처 처리 건수 표시.
- 60초 전체 대기 → 60초 개별 요청, 10분 전체 대기. 서버 작업 수명/취소 명세 추가.
- 백엔드의 압축 해제·작업 큐·SQLite 저장·출처 수집을 구현했다. AI 제공자는 미정이며 별도 어댑터 구현/설정이 필요하다.

## 기존 버전과의 기능 차이

- 문단 텍스트 배열 전송 → 전체 HTML 전송.
- 프론트의 문단 선택/40자 필터/600자 자르기/첫 문장 요약 → 제거, 백엔드가 결정.
- 문단 인덱스에 샘플 5개 순환 배정 → 하나의 응답과 고유 문단 ID로 연결.
- 2열 카드와 두 개의 스크롤 영역 → 전체 분석 및 문단별 페이지가 이어지는 단일 스크롤.
- 페이지 전체 신뢰도 반원 게이지, 문단별 게이지, 판단 이유, CSS 선택자 watch 계약 추가.
- A/B 대립 시각, 별도 용어사전, 이전/다음 문단 요약, 전체 출처 모음·신뢰도 분포·읽기 완료율 UI 제거. 근거와 출처는 각 문단에 배치.
- Google 로그인 버튼·인증코드·리다이렉트 표시 제거. 기존 auth 소스는 후속 인증 개발 참고용으로 남겼으며 현재 앱에서 호출하지 않는다.
- 로그인 UI 제거에 따라 identity 권한을 제거했다. 툴바 아이콘은 기존 방식처럼 페이지 안의 확장 iframe 패널을 연다. 네이티브 sidePanel 진입점은 확장 HTML의 개발·배포 빌드를 위해 유지한다.


## 원격 변경 병합

원격의 HTML 저장 기능을 새 헤더의 다운로드 아이콘으로 유지한다. 로컬 HTML 저장은 분석 업로드와 별개이며, 확장 UI/하이라이트를 제거한 복사본과 DOCTYPE을 저장한다. 분석용 gzip에는 여전히 원래 outerHTML을 사용한다. 기존 Google 클라이언트 ID 환경변수 지원도 유지하지만 로그인 UI는 현재 흐름에 없다.

## 기술 참고

- [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API): 브라우저 내 gzip 처리.
- [HTTP 202 Accepted](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202): 접수와 완료를 분리하는 HTTP 응답.

- [Spring Problem Details](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html): HTTP 오류 응답.
