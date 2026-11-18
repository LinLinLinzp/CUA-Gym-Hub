import { getSessionId, loadState, saveState } from '../utils/dataManager.js'

const app = 'yahoo_mail'

function mailboxKey() {
  return app + ':current:' + (getSessionId() || '_default')
}

export function readPendingChanges() {
  return JSON.parse(sessionStorage.getItem(mailboxKey() + ':pending') || '[]')
}

export function writePendingChanges(changes) {
  const key = mailboxKey() + ':pending'
  if (changes.length) sessionStorage.setItem(key, JSON.stringify(changes))
  else sessionStorage.removeItem(key)
}

export function withMailboxLock(action) {
  return navigator.locks.request(mailboxKey(), action)
}

export function readMailbox(fallback) {
  const saved = localStorage.getItem(mailboxKey())
  return saved ? JSON.parse(saved) : fallback
}

export function loadMailbox(createInitialData) {
  return withMailboxLock(() => bootstrapMailbox(createInitialData))
}

async function bootstrapMailbox(createInitialData) {
  const fetch = window.fetch
  let baseline
  window.fetch = (url, options) => {
    const response = fetch.call(window, url, options)
    if (typeof url === 'string' && url.split('?')[0] === '/post' && options?.method === 'POST') baseline = response
    return response
  }
  try {
    const state = await loadState(app, createInitialData)
    if (baseline) await baseline
    return state
  } finally {
    window.fetch = fetch
  }
}

export function persistMailbox(state) {
  const key = mailboxKey()
  const previous = localStorage.getItem(key)
  const fetch = window.fetch
  // Finish the template's one state POST within the action. Pending full snapshots
  // can otherwise exceed the shared keepalive budget or be interrupted by a reload.
  window.fetch = (url, options) => {
    const request = new XMLHttpRequest()
    request.open(options.method, url, false)
    for (const [name, value] of Object.entries(options.headers || {})) request.setRequestHeader(name, value)
    request.send(options.body)
    if (request.status < 200 || request.status >= 300) throw new Error('Mailbox save failed')
    return Promise.resolve()
  }
  try {
    saveState(app, state)
  } catch (error) {
    if (previous === null) localStorage.removeItem(key)
    else localStorage.setItem(key, previous)
    throw error
  } finally {
    window.fetch = fetch
  }
}
