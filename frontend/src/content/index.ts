import {
  isRecord,
  MAX_HTML_BYTES,
  MessageType,
  type DocumentSnapshot,
} from '../types'

const STORAGE_KEY = 'scrollfactPanel'
let snapshot: { snapshotId: string; url: string } | null = null
let stopWatch: (() => void) | null = null
let navigationTimer: number | undefined
let panelGeneration = 0
let panelOffset = 0
let detachPanel: (() => void) | null = null
let activeId: string | null = null
let targets = new Map<string, HTMLElement>()

function emit(message: unknown) {
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError
  })
}

function clearWatch() {
  stopWatch?.()
  stopWatch = null
  for (const element of targets.values())
    element.classList.remove('scrollfact-active')
  targets = new Map()
  activeId = null
}

function resetSnapshot() {
  clearWatch()
  window.clearInterval(navigationTimer)
  navigationTimer = undefined
  snapshot = null
}

function checkLocation() {
  if (!snapshot || snapshot.url === location.href) return
  resetSnapshot()
  emit({ type: MessageType.documentChanged })
}

function captureDocument(): DocumentSnapshot {
  resetSnapshot()
  const html = document.documentElement.outerHTML
  if (new Blob([html]).size > MAX_HTML_BYTES)
    throw new Error('페이지 HTML이 20 MiB를 초과해 분석할 수 없습니다.')
  snapshot = { snapshotId: crypto.randomUUID(), url: location.href }
  navigationTimer = window.setInterval(checkLocation, 500)
  return {
    ...snapshot,
    title: document.title,
    html,
  }
}

function matchElement(selector: string): HTMLElement | null {
  try {
    const matches = document.querySelectorAll(selector)
    if (matches.length !== 1) return null
    const element = matches[0]
    if (
      !(element instanceof HTMLElement) ||
      element.closest('[data-scrollfact-root]') ||
      ['HTML', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(
        element.tagName,
      )
    )
      return null
    return element
  } catch {
    return null
  }
}

function watchSections(value: unknown, snapshotId: unknown) {
  checkLocation()
  if (!snapshot || snapshot.snapshotId !== snapshotId || !Array.isArray(value))
    return { ok: false }
  const specs: { id: string; selector: string }[] = []
  const ids = new Set<string>()
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.selector !== 'string' ||
      !item.id ||
      !item.selector ||
      ids.has(item.id)
    )
      return { ok: false }
    ids.add(item.id)
    specs.push({ id: item.id, selector: item.selector })
  }
  clearWatch()
  const unmatchedIds: string[] = []
  const originalText = new Map<string, string>()
  const matchedElements = new Set<HTMLElement>()
  for (const spec of specs) {
    const element = matchElement(spec.selector)
    if (!element || matchedElements.has(element)) {
      unmatchedIds.push(spec.id)
      continue
    }
    matchedElements.add(element)
    targets.set(spec.id, element)
    originalText.set(spec.id, element.textContent ?? '')
  }

  let frame = 0
  let mutationTimer: number | undefined
  const updateActive = () => {
    frame = 0
    checkLocation()
    if (!snapshot) return
    const middle = window.innerHeight * 0.45
    let bestId: string | null = null
    let bestDistance = Infinity
    for (const [id, element] of targets) {
      if (
        !element.isConnected ||
        !element.getClientRects().length ||
        getComputedStyle(element).visibility === 'hidden'
      )
        continue
      const rect = element.getBoundingClientRect()
      if (
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight ||
        rect.right <= 0 ||
        rect.left >= window.innerWidth - panelOffset
      )
        continue
      // Distance to the visible paragraph's interval, with its midpoint as a tiebreaker.
      const distance =
        Math.max(rect.top - middle, middle - rect.bottom, 0) * 1000 +
        Math.abs((rect.top + rect.bottom) / 2 - middle)
      if (distance < bestDistance) {
        bestDistance = distance
        bestId = id
      }
    }
    if (bestId === activeId) return
    activeId = bestId
    for (const [id, element] of targets)
      element.classList.toggle('scrollfact-active', id === bestId)
    if (bestId)
      emit({
        type: MessageType.activeSectionChanged,
        snapshotId: snapshot.snapshotId,
        sectionId: bestId,
      })
  }
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(updateActive)
  }
  const observer = new MutationObserver(() => {
    window.clearTimeout(mutationTimer)
    mutationTimer = window.setTimeout(() => {
      checkLocation()
      if (!snapshot) return
      for (const spec of specs) {
        if (!originalText.has(spec.id)) continue
        const element = matchElement(spec.selector)
        const previous = targets.get(spec.id)
        if (element && element.textContent !== originalText.get(spec.id)) {
          resetSnapshot()
          emit({ type: MessageType.documentChanged })
          return
        }
        if (previous !== element) {
          previous?.classList.remove('scrollfact-active')
          if (element) targets.set(spec.id, element)
          else targets.delete(spec.id)
          activeId = null
        }
      }
      schedule()
    }, 150)
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
  window.addEventListener('scroll', schedule, { capture: true, passive: true })
  window.addEventListener('resize', schedule)
  window.addEventListener('popstate', checkLocation)
  window.addEventListener('hashchange', checkLocation)
  stopWatch = () => {
    observer.disconnect()
    window.clearTimeout(mutationTimer)
    window.cancelAnimationFrame(frame)
    window.removeEventListener('scroll', schedule, true)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('popstate', checkLocation)
    window.removeEventListener('hashchange', checkLocation)
  }
  // Do not jump past the overall gauge until the reader actually scrolls the source.
  return { ok: true, unmatchedIds }
}

function setPageOffset(width: number) {
  panelOffset = width
  document.documentElement.style.setProperty(
    '--scrollfact-offset',
    `${width}px`,
  )
  document.documentElement.classList.toggle('scrollfact-open', width > 0)
}

function closePanel() {
  panelGeneration += 1
  detachPanel?.()
  detachPanel = null
  document.getElementById('scrollfact-root')?.remove()
  setPageOffset(0)
  resetSnapshot()
}

function clampWidth(width: number) {
  const min = Math.min(320, Math.max(200, window.innerWidth - 48))
  const max = Math.max(min, Math.round(window.innerWidth * 0.7))
  return Math.min(max, Math.max(min, width))
}

async function openPanel() {
  if (document.getElementById('scrollfact-root')) return
  const generation = ++panelGeneration
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  if (
    generation !== panelGeneration ||
    document.getElementById('scrollfact-root')
  )
    return
  const saved: unknown = stored[STORAGE_KEY]
  let width = clampWidth(
    isRecord(saved) &&
      typeof saved.width === 'number' &&
      Number.isFinite(saved.width)
      ? saved.width
      : 440,
  )
  let collapsed = false
  const root = document.createElement('div')
  root.id = 'scrollfact-root'
  root.dataset.scrollfactRoot = 'true'
  const shadow = root.attachShadow({ mode: 'closed' })
  shadow.innerHTML = `<style>
    :host { all: initial; position: fixed !important; inset: 0 0 0 auto !important; height: 100dvh !important; z-index: 2147483646 !important; background: #f8faf8 !important; box-shadow: -8px 0 30px #2034280c !important; }
    .shell { display: flex; height: 100%; width: 100%; font-family: sans-serif; }
    .handle { width: 7px; flex-shrink: 0; border: 0; border-left: 1px solid #dfe7db; background: #edf2e9; cursor: ew-resize; touch-action: none; padding: 0; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .tools { height: 25px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; gap: 4px; border-bottom: 1px solid #e2e9df; background: #f2f6ef; padding: 0 8px; }
    .tools button { border: 0; background: transparent; color: #6f846e; padding: 2px 6px; font: 11px sans-serif; cursor: pointer; }
    iframe { flex: 1; min-height: 0; width: 100%; border: 0; }
    .expand { display: none; width: 44px; height: 100%; border: 0; background: #285f4d; color: #fff; writing-mode: vertical-rl; font: 600 12px sans-serif; letter-spacing: 2px; cursor: pointer; }
    :host(.collapsed) .body, :host(.collapsed) .handle { display: none; }
    :host(.collapsed) .expand { display: block; }
    button:focus-visible { outline: 2px solid #288563; outline-offset: -2px; }
  </style><div class="shell"><button class="handle" aria-label="패널 너비 조절. 좌우 방향키로 조절할 수 있습니다."></button><div class="body"><div class="tools"><button class="collapse" aria-label="패널 접기">접기 −</button><button class="close" aria-label="패널 닫기">닫기 ×</button></div><iframe title="ScrollFact 분석 패널"></iframe></div><button class="expand" aria-label="ScrollFact 패널 펼치기">SCROLLFACT</button></div>`
  const frame = shadow.querySelector('iframe')!
  frame.src = chrome.runtime.getURL('src/sidepanel/index.html')
  const handle = shadow.querySelector<HTMLButtonElement>('.handle')!
  const persist = () => {
    void chrome.storage.local.set({ [STORAGE_KEY]: { width } })
  }
  const apply = () => {
    root.classList.toggle('collapsed', collapsed)
    root.style.setProperty('width', `${collapsed ? 44 : width}px`, 'important')
    setPageOffset(collapsed ? 44 : width)
  }
  shadow.querySelector('.collapse')!.addEventListener('click', () => {
    collapsed = true
    apply()
  })
  shadow.querySelector('.expand')!.addEventListener('click', () => {
    collapsed = false
    width = clampWidth(width)
    apply()
  })
  shadow.querySelector('.close')!.addEventListener('click', closePanel)
  let dragging = false
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    dragging = true
    handle.setPointerCapture(event.pointerId)
    frame.style.pointerEvents = 'none'
  })
  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return
    width = clampWidth(window.innerWidth - event.clientX)
    apply()
  })
  const stopDrag = () => {
    dragging = false
    frame.style.pointerEvents = ''
    persist()
  }
  handle.addEventListener('pointerup', stopDrag)
  handle.addEventListener('pointercancel', stopDrag)
  handle.addEventListener('lostpointercapture', stopDrag)
  handle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    width = clampWidth(width + (event.key === 'ArrowLeft' ? 24 : -24))
    apply()
    persist()
  })
  const onResize = () => {
    width = clampWidth(width)
    apply()
  }
  window.addEventListener('resize', onResize)
  detachPanel = () => window.removeEventListener('resize', onResize)
  document.documentElement.append(root)
  apply()
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (!isRecord(message)) return
    if (message.type === MessageType.togglePanel) {
      if (document.getElementById('scrollfact-root')) closePanel()
      else void openPanel()
    }
    if (message.type === MessageType.captureDocument) {
      try {
        sendResponse({ ok: true, snapshot: captureDocument() })
      } catch (error) {
        sendResponse({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : '페이지를 가져오지 못했습니다.',
        })
      }
    }
    if (message.type === MessageType.watchSections)
      sendResponse(watchSections(message.targets, message.snapshotId))
    if (message.type === MessageType.stopWatching) {
      resetSnapshot()
      sendResponse({ ok: true })
    }
    if (message.type === MessageType.scrollToSection) {
      checkLocation()
      const element =
        typeof message.sectionId === 'string'
          ? targets.get(message.sectionId)
          : null
      if (
        !snapshot ||
        snapshot.snapshotId !== message.snapshotId ||
        !element?.isConnected
      ) {
        sendResponse({ ok: false })
        return
      }
      element.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
      sendResponse({ ok: true })
    }
  },
)
