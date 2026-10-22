# ScrollFact backend

Spring Boot 3.5 + SQLite 기반 비동기 분석 REST API. 원문 처리/출처 수집/작업 수명주기는 구현되어 있고, 실제 AI 요약·신뢰도 점수 산출기는 교체 가능한 인터페이스로 분리되어 있습니다. **현재 특정 AI 제공자는 연결하지 않았습니다.**

## 실행과 검증

저장소 루트에서 JDK 17 이상을 사용합니다.

```bash
./gradlew :backend:test :backend:bootJar
./gradlew :backend:bootRun
```

기본 주소는 `http://127.0.0.1:8080`. 기본 SQLite 파일은 실행 디렉터리의 `scrollfact.db`이며 Git에서 제외됩니다. IDE 설정·DB·빌드 결과는 로컬에 그대로 남습니다. 백엔드 폴더의 기존 wrapper도 보존했지만, 통합 개발은 루트 wrapper(Gradle 9.8)를 기준으로 합니다.

| 설정 | 기본값 / 용도 |
| --- | --- |
| PORT | 8080 |
| SCROLLFACT_BIND_ADDRESS | 127.0.0.1 |
| SCROLLFACT_DB_URL | jdbc:sqlite:./scrollfact.db |
| SCROLLFACT_EVALUATOR_URL | 미설정; 별도 분석 어댑터의 전체 URL |
| SCROLLFACT_EVALUATOR_TOKEN | 미설정; 어댑터용 Bearer 토큰 |
| SCROLLFACT_CORS_ORIGINS | localhost:5173, 127.0.0.1:5173, chrome-extension://* |

위 값은 프로세스 환경변수입니다. Spring은 `.env`를 자동으로 로드하지 않습니다. AI 키는 프론트의 VITE 변수에 넣지 않습니다.

## REST 계약

- `POST /v1/analyses`: metadata JSON + gzip 파일, 202 및 Location.
- `GET /v1/analyses/{id}`: 상태 조회.
- `GET /v1/analyses/{id}/result`: 완료 결과. 준비 전 409.
- `DELETE /v1/analyses/{id}`: 작업 중단/삭제, 204. 이후 조회 404.

[상세 명세](../../frontend/docs/backend-api.md) · [OpenAPI](src/main/resources/static/openapi.yaml). 실행 중 `/openapi.yaml`에서도 확인할 수 있습니다. HTTP 오류는 Problem Details입니다.

## AI 없이 프론트 연결 점검

1. 루트에서 `./gradlew :backend:bootRun`을 실행합니다. AI 관련 환경변수는 필요 없습니다.
2. 별도 터미널에서 `cd frontend && npm run dev`를 실행합니다.
3. `http://127.0.0.1:5173/integration.html`에서 **업로드부터 점검하기**를 누릅니다.

`mode: diagnostic`으로 실제 HTML gzip 업로드, 문단 추출, 출처 수집과 상태 조회를 실행합니다. AI 요약·신뢰도 점수는 만들지 않습니다. 결과에는 문단의 원문/선택자와 출처별 수집 성공/실패가 들어갑니다. 기본 analysis 모드의 AI 미설정 503 동작은 유지합니다. 입력 예제는 프론트 루트 TSX에서 관리하고 공용 API 클라이언트와 로딩 화면을 사용합니다.

점검용 DB를 따로 쓰려면 `SCROLLFACT_DB_URL=jdbc:sqlite:/private/tmp/scrollfact-integration.db ./gradlew :backend:bootRun`으로 실행합니다. 프론트 API 검증은 `cd frontend && npm run test:api`입니다. 백엔드 실행 후 `npm run test:live`를 실행하면 같은 프론트 클라이언트로 실제 업로드·조회·CORS·중복 요청·취소를 검증합니다. 공개 출처를 실제 요청하며 테스트 결과는 서버 보관 기한 뒤 삭제됩니다. 이 검사는 브라우저 클릭이나 화면 배치를 검증하지 않습니다.

## AI 제공자 연결

`analysis/AnalysisEvaluator.java`를 구현하면 파이프라인과 HTTP API를 바꾸지 않고 제공자를 교체할 수 있습니다. 기본 `HttpAnalysisEvaluator`는 외부 어댑터에 아래 JSON을 POST합니다. **이 URL은 OpenAI/Gemini 등의 원래 API 주소를 직접 받는 설정이 아닙니다.** 제공자 SDK를 쓰는 Java 구현을 만들거나, 아래 계약을 해당 제공자 API로 변환하는 별도 서비스를 연결합니다.

입력:

```json
{
  "document": { "url": "https://example.com/article", "title": "기사 제목" },
  "passages": [{ "id": "section-1", "selector": "html:nth-of-type(1) > body:nth-of-type(1) > p:nth-of-type(1)", "text": "원문 문단" }],
  "sources": [{ "url": "https://example.org/report", "title": "자료 제목", "publisher": "example.org", "text": "수집한 출처 본문" }]
}
```

읽지 못한 출처는 text가 빈 문자열이고 failure에 이유가 담깁니다. 원문과 출처는 모델의 지시가 아닌 분석 대상 데이터로 취급해야 합니다. 제공자 구현은 모든 문단을 평가하고, 확인 실패·출처 부족을 요약 및 이유에 반영해야 합니다.

응답(HTTP 200):

```json
{
  "overview": { "score": 78, "status": "good", "summary": "종합 판단" },
  "sections": [{
    "id": "section-1", "title": "문단 제목", "score": 78, "status": "good", "summary": "문단 판단",
    "reasons": [{ "title": "판단 이유", "detail": "근거와 한계" }],
    "sourceUrls": ["https://example.org/report"]
  }]
}
```

score는 0–100 정수, status는 high/good/caution/low/danger. 반환할 문단 ID는 입력과 정확히 일치해야 합니다. sourceUrls에는 성공적으로 수집한 출처 URL만 사용할 수 있습니다. 선택자·원문 발췌는 서버가 원본에서 채웁니다. 기본 analysis 모드에서 설정이 없으면 POST가 `503 evaluator_unconfigured`로 실패하며 임의 점수를 생성하지 않습니다. 테스트의 모의 분석기는 테스트 컨텍스트에서만 사용합니다.

## 현재 범위

링크된 HTML/텍스트 출처의 수집만 구현되어 있습니다. 독립적인 웹 검색, PDF, 리다이렉트 추적, 사용자 인증/소유권, 분산 큐는 후속 작업입니다. 진행 상태/완료 결과는 SQLite에 저장하고 원본 HTML은 처리 중 메모리에서만 사용합니다. 재시작 시 미완료 작업은 실패 처리하고 재분석하도록 합니다. 출처와 본문 처리 상한은 상세 명세를 참고하세요.
