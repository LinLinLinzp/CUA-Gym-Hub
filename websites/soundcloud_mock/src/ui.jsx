import { cloneElement, useEffect, useId, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { withSid } from './utils/dataManager'

export const SiteLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export function useSiteNavigate() {
  const navigate = useNavigate()
  return (to) => navigate(withSid(to))
}

export function Artwork({ artworkKey, className = '' }) {
  const hash = artworkKey ? [...String(artworkKey)].reduce((sum, character) => sum * 31 + character.charCodeAt(0) | 0, 0) : 0
  return <span aria-hidden="true" className={'art art-' + (artworkKey ? 1 + Math.abs(hash) % 6 : 0) + ' ' + className} />
}

export function Badge({ visibility }) {
  return <span className={'badge ' + (visibility === 'private' ? 'private' : '')}>{visibility === 'private' ? 'Private' : visibility === 'public' ? 'Public' : 'Unspecified'}</span>
}

export function PageHeading({ title, description, action }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action}
  </div>
}

export function Back({ to, children }) {
  return <SiteLink className="back" to={to}><ArrowLeft size={16} />{children}</SiteLink>
}

export const Empty = ({ children }) => <div className="empty">{children}</div>
export const ErrorMessage = ({ children }) => children ? <p className="error" role="alert">{children}</p> : null

export function Field({ name, children, hint, icon: Icon }) {
  const id = useId()
  const hintId = hint ? id + '-hint' : undefined
  const control = cloneElement(children, { id, 'aria-describedby': hintId })
  return <div className="field">
    <label htmlFor={id}>{name}</label>
    {Icon ? <span className="search"><Icon size={16} aria-hidden="true" />{control}</span> : control}
    {hint && <small id={hintId}>{hint}</small>}
  </div>
}

export function Privacy({ value, onChange, label = 'Visibility' }) {
  return <Field name={label}><select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="public">Public</option><option value="private">Private</option>
  </select></Field>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <h2>{title}</h2>{children}
  </dialog>
}
