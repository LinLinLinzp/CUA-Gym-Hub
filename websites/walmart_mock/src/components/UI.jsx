import { useEffect, useRef } from 'react'
import { ArrowLeft, Package, X } from 'lucide-react'
import { SiteLink } from '../utils/navigation.jsx'

export const encoded = value => encodeURIComponent(value ?? '')
export const label = value => String(value ?? '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())
export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
export const localImage = value => typeof value === 'string' && /^\/(?![\/\\])/.test(value) ? value : ''
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const displayDate = value => {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  return value && Number.isFinite(+date) ? dateFormatter.format(date) : 'Date unavailable'
}

export function ButtonLink({ children, kind = 'primary', className = '', ...props }) {
  return <SiteLink className={`button ${kind} ${className}`} {...props}>{children}</SiteLink>
}

export function Back({ to, children }) {
  return <SiteLink className="back-link" to={to}><ArrowLeft size={17} aria-hidden="true" />{children}</SiteLink>
}

export function Empty({ title, children, to, action }) {
  return <section className="panel empty">
    <Package size={32} aria-hidden="true" />
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {to && <ButtonLink to={to}>{action}</ButtonLink>}
  </section>
}

export function Missing({ name = 'Page', to = '/', action = 'Back to shop' }) {
  return <Empty title={`${name} unavailable`} to={to} action={action}>This record may have been removed or the link may be incomplete.</Empty>
}

export function Feedback({ children, success = false }) {
  if (!children) return null
  return <p className={`feedback ${success ? 'success' : 'error'}`} role={success ? 'status' : 'alert'}>{children}</p>
}

export function Photo({ path, title, className = '', ...props }) {
  return <img className={`product-photo ${className}`} src={localImage(path) || '/images/product-fallback.svg'} alt={title || ''} loading="lazy" decoding="async" onError={event => {
    if (!event.currentTarget.src.endsWith('/images/product-fallback.svg')) event.currentTarget.src = '/images/product-fallback.svg'
  }} {...props} />
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={event => {
    event.preventDefault()
    onClose()
  }}>
    <div className="dialog-title"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>
}

export function Badge({ status }) {
  const tone = ['placed', 'delivered', 'picked_up', 'completed', 'submitted', 'ready_for_pickup'].includes(status) ? 'success'
    : ['canceled', 'released', 'expired', 'unavailable'].includes(status) ? 'error' : 'warning'
  return status ? <span className={`badge ${tone}`}>{label(status)}</span> : null
}

export function Field({ label: title, help, children, className = '' }) {
  return <label className={`field ${className}`}><span>{title}</span>{children}{help && <small>{help}</small>}</label>
}

export function Address({ address }) {
  if (!address) return <p className="muted">Address unavailable</p>
  const locality = [address.city, [address.region, address.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return <address>{[address.recipient, address.line1, address.line2, locality].filter(Boolean).map((line, index) => <span key={index}>{line}</span>)}</address>
}

export function Totals({ totals }) {
  return <dl className="totals">
    <div><dt>Subtotal</dt><dd>{money(totals?.subtotal)}</dd></div>
    <div><dt>Fulfillment fees</dt><dd>{money(totals?.fulfillmentFee)}</dd></div>
    <div><dt>Estimated tax</dt><dd>{money(totals?.tax)}</dd></div>
    <div><dt>Total</dt><dd>{money(totals?.total)}</dd></div>
  </dl>
}
