import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Link2,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import type { AnalysisResponse, AnalyzeDocument } from '../types'
import { ParagraphPage } from './components/ParagraphPage'
import { TrustGauge } from './components/TrustGauge'
import { usePageAnalysis } from './hooks/usePageAnalysis'
import { trustLabels, trustTone } from './trust'

interface ReaderProps {
  result: AnalysisResponse
  inExtension: boolean
  sourceSection: string | null
  jumpToSource: (id: string) => Promise<void>
}

function AnalysisReader({
  result,
  inExtension,
  sourceSection,
  jumpToSource,
}: ReaderProps) {
  const readerRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<(HTMLElement | null)[]>([])
  const [page, setPage] = useState(0)
  const [followSource, setFollowSource] = useState(true)
  const tone = trustTone(result.overview.status)
  const VerdictIcon = tone === 'green' ? ShieldCheck : TriangleAlert
  const count = result.sections.length

  const goTo = useCallback((index: number) => {
    const reader = readerRef.current
    const target = pagesRef.current[index]
    if (!reader || !target) return
    reader.scrollTo({
      top: target.offsetTop,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }, [])

  useEffect(() => {
    if (!followSource || sourceSection === null) return
    const index = result.sections.findIndex(
      (section) => section.id === sourceSection,
    )
    if (index >= 0) goTo(index + 1)
  }, [followSource, goTo, result.sections, sourceSection])

  function onScroll() {
    const reader = readerRef.current
    if (!reader) return
    const line = reader.scrollTop + reader.clientHeight * 0.4
    let nextPage = 0
    pagesRef.current.forEach((element, index) => {
      if (element && element.offsetTop <= line) nextPage = index
    })
    setPage(nextPage)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const targets: Record<string, number> = {
      PageDown: Math.min(count, page + 1),
      PageUp: Math.max(0, page - 1),
      Home: 0,
      End: count,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    goTo(targets[event.key])
  }

  return (
    <>
      <div className="reading-toolbar">
        <span>
          <span className="live-dot" />
          분석 완료 · {count}개 문단
        </span>
        {inExtension ? (
          <button
            className={`follow-button ${followSource ? 'is-on' : ''}`}
            aria-pressed={followSource}
            onClick={() => setFollowSource(!followSource)}
          >
            <Link2 size={13} aria-hidden="true" />
            원문 따라가기
          </button>
        ) : (
          <span className="muted">스크롤로 이어 읽기</span>
        )}
      </div>
      <div
        className="reader"
        ref={readerRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="전체 및 문단별 분석. 스크롤 또는 페이지 이동 버튼을 사용하세요."
      >
        <section
          className={`analysis-page overview-page tone-${tone}`}
          ref={(node) => {
            pagesRef.current[0] = node
          }}
          aria-label="페이지 전체 분석"
        >
          <div className="page-inner">
            <div className="overview-intro">
              <span className="eyebrow">THE BIG PICTURE</span>
              <h1>
                이 페이지,
                <br />
                얼마나 믿을 수 있을까?
              </h1>
            </div>
            <div className="overall-score">
              <TrustGauge
                score={result.overview.score}
                status={result.overview.status}
              />
              <span className="status-badge">
                <VerdictIcon size={14} aria-hidden="true" />
                {trustLabels[result.overview.status]}
              </span>
            </div>
            <div className="article-summary">
              <span className="eyebrow">한눈에 보는 분석</span>
              <h2>{result.document.title}</h2>
              <p>{result.overview.summary}</p>
            </div>
            {count > 0 ? (
              <div className="passage-map">
                <div className="section-label">
                  <h3>문단별 살펴보기</h3>
                  <span>{String(count).padStart(2, '0')} PASSAGES</span>
                </div>
                {result.sections.map((section, index) => (
                  <button
                    className={`passage-link tone-${trustTone(section.status)}`}
                    key={section.id}
                    onClick={() => goTo(index + 1)}
                    aria-label={`문단 ${index + 1}로 이동: ${section.title}, ${section.score}점`}
                  >
                    <span className="passage-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="passage-title">{section.title}</span>
                    <span className="passage-score">
                      {section.score}
                      <span className="score-dot" />
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-sections">
                <CircleHelp size={18} aria-hidden="true" />
                <p>
                  문단별 분석 결과가 없습니다.
                  <br />
                  위의 전체 분석을 확인해 주세요.
                </p>
              </div>
            )}
            {count > 0 && (
              <button className="page-next" onClick={() => goTo(1)}>
                <span>스크롤하며 근거를 확인해 보세요</span>
                <ArrowDown size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
        {result.sections.map((section, index) => (
          <div
            className="page-slot"
            key={section.id}
            ref={(node) => {
              pagesRef.current[index + 1] = node
            }}
          >
            <ParagraphPage
              section={section}
              index={index}
              total={count}
              inExtension={inExtension}
              onJumpToSource={() => void jumpToSource(section.id)}
              onNext={() => goTo(index === count - 1 ? 0 : index + 2)}
            />
          </div>
        ))}
      </div>
      <nav className="reader-navigation" aria-label="분석 페이지 이동">
        <button
          className="icon-button"
          aria-label="이전 분석 페이지"
          disabled={page === 0}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="page-indicators">
          <button
            className={`overview-indicator ${page === 0 ? 'is-active' : ''}`}
            aria-label="전체 분석으로 이동"
            aria-current={page === 0 ? 'step' : undefined}
            onClick={() => goTo(0)}
          >
            <ScanLine size={15} />
          </button>
          <span className="nav-divider" />
          {result.sections.map((section, index) => (
            <button
              key={section.id}
              className={`page-indicator tone-${trustTone(section.status)} ${page === index + 1 ? 'is-active' : ''}`}
              aria-label={`문단 ${index + 1}로 이동`}
              aria-current={page === index + 1 ? 'step' : undefined}
              onClick={() => goTo(index + 1)}
            >
              {String(index + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label={
            page === count ? '전체 분석으로 돌아가기' : '다음 분석 페이지'
          }
          disabled={count === 0}
          onClick={() => goTo(page === count ? 0 : page + 1)}
        >
          {page === count ? <ArrowUp size={17} /> : <ChevronRight size={18} />}
        </button>
      </nav>
    </>
  )
}

export function SidePanel({
  analyzeDocument,
  demo,
}: {
  analyzeDocument: AnalyzeDocument
  demo: boolean
}) {
  const {
    inExtension,
    status,
    result,
    error,
    notice,
    sourceSection,
    analyze,
    cancel,
    jumpToSource,
  } = usePageAnalysis(analyzeDocument, demo)
  const loading = status === 'loading'
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          href="#"
          className="brand"
          onClick={(event) => event.preventDefault()}
          aria-label="ScrollFact"
        >
          <span className="brand-mark">
            <ScanLine size={20} strokeWidth={1.8} />
          </span>
          <span>
            scroll<span className="brand-light">fact</span>
            <small>READ WITH CONTEXT</small>
          </span>
        </a>
        <div className="header-actions">
          {demo && <span className="demo-badge">DEMO</span>}
          {result && (
            <button
              className="icon-button"
              onClick={() => void analyze()}
              aria-label="다시 분석"
              title="다시 분석"
            >
              <RefreshCw size={17} />
            </button>
          )}
        </div>
      </header>
      {demo && (
        <div className="demo-notice">
          <span className="demo-dot" />
          샘플 분석입니다. 실제 팩트체크 결과가 아닙니다.
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <CircleHelp size={15} />
          <span>{notice}</span>
        </div>
      )}
      {result ? (
        <AnalysisReader
          key={result.snapshotId}
          result={result}
          inExtension={inExtension}
          sourceSection={sourceSection}
          jumpToSource={jumpToSource}
        />
      ) : (
        <main className="welcome-screen">
          <div className="welcome-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-card">
              <span />
              <span />
              <span />
              <div className="art-check">
                <Check size={22} strokeWidth={2.5} />
              </div>
            </div>
            <span className="art-spark spark-one" />
            <span className="art-spark spark-two" />
          </div>
          <span className="eyebrow">A LITTLE CONTEXT. A CLEARER VIEW.</span>
          <h1>
            읽는 순간,
            <br />
            근거가 보이도록.
          </h1>
          <p className="welcome-description">
            페이지의 신뢰도를 한눈에 살펴보고,
            <br />
            문단마다 주장을 뒷받침하는 근거를 확인하세요.
          </p>
          <div className="welcome-action">
            <button
              className="primary-button"
              onClick={() => void analyze()}
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <ScanLine size={18} />
              )}
              <span>
                {loading
                  ? '페이지를 분석하고 있어요'
                  : status === 'error'
                    ? '다시 분석하기'
                    : '이 페이지 분석하기'}
              </span>
              {!loading && <ArrowRight size={18} />}
            </button>
            {loading ? (
              <div className="loading-message" role="status">
                <p>전체 신뢰도와 문단별 근거를 확인하고 있습니다.</p>
                <button className="text-button" onClick={cancel}>
                  취소
                </button>
              </div>
            ) : (
              <p className="action-caption">전체 신뢰도부터 문단 속 맥락까지</p>
            )}
            {error && (
              <div className="error-message" role="alert">
                <TriangleAlert size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
          <div className="welcome-features">
            <span>
              <ShieldCheck size={15} />
              페이지 신뢰도
            </span>
            <span>
              <Link2 size={15} />
              문단별 근거
            </span>
            <span>
              <ArrowDown size={15} />
              자연스러운 탐색
            </span>
          </div>
          <p className="welcome-footnote">
            더 많이 읽기보다, 더 분명하게 읽기.
          </p>
        </main>
      )}
    </div>
  )
}
