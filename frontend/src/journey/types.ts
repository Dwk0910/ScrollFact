export interface Passage {
  id: string
  title: string
  text: string
  highlight: string
  context: string
  question: string
}
export interface ReviewPoint {
  phrase: string
  title: string
  explanation: string
  sourceId: string
  missing?: boolean
}
export interface DraftExample {
  id: string
  label: string
  draft: string
  purpose: string
  points: ReviewPoint[]
  alternatives: { label: string; text: string }[]
}
export interface JourneyData {
  document: { title: string; publisher: string; url: string; date: string }
  passages: Passage[]
  conversation: { author: string; title: string; text: string }
  examples: DraftExample[]
}
