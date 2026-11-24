import type { ReaderResult } from '../api/analyze'

// A comment contributes once to the gauge. Never turn an omitted classification
// into an inferred position or silently remove it from the denominator.
export function opinionGroups(result: ReaderResult | null): ReaderResult['perspectives'] {
  if (!result) return []
  if (!result.comments?.length) return result.perspectives
  const comments = new Map(result.comments.map(comment => [comment.id, comment]))
  const assigned = new Set<string>()
  const groups = result.perspectives.map(group => ({
    ...group,
    entries: group.entries.filter(entry => {
      if (!comments.has(entry.blockId) || assigned.has(entry.blockId)) return false
      assigned.add(entry.blockId)
      return true
    }),
  })).filter(group => group.entries.length > 0)
  const missing = result.comments.filter(comment => !assigned.has(comment.id))
  if (missing.length) groups.push({
    label: '관점 분류 누락',
    entries: missing.map(comment => ({
      blockId: comment.id,
      quote: comment.text,
      reason: 'AI가 이 댓글의 관점을 분류하지 않았어요. 입장을 임의로 정하지 않고 원문을 남겨 두었어요. 다시 분석하면 새 분류 지침이 적용돼요.',
    })),
  })
  return groups
}
