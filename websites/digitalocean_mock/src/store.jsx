import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'
import { loadInitialState } from './utils/loadInitialState.js'
import { createInitialData } from './data/seed.js'

const appName = 'digitalocean_mock'
const StoreContext = createContext(null)
const loadedWorld = loadInitialState(appName, createInitialData)
let pendingSave = null

function saveWorld(world) {
  function write() {
    const request = window.fetch
    let drained = Promise.resolve()
    // The shared template does not consume its response. Chromium can retain
    // that request's keepalive quota and reject the next full-state upload.
    window.fetch = (input, options) => {
      // Chromium limits keepalive uploads by UTF-8 byte length.
      const keepalive = options.keepalive && new TextEncoder().encode(options.body).byteLength < 64 * 1024
      const response = request.call(window, input, { ...options, keepalive })
      drained = response.then(result => result.arrayBuffer()).catch(() => {})
      return response
    }
    try {
      saveState(appName, world)
    } finally {
      window.fetch = request
    }
    return drained
  }

  const next = pendingSave ? pendingSave.then(write) : write()
  pendingSave = next
  const clear = () => { if (pendingSave === next) pendingSave = null }
  next.then(clear, clear)
}

export const loadWorld = () => loadedWorld
export function newId(prefix) {
  const random = crypto.getRandomValues(new Uint8Array(16))
  return `${prefix}-${Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')}`
}
export const useWorkspace = () => useContext(StoreContext)

export function WorkspaceProvider({ initial, children }) {
  const [world, setWorld] = useState(initial)
  const [notice, setNotice] = useState(null)
  const latest = useRef(initial)

  function commit({ entityType, entityId, kind, createdAt, details, changes, message }) {
    const previous = latest.current
    const action = {
      id: newId('act'), kind: `${entityType}.${kind}`, entityType, entityId,
      actorId: previous.account.id, status: 'completed', createdAt, details,
    }
    const next = { ...previous, ...changes, activity: [...previous.activity, action] }
    saveWorld(next)
    latest.current = next
    setWorld(next)
    setNotice({ id: action.id, message })
  }

  return <StoreContext.Provider value={{ world, commit, notice }}>{children}</StoreContext.Provider>
}
