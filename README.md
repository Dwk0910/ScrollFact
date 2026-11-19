# ScrollFact

글의 문장과 연결된 사람들의 의견·이유·원문을 함께 읽는 서비스의 프로토타입입니다. 원래의 문단별 분석 확장과 여러 탐색용 데모도 보존하고 있습니다.

**새 컴퓨터에서 AI와 이어서 작업할 때는 [AGENTS.md](AGENTS.md)와 [AI 인수인계](docs/ai/HANDOFF.md)를 먼저 읽게 하세요.** 이 자료는 프로젝트 대화의 주요 결정과 현재 코드를 정리한 것이며 Codex 채팅 세션 전체를 복원하는 파일은 아닙니다.

## Windows에서 시작

Git과 Node.js 24.x를 설치합니다. 백엔드도 사용할 경우 JDK 17 이상이 필요합니다. 다음은 PowerShell 명령입니다.

```powershell
git clone https://github.com/Dwk0910/ScrollFact.git
cd ScrollFact
cd frontend
npm ci
npm run dev
```

PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 `npm` 대신 `npm.cmd`를 사용합니다. 실행 정책을 바꿀 필요는 없습니다.

- 최신 1단계 데모: http://127.0.0.1:5173/festival.html
- 과거 데모 모음과 코칭 자료: http://127.0.0.1:5173/coaching.html
- 서버 연결 점검: http://127.0.0.1:5173/integration.html

일반 데모는 백엔드 없이 실행됩니다. `festival.html`에서 오른쪽 위 ScrollFact 버튼을 켠 뒤 밑줄 문장을 누르면 관련 의견과 이유가 표시됩니다. 넓은 화면에서는 오른쪽 패널, 좁은 화면에서는 하단 패널로 표시됩니다.

## 백엔드 실행 (선택)

별도 PowerShell을 열고 저장소 루트에서 실행합니다.

```powershell
.\gradlew.bat :backend:test :backend:bootJar
.\gradlew.bat :backend:bootRun
```

기본 주소는 `http://127.0.0.1:8080`입니다. macOS/Linux에서는 `./gradlew`를 사용합니다. Gradle은 wrapper가 내려받습니다.

진단 업로드·문단 추출·출처 수집·작업 조회는 구현되어 있습니다. **실제 AI 제공자는 미연결 상태**이며 기본 분석 요청은 설정이 없으면 503을 반환합니다. 설정과 계약은 [백엔드 안내](backend/ScrollFact/README.md) 및 [API 명세](frontend/docs/backend-api.md)를 참고하세요. Spring은 `.env` 파일을 자동 로드하지 않습니다.

## 확장 프로그램과 검증

`frontend`에서:

```powershell
npm run lint
npm run build
npm run check:extension
npm run test:api
npm run test:feed
```

Chrome/웨일의 확장 관리 화면에서 개발자 모드를 켜고 `frontend/dist` 폴더를 압축 해제된 확장으로 로드합니다. 이 확장은 기존 문단별 분석 기능입니다. 최신 festival 의견 패널은 독립 웹 데모이며 아직 해당 확장의 임의 사이트 분석 기능으로 통합되지 않았습니다. 개발 출력 `dist-dev`와 설치용 `dist`는 분리되어 있습니다.

## 자료 위치

| 자료 | 위치 |
| --- | --- |
| AI가 먼저 읽을 현재 맥락·결정·미완료 항목 | [docs/ai/HANDOFF.md](docs/ai/HANDOFF.md) |
| AI 조사·기획 자료 안내 | [docs/ai/REFERENCES.md](docs/ai/REFERENCES.md) |
| 프론트 구조 및 각 데모 설명 | [frontend/README.md](frontend/README.md) |
| 대회 요구·코칭 기록·연구 검토 | [docs/competition/](docs/competition/) |
| 축제 부스 원본 참고 HTML | [docs/references/festival-original.html](docs/references/festival-original.html) |
| 과거 시연 캡처·PDF | [output/](output/) |

`.env`, API 키, SQLite DB, 의존성·일반 빌드 출력과 임시 파일은 포함하지 않습니다. `frontend/public/coaching/deduction-scoring/`은 과거 감점판 비교를 위해 의도적으로 보관한 정적 결과물입니다. PDF는 이미 포함되어 있으므로 실행에 Python이 필요하지 않습니다. 다시 생성할 때만 Python의 `reportlab`, `pypdf`와 한글 TTF가 필요하며 Windows에서는 `SCROLLFACT_PDF_FONT`에 폰트 경로를 지정합니다.

## 새 Codex에 붙여 넣을 요청

```text
이 저장소의 AGENTS.md, docs/ai/HANDOFF.md, README.md를 먼저 읽어줘.
최신 방향은 문장에 연결된 사람들의 의견과 이유를 먼저 보여주는 것이고,
현재 festival.html의 1단계 확장 형태 데모까지 구현되어 있어.
이전 점수판과 11월 1일 코칭 자료는 역사적 참고 자료야.
현재 코드와 인수인계에서 확인되는 완료 상태·남은 작업을 짧게 정리한 뒤,
내 다음 요청에 맞춰 이어서 작업해줘.
```
