import { useEffect, useRef, useState } from 'react'
import { createDiagnosticAnalyzer, type DiagnosticResult } from '../api/analyze'
import { isDocumentSnapshot, isRecord, MessageType, type AnalysisProgress } from '../types'

export function useUpload() {
  const tab = useRef<number | null>(null)
  const task = useRef<AbortController | null>(null)
  const current = useRef<DiagnosticResult | null>(null)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState<AnalysisProgress>({ phase: 'capturing' })
  const inExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)

  useEffect(() => {
    if (!inExtension) return
    const receive = (message: unknown, sender: chrome.runtime.MessageSender) => {
      if (sender.tab?.id !== tab.current || !isRecord(message)) return
      if (message.type === MessageType.documentChanged) {
        task.current?.abort(); task.current = null
        current.current = null; setResult(null); setBusy(false)
        setNotice('원문이 변경되었습니다. 현재 페이지를 다시 보내 주세요.')
      }
      if (message.type === MessageType.activeSectionChanged && message.snapshotId === current.current?.snapshotId) {
        const index = current.current?.passages.findIndex(p => p.id === message.sectionId) ?? -1
        if (index >= 0) setActive(index)
      }
    }
    chrome.runtime.onMessage.addListener(receive)
    return () => {
      task.current?.abort(); task.current = null
      chrome.runtime.onMessage.removeListener(receive)
      if (tab.current !== null) void chrome.tabs.sendMessage(tab.current, { type: MessageType.stopWatching }).catch(() => undefined)
    }
  }, [inExtension])

  function cancel() {
    task.current?.abort(); task.current = null; setBusy(false)
    setNotice('전송을 중단했습니다.')
  }

  async function upload(baseUrl: string) {
    if (!inExtension) { setNotice('설치한 확장 프로그램에서 페이지를 보내 주세요.'); return }
    task.current?.abort()
    const controller = new AbortController()
    task.current = controller
    const valid = () => task.current === controller && !controller.signal.aborted
    setBusy(true); setNotice(''); setResult(null); current.current = null; setActive(0)
    setProgress({ phase: 'capturing' })
    const timeout = window.setTimeout(() => controller.abort(new Error('서버 처리 시간이 10분을 넘었습니다. 다시 시도해 주세요.')), 600_000)
    try {
      const url = new URL(baseUrl)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw new Error('서버 주소는 인증정보·쿼리 없이 http 또는 https 주소로 입력해 주세요.')
      const context: unknown = await chrome.runtime.sendMessage({ type: MessageType.getContext })
      if (!valid()) return
      if (!isRecord(context) || typeof context.tabId !== 'number') throw new Error('이 패널의 원문 탭을 찾지 못했습니다. 원문에서 확장을 다시 열어 주세요.')
      tab.current = context.tabId
      const captured: unknown = await chrome.tabs.sendMessage(tab.current, { type: MessageType.captureDocument })
      if (!valid()) return
      if (!isRecord(captured) || captured.ok !== true || !isDocumentSnapshot(captured.snapshot))
        throw new Error(isRecord(captured) && typeof captured.error === 'string' ? captured.error : '원문을 가져오지 못했습니다. 페이지를 새로고침해 주세요.')
      const response = await createDiagnosticAnalyzer(url.href.replace(/\/$/, ''))(captured.snapshot, controller.signal, p => { if (valid()) setProgress(p) })
      if (!valid()) return
      const watched: unknown = await chrome.tabs.sendMessage(tab.current, {
        type: MessageType.watchSections, snapshotId: response.snapshotId,
        targets: response.passages.map(({ id, selector, text }) => ({ id, selector, text })),
      })
      if (!valid()) return
      if (!isRecord(watched) || watched.ok !== true) throw new Error('전송 중 원문이 변경되었습니다. 다시 보내 주세요.')
      if (Array.isArray(watched.unmatchedIds) && watched.unmatchedIds.length)
        setNotice(`${watched.unmatchedIds.length}개 문단은 원문과 연결되지 않았습니다. 원문 변경 여부를 확인해 주세요.`)
      current.current = response; setResult(response)
    } catch (error) {
      if (task.current === controller) setNotice(controller.signal.aborted
        ? String(controller.signal.reason?.message ?? '전송을 중단했습니다.')
        : error instanceof Error ? error.message : '서버에 연결하지 못했습니다.')
    } finally {
      window.clearTimeout(timeout)
      if (task.current === controller) { task.current = null; setBusy(false) }
    }
  }

  async function jump(index: number) {
    const data = current.current
    if (!data || tab.current === null || !data.passages[index]) return
    try {
      const response: unknown = await chrome.tabs.sendMessage(tab.current, {
        type: MessageType.scrollToSection, snapshotId: data.snapshotId, sectionId: data.passages[index].id,
      })
      if (current.current !== data) return
      if (!isRecord(response) || response.ok !== true) throw new Error('원문 위치를 찾지 못했습니다. 페이지를 다시 보내 주세요.')
      setActive(index)
    } catch (error) { setNotice(error instanceof Error ? error.message : '원문으로 이동하지 못했습니다.') }
  }
  return { result, busy, notice, active, progress, upload, cancel, jump, inExtension }
}
