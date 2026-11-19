import { trustTone, type TrustTone } from '../trust'

interface TrustScoreBarProps {
  score: number
}

const fillClass: Record<TrustTone, string> = {
  high: 'bg-emerald-600',
  mid: 'bg-amber-500',
  low: 'bg-rose-600',
}

const label: Record<TrustTone, string> = {
  high: '높음',
  mid: '보통',
  low: '낮음',
}

export function TrustScoreBar({ score }: TrustScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const tone = trustTone(clamped)

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-stone-500">신뢰 점수</span>
        <span className="text-sm font-semibold text-ink tabular-nums">
          {clamped}
          <span className="ml-1 text-xs font-normal text-stone-400">/ 100 · {label[tone]}</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-stone-200"
        role="meter"
        aria-label="신뢰 점수"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped}점, ${label[tone]}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fillClass[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400 tabular-nums">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  )
}
