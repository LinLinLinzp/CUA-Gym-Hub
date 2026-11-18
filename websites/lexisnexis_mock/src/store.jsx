import { createContext, useContext, useState } from 'react'
import { array } from './model.js'
import { saveState } from './utils/dataManager.js'

export const APP = 'lexisnexis'
const Context = createContext(null)
const collections = ['documents', 'folders', 'folderItems', 'citingReferences', 'citationActions', 'alerts', 'alertResults']
const normalize = (state) => Object.assign({ ...state }, Object.fromEntries(collections.map((key) => [key, array(state[key])])))

export function WorkspaceProvider({ initialState, children }) {
  const [current, setCurrent] = useState(initialState)
  const [notice, setNotice] = useState({ text: '', sequence: 0 })
  const announce = (text) => setNotice((previous) => ({ text, sequence: previous.sequence + 1 }))

  function commit(change, feedback) {
    const latest = getLatest()
    const actor = latest.profile?.id || 'user-001'
    const timestamp = new Date().toISOString()
    const result = change(normalize(latest), {
      create: { createdAt: timestamp, createdBy: actor },
      update: { updatedAt: timestamp, updatedBy: actor },
      id: (prefix) => `${prefix}-${crypto.randomUUID()}`,
    })
    if (typeof result === 'string') return result
    const next = { ...latest, ...result }
    saveState(APP, next)
    setCurrent(next)
    announce(typeof feedback === 'function' ? feedback(result) : feedback)
    return ''
  }

  const [getLatest] = useState(() => {
    // Read the same session cache used by the standard helper so an open tab
    // can keep unrelated changes already committed in a second tab.
    const sid = new URLSearchParams(location.search).get('sid') || sessionStorage.getItem('mock_sid')
    const key = `${APP}:current:${sid || '_default'}`
    return () => JSON.parse(localStorage.getItem(key) || 'null') || initialState
  })

  return <Context.Provider value={{ state: normalize(current), commit, announce }}>
    {children}
    <div className="toast-region" role="status" aria-live="polite">
      {notice.text && <div className="toast" key={notice.sequence}>{notice.text}<button className="icon-button" aria-label="Dismiss notification" onClick={() => announce('')}>×</button></div>}
    </div>
  </Context.Provider>
}

export const useWorkspace = () => useContext(Context)
