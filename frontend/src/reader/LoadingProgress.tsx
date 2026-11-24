import { useEffect, useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import type { AnalysisProgress } from '../types'
const labels: Record<AnalysisProgress['phase'], string> = {
 capturing:'현재 페이지를 가져오고 있어요', compressing:'전송할 페이지를 준비하고 있어요', uploading:'페이지를 서버에 보내고 있어요',
 queued:'분석 순서를 기다리고 있어요', extracting:'본문·댓글·이미지를 찾고 있어요', checking_sources:'본문에 연결된 외부 출처를 읽고 있어요', summarizing:'AI가 맥락과 관점을 분석하고 있어요',
}
export default function LoadingProgress({progress,cancel}:{progress:AnalysisProgress;cancel:()=>void}) {
 const [started] = useState(Date.now)
 const [now,setNow] = useState(started)
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 const d=progress.detail
 const title=d?.stage==='retry_wait'?'AI 제공자 응답을 기다린 뒤 다시 시도해요':d?.stage==='images'?'기사 안의 이미지를 가져오고 있어요':d?.stage==='validating'?'분석과 원문 연결을 확인하고 있어요':labels[progress.phase]
 const stages=['페이지 전송','본문·댓글·이미지 수집','외부 출처·이미지 준비','AI 분석','원문 연결 검증']
 const current=['capturing','compressing','uploading','queued'].includes(progress.phase)?0:progress.phase==='extracting'?1:d?.stage==='validating'?4:d?.stage==='requesting'||d?.stage==='retry_wait'||progress.phase==='summarizing'&&d?.stage!=='images'?3:2
 return <main className="loading-progress" aria-busy="true">
  <div className="loading-status" role="status" aria-live="polite"><LoaderCircle className="spinner" size={22}/><h1>{title}</h1></div>
  <p className="loading-elapsed">진행 중 · {Math.floor((now-started)/1000)}초 경과</p>
  <ol className="loading-steps">{stages.map((label,index)=><li key={label} className={index===current?'is-current':index<current?'is-done':''} aria-current={index===current?'step':undefined}><span>{index<current?<Check size={13}/>:index+1}</span>{label}</li>)}</ol>
  {d&&<div className="loading-counts"><p>본문 <strong>{d.paragraphs}문단</strong> · 불러온 댓글 <strong>{d.comments}개</strong> · 본문 이미지 <strong>{d.images}개</strong></p>
   {d.commentAreaDetected&&d.comments===0&&<p>댓글 영역은 있지만 현재 페이지에 불러온 댓글 본문은 없어요.</p>}
   {d.images>0&&<p>이미지 준비 {d.imagesCompleted}/{d.images}{d.imagesFailed>0?` · 접근 실패 ${d.imagesFailed}개`:''}</p>}
   {d.attempt>0&&<p>AI 요청 {d.attempt}회째{d.maxAttempts>1?` · 최대 ${d.maxAttempts}회`:''}</p>}
   {d.stage==='retry_wait'&&<p>{Math.max(0,Math.ceil((d.retryAt-now)/1000))}초 뒤 같은 모델로 재시도해요.</p>}
  </div>}
  {progress.sources&&<p className="loading-source-note">{progress.sources.total===0?'본문에 외부 출처 링크가 없어 원문을 기준으로 분석해요.':`외부 출처 읽기 ${progress.sources.completed}/${progress.sources.total??'확인 중'}${progress.sources.failed?` · 접근 실패 ${progress.sources.failed}개`:''}`}<small>여기서 출처는 본문에 연결된 링크예요. 웹 검색 결과나 댓글·이미지 수가 아니에요.</small></p>}
  <button className="text-button" onClick={cancel}>분석 중단</button>
 </main>
}
