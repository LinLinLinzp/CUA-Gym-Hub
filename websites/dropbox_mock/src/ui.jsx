import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ChevronRight, MoreHorizontal, X } from 'lucide-react'
import { ancestry, routeFor } from './model'
import { withSid } from './utils/dataManager'

export function Empty({ title, text, action }) {
  return <section className="empty"><Archive aria-hidden="true" size={26} /><h2>{title}</h2>{text && <p>{text}</p>}{action}</section>
}

export function Missing({ title = 'Item unavailable', to = '/files', label = 'All files' }) {
  return <Empty title={title} text="Return to the workspace to continue." action={<Link className="button" to={withSid(to)}>{label}</Link>} />
}

export const userName = (state, id) => state.users.find(user => user.id === id)?.name || (id?.startsWith('external:') ? id.slice(9) : 'Workspace member')
export const dateLabel = date => {
  const time = new Date(date)
  return date && Number.isFinite(time.getTime()) ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(time) : '—'
}
export const timeLabel = date => {
  const time = new Date(date)
  return date && Number.isFinite(time.getTime()) ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(time) : '—'
}
export const sizeLabel = bytes => {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 ** 2).toFixed(1) + ' MB'
}

export function Breadcrumbs({ state, parentId, last }) {
  const { items } = ancestry(state, parentId)
  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    <Link to={withSid('/files')}>All files</Link>
    {items.map(folder => <span key={folder.id}><ChevronRight size={13} /><Link to={withSid(routeFor(folder))}>{folder.name || 'Untitled folder'}</Link></span>)}
    {last && <span><ChevronRight size={13} /><span aria-current="page">{last}</span></span>}
  </nav>
}

export function FileMark({ item }) {
  const kind = item.kind === 'folder' ? 'folder' : item.mimeType?.startsWith('image/') ? 'image' : /text|pdf/.test(item.mimeType || '') ? 'document' : 'file'
  const shapes = {
    folder: <path d="M2.5 5h5l1.8 2h6.2v8H2.5z" />,
    image: <><rect x="2.5" y="3" width="13" height="12" rx="1.5" /><circle cx="7" cy="7" r="1" /><path d="m4 13 3-3 2 2 2.5-3 2.5 4" /></>,
    document: <><path d="M4 2.5h7l3 3v10H4z" /><path d="M10.5 3v3h3M6.5 9h5M6.5 12h5" /></>,
    file: <><path d="M4 2.5h7l3 3v10H4z" /><path d="M10.5 3v3h3" /></>,
  }
  return <span className={'file-mark ' + kind} aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg>
  </span>
}
export function PageHeading({ title, subtitle, children }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children && <div className="actions">{children}</div>}</div>
}

export function RowMenu({ label, children }) {
  const ref = useRef()
  useEffect(() => {
    function outside(event) {
      if (!ref.current?.contains(event.target) && ref.current) ref.current.open = false
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return <details className="row-menu" ref={ref} onKeyDown={event => {
    if (event.key === 'Escape') {
      ref.current.open = false
      ref.current.querySelector('summary').focus()
    }
  }}>
    <summary className="icon-button" aria-label={'Actions for ' + label}><MoreHorizontal size={20} /></summary>
    <div className="menu-options" onClick={event => {
      if (event.target.closest('button, a')) {
        ref.current.open = false
        ref.current.querySelector('summary').focus()
      }
    }}>{children}</div>
  </details>
}

export function Dialog({ title, onClose, children, busy = false, wide = false }) {
  const ref = useRef()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-autofocus]')?.focus()
    return () => {
      dialog.close()
      const target = previous?.closest('.menu-options')?.parentElement.querySelector('summary') || previous
      if (target?.isConnected) target.focus()
    }
  }, [])
  return <dialog ref={ref} aria-label={title} className={wide ? 'wide' : undefined} onCancel={event => {
    event.preventDefault()
    if (!busy) onClose()
  }}><div className="dialog-header"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></div>{children}</dialog>
}

export function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function ErrorText({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null
}

export function DialogActions({ onClose, label, busy, disabled, danger }) {
  return <div className="dialog-actions"><button type="button" className="button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className={'button ' + (danger ? 'danger' : 'primary')} disabled={busy || disabled}>{busy ? 'Working…' : label}</button></div>
}

export function LinkCopy({ path, label = 'Copy link' }) {
  const ref = useRef()
  const [feedback, setFeedback] = useState('')
  const url = new URL(withSid(path), window.location.origin).href
  return <div className="link-copy">
    <div className="inline">
      <input ref={ref} aria-label="Link URL" readOnly value={url} onFocus={event => event.currentTarget.select()} />
      <button type="button" className="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setFeedback('Link copied.')
        } catch {
          ref.current.focus()
          ref.current.select()
          setFeedback('URL selected. Copy it to your clipboard.')
        }
      }}>{label}</button>
    </div>
    <span className="metadata" role="status">{feedback}</span>
    <a href={withSid(path)} target="_blank" rel="noopener">Open link <span aria-hidden="true">↗</span></a>
  </div>
}
