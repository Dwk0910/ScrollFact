import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Columns2, ExternalLink, ScanLine, X } from 'lucide-react'
import '../index.css'
import './style.css'
import '../content/highlight.css'
import './site.css'
import { createPanelConnection, mountSimulator } from './connection'
import { isRecord, isDocumentSnapshot, MessageType } from '../types'
import { useReaderNavigation } from '../sidepanel/hooks/useReaderNavigation'

type Finding = {
  id: string
  title: string
  detail: string
  missing: string
  evidence: { title: string; text: string }
}
type Passage = {
  id: string
  title: string
  excerpt: string
  summary: string
  assessment: 'reviewed' | 'unverified' | 'opinion'
  findings: Finding[]
  reviewNote: string
  reference?: { title: string; text: string; scope: string }
  perspective?: { title: string; text: string }
}
type DemoDocument = { id: string; label: string; title: string; description: string; passages: Passage[] }
type DemoResponse = { version: string; documents: DemoDocument[] }

declare global {
  interface Window { SCROLLFACT_EVIDENCE_DEMO: DemoResponse }
}

// All expected backend output lives in this root file. No AI or API is called.
// No scores, weights, grades, probabilities, or document ranking in this response.
window.SCROLLFACT_EVIDENCE_DEMO = {
  version: 'evidence-prototype-2',
  documents: [
    {
      id: 'a', label: '기사 A', title: '재생에너지의 확대, 전력시장은 어떻게 달라지나',
      description: '같은 지표를 말하고 있을까? 수치의 기준을 살펴보는 예시입니다.',
      passages: [
        {
          id: 'growth', title: '늘어나는 재생에너지',
          excerpt: '이 예시 지역의 재생에너지 발전량은 작년 20에서 올해 24로 늘었다. 두 수치는 같은 지역과 같은 단위로 집계했다.',
          summary: '같은 기준으로 집계한 두 시점의 발전량을 비교합니다.',
          assessment: 'reviewed', findings: [],
          reference: { title: '연간 발전량 비교표 · 가상 자료', text: '같은 지역, 같은 단위로 집계한 발전량: 전년 20 / 당해 24.', scope: '수록 범위: 두 시점의 발전량. 증가 원인과 정책 효과는 다루지 않음.' },
          reviewNote: '연결한 예시 표의 두 값은 본문의 비교와 같습니다. 다만 이 표만으로 증가의 원인이나 전체 에너지 정책의 효과까지 설명할 수는 없습니다.',
        },
        {
          id: 'share', title: '설비가 늘면, 생산 비율도 같을까?',
          excerpt: '재생에너지는 이미 전력 생산의 40%를 담당한다. 설치된 발전 설비에서 차지하는 비중이 40%이기 때문이다.',
          summary: '설비 비중 40%를 근거로 실제 전력 생산 비중도 40%라고 설명합니다.',
          assessment: 'reviewed', reviewNote: '',
          findings: [
            { id: 'metric', title: '설비 비중과 발전량 비중은 같은 수치일까요?',
              detail: '인용한 40%는 설비 비중입니다. 이 자료만으로 실제 생산한 전력의 비중도 40%라고 결론 낼 수 없습니다.',
              missing: '같은 지역·같은 기간의 실제 발전량 비중 자료가 필요합니다.',
              evidence: { title: '예시 통계표 · 지표 정의', text: '설비용량 비중 40%. 이 표에는 실제 발전량의 비중을 수록하지 않음.' } },
            { id: 'period', title: '이 자료의 시점으로 현재를 설명할 수 있을까요?',
              detail: '본문은 “이미”라는 표현으로 현재 상태를 말하지만, 연결된 표는 5년 전 자료입니다. 현재 수치에 대한 근거는 따로 필요합니다.',
              missing: '현재 시점의 통계와 본문에서 말하는 기준 시점을 확인해야 합니다.',
              evidence: { title: '예시 통계표 · 조사 시점', text: '이 표의 조사 기준 연도는 2021년. 현재 시점의 통계로 갱신된 자료가 아님.' } },
          ],
        },
        {
          id: 'price', title: '요금에 미친 영향은 얼마나 될까?',
          excerpt: '지역 연구팀은 재생에너지 확대가 요금에 미친 영향을 분석한 보고서를 곧 공개할 예정이다.',
          summary: '지역 연구팀이 재생에너지 확대와 요금의 관계를 다룬 보고서를 곧 공개할 예정이라고 전합니다.',
          assessment: 'unverified', findings: [],
          reviewNote: '보고서 원문이 제공되지 않았습니다. 지금은 연구의 방법과 결론을 검토할 수 없으며, 자료를 찾지 못했다는 이유로 이 문장을 거짓이라고 판단하지 않습니다.',
        },
        {
          id: 'conditions', title: '같은 사실, 다른 우선순위',
          excerpt: '전력망 투자와 전환 비용을 함께 고려해야 한다. 어떤 투자를 먼저 할지는 사람마다 다르게 판단할 수 있다.',
          summary: '전력망 투자와 전환 비용을 함께 고려하고, 투자 우선순위에는 의견 차이가 있을 수 있다고 말합니다.',
          assessment: 'opinion', findings: [],
          reviewNote: '어떤 투자를 먼저 할지는 비용·안정성·환경 중 무엇을 우선하는지에 따라 달라집니다. 사실 확인만으로 하나의 정답을 정하기 어려운 선택입니다.',
          perspective: { title: '이렇게 생각하는 사람들도 있어요', text: '장기적인 공급 안정성을 위해 전력망 투자를 우선하자는 관점과, 단기적인 비용 부담을 먼저 줄이자는 관점이 있습니다. 서로 다른 우선순위를 보여주는 가상 의견 예시입니다.' },
        },
      ],
    },
    {
      id: 'b', label: '기사 B', title: '오르는 전기요금, 에너지 전환이 남긴 과제',
      description: '지표는 구분했지만 결론은 충분할까? 인과관계를 살펴보는 예시입니다.',
      passages: [
        {
          id: 'growth', title: '같은 시기에 일어난 두 변화',
          excerpt: '예시 지역에서는 재생에너지 설비와 전기요금이 같은 기간에 증가했다.',
          summary: '두 변화가 같은 시기에 관찰되었다는 내용입니다.',
          assessment: 'reviewed', findings: [],
          reference: { title: '시계열 관찰 메모 · 가상 자료', text: '관찰 기간 동안 재생에너지 설비와 전기요금이 모두 증가함.', scope: '수록 범위: 변화 방향. 인과관계와 각 변수의 기여도는 추정하지 않음.' },
          reviewNote: '연결한 메모는 같은 시기에 두 값이 증가했다는 관찰을 담고 있습니다. 한 변화가 다른 변화의 원인인지까지 검증한 자료는 아닙니다.',
        },
        {
          id: 'share', title: '설비와 생산량을 구분해서 보기',
          excerpt: '설비 비중은 최대 출력에 관한 지표이며, 실제 생산한 전력의 비중과는 구분해서 읽어야 한다.',
          summary: '서로 다른 지표를 분리해서 설명합니다.',
          assessment: 'reviewed', findings: [],
          reference: { title: '전력 지표 용어 설명 · 가상 자료', text: '설비용량은 발전 시설의 최대 출력, 발전량은 일정 기간 실제 생산한 전력량을 가리킴.', scope: '수록 범위: 용어 정의. 지역별 실제 통계는 포함하지 않음.' },
          reviewNote: '연결한 자료에서는 설비용량과 발전량을 구분합니다. 특정 지역의 실제 생산 비중은 별도의 통계에서 확인해야 합니다.',
        },
        {
          id: 'price', title: '요금 상승의 원인을 단정하는 문장',
          excerpt: '전기요금이 오른 것은 전적으로 재생에너지 확대 때문이다. 재생에너지를 줄이면 요금 문제는 곧바로 해결된다.',
          summary: '재생에너지 확대를 요금 상승의 유일한 원인으로 제시하고, 이를 줄이면 요금이 내려간다고 주장합니다.',
          assessment: 'reviewed', reviewNote: '',
          findings: [
            { id: 'causality', title: '함께 증가했다는 것이 원인의 근거일까요?',
              detail: '두 값이 함께 늘었다는 관찰만으로 한쪽이 다른 쪽의 원인이라는 결론을 뒷받침하지 못합니다.',
              missing: '다른 조건을 통제하거나 원인을 분리해 살펴본 분석이 필요합니다.',
              evidence: { title: '예시 분석 메모 · 분석 범위', text: '이 자료는 시계열의 동반 변화를 기술하며, 다른 조건을 통제한 인과 추정은 수행하지 않음.' } },
            { id: 'exclusion', title: '다른 요인을 고려해도 같은 결론일까요?',
              detail: '자료에 함께 적힌 연료비와 요금 정책을 검토하지 않은 채 “전적으로”, “곧바로 해결”이라는 결론을 내립니다.',
              missing: '연료 가격과 요금 정책의 영향을 함께 비교한 자료가 필요합니다.',
              evidence: { title: '예시 분석 메모 · 추가 변수', text: '같은 기간 연료 가격과 요금 정책도 변동함. 각 요인의 기여도는 분리해 추정하지 않았음.' } },
          ],
        },
        {
          id: 'conditions', title: '비용과 안정성을 함께 살피기',
          excerpt: '전환 속도를 논의할 때 비용과 공급 안정성을 함께 고려할 필요가 있다.',
          summary: '전환 속도를 논의할 때 비용과 공급 안정성을 함께 고려하자고 제안합니다.',
          assessment: 'opinion', findings: [],
          reviewNote: '비용과 공급 안정성 중 무엇을 얼마나 우선할지에 대한 의견입니다. 다른 우선순위를 가진 사람과도 조건을 나누어 이야기할 수 있습니다.',
          perspective: { title: '이렇게 생각하는 사람들도 있어요', text: '당장의 부담을 줄이자는 의견과 장기적인 안정성을 우선하자는 의견을 함께 살펴볼 수 있습니다. 반대 의견의 존재가 어느 쪽이 틀렸다는 증거는 아닙니다. 가상 의견 예시입니다.' },
        },
      ],
    },
  ],
}

const data = window.SCROLLFACT_EVIDENCE_DEMO
const findingsOf = (doc: DemoDocument) => doc.passages.flatMap(p => p.findings.map(f => ({ ...f, passageId: p.id })))
function ParagraphCard({ passage, index, total, onNext, onSource }: {
  passage: Passage; index: number; total: number; onNext: () => void; onSource?: () => void
}) {
  return <article className="analysis-page paragraph-page" aria-label={`문단 ${index + 1}: ${passage.title}`}>
    <div className="page-inner">
      <div className="paragraph-topline"><span className="eyebrow">지금 읽는 문단</span><span className="muted">{index + 1} / {total}</span></div>
      <div className="paragraph-heading"><div><h2>{passage.title}</h2></div></div>
      {onSource && <button className="source-jump" onClick={onSource}>원문에서 보기 <ExternalLink size={13} /></button>}
      <div className="claim-summary"><span>주장 요약 · AI 작성 예시</span><p>{passage.summary}</p></div>
      <blockquote className="excerpt"><span>기사에 쓰인 문장</span><p>{passage.excerpt}</p></blockquote>
      {passage.findings.map(f => <section className="evidence-review" key={f.id} aria-label={f.title}>
        <span className="review-eyebrow">함께 확인할 질문 · AI 제안 예시</span><h3>{f.title}</h3>
        <div className="source-material"><small><BookOpen size={14} /> 연결한 자료 · 가상 예시</small><h4>{f.evidence.title}</h4><blockquote>{f.evidence.text}</blockquote></div>
        <div className="ai-reading"><span>AI의 검토 의견 · 예시</span><p>{f.detail}</p></div>
        <div className="open-question"><span>판단에 더 필요한 자료</span><p>{f.missing}</p></div>
      </section>)}
      {passage.findings.length === 0 && <section className="review-note">
        <h3>{passage.assessment === 'unverified' ? '아직 확인할 수 없는 부분' : passage.assessment === 'opinion' ? '사실 확인과 구분할 선택' : '자료에서 확인할 수 있는 범위'}</h3>
        {passage.reference && <div className="source-material"><small><BookOpen size={14} />{passage.reference.title}</small><blockquote>{passage.reference.text}</blockquote><p className="material-scope">{passage.reference.scope}</p></div>}
        <div className="ai-reading"><span>AI의 검토 의견 · 예시</span><p>{passage.reviewNote}</p></div>
      </section>}
      {passage.perspective && <aside className="perspective"><span>함께 읽을 관점 · 가상 예시</span><h3>{passage.perspective.title}</h3><p>{passage.perspective.text}</p></aside>}
      <p className="review-limits">연결한 자료에 한정한 검토입니다. AI의 요약·해석에도 오류가 있을 수 있습니다.</p>
      <button className="page-next" onClick={onNext}><span>{index === total - 1 ? '전체 안내로 돌아가기' : '다음 문단 이어서 보기'}</span><ArrowDown className={index === total - 1 ? 'rotate-up' : ''} size={17} /></button>
    </div>
  </article>
}

function Reader({ doc, sourceId, onSource }: { doc: DemoDocument; sourceId?: string | null; onSource?: (id: string) => void }) {
  const [follow, setFollow] = useState(true)
  const allFindings = findingsOf(doc)
  const count = doc.passages.length
  const { readerRef, pagesRef, page, goTo, onScroll, onKeyDown } = useReaderNavigation(count)
  useEffect(() => {
    if (!follow || !sourceId) return
    const index = doc.passages.findIndex(p => p.id === sourceId)
    if (index >= 0) goTo(index + 1)
  }, [sourceId, follow, doc, goTo])

  return <>
    <div className="reading-toolbar"><span><span className="live-dot" />{onSource ? '원문 연결됨' : '문단별 근거 읽기'}</span>{onSource ? <button className="follow-source" aria-pressed={follow} onClick={() => setFollow(!follow)}>{follow ? '원문 따라가기 켜짐' : '원문 따라가기 꺼짐'}</button> : <span className="muted">스크롤로 이어 읽기</span>}</div>
    <div className="reader" ref={readerRef} onScroll={onScroll} onKeyDown={onKeyDown} tabIndex={0} aria-label="전체 및 문단별 근거 검토. 스크롤 또는 페이지 이동 버튼을 사용하세요.">
      <section className="analysis-page overview-page" ref={node => { pagesRef.current[0] = node }} aria-label="페이지 전체 읽기 안내">
        <div className="page-inner">
          <div className="overview-intro"><span className="eyebrow">READ WITH CONTEXT</span><h1>이 주장은,<br />무엇에 기대고 있을까?</h1><p className="overview-description">원문을 읽는 흐름에 맞춰 자료와 해석을 나란히 살펴보세요.</p></div>
          <div className="article-summary"><span className="eyebrow">연결한 원문 · {doc.label}</span><h2>{doc.title}</h2><p>{doc.description}</p></div>
          <section className="review-questions" aria-label="함께 확인할 질문"><h3>읽으며 확인해 볼 질문</h3>{allFindings.map(f => <button key={f.id} onClick={() => goTo(doc.passages.findIndex(p => p.id === f.passageId) + 1)}><span>{f.title}</span><ArrowRight size={15} /></button>)}</section>
          <div className="scope-note"><strong>이 화면이 보여주는 것</strong><p>기사의 주장, 연결된 자료의 발췌, AI의 검토 의견을 구분합니다. 자료가 없는 부분은 모르는 채로 남겨 둡니다. 글 전체에 점수나 신뢰 등급을 붙이지 않습니다.</p></div>
          <div className="passage-map"><div className="section-label"><h3>문단별 이어 읽기</h3></div>
            {doc.passages.map((p, i) => <button className="passage-link" key={p.id} onClick={() => goTo(i + 1)} aria-label={`문단 ${i + 1}로 이동: ${p.title}`}><span className="passage-index">{String(i + 1).padStart(2, '0')}</span><span className="passage-title">{p.title}</span><ArrowRight size={14} /></button>)}
          </div>
          <button className="page-next" onClick={() => goTo(1)}><span>{onSource ? '왼쪽 기사를 스크롤하며 읽어 보세요' : '문단별 근거 살펴보기'}</span><ArrowDown size={17} /></button>
        </div>
      </section>
      {doc.passages.map((p, i) => <div className="page-slot" key={p.id} ref={node => { pagesRef.current[i + 1] = node }}><ParagraphCard onSource={onSource ? () => onSource(p.id) : undefined} passage={p} index={i} total={count} onNext={() => goTo(i === count - 1 ? 0 : i + 2)} /></div>)}
    </div>
    <nav className="reader-navigation" aria-label="분석 페이지 이동">
      <button className="icon-button" aria-label="이전 분석 페이지" disabled={page === 0} onClick={() => goTo(page - 1)}><ArrowLeft size={18} /></button>
      <div className="page-indicators"><button className={`overview-indicator ${page === 0 ? 'is-active' : ''}`} aria-label="전체 안내로 이동" aria-current={page === 0 ? 'step' : undefined} onClick={() => goTo(0)}><ScanLine size={15} /></button><span className="nav-divider" />
        {doc.passages.map((p, i) => <button key={p.id} className={`page-indicator ${page === i + 1 ? 'is-active' : ''}`} aria-label={`문단 ${i + 1}로 이동`} aria-current={page === i + 1 ? 'step' : undefined} onClick={() => goTo(i + 1)}>{String(i + 1).padStart(2, '0')}</button>)}
      </div>
      <button className="icon-button" aria-label={page === count ? '전체 안내로 돌아가기' : '다음 분석 페이지'} onClick={() => goTo(page === count ? 0 : page + 1)}>{page === count ? <ArrowUp size={17} /> : <ArrowRight size={18} />}</button>
    </nav>
  </>
}

export default function App() {
  const [selected, setSelected] = useState(data.documents[0].id)
  const linked = new URLSearchParams(location.search).has('extension') || new URLSearchParams(location.search).has('simulationPanel')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const connection = useRef<ReturnType<typeof createPanelConnection> | null>(null)
  const snapshot = useRef<string | null>(null)
  useEffect(() => {
    if (!linked) return
    const client = createPanelConnection(message => {
      if (!isRecord(message)) return
      if (message.type === MessageType.documentChanged) {
        snapshot.current = null; setConnected(false); setSourceId(null)
        setError('원문이 변경됐습니다. 시연 분석을 다시 연결해 주세요.')
      }
      if (message.type === MessageType.activeSectionChanged && message.snapshotId === snapshot.current && typeof message.sectionId === 'string') setSourceId(message.sectionId)
    })
    connection.current = client
    return () => { connection.current = null; client.dispose() }
  }, [linked])
  async function connect() {
    setConnecting(true); setError('')
    try {
      const captured = await connection.current?.request({ type: MessageType.captureDocument })
      if (!isRecord(captured) || !isDocumentSnapshot(captured.snapshot)) throw new Error('원문을 가져오지 못했습니다.')
      const html = new DOMParser().parseFromString(captured.snapshot.html, 'text/html')
      const id = html.querySelector('[data-deduction-document]')?.getAttribute('data-deduction-document')
      const selectedDoc = data.documents.find(d => d.id === id)
      if (!selectedDoc || !selectedDoc.passages.every(p => html.querySelector(`#sf-source-${p.id}`)?.textContent?.trim() === p.excerpt)) throw new Error('이 시뮬레이션은 아래 예시 기사에서만 동작합니다. 일반 웹사이트에는 예시 검토 의견을 적용하지 않습니다.')
      snapshot.current = captured.snapshot.snapshotId
      const watched = await connection.current?.request({ type: MessageType.watchSections, snapshotId: snapshot.current, targets: selectedDoc.passages.map(p => ({ id: p.id, selector: `#sf-source-${p.id}` })) })
      if (!isRecord(watched) || watched.ok !== true || !Array.isArray(watched.unmatchedIds) || watched.unmatchedIds.length) throw new Error('원문 문단 위치를 연결하지 못했습니다.')
      setSelected(selectedDoc.id); setSourceId(null); setConnected(true)
    } catch (caught) { snapshot.current = null; setError(caught instanceof Error ? caught.message : '연결 실패') }
    finally { setConnecting(false) }
  }
  async function jumpToSource(id: string) {
    try {
      const result = await connection.current?.request({ type: MessageType.scrollToSection, snapshotId: snapshot.current, sectionId: id })
      if (!isRecord(result) || result.ok !== true) throw new Error('원문 위치를 찾지 못했습니다. 다시 연결해 주세요.')
      setError('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : '원문 이동 실패') }
  }
  const [compare, setCompare] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const doc = data.documents.find(d => d.id === selected)!
  useEffect(() => {
    if (compare) dialog.current?.showModal()
    else dialog.current?.close()
  }, [compare])
  return <div className="app-shell deduction-app">
    <header className="app-header"><a href="/coaching.html#deductions" target="_top" className="brand"><span className="brand-mark"><ScanLine size={20} /></span><span>scroll<span className="brand-light">fact</span><small>근거를 따라 읽다</small></span></a><span className="extension-badge">{linked ? (location.protocol === 'chrome-extension:' ? '브라우저 확장' : '확장 시뮬레이션') : '근거 리더'}</span><button hidden={linked} className="deduction-compare-button" onClick={() => setCompare(true)}><Columns2 size={16} />두 문서 비교</button></header>
    <div className="demo-notice">시연용 기사·자료·AI 응답 예시</div>
    <div hidden={linked} className="document-tabs" aria-label="예시 문서 선택">{data.documents.map(d => <button key={d.id} aria-pressed={selected === d.id} onClick={() => setSelected(d.id)}><b>{d.label}</b><span>{d.id === 'a' ? '수치의 기준' : '원인의 단정'}</span></button>)}<span>같은 주제, 서로 다른 논거</span></div>
    {error && <p className="connection-error" role="alert">{error}</p>}
    {linked && !connected ? <main className="connection-start"><span className="eyebrow">SCROLL THE WEBSITE</span><h1>원문을 읽으면,<br />분석도 따라옵니다.</h1><p>시연 분석을 연결한 뒤 웹사이트를 스크롤하세요. 보고 있는 문단에 맞춰 주장·자료·검토 질문이 자동으로 넘어갑니다.</p><button className="primary-button" disabled={connecting} onClick={() => void connect()}>{connecting ? '원문 문단 연결 중…' : '시연 분석 연결하기'}<ArrowRight size={17} /></button><p>AI·서버 없이 준비된 예시 응답을 사용합니다.</p><a href="http://127.0.0.1:8765/deduction-site.html?extension=1" target="_blank" rel="noreferrer">확장 프로그램용 예시 기사 열기 ↗</a></main> : <Reader key={selected} doc={doc} sourceId={sourceId} onSource={linked ? id => void jumpToSource(id) : undefined} />}
    <dialog ref={dialog} className="comparison" onCancel={() => setCompare(false)} onClose={() => setCompare(false)} aria-labelledby="comparison-title">
      <div className="comparison-top"><span>COMPARE THE REASONS</span><button aria-label="비교 창 닫기" onClick={() => setCompare(false)}><X size={20} /></button></div>
      <h2 id="comparison-title">서로 다른 주장,<br />무엇을 더 확인해야 할까?</h2>
      <p>각 글이 어떤 자료에 기대고 있는지, 결론을 내리려면 무엇이 더 필요한지 비교합니다.</p>
      <div className="comparison-grid">{data.documents.map(d => <article key={d.id}><span>{d.label}</span><h3>{d.title}</h3><ul>{findingsOf(d).map(f => <li key={f.id}>{f.title}</li>)}</ul><p>{d.passages.some(p => p.assessment === 'unverified') ? '원문 자료가 제공되지 않아 검토를 보류한 문단이 있습니다.' : '연결한 예시 자료의 범위에서만 검토했습니다.'}</p><button onClick={() => { setSelected(d.id); setCompare(false) }}>{d.label} 읽기 <ArrowRight size={14} /></button></article>)}</div>
      <div className="comparison-note"><strong>AI의 검토 의견도 확인할 대상입니다.</strong><p>어떤 자료를 선택하고 어떻게 요약하는지에도 편향과 오류가 생길 수 있습니다. 출처의 표현과 AI의 해석을 구분해 읽어 보세요.</p></div>
    </dialog>
  </div>
}

function SourceSite() {
  const params = new URLSearchParams(location.search)
  const installed = params.get('extension') === '1'
  const doc = data.documents.find(d => d.id === params.get('doc')) ?? data.documents[0]
  const simulator = useRef<ReturnType<typeof mountSimulator> | null>(null)
  useEffect(() => {
    document.documentElement.classList.add('deduction-source-page')
    if (!installed) simulator.current = mountSimulator()
    return () => { simulator.current?.dispose(); simulator.current = null; document.documentElement.classList.remove('deduction-source-page') }
  }, [installed])
  return <div className="source-site">
    <div className="source-utility"><span>2026년 11월 1일 일요일</span><span>시연용 가상 언론사 · 모든 기사·자료는 예시</span></div>
    <header className="source-masthead"><div><strong>데일리<span>포커스</span></strong><small>DAILY FOCUS</small></div><span className="source-edition">세상의 흐름을 읽는 오늘의 시선</span></header>
    <div className="source-sections"><span>종합</span><span>정치</span><span>경제</span><span className="selected">기후·에너지</span><span>사회</span><span>오피니언</span></div>
    <aside className="source-controls"><p>{installed ? '도구 모음에서 ScrollFact 확장 아이콘을 눌러 보세요.' : '이 기사를 ScrollFact와 함께 읽어 보세요.'}</p>{!installed && <button onClick={() => simulator.current?.toggle()}><ScanLine size={15}/>ScrollFact 열기 / 닫기</button>}</aside>
    <article className="source-article" data-deduction-document={doc.id}>
      <header><span className="source-category">경제 &gt; 기후·에너지</span><h1>{doc.title}</h1><p className="source-deck">{doc.id === 'a' ? '발전 설비 확대와 전기요금, 전환 비용을 둘러싼 논의' : '에너지 전환의 속도와 비용을 둘러싼 서로 다른 시각'}</p><div className="source-byline"><span className="author-avatar">편</span><div><b>데일리포커스 기획팀</b><small>입력 2026.11.01 09:00 · 시연용 가상 기사</small></div></div></header>
      <figure className="source-hero"><svg viewBox="0 0 800 260" role="img" aria-label="풍력 발전기와 태양광 패널을 그린 기사 삽화"><rect width="800" height="260" fill="#e8eef4"/><circle cx="633" cy="65" r="34" fill="#f3dc9b"/><path d="M0 178 Q180 90 390 178 T800 150 V260 H0Z" fill="#acbbc4"/><path d="M0 225 Q230 123 470 215 T800 190 V260 H0Z" fill="#697f8b"/>{[175,345,490].map((x,i)=><g key={x} stroke="#fff" strokeWidth="5" strokeLinecap="round"><path d={`M${x} ${85+i*14}V225`}/><path d={`M${x} ${85+i*14}l-40 -26m40 26l38 -27m-38 27l0 48`}/></g>)}<g fill="#274d70" stroke="#9db5c9" strokeWidth="2"><path d="M520 197h188l44 51H480Z"/><path d="M512 212h209m-222 16h236m-159-31l-13 51m59-51v51m47-51l17 51"/></g></svg><figcaption>에너지 전환을 주제로 한 편집 삽화. 실제 현장 사진이 아닙니다.</figcaption></figure>
      <div className="source-body">{doc.passages.map(p => <section key={p.id}><h2>{p.title}</h2><p id={`sf-source-${p.id}`}>{p.excerpt}</p></section>)}</div>
      <footer><p>※ 이 기사는 ScrollFact 시연을 위해 작성한 가상 기사입니다. 사실·의견·자료 부족을 구분해 살펴보는 상황을 담고 있습니다.</p><span>ⓒ DAILY FOCUS DEMO</span></footer>
      <nav className="source-related" aria-label="시연 기사 선택"><h3>다른 기사로 이어 읽기</h3>{data.documents.map(d => <a key={d.id} aria-current={doc.id === d.id ? 'page' : undefined} href={`?doc=${d.id}${installed ? '&extension=1' : ''}`}><span>{d.label}</span><strong>{d.title}</strong><ArrowRight size={16}/></a>)}</nav>
    </article>
  </div>
}

createRoot(document.getElementById('root')!).render(<StrictMode>{location.pathname.endsWith('/deduction-site.html') ? <SourceSite /> : <App />}</StrictMode>)
