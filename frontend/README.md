# ScrollFact (스크롤팩트)

웹 페이지를 스크롤하면, 화면 한가운데 문단에 맞춰 신뢰도 카드를 보여주는 Chrome 사이드 패널입니다. 백엔드에 연결하기 전에는 5개 문단의 모의 분석 데이터를 사용합니다.

## 개발

```bash
npm install
npm run dev
```

Chrome에서 `chrome://extensions`를 열고 개발자 모드에서 `dist` 폴더를 로드합니다. 툴바의 ScrollFact 아이콘을 누르면 현재 페이지 오른쪽에 화면의 절반 크기 패널이 열립니다. 왼쪽 경계를 드래그해 너비를 바꾸고, 접기로 좁은 막대로 줄일 수 있습니다.

동작 확인용 샘플 기사는 개발 서버의 `/demo.html` 입니다. 페이지를 새로고침한 뒤 아이콘으로 패널을 열고, **이 페이지 맥락/신뢰도 분석**을 누른 다음 스크롤합니다.

## 빌드

```bash
npm run build
```

`dist`를 압축 해제된 확장 프로그램으로 로드하면 됩니다.

`manifest.json` 원본은 `public/manifest.json`에 있습니다. CRXJS가 빌드하면서 스크립트 경로를 바꿔 `dist/manifest.json`을 만듭니다.
