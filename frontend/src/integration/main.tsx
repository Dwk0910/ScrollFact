import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IntegrationPreview } from './IntegrationPreview'
import '../index.css'
import './preview.css'

// 연결 점검용 입력 문서는 루트에서만 관리합니다. 응답/진행 상태는 실제 서버에서 받습니다.
const diagnosticDocument = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>ScrollFact 연결 점검 문서</title><style>
body{margin:0;background:#f8faf8;color:#223431;font-family:system-ui,sans-serif}article{max-width:640px;margin:auto;padding:60px 38px}header{padding-bottom:30px;border-bottom:1px solid #dce6de}small{color:#258563;letter-spacing:2px}h1{font-size:36px;letter-spacing:-1.5px}h2{font-size:22px}section{padding:36px 0;border-bottom:1px solid #e4eae5}p{font-size:16px;line-height:1.9}a{color:#258563}p:target{background:#eaf4ed}header p{color:#7d8a84;font-size:14px}
</style></head><body><article><header><small>SCROLLFACT / CONNECTION CHECK</small><h1>원문에서 서버까지.</h1><p>이 문서는 업로드와 출처 수집을 점검하는 입력 예시입니다. 신뢰도를 평가하는 기사가 아닙니다.</p></header>
<section><h2>01 · 전체 HTML 전송</h2><p id="capture">지금 보이는 문서의 document.documentElement.outerHTML 전체를 gzip으로 압축해 서버에 업로드합니다. <a href="https://example.com/">공개 예시 문서</a>를 출처 수집 대상으로 포함합니다.</p></section>
<section><h2>02 · 중복된 출처</h2><p id="duplicates">같은 주소의 다른 위치를 가리키는 <a href="https://example.com/#duplicate">중복 링크</a>는 한 번만 수집해야 합니다. 또 다른 <a href="https://www.iana.org/help/example-domains">공개 참고 문서</a>도 함께 처리합니다.</p></section>
<section><h2>03 · 실패도 진행 상태에 포함</h2><p id="blocked">이 <a href="http://127.0.0.1/blocked-source">내부 주소</a>는 서버의 외부 출처 수집 정책에 따라 차단되어야 합니다. 일부 출처가 실패해도 나머지 문단과 출처의 처리 결과를 확인할 수 있습니다.</p></section>
<section><h2>04 · 원문 위치 연결</h2><p id="selectors">서버가 돌려준 CSS 선택자로 이 문단을 찾아 이동합니다. AI를 연결하기 전까지 요약, 판단 근거, 신뢰도 점수는 생성하지 않습니다.</p></section>
</article></body></html>`
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

createRoot(document.getElementById('root')!).render(<StrictMode><IntegrationPreview documentHtml={diagnosticDocument} baseUrl={baseUrl} /></StrictMode>)
