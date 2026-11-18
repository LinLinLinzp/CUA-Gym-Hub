import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getSessionId, saveState } from './utils/dataManager.js'
import { items, newId } from './model.js'

export const APP = 'typeform'
const StateContext = createContext(null)
const formActivity = (action, formId, actorId, createdAt, entityIds) => ({
  id: newId('activity'), action, formId, actorId, createdAt, ...(entityIds?.length ? { entityIds } : {}),
})

export function StateProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)

  useEffect(() => {
    const key = APP + ':current:' + (getSessionId() || '_default')
    function sync(event) {
      if (event.storageArea !== localStorage || event.key !== key || !event.newValue) return
      const latest = JSON.parse(event.newValue)
      current.current = latest
      setState(latest)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function commit(change) {
    const before = current.current
    const next = change(before)
    if (next === before) return false
    current.current = next
    setState(next)
    saveState(APP, next)
    return true
  }

  function admin(action, formId, change) {
    return commit((before) => {
      const actorId = before.account?.id || 'user_morgan'
      const createdAt = new Date().toISOString()
      const result = change(before, { actorId, createdAt })
      if (!result) return before
      return {
        ...before, ...result.fields,
        activity: [...items(before.activity), formActivity(action, formId, actorId, createdAt, result.entityIds)],
      }
    })
  }

  function editForm(formId, action, update) {
    return admin(action, formId, (before, { actorId, createdAt }) => {
      const forms = items(before.forms)
      const form = forms.find((entry) => entry.id === formId)
      if (!form) return null
      const edit = update(form, createdAt)
      if (!edit) return null
      return {
        fields: { forms: forms.map((entry) => entry.id === formId
          ? { ...entry, ...edit.fields, updatedBy: actorId, updatedAt: createdAt }
          : entry) },
        entityIds: edit.entityIds,
      }
    })
  }

  return <StateContext.Provider value={{ state, commit, admin, editForm }}>{children}</StateContext.Provider>
}

export const useAccount = () => useContext(StateContext)
