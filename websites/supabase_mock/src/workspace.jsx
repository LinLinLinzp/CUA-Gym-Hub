import React, { createContext, useContext, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { saveState, withSid } from './utils/dataManager.js'

export const APP = 'supabase_mock'
export const list = value => Array.isArray(value) ? value : []
export const matches = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const label = value => value ? value[0].toUpperCase() + value.slice(1) : 'Unknown'
export const replace = (records, id, next) => list(records).map(record => record.id === id ? next : record)
export const without = (records, id) => list(records).filter(record => record.id !== id)
export const entityPath = (root, id) => `${root}/${encodeURIComponent(id)}`
export function date(value) {
  if (!value) return '—'
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(time)
}
export function bytes(value) {
  if (value == null) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1048576) return `${Number((value / 1024).toFixed(1))} KB`
  return `${Number((value / 1048576).toFixed(1))} MB`
}

const WorkspaceContext = createContext(null)
export const useWorkspace = () => useContext(WorkspaceContext)

export function Workspace({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)
  const current = useRef(initialState)

  function commit(mutation, message) {
    const previous = current.current
    const timestamp = new Date().toISOString()
    const actorId = previous.currentUser?.id ?? null
    const meta = { actorId, createdAt: timestamp, updatedAt: timestamp }
    const { changes, action, entityType, entityId, related = {}, details = {} } = mutation(previous, meta)
    const activity = { id: crypto.randomUUID(), action, entityType, entityId, actorId, createdAt: timestamp, related, details }
    const next = { ...previous, ...changes, activity: [...list(previous.activity), activity] }
    current.current = next
    saveState(APP, next)
    setState(next)
    setNotice({ message, id: activity.id })
  }

  return <WorkspaceContext.Provider value={{ state, commit, notice, clearNotice: () => setNotice(null) }}>
    {children}
  </WorkspaceContext.Provider>
}

export function record(changes, action, entityId, related, details) {
  return { changes, action, entityType: action.split('.')[0], entityId, related, details }
}

export function LocalLink({ to, nav, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}
export function useLocalNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
