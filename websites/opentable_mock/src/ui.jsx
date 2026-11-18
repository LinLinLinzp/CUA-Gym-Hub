import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

export function AccountLink({ to, ...props }) {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid')
  const url = new URL(to, window.location.origin)
  if (sid) url.searchParams.set('sid', sid)
  return <Link to={url.pathname + url.search + url.hash} {...props} />
}

export function Heading({ title, action, children }) {
  return <header className="page-heading"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</header>
}

export function Empty({ title, action, children }) {
  return <div className="empty surface"><h2>{title}</h2>{children && <p>{children}</p>}{action}</div>
}

export function Tabs({ label, options, value, onChange }) {
  return <div className="tabs" role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option} aria-pressed={option === value} onClick={() => onChange(option)}>{option}</button>)}
  </div>
}

export function Photo({ restaurant, className = '', eager = false }) {
  const [failed, setFailed] = useState(null)
  const src = restaurant?.image
  const local = typeof src === 'string' && /^\/(images|files)\/[\w./-]+$/.test(src) && !src.includes('..')
  return <div className={'photo ' + className} aria-hidden="true">
    {local && failed !== src && <img alt="" src={src} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(src)} />}
  </div>
}

export function Dialog({ title, onClose, children }) {
  const id = useId()
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return <dialog ref={ref} aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="dialog-header"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>
}

export function ErrorMessage({ children }) {
  return children ? <p role="alert" className="error">{children}</p> : null
}
