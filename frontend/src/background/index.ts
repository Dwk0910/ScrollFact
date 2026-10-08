import {
  isActiveParagraphMessage,
  isGetActiveParagraphMessage,
  MessageType,
  type ActiveParagraphPayload,
} from '../types'

const latestByTab = new Map<number, ActiveParagraphPayload>()

function configureSidePanel() {
  if (!chrome.sidePanel?.setPanelBehavior) return
  try {
    const pending = chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }) as
      | Promise<void>
      | undefined
    if (pending && typeof pending.catch === 'function') void pending.catch(() => undefined)
  } catch {
    // Some Chrome builds throw instead of returning a rejected promise.
  }
}

configureSidePanel()

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel()
})

chrome.runtime.onStartup.addListener(() => {
  configureSidePanel()
})

chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return
  chrome.tabs.sendMessage(tab.id, { type: MessageType.togglePanel }, () => {
    void chrome.runtime.lastError
  })
})

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isActiveParagraphMessage(message)) {
    const tabId = sender.tab?.id
    if (tabId != null) latestByTab.set(tabId, message.payload)
    return
  }

  if (isGetActiveParagraphMessage(message)) {
    sendResponse(latestByTab.get(message.tabId) ?? null)
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  latestByTab.delete(tabId)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') latestByTab.delete(tabId)
})
