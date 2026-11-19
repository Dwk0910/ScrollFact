import { mountContentController, type ContentHandler } from '../content/controller'
import { isRecord, MessageType } from '../types'

const channel = 'scrollfact-deduction-simulator'
export function mountSimulator() {
  let frame: HTMLIFrameElement | null = null
  let handler: ContentHandler | null = null
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || !frame?.isConnected || !isRecord(event.data) || event.data.channel !== channel || event.data.kind !== 'request') return
    const { id, message } = event.data
    handler?.(message, response => frame?.contentWindow?.postMessage({ channel, kind: 'response', id, response }, location.origin))
  }
  window.addEventListener('message', onMessage)
  const unmount = mountContentController({
    panelUrl: new URL('deductions.html?simulationPanel=1', location.href).href,
    shadowMode: 'open',
    minimumPanelWidth: 220,
    onFrameMount: value => { frame = value },
    emit: message => frame?.contentWindow?.postMessage({ channel, kind: 'event', message }, location.origin),
    listen: value => { handler = value; return () => { handler = null } },
    loadSettings: async () => ({ width: Math.min(440, window.innerWidth * .47) }),
    saveSettings: () => {},
  })
  return {
    toggle: () => handler?.({ type: MessageType.togglePanel }, () => {}),
    dispose: () => { window.removeEventListener('message', onMessage); unmount() },
  }
}

export function createPanelConnection(onEvent: (message: unknown) => void) {
  const extension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
  let tabId: number | null = null
  let sequence = 0
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: number }>()
  const receive = (event: MessageEvent) => {
    if (event.source !== window.parent || event.origin !== location.origin || !isRecord(event.data) || event.data.channel !== channel) return
    if (event.data.kind === 'event') onEvent(event.data.message)
    if (event.data.kind === 'response' && typeof event.data.id === 'number') {
      const job = pending.get(event.data.id)
      if (job) { clearTimeout(job.timer); pending.delete(event.data.id); job.resolve(event.data.response) }
    }
  }
  const receiveExtension = (message: unknown, sender: chrome.runtime.MessageSender) => {
    if (tabId !== null && sender.tab?.id === tabId) onEvent(message)
  }
  if (extension) chrome.runtime.onMessage.addListener(receiveExtension)
  else window.addEventListener('message', receive)
  return {
    async request(message: unknown): Promise<unknown> {
      if (extension) {
        if (tabId === null) {
          const context: unknown = await chrome.runtime.sendMessage({ type: MessageType.getContext })
          if (!isRecord(context) || typeof context.tabId !== 'number') throw new Error('원문 탭에서 확장 프로그램을 열어 주세요.')
          tabId = context.tabId
        }
        return chrome.tabs.sendMessage(tabId, message)
      }
      return new Promise((resolve, reject) => {
        const id = ++sequence
        const timer = window.setTimeout(() => { pending.delete(id); reject(new Error('원문 연결에 실패했습니다. 시뮬레이션 기사에서 다시 열어 주세요.')) }, 5000)
        pending.set(id, { resolve, reject, timer })
        window.parent.postMessage({ channel, kind: 'request', id, message }, location.origin)
      })
    },
    dispose() {
      if (extension) chrome.runtime.onMessage.removeListener(receiveExtension)
      else window.removeEventListener('message', receive)
      pending.forEach(job => { clearTimeout(job.timer); job.reject(new Error('연결 종료')) })
      pending.clear()
    },
  }
}
