import React, { createContext, useContext, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { saveState, withSid } from './utils/dataManager.js'

export const APP = 'patreon_mock'
const Workspace = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)
  const current = useRef(initialState)

  function commit(action) {
    const latest = current.current
    const result = action(latest, {
      now: new Date().toISOString(),
      actor: latest.creator?.id ?? 'creator-mara',
    })
    if (result.error) return result
    current.current = result.state
    setState(result.state)
    saveState(APP, result.state)
    return result
  }

  function notify(message) {
    setNotice(previous => ({ message, version: (previous?.version ?? 0) + 1 }))
  }

  return (
    <Workspace.Provider value={{ state, commit, notify }}>
      {children}
      <div className="notice-region" role="status" aria-live="polite">
        {notice && <div className="notice" key={notice.version}>
          {notice.message}<button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
        </div>}
      </div>
    </Workspace.Provider>
  )
}

export const useWorkspace = () => useContext(Workspace)

export function SiteLink({ to, nav, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function useFilters(defaults) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => [name, params.get(name) || fallback]))

  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (!value || value === defaults[name]) next.delete(name)
      else next.set(name, value)
    }
    setParams(next, { replace: true })
  }

  return [values, update, () => update(defaults)]
}

export const list = value => Array.isArray(value) ? value : []
export const label = value => String(value ?? 'Unavailable').replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
export const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
export const idFor = prefix => `${prefix}-${globalThis.crypto.randomUUID()}`
export const recordPath = (section, id) => `/${section}/${encodeURIComponent(id)}`
export const lower = value => String(value ?? '').toLowerCase()
export const alphabetical = (left, right) => String(left ?? '').localeCompare(String(right ?? ''), 'en', { sensitivity: 'base' })
export const timestamp = value => Date.parse(value) || 0
export const byId = (left, right) => alphabetical(left.id, right.id)
export const find = (records, id) => list(records).find(record => record.id === id)
export const upsert = (records, record) => find(records, record.id)
  ? list(records).map(current => current.id === record.id ? record : current)
  : [...list(records), record]
export const hasValue = value => value !== null && value !== undefined && value !== ''
export const money = value => hasValue(value) && Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
  : 'Unavailable'
export const dateLabel = (value, withTime = false, timeZone) => timestamp(value)
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: withTime ? 'short' : undefined, timeZone }).format(new Date(value))
  : 'Unavailable'
export const eligible = member => member?.type === 'paid' || member?.type === 'former_paid'

export function localMedia(record) {
  return typeof record?.src === 'string' && /^\/(?![\/\\])[^\\]*$/.test(record.src) ? record.src : null
}
