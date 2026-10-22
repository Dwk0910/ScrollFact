import type { TrustStatus } from '../types'

export const trustLabels: Record<TrustStatus, string> = {
  high: '신뢰도 높음',
  good: '신뢰도 양호',
  caution: '주의 필요',
  low: '신뢰도 낮음',
  danger: '위험',
}

export function trustTone(status: TrustStatus): 'green' | 'amber' | 'red' {
  if (status === 'high' || status === 'good') return 'green'
  if (status === 'caution') return 'amber'
  return 'red'
}
