# ScrollFact

웹 페이지 전체의 신뢰도와 문단별 판단 근거를 보여 주는 Chrome 확장 프로그램. React + TypeScript + Vite로 만든 분석 패널입니다.

## 개발

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

`http://127.0.0.1:5173/`에서 UI를 확인합니다. 분석 버튼을 누르면 별도 대기 화면에서 단계·경과 시간·출처 처리 건수를 보여 준 뒤 전체 신뢰도 게이지와 문단별 페이지가 나타납니다. 샘플은 약 12초 동안 진행 단계를 시연합니다. 스크롤·하단 탐색 버튼으로 이동합니다.

예상 백엔드 응답은 루트 파일 `src/sidepanel/main.tsx`의 `window.SCROLLFACT_MOCK_RESPONSE`에 있습니다. 진행 단계와 지연은 같은 파일의 `window.SCROLLFACT_MOCK_PROGRESS`에서 조절합니다. 컴포넌트별 mock은 없습니다. 콘솔에서 객체를 바꾼 뒤 다시 분석할 수도 있습니다.

## 원문 스크롤 연동

Chrome의 `chrome://extensions`에서 개발자 모드를 켜고 `dist`를 압축 해제된 확장으로 로드합니다. 개발 서버의 `/demo.html`을 열어 ScrollFact 아이콘 → 분석 → 원문 스크롤로 확인합니다. 샘플의 CSS 선택자는 이 데모 기사의 4개 문단에 대응합니다.

변경이 적용되지 않으면 확장을 새로고침한 후 원문 페이지도 새로고침합니다. UI의 `원문 따라가기`로 자동 이동을 끌 수 있습니다. 접기는 상태를 유지하고, 닫았다 열면 새로 분석합니다.

헤더의 다운로드 아이콘으로 현재 페이지 HTML을 로컬 파일로 저장할 수 있습니다. 확장 UI와 하이라이트는 내보내기에서 제외하고, 진행 중인 원문 watch는 유지합니다. 일반 웹 미리보기에서는 미리보기 자체의 HTML을 저장합니다.

## 백엔드 연결

프론트는 원문 탭의 `document.documentElement.outerHTML`을 gzip 파일로 압축해 업로드합니다. 서버는 202로 작업을 접수하고, 프론트는 단계·출처 처리 건수와 완료 결과를 조회합니다. 원문 20 MiB/압축 5 MiB 상한을 넘으면 잘라 보내지 않고 안내합니다. 문단 분리·요약·점수·판정·이유·출처·watch 선택자는 모두 백엔드 책임입니다.

`.env.local`:

```dotenv
VITE_ANALYSIS_MODE=api
VITE_API_BASE_URL=http://localhost:8080
```

설정 후 개발 서버를 재시작합니다. 자세한 계약과 이전 버전과의 기능 차이는 [API 명세](docs/backend-api.md)에 있습니다. 백엔드 자체는 이 프론트 변경에 포함하지 않습니다.

## 검증 및 배포 빌드

```bash
npm run lint
node --test tests/api.test.mjs
npm run build
```

빌드된 `dist`를 Chrome에 로드할 수 있습니다. 개발 서버와 프로덕션 빌드는 같은 `dist`를 사용하므로, 확장 개발을 계속할 때는 빌드 후 개발 서버를 재시작합니다.
