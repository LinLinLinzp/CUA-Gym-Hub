import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/persist.js'
import { readerView } from './model.js'

export const APP = 'goodreads_mock'
const StoreContext = createContext(null)

export function Store({ initial, children }) {
  const latest = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)
  const view = useMemo(() => readerView(state), [state])

  function commit(update, message) {
    return withSessionWrite(APP, async () => {
      try {
        const snapshot = await readCurrentState(latest.current)
        let next
        try {
          next = update(snapshot)
        } catch (error) {
          return error.message
        }
        if (next === snapshot) return null
        await saveAcknowledged(APP, next)
        latest.current = next
        setState(next)
        setNotice(previous => ({ message, sequence: (previous?.sequence ?? 0) + 1 }))
        return null
      } catch (error) {
        setNotice(previous => ({ message: error.message, sequence: (previous?.sequence ?? 0) + 1 }))
        return error.message
      }
    })
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

