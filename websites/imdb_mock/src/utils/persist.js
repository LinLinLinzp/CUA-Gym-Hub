import { loadState, saveState } from './dataManager.js'

let pending = null

function trackStatePosts() {
  const fetch = window.fetch

  window.fetch = (input, options) => {
    if (options?.method !== 'POST' || typeof input !== 'string' || (input !== '/post' && !input.startsWith('/post?'))) {
      return fetch.call(window, input, options)
    }

    // Drain each response so Chromium frees its keepalive budget before the next snapshot.
    const send = async () => {
      const response = await fetch.call(window, input, options)
      await response.arrayBuffer()
    }
    const request = pending ? pending.then(send, send) : send()
    pending = request
    const clear = () => { if (pending === request) pending = null }
    request.then(clear, clear)
    return request
  }
  return () => { window.fetch = fetch }
}

export async function loadAccountState(app, createInitialData) {
  const restoreFetch = trackStatePosts()
  try {
    const state = await loadState(app, createInitialData)
    // A late baseline can overwrite a mutation. Wait before displaying actionable routes.
    await pending?.catch(() => {})
    return state
  } finally {
    restoreFetch()
  }
}

export function persistState(app, state) {
  const restoreFetch = trackStatePosts()
  try {
    saveState(app, state)
  } finally {
    restoreFetch()
  }
}
