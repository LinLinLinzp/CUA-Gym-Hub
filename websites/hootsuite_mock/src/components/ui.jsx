import React, { useEffect, useRef, useState } from 'react'
import { array, findRecord, networks, profileName, records, statuses, text } from '../utils/records.js'
import { dateTimeLabel } from '../utils/dates.js'

const shapes = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 10h18m-13 5h2m4 0h2"/></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3"/></>,
  left: <path d="m15 6-6 6 6 6"/>,
  right: <path d="m9 6 6 6-6 6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  clock: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
  review: <><rect x="5" y="4" width="14" height="16" rx="3"/><path d="m9 12 2 2 4-4"/></>,
  streams: <><rect x="3" y="5" width="5" height="14" rx="1"/><rect x="10" y="5" width="5" height="10" rx="1"/><rect x="17" y="5" width="4" height="12" rx="1"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 8a7 7 0 0 1 11-2l3 6M4 12l3 6a7 7 0 0 0 11-2"/></>,
}

export function Icon({ name, size = 17 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}

export function Modal({ title, children, onClose, wide = false, compact = false, returnFocus }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = returnFocus ?? document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [returnFocus])
  return (
    <dialog ref={ref} className={wide ? 'modal wide' : compact ? 'modal compact' : 'modal'}
      aria-label={title} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <header className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button quiet" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>
      {children}
    </dialog>
  )
}

export function Confirm({ title, children, action, onClose, onConfirm, returnFocus }) {
  const [error, setError] = useState('')
  return <Modal title={title} compact onClose={onClose} returnFocus={returnFocus}>
    <p>{children}</p>
    {error && <p className="error" role="alert">{error}</p>}
    <footer className="modal-actions">
      <button type="button" onClick={onClose}>Keep it</button>
      <button type="button" className="danger-fill" onClick={() => { const result = onConfirm(); if (result) setError(result) }}>{action}</button>
    </footer>
  </Modal>
}

export function Status({ value }) {
  return <span className={`status status-${text(value)}`}>{statuses[value] || 'Unknown status'}</span>
}

export function Empty({ icon, title, children }) {
  return <div className="empty">{icon && <span className="empty-icon"><Icon name={icon} size={23} /></span>}<strong>{title}</strong>{children && <p>{children}</p>}</div>
}

export function ProfileTile({ profile }) {
  const label = networks[profile?.network] || '?'
  return <span className={`profile-tile network-${text(profile?.network)}`} aria-hidden="true">{label === 'LinkedIn' ? 'in' : label[0]}</span>
}

export function ProfileSummary({ ids, profiles }) {
  if (!array(ids).length) return <span className="muted">No profiles</span>
  const first = findRecord(profiles, ids[0])
  return <span className="profile-summary" title={ids.map((id) => profileName(findRecord(profiles, id))).join(', ')}>
    <ProfileTile profile={first} />
    <span>{ids.length > 1 ? `${ids.length} profiles` : networks[first?.network] || 'Unavailable profile'}</span>
  </span>
}

export function PostPreview({ post, profiles, zone, showStatus = true }) {
  const ids = array(post?.profileIds)
  return <div className="post-preview">
    {showStatus && <Status value={post?.status} />}
    <p className="post-copy">{text(post?.body) || 'No caption available.'}</p>
    <dl className="facts">
      <div><dt>Profiles</dt><dd>{ids.length ? ids.map((id, index) => {
        const profile = findRecord(profiles, id)
        return <span className="profile-summary" key={index}><ProfileTile profile={profile} />{profileName(profile)}{profile?.handle && <small>{profile.handle}</small>}</span>
      }) : 'No profiles selected'}</dd></div>
      <div><dt>Scheduled time</dt><dd>{dateTimeLabel(post?.scheduledAt, zone)}{Number.isFinite(Date.parse(post?.scheduledAt)) && <small>{zone}</small>}</dd></div>
    </dl>
  </div>
}

export const blankFilters = { profile: '', status: '', query: '' }

export function Filters({ value, onChange, profiles, options, placeholder = 'Search posts' }) {
  function change(field, event) {
    onChange({ ...value, [field]: event.target.value })
  }
  const dirty = Object.values(value).some(Boolean)
  return <div className="filter-controls">
    <label className="search-box"><Icon name="search" /><input type="search" aria-label={placeholder} placeholder={placeholder}
      value={value.query} onChange={(event) => change('query', event)} /></label>
    <select aria-label="Account" value={value.profile} onChange={(event) => change('profile', event)}>
      <option value="">All accounts</option>
      {records(profiles).filter((profile) => profile.id).map((profile) => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}
    </select>
    <select aria-label="Status" value={value.status} onChange={(event) => change('status', event)}>
      <option value="">All statuses</option>
      {options.map((status) => <option key={status} value={status}>{statuses[status]}</option>)}
    </select>
    {dirty && <button className="quiet" type="button" onClick={() => onChange(blankFilters)}>Clear filters</button>}
  </div>
}
