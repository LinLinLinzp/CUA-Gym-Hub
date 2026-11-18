import { saveState } from './dataManager.js'

let pendingWrite = Promise.resolve()

export function persistState(app, state) {
  const fetch = window.fetch
  // The shared helper starts its POST synchronously but leaves the response unread.
  // Drain each response before starting the next POST to release Chromium's keepalive budget.
  window.fetch = (input, options) => {
    const request = pendingWrite.then(async () => {
      const response = await fetch.call(window, input, options)
      await response.arrayBuffer()
      return response
    })
    pendingWrite = request.catch(() => {})
    return request
  }
  try {
    saveState(app, state)
  } finally {
    window.fetch = fetch
  }
}
