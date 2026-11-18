import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'rippling'
const Context = createContext(null)

export function Workspace({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [notice, setNotice] = useState(null)
  const noticeId = useRef(0)

  function commit(action) {
    const result = action(current.current)
    if (!result.next) return result
    current.current = result.next
    saveState(APP, result.next)
    setState(result.next)
    setNotice({ message: result.message, id: ++noticeId.current })
    return result
  }

  return <Context.Provider value={{ state, commit }}>
    {children}
    <div className={notice ? 'notice visible' : 'notice'} role="status" aria-live="polite">
      {notice && <span key={notice.id}>{notice.message}</span>}
      {notice && <button className="dismiss" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>}
    </div>
  </Context.Provider>
}

export const useWorkspace = () => useContext(Context)
