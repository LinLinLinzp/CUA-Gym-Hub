import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'box'
const Store = createContext(null)

export function Workspace({ initial, children }) {
  const current = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)

  function commit(operation, message) {
    const previous = current.current
    const actor = previous.account?.currentUserId
    if (!previous.users.some(user => user.id === actor)) throw new Error('Your account is missing from the directory.')
    const now = new Date().toISOString()
    const update = { updatedById: actor, updatedAt: now }
    const next = operation(previous, {
      actor, now, update,
      record: prefix => ({ id: `${prefix}-${crypto.randomUUID()}`, createdById: actor, createdAt: now, ...update }),
    })
    current.current = next
    setState(next)
    saveState(APP, next)
    setNotice({ message })
  }

  return <Store.Provider value={{ state, commit, actor: state.account?.currentUserId }}>
    {children}
    <div className="announcer" aria-live="polite">{notice && <div className="toast" role="status">{notice.message}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}</div>
  </Store.Provider>
}

export const useWorkspace = () => useContext(Store)

