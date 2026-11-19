import { useCallback, useRef, useState, type KeyboardEvent } from 'react'

// Shared by the original reader and its deduction variant. Keep one scroll
// surface, page positions, active-page tracking and keyboard navigation aligned.
export function useReaderNavigation(count: number) {
  const readerRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<(HTMLElement | null)[]>([])
  const [page, setPage] = useState(0)

  const goTo = useCallback((index: number) => {
    const reader = readerRef.current
    const target = pagesRef.current[index]
    if (!reader || !target) return
    reader.scrollTo({
      top: target.offsetTop,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant' : 'smooth',
    })
  }, [])

  function onScroll() {
    const reader = readerRef.current
    if (!reader) return
    const line = reader.scrollTop + reader.clientHeight * 0.4
    let nextPage = 0
    pagesRef.current.forEach((element, index) => {
      if (element && element.offsetTop <= line) nextPage = index
    })
    setPage(nextPage)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const targets: Record<string, number> = {
      PageDown: Math.min(count, page + 1),
      PageUp: Math.max(0, page - 1),
      Home: 0,
      End: count,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    goTo(targets[event.key])
  }

  return { readerRef, pagesRef, page, goTo, onScroll, onKeyDown }
}
