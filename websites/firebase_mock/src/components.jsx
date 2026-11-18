import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { withSid } from './utils/dataManager'

export function WorkspaceLink({ to, tab = false, ...props }) {
  const Component = tab ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function ViewHeader({ title, description, children }) {
  return <header className="view-header">
    <div><h1 tabIndex={-1} id="view-title">{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="actions">{children}</div>}
  </header>
}

export function Field({ label, error, children }) {
  const id = useId()
  return <div className="form-field">
    <label htmlFor={id}>{label}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
    {error && <span id={`${id}-error`} className="field-error" role="alert">{error}</span>}
  </div>
}

export function Search({ label, value, onChange, placeholder }) {
  return <Field label={label}>{(props) => <input {...props} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}</Field>
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function Modal({ title, onClose, children, wide = false }) {
  const id = useId()
  const dialog = useRef(null)
  useLayoutEffect(() => {
    const node = dialog.current
    const opener = document.activeElement
    node.showModal()
    return () => {
      node.close()
      // A successful deletion can remove the opener in the same render.
      requestAnimationFrame(() => {
        if (document.querySelector('dialog[open]')) return
        if (opener instanceof HTMLElement && opener.isConnected && !opener.matches(':disabled')) opener.focus()
        else document.getElementById('view-title')?.focus()
      })
    }
  }, [])
  return <dialog ref={dialog} className={wide ? 'wide-dialog' : undefined} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="dialog-heading">
      <h2 id={id}>{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button>
    </header>
    {children}
  </dialog>
}

export function DialogActions({ onClose, submit, danger = false }) {
  return <footer className="dialog-actions">
    <button autoFocus={danger} type="button" onClick={onClose}>Cancel</button>
    <button type="submit" className={danger ? 'danger' : 'primary'}>{submit}</button>
  </footer>
}

export function Confirm({ title, description, label, danger, onClose, onConfirm }) {
  return <Modal title={title} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onConfirm() }}>
      <p className="dialog-copy">{description}</p>
      <DialogActions onClose={onClose} submit={label} danger={danger} />
    </form>
  </Modal>
}

export function usePagination(rows, size = 12) {
  const [requestedPage, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const page = Math.min(requestedPage, pages)
  useEffect(() => { if (requestedPage > pages) setPage(pages) }, [pages, requestedPage])
  const start = (page - 1) * size
  return { page, pages, setPage, start, total: rows.length, rows: rows.slice(start, start + size) }
}

export function Pagination({ pager, label }) {
  const { page, pages, setPage, start, total, rows } = pager
  if (!total) return null
  return <div className="pager" aria-label={`${label} pagination`}>
    <span>{start + 1}–{start + rows.length} of {total} {label}</span>
    <div className="actions">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </div>
}
