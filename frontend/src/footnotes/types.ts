export type Note = {
  id: string; kind: 'condition' | 'scope' | 'unknown'; label: string;
  summary: string; detail: string; quote: string; sourceId: string;
}
export type Scenario = {
  id: string; tab: string; category: string; publisher: string; initials: string;
  title: string; lead: string; kicker: string; visualTitle: string; visualSub: string;
  sourceTitle: string; sourceId: string; sourceQuote: string; sourceMore: string;
  paragraphs: { title: string; body: string }[];
  facts: { label: string; value: string }[];
  comments: { id: string; author: string; text: string; time: string; noteId?: string }[];
  notes: Note[]; headlineNoteId?: string;
}
export type FootnotesDemo = { scenarios: Scenario[] }
