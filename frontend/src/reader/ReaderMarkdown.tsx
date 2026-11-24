import { Children, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReaderCheck } from '../api/analyze'

// Highlight only grounded quotes that are literally present in a rendered text node.
// Rewritten phrases are never assigned a category by fuzzy text matching.
function marked(children: ReactNode, checks: ReaderCheck[]): ReactNode {
  return Children.map(children, child => {
    if (typeof child !== 'string') return child
    const matches: { start: number; end: number; status: ReaderCheck['status'] }[] = []
    for (const check of checks) {
      if (!check.quote) continue
      let offset = 0, start: number
      while ((start = child.indexOf(check.quote, offset)) !== -1) {
        matches.push({ start, end: start + check.quote.length, status: check.status }); offset = start + check.quote.length
      }
    }
    const parts = []; let end = 0
    for (const match of matches.sort((a, b) => a.start - b.start || b.end - a.end)) {
      if (match.start < end) continue
      parts.push(child.slice(end, match.start), <mark key={match.start} className={`context-mark check-${match.status}`}>{child.slice(match.start, match.end)}</mark>); end = match.end
    }
    parts.push(child.slice(end)); return parts
  })
}
export default function ReaderMarkdown({ text, checks = [] }: { text: string; checks?: ReaderCheck[] }) {
  return <div className="reader-markdown"><Markdown skipHtml remarkPlugins={[remarkGfm]}
    disallowedElements={['img']}
    urlTransform={url => /^(https?:\/\/|#)/i.test(url) ? url : ''}
    components={{
      p: ({ children }) => <p>{marked(children, checks)}</p>,
      li: ({ children }) => <li>{marked(children, checks)}</li>,
      strong: ({ children }) => <strong>{marked(children, checks)}</strong>,
      em: ({ children }) => <em>{marked(children, checks)}</em>,
      a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
      table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
    }}>{text}</Markdown></div>
}
