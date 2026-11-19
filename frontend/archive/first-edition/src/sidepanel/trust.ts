export type TrustTone = 'high' | 'mid' | 'low'

export function trustTone(score: number): TrustTone {
  if (score > 70) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}
