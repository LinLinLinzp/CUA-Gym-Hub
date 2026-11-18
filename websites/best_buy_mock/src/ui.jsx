import { useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { date, itemName, items, label, money, orderName } from './model.js'

const paths = {
  overview: 'M3 10l9-7 9 7v10H3z M9 20v-6h6v6',
  orders: 'M4 7l8-4 8 4v10l-8 4-8-4z M4 7l8 4 8-4 M12 11v10 M8 5l8 4',
  match: 'M3 12l9-9h8v8l-9 9z M16 7h.01',
  protection: 'M12 3l8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6z M9 12l2 2 4-4',
  returns: 'M9 5l-5 5 5 5 M4 10h11a5 5 0 0 1 0 10h-4',
  arrow: 'M4 12h15 M14 7l5 5-5 5',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13 M16 16l4 4',
  close: 'M6 6l12 12 M18 6 6 18',
  check: 'M5 12l4 4L19 6',
}
export function Icon({ name }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}

export const accountLinks = [
  ['Overview', '/', 'overview'],
  ['Orders', '/orders', 'orders'],
  ['Price match', '/price-match', 'match'],
  ['Protection plans', '/protection-plans', 'protection'],
  ['Returns', '/returns', 'returns'],
]

export function SiteLink({ to, nav = false, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}
export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function Heading({ title, children, action }) {
  return <header className="page-heading"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</header>
}
export function Back({ to, children }) {
  return <SiteLink className="back" to={to}><span aria-hidden="true">←</span> {children}</SiteLink>
}
export function Badge({ status }) {
  return <span className={'badge ' + (status || '')}>{label(status)}</span>
}
export function Empty({ children, action }) {
  return <div className="empty"><p>{children}</p>{action}</div>
}
export function Missing({ title, to, link }) {
  return <><Back to={to}>{link}</Back><Heading title={title} /><Empty>This record is unavailable.</Empty></>
}
export function Thumb({ item }) {
  const key = item?.imageKey || 'device'
  return <span className={'thumb thumb-' + key} aria-hidden="true"><i /></span>
}
export function Facts({ values }) {
  return <dl className="facts">{values.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function OrderRow({ order }) {
  const lines = items(order)
  return <li className="order-row">
    <Thumb item={lines[0]} />
    <div className="row-primary"><SiteLink to={'/orders/' + encodeURIComponent(order.id)}>{orderName(order)}</SiteLink>
      <span>{lines.length ? lines.slice(0, 2).map(itemName).join(', ') : 'Item information unavailable'}{lines.length > 2 ? ' +' + (lines.length - 2) : ''}</span>
    </div>
    <div className="row-meta"><Badge status={order.status} /><span>{label(order.fulfillment)} · {date(order.createdAt)}</span></div>
    <strong className="row-amount">{money(order.total)}</strong>
    <SiteLink className="row-link" aria-label={'View order ' + orderName(order)} to={'/orders/' + encodeURIComponent(order.id)}><Icon name="arrow" /></SiteLink>
  </li>
}

export function Field({ label: name, id, error, hint, children }) {
  return <div className="field">
    <label htmlFor={id}>{name}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? id + '-error' : hint ? id + '-hint' : undefined })}
    {hint && <small id={id + '-hint'}>{hint}</small>}
    {error && <small className="field-error" id={id + '-error'} role="alert">{error}</small>}
  </div>
}
export function Select({ options, placeholder, ...props }) {
  return <select {...props}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((entry) => {
      const [value, text] = Array.isArray(entry) ? entry : [entry, entry]
      return <option key={value} value={value}>{text}</option>
    })}
  </select>
}
export function Search({ label: name, value, onChange, placeholder }) {
  return <Field label={name} id="search">{(props) => <div className="search"><Icon name="search" />
    <input {...props} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </div>}</Field>
}

export function Dialog({ title, onClose, children, wide = false }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} className={wide ? 'wide' : ''} aria-labelledby="dialog-heading" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading"><h2 id="dialog-heading">{title}</h2><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>
}

export function PrintButton({ children = 'Print receipt' }) {
  return <button type="button" className="secondary no-print" onClick={() => window.print()}>{children}</button>
}

