import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChevronLeft, ChevronRight, ChevronDown, ExternalLink, MessageSquare, AlignLeft, ArrowRight, Settings2, CircleHelp, X, RotateCcw, Check } from 'lucide-react'
import logo from '../../../assets/branding/scrollfact-logo.png'
import { useUpload } from './useUpload'
import { isRecord } from '../types'
import type { ReaderCheck } from '../api/analyze'
import './style.css'
import SettingsPanel from './SettingsPanel'
import ReaderMarkdown from './ReaderMarkdown'
import LoadingProgress from './LoadingProgress'
import { opinionGroups } from './opinionGroups'
import { asProfile, profileRequest, type Profile } from './profile'

const labels: Record<ReaderCheck['status'], string> = { supported: '자료와 일치', contradicted: '자료와 불일치', contested: '근거가 엇갈림', needs_verification: '확인하지 않음', opinion: '의견·제안' }
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const { result, busy, notice, active, progress, upload, cancel, jump, jumpSource, inExtension } = useUpload(preferences.follow)
  const [view, setView] = useState<'about' | 'settings' | null>(null)
  const [settingsPage, setSettingsPage] = useState<'home' | 'ai'>('home')
  const [connection, setConnection] = useState('연결 상태를 확인해 주세요')
  const [checking, setChecking] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const connectionTask = useRef<AbortController | null>(null)
  const passage = result?.passages[active]
  const analysis = result?.kind === 'reader' ? result : null
  const block = analysis?.blocks.find(b => b.id === passage?.id)
  const opinions = opinionGroups(analysis)
  const totalOpinions = opinions.reduce((n, p) => n + p.entries.length, 0)
  const showOpinions = !!analysis && (analysis.comments?.length ? totalOpinions > 0 : opinions.length > 1)
  useEffect(() => {
    if (view) dialog.current?.showModal()
    else dialog.current?.close()
  }, [view])
  useEffect(() => () => connectionTask.current?.abort(), [])
  function applyProfile(p: Profile | null) {
    setProfile(p)
    if (p?.id) {
      setPreferences(previous => {
        const updated = { ...previous, follow: p.follow, mode: p.mode }
        try { localStorage.setItem('scrollfact.reader.preferences', JSON.stringify(updated)) } catch { /* Session state still applies. */ }
        return updated
      })
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    void profileRequest(preferences.server, 'profile', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) applyProfile(asProfile(data)) })
      .catch(() => { if (!controller.signal.aborted) setProfile(null) })
    return () => controller.abort()
  }, [preferences.server])
  function change(next: Partial<Preferences>) {
    if (profile?.id && (next.follow !== undefined || next.mode !== undefined)) {
      void profileRequest(preferences.server, 'profile/preferences', { id: profile.id, follow: next.follow ?? preferences.follow, mode: next.mode ?? preferences.mode })
        .then(data => { applyProfile(asProfile(data)); setSaveNotice('계정에 설정을 저장했어요') })
        .catch(e => setSaveNotice(e instanceof Error ? e.message : '설정을 저장하지 못했어요'))
      return
    }
    changeLocal(next)
  }
  function changeLocal(next: Partial<Preferences>) {
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
      if (!response.ok || !isRecord(status) || typeof status.configured !== 'boolean' || typeof status.model !== 'string' || typeof status.provider !== 'string') throw new Error('연결 상태를 확인하지 못했어요')
      if (!task.signal.aborted) setConnection(status.configured ? `서버 설정 확인 · ${status.provider} · ${status.model} (실제 API 인증은 분석 시 확인)` : 'API 키 또는 모델이 설정되지 않았어요')
    } catch (error) { if (!task.signal.aborted) setConnection(error instanceof Error ? error.message : '서버에 연결하지 못했어요') }
    finally { if (connectionTask.current === task) setChecking(false) }
  }
  const start = () => void upload(preferences.server, preferences.mode)
  return <div className="reader-shell">
    <header className="app-header"><img src={logo} alt="ScrollFact" /><button className="icon-button" aria-label="설정" onClick={() => { setSettingsPage('home'); setView('settings') }}><Settings2 size={18} /></button></header>
    {!result && !busy ? <main className="welcome">
      <div className="welcome-copy"><span className="eyebrow">읽던 글에서, 한 걸음 더</span><h1>글의 맥락을 읽고<br />서로의 이유를 살피다.</h1><p>한 문장 너머의 맥락부터<br />같은 글을 바라보는 다른 관점까지.</p><button className="primary" disabled={!inExtension} onClick={start}>이 페이지 분석하기 <ArrowRight size={17} /></button>
      {preferences.mode === 'diagnostic' && <small>현재 연결 점검 모드입니다</small>}
      {!inExtension && <small>설치한 확장 프로그램에서 분석할 수 있어요</small>}
      {notice && <div className="notice" role="alert"><p>{notice}</p>{/Gemini HTTP 503/.test(notice) && <button className="text-button" onClick={() => { setSettingsPage('ai'); setView('settings') }}>다른 모델 선택 <ChevronRight size={14} /></button>}</div>}
      </div><button className="about-link" onClick={() => setView('about')}><CircleHelp size={16} /> ScrollFact란?</button>
    </main> : busy ? <LoadingProgress progress={progress} cancel={cancel} /> : <main className="results">
      <div className="document-heading"><span className="eyebrow">{result && new URL(result.document.url).hostname}</span><h1>{result?.document.title}</h1><div className="result-actions"><span className="status"><Check size={13} />{analysis ? 'AI 분석 완료' : '서버 수신 완료'} · {result?.passages.length}개 문단</span><button className="icon-button" onClick={start} aria-label="다시 분석"><RotateCcw size={15} /></button></div></div>
      {notice && <div className="notice" role="alert"><p>{notice}</p>{/Gemini HTTP 503/.test(notice) && <button className="text-button" onClick={() => { setSettingsPage('ai'); setView('settings') }}>다른 모델 선택 <ChevronRight size={14} /></button>}</div>}
      {analysis && <p className="collection-note">불러온 댓글 {analysis.comments?.length || 0}개 · 본문 이미지 {analysis.images?.length || 0}개{analysis.commentAreaDetected && !analysis.comments?.length ? ' · 댓글 영역의 내용을 먼저 불러온 뒤 다시 분석해 주세요.' : ''}</p>}
      <details key={result?.snapshotId} open={showOpinions} className="analysis-section opinions"><summary className="section-title"><MessageSquare size={17} /><h2>글 전체 의견</h2><span>{showOpinions ? '관점 파악' : '비교할 의견 없음'}</span><ChevronDown className="section-chevron" size={16} aria-hidden="true" /></summary>
        {analysis && showOpinions ? <><div className="opinion-gauge" aria-label="확인한 발언의 관점별 구성">{opinions.map((p, i) => <span key={i} style={{ flex: p.entries.length, background: p.label === '관점 분류 누락' ? '#9aa3b1' : ['#5975d9', '#a88b55', '#9c79c2', '#5b9a9a'][i % 4] }} />)}</div><p className="caption">{analysis.comments?.length ? '불러온 댓글' : '기사 속 발언'} {totalOpinions}개 기준 · 여론조사가 아니에요</p>{opinions.map((p, i) => <details className="perspective" key={i}><summary><ChevronDown size={14} aria-hidden="true" />{p.label}<span>{p.entries.length}</span></summary>{p.entries.map((entry, j) => <div className="opinion-entry" key={j}><small className="source-kind">{entry.blockId.startsWith('comment-') ? '댓글' : '기사 속 발언'}</small><blockquote>{analysis.comments?.find(c => c.id === entry.blockId)?.text || entry.quote}</blockquote><ReaderMarkdown text={entry.reason} />{entry.blockId.startsWith('comment-') && analysis.blocks.find(b => b.id === entry.blockId)?.checks.map((c, k) => <details key={k} className={`check check-${c.status}`}><summary><span className="comment-check-heading"><span className="check-label">{labels[c.status]}</span><ChevronDown size={14} aria-hidden="true" /></span><span>{c.quote}</span></summary><ReaderMarkdown text={c.reason} />{c.evidence.map(e => <a key={e.url + e.quote} href={e.url} target="_blank" rel="noopener noreferrer">{e.quote}</a>)}</details>)}<button className="source-link" onClick={() => void jumpSource(entry.blockId)}>원문 위치 <ExternalLink size={12} /></button></div>)}</details>)}</> : <p className="empty-copy">{analysis ? '같은 쟁점에서 비교할 서로 다른 의견을 확인하지 못했어요. 기사 속 인용을 댓글이나 여론으로 간주하지 않아요.' : '연결 점검에서는 의견을 분석하지 않아요.'}</p>}
      </details>
      <section className="analysis-section context"><div className="section-title"><AlignLeft size={17} /><h2>현재 문단</h2><span>글 맥락 분석</span></div>
        {passage ? <div key={passage.id}>
          <nav className="paragraph-navigation" aria-label="문단 이동"><span className="selected-label">선택한 문단 · {active + 1}문단</span><button className="icon-button" disabled={active === 0} onClick={() => void jump(active - 1)} aria-label="이전 문단"><ChevronLeft size={14} /></button><span>{active + 1} / {result!.passages.length}</span><button className="icon-button" disabled={active === result!.passages.length - 1} onClick={() => void jump(active + 1)} aria-label="다음 문단"><ChevronRight size={14} /></button></nav>
          {block && <section className="reading-context"><h3>기사 맥락 <small>{active + 1}문단</small></h3><ReaderMarkdown text={block.summary} checks={block.checks} />{Array.from(new Set(block.checks.flatMap(c => c.evidence.map(e => e.url)))).map(url => <a className="context-source" key={url} href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname} <ExternalLink size={12} /></a>)}</section>}
          {block && <details className="article-evidence"><summary><span>이 문단을 살펴보면</span><ChevronDown size={16} aria-hidden="true" /></summary><ul className="paragraph-judgments">{block.checks.map((c, i) => <li key={i} className={`check check-${c.status}`}><span className="check-label">{labels[c.status]}</span><q className="judgment-quote">{c.quote}</q><ReaderMarkdown text={c.reason} />{c.evidence.map((e, j) => <a key={j} href={e.url} target="_blank" rel="noopener noreferrer"><span>{new URL(e.url).hostname} <ExternalLink size={11} /></span><q>{e.quote}</q></a>)}</li>)}{!block.checks.length && <li className="empty-copy">이 문단에 표시할 구절별 판단이 없어요.</li>}</ul></details>}
          <details className="original"><summary><ChevronDown size={14} aria-hidden="true" />원문 읽기 · {active + 1}문단</summary><blockquote>{passage.text}</blockquote><button className="source-link" onClick={() => void jump(active)}>원문 위치 <ExternalLink size={12} /></button></details>
        </div> : <p className="empty-copy">분석할 본문을 찾지 못했어요. 원문 추출 범위를 확인해야 해요.</p>}
      </section>
      {!!analysis?.images?.length && <details className="analysis-section collected-images"><summary className="section-title"><h2>본문 이미지 {analysis.images.length}개</h2><ChevronDown className="section-chevron" size={16} aria-hidden="true"/></summary>{analysis.images.map(image=><article className="opinion-entry" key={image.id}><p className="caption">{image.caption}</p>{!image.included&&<p className="notice">{image.failure || '이미지를 읽지 못했어요. 캡션만 전달했어요.'}</p>}<ReaderMarkdown text={analysis.blocks.find(b=>b.id===image.id)?.summary || ''}/><button className="source-link" onClick={()=>void jumpSource(image.id)}>이미지 원문 위치 <ExternalLink size={12}/></button></article>)}</details>}
      <details className="receipt"><summary><ChevronDown size={14} aria-hidden="true" />분석 정보</summary>{analysis ? <><p>AI 모델 · {analysis.model}</p><p>부가정보로 분류된 블록 {analysis.excludedBlocks}개</p><p>입력 {analysis.inputTokens.toLocaleString()} · 출력 {analysis.outputTokens.toLocaleString()} 토큰</p><p>AI 판단은 오류가 있을 수 있어요. 연결된 원문과 근거를 함께 확인해 주세요.</p></> : <p>연결 점검 결과입니다. AI 분석은 실행하지 않았어요.</p>}</details>
    </main>}
    <dialog ref={dialog} onCancel={() => setView(null)} onClose={() => setView(null)} className="sheet" aria-label={view === 'settings' ? '설정' : 'ScrollFact란?'}>{view === 'about' && <div className="sheet-header"><h2>{view === 'about' ? 'ScrollFact란?' : '설정'}</h2><button className="icon-button" aria-label="닫기" onClick={() => setView(null)}><X size={18} /></button></div>}
      {view === 'about' ? <div className="about-content"><span className="eyebrow">READ WITH CONTEXT</span><h2>같은 글,<br />다른 생각.<br /><span>이유를 읽는 시간.</span></h2><p className="about-lead">답글을 쓰기 전에,<br />상대가 왜 그렇게 말했는지.</p><div className="about-feature"><span>01</span><h3>글의 맥락을 읽어요</h3><p>문단의 주장과 앞뒤 흐름을 살피고, 자료와 대조할 부분을 원문에 연결해 확인해요.</p></div><div className="about-feature"><span>02</span><h3>관점과 이유를 함께 봐요</h3><p>찬반이라는 한마디보다, 글에 드러난 각자의 이유를 먼저 읽어요. 의견의 차이를 사실의 오류와 구분해요.</p></div><p className="about-note">ScrollFact는 판단을 대신하지 않아요.<br />원문과 근거를 읽고 스스로 판단하도록 돕습니다.</p></div> : view === 'settings' ? <SettingsPanel initialPage={settingsPage} profile={profile} updateProfile={applyProfile} preferences={preferences} change={change} busy={busy} checking={checking} connection={connection} saveNotice={saveNotice} checkConnection={checkConnection} close={() => setView(null)} /> : null}

    </dialog>
  </div>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Reader /></StrictMode>)
