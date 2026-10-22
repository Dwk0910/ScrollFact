import { MessageType } from '../types'

chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return
  chrome.tabs.sendMessage(tab.id, { type: MessageType.togglePanel }, () => {
    void chrome.runtime.lastError
  })
})
