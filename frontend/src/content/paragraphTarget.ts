// A paragraph separated by blank <br> lines shares its parent with other paragraphs.
// Keep the source DOM intact and anchor only its text range.
export class ParagraphTarget {
  readonly element: HTMLElement
  readonly range: Range
  constructor(element: HTMLElement, range: Range) { this.element = element; this.range = range }
  get isConnected() { return this.element.isConnected }
  get textContent() { return this.range.toString() }
  getClientRects() { return this.range.getClientRects() }
  getBoundingClientRect() { return this.range.getBoundingClientRect() }
  private active = false
  classList = {
    contains: (_name: string) => { void _name; return this.active },
    remove: (_name: string) => { void _name; this.setActive(false) },
    toggle: (_name: string, enabled: boolean) => { void _name; this.setActive(enabled) },
  }
  private overlay: HTMLDivElement | null = null
  private draw = () => {
    if (!this.overlay) return
    const rect = this.range.getBoundingClientRect()
    const parent = this.element.getBoundingClientRect()
    Object.assign(this.overlay.style, {
      left: `${parent.left - 8}px`, top: `${rect.top - 4}px`,
      width: `${parent.width + 16}px`, height: `${rect.height + 8}px`,
      display: this.isConnected && rect.height > 0 ? 'block' : 'none',
    })
  }
  private setActive(enabled: boolean) {
    if (enabled === this.active) { if (enabled) this.draw(); return }
    this.active = enabled
    if (enabled) {
      this.overlay = document.createElement('div')
      this.overlay.className = 'scrollfact-range-overlay'
      this.overlay.dataset.scrollfactRoot = 'true'
      this.overlay.setAttribute('aria-hidden', 'true')
      // Outside body: never enter article extraction or trigger its DOM watcher.
      document.documentElement.append(this.overlay)
      this.draw()
      window.addEventListener('scroll', this.draw, true)
      window.addEventListener('resize', this.draw)
    } else {
      this.overlay?.remove()
      this.overlay = null
      window.removeEventListener('scroll', this.draw, true)
      window.removeEventListener('resize', this.draw)
    }
  }
  scrollIntoView(options: ScrollIntoViewOptions) {
    window.scrollBy({ top: this.range.getBoundingClientRect().top - window.innerHeight * .45, behavior: options.behavior })
  }
}

export function paragraphRange(element: HTMLElement, index: number): Range | null {
  const breaks = Array.from(element.querySelectorAll('br'))
  const boundaries: { first: HTMLBRElement; last: HTMLBRElement }[] = []
  for (let i = 0; i < breaks.length; i++) {
    const first = breaks[i]
    let last = first
    while (i + 1 < breaks.length) {
      let next: ChildNode | null = last.nextSibling
      while (next?.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) next = next.nextSibling
      if (next !== breaks[i + 1]) break
      last = breaks[++i]
    }
    if (last !== first) boundaries.push({ first, last })
  }
  if (!boundaries.length || index < 0 || index > boundaries.length) return null
  const range = document.createRange()
  range.selectNodeContents(element)
  if (index > 0) range.setStartAfter(boundaries[index - 1].last)
  if (index < boundaries.length) range.setEndBefore(boundaries[index].first)
  return range
}
