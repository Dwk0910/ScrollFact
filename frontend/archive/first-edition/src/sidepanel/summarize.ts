import type { ParsedParagraph } from '../types'

export function firstSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  const end = trimmed.search(/[.!?。]/)
  if (end === -1) return trimmed.slice(0, 140)
  return trimmed.slice(0, end + 1)
}

export function buildReadingBrief(paragraphs: readonly ParsedParagraph[]): string[] {
  return paragraphs
    .slice(0, 5)
    .map((paragraph) => firstSentence(paragraph.text))
    .filter((line) => line.length > 0)
}
