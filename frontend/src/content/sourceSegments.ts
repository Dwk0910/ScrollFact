/** DOM paragraph boundaries, mirrored by HtmlParser. Never reparse outerHTML here. */
const blocks = new Set('address article aside blockquote div dl dt dd fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table tbody thead tr td th ul'.split(' '))
const excluded = 'script,style,noscript,nav,header,footer,aside,iframe,form,figure,figcaption,h1,h2,h3,h4,h5,h6,button,textarea,select,[hidden],[aria-hidden="true"],[data-scrollfact-root],#scrollfact-root,[contenteditable]:not([contenteditable="false"])'
export const normalizeSource = (text: string) => text.replace(/[\s\u00a0]+/g, ' ').trim()
export type SourceSegment = { range: Range; text: string }
export function sourceSegments(element: HTMLElement): SourceSegment[] {
  const nodes: Node[] = []
  function flatten(parent: Element) {
    for (const node of parent.childNodes) {
      if (node instanceof Text) nodes.push(node)
      else if (node instanceof HTMLElement) {
        if (blocks.has(node.localName) || node.localName === 'br' || node.matches(excluded) || (node.matches('span,a') && node.querySelector('img'))) nodes.push(node)
        else flatten(node)
      }
    }
  }
  flatten(element)
  const chunks: Node[][] = []
  let current: Node[] = [], breaks = 0
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.localName !== 'br') {
      chunks.push(current); current = []; breaks = 0
    } else if (node instanceof HTMLElement) {
      if (++breaks === 2) { chunks.push(current); current = [] }
      else if (breaks === 1) current.push(node)
    } else {
      current.push(node)
      if (normalizeSource(node.textContent || '')) breaks = 0
    }
  }
  chunks.push(current)
  return chunks.map(chunk => {
    const range = document.createRange()
    const textNodes = chunk.filter((n): n is Text => n instanceof Text)
    if (textNodes.length) { range.setStart(textNodes[0], 0); range.setEnd(textNodes.at(-1)!, textNodes.at(-1)!.length) }
    else { range.selectNodeContents(element); range.collapse(true) }
    return { range, text: normalizeSource(chunk.map(n => n instanceof Text ? n.data : ' ').join('')) }
  })
}
export function sourceText(element: HTMLElement): string {
  return normalizeSource(sourceSegments(element).map(s => s.text).join(' '))
}
