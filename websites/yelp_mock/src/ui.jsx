import React, { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { businessName } from './model.js'

export function usePath() {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid')
  return path => {
    if (!sid) return path
    const [base, hash] = path.split('#')
    const [pathname, query] = base.split('?')
    const params = new URLSearchParams(query)
    params.set('sid', sid)
    return `${pathname}?${params}${hash ? `#${hash}` : ''}`
  }
}

export function SiteLink({ to, ...props }) {
  const path = usePath()
  return <Link to={path(to)} {...props} />
}

export function AccountLink({ to, ...props }) {
  const path = usePath()
  return <NavLink to={path(to)} {...props} />
}

export function useGo() {
  const navigate = useNavigate()
  const path = usePath()
  return destination => navigate(path(destination))
}

export const bizPath = id => `/biz/${encodeURIComponent(id)}`
export const subPath = (section, id) => `/account/${section}/${encodeURIComponent(id)}`

export function Icon({ name, size = 20 }) {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
    reviews: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
    bookmarks: 'M6 4h12v17l-6-4-6 4z',
    quotes: 'M4 4h16v13H9l-5 4z M8 9h8 M8 13h5',
    reservations: 'M4 6h16v14H4z M8 3v6 M16 3v6 M4 11h16 M8 15h2 M14 15h2',
    search: 'M15.5 15.5 21 21 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    pin: 'M12 22s7-8 7-13A7 7 0 0 0 5 9c0 5 7 13 7 13z M12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}

export function Heading({ title, children, actions, back }) {
  return <header className="page-heading">
    {back && <SiteLink to={back.to} className="back-link">← {back.label}</SiteLink>}
    <div className="heading-row"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{actions}</div>
  </header>
}

export function Empty({ title, children, to, label }) {
  return <div className="empty"><h2>{title}</h2>{children && <p>{children}</p>}
    {to && <SiteLink className="button" to={to}>{label}</SiteLink>}</div>
}

export function Status({ value, tone }) {
  const moods = { published: 'success', saved: 'success', confirmed: 'success', submitted: 'pending', cancelled: 'error' }
  const label = typeof value === 'string' && value ? value : 'Status unavailable'
  return <span className={`status ${tone || moods[label.toLowerCase()] || 'neutral'}`}>{label}</span>
}

export function Thumbnail({ business, large = false }) {
  const path = business?.imagePath
  const category = String(business?.category || '')
  const art = /caf[eé]|baker|coffee/i.test(category) ? 'cafe' : business?.kind === 'restaurant' ? 'restaurant' :
    business?.kind === 'service' || business?.quoteServices?.length ? 'service' : 'shop'
  const fallback = `/art/${art}.webp`
  const local = typeof path === 'string' && /^\/(?!\/)[\w/-]+\.(?:webp|png|jpe?g|avif|gif)$/i.test(path)
  return <img className={large ? 'listing-art' : 'thumbnail'} alt="" src={local ? path : fallback}
    onError={event => { if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback }} />
}

export function BusinessLink({ business }) {
  return business ? <SiteLink to={bizPath(business.id)}>{businessName(business)}</SiteLink> : businessName(business)
}

export function Row({ business, title, children, actions, icon }) {
  return <article className="record-row">
    {icon ? <span className="row-icon"><Icon name={icon} /></span> : <Thumbnail business={business} />}
    <div className="record-body"><h3>{title}</h3>{children}</div>
    {actions && <div className="row-actions">{actions}</div>}
  </article>
}

export function Tabs({ values, selected, onSelect, label }) {
  return <div className="tabs" role="group" aria-label={label}>
    {values.map(value => <button key={value} type="button" aria-pressed={selected === value}
      onClick={() => onSelect(value)}>{value}</button>)}
  </div>
}

export function Field({ label, name, error, children }) {
  return <div className="field">
    <label htmlFor={name}>{label}</label>
    {React.cloneElement(children, { id: name, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${name}-error` : undefined })}
    {error && <span className="field-error" id={`${name}-error`}>{error}</span>}
  </div>
}

export function Dialog({ title, close, children }) {
  const ref = useRef(null)
  const opener = useRef(document.activeElement)
  useEffect(() => {
    const dialog = ref.current
    const trigger = opener.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected && trigger !== document.body) trigger.focus()
      else document.getElementById('content')?.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close() }}>
    <div className="dialog-inner">
      <div className="dialog-header"><h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-button" onClick={close} aria-label="Close dialog">×</button></div>
      {children}
    </div>
  </dialog>
}

export function Confirm({ title, children, close, onConfirm, label }) {
  return <Dialog title={title} close={close}>
    <p>{children}</p><div className="form-actions">
      <button type="button" onClick={close}>Keep it</button>
      <button type="button" className="primary" onClick={onConfirm}>{label}</button>
    </div>
  </Dialog>
}
