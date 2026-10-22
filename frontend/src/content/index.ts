import {
  MessageType,
  type ActiveParagraphPayload,
  type PageHtmlSuccessResponse,
  type ParseSuccessResponse,
  type ParsedParagraph,
} from '../types'

const MIN_TEXT_LENGTH = 40
const STORAGE_KEY = 'scrollfactPanel'
const RAIL_WIDTH = 44
const MIN_PANEL_WIDTH = 320
const MAX_PANEL_RATIO = 0.7

let paragraphs: HTMLElement[] = []
let parsedParagraphs: ParsedParagraph[] = []
let activeId: string | null = null
let lastPayload: ActiveParagraphPayload | null = null
let stopWatching: (() => void) | null = null
let panelOffset = 0
let panelGeneration = 0
let detachPanelResize: (() => void) | null = null
const ratios = new Map<HTMLElement, number>()

interface SavedPanel {
  width: number
  collapsed: boolean
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isSkippable(element: HTMLElement): boolean {
  return Boolean(
    element.closest(
      'nav, footer, aside, header, [role="navigation"], [role="contentinfo"], [data-scrollfact-root]',
    ),
  )
}

function centerRootMargin(): string {
  return `-40% ${Math.max(0, panelOffset)}px -40% 0px`
}

function clampPanelWidth(px: number): number {
  const max = Math.max(MIN_PANEL_WIDTH, Math.round(window.innerWidth * MAX_PANEL_RATIO))
  return Math.min(max, Math.max(MIN_PANEL_WIDTH, Math.round(px)))
}

function readSavedPanel(value: unknown): SavedPanel | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as { width?: unknown; collapsed?: unknown }
  if (typeof record.width !== 'number' || typeof record.collapsed !== 'boolean') return null
  return { width: record.width, collapsed: record.collapsed }
}

function meaningfulParagraphs(nodes: HTMLElement[]): HTMLElement[] {
  return nodes.filter((element) => {
    if (isSkippable(element)) return false
    return normalizeText(element.textContent ?? '').length >= MIN_TEXT_LENGTH
  })
}

function collectBlocks(): HTMLElement[] {
  const scopes = [
    document.querySelector('article'),
    document.querySelector('main'),
    document.querySelector('[role="main"]'),
    document.body,
  ].filter((node): node is HTMLElement => node instanceof HTMLElement)

  for (const scope of scopes) {
    const paragraphsInScope = meaningfulParagraphs(Array.from(scope.querySelectorAll('p')))
    if (paragraphsInScope.length > 0) return paragraphsInScope
  }

  const article = document.querySelector('article')
  const root = article instanceof HTMLElement ? article : document.body
  return Array.from(root.children).filter((node): node is HTMLElement => {
    if (!(node instanceof HTMLElement) || isSkippable(node)) return false
    return normalizeText(node.textContent ?? '').length >= 80
  })
}

function assignIds(blocks: HTMLElement[]) {
  blocks.forEach((element, index) => {
    element.dataset.scrollfactId = `sf-p-${index}`
  })
}

function toParsedParagraph(element: HTMLElement, index: number): ParsedParagraph {
  return {
    id: element.dataset.scrollfactId ?? `sf-p-${index}`,
    index,
    text: normalizeText(element.textContent ?? '').slice(0, 600),
  }
}

function chooseActive(): HTMLElement | null {
  let best: HTMLElement | null = null
  let bestRatio = 0

  for (const element of paragraphs) {
    const ratio = ratios.get(element) ?? 0
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = element
    }
  }

  if (best) return best

  const viewportMid = window.innerHeight / 2
  let closest: HTMLElement | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const element of paragraphs) {
    const rect = element.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue
    const distance = Math.abs(rect.top + rect.height / 2 - viewportMid)
    if (distance < closestDistance) {
      closestDistance = distance
      closest = element
    }
  }

  return closest
}

function emit(payload: ActiveParagraphPayload) {
  lastPayload = payload
  chrome.runtime.sendMessage(
    { type: MessageType.activeParagraphChanged, payload },
    () => {
      void chrome.runtime.lastError
    },
  )
}

function publish(next: HTMLElement | null) {
  for (const element of paragraphs) {
    element.classList.toggle('scrollfact-active', element === next)
  }

  if (!next) return

  const paragraphId = next.dataset.scrollfactId
  if (!paragraphId || paragraphId === activeId) return

  activeId = paragraphId
  emit({
    paragraphId,
    index: paragraphs.indexOf(next),
    text: normalizeText(next.textContent ?? '').slice(0, 600),
    url: location.href,
    title: document.title,
    total: paragraphs.length,
  })
}

function startWatching(blocks: HTMLElement[]) {
  stopWatching?.()
  ratios.clear()

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement)) continue
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0)
      }
      publish(chooseActive())
    },
    {
      root: null,
      rootMargin: centerRootMargin(),
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    },
  )

  for (const element of blocks) observer.observe(element)

  let frame = 0
  const onViewportChange = () => {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      publish(chooseActive())
    })
  }

  window.addEventListener('scroll', onViewportChange, { passive: true })
  window.addEventListener('resize', onViewportChange)

  stopWatching = () => {
    observer.disconnect()
    window.removeEventListener('scroll', onViewportChange)
    window.removeEventListener('resize', onViewportChange)
    if (frame) window.cancelAnimationFrame(frame)
  }
}

function parsePage(): ParseSuccessResponse {
  document.querySelectorAll('.scrollfact-active').forEach((node) => {
    node.classList.remove('scrollfact-active')
  })

  const blocks = collectBlocks()
  assignIds(blocks)
  paragraphs = blocks
  parsedParagraphs = blocks.map(toParsedParagraph)
  activeId = null
  lastPayload = null
  startWatching(blocks)
  if (!lastPayload) publish(chooseActive())

  return {
    ok: true,
    payload: {
      url: location.href,
      title: document.title,
      paragraphs: parsedParagraphs,
      active: lastPayload,
    },
  }
}

function serializePageHtml(): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement
  clone.querySelector('#scrollfact-root')?.remove()
  clone.classList.remove('scrollfact-open')
  clone.style.removeProperty('--scrollfact-offset')
  clone.querySelectorAll('.scrollfact-active').forEach((node) => {
    node.classList.remove('scrollfact-active')
  })
  return `<!DOCTYPE html>\n${clone.outerHTML}`
}

function onMessage(
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) {
  if (typeof message !== 'object' || message === null || !('type' in message)) return

  const type = message.type
  if (type === MessageType.requestParse) {
    try {
      sendResponse(parsePage())
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : '문단을 분석하지 못했습니다.',
      } satisfies { ok: false; error: string })
    }
    return true
  }

  if (type === MessageType.getCurrent) {
    sendResponse({ ok: true, payload: lastPayload, paragraphs: parsedParagraphs })
    return true
  }

  if (type === MessageType.getPageHtml) {
    try {
      sendResponse({
        ok: true,
        payload: { url: location.href, title: document.title, html: serializePageHtml() },
      } satisfies PageHtmlSuccessResponse)
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : '페이지 HTML을 가져오지 못했습니다.',
      } satisfies { ok: false; error: string })
    }
    return true
  }

  if (type === MessageType.togglePanel) {
    void togglePanel()
    return undefined
  }

  return undefined
}

function setPageOffset(offset: number, refreshWatch: boolean) {
  panelOffset = offset
  document.documentElement.style.setProperty('--scrollfact-offset', `${offset}px`)
  document.documentElement.classList.toggle('scrollfact-open', offset > 0)
  if (refreshWatch && paragraphs.length > 0) startWatching(paragraphs)
}

function closePanel() {
  panelGeneration += 1
  detachPanelResize?.()
  detachPanelResize = null
  document.getElementById('scrollfact-root')?.remove()
  setPageOffset(0, true)
}

async function openPanel() {
  if (document.getElementById('scrollfact-root')) return
  const generation = panelGeneration + 1
  panelGeneration = generation

  const stored = await chrome.storage.local.get(STORAGE_KEY)
  if (generation !== panelGeneration || document.getElementById('scrollfact-root')) return
  const saved = readSavedPanel(stored[STORAGE_KEY])
  let width = clampPanelWidth(saved?.width ?? window.innerWidth * 0.5)
  let collapsed = saved?.collapsed ?? false

  const root = document.createElement('div')
  root.id = 'scrollfact-root'
  root.dataset.scrollfactRoot = 'true'

  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'scrollfact-handle'
  handle.setAttribute('aria-label', '패널 너비 조절')

  const collapse = document.createElement('button')
  collapse.type = 'button'
  collapse.className = 'scrollfact-collapse'
  collapse.textContent = '접기'

  const frame = document.createElement('iframe')
  frame.className = 'scrollfact-frame'
  frame.title = 'ScrollFact'
  frame.src = chrome.runtime.getURL('src/sidepanel/index.html')

  const expand = document.createElement('button')
  expand.type = 'button'
  expand.className = 'scrollfact-expand'
  expand.textContent = 'ScrollFact'

  root.append(handle, collapse, frame, expand)
  document.documentElement.append(root)

  const persist = () => {
    const next: SavedPanel = { width, collapsed }
    void chrome.storage.local.set({ [STORAGE_KEY]: next })
  }

  const apply = (refreshWatch: boolean) => {
    root.classList.toggle('scrollfact-collapsed', collapsed)
    collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
    const offset = collapsed ? RAIL_WIDTH : width
    root.style.width = `${offset}px`
    setPageOffset(offset, refreshWatch)
  }

  collapse.addEventListener('click', () => {
    collapsed = true
    apply(true)
    persist()
  })

  expand.addEventListener('click', () => {
    collapsed = false
    width = clampPanelWidth(width)
    apply(true)
    persist()
  })

  handle.addEventListener('pointerdown', (event) => {
    if (collapsed) return
    event.preventDefault()
    handle.setPointerCapture(event.pointerId)
    frame.style.pointerEvents = 'none'

    const onMove = (move: PointerEvent) => {
      width = clampPanelWidth(window.innerWidth - move.clientX)
      apply(false)
    }
    const onUp = () => {
      frame.style.pointerEvents = ''
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      apply(true)
      persist()
    }

    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
  })

  const onResize = () => {
    if (!document.getElementById('scrollfact-root')) return
    width = clampPanelWidth(width)
    apply(false)
  }
  window.addEventListener('resize', onResize)
  detachPanelResize = () => window.removeEventListener('resize', onResize)

  apply(true)
}

function togglePanel() {
  if (document.getElementById('scrollfact-root')) closePanel()
  else void openPanel()
}

if (document.documentElement.dataset.scrollfactBound !== 'true') {
  document.documentElement.dataset.scrollfactBound = 'true'
  chrome.runtime.onMessage.addListener(onMessage)
}
