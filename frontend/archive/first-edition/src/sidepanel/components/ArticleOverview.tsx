import { ExternalLink } from 'lucide-react'
import { getAnalysisForIndex } from '../../mock/mockData'
import type { ParsedParagraph, SourceLink } from '../../types'
import { trustTone } from '../trust'

interface ArticleOverviewProps {
  paragraphs: readonly ParsedParagraph[]
  activeIndex: number | null
}

const toneLabel = {
  high: '높음',
  mid: '보통',
  low: '낮음',
} as const

const toneClass = {
  high: 'bg-emerald-600',
  mid: 'bg-amber-500',
  low: 'bg-rose-600',
} as const

function collectSources(count: number): SourceLink[] {
  const seen = new Set<string>()
  const links: SourceLink[] = []
  for (let index = 0; index < count; index += 1) {
    const analysis = getAnalysisForIndex(index)
    for (const source of [...analysis.stanceA.sources, ...analysis.stanceB.sources]) {
      if (seen.has(source.url)) continue
      seen.add(source.url)
      links.push(source)
    }
  }
  return links
}

export function ArticleOverview({ paragraphs, activeIndex }: ArticleOverviewProps) {
  const total = paragraphs.length
  const current = activeIndex == null ? 0 : activeIndex + 1
  const remaining = Math.max(0, total - current)
  const progress = total === 0 ? 0 : Math.round((current / total) * 100)
  const spread = { high: 0, mid: 0, low: 0 }
  for (let index = 0; index < total; index += 1) {
    spread[trustTone(getAnalysisForIndex(index).trustScore)] += 1
  }
  const sources = collectSources(total)
  const terms = activeIndex == null ? [] : getAnalysisForIndex(activeIndex).terms

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-line">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-stone-500">읽기 진행</h2>
          <p className="text-sm font-semibold text-ink tabular-nums">
            {current}
            <span className="font-normal text-stone-400"> / {total}</span>
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-pine transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-500">남은 문단 {remaining}개</p>
      </section>

      <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-line">
        <h2 className="text-xs font-semibold tracking-wide text-stone-500">신뢰도 분포</h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {(['high', 'mid', 'low'] as const).map((tone) => (
            <div key={tone} className="rounded-xl bg-stone-50 px-2 py-2">
              <dt className="text-[11px] text-stone-500">{toneLabel[tone]}</dt>
              <dd className="mt-1 text-lg font-semibold text-ink tabular-nums">{spread[tone]}</dd>
              <div className={`mx-auto mt-1 h-1 w-8 rounded-full ${toneClass[tone]}`} />
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-line">
        <h2 className="text-xs font-semibold tracking-wide text-stone-500">핵심 주장</h2>
        <ol className="mt-3 space-y-2">
          {paragraphs.map((paragraph) => {
            const analysis = getAnalysisForIndex(paragraph.index)
            const tone = trustTone(analysis.trustScore)
            const selected = paragraph.index === activeIndex
            return (
              <li
                key={paragraph.id}
                className={`rounded-xl px-3 py-2 ring-1 ${selected ? 'bg-pine-soft ring-pine/20' : 'ring-line'}`}
              >
                <p className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span>문단 {paragraph.index + 1}</span>
                  <span className="font-semibold text-ink tabular-nums">{analysis.trustScore}</span>
                </p>
                <p className="mt-1 text-sm leading-6 text-ink">{analysis.keyClaim}</p>
                <span className={`mt-1 inline-block h-1 w-8 rounded-full ${toneClass[tone]}`} />
              </li>
            )
          })}
        </ol>
      </section>

      <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-line">
        <h2 className="text-xs font-semibold tracking-wide text-stone-500">용어</h2>
        {terms.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-stone-400">이 문단의 용어 해설이 없습니다.</p>
        ) : (
          <dl className="mt-3 space-y-3">
            {terms.map((term) => (
              <div key={term.word}>
                <dt className="text-sm font-semibold text-pine">{term.word}</dt>
                <dd className="mt-0.5 text-sm leading-6 text-ink">{term.explanation}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-line">
        <h2 className="text-xs font-semibold tracking-wide text-stone-500">출처</h2>
        <ul className="mt-3 space-y-1.5">
          {sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-start gap-1 text-xs leading-5 text-pine underline-offset-2 hover:underline"
              >
                <span>{source.label}</span>
                <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
