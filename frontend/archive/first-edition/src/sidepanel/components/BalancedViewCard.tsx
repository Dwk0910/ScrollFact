import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { StanceSummary } from '../../types'

interface BalancedViewCardProps {
  stanceA: StanceSummary
  stanceB: StanceSummary
}

type StanceId = 'A' | 'B'

const tabs: readonly { id: StanceId; label: string }[] = [
  { id: 'A', label: 'A 관점 (현재 글)' },
  { id: 'B', label: 'B 관점 (대립 시각)' },
]

export function BalancedViewCard({ stanceA, stanceB }: BalancedViewCardProps) {
  const [selected, setSelected] = useState<StanceId>('A')
  const stance = selected === 'A' ? stanceA : stanceB

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line">
      <h2 className="text-xs font-medium tracking-wide text-stone-500">균형 시각</h2>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1" role="tablist" aria-label="관점 전환">
        {tabs.map((tab) => {
          const isSelected = selected === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`stance-${tab.id}`}
              aria-selected={isSelected}
              aria-controls="stance-panel"
              onClick={() => setSelected(tab.id)}
              className={`rounded-lg px-2 py-2 text-[11px] leading-4 font-semibold transition ${
                isSelected ? 'bg-pine text-paper shadow-sm' : 'text-stone-500 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        key={selected}
        id="stance-panel"
        role="tabpanel"
        aria-labelledby={`stance-${selected}`}
        className="mt-3 animate-rise"
      >
        <div className="space-y-1.5">
          {stance.summary.map((line) => (
            <p key={line} className="text-sm leading-6 text-ink">
              {line}
            </p>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {stance.sources.map((source) => (
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
      </div>
    </section>
  )
}
