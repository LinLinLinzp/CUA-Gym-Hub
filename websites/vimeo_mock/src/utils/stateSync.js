import { getSessionId, loadState, mergeWithDefaults, saveState, withSid } from './dataManager.js'

const app = 'vimeo'

function sessionKeys() {
  const sid = getSessionId() || '_default'
  return { current: `${app}:current:${sid}`, pending: `${app}:pending:${sid}` }
}

export async function loadWorkspace(createInitialData) {
  const keys = sessionKeys()
  if (!sessionStorage.getItem(keys.pending)) return loadState(app, createInitialData)

  // A reload can interrupt the response even after Harbor has saved the change.
  const response = await fetch(withSid('/state'), { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not check the pending save')
  const { stored_state: stored } = await response.json()
  const state = mergeWithDefaults(createInitialData(), stored)
  localStorage.setItem(keys.current, JSON.stringify(state))
  sessionStorage.removeItem(keys.pending)
  return loadState(app, createInitialData)
}

export async function saveWorkspace(state) {
  const keys = sessionKeys()
  const previous = localStorage.getItem(keys.current)
  const request = window.fetch
  let sent
  let snapshot

  // The shared client discards the response. Capture it during its synchronous
  // call, and publish the cached snapshot only after Harbor acknowledges it.
  sessionStorage.setItem(keys.pending, '1')
  window.fetch = (url, options) => {
    sent = request(url, options)
    return sent
  }

  try {
    saveState(app, state)
    snapshot = localStorage.getItem(keys.current)
  } finally {
    window.fetch = request
    if (previous === null) localStorage.removeItem(keys.current)
    else localStorage.setItem(keys.current, previous)
  }
  const response = await sent
  const result = await response.json()
  if (!response.ok || !result.success) throw new Error('Harbor rejected the save')
  localStorage.setItem(keys.current, snapshot)
  sessionStorage.removeItem(keys.pending)
}
