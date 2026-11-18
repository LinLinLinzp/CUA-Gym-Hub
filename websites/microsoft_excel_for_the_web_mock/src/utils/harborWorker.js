import {createInitialData} from '../data/seed.js'
import {loadState, mergeWithDefaults, saveState} from './dataManager.js'

const cache = new Map()
const session = new Map()
const storage = map => ({
  getItem: key => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value),
})
self.window = {location: self.location}
self.localStorage = storage(cache)
self.sessionStorage = storage(session)

// Route requests through the page so Harbor can observe them.
const transports = new Map()
let transportSequence = 0
function fetchResponse(path, options) {
  return new Promise((resolve, reject) => {
    const id = ++transportSequence
    transports.set(id, {resolve, reject})
    self.postMessage({id, transport: {path, options}})
  }).then(({ok, status, body}) => ({ok, status, json: async () => body}))
}
let postResponse
self.fetch = (url, options) => {
  const response = fetchResponse(url, options)
  if (options?.method === 'POST') postResponse = response
  return response
}

function openDatabase(app) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(app + '-harbor', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('sessions')
    request.onsuccess = () => resolve(request.result)
    request.onerror = request.onblocked = () => reject(request.error || new Error('Storage is unavailable.'))
  })
}

let db
let journalKey
let statePath
let lockName
let pending
let revision = 0
let base = null
let submitted = null
function sessionRecord(key, record) {
  if (!db) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sessions', record === undefined ? 'readonly' : 'readwrite')
    const sessions = transaction.objectStore('sessions')
    const request = record === undefined ? sessions.get(key) : record === null ? sessions.delete(key) : sessions.put(record, key)
    transaction.oncomplete = () => resolve(request.result)
    transaction.onabort = () => reject(transaction.error)
  })
}
function checkpoint() {
  return sessionRecord(journalKey, pending && {pending, base, submitted}).catch(() => {})
}

async function acknowledgePost() {
  const response = await postResponse
  if (response && !response.ok) throw new Error('Excel storage returned HTTP ' + response.status + '.')
}

async function readServerState() {
  const response = await fetchResponse(statePath, {cache: 'no-store'})
  if (!response.ok) throw new Error('Excel storage is unavailable.')
  const data = await response.json()
  return data.has_custom_state ? data.stored_state : null
}

function withSessionLock(action) {
  return self.navigator.locks ? self.navigator.locks.request(lockName, action) : action()
}

async function load({app, sid, tabId, previouslyLoaded, cached}) {
  const key = sid || '_default'
  journalKey = key + ':' + tabId
  statePath = '/state' + (sid ? '?sid=' + encodeURIComponent(sid) : '')
  if (sid) session.set('mock_sid', sid)
  db ??= await openDatabase(app).catch(() => null)
  const [initialized, recovery] = await Promise.all([
    sessionRecord(key).catch(() => null),
    sessionRecord(journalKey).catch(() => null),
  ])
  const adapterKey = app + ':current:' + key
  let snapshot
  if (recovery?.pending || initialized?.pending) {
    snapshot = recovery?.pending?.state ?? initialized?.pending
    pending = {state: snapshot, revision: ++revision}
    base = recovery ? recovery.base : cached
    submitted = recovery?.submitted ?? null
    if (!recovery && db) {
      await sessionRecord(journalKey, {pending, base, submitted})
      await sessionRecord(key, {})
    }
  } else if (initialized || previouslyLoaded) {
    try {
      const server = await readServerState()
      if (server) {
        base = JSON.stringify(server)
        snapshot = mergeWithDefaults(createInitialData(), server)
      }
    } catch (error) {
      if (!cached) throw error
      base = cached
      snapshot = JSON.parse(cached)
    }
  }
  if (snapshot) {
    cache.set(adapterKey, JSON.stringify(snapshot))
    cache.set(app + ':loaded:' + key, '1')
  }
  postResponse = null
  const state = await loadState(app, createInitialData)
  const hydrated = cache.get(adapterKey)
  cache.clear()
  // Publish the loaded cache while the baseline request is in flight.
  if (!pending) self.postMessage({hydrated, waitingForBaseline: !!postResponse})
  if (postResponse) {
    await acknowledgePost()
    base = hydrated
  }
  if (!initialized) await sessionRecord(key, {}).catch(() => {})
  return {state, pending: !!pending}
}

async function save(app, edit) {
  return withSessionLock(async () => {
    const server = await readServerState()
    const current = server === null ? null : JSON.stringify(server)
    const next = JSON.stringify(edit.state)
    if (current !== next) {
      if (current !== base && (submitted === null || current !== submitted)) return {conflict: true}
      base = current
      submitted = next
      await checkpoint()
      postResponse = null
      saveState(app, edit.state)
      cache.clear()
      await acknowledgePost()
    }
    base = next
    submitted = null
    if (pending?.revision === edit.revision) pending = null
    await checkpoint()
    return {saved: true}
  })
}

// Journal each edit as soon as it arrives. Only HTTP requests wait their turn.
let queue = Promise.resolve()
self.onmessage = ({data}) => {
  if (data.transportId) {
    const {resolve, reject} = transports.get(data.transportId)
    transports.delete(data.transportId)
    if (data.error) reject(new Error(data.error))
    else resolve(data.result)
    return
  }
  const {id, action} = data
  let run
  if (action === 'save') {
    const edit = {state: data.state, revision: ++revision}
    pending = edit
    const recorded = checkpoint()
    run = async () => {await recorded; return save(data.app, edit)}
  } else if (action === 'discard') {
    run = async () => {
      await readServerState()
      await sessionRecord(journalKey, null)
      pending = null
    }
  } else {
    lockName = data.app + ':save:' + (data.sid || '_default')
    run = () => withSessionLock(() => load(data))
  }
  queue = queue.then(async () => {
    try {
      self.postMessage({id, result: await run()})
    } catch (error) {
      cache.clear()
      self.postMessage({id, error: error.message})
    }
  })
}
