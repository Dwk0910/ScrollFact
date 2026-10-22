export type TrustTone = 'high' | 'mid' | 'low'

export const trustToneLabel: Record<TrustTone, string> = {
  high: '높음',
  mid: '보통',
  low: '낮음',
}

export const trustToneClass: Record<TrustTone, string> = {
  high: 'bg-emerald-600',
  mid: 'bg-amber-500',
  low: 'bg-rose-600',
}

export function trustTone(score: number): TrustTone {
  if (score > 70) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}
