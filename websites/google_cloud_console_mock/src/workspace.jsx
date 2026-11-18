import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId, saveState } from './utils/dataManager.js'

const Workspace = createContext(null)
export const useWorkspace = () => useContext(Workspace)
export const rows = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export const display = value => value === null || value === undefined || value === '' ? '—' : String(value)
export const contains = (value, query) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
export const active = record => !['DELETED', 'deleted', 'revoked'].includes(record.status)
export const uid = prefix => prefix + '-' + crypto.randomUUID()
export const dateKey = (date = new Date()) => date.toISOString().slice(0, 10)
export const atMonth = (date, month = dateKey().slice(0, 7)) => typeof date === 'string' && date.slice(0, 7) === month
export const dateLabel = (value, time = false) => {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}), timeZone: 'UTC' })
}
export function cents(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  const magnitude = Math.abs(amount)
  return Math.sign(amount) * Math.round((magnitude + magnitude * Number.EPSILON) * 100)
}
export const sum = records => records.reduce((total, record) => total + cents(record.amount), 0) / 100
export function money(amount, currency = 'USD') {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount) }
  catch { return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) }
}
export const distinct = values => [...new Set(values.filter(Boolean))].sort()
export const byId = (list, id) => rows(list).find(item => item.id === id)
export const recordPath = (base, record) => base + '/' + encodeURIComponent(record.id)

export function WorkspaceProvider({ initial, appId, children }) {
  const [state, setState] = useState(initial)
  const stateRef = useRef(initial)
  const [notice, setNotice] = useState(null)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  function transact(change, message) {
    const previous = stateRef.current
    const createdAt = new Date().toISOString()
    const actorId = previous.currentUser?.id || 'user-riley-morgan'
    const events = []
    const event = (kind, entityId, scope, changes) => {
      events.push({ id: uid('activity'), kind, entityId, ...scope, actorId, createdAt, changes })
    }
    const next = change(previous, {
      creation: { createdAt, actorId },
      update: { updatedAt: createdAt, updatedBy: actorId },
      event,
    })
    if (!next || next === previous) return false
    const full = { ...next, activity: [...rows(previous.activity), ...events] }
    saveState(appId, full)
    stateRef.current = full
    setState(full)
    clearTimeout(timer.current)
    setNotice(message)
    timer.current = setTimeout(() => setNotice(null), 4800)
    return true
  }

  return <Workspace.Provider value={{ state, transact }}>
    {children}
    <div className="feedback" role="status" aria-live="polite">{notice && <div>✓ {notice}</div>}</div>
  </Workspace.Provider>
}

export function useRoutePath() {
  const { search } = useLocation()
  return (path, changes = {}) => {
    const params = new URLSearchParams(search)
    const sid = params.get('sid') || getSessionId()
    if (sid) params.set('sid', sid)
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const query = params.toString()
    return query ? path + '?' + query : path
  }
}

export function RouteLink({ to, scope, ...props }) {
  const path = useRoutePath()
  return <Link to={path(to, scope)} {...props} />
}

export function useGo() {
  const path = useRoutePath()
  const navigate = useNavigate()
  return (to, scope) => navigate(path(to, scope))
}

export function useScope(kind, inferredId) {
  const { state } = useWorkspace()
  const { search } = useLocation()
  const options = rows(kind === 'project' ? state.projects : state.billingAccounts).filter(record => record.id)
  const explicit = new URLSearchParams(search).get(kind)
  const id = explicit || inferredId || options[0]?.id || ''
  return { id, options, record: options.find(record => record.id === id) }
}
