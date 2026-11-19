import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Bookmark, Check, ChevronDown, Compass, Heart, Home, MessageCircle, ScanLine, Sparkles, X } from 'lucide-react'
import { matchExample, readCommentContext, reviewComment, findTrail } from './context'
import { ContextTrail } from './ContextTrail'
import { PublishReview } from './PublishReview'
import type { PendingReview } from './PublishReview'
import type { FeedData, Post, Response, ReviewRule, Trail } from './context'

function Landscape({ kind }: { kind: Post['kind'] }) {
  if (kind === 'game') return <svg className="f-landscape" viewBox="0 0 600 390" aria-hidden="true">
    <circle cx="472" cy="88" r="43" fill="#f4e2a2"/><path d="M0 256 90 215 178 240 276 184 360 228 466 196 600 238V390H0Z" fill="#658d7e"/>
    <path d="m0 310 128-60 139 41 104-43 120 30 109-40v152H0Z" fill="#345e50"/>
    <g stroke="#244b39" strokeWidth="1"><path d="m130 304 168-80 174 83-174 82Z" fill="#93b96a"/><path d="m130 304 168 85v42l-168-85Z" fill="#635239"/><path d="m298 389 174-82v42l-174 82Z" fill="#493f2d"/></g>
    <path d="m273 263 55-27 54 26-55 29Z" fill="#c5b78b"/><path d="m273 263 54 28v57l-54-26Z" fill="#a18f66"/><path d="m327 291 55-29v56l-55 30Z" fill="#e0cda2"/>
    <path d="m260 264 66-62 69 61-68 33Z" fill="#b67d54"/><path d="m326 202 69 61-68 33Z" fill="#84583e"/><path d="m345 306 18-9v29l-18 9Z" fill="#526752"/>
    {[{x:194,y:265,s:1},{x:419,y:260,s:.85},{x:245,y:226,s:.6}].map((t,i)=><g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}><path d="M-5 0v51l13 6V0" fill="#71583b"/><path d="m-37-39 40-21 40 21v52L3 33-37 12Z" fill="#39744b"/><path d="m-37-39 40-21 40 21L3-17Z" fill="#6b9d59"/><path d="M3-17v50l40-20v-52Z" fill="#275a3b"/></g>)}
    <path d="m179 324 30-15 24 12-30 15Z" fill="#cbd095"/><path d="m218 342 31-16 23 12-31 16Z" fill="#cbd095"/>
  </svg>
  return <div className={`f-art-${kind}`} aria-hidden="true">{kind === 'market' ? <><i/><i/><i/><span>WEEK<br/>END.</span><b>작은 것들의 즐거움</b></> : <><i/><i/><i/><span>빛이 머무는 자리</span></>}</div>
}

function FeedPost({ post, responses, enabled, reviewRules, reviewExample, trails }: { post: Post; responses: Response[]; enabled: boolean; reviewRules: ReviewRule[]; reviewExample: string; trails: Trail[] }) {
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState<Response | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [source, setSource] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [comments, setComments] = useState<string[]>([])
  const [posted, setPosted] = useState(false)
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null)
  const [trailUnavailable, setTrailUnavailable] = useState(false)
  const [openTrail, setOpenTrail] = useState<{ data: Trail; mode: 'question' | 'reply' } | null>(null)
  const trail = trails.find(item=>item.postId===post.id)
  const publishing = useRef(false)
  const editor = useRef<HTMLTextAreaElement>(null)
  const caption = useRef<HTMLDivElement>(null)
  const sourceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      const context = editor.current && readCommentContext(editor.current)
      setReply(enabled && context ? matchExample(context, responses) : null)
    }, 380)
    return () => clearTimeout(timer)
  }, [draft, enabled, responses])
  useEffect(() => () => { if (sourceTimer.current) clearTimeout(sourceTimer.current) }, [])
  function change(value: string) {
    publishing.current = false
    setDraft(value); setReply(null); setExpanded(false); setSuggesting(false); setPosted(false)
  }
  function publish(text: string) {
    if (publishing.current) return
    setComments(previous => [...previous, text])
    change('')
    publishing.current = true
    setPosted(true)
    setPendingReview(null)
  }
  function requestPublish() {
    const text = draft.trim()
    if (!text || pendingReview || publishing.current) return
    const findings = reviewComment(text, reviewRules)
    if (findings.length) setPendingReview({ text, findings })
    else publish(text)
  }
  function returnToEditor() {
    setPendingReview(null)
    editor.current?.focus()
    editor.current?.setSelectionRange(draft.length, draft.length)
  }
  function explore(mode: 'question' | 'reply') {
    const context = editor.current && readCommentContext(editor.current)
    const connected = context && findTrail(context, trails)
    setPendingReview(null)
    setTrailUnavailable(!connected)
    if (!connected) { editor.current?.focus(); return }
    setOpenTrail({ data: connected, mode })
  }
  function closeTrail() {
    setOpenTrail(null)
  }
  function seeSource() {
    setSource(true)
    caption.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'center' })
    if (sourceTimer.current) clearTimeout(sourceTimer.current)
    sourceTimer.current = setTimeout(() => setSource(false), 3500)
  }
  const show = enabled && !dismissed && reply
  return <article className="f-post" data-sf-post={post.id} aria-label={`${post.name} 게시물`}>
    <header className="f-post-header"><div className={`f-avatar ${post.kind}`}>{post.avatar}</div><div><strong>{post.account}</strong><small>{post.label}</small></div><span className="f-follow">추천 피드</span></header>
    <div className={`f-poster ${post.kind}`}><Landscape kind={post.kind}/><div className="f-poster-copy"><span>{post.subtitle}</span><h2>{post.title}</h2></div>{post.kind === 'game' && <span className="f-edition">JAVA EDITION · 1.21.1</span>}</div>
    <div className="f-post-content">
      <div className="f-actions"><button aria-label={`${post.name} 좋아요`} aria-pressed={liked} onClick={()=>setLiked(!liked)}><Heart fill={liked?'currentColor':'none'}/></button><button aria-label={`${post.name} 댓글 쓰기`} onClick={()=>editor.current?.focus()}><MessageCircle/></button><button className="f-save" aria-label={`${post.name} 저장`} aria-pressed={saved} onClick={()=>setSaved(!saved)}><Bookmark fill={saved?'currentColor':'none'}/></button></div>
      <p className="f-likes">좋아요 {post.likes + Number(liked)}개</p>
      <div ref={caption} data-sf-caption className={`f-caption ${source?'is-highlighted':''}`}><strong>{post.account}</strong>{post.captions.map((line,i)=><p key={line}>{i===1?<span className="f-condition">{line}</span>:line}</p>)}</div>
      <p className="f-tags">{post.tags}</p>
      {trail && <div className="f-origin-comment"><div><span className="f-comment-avatar">p</span><p><strong>{trail.commentAuthor}</strong><span>{trail.comment}</span></p></div><button onClick={()=>explore('reply')}><ScanLine size={15}/><span>맥락 이어보기</span><ArrowDown size={14}/></button></div>}
      <div className="f-comments">{post.comments.map(c=><p key={c.author}><strong>{c.author}</strong>{c.text}</p>)}{comments.map((c,i)=><p key={i}><strong>you</strong>{c}<span className="f-local">데모</span></p>)}</div>
      <div className="f-comment-area">
        {show && trail && <button className="f-trail-prompt" onClick={()=>explore('question')}><ScanLine size={19}/><span><strong>이 질문의 맥락을 이어 볼까요?</strong><small>원문에서, 아직 확인되지 않은 부분까지</small></span><ArrowDown size={17}/></button>}
        {show && !trail && <section className="f-help" aria-label="댓글 관련 맥락" aria-live="polite">
          <div className="f-help-header"><span><ScanLine size={15}/> ScrollFact <i>예시 안내</i></span><button aria-label="이 게시물 도움말 닫기" onClick={()=>setDismissed(true)}><X size={15}/></button></div>
          <strong className="f-help-title">{reply.title}</strong><p>{reply.summary}</p>
          <div className="f-help-actions"><button aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'접기':'쉽게 설명 보기'}<ChevronDown size={14} className={expanded?'up':''}/></button><button onClick={seeSource}>본문에서 확인<ArrowUpRight size={13}/></button></div>
          {expanded && <div className="f-explanation"><blockquote>{reply.quote}</blockquote><p>{reply.explanation}</p>{reply.uncertainty && <p className="f-uncertainty">{reply.uncertainty}</p>}<div className="f-source-links">{reply.links.map(l=><a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.title}<ArrowUpRight size={12}/></a>)}</div><button className="f-refine" onClick={()=>setSuggesting(!suggesting)} aria-expanded={suggesting}>질문을 조금 더 구체적으로<Sparkles size={13}/></button>{suggesting && <div className="f-suggestion"><p>{reply.suggestion}</p><button onClick={()=>{change(reply.suggestion);setDismissed(true);editor.current?.focus()}}>이 질문 사용하기</button></div>}</div>}
        </section>}
        {trailUnavailable && <p className="f-trail-error" role="status">연결된 원문을 찾지 못했어요. 작성한 댓글은 그대로 남아 있어요.</p>}
        <form onSubmit={e=>{e.preventDefault();requestPublish()}}>
          <div className="f-avatar me">나</div><textarea ref={editor} aria-label={`${post.name} 댓글`} placeholder="댓글 달기…" value={draft} maxLength={1000} rows={1} onChange={e=>change(e.target.value)}/><button className="f-submit" type="submit" disabled={!draft.trim()}>게시</button>
        </form>
        <div className="f-comment-foot"><span>{posted?<><Check size={12}/> 이 데모에만 남긴 댓글이에요</>:'댓글은 이 데모에서만 표시돼요'}</span>{dismissed && enabled ? <button onClick={()=>setDismissed(false)}>도움말 다시 켜기</button>:<button onClick={()=>{change(post.example);setDismissed(false);editor.current?.focus()}}>예시 질문 입력</button>}</div>
        <button className="f-review-try" onClick={()=>{change(reviewExample);editor.current?.focus()}}>게시 전 확인창 예시 <span>입력 후 ‘게시’를 눌러보세요</span></button>
      </div>
    </div>
    {pendingReview && <PublishReview review={pendingReview} onEdit={returnToEditor} onPublish={()=>publish(pendingReview.text)} onExplore={trail?()=>explore('reply'):undefined}/>}
    {openTrail && <ContextTrail trail={openTrail.data} mode={openTrail.mode} onClose={closeTrail} onSource={()=>{closeTrail();seeSource()}} onUse={text=>{change(text);setDismissed(true);closeTrail();editor.current?.focus()}}/>}
  </article>
}

export function Feed({ data }: { data: FeedData }) {
  const [enabled, setEnabled] = useState(true)
  const [active, setActive] = useState(data.focusPostId)
  const feed = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const visibility = new Map<Element,number>()
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>visibility.set(entry.target,entry.intersectionRatio))
      const best = [...visibility].sort((a,b)=>b[1]-a[1])[0]
      if(best && best[1]>0) setActive((best[0] as HTMLElement).dataset.sfPost!)
    },{threshold:[0,.1,.25,.5,.75,1]})
    feed.current?.querySelectorAll('article[data-sf-post]').forEach(node=>observer.observe(node))
    return ()=>observer.disconnect()
  },[])
  return <div className="f-app">
    <header className="f-topbar"><a href="/feed.html" className="f-brand"><ScanLine size={24}/><strong>scroll<span>fact</span></strong><i>in the flow</i></a><div className="f-demo-pill">피드 체험 · AI 미연결</div></header>
    <div className="f-shell"><nav className="f-nav" aria-label="데모 위치"><div className="selected"><Home/>피드</div><div><Compass/>일상의 맥락</div><p>읽던 곳에서,<br/>대화가 시작되는 곳에서.</p><span>가상 소셜 피드<br/>실제 인스타그램이 아닙니다.</span></nav>
      <main className="f-main"><div className="f-intro"><span>ONE COMMENT. A LITTLE MORE CONTEXT.</span><h1>그 말, 어디에서<br className="f-mobile-break"/> 시작됐을까?</h1><p>댓글 옆 <b>‘맥락 이어보기’</b>에서 한 스크롤 더 읽어보세요.</p></div><div ref={feed}>{data.posts.filter(post=>post.id===data.focusPostId).map(post=><FeedPost key={post.id} post={post} responses={data.responses} enabled={enabled} reviewRules={data.reviewRules} reviewExample={data.reviewExamples[0].draft} trails={data.trails}/>)}</div><footer className="f-end"><ScanLine/><p>한 댓글, 한 스크롤 더.</p><span>이번 체험은 마인크래프트 사례 하나에 집중합니다.</span></footer></main>
      <aside className="f-aside"><div className="f-extension"><div className="f-extension-title"><span><ScanLine size={18}/> ScrollFact</span><button role="switch" aria-label="맥락 도움말" aria-checked={enabled} className={`f-toggle ${enabled?'on':''}`} onClick={()=>setEnabled(!enabled)}><i/></button></div><h2>댓글 한 줄에서,<br/>그 말의 맥락까지.</h2><p>원문 → 쉬운 설명 → 미확인 정보<br/>스크롤하며 하나씩 연결해요.</p><div className="f-reading"><span className={enabled?'live':''}/>{enabled?`지금 보고 있는 글 · ${data.posts.find(p=>p.id===active)?.name}`:'맥락 도움말이 꺼져 있어요'}</div></div><div className="f-side-note"><Sparkles size={16}/><p>같은 문장을 읽어도 이해는 다를 수 있어요. 생략된 맥락을 조금 더 따라가 봅니다.</p></div><details className="f-about"><summary>이 데모에서 가능한 것</summary><p>댓글 옆에서 원문 → 쉬운 설명 → 미확인 정보를 스크롤로 이어 읽습니다. 안내는 준비된 예시이며 AI 판단이 아닙니다. 질문을 직접 입력하면 같은 흐름으로 연결됩니다.</p><p>‘게시 전 확인창 예시’로 직접적인 비난 표현의 재확인 흐름도 체험할 수 있어요. 맥락 도움말을 꺼도 게시 전 확인은 동작합니다.</p><p>작성 내용은 외부로 전송하거나 저장하지 않습니다. 새로고침하면 초기화됩니다.</p><a href="/journey.html">이전 데모 보기 <ArrowUpRight size={12}/></a></details></aside>
    </div>
  </div>
}
