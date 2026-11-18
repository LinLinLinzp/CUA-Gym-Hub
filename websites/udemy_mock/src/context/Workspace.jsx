import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from '../utils/dataManager.js'
import { actorId } from '../data/selectors.js'

export const APP = 'udemy'
const StoreContext = createContext(null)
const FeedbackContext = createContext(null)
export const useStore = () => useContext(StoreContext)

function Feedback({ children }) {
  const [notice, setNotice] = useState(null)
  return <FeedbackContext.Provider value={message => setNotice({ message })}>
    {children}
    <div className="feedback-region" role="status" aria-live="polite">
      {notice && <div className="toast">{notice.message}<button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  </FeedbackContext.Provider>
}

function Store({ initial, children }) {
  const [state, setState] = useState(initial)
  const latest = useRef(initial)
  const announce = useContext(FeedbackContext)

  function commit(apply, message) {
    const previous = latest.current
    const updatedBy = actorId(previous)
    if (!updatedBy) return previous
    const next = apply(previous, { updatedAt: new Date().toISOString(), updatedBy })
    if (next === previous) return previous
    latest.current = next
    saveState(APP, next)
    setState(next)
    if (message) announce(message)
    return next
  }

  return <StoreContext.Provider value={{ state, commit }}>{children}</StoreContext.Provider>
}

export function Workspace({ initial, children }) {
  return <Feedback><Store initial={initial}>{children}</Store></Feedback>
}
