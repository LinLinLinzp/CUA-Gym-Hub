import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

export const APP = 'chewy'
const AccountContext = createContext(null)

export function AccountProvider({ initial, children }) {
  const current = useRef(initial)
  const announcementId = useRef(0)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)

  function commit(update, message) {
    const previous = current.current
    const metadata = { actorId: previous.account?.id || 'account', createdAt: new Date().toISOString() }
    const next = update(previous, metadata)
    if (next === previous) return
    saveState(APP, next)
    current.current = next
    setState(next)
    setNotice({ id: ++announcementId.current, message })
  }

  return <AccountContext.Provider value={{ state, commit }}>
    {children}
    <div className="notice-region" role="status">{notice && <div key={notice.id} className="notice">
      <span>{notice.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
    </div>}</div>
  </AccountContext.Provider>
}

export const useAccount = () => useContext(AccountContext)

