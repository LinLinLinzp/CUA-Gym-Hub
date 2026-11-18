import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState, withSid } from './utils/dataManager.js'
import { Link, useNavigate } from 'react-router-dom'

export const APP = 'grafana_mock'
const Workspace = createContext(null)
export const useWorkspace = () => useContext(Workspace)
export const rows = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const find = (records, id) => id == null ? undefined : rows(records).find((record) => record.id === id)
export const text = (value) => String(value ?? '')
export const fold = (value) => text(value).trim().toLowerCase()
export const split = (value) => [...new Set(text(value).split(',').map((item) => item.trim()).filter(Boolean))]
export const uid = (prefix) => prefix + '-' + crypto.randomUUID()

export function WorkspaceProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [notice, setNotice] = useState(null)

  function mutate(update, message) {
    const previous = current.current
    const createdAt = new Date().toISOString()
    const createdBy = previous.currentUser?.id ?? 'usr-maya'
    const next = update(previous, { createdAt, createdBy, updatedAt: createdAt, updatedBy: createdBy })
    if (next === previous) return false
    current.current = next
    saveState(APP, next)
    setState(next)
    notify(message)
    return true
  }

  function notify(message, error = false) {
    setNotice(message ? { message, error } : null)
  }

  return <Workspace.Provider value={{ state, mutate, notice, notify }}>{children}</Workspace.Provider>
}

export const SiteLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path) => navigate(withSid(path))
}

export function upsert(records, record) {
  return find(records, record.id)
    ? rows(records).map((item) => item.id === record.id ? record : item)
    : [...rows(records), record]
}

export const without = (records, id) => rows(records).filter((item) => item.id !== id)
export const revisions = (before, stamp) => before
  ? { updatedAt: stamp.updatedAt, updatedBy: stamp.updatedBy }
  : stamp

export function deletion(state, entityType, entity, stamp) {
  return [...rows(state.activity), {
    id: uid('act'), action: 'delete', entityType, entityId: entity.id,
    entityName: text(entity.title ?? entity.name), status: 'completed',
    createdBy: stamp.createdBy, createdAt: stamp.createdAt,
  }]
}

export const dashboardPath = (id) => '/d/' + encodeURIComponent(id)
export const rulePath = (id) => '/alerting/rules/' + encodeURIComponent(id)
export const folderPath = (id) => '/dashboards/f/' + encodeURIComponent(id)
