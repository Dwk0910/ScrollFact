import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MessageCircle, X, Puzzle, LockKeyhole } from 'lucide-react'
import './style.css'
const opinions = [
  {name:'통로지킴이',role:'기사 댓글',title:'통로를 넓히는 조치는 필요해요.',reason:'지난 축제에서 통로가 막혀 위험했던 경험이 있어, 안전한 이동 공간을 우선해야 한다고 봐요.',original:'안전 때문이라는데 작년에 진짜 통로 막혀서 위험했음. 기사가 너무 한쪽 얘기만 함'},
  {name:'천문부 학생',role:'기사 속 발언',title:'줄어든 부스는 누군가의 발표 기회예요.',reason:'1년 동안 준비한 관측 체험을 보여줄 자리여서, 부스가 없어지는 데 아쉬움을 느껴요.',original:'1년 동안 준비한 관측 체험을 보여줄 곳이 사라졌다.'},
  {name:'새내기부장',role:'기사 댓글',title:'운영 실적 기준은 새 동아리에 불리할 수 있어요.',reason:'이전 실적을 우선하면 새 동아리는 참여 경험을 쌓을 기회부터 얻기 어렵다고 걱정해요.',original:'선정 기준이 운영 실적이면 새로 생긴 동아리는 계속 못 들어가는 거 아님?'},
  {name:'동아리 참여자',role:'ScrollFact 예시 평론',title:'선정 결과를 알려주는 과정도 중요해요.',reason:'신청 후 탈락 안내를 받지 못했다며, 1년에 한 번인 발표 기회가 사라진 아쉬움을 이야기해요.',original:'신청했는데 탈락했다는 연락조차 못 받았어요. 저희에겐 1년에 한 번 발표하는 자리예요.'},
  {name:'관측대장',role:'기사 댓글',title:'다른 장소나 시간에도 발표할 수 있지 않을까요?',reason:'천문부 체험이 좋았던 경험을 바탕으로, 기존 부스 밖에서도 참여 기회를 이어갈 방법을 제안해요.',original:'천문부 관측 체험 작년에 재밌었는데 아쉽다. 강당이나 다른 시간에라도 할 수 없나?'},
  {name:'학생회 참여자',role:'ScrollFact 예시 평론',title:'통로를 유지하면서 공동 부스를 검토할 수 있어요.',reason:'안전 기준을 바꾸기 어렵다는 제약 안에서, 여러 동아리가 공간을 함께 사용하는 방안을 제안해요.',original:'통로 폭은 안전 담당 선생님 의견을 따른 거라 저희가 마음대로 바꾸기 어려워요. 대신 작은 동아리 4곳이 함께 쓰는 공동 부스는 다음 회의에 올려 볼게요.'},
]
const sentences = [
  {text:'올해 가온제의 동아리 부스가 작년 12개에서 8개로 줄었다.',ids:[0,1]},
  {text:'부스 배정에서 빠진 동아리는 천문부, 보드게임부, 수어부, 문예창작부 4곳이다.',ids:[2,3]},
  {text:'학생회는 지난달 28일 회의에서 “통로 폭을 넓히기 위해 부스 수를 줄였다”고 밝혔다.',ids:[0,5]},
  {text:'안전도 중요하지만, 1년에 한 번뿐인 발표 기회를 빼앗는 방식이어서는 안 된다.',ids:[1,4,5]},
]
export default function App(){
 const [open,setOpen]=useState(false)
 const toggle=useRef<HTMLButtonElement>(null)
 const [selected,setSelected]=useState<number|null>(null)
 const [source,setSource]=useState<number|null>(null)
 const panel=useRef<HTMLElement>(null)
 const buttons=useRef<(HTMLButtonElement|null)[]>([])
 const close=()=>{setOpen(false);toggle.current?.focus()}
 const mark=(i:number)=>!open?<span>{sentences[i].text}</span>:<button ref={el=>{buttons.current[i]=el}} className={`sentence ${selected===i?'selected':''}`} aria-pressed={selected===i} aria-controls="opinion-panel" onClick={()=>{setSelected(i);setSource(null);panel.current?.scrollTo({top:0})}}>{sentences[i].text}</button>
 return <div className={`festival-shell ${open?'extension-open':''}`}><header className="browser-toolbar"><div className="address"><LockKeyhole size={15}/><span>gaon-news.example<span className="address-path"> / school / festival-booths</span></span></div><span className="browser-demo">확장 시연</span><Puzzle size={19} className="puzzle"/><button ref={toggle} className="extension-toggle" aria-label={open?'ScrollFact 끄기':'ScrollFact 켜기'} aria-expanded={open} aria-controls="opinion-panel" onClick={()=>setOpen(value=>!value)}><span className="brand-icon">S</span><span className="toggle-label">ScrollFact</span></button></header>
 <main className="layout"><div className="reading"><div className="paper-head"><strong>가온소식</strong><span>학교 안의 이야기</span></div><article><div className="category">학교 · 가온제 2026</div><h1>부스 12개에서 8개로…<br/>작은 동아리 “설 자리가 없다”</h1><p className="subtitle">학생회 “통로 확보 위한 조치”<br/>선정 기준과 참여 기회 두고 다른 목소리</p><div className="byline">이서윤 학생기자<span>2026.11.03</span></div><div className="reading-hint"><MessageCircle size={16}/><span>{open?<>밑줄 친 문장을 눌러 사람들의 의견을 읽어보세요.</>:<>오른쪽 위 ScrollFact를 켜면 문장에 연결된 의견을 볼 수 있어요.</>}</span></div>
 <div className="article-body"><p>{mark(0)} 축제는 이달 20일 본관 앞 운동장에서 열린다.</p><p>{mark(1)} 이들 동아리는 축제 당일 별도 공간 없이 홍보물만 게시할 수 있다.</p><p>{mark(2)} 회의록에는 참가 동아리 선정 기준으로 작년 운영 실적과 신청 순서가 적혀 있다.</p><p>천문부 2학년 한 학생은 “1년 동안 준비한 관측 체험을 보여줄 곳이 사라졌다”고 말했다. 부스 감축에 따른 부담이 작은 동아리들에 돌아갔다는 아쉬움이다.</p><p>축제가 모든 학생의 행사라면, 안전한 운영과 함께 참여의 기회도 살펴야 한다. {mark(3)}</p></div><div className="article-end">가온소식 · 학교면</div></article><footer className="disclosure">가상 기사와 의견으로 구성한 시연입니다. 첨부된 축제 부스 예시를 편집했으며, 의견 요약과 문장 연결은 미리 준비한 데이터입니다.</footer>
 <section className="originals" aria-labelledby="original-title"><div className="original-heading"><h2 id="original-title">원래 의견</h2><span>기사 인용 · 댓글 · 평론</span></div>{opinions.map((o,i)=><article key={i} id={`source-${i}`} tabIndex={-1} className={`original ${source===i?'highlighted':''}`}><div><strong>{o.name}</strong><span>{o.role}</span></div><p>{o.original}</p></article>)}</section></div>
 <aside ref={panel} id="opinion-panel" className={`panel ${open?'is-open':''}`} hidden={!open} aria-label="선택한 문장의 관련 의견" onKeyDown={e=>{if(e.key==='Escape')close()}}><div className="panel-header"><span><span className="brand-icon">S</span>ScrollFact <small>문장 곁의 의견</small></span><button className="close" aria-label="의견 패널 닫기" onClick={close}><X size={18}/></button></div>
 {selected===null?<div className="empty"><span className="empty-line"/><h2>같은 문장,<br/>서로 다른 생각.</h2><p>기사의 밑줄을 누르면<br/>그 문장에 연결된 의견과<br/>그렇게 생각한 이유가 보여요.</p><small>판단하기 전에, 이유부터 읽어보세요.</small></div>:<div className="panel-content" key={selected}><div className="selection"><span>지금 읽는 문장</span><blockquote>{sentences[selected].text}</blockquote></div><div className="opinion-heading"><h2>관련 의견</h2><span>{sentences[selected].ids.length}개의 목소리</span></div><div className="opinion-list">{sentences[selected].ids.map(i=>{const o=opinions[i];return <article className="opinion" key={i}><div className="person"><span className="avatar">{o.name[0]}</span>{o.name}</div><h3>{o.title}</h3><div className="reason"><span>이유</span><p>{o.reason}</p></div><a href={`#source-${i}`} onClick={()=>{setSource(i);if(window.matchMedia("(max-width:760px)").matches)setOpen(false);requestAnimationFrame(()=>document.getElementById(`source-${i}`)?.focus({preventScroll:true}))}}>원래 의견 보기</a></article>})}</div><p className="panel-note">의견과 이유는 예시 원문을 요약한 내용이에요.<br/>원래 의견에서 맥락을 함께 확인하세요.</p><button className="continue" onClick={close}>기사 이어 읽기</button></div>}</aside></main></div>
}
createRoot(document.getElementById('root')!).render(<App/> )
