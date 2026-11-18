import React, { useEffect, useId, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'
import { date, money } from './model'

const paths = {
  overview: 'M3 10 12 3l9 7v10H3z M9 20v-6h6v6',
  autoship: 'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
  orders: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4m-9 4v10M7.5 5l9 4',
  pets: 'M12 11c-2.6 0-3.3 2.6-5.1 3.7C4 16.6 6 21 9.1 19.8c1.8-.7 4-.7 5.8 0 3.1 1.2 5.1-3.2 2.2-5.1C15.3 13.6 14.6 11 12 11z M3.2 10a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0z M7.5 6a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0z M13.5 6a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0z M17.8 10a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0z',
  returns: 'M8 6H4m0 0 4-4M4 6l4 4m0-4h6a6 6 0 0 1 0 12H6',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  left: 'M20 12H5m6-6-6 6 6 6',
  calendar: 'M3 6h18v15H3z M7 3v6m10-6v6M3 11h18',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  truck: 'M3 5h12v12H3z M15 9h4l3 4v4h-7 M6 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0z M16 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  product: 'M7 3h10l2 5v13H5V8z M5 8h14m-9 5h4m-5 4h6',
  foodBag: 'M6 3h12l-1 3 3 14H4L7 6z M7 6h10 M9 13c0-3 6-3 6 0l-3 3z',
  foodCan: 'M4 7v10c0 4 16 4 16 0V7 M20 7c0 4-16 4-16 0s16-4 16 0z M4 13c0 4 16 4 16 0',
  litter: 'M4 11h16l-2 7H6z M4 11l2-2 3 2 3-3 3 3 3-2 2 2 M9 14h.01M13 15h.01M17 13h.01',
  chew: 'M9 8c1-2-2-5-4-3-1 1-1 2-1 3-2 0-3 3-1 4 1 1 3 1 4 0l5 5c-1 1-1 3 0 4 2 2 5 0 5-2 1 0 3 0 3-2 1-3-2-4-4-3z',
  bottle: 'M9 7V3h6v4m-4 4h2m-1 2v4 M9 7l-3 4v8c0 1 1 2 2 2h8c1 0 2-1 2-2v-8l-3-4z',
  ball: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M7 5c0 6 6 12 12 12 M5 17c6 0 12-6 12-12',
  hay: 'M12 21V4M12 17C6 17 5 12 4 9c4 0 8 3 8 8z M12 14c0-4 4-7 8-7-1 4-2 7-8 7z',
  plus: 'M12 4v16M4 12h16',
}
export const Icon = ({ name, size = 20 }) => <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.product} /></svg>
export const SiteLink = ({ to, nav, ...props }) => {
  const Component = nav ? NavLink : Link
  return <Component {...props} to={withSid(to)} />
}
export const useSiteNavigate = () => {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export const routeId = (id) => encodeURIComponent(id)
export const ButtonLink = ({ primary, className = '', ...props }) => <SiteLink {...props} className={'button ' + (primary ? 'primary ' : '') + className} />
export const PageHeader = ({ title, description, children }) => <header className="page-heading"><div>
  <h1>{title}</h1>{description && <p>{description}</p>}
</div>{children}</header>
export const Back = ({ to, children }) => <SiteLink className="back" to={to}><Icon name="left" size={16} />{children}</SiteLink>
export function Labelled({ label, children, className = '' }) {
  const id = useId()
  return <label className={'field ' + className}><span id={id}>{label}</span>
    {React.Children.map(children, child => React.isValidElement(child) && ['input', 'select', 'textarea'].includes(child.type) && !child.props['aria-label']
      ? React.cloneElement(child, { 'aria-labelledby': id })
      : child)}
  </label>
}
export const Search = ({ label, value, onChange }) => <Labelled label={label} className="search-field">
  <Icon name="search" size={17} /><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={label} />
</Labelled>
export const Filter = ({ label, options, value, onChange }) => <Labelled label={label}><select value={value} onChange={e => onChange(e.target.value)}>
  {Object.entries(options).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
</select></Labelled>
export const statuses = {
  active: 'Active', cancelled: 'Canceled', canceled: 'Canceled', delivered: 'Delivered', processing: 'Processing',
  shipped: 'Shipped', removed: 'Removed', requested: 'Requested', in_transit: 'In transit', refunded: 'Refunded',
}
export const Badge = ({ status }) => <span className={'badge ' + (status || '')}><i />{statuses[status] || status || 'Status unavailable'}</span>
export const Empty = ({ title, children }) => <div className="empty"><strong>{title}</strong>{children}</div>
export const Missing = ({ to, label, title = 'We couldn’t find that page' }) => <>
  <PageHeader title={title} /><section className="card empty"><p>Use the link below to get back to your account.</p><ButtonLink to={to}>{label}</ButtonLink></section>
</>
export const ErrorText = ({ children }) => children ? <p className="error" role="alert">{children}</p> : null

export function Dialog({ title, confirm, danger, onClose, onSubmit, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const focus = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (focus?.isConnected) focus.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <form onSubmit={event => { event.preventDefault(); onSubmit() }}>
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-content">{children}</div>
      <div className="actions dialog-actions">
        <button type="button" onClick={onClose}>Cancel</button>
        <button className={danger ? 'danger' : 'primary'} type="submit">{confirm}</button>
      </div>
    </form>
  </dialog>
}

export function Portrait({ species, className = '' }) {
  const kind = String(species || '').toLowerCase().replaceAll(' ', '-')
  const animal = ['dog', 'cat', 'rabbit', 'bird'].includes(kind) ? kind : 'small-pet'
  return <div className={'portrait ' + animal + ' ' + className} aria-hidden="true">
    <div className="animal"><i className="ear ear-left" /><i className="ear ear-right" /><div className="face"><i className="eyes" /><i className="muzzle" /></div></div>
  </div>
}

export function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <i className="art-dot dot-one" /><i className="art-dot dot-two" /><i className="art-dot dot-three" /><i className="art-star">✦</i>
    <div className="art-ground" /><Portrait species="Dog" className="hero-dog" /><Portrait species="Cat" className="hero-cat" />
    <div className="art-parcel"><span /><Icon name="pets" size={31} /></div>
  </div>
}

export function ProductLine({ item, children, price = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0) }) {
  const art = String(item.imageKey || '').replace(/[^a-zA-Z_-]/g, '')
  const icon = { dog_food: 'foodBag', cat_food: 'foodCan', litter: 'litter', chews: 'chew',
    grooming: 'bottle', toys: 'ball', small_pet: 'hay', supplies: 'product' }[art]
  return <div className="product-line">
    <span className={'product-art ' + art}><Icon name={icon || 'orders'} size={24} /></span>
    <div className="product-copy"><strong>{item.name || 'Item'}</strong>
      <small>{[item.variant, item.quantity != null ? 'Qty ' + item.quantity : '', item.unitPrice != null ? money(item.unitPrice) + ' each' : ''].filter(Boolean).join(' · ')}</small>
      {children}
    </div><strong className="amount">{money(price)}</strong>
  </div>
}

export function Address({ address }) {
  return address ? <address>{[address.recipient, address.line1, address.line2, [address.city, address.region].filter(Boolean).join(', ') + (address.postalCode ? ' ' + address.postalCode : '')].filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}</address>
    : <p className="muted">Address unavailable</p>
}

export function Totals({ rows, total, label = 'Total' }) {
  return <dl className="totals">
    {rows.map(([name, amount]) => <div key={name}><dt>{name}</dt><dd>{money(amount)}</dd></div>)}
    <div className="grand-total"><dt>{label}</dt><dd>{money(total)}</dd></div>
  </dl>
}
export const DateText = ({ value }) => <time dateTime={value || undefined}>{date(value)}</time>

