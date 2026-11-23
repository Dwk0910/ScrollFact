import { mountContentController } from './controller'

const key = 'scrollfactPanel'
mountContentController({
  panelUrl: chrome.runtime.getURL(import.meta.env.VITE_DEDUCTION_EXTENSION
    ? 'deductions.html?extension=1' : 'reader.html'),
  emit: message => { chrome.runtime.sendMessage(message, () => { void chrome.runtime.lastError }) },
  listen: handler => {
    const listener = (message: unknown, _sender: chrome.runtime.MessageSender, respond: (value: unknown) => void) => handler(message, respond)
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  },
  loadSettings: async () => (await chrome.storage.local.get(key))[key],
  saveSettings: value => { void chrome.storage.local.set({ [key]: value }) },
})
