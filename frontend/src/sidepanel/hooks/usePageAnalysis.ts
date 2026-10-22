import { useCallback, useEffect, useRef, useState } from 'react'
import { mockAnalyses } from '../../mock/mockData'
import {
  isActiveParagraphMessage,
  isCurrentSuccessResponse,
  isErrorResponse,
  isPageHtmlSuccessResponse,
  isParseSuccessResponse,
  MessageType,
  type ActiveParagraphPayload,
  type AnalysisStatus,
  type ParsedParagraph,
} from '../../types'

function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.id === 'string'
}

function htmlFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'page'}.html`
}

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function previewParagraphs(): ParsedParagraph[] {
  return mockAnalyses.map((item, index) => ({
    id: `sf-p-${index}`,
    index,
    text: `${item.keyClaim} 로컬 미리보기에서는 이 문장을 페이지 발췌로 보여 줍니다.`,
  }))
}

function readParagraphs(value: unknown): ParsedParagraph[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const record = item as { id?: unknown; index?: unknown; text?: unknown }
    if (typeof record.id !== 'string' || typeof record.index !== 'number' || typeof record.text !== 'string') {
      return []
    }
    return [{ id: record.id, index: record.index, text: record.text }]
  })
}

function buildPreviewPayload(index: number): ActiveParagraphPayload {
  const total = mockAnalyses.length
  const safeIndex = ((index % total) + total) % total
  const item = mockAnalyses[safeIndex] ?? mockAnalyses[0]
  return {
    paragraphId: `sf-p-${safeIndex}`,
    index: safeIndex,
    text: `${item.keyClaim} 로컬 미리보기에서는 이 문장을 페이지 발췌로 보여 줍니다.`,
    url: 'https://example.com/scrollfact-preview',
    title: '로컬 미리보기',
    total,
  }
}

export function usePageAnalysis() {
  const inExtension = isExtensionContext()
  const tabIdRef = useRef<number | null>(null)
  const generationRef = useRef(0)
  const [status, setStatus] = useState<AnalysisStatus>('ready')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [active, setActive] = useState<ActiveParagraphPayload | null>(null)
  const [paragraphs, setParagraphs] = useState<ParsedParagraph[]>([])
  const [pageTitle, setPageTitle] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [savingHtml, setSavingHtml] = useState(false)

  const applyPayload = useCallback((payload: ActiveParagraphPayload) => {
    setActive(payload)
    setPageTitle(payload.title)
    setNotice(null)
    setError(null)
    setStatus('done')
  }, [])

  const showPreview = useCallback((index: number) => {
    const payload = buildPreviewPayload(index)
    setPreviewIndex(payload.index)
    setParagraphs(previewParagraphs())
    applyPayload(payload)
  }, [applyPayload])

  const analyze = useCallback(async () => {
    setStatus('loading')
    setError(null)
    setNotice(null)

    if (!inExtension) {
      await new Promise((resolve) => window.setTimeout(resolve, 350))
      showPreview(0)
      return
    }

    const generation = generationRef.current + 1
    generationRef.current = generation

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (generation !== generationRef.current) return
      if (tab?.id == null) {
        setStatus('error')
        setError('활성 탭을 찾지 못했습니다.')
        return
      }

      const tabId = tab.id
      tabIdRef.current = tabId
      const response: unknown = await chrome.tabs.sendMessage(tabId, {
        type: MessageType.requestParse,
      })
      if (generation !== generationRef.current || tabIdRef.current !== tabId) return

      if (isErrorResponse(response)) {
        setStatus('error')
        setError(response.error)
        return
      }

      if (!isParseSuccessResponse(response)) {
        setStatus('error')
        setError('페이지 분석 응답을 해석하지 못했습니다.')
        return
      }

      setPageTitle(response.payload.title)
      setParagraphs(response.payload.paragraphs)
      if (!response.payload.active) {
        setActive(null)
        setStatus('done')
        setNotice(
          response.payload.paragraphs.length > 0
            ? '문단은 찾았지만 아직 화면 가운데에 있는 문단이 없습니다.'
            : '이 페이지에서 본문 문단을 찾지 못했습니다.',
        )
        return
      }

      applyPayload(response.payload.active)
    } catch {
      if (generation !== generationRef.current) return
      setStatus('error')
      setError('이 탭을 분석할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')
    }
  }, [applyPayload, inExtension, showPreview])

  const savePageHtml = useCallback(async () => {
    setSavingHtml(true)
    setError(null)

    try {
      if (!inExtension) {
        downloadHtml(
          `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
          htmlFilename(document.title || 'scrollfact-preview'),
        )
        setNotice('미리보기 페이지의 HTML을 저장했습니다.')
        return
      }

      let tabId = tabIdRef.current
      if (tabId == null) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        tabId = tab?.id ?? null
        tabIdRef.current = tabId
      }
      if (tabId == null) {
        setError('활성 탭을 찾지 못했습니다.')
        return
      }

      const response: unknown = await chrome.tabs.sendMessage(tabId, {
        type: MessageType.getPageHtml,
      })

      if (isErrorResponse(response)) {
        setError(response.error)
        return
      }

      if (!isPageHtmlSuccessResponse(response)) {
        setError('페이지 HTML 응답을 해석하지 못했습니다.')
        return
      }

      downloadHtml(response.payload.html, htmlFilename(response.payload.title))
      setNotice('현재 페이지 HTML을 저장했습니다.')
    } catch {
      setError('HTML을 저장하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')
    } finally {
      setSavingHtml(false)
    }
  }, [inExtension])

  useEffect(() => {
    if (!inExtension) return

    let cancelled = false

    const resetView = () => {
      setActive(null)
      setParagraphs([])
      setPageTitle('')
      setStatus('ready')
      setError(null)
      setNotice(null)
    }

    const restoreFromTab = async (tabId: number, generation: number) => {
      try {
        const response: unknown = await chrome.tabs.sendMessage(tabId, {
          type: MessageType.getCurrent,
        })
        if (cancelled || generation !== generationRef.current || tabIdRef.current !== tabId) return
        if (!isCurrentSuccessResponse(response)) return
        const restored = readParagraphs(response.paragraphs)
        if (restored.length > 0) setParagraphs(restored)
        if (!response.payload) return
        applyPayload(response.payload)
      } catch {
        return
      }
    }

    const onMessage = (message: unknown, sender: chrome.runtime.MessageSender) => {
      if (!isActiveParagraphMessage(message)) return
      const hostTabId = tabIdRef.current
      if (hostTabId == null || sender.tab?.id !== hostTabId) return
      applyPayload(message.payload)
    }

    const onActivated = (info: chrome.tabs.OnActivatedInfo) => {
      const boundId = tabIdRef.current
      if (boundId == null || info.tabId === boundId) return

      const generationAtLookup = generationRef.current
      void chrome.tabs.get(boundId).then(
        (bound) => {
          if (cancelled || generationRef.current !== generationAtLookup || tabIdRef.current !== boundId) return
          if (bound.windowId == null || info.windowId !== bound.windowId) return

          const generation = generationRef.current + 1
          generationRef.current = generation
          tabIdRef.current = info.tabId
          resetView()
          void restoreFromTab(info.tabId, generation)
        },
        () => undefined,
      )
    }

    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.OnUpdatedInfo) => {
      if (updatedTabId !== tabIdRef.current || changeInfo.status !== 'loading') return
      generationRef.current += 1
      resetView()
    }

    chrome.runtime.onMessage.addListener(onMessage)
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)

    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (cancelled || tab?.id == null || tabIdRef.current != null) return
      tabIdRef.current = tab.id
      return restoreFromTab(tab.id, generationRef.current)
    })

    return () => {
      cancelled = true
      generationRef.current += 1
      chrome.runtime.onMessage.removeListener(onMessage)
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [applyPayload, inExtension])

  return {
    inExtension,
    status,
    error,
    notice,
    active,
    paragraphs,
    pageTitle,
    previewIndex,
    savingHtml,
    savePageHtml,
    analyze,
    showPrevious: () => showPreview(previewIndex - 1),
    showNext: () => showPreview(previewIndex + 1),
  }
}
