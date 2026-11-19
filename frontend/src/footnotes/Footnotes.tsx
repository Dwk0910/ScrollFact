import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronDown, CornerDownRight, Flower2, MessageCircle, ScanLine, Send, X } from 'lucide-react'
import type { FootnotesDemo, Note, Scenario } from './types'

const behavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
type Target = { id: string; text: string; noteId: string }
type View = { targetId: string | null; sourceVisible: boolean; validSource: boolean; top: number }

function ReadingPage({ scenario, enabled }: { scenario: Scenario; enabled: boolean }) {
  const targets = useRef(new Map<string, HTMLElement>())
  const sources = useRef(new Map<string, HTMLElement>())
  const commentSection = useRef<HTMLElement>(null)
  const [view, setView] = useState<View>({ targetId: null, sourceVisible: false, validSource: false, top: 180 })
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [manual, setManual] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [returnPoint, setReturnPoint] = useState<{ y: number; targetId: string } | null>(null)
  const [highlighted, setHighlighted] = useState(false)
  const [draft, setDraft] = useState('')
  const [comments, setComments] = useState<string[]>([])
  const definitions: Target[] = [
    ...(scenario.headlineNoteId ? [{ id: 'headline', text: scenario.title.replace('\n', ' '), noteId: scenario.headlineNoteId }] : []),
    ...scenario.comments.flatMap(c => c.noteId ? [{ id: c.id, text: c.text, noteId: c.noteId }] : []),
  ]

  useEffect(() => {
    let frame = 0
    // UI placement follows the viewport; it does not infer reading or comprehension.
    const measure = () => {
      const topBoundary = 142
      // On narrow screens the note docks below the reading area, so a sentence
      // underneath that card must not count as the current visible sentence.
      const bottomBoundary = window.innerHeight - (window.innerWidth <= 850 ? 220 : 24)
      const sourceInView = [...sources.current.values()].some(node => {
        const rect = node.getBoundingClientRect()
        return rect.top >= topBoundary && rect.bottom <= bottomBoundary
      })
      const visible = [...targets.current.entries()].map(([id, node]) => ({ id, rect: node.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > topBoundary && rect.top < bottomBoundary - 45)
        .sort((a, b) => Math.abs(a.rect.top - window.innerHeight * .43) - Math.abs(b.rect.top - window.innerHeight * .43))
      const current = visible[0]
      const noteId = current?.id === 'headline' ? scenario.headlineNoteId : scenario.comments.find(c => c.id === current?.id)?.noteId
      const note = scenario.notes.find(n => n.id === noteId)
      const source = note && sources.current.get(note.sourceId)
      const next = {
        targetId: current?.id ?? null,
        sourceVisible: sourceInView,
        validSource: Boolean(source && note && source.textContent?.includes(note.quote)),
        top: Math.round(Math.max(156, Math.min(current?.rect.top ?? 180, window.innerHeight - 310))),
      }
      setView(previous => Object.keys(next).every(key => next[key as keyof View] === previous[key as keyof View]) ? previous : next)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [scenario])

  const active = definitions.find(target => target.id === view.targetId)
  const note = scenario.notes.find(item => item.id === active?.noteId)
  const showNote = enabled && active && note && view.validSource && !returnPoint && dismissed !== active.id && (!view.sourceVisible || manual === active.id)
  function openNote(id: string) {
    const selected = definitions.find(target => target.id === id)
    const linkedNote = scenario.notes.find(item => item.id === selected?.noteId)
    const node = linkedNote && sources.current.get(linkedNote.sourceId)
    if (!node || !linkedNote || !node.textContent?.includes(linkedNote.quote)) return
    setView(previous => ({ ...previous, targetId: id, validSource: true }))
    setDismissed(null)
    setManual(id)
    setExpanded(false)
  }
  function visitSource(target: Target, linkedNote: Note) {
    const node = sources.current.get(linkedNote.sourceId)
    if (!node || !node.textContent?.includes(linkedNote.quote)) return
    setReturnPoint({ y: window.scrollY, targetId: target.id })
    setHighlighted(true)
    node.scrollIntoView({ behavior: behavior(), block: 'center' })
    node.focus({ preventScroll: true })
  }
  function returnToReading() {
    if (!returnPoint) return
    window.scrollTo({ top: returnPoint.y, behavior: behavior() })
    targets.current.get(returnPoint.targetId)?.focus({ preventScroll: true })
    setReturnPoint(null)
    setHighlighted(false)
    setManual(null)
  }
  return <>
    <div className="n-document-layout">
      <article className={`n-document n-theme-${scenario.id}`} aria-label={`${scenario.tab} 체험 페이지`}>
        <header className="n-publication"><span className="n-publisher-mark">{scenario.initials}</span><div><strong>{scenario.publisher}</strong><span>{scenario.category}</span></div><span className="n-fiction">가상 게시물</span></header>
        <div className="n-article-heading">
          <p className="n-kicker">{scenario.kicker}</p>
          <h1 ref={node => { if (node && scenario.headlineNoteId) targets.current.set('headline', node); else targets.current.delete('headline') }} tabIndex={-1} className={enabled && scenario.headlineNoteId ? 'n-linked-title' : ''}>{scenario.title}</h1>
          {scenario.headlineNoteId && <div className="n-flag-slot">{enabled ? <button className="n-marker" onClick={() => openNote('headline')} aria-label="제목의 관련 각주 열기"><span>1</span>연결된 조건<CornerDownRight size={13}/></button> : <span className="n-off-note">각주를 끄고 원래 페이지를 읽고 있어요</span>}</div>}
          <p className="n-lead">{scenario.lead}</p>
          <button className="n-skip" onClick={() => commentSection.current?.scrollIntoView({ behavior: behavior(), block: 'start' })}>댓글까지 읽어보기<ArrowDown size={14}/></button>
        </div>
        <div className="n-poster" aria-hidden="true"><span>{scenario.visualSub}</span><strong>{scenario.visualTitle}</strong><div className="n-poster-art">{scenario.id === 'weekend' ? <Flower2/> : scenario.id === 'library' ? <><i/><i/><i/><i/><i/></> : <><b/><b/><b/></>}</div><small>GOOD THINGS, CLOSE TO YOU.</small></div>
        <div className="n-article-body">
          <dl className="n-facts">{scenario.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
          <section className={`n-source ${highlighted ? 'is-highlighted' : ''}`} aria-label="연결된 원문">
            <div className="n-source-heading"><BookOpen size={16}/><h2>{scenario.sourceTitle}</h2>{enabled && <span>각주 1의 원문</span>}</div>
            <p ref={node => { if (node) sources.current.set(scenario.sourceId, node); else sources.current.delete(scenario.sourceId) }} tabIndex={-1} className="n-source-quote">{scenario.sourceQuote}</p>
            <p className="n-source-more">{scenario.sourceMore}</p>
          </section>
          {scenario.paragraphs.map(paragraph => <section className="n-paragraph" key={paragraph.title}><h2>{paragraph.title}</h2><p>{paragraph.body}</p></section>)}
          <div className="n-signoff"><span>{scenario.initials}</span><p>일상에 작은 연결을.<br/><strong>{scenario.publisher}</strong></p></div>
        </div>
        <section ref={commentSection} className="n-comments" aria-label="댓글">
          <div className="n-comments-heading"><h2>함께 나누는 이야기 <span>{scenario.comments.length + comments.length}</span></h2><MessageCircle size={18}/></div>
          {scenario.comments.map((comment, index) => <div className={`n-comment ${comment.noteId && enabled ? 'has-note' : ''}`} key={comment.id}>
            <div className={`n-person n-person-${index}`}>{comment.author[0]}</div><div className="n-comment-content"><div className="n-comment-meta"><strong>{comment.author}</strong><span>{comment.time}</span></div>
              <p tabIndex={-1} ref={node => { if (node && comment.noteId) targets.current.set(comment.id, node); else targets.current.delete(comment.id) }}>{comment.text}</p>
              {comment.noteId && enabled && <button className="n-marker" onClick={() => openNote(comment.id)} aria-label={`${comment.text} 관련 각주 열기`}><span>1</span>{scenario.notes.find(n => n.id === comment.noteId)?.kind === 'unknown' ? '확인된 내용과 빈칸' : '본문의 관련 안내'}<CornerDownRight size={13}/></button>}
            </div>
          </div>)}
          {comments.map((comment, index) => <div className="n-comment" key={index}><div className="n-person">나</div><div className="n-comment-content"><div className="n-comment-meta"><strong>나</strong><span>지금 · 데모</span></div><p>{comment}</p></div></div>)}
          <form className="n-compose" onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; setComments(previous => [...previous, draft.trim()]); setDraft('') }}>
            <textarea aria-label="댓글 작성" placeholder="이야기를 남겨보세요…" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} rows={2}/><button type="submit" aria-label="데모에 댓글 게시" disabled={!draft.trim()}><Send size={17}/></button>
          </form>
          <p className="n-local-note" role="status">{comments.length ? '댓글을 이 데모에만 남겼어요. 새로고침하면 초기화됩니다.' : '작성한 댓글은 이 데모에서만 표시돼요.'}</p>
        </section>
      </article>
      <aside className="n-margin"><div className="n-margin-intro"><span className="n-margin-rule"/><p>페이지는 그대로.<br/><strong>필요한 맥락만 곁에.</strong></p><span>스크롤하며 읽어보세요.<br/>원문이 보이면 각주는 접힙니다.</span></div></aside>
    </div>
    {showNote && <aside className={`n-note n-note-${note.kind}`} style={{ top: view.top }} aria-label="현재 문장에 연결된 맥락 각주">
      <div className="n-note-header"><span><ScanLine size={16}/> SCROLLFACT <i>1</i></span><button aria-label="현재 각주 닫기" onClick={() => { setDismissed(active.id); setManual(null); targets.current.get(active.id)?.focus({ preventScroll: true }) }}><X size={16}/></button></div>
      <p className="n-note-target">“{active.text}”</p>
      <div className="n-note-label"><span/>{note.label}</div>
      <strong className="n-note-summary">{note.summary}</strong>
      {expanded && <div className="n-note-expanded"><p>{note.detail}</p><blockquote>{note.quote}</blockquote><small>이 페이지의 원문 인용 · 준비된 연결 예시</small></div>}
      <div className="n-note-actions"><button onClick={() => visitSource(active, note)}>원문에서 확인<ArrowUpRight size={14}/></button><button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '접기' : '근거 펼치기'}<ChevronDown size={13} className={expanded ? 'up' : ''}/></button></div>
    </aside>}
    {returnPoint && <div className="n-return" role="region" aria-label="원문 확인 후 돌아가기"><span><Check size={16}/> 연결된 원문이에요</span><button onClick={returnToReading}><ArrowLeft size={15}/>읽던 문장으로 돌아가기</button><button aria-label="돌아가기 안내 닫기" onClick={() => { setReturnPoint(null); setHighlighted(false) }}><X size={16}/></button></div>}
    <footer className="n-bottom"><ScanLine size={23}/><strong>스크롤해도, 맥락은 함께.</strong><details><summary>이 데모에 대해</summary><p>가상의 공지·기사·댓글과 준비된 연결로 동작합니다. 실제 AI 분석과 외부 전송은 없습니다. 새로 입력한 댓글을 분석하지 않으며, 실제 사이트에 설치된 확장 기능도 아닙니다.</p><p>본문 인용·스크롤 위치·원문 왕복·각주 켜기/끄기는 실제 동작합니다. 페이지를 바꾸거나 새로고침하면 작성한 댓글은 초기화됩니다.</p><a href="/feed.html">이전 스크롤 설명창 데모<ArrowUpRight size={13}/></a></details></footer>
  </>
}

export function Footnotes({ data }: { data: FootnotesDemo }) {
  const [scenarioId, setScenarioId] = useState(data.scenarios[0].id)
  const [enabled, setEnabled] = useState(true)
  const scenario = data.scenarios.find(item => item.id === scenarioId)!
  return <div className="n-app">
    <header className="n-toolbar">
      <div className="n-toolbar-top"><a href="/footnotes.html" className="n-brand"><ScanLine size={24}/><strong>scroll<span>fact</span></strong><i>LAB / 02</i></a><span className="n-demo-status">AI 미연결 · 체험</span></div>
      <div className="n-toolbar-bottom"><nav aria-label="체험할 페이지">{data.scenarios.map((item, index) => <button key={item.id} aria-pressed={scenarioId === item.id} onClick={() => { setScenarioId(item.id); window.scrollTo({ top: 0, behavior: 'instant' }) }}><span>0{index + 1}</span>{item.tab}</button>)}</nav><button className={`n-toggle ${enabled ? 'on' : ''}`} role="switch" aria-label="맥락 각주" aria-checked={enabled} onClick={() => setEnabled(!enabled)}><span><i/></span>각주 {enabled ? '켜짐' : '꺼짐'}</button></div>
    </header>
    <div className="n-lab-caption"><span>IDEA 02 — 맥락 각주</span><p>읽던 자리에서, 빠진 한 줄까지.</p></div>
    <ReadingPage key={scenario.id} scenario={scenario} enabled={enabled}/>
  </div>
}
