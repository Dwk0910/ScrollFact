import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Download, FileText, Layers, RotateCcw, ScanLine } from 'lucide-react'
import brief from './brief.json'
import './coaching.css'

const demos = [
  { id: 'first', title: '초판 ScrollFact', kind: '최초 UI 보관본', url: '/first-edition.html', text: '문단 요약·신뢰도 막대·대립 시각·글 전체 개요를 한 화면에서 살펴보던 첫 UI.', steps: '「이 페이지 맥락/신뢰도 분석」 → 이전·다음 문단 → 전체 개요', note: 'Git 241eaf9의 실제 UI 복원. 샘플 분석이며 로그인은 시연 범위에서 제외합니다.', group: '제품의 출발점' },
  { id: 'reader', title: '원래의 문단별 리더', kind: '예상 응답 데모', url: '/index.html?preview=mock', text: '전체 반원 게이지에서 문단별 요약·점수·이유·출처로 이어지는 읽기 경험.', steps: '「이 페이지 분석하기」 → 약 12초 진행 화면 → 문단별 스크롤', note: '샘플 모드로 실행합니다. 점수와 출처는 예시이며 실제 AI 분석 결과가 아닙니다.', group: '제품의 출발점' },
  { id: 'deductions', title: '원문과 근거를 함께 읽기', kind: '점수 없는 확장 수정판', url: '/deduction-site.html', text: '기사 스크롤에 맞춰 주장·자료 발췌·AI 검토 의견·미확인 부분을 구분해서 보여줍니다.', steps: '새 탭 → ScrollFact 열기 → 시연 분석 연결 → 기사 스크롤 → 연결된 자료와 해석 비교', note: '기사·자료·응답은 시연용 예시입니다. 점수·가중치·신뢰 등급을 없앴으며, 자료와 AI 해석을 구분합니다. 실제 AI·백엔드 계약은 변경하지 않았습니다.', group: '제품의 출발점' },
  { id: 'deductions-scored', title: '감점형 리더 보관본', kind: '이전 정량 평가 실험', url: '/coaching/deduction-scoring/index.html', text: '0에서 음수 감점을 누적하던 이전 UI. 현재의 점수 없는 수정판과 비교할 수 있습니다.', steps: '전체 감점 → 문단별 읽기 → 두 문서 비교', note: '이전 빌드를 보존한 화면입니다. 점수는 임의의 예시 가중치이며 검증된 신뢰도 지표가 아닙니다.', group: '제품의 출발점' },
  { id: 'journey', title: '읽기에서 쓰기로', kind: '맥락 연결 실험', url: '/journey.html', text: '원문에서 필요한 문단을 담고, 다른 페이지의 초안에 자료를 연결하는 흐름.', steps: '공지 문단 담기 → 의견 쓰기 → 이 초안에 자료 연결 → 세 예시 비교', note: '가상 사이트 사이의 이동입니다. 저장 내용은 이 브라우저에 남으며 데모 안의 초기화 버튼으로 지웁니다.', group: '방향 탐색' },
  { id: 'feed', title: '댓글 맥락과 게시 전 확인', kind: '대화 개입 실험', url: '/feed.html', text: '댓글의 질문을 본문과 연결하고, 게시 전 재확인과 스크롤 맥락 탐색을 함께 체험합니다.', steps: '「맥락 이어보기」 → 원문·설명·미확인 정보 / 「게시 전 확인창 예시」 → 게시', note: '준비된 문장 패턴으로 동작합니다. 실제 SNS에 게시하거나 AI를 호출하지 않습니다. 이전 피드 실험은 현재 통합 화면으로 보관되어 있습니다.', group: '방향 탐색' },
  { id: 'footnotes', title: '읽는 문장 곁의 맥락 각주', kind: '스크롤 연결 실험', url: '/footnotes.html', text: '화면에 들어온 문장에 관련 조건을 붙이고, 근거로 갔다가 읽던 곳으로 돌아옵니다.', steps: '동네 공지·뉴스·커뮤니티 선택 → 댓글까지 읽기 → 원문에서 확인 → 돌아가기', note: '각주를 끄고 비교할 수 있습니다. 연결 관계는 예시 데이터이며 자유 입력 분석은 하지 않습니다.', group: '방향 탐색' },
  { id: 'reviews', title: '서로 다른 경험의 리뷰 지도', kind: '일상 활용 실험', url: '/reviews.html', text: '같은 주제의 상반된 후기를 스크롤하며 비교하고, 서로 다른 사용 조건을 확인합니다.', steps: '헤드폰·카페 선택 → 사용 조건 선택 → 주제별 스크롤 → 후기 전문', note: '제품·장소·후기는 모두 가상입니다. 실제 후기 수집이나 구매 추천은 수행하지 않습니다.', group: '방향 탐색' },
  { id: 'article', title: '확장앱용 원문 기사', kind: '원문 테스트 페이지', url: '/demo.html', text: '실제 확장앱에서 문단 감시와 원문 이동을 확인하기 위한 네 문단짜리 기사.', steps: '새 탭에서 열기 → 설치된 ScrollFact 확장 실행 → 분석 → 원문 스크롤', note: '이 안에서는 원문만 보입니다. 확장 연동은 Chrome·웨일에 dist를 설치한 뒤 새 탭에서 시연합니다.', group: '기술 점검' },
  { id: 'integration', title: '업로드부터 진행 상태까지', kind: '백엔드 필요', url: '/integration.html?coaching=1', text: 'HTML 압축·업로드·문단 추출·출처 수집·원문 선택자 연결을 점검하는 기존 화면.', steps: '코칭용 백엔드 실행 → 「업로드부터 점검하기」 → 실제 단계·수집 결과 확인', note: '코칭용 로컬 서버(8081)에 연결합니다. 서버가 꺼져 있으면 연결 오류가 표시됩니다. AI 평가는 생략합니다.', group: '기술 점검' },
]

function OnePage() {
  return <article className="brief-sheet" aria-label="코칭 한 장 요약">
    <header className="brief-heading">
      <div className="brief-eyebrow">SCROLLFACT / TOPIC DISCUSSION <span>{brief.date}</span></div>
      <h1>{brief.title}</h1>
      <p>{brief.team} <span> / {brief.subtitle}</span></p>
    </header>
    <section className="brief-direction">
      <h2><span>01</span> 원래 ScrollFact는</h2>
      <p>{brief.direction}</p><small>{brief.division}</small>
      <div className="brief-flow">{brief.flow.map((step,i)=><span className="brief-flow-step" key={step}>{i>0&&<ArrowRight size={13}/>}<span>{step}</span></span>)}</div>
    </section>
    <div className="brief-grid">
      <section>
        <h2><span>02</span> 기대했던 효과</h2>
        {brief.benefits.map(item=><div className="brief-benefit" key={item.label}><b>{item.label}</b><p>{item.text}</p></div>)}
      </section>
      <section>
        <h2><span>03</span> 대회와 연결하려던 생각</h2>
        <p>{brief.connection}</p><p className="brief-small">{brief.connectionNote}</p>
      </section>
    </div>
    <section className="brief-core-question">
      <h2><span>04</span> 그런데, 여기서 막혔다</h2>
      <p className="brief-question">{brief.question}</p>
      <p>{brief.gap}</p><p className="brief-chain">{brief.chain}</p>
    </section>
    <section className="brief-mentor">
      <h2><span>05</span> 멘토에게 묻고 싶은 것</h2>
      <ol>{brief.mentorQuestions.map(q=><li key={q}>{q}</li>)}</ol>
    </section>
    <div className="brief-discussion-end"><p>{brief.closing}</p></div>
  </article>
}

export default function App() {
  const initialId = demos.some(d=>d.id===location.hash.slice(1)) ? location.hash.slice(1) : 'reader'
  const [view, setView] = useState<'brief'|'demos'>(location.hash ? 'demos' : 'brief')
  const [active, setActive] = useState(initialId)
  const [visited, setVisited] = useState<string[]>(location.hash ? [initialId] : [])
  const [revisions, setRevisions] = useState<Record<string,number>>({})
  const frames = useRef(new Map<string,HTMLIFrameElement>())
  const demo = demos.find(d=>d.id===active)!
  const index = demos.indexOf(demo)
  function choose(id: string) {
    setActive(id); setView('demos')
    setVisited(old=>old.includes(id) ? old : [...old,id])
    history.replaceState(null,'',`#${id}`)
  }
  function showBrief() { setView('brief'); history.replaceState(null,'',location.pathname) }
  function frameReady(id: string) {
    // Route links between our own demos through the archive, retaining each frame's state.
    const doc = frames.current.get(id)?.contentDocument
    doc?.addEventListener('click',(event)=> {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      const link = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank') return
      const destination = new URL(link.href)
      const destinationPath = destination.pathname === '/' ? '/index.html' : destination.pathname
      const target = demos.find(d=>new URL(d.url,location.href).pathname===destinationPath)
      if (destination.origin===location.origin && target && target.id!==id) { event.preventDefault(); choose(target.id) }
    })
  }
  return <div className="coaching-app">
    <header className="hub-header"><a className="hub-brand" href="/coaching.html"><span><ScanLine size={22}/></span><div>scroll<b>fact</b><small>트리오남의 코칭 노트</small></div></a><nav aria-label="코칭 페이지"><button className={view==='brief'?'selected':''} onClick={showBrief}><FileText size={16}/>코칭 한 장</button><button className={view==='demos'?'selected':''} onClick={()=>choose(active)}><Layers size={16}/>데모 모아보기 <i>{demos.length}</i></button></nav><span className="hub-session">오남고등학교 <b>01 NOV 2026</b></span></header>
    <main hidden={view!=='brief'} className="brief-view"><div className="brief-toolbar"><p>원래 구상과 주제에 대한 고민부터 이야기하기</p><a href="/coaching/scrollfact-coaching-2026-11-01.pdf" download><Download size={15}/>한 장 PDF</a><button onClick={()=>window.print()}>인쇄</button><button className="dark-button" onClick={()=>choose('reader')}>원래 데모 보기<ArrowRight size={15}/></button></div><OnePage/><p className="brief-footnote">{brief.footnote}</p></main>
    <main hidden={view!=='demos'} className="demo-view"><aside className="demo-sidebar"><div className="archive-heading"><span>THE ARCHIVE</span><h1>만들고, 살펴보고,<br/>다시 질문하기.</h1><p>초판부터 남아 있는 모든 데모를<br/>한 자리에서 비교합니다.</p></div><nav aria-label="데모 선택">{demos.map((d,i)=><div key={d.id}>{(i===0||demos[i-1].group!==d.group)&&<p className="demo-group">{d.group}</p>}<button aria-current={active===d.id?'page':undefined} onClick={()=>choose(d.id)}><span>{String(i).padStart(2,'0')}</span><div><strong>{d.title}</strong><small>{d.kind}</small></div><ArrowRight size={14}/></button></div>)}</nav><p className="archive-note">전환해도 열어 둔 데모의 상태를 유지합니다. 페이지 전체를 새로고침하면 메모리 상태는 초기화됩니다.</p></aside>
      <div className="demo-stage"><section className="demo-description" aria-live="polite"><div><span className="demo-kicker">{String(index).padStart(2,'0')} / {demo.kind}</span><h2>{demo.title}</h2><p>{demo.text}</p></div><div className="stage-actions"><button aria-label="이전 데모" disabled={index===0} onClick={()=>choose(demos[index-1].id)}><ArrowLeft size={16}/></button><button aria-label="다음 데모" disabled={index===demos.length-1} onClick={()=>choose(demos[index+1].id)}><ArrowRight size={16}/></button><a href={demo.url} target="_blank" rel="noreferrer">새 탭<ArrowUpRight size={15}/></a></div></section>
        <div className="demo-instructions"><BookOpen size={16}/><p><b>시연 순서</b> {demo.steps}</p><button onClick={()=>setRevisions(old=>({...old,[active]:(old[active]??0)+1}))}><RotateCcw size={14}/>화면 새로고침</button></div>
        <div className="demo-canvas">{demos.filter(d=>visited.includes(d.id)).map(d=><iframe key={`${d.id}-${revisions[d.id]??0}`} ref={node=>{if(node)frames.current.set(d.id,node);else frames.current.delete(d.id)}} hidden={active!==d.id} src={d.url} title={`${d.title} 데모`} onLoad={()=>frameReady(d.id)}/>)}</div><p className="demo-limits"><span>시연 범위</span>{demo.note}</p>
      </div>
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
