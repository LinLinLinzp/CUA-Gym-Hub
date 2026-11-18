import {newId} from '../model.js'
import {getSessionId} from './dataManager.js'

export function createHarborSession(app, onHydrated) {
  const sid = getSessionId()
  const key = sid || '_default'
  const tabKey = app + ':tab:' + key
  const tabId = sessionStorage.getItem(tabKey) || newId('tab')
  sessionStorage.setItem(tabKey, tabId)
  const cacheKey = `${app}:acknowledged-state`
  const loadedKey = app + ':loaded:' + key
  const cacheSidKey = `${app}:acknowledged-sid`
  const worker = new Worker(new URL('./harborWorker.js', import.meta.url), {type: 'module'})
  const requests = new Map()
  let sequence = 0
  let workerError
  let transportController = new AbortController()
  function abortTransports() {
    transportController.abort()
    transportController = new AbortController()
  }
  window.addEventListener('pagehide', abortTransports)
  worker.onmessage = async ({data: {id, result, error, transport, hydrated, waitingForBaseline}}) => {
    if (hydrated) {
      remember(hydrated)
      if (waitingForBaseline) onHydrated(JSON.parse(hydrated))
      return
    }
    if (transport) {
      try {
        const {path, options} = transport
        const response = await fetch(path, {...options, signal: transportController.signal})
        const body = options?.method !== 'POST' && response.ok ? await response.json() : null
        worker.postMessage({transportId: id, result: {ok: response.ok, status: response.status, body}})
      } catch (error) {
        worker.postMessage({transportId: id, error: error.message})
      }
      return
    }
    const request = requests.get(id)
    requests.delete(id)
    if (error) request?.reject(new Error(error))
    else request?.resolve(result)
  }
  worker.onerror = () => {
    workerError = new Error('Excel could not start its storage worker.')
    for (const request of requests.values()) request.reject(workerError)
    requests.clear()
  }
  function request(action, args) {
    if (workerError) return Promise.reject(workerError)
    return new Promise((resolve, reject) => {
      const id = ++sequence
      worker.postMessage({id, action, ...args})
      requests.set(id, {resolve, reject})
    })
  }
  function remember(serialized) {
    try {
      localStorage.removeItem(cacheSidKey)
      localStorage.removeItem(cacheKey)
      localStorage.removeItem(`${app}:current:${key}`)
      localStorage.setItem(cacheKey, serialized)
      localStorage.setItem(cacheSidKey, key)
    } catch { /* Large snapshots remain available through Harbor. */ }
  }
  return {
    async load() {
      let previouslyLoaded = false
      let cached = null
      try {
        if (localStorage.getItem(cacheSidKey) === key) cached = localStorage.getItem(cacheKey)
        previouslyLoaded = !!localStorage.getItem(loadedKey)
      } catch { /* Browser storage is optional. */ }
      const result = await request('load', {app, sid, tabId, previouslyLoaded, cached})
      try {localStorage.setItem(loadedKey, '1')} catch { /* IndexedDB also tracks initialization. */ }
      return result
    },
    async save(state) {
      const result = await request('save', {app, state})
      if (result.saved) remember(JSON.stringify(state))
      return result
    },
    discard: () => request('discard'),
    close() {
      window.removeEventListener('pagehide', abortTransports)
      abortTransports()
      worker.terminate()
    },
  }
}
