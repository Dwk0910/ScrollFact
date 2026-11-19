import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check,
  ChevronRight, CircleHelp, FileText, Link2, MessageSquare, RotateCcw,
  ScanLine, ScrollText, Sparkles, Unlink, X, Copy, ExternalLink,
} from 'lucide-react'
import type { JourneyData } from './types'

type Session = { saved: string[]; draft: string; connected: boolean }
const storageKey = 'scrollfact-journey-demo-v1'
function restore(data: JourneyData): Session {
  const initial = { saved: [], draft: data.examples[0].draft, connected: false }
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (!value || !Array.isArray(value.saved) || typeof value.draft !== 'string') return initial
    return {
      saved: [...new Set<string>(value.saved.filter((id: unknown) => data.passages.some(p => p.id === id)))],
      draft: value.draft.slice(0, 4000), connected: value.connected === true,
    }
  } catch { return initial }
}
function Highlight({ text, phrase }: { text: string; phrase: string }) {
  const start = text.indexOf(phrase)
  if (start < 0) return text
  return <>{text.slice(0, start)}<mark>{phrase}</mark>{text.slice(start + phrase.length)}</>
}

export function Journey({ data }: { data: JourneyData }) {
  const [session, setSession] = useState<Session>(() => restore(data))
  const [page, setPage] = useState<'read' | 'write'>('read')
  const [activeId, setActiveId] = useState(data.passages[0].id)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [pointIndex, setPointIndex] = useState(0)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const passageNodes = useRef(new Map<string, HTMLElement>())
  const active = data.passages.find(p => p.id === activeId) ?? data.passages[0]
  const example = data.examples.find(e => e.draft === session.draft)
  const point = example?.points[Math.min(pointIndex, example.points.length - 1)]
  const reference = data.passages.find(p => p.id === point?.sourceId)
  const hasReference = Boolean(session.connected && reference && session.saved.includes(reference.id))
  const allReferences = Boolean(example && session.connected && example.points.every(p => session.saved.includes(p.sourceId)))
  const savedPassages = data.passages.filter(p => session.saved.includes(p.id))
  const activeIndex = data.passages.findIndex(p => p.id === active.id)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(session)) } catch { /* Session still works in memory. */ }
  }, [session])
  useEffect(() => {
    if (page !== 'read' || !targetId) return
    const node = passageNodes.current.get(targetId)
    viewport.current?.scrollTo({ top: (node?.offsetTop ?? 0) - 28, behavior: 'instant' })
  }, [page, targetId])

  function toggleSaved(id: string) {
    const removing = session.saved.includes(id)
    setSession(previous => {
      const saved = removing ? previous.saved.filter(value => value !== id) : [...previous.saved, id]
      return { ...previous, saved, connected: previous.connected && saved.length > 0 }
    })
    setNotice(removing ? '참고 자료에서 문단을 뺐습니다.' : '문단과 주변 문맥을 담았습니다. 의견 쓰기에서도 이어서 볼 수 있어요.')
  }
  function goToSource(id: string) {
    setActiveId(id)
    if (page === 'write') {
      setTargetId(id)
      setPage('read')
    } else {
      const node = passageNodes.current.get(id)
      viewport.current?.scrollTo({ top: (node?.offsetTop ?? 0) - 28, behavior: 'smooth' })
    }
  }
  function followScroll() {
    const container = viewport.current
    if (!container) return
    const line = container.scrollTop + container.clientHeight * 0.42
    let current = data.passages[0].id
    for (const passage of data.passages) {
      const node = passageNodes.current.get(passage.id)
      if (node && node.offsetTop <= line) current = passage.id
    }
    setActiveId(current)
  }
  function switchPage(next: 'read' | 'write') {
    setPage(next)
    setNotice('')
    if (next === 'read') setTargetId(activeId)
  }
  function loadExample(id: string) {
    const next = data.examples.find(e => e.id === id)!
    setSession(previous => ({ ...previous, draft: next.draft }))
    setPointIndex(0)
    setNotice('예시 초안을 불러왔습니다. 준비된 설명을 확인해 보세요.')
    setCopied(false)
  }
  function updateDraft(draft: string) {
    setSession(previous => ({ ...previous, draft }))
    setPointIndex(0)
    setCopied(false)
  }
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(session.draft)
      setCopied(true)
      setNotice('초안을 복사했습니다. 게시 여부는 직접 결정해 주세요.')
    } catch { setNotice('복사 권한이 없어 자동으로 복사하지 못했습니다. 작성창에서 직접 선택해 복사해 주세요.') }
  }
  function reset() {
    setSession({ saved: [], draft: data.examples[0].draft, connected: false })
    setPage('read')
    setActiveId(data.passages[0].id)
    setTargetId(null)
    viewport.current?.scrollTo({ top: 0, behavior: 'instant' })
    setPointIndex(0)
    setCopied(false)
    setNotice('데모 세션을 처음으로 되돌렸습니다.')
  }


  return <div className="j-app">
    <header className="j-header">
      <a className="j-brand" href="/journey.html"><span><ScanLine size={23} /></span>scroll<span className="j-brand-light">fact</span><i>맥락을 이어 읽다</i></a>
      <div className="j-header-right"><span className="j-demo"><span /> 체험 데모 · AI 미연결</span><button className="j-icon" aria-label="데모 처음부터 시작" title="데모 처음부터 시작" onClick={reset}><RotateCcw size={17} /></button></div>
    </header>
    <nav className="j-navigation" aria-label="읽기와 쓰기 단계">
      <div className="j-steps">
        <button className={page === 'read' ? 'is-active' : ''} aria-current={page === 'read' ? 'step' : undefined} onClick={() => switchPage('read')}><span>01</span> 원문 읽기 <small>참고할 문단 담기</small></button>
        <ChevronRight size={17} />
        <button className={page === 'write' ? 'is-active' : ''} aria-current={page === 'write' ? 'step' : undefined} onClick={() => switchPage('write')}><span>02</span> 의견 쓰기 <small>맥락을 이어서</small></button>
      </div>
      <span className="j-session"><Link2 size={14} /> 한 세션에 담긴 문단 <b>{session.saved.length}</b></span>
    </nav>
    <div className="j-demo-line">두 가상 사이트를 오가는 체험입니다. 문단 담기·이동·편집은 실제로 동작하고, 설명과 제안은 준비된 예시입니다.</div>
    <div className="j-workspace">
      <main className="j-document">
        <div className="j-address"><span className="j-window-dots"><i /><i /><i /></span><span>{page === 'read' ? data.document.url : 'community.example/students/discussion'}</span><span className="j-address-tag">가상 사이트 {page === 'read' ? '1' : '2'}</span></div>
        {page === 'read' ? <div ref={viewport} className="j-scroll-document" onScroll={followScroll} tabIndex={0} aria-label="공지 원문. 스크롤하면 옆 패널이 문단을 따라옵니다.">
          <article className="j-article">
            <div className="j-article-heading"><span className="j-eyebrow">HANBIT SCHOOL / NOTICE</span><h1>{data.document.title}</h1><p>함께 읽고, 궁금한 점은 함께 확인해요.</p><div className="j-byline">{data.document.publisher}<span>{data.document.date}</span></div></div>
            <div className="j-read-hint"><ArrowDown size={16} /><span>아래로 읽어보세요. 옆의 맥락 카드가 함께 움직입니다.</span></div>
            {data.passages.map((passage, index) => <section
              ref={node => { if (node) passageNodes.current.set(passage.id, node); else passageNodes.current.delete(passage.id) }}
              key={passage.id} className={`j-passage ${activeId === passage.id ? 'is-reading' : ''}`} aria-label={`원문 문단 ${index + 1}`}>
              <div className="j-passage-number"><span>{String(index + 1).padStart(2, '0')}</span>{session.saved.includes(passage.id) && <span className="j-saved-tag"><BookmarkCheck size={13} /> 담은 문단</span>}</div>
              <h2>{passage.title}</h2>
              <p><Highlight text={passage.text} phrase={activeId === passage.id ? passage.highlight : '\u0000'} /></p>
              <button className={`j-save-inline ${session.saved.includes(passage.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(passage.id)}>{session.saved.includes(passage.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{session.saved.includes(passage.id) ? '담기 취소' : '참고할 문단으로 담기'}</button>
            </section>)}
            <div className="j-reading-end"><span className="j-eyebrow">CONTEXT GOES WITH YOU</span><h2>읽은 맥락을,<br />내가 쓰는 문장 곁으로.</h2><button className="j-primary" onClick={() => switchPage('write')}>의견 쓰기로 이동 <ArrowRight size={17} /></button></div>
          </article>
        </div> : <div className="j-composer-scroll">
          <div className="j-community-title"><span className="j-eyebrow">HANBIT / STUDENT LOUNGE</span><h1>같이 이야기해요.</h1><p>다르게 생각해도, 같은 맥락에서 출발할 수 있도록.</p></div>
          <article className="j-post"><div className="j-author"><span>H</span>{data.conversation.author}</div><h2>{data.conversation.title}</h2><p>{data.conversation.text}</p><div className="j-post-footer"><MessageSquare size={14} /> 이 글에 내 의견 남기기</div></article>
          <div className="j-link-box"><div><Link2 size={17} /><strong>{session.connected ? '참고 자료가 이 초안에 연결됐어요' : '앞에서 읽은 공지를 참고하시나요?'}</strong></div><p>{session.saved.length ? `담아둔 ${session.saved.length}개 문단을 연결하면 내 초안과 함께 확인할 수 있어요.` : '원문 읽기에서 참고할 문단을 먼저 담아 주세요.'}</p><button className={session.connected ? 'j-secondary' : 'j-primary'} disabled={!session.saved.length} onClick={() => { setSession(previous => ({ ...previous, connected: !previous.connected })); setNotice(session.connected ? '참고 자료 연결을 해제했습니다.' : '사용자가 선택한 자료를 이 초안에 연결했습니다.') }}>{session.connected ? <Unlink size={14} /> : <Link2 size={14} />}{session.connected ? '연결 해제' : '이 초안에 자료 연결'}</button></div>
          <div className="j-draft-header"><h2>내가 전하고 싶은 말</h2><span>직접 수정할 수 있어요</span></div>
          <div className="j-example-buttons" aria-label="체험할 초안 예시">{data.examples.map(item => <button key={item.id} className={example?.id === item.id ? 'is-selected' : ''} onClick={() => loadExample(item.id)}>{item.label}</button>)}</div>
          <label className="j-draft-label" htmlFor="journey-draft">{example ? `전달 목적 · ${example.purpose}` : '직접 작성한 초안 · AI 분석 미연결'}</label>
          <textarea id="journey-draft" value={session.draft} maxLength={4000} placeholder="내 의견을 적어보세요." onChange={event => updateDraft(event.target.value)} onSelect={event => {
            if (!example) return
            const position = event.currentTarget.selectionStart
            const index = example.points.findLastIndex(item => session.draft.indexOf(item.phrase) <= position)
            if (index >= 0) setPointIndex(index)
          }} />
          <div className="j-draft-footer"><span>{session.draft.length} / 4,000</span><button className="j-secondary" disabled={!session.draft.trim()} onClick={() => void copyDraft()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? '복사했어요' : '초안 복사'}</button></div>
          {example && <div className="j-sentence-map"><div className="j-label"><ScrollText size={15} /> 표현을 선택하면 옆에서 원문을 연결해 보여줘요</div>{example.points.map((item, index) => <button className={pointIndex === index ? 'is-focused' : ''} key={item.phrase} onClick={() => setPointIndex(index)}><span>{String(index + 1).padStart(2, '0')}</span><q>{item.phrase}</q><ChevronRight size={15} /></button>)}</div>}
          {!example && <div className="j-custom-note"><CircleHelp size={18} /><p>직접 수정한 글은 그대로 유지됩니다. 이 데모는 자유 입력을 AI로 분석하지 않아요. 위의 예시를 선택하면 준비된 비교 흐름을 다시 체험할 수 있습니다.</p></div>}
          <p className="j-local-note">작성한 내용은 이 브라우저에만 보관합니다. 외부 서버 전송이나 자동 게시는 하지 않습니다.</p>
        </div>}
      </main>
      <aside className="j-panel" aria-label="ScrollFact 맥락 패널">
        <div className="j-panel-heading"><span><ScanLine size={19} />{page === 'read' ? '지금 읽는 맥락' : '내 문장 곁의 맥락'}</span><span className="j-live"><i />{page === 'read' ? '스크롤 따라가기' : '선택한 표현 연결'}</span></div>
        <div className="j-panel-body">
          {page === 'read' ? <>
            <div className="j-context-card" key={active.id}><div className="j-card-top"><span className="j-eyebrow">READING NOW</span><span>{String(activeIndex + 1).padStart(2, '0')} <small>/ 04</small></span></div><h2>{active.title}</h2><div className="j-quote">“{active.highlight}”</div><p>{active.context}</p><button className={session.saved.includes(active.id) ? 'j-secondary j-full' : 'j-primary j-full'} onClick={() => toggleSaved(active.id)}>{session.saved.includes(active.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{session.saved.includes(active.id) ? '담은 문단 · 취소하기' : '이 문단과 맥락 담기'}</button></div>
            <div className="j-question"><CircleHelp size={17} /><div><span>다음 대화를 여는 질문</span><p>{active.question}</p></div></div>
            <div className="j-location-map" aria-label="원문 문단 바로가기">{data.passages.map((passage, index) => <button key={passage.id} className={active.id === passage.id ? 'is-active' : ''} onClick={() => goToSource(passage.id)} aria-label={`원문 ${index + 1}번 문단으로 이동`}><span /><small>{String(index + 1).padStart(2, '0')}</small></button>)}</div>
          </> : !session.connected ? <div className="j-empty"><span className="j-empty-icon"><Link2 size={27} /></span><h2>어떤 글을 참고했는지<br />직접 연결해 주세요.</h2><p>페이지를 옮겼다는 이유만으로 관련성을 추측하지 않습니다. 담아둔 공지를 초안에 연결하면 비교를 시작할 수 있어요.</p><button className="j-text-button" onClick={() => switchPage('read')}><ArrowLeft size={14} /> 원문에서 문단 담기</button></div> : !example ? <div className="j-empty"><span className="j-empty-icon"><MessageSquare size={27} /></span><h2>지금은 내 생각을<br />다듬는 시간.</h2><p>수정한 초안에 이전 예시의 설명을 붙이지 않습니다. 담아둔 원문은 아래에서 계속 확인할 수 있어요.</p><button className="j-text-button" onClick={() => loadExample(data.examples[0].id)}>예시 비교 다시 보기 <ArrowRight size={14} /></button></div> : !hasReference ? <div className="j-empty"><span className="j-empty-icon"><Bookmark size={27} /></span><h2>이 표현과 비교할<br />문단이 아직 없어요.</h2><p>“{point?.phrase}”을 확인하려면 관련 원문을 직접 읽고 참고 자료로 담아 주세요.</p>{reference && <button className="j-primary" onClick={() => goToSource(reference.id)}>관련 원문 읽기 <ArrowRight size={14} /></button>}</div> : <>
            <div className={`j-comparison ${point?.missing ? 'is-unknown' : ''}`}><div className="j-label"><Sparkles size={14} />{point?.missing ? '확인할 정보가 남아 있어요' : '원문과 함께 살펴보기'}<span>예시</span></div><div className="j-draft-quote">“{point?.phrase}”</div><h2>{point?.title}</h2><p>{point?.explanation}</p></div>
            {reference && <div className="j-reference">
              <div className="j-label"><FileText size={14} /> 담아둔 원문 · {String(data.passages.indexOf(reference) + 1).padStart(2, '0')}</div>
              <blockquote><Highlight text={reference.text} phrase={reference.highlight} /></blockquote>
              <button className="j-text-button" onClick={() => goToSource(reference.id)}>원문 위치에서 확인 <ExternalLink size={13} /></button>
            </div>}
            {allReferences && <div className="j-alternatives"><div className="j-label">내가 고르는 다음 표현</div><p>의견을 유지하거나, 확인 질문으로 이어갈 수 있어요.</p>{example.alternatives.map(option => <div className="j-alternative" key={option.label}><h3>{option.label}</h3><p>{option.text}</p><button className="j-text-button" onClick={() => { updateDraft(option.text); setNotice('선택한 표현을 초안에 넣었습니다. 자유롭게 더 수정할 수 있어요.') }}>이 표현을 초안에 넣기 <ArrowRight size={14} /></button></div>)}<button className="j-keep" onClick={() => setNotice('초안을 그대로 유지했습니다. 원문을 더 확인하거나 직접 수정할 수 있어요.')}>내 표현 그대로 유지</button></div>}
          </>}
          <div className="j-collection"><div className="j-collection-heading"><h3><Bookmark size={15} /> 담아둔 맥락</h3><span>{session.saved.length}개 문단</span></div>{savedPassages.length ? savedPassages.map(passage => <div className="j-saved-row" key={passage.id}><button onClick={() => goToSource(passage.id)}><FileText size={15} /><span>{passage.title}</span><ChevronRight size={13} /></button><button className="j-remove" aria-label={`${passage.title} 담기 취소`} onClick={() => toggleSaved(passage.id)}><X size={13} /></button></div>) : <p className="j-collection-empty">스크롤하며 필요한 문단을 담아보세요.<br />다른 페이지로 가도 맥락은 남아 있어요.</p>}<small>가상 공지의 캡처 내용입니다. 사실 여부를 인증한 자료가 아닙니다.</small></div>
        </div>
        <div className="j-panel-footer">{page === 'read' ? <button className="j-primary j-full" onClick={() => switchPage('write')}>담은 맥락으로 의견 쓰기 <ArrowRight size={16} /></button> : <button className="j-secondary j-full" onClick={() => switchPage('read')}><ArrowLeft size={16} /> 원문으로 돌아가기</button>}<p>판단의 결론은 당신에게, 확인할 맥락은 곁에.</p></div>
      </aside>
    </div>
    <div className={`j-toast ${notice ? 'is-visible' : ''}`} role="status" aria-live="polite">{notice && <><Check size={16} /><span>{notice}</span><button aria-label="안내 닫기" onClick={() => setNotice('')}><X size={14} /></button></>}</div>
  </div>
}
