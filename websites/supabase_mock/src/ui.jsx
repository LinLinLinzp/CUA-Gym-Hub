import React, { cloneElement, useEffect, useId, useRef, useState } from 'react'

const icons = {
  overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></>,
  tables: <><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 9.5h18M3 14.5h18M9 9.5v10"/></>,
  users: <><circle cx="10" cy="8" r="3.5"/><path d="M3 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M16 5a3.4 3.4 0 0 1 0 6.5M19 14a4 4 0 0 1 2 4v2"/></>,
  storage: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10h18"/></>,
  policies: <><path d="M12 3 4.5 6v5c0 5 3 8.3 7.5 10 4.5-1.7 7.5-5 7.5-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  file: <><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></>,
  download: <path d="M12 4v11m-4-4 4 4 4-4M5 16v4h14v-4"/>,
}

export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}
export function Button({ children, variant = 'secondary', icon, type = 'button', ...props }) {
  return <button type={type} className={`button ${variant}`} {...props}>{icon && <Icon name={icon} size={16} />}{children}</button>
}
export function PageHead({ eyebrow, title, description, children }) {
  return <header className="page-head"><div>
    <div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p>
  </div>{children && <div className="actions">{children}</div>}</header>
}
export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
export function Search({ title, value, onChange }) {
  return <label className="search"><Icon name="search" /><input type="search" aria-label={title} placeholder={title} value={value} onChange={event => onChange(event.target.value)} /></label>
}
export function Filter({ title, value, onChange, options }) {
  return <select aria-label={title} value={value} onChange={event => onChange(event.target.value)}>
    {options.map(option => {
      const [key, text] = Array.isArray(option) ? option : [option, option]
      return <option value={key} key={key}>{text}</option>
    })}
  </select>
}
export function Field({ title, note, children }) {
  const id = useId()
  const noteId = note ? `${id}-note` : undefined
  return <div className="field"><label htmlFor={id}>{title}</label>
    {cloneElement(children, { id, 'aria-describedby': noteId })}{note && <small id={noteId}>{note}</small>}
  </div>
}
export function Toggle({ title, checked, onChange }) {
  return <label className="toggle"><input type="checkbox" checked={!!checked} onChange={event => onChange(event.target.checked)} /><span>{title}</span></label>
}
export function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}</div>
}
export function DataGrid({ children, title }) {
  return <div className="grid-scroll"><table aria-label={title}>{children}</table></div>
}
export function Pager({ page, pageSize, total, onChange }) {
  if (!total) return null
  return <div className="pager"><span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
    <div className="actions"><Button disabled={!page} onClick={() => onChange(page - 1)}>Previous</Button>
      <Button disabled={(page + 1) * pageSize >= total} onClick={() => onChange(page + 1)}>Next</Button></div>
  </div>
}

export function Dialog({ title, children, onClose, onSubmit, submitLabel = 'Save', confirm = false, danger = false }) {
  const dialog = useRef(null)
  const alert = useRef(null)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    element.showModal()
    element.querySelector('input, select, textarea')?.focus()
    return () => {
      element.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  useEffect(() => { if (error) alert.current?.scrollIntoView({ block: 'nearest' }) }, [error])
  async function submit(event) {
    event.preventDefault()
    if (busyRef.current) return
    busyRef.current = true
    setError('')
    setBusy(true)
    try {
      await onSubmit(new FormData(event.currentTarget))
      onClose()
    } catch (failure) {
      setError(failure.message || 'The change could not be saved.')
      busyRef.current = false
      setBusy(false)
    }
  }
  return <dialog ref={dialog} className={confirm ? 'confirmation' : 'drawer'} aria-labelledby="dialog-title"
    onCancel={event => { event.preventDefault(); if (!busyRef.current) onClose() }}>
    <form onSubmit={submit}>
      <header className="dialog-head"><h2 id="dialog-title">{title}</h2>
        <Button aria-label="Close dialog" icon="close" variant="quiet" disabled={busy} onClick={onClose} />
      </header>
      <div className="dialog-body">{children}{error && <p ref={alert} className="error" role="alert">{error}</p>}</div>
      <footer className="dialog-foot"><Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
      </footer>
    </form>
  </dialog>
}
