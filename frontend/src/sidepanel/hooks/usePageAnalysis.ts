import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isAnalysisResponse,
  isDocumentSnapshot,
  isRecord,
  MessageType,
  type AnalysisProgress,
  type AnalysisResponse,
  type AnalysisStatus,
  type AnalyzeDocument,
  type DocumentSnapshot,
} from '../../types'

export function usePageAnalysis(
  analyzeDocument: AnalyzeDocument,
  demo: boolean,
) {
  const inExtension =
    typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
  const tabRef = useRef<number | null>(null)
  const resultRef = useRef<AnalysisResponse | null>(null)
  const requestRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [savingHtml, setSavingHtml] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress>({
    phase: 'capturing',
  })
  const [status, setStatus] = useState<AnalysisStatus>('ready')
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sourceSection, setSourceSection] = useState<string | null>(null)

  const resolveTab = useCallback(async () => {
    if (tabRef.current !== null) return tabRef.current
    // An embedded panel belongs to its own tab, even when another tab becomes active.
    const context: unknown = await chrome.runtime.sendMessage({
      type: MessageType.getContext,
    })
    if (isRecord(context) && typeof context.tabId === 'number') {
      tabRef.current = context.tabId
    } else {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tab?.id === undefined) throw new Error('분석할 탭을 찾지 못했습니다.')
      tabRef.current = tab.id
    }
    return tabRef.current
  }, [])

  const savePageHtml = useCallback(async () => {
    setSavingHtml(true)
    setError(null)
    try {
      let html: string
      let title: string
      if (inExtension) {
        const tabId = await resolveTab()
        const response: unknown = await chrome.tabs.sendMessage(tabId, {
          type: MessageType.getPageHtml,
        })
        if (
          !isRecord(response) ||
          response.ok !== true ||
          !isRecord(response.payload) ||
          typeof response.payload.html !== 'string' ||
          typeof response.payload.title !== 'string'
        ) {
          throw new Error(
            '페이지 HTML을 가져오지 못했습니다. 원문을 새로고침해 주세요.',
          )
        }
        html = response.payload.html
        title = response.payload.title
      } else {
        html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`
        title = document.title
      }
      const filename =
        title
          .trim()
          .replace(/[\\/:*?"<>|]+/g, ' ')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80) || 'page'
      const url = URL.createObjectURL(
        new Blob([html], { type: 'text/html;charset=utf-8' }),
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${filename}.html`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(
        inExtension
          ? '현재 페이지 HTML을 저장했습니다.'
          : '미리보기 페이지 HTML을 저장했습니다.',
      )
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : 'HTML을 저장하지 못했습니다.',
      )
    } finally {
      setSavingHtml(false)
    }
  }, [inExtension, resolveTab])

  const clear = useCallback(() => {
    requestRef.current += 1
    abortRef.current?.abort()
    resultRef.current = null
    setResult(null)
    setSourceSection(null)
    setStatus('ready')
    setError(null)
  }, [])

  useEffect(() => {
    if (!inExtension)
      return () => {
        requestRef.current += 1
        abortRef.current?.abort()
      }
    const onMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
    ) => {
      if (!isRecord(message) || sender.tab?.id !== tabRef.current) return
      if (message.type === MessageType.documentChanged) {
        clear()
        setNotice('페이지가 변경되었습니다. 다시 분석해 주세요.')
      }
      if (
        message.type === MessageType.activeSectionChanged &&
        message.snapshotId === resultRef.current?.snapshotId &&
        typeof message.sectionId === 'string' &&
        resultRef.current?.sections.some((s) => s.id === message.sectionId)
      ) {
        setSourceSection(message.sectionId)
      }
    }
    const onUpdated = (tabId: number, change: chrome.tabs.OnUpdatedInfo) => {
      if (tabId === tabRef.current && change.status === 'loading') {
        clear()
        setNotice('페이지가 변경되었습니다. 다시 분석해 주세요.')
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      requestRef.current += 1
      abortRef.current?.abort()
      chrome.runtime.onMessage.removeListener(onMessage)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      if (tabRef.current !== null) {
        void chrome.tabs
          .sendMessage(tabRef.current, { type: MessageType.stopWatching })
          .catch(() => undefined)
      }
    }
  }, [clear, inExtension])

  const analyze = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const request = ++requestRef.current
    const isCurrent = () =>
      requestRef.current === request && !controller.signal.aborted
    resultRef.current = null
    setResult(null)
    setSourceSection(null)
    setError(null)
    setNotice(null)
    setProgress({ phase: 'capturing' })
    setStatus('loading')
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 10 * 60_000)
    try {
      let snapshot: DocumentSnapshot
      if (inExtension) {
        const tabId = await resolveTab()
        if (!isCurrent()) return
        const response: unknown = await chrome.tabs.sendMessage(tabId, {
          type: MessageType.captureDocument,
        })
        if (
          !isRecord(response) ||
          response.ok !== true ||
          !isDocumentSnapshot(response.snapshot)
        ) {
          throw new Error(
            isRecord(response) && typeof response.error === 'string'
              ? response.error
              : '페이지를 가져오지 못했습니다. 원문을 새로고침한 뒤 다시 시도해 주세요.',
          )
        }
        snapshot = response.snapshot
      } else {
        if (!demo)
          throw new Error(
            '실제 페이지 분석은 Chrome 확장 프로그램에서 실행해 주세요.',
          )
        snapshot = {
          snapshotId: crypto.randomUUID(),
          url: location.href,
          title: document.title,
          html: document.documentElement.outerHTML,
        }
      }
      if (!isCurrent()) return
      const response: unknown = await analyzeDocument(
        snapshot,
        controller.signal,
        (next) => {
          if (isCurrent()) setProgress(next)
        },
      )
      if (!isCurrent()) return
      if (!isAnalysisResponse(response))
        throw new Error('분석 결과의 형식이 올바르지 않습니다.')
      if (
        response.snapshotId !== snapshot.snapshotId ||
        response.document.url !== snapshot.url
      ) {
        throw new Error(
          '다른 페이지의 분석 결과가 도착했습니다. 다시 분석해 주세요.',
        )
      }
      if (inExtension && tabRef.current !== null) {
        const watched: unknown = await chrome.tabs.sendMessage(tabRef.current, {
          type: MessageType.watchSections,
          snapshotId: snapshot.snapshotId,
          targets: response.sections.map(({ id, selector }) => ({
            id,
            selector,
          })),
        })
        if (!isCurrent()) return
        if (!isRecord(watched) || watched.ok !== true) {
          throw new Error('분석 중 원문이 변경되었습니다. 다시 분석해 주세요.')
        }
        if (
          Array.isArray(watched.unmatchedIds) &&
          watched.unmatchedIds.length > 0
        ) {
          setNotice(
            `${watched.unmatchedIds.length}개 문단의 원문 위치를 찾지 못했습니다. 분석 내용은 아래에서 확인할 수 있습니다.`,
          )
        }
      }
      resultRef.current = response
      setResult(response)
      setStatus('done')
    } catch (caught) {
      if (requestRef.current !== request) return
      if (controller.signal.aborted && !timedOut) return
      setStatus('error')
      setError(
        timedOut
          ? '10분 안에 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : caught instanceof Error
            ? caught.message
            : '페이지를 분석하지 못했습니다.',
      )
    } finally {
      window.clearTimeout(timeout)
    }
  }, [analyzeDocument, demo, inExtension, resolveTab])

  const jumpToSource = useCallback(
    async (sectionId: string) => {
      if (!inExtension || tabRef.current === null || !resultRef.current) return
      try {
        const response: unknown = await chrome.tabs.sendMessage(
          tabRef.current,
          {
            type: MessageType.scrollToSection,
            snapshotId: resultRef.current.snapshotId,
            sectionId,
          },
        )
        if (!isRecord(response) || response.ok !== true)
          throw new Error('이 문단의 원문 위치를 찾지 못했습니다.')
        setNotice(null)
      } catch {
        setNotice(
          '이 문단의 원문 위치를 찾지 못했습니다. 페이지가 바뀌었다면 다시 분석해 주세요.',
        )
      }
    },
    [inExtension],
  )

  return {
    inExtension,
    savingHtml,
    savePageHtml,
    status,
    progress,
    result,
    error,
    notice,
    sourceSection,
    analyze,
    cancel: clear,
    jumpToSource,
  }
}
