import { useLayoutEffect, useId, useRef, useState } from 'react'
import { label } from './model'

export function Button({ children, tone = '', ...props }) {
  return <button type="button" className={['button', tone].filter(Boolean).join(' ')} {...props}>{children}</button>
}

export function PageHeader({ title, subtitle, children, leading }) {
  return <div className="page-heading">
    <div className="heading-copy">{leading}<div><h1>{title}</h1>{subtitle && <div className="subtitle">{subtitle}</div>}</div></div>
    {children && <div className="heading-actions">{children}</div>}
  </div>
}

export function Tile({ value, kind = 'people', category }) {
  const initials = value.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <span aria-hidden="true" className={'tile tile-' + kind} data-category={category}>{initials || '·'}</span>
}

export function Pill({ value }) {
  return <span className="pill" data-status={value}><span aria-hidden="true" />{label(value)}</span>
}

export function Search({ title, value, onChange, initialFocus }) {
  return <label className="search">
    <span aria-hidden="true" className="search-icon" />
    <span className="sr-only">{title}</span>
    <input type="search" data-initial-focus={initialFocus || undefined} placeholder={title} value={value} onChange={event => onChange(event.target.value)} />
  </label>
}

export function Table({ headers, children }) {
  return <div className="table-scroll"><table>
    <thead><tr>{headers.map((heading, index) => <th key={index} scope="col">{heading || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
    <tbody>{children}</tbody>
  </table></div>
}

export function Empty({ title, detail, children }) {
  return <div className="empty"><h2>{title}</h2>{detail && <p>{detail}</p>}{children}</div>
}

export function Modal({ title, onClose, children, drawer = false }) {
  const dialog = useRef(null)
  const heading = useId()
  useLayoutEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element.showModal()
    element.querySelector('[data-initial-focus]')?.focus()
    return () => {
      element.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return <dialog
    ref={dialog}
    className={drawer ? 'dialog drawer' : 'dialog'}
    aria-labelledby={heading}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}
  >
    <div className="dialog-content">
      <header className="dialog-header"><h2 id={heading}>{title}</h2><button type="button" className="close" aria-label="Close" onClick={onClose}>×</button></header>
      {children}
    </div>
  </dialog>
}

export function Confirm({ title, description, actionLabel, dangerous, onConfirm, onClose }) {
  const [error, setError] = useState('')
  return <Modal title={title} onClose={onClose}>
    <div className="dialog-body"><p>{description}</p>{error && <p className="error" role="alert">{error}</p>}</div>
    <footer className="dialog-footer">
      <Button data-initial-focus onClick={onClose}>Cancel</Button>
      <Button tone={dangerous ? 'danger' : 'primary'} onClick={async () => {
        const result = await onConfirm()
        if (result) setError(result)
        else onClose()
      }}>{actionLabel}</Button>
    </footer>
  </Modal>
}

const pageSize = 12

export function Paged({ rows, children }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const start = current * pageSize
  return <>
    {children(rows.slice(start, start + pageSize))}
    <div className="table-footer">
      <span aria-live="polite">{rows.length ? (start + 1) + '–' + Math.min(start + pageSize, rows.length) + ' of ' + rows.length : '0 results'}</span>
      <div className="paging" aria-label="Pagination">
        <Button disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
        <span>Page {current + 1} of {pages}</span>
        <Button disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next</Button>
      </div>
    </div>
  </>
}
