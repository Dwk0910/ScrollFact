import { useCallback, useEffect, useRef, useState } from 'react'
import { mockAnalyses } from '../../mock/mockData'
import {
  isActiveParagraphMessage,
  isActiveParagraphPayload,
  isCurrentSuccessResponse,
  isParseSuccessResponse,
  MessageType,
  type ActiveParagraphPayload,
  type AnalysisStatus,
  type ParsedParagraph,
} from '../../types'

function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.id === 'string'
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
  const [status, setStatus] = useState<AnalysisStatus>('ready')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [active, setActive] = useState<ActiveParagraphPayload | null>(null)
  const [paragraphs, setParagraphs] = useState<ParsedParagraph[]>([])
  const [pageTitle, setPageTitle] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)

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

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id == null) {
        setStatus('error')
        setError('활성 탭을 찾지 못했습니다.')
        return
      }

      tabIdRef.current = tab.id
      const response: unknown = await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.requestParse,
      })

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
        setNotice('이 페이지에서 본문 문단을 찾지 못했습니다.')
        return
      }

      applyPayload(response.payload.active)
    } catch {
      setStatus('error')
      setError('이 탭을 분석할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')
    }
  }, [applyPayload, inExtension, showPreview])

  useEffect(() => {
    if (!inExtension) return

    let cancelled = false

    const restoreFromTab = async (tabId: number, url?: string) => {
      try {
        const response: unknown = await chrome.tabs.sendMessage(tabId, {
          type: MessageType.getCurrent,
        })
        if (cancelled || !isCurrentSuccessResponse(response)) return
        const restored = readParagraphs(response.paragraphs)
        if (restored.length > 0) setParagraphs(restored)
        if (!response.payload) return
        applyPayload(response.payload)
        return
      } catch {
        const cached: unknown = await chrome.runtime.sendMessage({
          type: MessageType.getActiveParagraph,
          tabId,
        })
        if (cancelled || !isActiveParagraphPayload(cached)) return
        if (url && cached.url !== url) return
        applyPayload(cached)
      }
    }

    const onMessage = (message: unknown, sender: chrome.runtime.MessageSender) => {
      if (!isActiveParagraphMessage(message)) return
      const senderTabId = sender.tab?.id
      if (tabIdRef.current != null && senderTabId !== tabIdRef.current) return
      applyPayload(message.payload)
    }

    const onActivated = (info: chrome.tabs.OnActivatedInfo) => {
      tabIdRef.current = info.tabId
      setActive(null)
      setParagraphs([])
      setPageTitle('')
      setStatus('ready')
      setError(null)
      setNotice(null)
      void chrome.tabs.get(info.tabId).then((tab) => {
        if (cancelled) return
        return restoreFromTab(info.tabId, tab.url)
      })
    }

    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.OnUpdatedInfo) => {
      if (updatedTabId !== tabIdRef.current || changeInfo.status !== 'loading') return
      setActive(null)
      setParagraphs([])
      setPageTitle('')
      setStatus('ready')
      setError(null)
      setNotice(null)
    }

    chrome.runtime.onMessage.addListener(onMessage)
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)

    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (cancelled || tab?.id == null) return
      tabIdRef.current = tab.id
      return restoreFromTab(tab.id, tab.url)
    })

    return () => {
      cancelled = true
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
    analyze,
    showPrevious: () => showPreview(previewIndex - 1),
    showNext: () => showPreview(previewIndex + 1),
  }
}
