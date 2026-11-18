import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { list } from '../data/display'
import { loadSession, persist, publishState, readForTransaction, withStateLock } from '../utils/stateSync'

const StateContext = createContext(null)
const DraftContext = createContext(null)
let initialLoad

function DraftProvider({ children }) {
  const [drafts, setDrafts] = useState({})
  function setDraft(name, update) {
    setDrafts((previous) => ({
      ...previous,
      [name]: typeof update === 'function' ? update(previous[name]) : update,
    }))
  }
  return <DraftContext.Provider value={{ drafts, setDraft }}>{children}</DraftContext.Provider>
}

export function Store({ children }) {
  const [state, setState] = useState(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let mounted = true
    initialLoad ??= loadSession()
    initialLoad.then((loaded) => {
      if (!mounted) return
      setState(loaded)
    }).catch(() => {
      if (mounted) setUnavailable(true)
    })
    return () => { mounted = false }
  }, [])

  function commit(collection, transaction, operationField, operationId) {
    return withStateLock(async (session) => {
      const latest = await readForTransaction(session)
      const findOperation = (value) => list(value?.[collection]).find((item) => item?.[operationField] === operationId)
      const previous = findOperation(latest)
      if (previous) {
        publishState(session, latest, setState)
        return previous
      }

      let result
      try {
        result = transaction(latest)
      } catch (error) {
        publishState(session, latest, setState)
        throw error
      }
      const next = {
        ...result.next,
        [collection]: result.next[collection].map((item) => item === result.record ? { ...item, [operationField]: operationId } : item),
      }
      const saved = await persist(session, latest, next, findOperation)
      publishState(session, saved, setState)
      return findOperation(saved)
    })
  }

  if (!state) return <main className="container page"><p role="status">{unavailable ? 'DMV services could not load. Refresh the page to try again.' : 'Loading DMV services…'}</p></main>

  return <StateContext.Provider value={{ state, commit }}>
    <DraftProvider>{children}</DraftProvider>
  </StateContext.Provider>
}

export const useStore = () => useContext(StateContext)

export function useTransaction(collection, transaction, operationField = 'operationId') {
  const { commit } = useStore()
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const attempt = useRef(null)

  async function submit(input) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try {
      const fingerprint = JSON.stringify(input)
      if (attempt.current?.fingerprint !== fingerprint) {
        attempt.current = { fingerprint, id: crypto.randomUUID() }
      }
      const record = await commit(collection, (latest) => transaction(latest, input), operationField, attempt.current.id)
      attempt.current = null
      return record
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return [submit, pending]
}

export function useDraft(name, fallback) {
  const { drafts, setDraft } = useContext(DraftContext)
  return [
    drafts[name] ?? fallback,
    (update) => setDraft(name, typeof update === 'function' ? (value) => update(value ?? fallback) : update),
  ]
}
