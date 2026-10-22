import type { CSSProperties } from 'react'
import type { TrustStatus } from '../../types'
import { trustLabels, trustTone } from '../trust'

interface Props {
  score: number
  status: TrustStatus
  compact?: boolean
}

export function TrustGauge({ score, status, compact = false }: Props) {
  return (
    <div
      className={`trust-gauge tone-${trustTone(status)} ${compact ? 'is-compact' : ''}`}
      role="meter"
      aria-label={compact ? '문단 신뢰도' : '페이지 전체 신뢰도'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-valuetext={`${score}점, ${trustLabels[status]}`}
      style={{ '--score-offset': 100 - score } as CSSProperties}
    >
      <div className="gauge-face">
        <svg viewBox="0 0 260 150" fill="none" aria-hidden="true">
          <path className="gauge-track" d="M 22 130 A 108 108 0 0 1 238 130" />
          <path
            className="gauge-fill"
            d="M 22 130 A 108 108 0 0 1 238 130"
            pathLength="100"
          />
        </svg>
        <div className="gauge-number">
          <strong>{score}</strong>
          <span>점</span>
        </div>
      </div>
      {!compact && (
        <div className="gauge-scale" aria-hidden="true">
          <span>0</span>
          <span>100</span>
        </div>
      )}
    </div>
  )
}
