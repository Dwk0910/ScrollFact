import { useState } from 'react'
import { googleRedirectUrl, requestAuthorizationCode } from '../auth/googleAuth'
import { getAnalysisForIndex } from '../mock/mockData'
import { ArticleBrief } from './components/ArticleBrief'
import { ArticleOverview } from './components/ArticleOverview'
import { BalancedViewCard } from './components/BalancedViewCard'
import { ClaimCard } from './components/ClaimCard'
import { Header } from './components/Header'
import { NeighborSummary } from './components/NeighborSummary'
import { usePageAnalysis } from './hooks/usePageAnalysis'
import { buildReadingBrief, firstSentence } from './summarize'

export function SidePanel() {
  const {
    inExtension,
    status,
    error,
    notice,
    active,
    paragraphs,
    pageTitle,
    analyze,
    showPrevious,
    showNext,
  } = usePageAnalysis()

  const analysis = active ? getAnalysisForIndex(active.index) : null
  const previous = active ? paragraphs[active.index - 1] : undefined
  const next = active ? paragraphs[active.index + 1] : undefined
  const brief = buildReadingBrief(paragraphs)
  const redirectUrl = googleRedirectUrl()
  const [authCode, setAuthCode] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setAuthError(null)
    try {
      const code = await requestAuthorizationCode()
      setAuthCode(code)
    } catch (caught) {
      setAuthCode(null)
      setAuthError(caught instanceof Error ? caught.message : 'Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="h-dvh w-full">
      <div className="flex h-full min-h-0 flex-col bg-paper text-ink">
        <Header
          status={status}
          onAnalyze={() => void analyze()}
          onGoogleLogin={() => void handleGoogleLogin()}
          googleLoading={googleLoading}
        />

        <main className="grid min-h-0 flex-1 grid-cols-1 min-[760px]:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-4">
            {redirectUrl ? (
              <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                <h2 className="text-xs font-semibold tracking-wide text-stone-500">리다이렉트 주소</h2>
                <input
                  readOnly
                  value={redirectUrl}
                  aria-label="리다이렉트 주소"
                  className="mt-2 w-full rounded-lg bg-stone-50 px-2 py-1.5 font-mono text-[11px] text-ink ring-1 ring-line"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </section>
            ) : null}

            {authCode ? (
              <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                <h2 className="text-xs font-semibold tracking-wide text-stone-500">authorization_code</h2>
                <p className="mt-2 break-all font-mono text-xs leading-5 text-ink">{authCode}</p>
              </section>
            ) : null}

            {authError ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800 ring-1 ring-rose-200">
                {authError}
              </p>
            ) : null}
            {pageTitle ? (
              <p className="truncate text-xs text-stone-500" title={pageTitle}>
                {pageTitle}
              </p>
            ) : null}

            {status === 'done' && inExtension ? (
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                스크롤 동기화 중
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800 ring-1 ring-rose-200">
                {error}
              </p>
            ) : null}

            {status === 'ready' ? (
              <section className="rounded-2xl bg-white px-4 py-5 text-sm leading-6 text-stone-600 ring-1 ring-line">
                분석 버튼을 누르면 읽기 전 요약과 위·아래 문단이 열리고, 화면 한가운데 문단에 맞춰 신뢰도 카드가 바뀝니다.
              </section>
            ) : null}

            {notice ? (
              <p className="rounded-xl bg-white px-3 py-2 text-sm leading-6 text-stone-600 ring-1 ring-line">
                {notice}
              </p>
            ) : null}

            {brief.length > 0 ? <ArticleBrief lines={brief} /> : null}

            {active ? (
              <NeighborSummary
                previous={previous ? firstSentence(previous.text) : null}
                current={firstSentence(active.text)}
                next={next ? firstSentence(next.text) : null}
              />
            ) : null}

            {active && analysis ? (
              <div key={active.paragraphId} className="flex flex-col gap-3 animate-rise">
                <ClaimCard
                  paragraphId={active.paragraphId}
                  index={active.index}
                  total={active.total}
                  excerpt={active.text}
                  analysis={analysis}
                />
                <BalancedViewCard stanceA={analysis.stanceA} stanceB={analysis.stanceB} />
              </div>
            ) : null}

            {!inExtension && status === 'done' ? (
              <div className="rounded-2xl bg-pine-soft px-3 py-3 ring-1 ring-pine/10">
                <p className="text-[11px] leading-5 text-pine">
                  브라우저 미리보기입니다. 확장 프로그램에서는 페이지 스크롤에 맞춰 문단이 바뀝니다.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={showPrevious}
                    className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-pine ring-1 ring-line"
                  >
                    이전 문단
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-pine ring-1 ring-line"
                  >
                    다음 문단
                  </button>
                </div>
              </div>
            ) : null}

            <p className="mt-auto pt-2 text-center text-[11px] leading-5 text-stone-400">
              백엔드 연결 전 모의 데이터입니다. 신뢰 점수, 대립 시각, 용어, 출처는 샘플이며 실제 팩트체크 결과가 아닙니다. 읽기 전 요약과 위·아래 문단은 페이지 문장에서 뽑았습니다.
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto border-t border-line px-4 py-4 min-[760px]:border-t-0 min-[760px]:border-l">
            {paragraphs.length > 0 ? (
              <ArticleOverview paragraphs={paragraphs} activeIndex={active?.index ?? null} />
            ) : (
              <section className="rounded-2xl bg-white px-4 py-5 text-sm leading-6 text-stone-600 ring-1 ring-line">
                분석이 끝나면 진행률, 신뢰도 분포, 핵심 주장, 용어, 출처가 여기에 표시됩니다.
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
