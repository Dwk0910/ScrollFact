import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChevronLeft, ChevronRight, ExternalLink, MessageSquare, AlignLeft, ArrowRight, Settings2, CircleHelp, X, LoaderCircle, RotateCcw, Check } from 'lucide-react'
import logo from '../../../assets/branding/scrollfact-logo.png'
import { useUpload } from './useUpload'
import { isRecord, type AnalysisProgress } from '../types'
import type { ReaderCheck } from '../api/analyze'
import './style.css'

const phases: Record<AnalysisProgress['phase'], string> = {
  capturing: '읽던 페이지를 가져오고 있어요', compressing: '페이지를 준비하고 있어요', uploading: '분석할 내용을 전달하고 있어요',
  queued: '분석을 기다리고 있어요', extracting: '본문의 흐름을 살피고 있어요', checking_sources: '연결된 자료를 확인하고 있어요', summarizing: '문단의 맥락과 관점을 정리하고 있어요',
}
const labels: Record<ReaderCheck['status'], string> = { supported: '자료와 일치', contradicted: '자료와 불일치', contested: '근거가 엇갈림', needs_verification: '확인 자료 부족', opinion: '의견·제안' }
type Preferences = { server: string; follow: boolean; mode: 'reader' | 'diagnostic' }
const defaults: Preferences = { server: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080', follow: true, mode: 'reader' }
function loadPreferences(): Preferences {
  try {
    const p: unknown = JSON.parse(localStorage.getItem('scrollfact.reader.preferences') || 'null')
    if (isRecord(p)) return { server: typeof p.server === 'string' ? p.server : defaults.server, follow: typeof p.follow === 'boolean' ? p.follow : true, mode: p.mode === 'diagnostic' ? 'diagnostic' : 'reader' }
  } catch { /* Storage may be unavailable; use session defaults. */ }
  return defaults
}

export default function Reader() {
  const [preferences, setPreferences] = useState(loadPreferences)
  const { result, busy, notice, active, progress, upload, cancel, jump, inExtension } = useUpload(preferences.follow)
  const [view, setView] = useState<'about' | 'settings' | null>(null)
  const [connection, setConnection] = useState('연결 상태를 확인해 주세요')
  const [checking, setChecking] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const connectionTask = useRef<AbortController | null>(null)
  const passage = result?.passages[active]
  const analysis = result?.kind === 'reader' ? result : null
  const block = analysis?.blocks.find(b => b.id === passage?.id)
  const totalOpinions = analysis?.perspectives.reduce((n, p) => n + p.entries.length, 0) || 0
  useEffect(() => {
    if (view) dialog.current?.showModal()
    else dialog.current?.close()
  }, [view])
  useEffect(() => () => connectionTask.current?.abort(), [])
  function change(next: Partial<Preferences>) {
    const updated = { ...preferences, ...next }
    setPreferences(updated)
    try { localStorage.setItem('scrollfact.reader.preferences', JSON.stringify(updated)); setSaveNotice('설정을 저장했어요') }
    catch { setSaveNotice('저장 공간을 사용할 수 없어 이번 패널에서만 적용돼요') }
    if (next.server !== undefined) { connectionTask.current?.abort(); setChecking(false); setConnection('새 서버의 연결 상태를 확인해 주세요') }
  }
  async function checkConnection() {
    connectionTask.current?.abort()
    const task = new AbortController(); connectionTask.current = task
    setChecking(true)
    try {
      const url = new URL(preferences.server)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('서버 주소를 확인해 주세요')
      const response = await fetch(`${url.href.replace(/\/$/, '')}/v1/reader/status`, { signal: AbortSignal.any([task.signal, AbortSignal.timeout(10000)]), cache: 'no-store' })
      const status: unknown = await response.json()
      if (!response.ok || !isRecord(status) || typeof status.configured !== 'boolean' || typeof status.model !== 'string') throw new Error('연결 상태를 확인하지 못했어요')
      if (!task.signal.aborted) setConnection(status.configured ? `서버 설정 확인 · ${status.model} (실제 API 인증은 분석 시 확인)` : 'API 키 또는 모델이 설정되지 않았어요')
    } catch (error) { if (!task.signal.aborted) setConnection(error instanceof Error ? error.message : '서버에 연결하지 못했어요') }
    finally { if (connectionTask.current === task) setChecking(false) }
  }
  const start = () => void upload(preferences.server, preferences.mode)
  return <div className="reader-shell">
    <header className="app-header"><img src={logo} alt="ScrollFact" /><button className="icon-button" aria-label="설정" onClick={() => setView('settings')}><Settings2 size={18} /></button></header>
    {!result && !busy ? <main className="welcome">
      <div className="welcome-copy"><span className="eyebrow">읽던 글에서, 한 걸음 더</span><h1>글의 맥락을 읽고<br />서로의 이유를 살피다.</h1><p>한 문장 너머의 맥락부터<br />같은 글을 바라보는 다른 관점까지.</p><button className="primary" disabled={!inExtension} onClick={start}>이 페이지 분석하기 <ArrowRight size={17} /></button>
      {preferences.mode === 'diagnostic' && <small>현재 연결 점검 모드입니다</small>}
      {!inExtension && <small>설치한 확장 프로그램에서 분석할 수 있어요</small>}
      {notice && <p className="notice" role="alert">{notice}</p>}
      </div><button className="about-link" onClick={() => setView('about')}><CircleHelp size={16} /> ScrollFact란?</button>
    </main> : busy ? <main className="loading" aria-live="polite"><LoaderCircle className="spinner" size={26} /><h1>{phases[progress.phase]}</h1><p>잠시만 기다려 주세요.<br />읽던 글의 위치는 그대로 유지돼요.</p>{progress.sources && <small>자료 {progress.sources.completed}/{progress.sources.total ?? '확인 중'}</small>}<button className="text-button" onClick={cancel}>분석 중단</button></main> : <main className="results">
      <div className="document-heading"><span className="eyebrow">{result && new URL(result.document.url).hostname}</span><h1>{result?.document.title}</h1><div className="result-actions"><span className="status"><Check size={13} />{analysis ? 'AI 분석 완료' : '서버 수신 완료'} · {result?.passages.length}개 문단</span><button className="icon-button" onClick={start} aria-label="다시 분석"><RotateCcw size={15} /></button></div></div>
      {notice && <p className="notice" role="alert">{notice}</p>}
      <section className="analysis-section opinions"><div className="section-title"><MessageSquare size={17} /><h2>글 전체 의견</h2><span>관점 파악</span></div>
        {analysis && totalOpinions > 0 ? <><div className="opinion-gauge" aria-label="확인한 발언의 관점별 구성">{analysis.perspectives.map((p, i) => <span key={i} style={{ flex: p.entries.length, background: ['#5975d9', '#a88b55', '#9c79c2', '#5b9a9a'][i % 4] }} />)}</div><p className="caption">이 글에서 확인한 발언 {totalOpinions}개 기준 · 여론조사가 아니에요</p>{analysis.perspectives.map((p, i) => <details className="perspective" key={i}><summary>{p.label}<span>{p.entries.length}</span></summary>{p.entries.map((entry, j) => <div className="opinion-entry" key={j}><blockquote>{entry.quote}</blockquote><p>{entry.reason}</p><button className="source-link" onClick={() => void jump(analysis.passages.findIndex(p => p.id === entry.blockId))}>원문 위치 <ExternalLink size={12} /></button></div>)}</details>)}</> : <p className="empty-copy">{analysis ? '이 글에서 별도로 묶어 보여줄 관점을 확인하지 못했어요.' : '연결 점검에서는 의견을 분석하지 않아요.'}</p>}
      </section>
      <section className="analysis-section context"><div className="section-title"><AlignLeft size={17} /><h2>현재 문단</h2><span>글 맥락 분석</span></div>
        {passage ? <><nav aria-label="문단 이동"><button className="icon-button" disabled={active === 0} onClick={() => void jump(active - 1)} aria-label="이전 문단"><ChevronLeft size={18} /></button><span>{active + 1} / {result!.passages.length} 문단</span><button className="icon-button" disabled={active === result!.passages.length - 1} onClick={() => void jump(active + 1)} aria-label="다음 문단"><ChevronRight size={18} /></button></nav>
        {block && <div className="explanation"><h3>{block.title}</h3><p>{block.summary}</p></div>}
        <details className="original" open={!analysis}><summary>원문 읽기</summary><blockquote>{passage.text}</blockquote><button className="source-link" onClick={() => void jump(active)}>원문 위치 <ExternalLink size={12} /></button></details>
        {block && <div className="checks">{block.checks.map((c, i) => <details key={i} className={`check check-${c.status}`}><summary><span className="check-label">{labels[c.status]}</span><span>{c.quote}</span></summary><p>{c.reason}</p>{c.evidence.map((e, j) => <a key={j} href={e.url} target="_blank" rel="noopener noreferrer"><span>{new URL(e.url).hostname} <ExternalLink size={11} /></span><q>{e.quote}</q></a>)}</details>)}</div>}
        </> : <p className="empty-copy">분석할 본문을 찾지 못했어요. 원문 추출 범위를 확인해야 해요.</p>}
      </section>
      <details className="receipt"><summary>분석 정보</summary>{analysis ? <><p>OpenAI · {analysis.model}</p><p>부가정보로 분류된 블록 {analysis.excludedBlocks}개</p><p>입력 {analysis.inputTokens.toLocaleString()} · 출력 {analysis.outputTokens.toLocaleString()} 토큰</p><p>AI 판단은 오류가 있을 수 있어요. 연결된 원문과 근거를 함께 확인해 주세요.</p></> : <p>연결 점검 결과입니다. AI 분석은 실행하지 않았어요.</p>}</details>
    </main>}
    <dialog ref={dialog} onCancel={() => setView(null)} onClose={() => setView(null)} className="sheet"><div className="sheet-header"><h2>{view === 'about' ? 'ScrollFact란?' : '설정'}</h2><button className="icon-button" aria-label="닫기" onClick={() => setView(null)}><X size={18} /></button></div>
      {view === 'about' ? <div className="about-content"><span className="eyebrow">READ WITH CONTEXT</span><h2>같은 글,<br />다른 생각.<br /><span>이유를 읽는 시간.</span></h2><p className="about-lead">답글을 쓰기 전에,<br />상대가 왜 그렇게 말했는지.</p><div className="about-feature"><span>01</span><h3>글의 맥락을 읽어요</h3><p>문단의 주장과 앞뒤 흐름을 살피고, 자료와 대조할 부분을 원문에 연결해 확인해요.</p></div><div className="about-feature"><span>02</span><h3>관점과 이유를 함께 봐요</h3><p>찬반이라는 한마디보다, 글에 드러난 각자의 이유를 먼저 읽어요. 의견의 차이를 사실의 오류와 구분해요.</p></div><p className="about-note">ScrollFact는 판단을 대신하지 않아요.<br />원문과 근거를 읽고 스스로 판단하도록 돕습니다.</p></div> : <div className="settings-content">
        <section><h3>AI 연결</h3><div className="setting-row"><div><strong>OpenAI API</strong><p>서버의 API 키로 연결</p></div><button onClick={() => void checkConnection()} disabled={checking}>{checking ? '확인 중' : '연결 확인'}</button></div><p className="connection-status" role="status">{connection}</p><p className="caption">API 키는 서버의 OPENAI_API_KEY, 모델은 SCROLLFACT_OPENAI_MODEL로 설정해 주세요. 브라우저에는 키를 저장하지 않아요.</p></section>
        <section><h3>읽기 동작</h3><label className="setting-row"><div><strong>원문 스크롤 따라가기</strong><p>읽고 있는 문단으로 분석을 전환해요</p></div><input className="switch" type="checkbox" checked={preferences.follow} onChange={e => change({ follow: e.target.checked })} /></label></section>
        <section><h3>고급 설정</h3><label htmlFor="server">서버 주소</label><input id="server" type="url" value={preferences.server} disabled={busy} onChange={e => change({ server: e.target.value })} /><label htmlFor="mode">실행 모드</label><select id="mode" disabled={busy} value={preferences.mode} onChange={e => change({ mode: e.target.value === 'diagnostic' ? 'diagnostic' : 'reader' })}><option value="reader">AI 분석</option><option value="diagnostic">페이지 전송 점검 (AI 사용 안 함)</option></select><p className="caption">분석 버튼을 누르면 현재 페이지를 서버로 보내요. AI 분석 모드에서는 추출한 텍스트와 근거 자료를 OpenAI로 전달해요.</p></section><p className="caption" role="status">{saveNotice}</p>
      </div>}
    </dialog>
  </div>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Reader /></StrictMode>)
