import { cloneElement, createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { FieldError, label, nameOf, roles } from './model.js'

const FormError = createContext(null)

const shapes = {
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></>,
  folder: <path d="M3 6h7l2 2h9v11H3z"/>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6m-6 4h6"/></>,
  textFile: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6m-6 3h6m-6 3h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  trash: <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v1"/></>,
  shield: <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/>,
  check: <path d="m5 12 4 4L19 6"/>,
}
export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>
}

export const RouteLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export function useRoute() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export const Chip = ({ status }) => <span className={`chip chip-${status}`}>{label(status)}</span>
export function Breadcrumbs({ folders = [], tail }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    <RouteLink to="/">All files</RouteLink>
    {folders.map(folder => <span key={folder.id}><Icon name="chevron" size={12} /><RouteLink to={`/folders/${encodeURIComponent(folder.id)}`}>{nameOf(folder)}</RouteLink></span>)}
    {tail && <span><Icon name="chevron" size={12} />{tail}</span>}
  </nav>
}

export function Heading({ overline, title, description, actions }) {
  return <header className="page-heading">
    <div>{overline && <div className="eyebrow">{overline}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="heading-actions">{actions}</div>}
  </header>
}

export function Empty({ title, children }) {
  return <div className="empty"><span className="empty-icon"><Icon name="file" size={22} /></span><h2>{title}</h2>{children && <div>{children}</div>}</div>
}

export function Dialog({ title, onClose, wide, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} className={wide ? 'wide' : ''} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-head"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>
}

export function Form({ onSave, onClose, action, danger, children }) {
  const [error, setError] = useState(null)
  return <form className="dialog-form" onChange={() => error && setError(null)} onSubmit={event => {
    event.preventDefault()
    try { onSave(new FormData(event.currentTarget)); setError(null) }
    catch (problem) { setError(problem) }
  }}>
    <FormError.Provider value={error}>{children}</FormError.Provider>
    {error && !error.field && <p className="error" role="alert">{error.message}</p>}
    <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className={danger ? 'danger' : 'primary'}>{action}</button></div>
  </form>
}

export function Field({ title, children, hint }) {
  const id = useId()
  const error = useContext(FormError)
  const invalid = error instanceof FieldError && Boolean(error.field) && error.field === children.props.name
  const describedBy = [hint && id + '-hint', invalid && id + '-error'].filter(Boolean).join(' ')
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    {cloneElement(children, { id, 'aria-describedby': describedBy || undefined, 'aria-invalid': invalid || undefined })}
    {invalid && <p className="error" id={id + '-error'} role="alert">{error.message}</p>}
    {hint && <small id={id + '-hint'}>{hint}</small>}
  </div>
}

export function InviteFields({ users, optional = false }) {
  const [text, setText] = useState('')
  const [suggest, setSuggest] = useState(false)
  const query = text.split(/[,;\n]/).at(-1).trim().toLowerCase()
  const matches = query ? users.filter(user => user.email && [user.name, user.email].some(value => value?.toLowerCase().includes(query))).slice(0, 6) : []
  return <>
    <div onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSuggest(false) }}>
      <Field title={optional ? 'Invite people (optional)' : 'People or email addresses'} hint="Separate multiple emails with commas.">
        <textarea name="recipients" rows="2" required={!optional} placeholder="Search names or enter email addresses" value={text}
          onFocus={() => setSuggest(true)} onChange={event => { setText(event.target.value); setSuggest(true) }} />
      </Field>
      {suggest && matches.length > 0 && <ul className="suggestions">{matches.map(user => <li key={user.id}><button type="button" onClick={() => {
        const parts = text.split(/[,;\n]/)
        parts[parts.length - 1] = user.email
        setText(parts.map(part => part.trim()).filter(Boolean).join(', ') + ', ')
        setSuggest(false)
      }}>{nameOf(user)} <small>{user.email}</small></button></li>)}</ul>}
    </div>
    <Field title="Role"><select name="role" defaultValue="viewer">{Object.entries(roles).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></Field>
    <Field title="Invitation message (optional)"><textarea name="message" rows="2" /></Field>
  </>
}

export function RowMenu({ items, name }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = event => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return <div ref={ref} className="row-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
    onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); ref.current.querySelector('button')?.focus() } }}>
    <button className="icon-button" type="button" aria-label={`Actions for ${name}`} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="more" /></button>
    {open && <div className="menu">{items.map(([title, action]) => <button key={title} type="button" onClick={() => { ref.current.querySelector('button')?.focus(); setOpen(false); action() }}>{title}</button>)}</div>}
  </div>
}



