import { useEffect, useRef, useState } from 'react'
import { Check, ScanLine, ArrowRight, RotateCcw } from 'lucide-react'
import { createDiagnosticAnalyzer, type DiagnosticResult } from '../api/analyze'
import { AnalysisLoading } from '../sidepanel/components/AnalysisLoading'
import type { AnalysisProgress } from '../types'

const phaseLabels: Record<AnalysisProgress['phase'], string> = {
  capturing: '원문 캡처', compressing: 'gzip 압축', uploading: '서버 업로드',
  queued: '접수 완료', extracting: '문단 추출', checking_sources: '출처 수집', summarizing: 'AI 분석',
}

export function IntegrationPreview({ documentHtml, baseUrl }: { documentHtml: string; baseUrl: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const controller = useRef<AbortController | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress>({ phase: 'capturing' })
  const [events, setEvents] = useState<string[]>([])
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  function cancel() {
    controller.current?.abort()
    controller.current = null
    setLoading(false)
    setEvents((previous) => [...previous, '사용자 중단 · 서버 작업 삭제 요청'])
  }
  async function start() {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setError(null)
    setResult(null)
    setMatched([])
    setProgress({ phase: 'capturing' })
    setEvents(['원문 캡처'])
    const deadline = window.setTimeout(() => request.abort(new Error('점검 제한 시간 10분을 초과했습니다.')), 600_000)
    try {
      const doc = frame.current?.contentDocument
      if (!doc?.body || !ready) throw new Error('예제 문서가 아직 준비되지 않았습니다.')
      const outcome = await createDiagnosticAnalyzer(baseUrl)({
        snapshotId: crypto.randomUUID(), url: new URL('/integration.html', location.href).href,
        title: doc.title, html: doc.documentElement.outerHTML,
      }, request.signal, (next) => {
        if (controller.current !== request || request.signal.aborted) return
        setProgress(next)
        const counts = next.sources ? ` · ${next.sources.completed}/${next.sources.total ?? '?'}개 (실패 ${next.sources.failed})` : ''
        setEvents((previous) => [...previous, phaseLabels[next.phase] + counts])
      })
      if (request.signal.aborted || controller.current !== request) return
      setMatched(outcome.passages.filter((passage) => {
        try { return doc.querySelectorAll(passage.selector).length === 1 }
        catch { return false }
      }).map((passage) => passage.id))
      setResult(outcome)
      setEvents((previous) => [...previous, `점검 완료 · 출처 ${outcome.sources.length}개 처리 (실패 ${outcome.sources.filter((s) => s.failure).length})`])
    } catch (caught) {
      if (controller.current === request) setError(caught instanceof Error ? caught.message : '서버 연결에 실패했습니다.')
    } finally {
      window.clearTimeout(deadline)
      if (controller.current === request) {
        setLoading(false)
        controller.current = null
      }
    }
  }
  function jump(selector: string) {
    frame.current?.contentDocument?.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return <div className="integration-layout">
    <iframe ref={frame} title="업로드할 예제 원문" srcDoc={documentHtml} sandbox="allow-same-origin" onLoad={() => setReady(true)} />
    <div className="app-shell integration-panel">
      <header className="app-header"><span className="brand"><ScanLine size={24} /> scrollfact</span><span className="demo-badge">LIVE API</span></header>
      <div className="demo-notice">연결 점검 · 실제 서버 처리 / AI 평가 생략</div>
      {loading ? <AnalysisLoading diagnostic progress={progress} onCancel={cancel} /> : <main className="integration-content">
        <span className="eyebrow">PIPELINE CHECK</span>
        <h1>{result ? '서버까지, 연결 완료.' : '분석 전에, 연결부터.'}</h1>
        <p className="integration-description">왼쪽 문서 전체를 업로드하고 문단 추출과 출처 수집을 확인합니다. 요약과 신뢰도 점수는 생성하지 않습니다.</p>
        <button className="primary-button" disabled={!ready} onClick={() => void start()}>{result ? <RotateCcw size={17} /> : <ArrowRight size={17} />}{result ? '다시 연결 점검' : '업로드부터 점검하기'}</button>
        {error && <div className="error-message" role="alert">{error}</div>}
        {result && <div role="status" className="diagnostic-report">
          <div className="diagnostic-stats"><div><strong>{result.passages.length}</strong><span>추출 문단</span></div><div><strong>{result.sources.length}</strong><span>처리 출처</span></div><div><strong>{matched.length}/{result.passages.length}</strong><span>원문 위치 일치</span></div></div>
          <p className="transfer-detail">원문 {(result.htmlBytes / 1024).toFixed(1)} KiB → gzip {((progress.uploadedBytes ?? 0) / 1024).toFixed(1)} KiB</p>
          <h2>출처 처리 결과</h2>
          {result.sources.map((source) => <div className="diagnostic-source" key={source.url}><span className={source.failure ? 'source-failed' : 'source-ok'}>{source.failure ? '수집 실패' : '수집 완료'}</span><span>{source.url}</span><small>{source.failure || `${source.textCharacters.toLocaleString()}자 수집 · ${source.title}`}</small></div>)}
          <h2>원문 위치 확인</h2>
          {result.passages.map((passage, index) => <button key={passage.id} className="diagnostic-passage" disabled={!matched.includes(passage.id)} onClick={() => jump(passage.selector)}><Check size={15} /><span>문단 {index + 1} · {passage.text.slice(0, 35)}…</span><ArrowRight size={14} /></button>)}
        </div>}
        {events.length > 0 && <details className="diagnostic-events" open><summary>실제 수신한 진행 상태</summary><ol>{events.map((event, index) => <li key={index}>{event}</li>)}</ol><p>2초 간격으로 조회합니다. 빠르게 끝난 중간 단계는 화면에 잡히지 않을 수 있습니다.</p></details>}
        <p className="integration-endpoint">API · {baseUrl}<br />{result && `작업 ID · ${result.analysisId}`}</p>
        <a className="integration-back" href="/">기존 분석 UI 미리보기 →</a>
      </main>}
    </div>
  </div>
}

