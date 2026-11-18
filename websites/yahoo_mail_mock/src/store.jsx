import { createContext, useContext, useRef, useState } from 'react'
import { persistMailbox, readMailbox, readPendingChanges, withMailboxLock, writePendingChanges } from './data/persistence.js'
import { array, id } from './data/model.js'
import { activity, record } from './data/activity.js'
import { applyMailboxChange } from './data/mailboxChanges.js'

const Store = createContext(null)
export { activity, record }

export function StoreProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [pending, setPending] = useState(0)
  const [interrupted, setInterrupted] = useState(readPendingChanges)
  const [saveNotice, setSaveNotice] = useState('')
  const latest = useRef(initialState)

  function removePending(ids) {
    writePendingChanges(readPendingChanges().filter(entry => !ids.includes(entry.id)))
    setInterrupted(entries => entries.filter(entry => !ids.includes(entry.id)))
  }

  async function commit(entry, update) {
    setPending(count => count + 1)
    try {
      return await withMailboxLock(() => {
        const current = readMailbox(latest.current)
        const events = array(current.activityLog)
        const alreadyCommitted = entry.change && events.some(event => event.id === entry.id)
        let next = alreadyCommitted ? current : update(current)
        const changed = Boolean(next && next !== current)
        if (changed) {
          if (entry.change) {
            // The first event also identifies this request if the tab reloads during cleanup.
            const activityLog = [...next.activityLog]
            activityLog[events.length] = { ...activityLog[events.length], id: entry.id }
            next = { ...next, activityLog }
          }
          persistMailbox(next)
        }
        latest.current = changed ? next : current
        setState(latest.current)
        removePending([entry.id])
        return Boolean(changed || alreadyCommitted)
      })
    } catch {
      setInterrupted(entries => entries.some(item => item.id === entry.id) ? entries : [...entries, entry])
      return null
    } finally {
      setPending(count => count - 1)
    }
  }

  async function dispatch(update, { change, label } = {}) {
    const entry = { id: id('act'), change, label }
    setSaveNotice('')
    try {
      writePendingChanges([...readPendingChanges(), entry])
    } catch {
      setSaveNotice('Unable to save your change. Try the action again.')
      return null
    }
    return commit(entry, update)
  }

  function dispatchChange(change, label) {
    return dispatch(current => applyMailboxChange(current, change), { change, label })
  }

  async function retry(entry) {
    setSaveNotice('')
    const done = await commit(entry, current => applyMailboxChange(current, entry.change))
    if (done !== null) setSaveNotice(done ? 'Mailbox change saved.' : 'This change no longer applies. Check the current mailbox and try the action again if needed.')
  }

  function updateSettings(section, values) {
    return dispatch(current => {
      const previous = section ? current.settings?.[section] || {} : current.settings || {}
      const changed = {}
      for (const [key, after] of Object.entries(values)) {
        const before = previous[key]
        if (JSON.stringify(before) === JSON.stringify(after)) continue
        changed[section ? section + '.' + key : key] = { before: before ?? null, after }
      }
      if (!Object.keys(changed).length) return current
      const settings = section
        ? { ...current.settings, [section]: { ...previous, ...values } }
        : { ...previous, ...values }
      return record(current, { settings }, activity(current, 'settings.update', { section, changed }))
    })
  }

  return <Store.Provider value={{ state, dispatch, dispatchChange, updateSettings, pending, interrupted, saveNotice,
    retry, removePending, dismissSaveNotice: () => setSaveNotice(''), getState: () => latest.current }}>{children}</Store.Provider>
}

export function useStore() {
  return useContext(Store)
}
