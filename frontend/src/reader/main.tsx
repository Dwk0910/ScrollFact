import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChevronLeft, ChevronRight, ExternalLink, MessageSquare, AlignLeft, Send, Settings2 } from 'lucide-react'
import logo from '../../../assets/branding/scrollfact-logo.png'
import { useUpload } from './useUpload'
import type { AnalysisProgress } from '../types'
import './style.css'

const phases: Record<AnalysisProgress['phase'], string> = {
  capturing: '현재 페이지 가져오는 중', compressing: '페이지 압축 중', uploading: '서버로 전송 중',
  queued: '서버 접수 완료 · 처리 대기', extracting: '서버에서 문단 추출 중', checking_sources: '연결된 출처 수집 중', summarizing: '서버 처리 중',
}

export default function Reader() {
  const { result, busy, notice, active, progress, upload, cancel, jump, inExtension } = useUpload()
  const [server, setServer] = useState(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080')
  const passage = result?.passages[active]
  return <div className="reader-shell">
    <header><img src={logo} alt="ScrollFact" /><span>함께 읽는 맥락</span></header>
    <main>
      <section className="connection">
        <div className="eyebrow">현재 페이지</div>
        <h1>{result?.document.title || '읽던 글에서 시작하세요'}</h1>
        <p>{result ? new URL(result.document.url).hostname : '원문을 서버로 보내고, 돌아온 문단을 원문과 연결합니다.'}</p>
        <details><summary><Settings2 size={14} /> 서버 연결</summary>
          <label htmlFor="server">서버 주소</label><input id="server" type="url" value={server} disabled={busy} onChange={e => setServer(e.target.value)} />
          <small>현재 페이지의 URL·제목·HTML을 이 주소로 전송합니다. 입력 중인 폼 내용과 스크립트는 제외합니다.</small>
        </details>
        <div className="send-row"><button className="primary" disabled={busy || !inExtension} onClick={() => void upload(server)}><Send size={15} />{result ? '현재 페이지 다시 보내기' : '현재 페이지 보내기'}</button>{busy && <button onClick={cancel}>중단</button>}</div>
        <div className="status" role="status">{busy ? phases[progress.phase] : result ? `서버 수신 완료 · ${result.passages.length}개 문단` : '버튼을 누르면 전송합니다.'}</div>
        {busy && progress.sources && <small>출처 {progress.sources.completed}/{progress.sources.total ?? '확인 중'} · 실패 {progress.sources.failed}개</small>}
        {!inExtension && <p className="notice">실제 전송은 Chrome·웨일에 설치한 확장 프로그램에서 사용할 수 있습니다.</p>}
        {notice && <p className="notice" role="alert">{notice}</p>}
      </section>
      <section className="card opinions"><div className="section-title"><MessageSquare size={19} /><h2>글 전체 의견</h2><span>관점 파악</span></div>
        <div className="pending"><strong>어떤 이유로 생각이 갈릴까요?</strong><p>의견 분포와 관점별 발언은 서버의 의견 분석이 연결되면 표시됩니다.</p><span className="tag">분석 대기</span></div>
      </section>
      <section className="card context"><div className="section-title"><AlignLeft size={19} /><h2>현재 문단</h2><span>글 맥락 분석</span></div>
        {passage ? <><nav aria-label="문단 이동"><button disabled={active === 0} onClick={() => void jump(active - 1)} aria-label="이전 문단"><ChevronLeft size={17} /></button><span>{active + 1} / {result!.passages.length} 문단</span><button disabled={active === result!.passages.length - 1} onClick={() => void jump(active + 1)} aria-label="다음 문단"><ChevronRight size={17} /></button></nav>
          <div className="source-label">서버가 추출한 원문</div><blockquote>{passage.text}</blockquote><button className="source-link" onClick={() => void jump(active)}>원문 위치 <ExternalLink size={13} /></button>
          <div className="explanation"><strong>문단 해설과 문장별 분석</strong><p>원문 연결을 확인했습니다. 해설·다섯 분류·근거는 AI 처리 연결 후 표시됩니다.</p></div>
        </> : <div className="pending"><strong>읽는 문단을 따라갑니다</strong><p>페이지를 전송하면 서버에서 추출한 문단이 여기에 표시됩니다. 원문을 스크롤하거나 이전·다음 문단으로 이동할 수 있습니다.</p></div>}
      </section>
      {result && <details className="receipt"><summary>전송 결과 확인</summary><p>수신 HTML {(result.htmlBytes / 1024).toFixed(1)} KB · 출처 {result.sources.length}개</p><p>작업 ID: {result.analysisId}</p><p>현재는 문단 추출과 출처 수집까지 확인하며, AI 해설·관점 분류는 실행하지 않습니다.</p></details>}
    </main>
    <footer>글의 맥락을 읽고, 서로의 이유를 살피다.</footer>
  </div>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Reader /></StrictMode>)
