import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUpRight, BookOpen, CircleHelp, FileText, Link2, MessageCircle, Monitor, ScanLine, Smartphone, X } from 'lucide-react'
import type { Trail } from './context'
import './trail.css'

export function ContextTrail({ trail, mode, onClose, onSource, onUse }: {
  trail: Trail; mode: 'question' | 'reply'; onClose: () => void; onSource: () => void; onUse: (text: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const sections = useRef(new Map<number, HTMLElement>())
  const [active, setActive] = useState(0)
  const heading = useId()
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const node = dialog.current!
    previousFocus.current = document.activeElement as HTMLElement
    const overflow = document.body.style.overflow
    node.showModal()
    document.body.style.overflow = 'hidden'
    scroller.current?.focus({ preventScroll: true })
    return () => { if (node.open) node.close(); document.body.style.overflow = overflow }
  }, [])
  function leave(action: () => void) {
    dialog.current?.close()
    previousFocus.current?.focus({ preventScroll: true })
    action()
  }
  function go(index: number) {
    const node = sections.current.get(index)
    if (!node || !scroller.current) return
    scroller.current.scrollTo({ top: node.offsetTop, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  function followScroll() {
    const node = scroller.current
    if (!node) return
    const line = node.scrollTop + node.clientHeight * .45
    let next = 0
    for (const [index, section] of sections.current) if (section.offsetTop <= line) next = index
    setActive(next)
  }
  const suggestion = mode === 'reply' ? trail.replySuggestion : trail.questionSuggestion
  const icons = [MessageCircle, FileText, BookOpen, CircleHelp]
  return <dialog ref={dialog} className="t-dialog" aria-labelledby={heading} onCancel={event=>{event.preventDefault();leave(onClose)}}>
    <header className="t-header"><div><ScanLine size={23}/><strong id={heading}>그 말, 어디에서 시작됐을까?</strong><span>ScrollFact</span></div><button aria-label="맥락 닫고 돌아가기" onClick={()=>leave(onClose)}><X size={20}/></button></header>
    <div className="t-layout">
      <aside className="t-anchor">
        <span className="t-eyebrow">FOLLOW THE CONTEXT</span>
        <div className="t-original"><span><MessageCircle size={14}/> 출발한 댓글 · {trail.commentAuthor}</span><blockquote>“{trail.comment}”</blockquote></div>
        <nav className="t-map" aria-label="맥락의 연결 위치">{trail.steps.map((step,index)=>{
          const Icon = icons[index] ?? FileText
          return <button key={step.kind} aria-current={active===index?'step':undefined} className={active===index?'active':''} onClick={()=>go(index)}><span><Icon size={16}/></span><div><small>0{index+1}</small>{step.label}</div></button>
        })}</nav>
        <p className="t-anchor-note">원문과 설명, 모르는 부분을<br/>구분하며 이어 읽습니다.</p>
        <span className="t-example">가상 게시물 · 준비된 설명</span>
      </aside>
      <div className="t-reading">
        <div className="t-progress"><span style={{width:`${((active+1)/trail.steps.length)*100}%`}}/></div>
        <div className="t-scroll" ref={scroller} tabIndex={0} role="region" aria-label="맥락 이어 읽기. 아래로 스크롤하면 다음 근거가 나타납니다." onScroll={followScroll}>
          {trail.steps.map((step,index)=><section key={step.kind} ref={node=>{if(node)sections.current.set(index,node);else sections.current.delete(index)}} className={`t-section t-${step.kind}`} aria-label={`${index+1}단계 ${step.label}`}>
            <div className="t-step-label"><span>0{index+1}</span>{step.label}<small>{step.kind==='source'?'직접 인용':step.kind==='explanation'?'근거를 풀어 쓴 예시':step.kind==='unknown'?'정보 부족':'댓글에서 출발'}</small></div>
            <h2>{step.title}</h2>
            {step.kind==='question' && <div className="t-question-card"><div className="t-person">p</div><div><span>{trail.commentAuthor}</span><p>{trail.comment}</p></div><MessageCircle size={20}/></div>}
            {step.kind==='source' && <div className="t-source-card"><span><FileText size={15}/> @{trail.sourceAuthor} · 게시물 설명</span><blockquote><mark>{trail.sourceQuote}</mark></blockquote><button onClick={()=>leave(onSource)}>게시물의 원래 위치에서 보기<ArrowUpRight size={14}/></button></div>}
            <p className="t-body">{step.body}</p>
            {step.kind==='explanation' && <>
              <div className="t-editions">{trail.editions.map((edition,i)=><div key={edition.name}>{i===0?<Monitor size={24}/>:<Smartphone size={24}/>}<strong>{edition.name}</strong><span>{edition.device}</span></div>)}</div>
              <div className="t-bridge"><Link2 size={18}/><p>{trail.bridge}</p></div>
              <div className="t-links">{trail.links.map(link=><a href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.title}<ArrowUpRight size={12}/></a>)}</div>
            </>}
            {step.kind==='unknown' && <>
              <div className="t-unanswered"><CircleHelp size={23}/><div><span>운영자에게 확인할 부분</span><strong>{trail.unknownQuestion}</strong></div></div>
              <div className="t-next-question"><span>{mode==='reply'?'설명을 덧붙여 답한다면':'조금 더 구체적으로 묻는다면'}</span><p>{suggestion}</p><button onClick={()=>leave(()=>onUse(suggestion))}>{mode==='reply'?'이 설명을 내 댓글에 넣기':'이 질문을 내 댓글에 넣기'}<ArrowUpRight size={14}/></button></div>
              <button className="t-return" onClick={()=>leave(onClose)}><ArrowLeft size={16}/>내 댓글 그대로 돌아가기</button>
              <p className="t-end-note">자동으로 수정하거나 게시하지 않습니다.</p>
            </>}
            {index < trail.steps.length-1 && <button className="t-continue" onClick={()=>go(index+1)}><span>{index===0?'아래로 스크롤해서 맥락 이어보기':`다음 연결 · ${trail.steps[index+1].label}`}</span><ArrowDown size={18}/></button>}
          </section>)}
        </div>
        <footer className="t-footer"><span aria-live="polite">0{active+1} / 0{trail.steps.length} <b>{trail.steps[active].label}</b></span><span>스크롤하거나 ↓ 키로 이어 읽기</span></footer>
      </div>
    </div>
  </dialog>
}
