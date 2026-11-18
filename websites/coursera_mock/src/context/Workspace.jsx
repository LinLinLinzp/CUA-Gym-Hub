import { createContext, useContext, useEffect, useState } from 'react'
import { createInitialData } from '../data/seed.js'
import { applyAction } from '../data/learning.js'
import { getSessionId, loadState, saveState } from '../utils/dataManager.js'

const app = 'coursera_mock'
const Workspace = createContext(null)

export const useWorkspace = () => useContext(Workspace)

function withSessionLock(operation) {
  const name = JSON.stringify([app, getSessionId()])
  return navigator.locks ? navigator.locks.request(name, operation) : operation()
}

export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let mounted = true
    withSessionLock(() => loadState(app, createInitialData)).then(value => {
      if (!mounted) return
      setState(value)
    }).catch(() => { if (mounted) setError(true) })
    return () => { mounted = false }
  }, [])

  function notify(message, tone = 'success') {
    setNotice({ message, tone })
  }

  function dispatch(action, message) {
    return withSessionLock(async () => {
      // The state manager shares its cache across tabs. Read it again before
      // applying an action that may have been opened against an older view.
      const current = await loadState(app, createInitialData)
      const next = applyAction(current, action)
      if (!next) {
        setState(current)
        notify('This action is no longer available. Review the current status and try again.', 'failure')
        return false
      }
      saveState(app, next)
      setState(next)
      if (message) notify(message)
      return true
    })
  }

  if (!state) return <main className="loading" aria-live="polite">
    {error ? <><p>The workspace could not load.</p><button onClick={() => window.location.reload()}>Reload workspace</button></> : 'Loading your workspace…'}
  </main>

  return <Workspace.Provider value={{ state, dispatch, notify }}>
    {children}
    <div className="notice-area" aria-live="polite" aria-atomic="true">
      {notice && <div className={'notice ' + notice.tone}>
        <span>{notice.message}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
      </div>}
    </div>
  </Workspace.Provider>
}
