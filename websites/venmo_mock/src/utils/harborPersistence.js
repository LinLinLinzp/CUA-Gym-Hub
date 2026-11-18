import { getSessionId, saveState, withSid } from './dataManager.js'

const encoder = new TextEncoder()
let pending = Promise.resolve()

export function withSessionWrite(app, operation) {
  const key = `${app}:current:${getSessionId() || '_default'}`
  if (navigator.locks) return navigator.locks.request(key, operation)
  const result = pending.then(operation)
  pending = result.catch(() => {})
  return result
}

export async function readCurrentState(fallback) {
  const response = await fetch(withSid('/state'), { cache: 'no-store' })
  if (!response.ok) throw new Error('The workspace could not check its current state.')
  const { has_custom_state, stored_state } = await response.json()
  return has_custom_state ? stored_state : fallback
}

export async function saveAcknowledged(app, state) {
  const key = `${app}:current:${getSessionId() || '_default'}`
  const previous = localStorage.getItem(key)
  const transport = window.fetch
  let request
  let snapshot
  // The shared template starts the request synchronously but returns no promise.
  // Publish the cached snapshot only after the server acknowledges the write.
  window.fetch = (input, options) => {
    const keepalive = options.keepalive && encoder.encode(options.body).byteLength < 64 * 1024
    request = transport.call(window, input, { ...options, keepalive })
    return request
  }
  try {
    saveState(app, state)
    snapshot = localStorage.getItem(key)
  } finally {
    window.fetch = transport
    if (previous === null) localStorage.removeItem(key)
    else localStorage.setItem(key, previous)
  }
  const response = await request
  const status = await response.json()
  if (!response.ok || !status.success) throw new Error('The workspace could not save this change.')
  localStorage.setItem(key, snapshot)
}
