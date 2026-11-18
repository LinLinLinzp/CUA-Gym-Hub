import { saveState } from './dataManager.js'

const pending = new Map()

export function saveWorkspaceState(app, state) {
  const originalFetch = window.fetch

  // Chromium keeps a keepalive request in its byte budget until its response is
  // consumed. Drain Harbor's acknowledgement and order writes for each session.
  window.fetch = (path, options) => {
    const send = () => originalFetch.call(window, path, options).then(async response => {
      await response.text()
      return response
    })
    const previous = pending.get(path)
    const request = previous ? previous.then(send, send) : send()
    pending.set(path, request)
    const clear = () => { if (pending.get(path) === request) pending.delete(path) }
    request.then(clear, clear)
    return request
  }

  try {
    saveState(app, state)
  } finally {
    window.fetch = originalFetch
  }
}
