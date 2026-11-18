import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'twilio-console'
const StateContext = createContext(null)

export function StateProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)

  function mutate(update) {
    const previous = current.current
    const now = new Date().toISOString()
    const actor = previous.account?.operator?.id ?? null
    const next = update(previous, now, actor)
    if (!next || next === previous) return false
    saveState(APP, next)
    current.current = next
    setState(next)
    return true
  }

  return <StateContext.Provider value={{ state, mutate }}>{children}</StateContext.Provider>
}

export function useWorkspace() {
  return useContext(StateContext)
}

export function newSid(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return prefix + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
