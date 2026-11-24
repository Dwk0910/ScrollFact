# ScrollFact 산출물 보관

현재 서비스 코드는 `frontend/src/reader/`와 `backend/ScrollFact/`에 있다. 이 폴더는 작업 당시의 시안·포스터·검증 캡처를 보관하며, 과거 화면을 최신 제품 사양으로 해석하지 않는다.

- `ScrollFact-poster-assets-latest/`와 같은 이름 ZIP: 최신 전달 포스터 에셋. 기능 화면 2장, 배경, 공식 로고 사본, 6번 문안, PPT/PPTX 및 재촬영 HTML.
- `poster-2026-11-23/`: 포스터 제작 과정, 문안과 공식 양식, 당시 제출본. 최종 전달 에셋은 위 폴더를 우선한다.
- `ui-review-2026-11-23/`: 거절된 탭형 UI 시안. 비교 기록으로만 보관.
- `ui-polish-2026-11-23/`, `ui-redesign-2026-11-23/`: 실제 구현 전 HTML 시안과 캡처. 현재 확장 프로그램 코드와 구분한다.
- `branding/`: 과거 로고 제작 자료. 공식 로고는 루트의 `assets/branding/scrollfact-logo.png`다.
- `*-2026-11-24/`와 같은 날짜의 PNG: 확장 UI·설정·원문 연결 검증 캡처. 스텁 API/합성 응답을 사용한 화면도 포함하며 실제 AI 분석 성공의 증거로 해석하지 않는다. 검증 범위는 `docs/ai/HANDOFF.md`에서 확인한다.
- `reader-materials-2026-11-24/materials-images.png`는 합성 해설을 명시한 UI 검사 화면이다. 댓글을 상단 게이지에 통합하기 전 캡처이며 현재 배치와 다를 수 있다.

개인 연락처가 포함된 `poster-2026-11-23/reference/user-edited-poster.hwpx` 원본은 로컬에 보존하고 Git에서 제외했다. 서비스 소개 문안은 같은 폴더의 `user-edited-copy.txt`에 남아 있다. `.build/`는 임시 렌더링·의존성 폴더로 제외했다. 사용자 원본 파일은 수정하지 않았다.
