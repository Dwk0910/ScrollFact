interface NeighborSummaryProps {
  previous: string | null
  current: string | null
  next: string | null
}

const slots = [
  { key: 'previous', label: '이전 문단', empty: '이전 문단 없음' },
  { key: 'current', label: '지금 읽는 문단', empty: '현재 문단 없음' },
  { key: 'next', label: '다음 문단', empty: '다음 문단 없음' },
] as const

export function NeighborSummary({ previous, current, next }: NeighborSummaryProps) {
  const text = { previous, current, next }

  return (
    <section className="grid gap-2">
      {slots.map((slot) => {
        const line = text[slot.key]
        const isCurrent = slot.key === 'current'
        return (
          <article
            key={slot.key}
            className={`rounded-2xl px-4 py-3 ring-1 ${
              isCurrent ? 'bg-white ring-pine/30' : 'bg-white/70 ring-line'
            }`}
          >
            <h2 className="text-[11px] font-semibold tracking-wide text-stone-500">{slot.label}</h2>
            <p className={`mt-1 text-sm leading-6 ${line ? 'text-ink' : 'text-stone-400'}`}>
              {line ?? slot.empty}
            </p>
          </article>
        )
      })}
    </section>
  )
}
