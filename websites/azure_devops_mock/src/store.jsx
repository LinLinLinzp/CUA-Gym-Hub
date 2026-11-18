import React, { createContext, useContext, useSyncExternalStore, useState, useRef, useEffect } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, mergeWithDefaults, saveState } from './utils/dataManager.js'
import { find, requireThat } from './model.js'
import { awaitStateWrite, readCurrentState } from './stateTransport.js'

const APP = 'azure_devops_mock'
const Context = createContext(null)
const sessions = new Map()

function sessionStore(sid) {
  if (sessions.has(sid)) return sessions.get(sid)
  const session = sid || '_default'
  const key = APP + ':current:' + session
  const loadedKey = APP + ':loaded:' + session
  const subscribers = new Set()
  let snapshot = { data: null, error: null }
  let serialized
  let defaults
  let queue = Promise.resolve()
  const inOrder = (action) => {
    const task = queue.then(() => navigator.locks ? navigator.locks.request(key, action) : action())
    queue = task.catch(() => {})
    return task
  }
  const publish = (next) => {
    snapshot = next
    subscribers.forEach((listener) => listener())
  }
  const refresh = (raw) => {
    if (!raw || raw === serialized) return
    try {
      const data = JSON.parse(raw)
      serialized = raw
      publish({ data, error: null })
    } catch {
      // A malformed storage event cannot replace the loaded workspace.
    }
  }
  const publishCurrent = (storedState) => {
    const data = mergeWithDefaults(defaults ??= createInitialData(), storedState)
    const raw = JSON.stringify(data)
    if (localStorage.getItem(key) !== raw) localStorage.setItem(key, raw)
    if (raw !== serialized) {
      serialized = raw
      publish({ data, error: null })
    }
  }
  const store = {
    snapshot: () => snapshot,
    subscribe(listener) {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    sync: () => inOrder(() => refresh(localStorage.getItem(key))),
    commit: (action) => inOrder(async () => {
      const current = await readCurrentState(sid)
      requireThat(current, 'The saved workspace is unavailable. Reload the page and try again.')
      publishCurrent(current)
      const data = snapshot.data
      const actor = find(data.users, data.preferences?.currentUserId)?.id
      requireThat(actor, 'A signed-in user is required for this action.')
      const [next, result] = action(data, actor, new Date().toISOString())
      if (next === data) return result
      try {
        await awaitStateWrite(sid, () => saveState(APP, next))
      } catch (failure) {
        localStorage.setItem(key, serialized)
        throw failure
      }
      serialized = localStorage.getItem(key)
      publish({ data: next, error: null })
      return result
    }),
  }
  sessions.set(sid, store)
  inOrder(async () => {
    try {
      let current
      if (localStorage.getItem(loadedKey) && localStorage.getItem(key)) {
        current = await readCurrentState(sid)
        if (!current) localStorage.removeItem(loadedKey)
      }
      const data = await awaitStateWrite(sid, () => loadState(APP, createInitialData))
      if (current) publishCurrent(current)
      else {
        serialized = localStorage.getItem(key)
        publish({ data, error: null })
      }
    } catch {
      localStorage.removeItem(key)
      localStorage.removeItem(loadedKey)
      publish({ data: null, error: 'The workspace could not be loaded. Reload the page to try again.' })
    }
  })
  return store
}

export function StoreProvider({ children }) {
  const [sid] = useState(getSessionId)
  const [store] = useState(() => sessionStore(sid))
  const { data, error } = useSyncExternalStore(store.subscribe, store.snapshot)
  const [toast, setToast] = useState('')
  const timer = useRef()
  useEffect(() => {
    const sync = (event) => {
      if (event.key === APP + ':current:' + (sid || '_default')) store.sync()
    }
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('storage', sync)
      clearTimeout(timer.current)
    }
  }, [sid, store])

  if (!data) return <main className="loading" role={error ? 'alert' : 'status'}>{error ?? 'Loading workspace…'}</main>

  function notify(message) {
    clearTimeout(timer.current)
    setToast(message)
    timer.current = setTimeout(() => setToast(''), 3800)
  }

  const user = find(data.users, data.preferences?.currentUserId)
  return <Context.Provider value={{ data, user, commit: store.commit, notify }}>
    <div className="app" data-theme={data.preferences?.theme === 'dark' ? 'dark' : 'light'}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  </Context.Provider>
}

export const useStore = () => useContext(Context)
