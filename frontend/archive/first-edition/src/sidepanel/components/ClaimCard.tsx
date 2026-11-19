import type { ParagraphAnalysis } from '../../types'
import { TrustScoreBar } from './TrustScoreBar'

interface ClaimCardProps {
  paragraphId: string
  index: number
  total: number
  excerpt: string
  analysis: ParagraphAnalysis
}

const badgeClass = {
  aligned: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  insufficient: 'bg-amber-50 text-amber-950 ring-amber-200',
  caution: 'bg-rose-50 text-rose-800 ring-rose-200',
} as const

export function ClaimCard({ paragraphId, index, total, excerpt, analysis }: ClaimCardProps) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-stone-500">
          문단 {index + 1}
          <span className="text-stone-300"> / {total}</span>
        </p>
        <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600">
          {paragraphId}
        </code>
      </div>

      <TrustScoreBar score={analysis.trustScore} />

      <h2 className="mt-4 text-xs font-medium tracking-wide text-stone-500">핵심 주장</h2>
      <p className="mt-1 text-sm leading-6 font-medium text-ink">{analysis.keyClaim}</p>

      <p
        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${badgeClass[analysis.credibility]}`}
      >
        {analysis.credibilityLabel}
      </p>

      <div className="mt-4 border-l-2 border-pine/30 pl-3">
        <p className="text-[10px] font-medium tracking-wide text-stone-400">페이지 발췌</p>
        <p className="mt-1 line-clamp-4 text-xs leading-5 text-stone-600">{excerpt}</p>
      </div>
    </article>
  )
}
