import { loadState, saveState } from './dataManager.js'

let pendingWrite = Promise.resolve()

function orderStatePosts() {
  const fetch = window.fetch

  // The template returns before its POST finishes. Queue the baseline and
  // subsequent writes together, draining each response before the next POST.
  window.fetch = (input, init) => {
    if (typeof input !== 'string' || input.split('?')[0] !== '/post' || init?.method !== 'POST') {
      return fetch.call(window, input, init)
    }
    const write = pendingWrite.then(async () => {
      const response = await fetch.call(window, input, init)
      await response.arrayBuffer()
      return response
    })
    pendingWrite = write.catch(() => {})
    return write
  }
  return () => { window.fetch = fetch }
}

export async function loadAccountState(app, createInitialData) {
  const restoreFetch = orderStatePosts()
  try {
    return await loadState(app, createInitialData)
  } finally {
    restoreFetch()
  }
}

export function persistAccountState(app, state) {
  const restoreFetch = orderStatePosts()
  try {
    saveState(app, state)
  } finally {
    restoreFetch()
  }
}
