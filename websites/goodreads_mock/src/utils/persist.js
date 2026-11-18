import { saveState } from './dataManager.js'

let pending = null

export function persist(app, state) {
  // The shared template calls fetch synchronously and leaves its response unread.
  // Drain each response before sending the next snapshot to release Chromium's
  // keepalive budget and preserve edit order. The template still owns every request.
  const fetchState = window.fetch
  window.fetch = (url, options) => {
    const send = () => fetchState.call(window, url, options).then(async response => {
      await response.arrayBuffer()
      return response
    })
    const request = pending ? pending.then(send, send) : send()
    pending = request
    const clear = () => { if (pending === request) pending = null }
    request.then(clear, clear)
    return request
  }
  try {
    saveState(app, state)
  } finally {
    window.fetch = fetchState
  }
}
