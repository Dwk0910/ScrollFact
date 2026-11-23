# OpenAI / Gemini 리더 연결

기본 확장은 `mode: reader`로 업로드한다. 기존 `analysis`(과거 점수 계약), `diagnostic`(AI 없는 전송 점검)은 그대로 보존한다.

## 실행

기존 8080 서버를 종료한 뒤 프로젝트 루트에서:

```bash
bash scripts/start-openai-server.sh
```

Windows PowerShell:

```powershell
.\scripts\start-openai-server.ps1
```

스크립트는 화면에 표시하지 않는 API 키 입력과 모델 ID 입력을 받는다. 값을 파일에 저장하지 않고 서버 프로세스에 전달한다. 직접 실행하려면 서버 환경변수 `OPENAI_API_KEY`, `SCROLLFACT_OPENAI_MODEL`을 설정하고 기존 bootRun을 사용해도 된다. 프론트 `VITE_*` 변수에 키를 넣지 않는다.

모델은 자신의 API 프로젝트에서 사용 가능한 Responses API + Structured Outputs 지원 모델을 지정한다. 공식 가이드의 신규 프로젝트 예시는 `gpt-6.2-astra`다. 이 저장소는 모델을 자동 선택하거나 과금 요청을 자동 실행하지 않는다.

프론트에서 `npm ci`, `npm run build` 후 확장 관리 화면에서 확장을 새로고침하고 원문 탭도 새로고침한다. 이미 빌드했다면 다시 빌드하지 않아도 된다.

설정 → 서버 주소(기본 `http://127.0.0.1:8080`) → 연결 확인. 이 버튼은 **서버 설정 유무만** 확인하며 API 키의 실제 유효성·잔액은 분석 요청 시 확인한다. 실행 모드를 `AI 분석`으로 선택하고 `이 페이지 분석하기`를 누른다. 키가 없는 경우 `페이지 전송 점검` 모드를 계속 사용할 수 있다.

## Gemini로 실행

기존 서버를 종료하고 `bash scripts/start-gemini-server.sh`를 실행한다. Windows는 ` .\scripts\start-gemini-server.ps1`을 사용한다. API 키와 모델 ID를 입력하면 서버 제공자를 Gemini로 지정한다. 모델은 자동 선택하지 않는다. Google AI Studio에서 사용 가능한 모델 ID와 무료 사용 한도를 확인한다.

직접 실행할 때는 `SCROLLFACT_AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `SCROLLFACT_GEMINI_MODEL` 세 환경변수를 설정한다. 기본 제공자는 기존 호환을 위해 `openai`이며, 두 실행 스크립트는 각각의 제공자를 명시한다. 제공자 변경 후 서버를 재시작한다. 키가 없거나 호출이 실패해도 다른 제공자로 자동 전환하지 않는다.

Gemini는 `generateContent`의 `responseMimeType: application/json`과 `responseJsonSchema`를 사용한다. 원문/출처 인용 검증과 입력·출력 상한은 OpenAI와 동일하다. 완료 이유가 STOP이 아니거나 차단·불완전·허구 인용 응답이면 결과를 표시하지 않는다. 출력 토큰 표시는 Gemini의 candidatesTokenCount + thoughtsTokenCount다. 실제 청구액을 계산하는 기능은 아니다.

[Google AI Studio 키 발급](https://aistudio.google.com/api-keys), [공식 요금표](https://ai.google.dev/gemini-api/docs/pricing), [API 문서](https://ai.google.dev/api/generate-content). 일부 모델은 무료 구간이 있지만 모델·계정별 사용 한도가 있다. 무료 구간의 입력이 제품 개선에 사용될 수 있다는 Google 안내를 확인한다.

Gemini HTTP 요청·완료/차단/한도 오류와 제공자 선택을 로컬 가짜 서버로 검사한다. 실제 Gemini API 키를 사용한 호출 및 분석 품질은 아직 검증하지 않았다.

## 요청과 반환

- 기존 gzip 업로드와 비동기 작업 API 재사용. 원문 전체 HTML은 서버로 전달하지만 선택한 AI 제공자에는 추출한 블록 ID·텍스트 및 성공적으로 수집한 출처 텍스트만 전달한다.
- Responses API `POST /v1/responses`, `store:false`, JSON Schema `strict:true`. 요청당 출력 상한 16,000토큰, 모델 입력 JSON 상한 12만 자. 초과 시 일부를 몰래 잘라내지 않고 오류를 반환한다.
- 입력 블록마다 body/opinion/auxiliary 분류와 문단 해설·구절 판단을 반환한다. 메뉴·광고·신문사 요약·기자 이메일 등 auxiliary는 읽기 화면에서 제외하고 제외 개수를 표시한다.
- 원문 ID를 서버가 다시 연결하므로 모델은 CSS 선택자나 원문을 바꿀 수 없다. 원문 블록 순서는 유지한다. **아직 여러 DOM 블록의 병합이나 한 블록의 의미 단위 분할은 하지 않는다.**
- 5분류는 자료와 일치 / 자료와 불일치 / 근거가 엇갈림 / 확인 자료 부족 / 의견·제안이다. 일치·불일치 판정에 인용 가능한 출처가 없으면 거절한다. 엇갈림은 서로 다른 출처 두 개 이상을 요구한다.
- 원문 구절 및 근거 인용이 실제 입력의 연속 부분문자열인지 검증한다. 관점도 원문에 존재하는 발언만 연결한다. 이것은 인용 무결성 검증이며 AI 해석의 의미적 정확성을 보장하지 않는다.
- 의견 게이지는 이 글에서 확인한 발언 수 기준이다. 전체 여론이나 사람 수의 통계가 아니다. 외부 웹 검색·별도 댓글 수집은 아직 없다.
- 반환된 해설과 구절별 판단은 패널에 표시된다. 원문 페이지는 문단 선택 강조를 유지하며, 원문 문장별 5색 밑줄과 해설 내부 구절 밑줄은 아직 연결하지 않았다.
- 기사 분석은 버튼을 눌렀을 때 한 번 호출한다. 스크롤/문단 이동은 기존 결과를 재사용한다. 같은 페이지를 다시 분석하면 새 API 호출이 발생한다. 교차 작업 캐시는 아직 없다.
- 응답 형식은 `schemaVersion:2.0`, `kind:reader`. passages(원문), blocks(해설/구절 판정), perspectives(발언 묶음), excludedBlocks, model, inputTokens/outputTokens를 포함한다. API 키·제공자 오류 원문은 브라우저에 반환하지 않는다.

## UI

48px 고정 헤더, 중앙 시작 화면, 패널 내부 소개·설정 dialog. 설정은 목록 첫 화면 → AI 연결·읽기 동작·고급 설정의 세부 페이지로 구성한다. 서버 주소는 유효성 검사 후 적용 버튼으로 저장한다. 서버 주소/실행 모드/원문 따라가기 설정은 확장 origin의 localStorage에 저장한다. 설정에는 비밀키가 없다. OpenAI 또는 Gemini API 서버 연결이며 ChatGPT 계정 OAuth 로그인은 구현하지 않았다.

## 검증과 한계

OpenAI HTTP 계약 테스트는 로컬 가짜 제공자 서버로 수행한다. 정상 JSON, 미완성, 거절, 한도 오류, 원문 누락·허구 인용·근거 없는 사실 판정·중복 관점을 검사한다. 서버 통합 테스트로 auxiliary 제외와 원문 위치 보존을 확인한다. 실제 Whale에서는 소개/설정/전송 점검과 문단 이동을 확인했다.

현재 개발 환경에 실제 API 키가 없어 **OpenAI 실호출과 분석 품질은 아직 검증하지 못했다.** 키 설정 후 본문 구분, 해설의 귀속/근거, 실제 발언의 관점 묶음을 사람이 검토해야 한다.

공식 참고: [Quickstart](https://developers.openai.com/api/docs/quickstart), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

설정 디자인 참고: [TDS ListRow](https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-components/), [Apple Settings](https://developer.apple.com/design/human-interface-guidelines/settings), [Apple Lists](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables). 라이브러리 의존성을 추가하지 않고 행 구성·계층 탐색 패턴을 참고했다.

설정 브라우저 검사: dist를 4174에서 제공한 뒤 `node frontend/tests/reader-settings.mjs`. 필요시 `SCROLLFACT_PLAYWRIGHT_MODULE`, `SCROLLFACT_BROWSER_PATH`, `SCROLLFACT_PREVIEW_URL`, `SCROLLFACT_UI_DIR`로 환경을 지정한다. 서버 상태 API는 스텁이며 실제 AI 호출 검사가 아니다.

## 설정 화면에서 연결 (최신)

서버 실행 후 확장 설정 → AI 연결에서 제공자·API 키를 입력하고 **모델 목록 불러오기 → 모델 선택 → 연결 적용**한다. 서버가 제공자의 모델 목록 API를 조회하고 선택한 ID가 목록에 있는지 다시 확인한 뒤 원자적으로 적용한다. 모델 목록 확인만으로 생성 권한·과금·한도를 보장하지 않는다. Gemini는 최신 적용 절차에서 짧은 생성 검사를 추가로 수행한다. API 키는 입력 중 React 메모리에만 있으며 적용 시 지우고, 서버 메모리에만 유지한다. 서버 재시작 시 UI 설정은 사라지고 환경변수 설정으로 돌아간다. 브라우저 저장소나 DB에 키를 보관하지 않는다. 키 설정 API는 로컬 접속만 허용한다. 기존 환경변수와 시작 스크립트도 계속 지원한다.

Gemini HTTP 실패는 HTTP 상태·Google 상태 코드·모델 ID·오류 UUID를 기록한다. 화면의 오류 번호로 서버 작업 디렉터리의 `logs/scrollfact.log`에서 찾을 수 있다. 제공자 자유 형식 오류 본문·기사·키는 기록하지 않는다. `SCROLLFACT_LOG_FILE`로 위치를 바꿀 수 있다. 기존 버전이 버린 오류 원문은 소급 복원할 수 없다.

## ID 계정과 영구 저장 (최신 — 위 메모리 전용 설명을 대체)

설정 → 계정에서 ID로 로그인한다. 최초 ID는 바로 생성하며 비밀번호는 없다. **이 컴퓨터의 로컬 프로필 구분이며 사용자 인증/접근 통제가 아니다.** 같은 서버의 모든 탭에 활성 계정이 공유된다. 실제 다중 사용자 서비스로 외부에 공개하면 안 된다.

계정별 provider/model/API 키, 원문 따라가기 및 실행 모드를 로컬 SQLite `local_profiles`에 저장한다. 마지막 활성 계정은 서버 시작 시 복원된다. 로그아웃하면 자동 복원을 해제한다. 읽기 옵션은 로그인한 계정에 저장하고, 서버 주소는 이 브라우저에 유지한다. 접수된 분석은 접수 당시의 제공자 연결을 고정한다.

키는 DB에 평문으로 쓰지 않는다. macOS는 OS 로그인 키체인의 무작위 256비트 마스터 키 + AES-GCM(프로필 ID/제공자를 인증 데이터로 결합), Windows는 DPAPI CurrentUser로 암호화한다. 키체인 항목 서비스는 `org.scrollfact.local-profile-master.v1`, 계정은 `master`다. 키체인이 잠겨 있거나 지원하지 않는 OS이면 저장을 거절하며 평문으로 대체하지 않는다. 프로세스 인수/로그/브라우저 저장소로 키를 전달하지 않는다. API 키는 사용 시 서버 메모리에 존재한다.

같은 컴퓨터·OS 계정·DB에서 재시작하면 재입력할 필요가 없다. 다른 컴퓨터로 DB만 복사하면 복호화되지 않으므로 새로 키를 등록해야 한다. 모델 목록 조회도 저장된 키를 서버에서 재사용하며 키를 브라우저에 반환하지 않는다. 제공자 변경은 현재 프로필의 단일 연결을 교체한다. `저장된 키 삭제`는 프로필의 암호문을 지우고 분석 연결을 해제한다.

추가 로컬 전용 API: GET `/v1/reader/profile`, JSON POST `/profile/login` (`id`), `/profile/logout`, `/profile/preferences` (`id, follow, mode`), `/profile/forget-key` (`id`). 기존 models/configuration 요청은 `profileId`를 포함하며 빈 apiKey이면 같은 프로필/제공자의 저장 키를 사용한다. 계정 변경으로 요청 ID가 달라지면 409로 거절한다.

검증: 실제 macOS 키체인에 테스트용 항목을 생성, 새 인스턴스 복호화/다른 프로필 복호화 거절 확인 후 항목 삭제. SQLite 저장·복원, 프로필 분리, 키 저장 실패, UI 로그인/전환/재사용 검증. Windows DPAPI는 구현했으나 Windows 실기기 미검증이다. 테스트용 모델/API 응답을 사용했으며 실제 Gemini 생성 성공을 의미하지 않는다.

## Gemini 404 재발 방지 (최신)

모델 목록/GET 모델 조회가 성공해도 해당 키의 생성 권한을 보장하지 않는다. 실제 gemini-2.5-flash-lite는 GET200 뒤 POST404와 신규 사용자 접근 제한 사유를 반환했다. [Google 공식 안내](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) 참고. Google 응답의 대체 모델 gemini-3.5-flash-lite로 실제 JSON 생성 및 ScrollFact 2문단 분석 성공을 확인했다.

Gemini의 `연결 적용`은 저장 전에 짧은 JSON 생성 요청(출력 상한1,024토큰)을 수행한다. 소량의 API 사용량이 발생하며 무료/유료 여부는 해당 프로젝트 요금제에 따른다. 실패 시 기존 연결과 저장 키/모델을 유지한다. 모델을 자동으로 바꿔 호출하지 않는다. OpenAI 적용은 기존 목록 검증을 유지한다. 이 검사는 접근권한·간단한 JSON 출력을 확인하며 기사 분석 품질 전체를 보장하지 않는다.
