import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'npm'
const Store = createContext(null)

export function StoreProvider({ initial, children }) {
  const [world, setWorld] = useState(initial)
  const current = useRef(initial)
  const [notice, setNotice] = useState(null)

  function commit(change, message) {
    const previous = current.current
    const next = change(previous, { at: new Date().toISOString(), by: previous.account.id })
    if (next === previous) return false
    saveState(APP, next)
    current.current = next
    setWorld(next)
    if (message) setNotice(message)
    return true
  }

  return <Store.Provider value={{ world, commit, notice, setNotice }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)
export const records = (value) => Array.isArray(value) ? value.filter(record => record && typeof record === 'object') : []
export const membersOf = (world, id) => records(world.organizationMembers).filter(member => member.organizationId === id && active(member))
export const teamsOf = (world, id) => records(world.teams).filter(team => team.organizationId === id && active(team))
export const roleIn = (world, id) => membersOf(world, id).find(member => member.userId === world.account.id)?.role
export const active = (record) => Boolean(record && record.status !== 'removed')
export const byId = (value, id) => records(value).find(record => record.id === id)
export const newId = (prefix) => prefix + '_' + crypto.randomUUID()
export const created = ({ at, by }) => ({ createdAt: at, createdBy: by })
export const updated = ({ at, by }) => ({ updatedAt: at, updatedBy: by })
export const removed = ({ at, by }) => ({ status: 'removed', removedAt: at, removedBy: by })

export function patchRecord(world, key, id, patch) {
  return { ...world, [key]: records(world[key]).map(record => record.id === id ? { ...record, ...patch } : record) }
}

export function appendRecord(world, key, record) {
  return { ...world, [key]: [...records(world[key]), record] }
}
