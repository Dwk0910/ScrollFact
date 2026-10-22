import type { ParsedParagraph } from '../types'

function isSentenceBoundary(text: string, index: number): boolean {
  const mark = text[index]
  if (mark !== '.' && mark !== '!' && mark !== '?' && mark !== '。') return false
  const next = text[index + 1]
  const followedByGap = next === undefined || /\s/.test(next)
  const decimalPoint = mark === '.' && /\d/.test(text[index - 1] ?? '') && /\d/.test(next ?? '')
  return followedByGap && !decimalPoint
}

export function firstSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  for (let index = 0; index < trimmed.length; index += 1) {
    if (!isSentenceBoundary(trimmed, index)) continue
    return trimmed.slice(0, index + 1)
  }
  return trimmed.slice(0, 140)
}

export function buildReadingBrief(paragraphs: readonly ParsedParagraph[]): string[] {
  return paragraphs
    .slice(0, 5)
    .map((paragraph) => firstSentence(paragraph.text))
    .filter((line) => line.length > 0)
}
