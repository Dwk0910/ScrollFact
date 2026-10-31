# ScrollFact

웹 페이지 전체의 신뢰도와 문단별 판단 근거를 보여 주는 Chrome/웨일 확장 프로그램. React + TypeScript + Vite로 만든 분석 패널입니다.

## 개발

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

`http://127.0.0.1:5173/`에서 UI를 확인합니다. 분석 버튼을 누르면 별도 대기 화면에서 단계·경과 시간·출처 처리 건수를 보여 준 뒤 전체 신뢰도 게이지와 문단별 페이지가 나타납니다. 샘플은 약 12초 동안 진행 단계를 시연합니다. 스크롤·하단 탐색 버튼으로 이동합니다.

예상 백엔드 응답은 루트 파일 `src/sidepanel/main.tsx`의 `window.SCROLLFACT_MOCK_RESPONSE`에 있습니다. 진행 단계와 지연은 같은 파일의 `window.SCROLLFACT_MOCK_PROGRESS`에서 조절합니다. 컴포넌트별 mock은 없습니다. 콘솔에서 객체를 바꾼 뒤 다시 분석할 수도 있습니다.

## 원문 스크롤 연동

먼저 `npm run build`와 `npm run check:extension`을 실행합니다. Chrome의 `chrome://extensions` 또는 웨일의 `whale://extensions`에서 개발자 모드를 켜고 **`frontend/dist`**를 압축 해제된 확장으로 로드합니다. 이미 설치했다면 확장의 새로고침 버튼을 누릅니다. 이 빌드는 Vite 개발 서버 없이 실행됩니다.

일반 HTTP(S) 페이지에서 툴바의 확장앱 메뉴 → ScrollFact를 누르면 페이지 안에 패널이 열립니다. 브라우저의 새 탭·설정·확장앱 관리 페이지에서는 콘텐츠 스크립트가 실행되지 않습니다. 현재 패널은 페이지에 삽입한 iframe이므로 Chrome 전용 `sidePanel` 권한과 `side_panel` 등록은 사용하지 않습니다.

원문 스크롤 연동은 개발 서버의 `/demo.html`에서 ScrollFact 아이콘 → 분석 → 원문 스크롤로 확인합니다. 샘플의 CSS 선택자는 이 데모 기사의 4개 문단에 대응합니다.

변경이 적용되지 않으면 확장을 새로고침한 후 원문 페이지도 새로고침합니다. UI의 `원문 따라가기`로 자동 이동을 끌 수 있습니다. 접기는 상태를 유지하고, 닫았다 열면 새로 분석합니다.

헤더의 다운로드 아이콘으로 현재 페이지 HTML을 로컬 파일로 저장할 수 있습니다. 확장 UI와 하이라이트는 내보내기에서 제외하고, 진행 중인 원문 watch는 유지합니다. 일반 웹 미리보기에서는 미리보기 자체의 HTML을 저장합니다.

## 백엔드 연결

프론트는 원문 탭의 `document.documentElement.outerHTML`을 gzip 파일로 압축해 업로드합니다. 서버는 202로 작업을 접수하고, 프론트는 단계·출처 처리 건수와 완료 결과를 조회합니다. 원문 20 MiB/압축 5 MiB 상한을 넘으면 잘라 보내지 않고 안내합니다. 문단 분리·요약·점수·판정·이유·출처·watch 선택자는 모두 백엔드 책임입니다.

`.env.local`:

```dotenv
VITE_ANALYSIS_MODE=api
VITE_API_BASE_URL=http://localhost:8080
```

설정 후 개발 서버를 재시작합니다. 설치용 확장에서는 `npm run build` 후 확장과 원문 페이지를 새로고침해야 환경변수가 반영됩니다. 기본 mock 모드의 UI는 백엔드 없이 동작하지만, api 모드의 실제 분석에는 백엔드와 AI 제공자가 필요합니다. 자세한 계약과 이전 버전과의 기능 차이는 [API 명세](docs/backend-api.md)에 있습니다. 백엔드 실행과 AI 제공자 연결은 [백엔드 안내](../backend/ScrollFact/README.md)를 참고하세요. AI 미설정 상태에서는 실제 분석 요청에 503을 반환합니다. 상태와 결과 조회는 별도 REST 리소스입니다.

## 검증 및 배포 빌드

```bash
npm run lint
node --test tests/api.test.mjs
npm run build
npm run check:extension
```

출력 폴더는 다음과 같이 분리됩니다.

- `npm run build` → `dist`: Chrome/웨일에 설치할 독립 실행 빌드.
- `npm run dev` → `dist-dev`: HMR 개발용 확장. 해당 Vite 서버를 계속 켜 두어야 합니다.

개발 서버를 켜도 기존 `dist`를 덮어쓰지 않습니다. `check:extension`은 설치용 빌드에 개발 로더가 섞였는지, manifest와 패널이 참조하는 파일이 존재하는지 검사합니다. 다른 출력 경로는 `npm run check:extension -- /path/to/build`로 확인합니다.

`Service worker registration failed`, `unsupported MIME type ('text/html')`, `CRXJS DEV MODE`가 보이면 개발 출력물을 설치했거나 개발 로더가 잘못된 서버에 연결한 것인지 확인합니다. 특히 다른 프로젝트가 5173 포트를 사용 중이면 그 서버에서 HTML을 받아 확장이 실행되지 않을 수 있습니다. 이때 설치용 `dist`를 다시 빌드하고 확장을 새로고침합니다. 개발 서버가 필요하면 `npm run dev -- --port 5174`처럼 빈 포트를 사용합니다. [CRXJS 배포 빌드 안내](https://crxjs.dev/guide/packaging/) 참고.
