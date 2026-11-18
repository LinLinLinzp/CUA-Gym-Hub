import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { persist } from './utils/persist.js'
import { readerView } from './model.js'

export const APP = 'goodreads_mock'
const StoreContext = createContext(null)

export function Store({ initial, children }) {
  const latest = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)
  const view = useMemo(() => readerView(state), [state])

  function commit(update, message) {
    try {
      const next = update(latest.current)
      if (next === latest.current) return null
      persist(APP, next)
      latest.current = next
      setState(next)
      setNotice(previous => ({ message, sequence: (previous?.sequence ?? 0) + 1 }))
      return null
    } catch (error) {
      return error.message
    }
  }

  return <StoreContext.Provider value={{ ...view, commit }}>
    {children}
    <div className="announcement" role="status">
      {notice && <span key={notice.sequence}>{notice.message}</span>}
    </div>
  </StoreContext.Provider>
}

export function useReader() {
  return useContext(StoreContext)
}

