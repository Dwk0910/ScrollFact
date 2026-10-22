import { isRecord, MessageType } from '../types'

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return
  chrome.tabs.sendMessage(tab.id, { type: MessageType.togglePanel }, () => {
    void chrome.runtime.lastError
  })
})

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    if (isRecord(message) && message.type === MessageType.getContext) {
      sendResponse({ tabId: sender.tab?.id ?? null })
    }
  },
)
