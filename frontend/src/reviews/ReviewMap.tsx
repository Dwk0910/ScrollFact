import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, ChevronDown, Coffee, Headphones, ScanLine, SlidersHorizontal, Star } from 'lucide-react'
import type { Review, ReviewDemo, ReviewScenario, ReviewTopic } from './types'

const scrollBehavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'

function ObjectArt({ kind }: { kind: ReviewScenario['id'] }) {
  return kind === 'headphones' ? <svg viewBox="0 0 200 160" aria-hidden="true" className="r-object">
    <ellipse cx="100" cy="145" rx="60" ry="7" fill="#19223c" opacity=".12"/>
    <path d="M48 101V73a52 52 0 0 1 104 0v28" fill="none" stroke="#252d40" strokeWidth="17"/>
    <path d="M48 72a52 52 0 0 1 104 0" fill="none" stroke="#718097" strokeWidth="7"/>
    <path d="M49 75v45m102-45v45" stroke="#97a3b4" strokeWidth="8"/>
    <rect x="31" y="78" width="37" height="58" rx="17" fill="#263044" transform="rotate(-10 49 107)"/>
    <rect x="132" y="78" width="37" height="58" rx="17" fill="#263044" transform="rotate(10 151 107)"/>
    <rect x="54" y="81" width="17" height="53" rx="8" fill="#58657b" transform="rotate(-10 62 107)"/>
    <rect x="129" y="81" width="17" height="53" rx="8" fill="#58657b" transform="rotate(10 137 107)"/>
  </svg> : <svg viewBox="0 0 200 160" aria-hidden="true" className="r-object">
    <ellipse cx="100" cy="139" rx="65" ry="10" fill="#463e3c" opacity=".13"/>
    <path d="M137 67h12c32 0 32 47 0 47h-13" fill="none" stroke="#bd8361" strokeWidth="13"/>
    <path d="M51 55h93v44c0 45-93 45-93 0Z" fill="#e8b189"/>
    <ellipse cx="97.5" cy="55" rx="46.5" ry="13" fill="#f7d8bb"/><ellipse cx="97.5" cy="56" rx="38" ry="8" fill="#70513e"/>
    <path d="M79 35c-14-14 14-15 0-29m29 30c-14-14 14-15 0-29" stroke="#bfa48d" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <path d="M64 76v23c0 11 5 16 14 20" stroke="#f9d7bb" strokeWidth="5" strokeLinecap="round" fill="none"/>
  </svg>
}

function Conditions({ topic }: { topic: ReviewTopic }) {
  return <div className="r-conditions">
    <div className="r-conditions-title"><SlidersHorizontal size={15}/><strong>후기에 적힌 조건</strong><span>원문 기반 예시</span></div>
    <table><thead><tr><th scope="col">비교할 부분</th><th scope="col"><i className="r-letter a">A</i> 후기</th><th scope="col"><i className="r-letter b">B</i> 후기</th></tr></thead><tbody>{topic.comparison.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.a}</td><td>{row.b}</td></tr>)}</tbody></table>
    <div className="r-takeaway"><span>내 상황에 대입하면</span><p>{topic.takeaway}</p></div>
    <p className="r-unknown">{topic.unknown}</p>
  </div>
}

function ReviewCard({ review, index, selected, onMount, focused }: { review: Review; index: number; selected: string[]; onMount: (node: HTMLElement | null) => void; focused: boolean }) {
  const matching = review.conditions.filter(condition => selected.includes(condition))
  return <article ref={onMount} tabIndex={-1} className={`r-review ${index === 0 ? 'r-a' : 'r-b'} ${matching.length ? 'is-match' : ''} ${focused ? 'is-current' : ''}`} aria-label={`${review.author}의 후기`}>
    <div className="r-review-top"><span className={`r-letter ${index === 0 ? 'a' : 'b'}`}>{index === 0 ? 'A' : 'B'}</span><strong>{review.label}</strong>{matching.length > 0 && <span className="r-match"><Check size={11}/>내 조건 포함</span>}<span className="r-stars" aria-label={`작성자 별점 ${review.rating}점`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} fill={i < review.rating ? 'currentColor' : 'none'} opacity={i < review.rating ? 1 : .25}/>)}</span></div>
    <blockquote>“{review.quote}”</blockquote>
    <div className="r-context-tags">{review.conditions.map(condition => <span className={selected.includes(condition) ? 'selected' : ''} key={condition}>{selected.includes(condition) && <Check size={11}/>} {condition}</span>)}</div>
    <div className="r-source"><span><b>{review.author}</b>{review.source}</span><details><summary>후기 전문<ChevronDown size={12}/></summary><div className="r-full-review"><strong>{review.author} · 후기 원문</strong><p>{review.full}</p><span>실제 게시물이 아닌 데모용 가상 후기입니다.</span></div></details></div>
  </article>
}

function Explorer({ scenario }: { scenario: ReviewScenario }) {
  const [selected, setSelected] = useState<string[]>([])
  const [activeId, setActiveId] = useState(scenario.topics[0].id)
  const [activeReview, setActiveReview] = useState<string | null>(null)
  const topicNodes = useRef(new Map<string, HTMLElement>())
  const reviewNodes = useRef(new Map<string, HTMLElement>())
  const active = scenario.topics.find(topic => topic.id === activeId)!
  const activeIndex = scenario.topics.indexOf(active)
  const allReviews = scenario.topics.flatMap(topic => topic.reviews)
  const matching = allReviews.filter(review => review.conditions.some(condition => selected.includes(condition)))
  const average = (allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length).toFixed(1)

  useEffect(() => {
    let frame = 0
    const update = () => {
      const line = Math.min(window.innerHeight * .42, 330)
      const entries = [...topicNodes.current.entries()]
      const current = entries.find(([, node]) => { const rect = node.getBoundingClientRect(); return rect.top <= line && rect.bottom > line })
      if (current) setActiveId(current[0])
      const visibleReviews = [...reviewNodes.current.entries()].map(([id, node]) => ({ id, rect: node.getBoundingClientRect() }))
        .filter(({ rect }) => rect.top < window.innerHeight - 60 && rect.bottom > 180)
        .sort((a, b) => Math.abs(a.rect.top - line) - Math.abs(b.rect.top - line))
      setActiveReview(visibleReviews[0]?.id ?? null)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [scenario])
  function goTopic(id: string) {
    const node = topicNodes.current.get(id)
    node?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    node?.focus({ preventScroll: true })
  }
  function goReview(id: string) {
    const node = reviewNodes.current.get(id)
    node?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    node?.focus({ preventScroll: true })
  }
  return <>
    <section className="r-intro"><div><p className="r-eyebrow">SCROLL THROUGH PERSPECTIVES</p><h1>후기가 갈릴 때,<br/><span>내 상황을 대입해 보세요.</span></h1><p className="r-intro-text">스크롤하며 같은 주제의 서로 다른 경험을 비교합니다.</p></div><span className="r-concept-stamp">IDEA<br/><b>03</b></span></section>
    <section className={`r-product r-product-${scenario.id}`} aria-label="체험 대상"><div className="r-product-art"><ObjectArt kind={scenario.id}/></div><div className="r-product-copy"><span>{scenario.category}</span><h2>{scenario.name}<i>가상 {scenario.id === 'cafe' ? '장소' : '제품'}</i></h2><p>{scenario.description}</p><div><Star size={13} fill="currentColor"/><strong>{average}</strong><span>예시 후기 {allReviews.length}개 · {scenario.topics.length}가지 주제</span></div></div></section>
    <div className="r-preferences"><div className="r-preferences-label"><SlidersHorizontal size={16}/><strong>내 사용 조건</strong><span>선택 사항</span></div><div className="r-options">{scenario.options.map(option => <button key={option} aria-pressed={selected.includes(option)} onClick={() => setSelected(previous => previous.includes(option) ? previous.filter(item => item !== option) : [...previous, option])}>{selected.includes(option) ? <Check size={13}/> : <span className="r-option-plus">+</span>}{option}</button>)}</div><div className="r-filter-status" role="status">{selected.length ? <><span>조건을 언급한 후기 <b>{matching.length}개</b> 강조 · 다른 후기도 함께 표시</span>{matching[0] && <button onClick={() => goReview(matching[0].id)}>해당 후기 보기<ArrowDown size={13}/></button>}</> : <span>조건을 선택하면 해당 경험이 담긴 후기를 표시해요.</span>}</div></div>
    <nav className="r-mobile-map" aria-label="주제 바로가기">{scenario.topics.map((topic, index) => <button key={topic.id} aria-current={activeId === topic.id ? 'step' : undefined} onClick={() => goTopic(topic.id)}><span>0{index + 1}</span>{topic.label}</button>)}</nav>
    <div className="r-explorer">
      <main className="r-topics">{scenario.topics.map((topic, topicIndex) => <section key={topic.id} ref={node => { if (node) topicNodes.current.set(topic.id, node); else topicNodes.current.delete(topic.id) }} tabIndex={-1} className="r-topic" aria-label={`${topic.label} 비교`}>
        <div className="r-topic-heading"><span className="r-topic-index">0{topicIndex + 1}</span><div><span className="r-topic-label">{topic.label}</span><h2>{topic.title}</h2><p>{topic.description}</p></div></div>
        <div className="r-pair">{topic.reviews.map((review, index) => <ReviewCard key={review.id} review={review} index={index} selected={selected} focused={activeReview === review.id} onMount={node => { if (node) reviewNodes.current.set(review.id, node); else reviewNodes.current.delete(review.id) }}/>)}</div>
        <div className="r-mobile-conditions"><Conditions topic={topic}/></div>
        {topicIndex < scenario.topics.length - 1 && <button className="r-next" onClick={() => goTopic(scenario.topics[topicIndex + 1].id)}>다음은 {scenario.topics[topicIndex + 1].label}<ArrowDown size={14}/></button>}
      </section>)}<footer className="r-end"><ScanLine size={25}/><h2>내게 필요한 경험을 찾았나요?</h2><p>서로 다른 후기에도, 각각의 사용 상황이 있어요.</p><button onClick={() => goTopic(scenario.topics[0].id)}>처음부터 다시 비교<ArrowUpRight size={14}/></button></footer></main>
      <aside className="r-map" aria-label="스크롤 리뷰 지도"><div className="r-map-title"><span><ScanLine size={17}/> SCROLL MAP</span><b>0{activeIndex + 1} <i>/ 0{scenario.topics.length}</i></b></div><nav aria-label="리뷰 지도 주제">{scenario.topics.map((topic, index) => <button key={topic.id} aria-current={activeId === topic.id ? 'step' : undefined} onClick={() => goTopic(topic.id)}><span className="r-map-dot"/><b>0{index + 1}</b><span>{topic.label}</span>{activeId === topic.id && <i>지금 보는 주제</i>}</button>)}</nav><div className="r-map-current"><span>지금 비교하는 경험</span><h3>{active.label}</h3><div className="r-map-review-links">{active.reviews.map((review, index) => <button key={review.id} className={activeReview === review.id ? 'active' : ''} onClick={() => goReview(review.id)}><i className={`r-letter ${index === 0 ? 'a' : 'b'}`}>{index === 0 ? 'A' : 'B'}</i>{review.label}<ArrowUpRight size={12}/></button>)}</div></div><Conditions topic={active}/><p className="r-map-caption">현재 위치를 보여주는 지도예요. 읽기 완료나 신뢰도 점수가 아닙니다.</p></aside>
    </div>
    <details className="r-demo-info"><summary>이 실험에 대해<ChevronDown size={12}/></summary><p>모든 제품·장소·후기는 가상입니다. 준비된 후기 6개와 예상 분석 결과로 동작하며, 실제 쇼핑몰 수집이나 AI 분석은 하지 않습니다. 별점은 예시 작성자의 평가이고 평균은 이 6개만 계산한 값입니다. 선택 조건은 후기 내용을 숨기지 않고 해당 후기를 강조합니다. 화면 위치로 이해도나 실제 읽음 여부를 판단하지 않습니다.</p><div><a href="/footnotes.html">이전 실험 · 맥락 각주<ArrowUpRight size={13}/></a><a href="/feed.html">이전 실험 · 댓글 맥락<ArrowUpRight size={13}/></a></div></details>
  </>
}

export function ReviewMap({ data }: { data: ReviewDemo }) {
  const [id, setId] = useState(data.scenarios[0].id)
  const scenario = data.scenarios.find(item => item.id === id)!
  return <div className="r-app"><header className="r-header"><div className="r-header-inner"><a href="/reviews.html" className="r-brand"><ScanLine size={23}/><strong>scroll<span>fact</span></strong><i>REVIEW MAP</i></a><span className="r-demo-badge">LAB 03 · AI 미연결</span></div><nav className="r-scenarios" aria-label="리뷰 체험 선택">{data.scenarios.map(item => <button key={item.id} aria-pressed={item.id === id} onClick={() => { setId(item.id); window.scrollTo({ top: 0, behavior: 'instant' }) }}>{item.id === 'headphones' ? <Headphones size={16}/> : <Coffee size={16}/>} {item.tab}</button>)}</nav></header><div className="r-shell"><Explorer key={scenario.id} scenario={scenario}/></div></div>
}
