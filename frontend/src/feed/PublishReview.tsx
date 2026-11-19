import { useEffect, useId, useRef } from 'react'
import { ArrowLeft, ArrowDown, TriangleAlert, X } from 'lucide-react'
import type { ReviewFinding } from './context'

export type PendingReview = { text: string; findings: ReviewFinding[] }

export function PublishReview({ review, onEdit, onPublish, onExplore }: {
  review: PendingReview; onEdit: () => void; onPublish: () => void; onExplore?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const finished = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const node = dialog.current!
    const previousOverflow = document.body.style.overflow
    node.showModal()
    editButton.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      if (node.open) node.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])
  function finish(action: () => void) {
    if (finished.current) return
    finished.current = true
    dialog.current?.close()
    action()
  }
  const parts: { text: string; marked: boolean }[] = []
  let offset = 0
  for (const finding of review.findings) {
    parts.push({ text: review.text.slice(offset, finding.start), marked: false })
    parts.push({ text: review.text.slice(finding.start, finding.end), marked: true })
    offset = finding.end
  }
  parts.push({ text: review.text.slice(offset), marked: false })
  return <dialog ref={dialog} className="f-publish-review" role="alertdialog" aria-modal="true"
    aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); finish(onEdit) }}>
    <div className="f-review-accent"/>
    <div className="f-review-content">
      <div className="f-review-top"><span><TriangleAlert size={16}/> 게시 전 잠깐</span><button aria-label="닫고 수정하기" onClick={()=>finish(onEdit)}><X size={21}/></button></div>
      <div className="f-review-icon"><TriangleAlert size={32}/></div>
      <h2 id={titleId}>이 댓글, 그대로 게시할까요?</h2>
      <p id={descriptionId} className="f-review-intro">상대에게 비난으로 전달될 수 있는 표현이 있어요.<br/>게시하기 전에 한 번만 더 살펴보세요.</p>
      <div className="f-review-quote"><span>작성한 댓글</span><blockquote>{parts.map((part,index)=>part.marked ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>)}</blockquote></div>
      <ul className="f-review-reasons">{review.findings.map(finding=><li key={finding.start}>{finding.reason}</li>)}</ul>
      <p className="f-review-note">표시한 표현을 확인하고, 수정하거나 그대로 게시할 수 있어요.</p>
      {onExplore && <button ref={editButton} className="f-review-context" onClick={()=>finish(onExplore)}><ArrowDown size={18}/><span>맥락을 한 번 더 보기<small>이 게시물의 ‘모바일로 되나요?’에서 출발</small></span></button>}
      <div className="f-review-buttons"><button ref={onExplore?undefined:editButton} className="f-review-edit" onClick={()=>finish(onEdit)}><ArrowLeft size={17}/>수정하러 돌아가기</button><button className="f-review-publish" onClick={()=>finish(onPublish)}>그대로 게시</button></div>
      <p className="f-review-demo">정해진 문장 패턴으로 동작하는 데모 · 실제 AI 판단 아님</p>
    </div>
  </dialog>
}
