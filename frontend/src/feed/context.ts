export type Post = {
  id: string; account: string; name: string; avatar: string; kind: 'game' | 'market' | 'photo';
  label: string; title: string; subtitle: string; captions: string[]; tags: string;
  likes: number; comments: { author: string; text: string }[]; example: string;
}
export type Response = {
  id: string; postId: string; topic: string; question: string; quote: string;
  title: string; summary: string; explanation: string; uncertainty?: string;
  suggestion: string; links: { title: string; url: string }[];
}
export type ReviewRule = { id: string; sentencePattern: string; reason: string }
export type ReviewFinding = { ruleId: string; evidence: string; reason: string; start: number; end: number }
export type Trail = {
  id: string; postId: string; commentAuthor: string; comment: string; sourceQuote: string; sourceAuthor: string; unknownQuestion: string;
  steps: { kind: 'question' | 'source' | 'explanation' | 'unknown'; label: string; title: string; body: string }[];
  editions: { name: string; device: string }[]; bridge: string;
  questionSuggestion: string; replySuggestion: string;
  links: { title: string; url: string }[];
}
export type FeedData = {
  focusPostId: string; trails: Trail[];
  posts: Post[]; responses: Response[]; reviewRules: ReviewRule[];
  reviewExamples: { label: string; draft: string; shouldReview: boolean }[];
}
export type CommentContext = { postId: string; caption: string; draft: string }

// A site adapter only needs to identify the editor, its owning post and its caption.
// This deliberately reads rendered DOM rather than the feed's React state.
export function readCommentContext(editor: HTMLTextAreaElement): CommentContext | null {
  const post = editor.closest<HTMLElement>('article[data-sf-post]')
  const caption = post?.querySelector<HTMLElement>('[data-sf-caption]')
  if (!post?.dataset.sfPost || !caption) return null
  return { postId: post.dataset.sfPost, caption: caption.textContent ?? '', draft: editor.value }
}

// Local example matching, NOT an AI classifier. Require a post match and a quote
// in its captured caption: never reuse another post's answer for the same question.
export function matchExample(context: CommentContext, responses: Response[]): Response | null {
  const draft = context.draft.trim()
  if (!draft || draft.length > 1000) return null
  return responses.find(response => response.postId === context.postId
    && context.caption.includes(response.quote)
    && new RegExp(response.topic, 'iu').test(draft)
    && new RegExp(response.question, 'iu').test(draft)) ?? null
}


// Deliberately narrow sentence examples, not a toxicity or political-opinion score.
// Whole-sentence matching avoids warning on a mere occurrence inside quoted criticism.
// A real evaluator must handle quotations, negation and conversation context.
export function reviewComment(draft: string, rules: ReviewRule[]): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  for (const sentence of draft.matchAll(/[^.!?。！？\n]+[.!?。！？]*/gu)) {
    const text = sentence[0].trim()
    if (!text) continue
    const rule = rules.find(item => new RegExp(item.sentencePattern, 'iu').test(text))
    if (!rule) continue
    const start = sentence.index + sentence[0].indexOf(text)
    findings.push({ ruleId: rule.id, evidence: text, reason: rule.reason, start, end: start + text.length })
  }
  return findings
}


export function findTrail(context: CommentContext, trails: Trail[]): Trail | null {
  return trails.find(trail => trail.postId === context.postId && context.caption.includes(trail.sourceQuote)) ?? null
}
