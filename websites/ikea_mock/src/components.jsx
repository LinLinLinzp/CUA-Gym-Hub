import React, { useEffect, useRef } from 'react'
import { ArrowLeft, ChevronRight, Package, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { dateText, list, money, orderLabel, slotText, statusLabel } from './utils/account.js'

export function AccountLink({ to, nav = false, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function useAccountNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function detailPath(collection, id) {
  return '/' + collection + '/' + encodeURIComponent(id)
}

export function Page({ title, description, back, action, children }) {
  return <div className="stack">
    <header className="page-heading">
      {back && <AccountLink className="back" to={back[0]}><ArrowLeft size={17} aria-hidden="true" />{back[1]}</AccountLink>}
      <div className="heading-line"><h1>{title}</h1>{action}</div>
      {description && <p>{description}</p>}
    </header>
    {children}
  </div>
}

export function Empty({ title, children, action }) {
  return <div className="card empty"><Package aria-hidden="true" /><h2>{title}</h2>
    {children && <p>{children}</p>}{action}</div>
}

export function Status({ value }) {
  const tone = ['delivered', 'collected', 'completed', 'refunded', 'scheduled'].includes(value) ? 'success'
    : ['preparing', 'on_the_way', 'requested', 'received'].includes(value) ? 'warning'
      : ['cancelled', 'declined'].includes(value) ? 'inactive' : 'neutral'
  return <span className={'status ' + tone}>{statusLabel(value)}</span>
}

const art = new Set(['living-room', 'shelving', 'seating', 'lighting', 'textiles', 'office', 'fallback'])
const categories = { Storage: 'shelving', Seating: 'seating', Lighting: 'lighting', Textiles: 'textiles', 'Home office': 'office' }

export function Photo({ imageKey, category, className = '' }) {
  const categoryKey = Object.hasOwn(categories, category) ? categories[category] : 'fallback'
  const key = art.has(imageKey) ? imageKey : categoryKey
  return <img className={'photo ' + className} src={'/art/' + key + '.png'} alt="" />
}

export function OrderRow({ order, product }) {
  const items = list(order.lines)
  return <AccountLink to={detailPath('orders', order.id)} className="record-row order-row">
    <Photo imageKey={product?.imageKey} category={product?.category} className="row-photo" />
    <span className="record-name"><strong>Order {orderLabel(order)}</strong><small>
      {[dateText(order.createdAt), items.length ? items.length + (items.length === 1 ? ' item type' : ' item types') : null].filter(Boolean).join(' · ')}
    </small></span>
    <Status value={order.status} /><strong className="row-amount">{money(order.totals?.total)}</strong>
    <ChevronRight className="row-chevron" size={18} aria-hidden="true" />
  </AccountLink>
}

export function ErrorText({ error }) {
  return error && <div className="inline-error" role="alert">{error}</div>
}

export function PriceSummary({ entries, totalLabel, total, children }) {
  return <aside className="card panel summary">
    <h2>{/refund/i.test(totalLabel) ? 'Refund summary' : 'Order summary'}</h2>
    <dl>{entries.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}
      <div className="total"><dt>{totalLabel}</dt><dd>{money(total)}</dd></div></dl>
    {children}
  </aside>
}

export function SlotChoices({ legend, slots, value, onChange, name, empty, fee }) {
  return <fieldset className="slot-field">
    <legend>{legend}</legend>
    {slots.length ? <div className="slots">{slots.map((slot) => <label key={slot.id} className={'slot' + (value === slot.id ? ' selected' : '')}>
      <input type="radio" name={name} value={slot.id} checked={value === slot.id} onChange={() => onChange(slot.id)} />
      <span>{slotText(slot)}{fee !== undefined && <small>{money(fee)}</small>}</span>
    </label>)}</div> : <p className="muted">{empty || 'No times are available for this schedule.'}</p>}
  </fieldset>
}

export function ConfirmDialog({ title, children, onClose, onConfirm, confirmLabel, error }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} aria-labelledby="confirmation-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="section-heading"><h2 id="confirmation-title">{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button>
    </div>
    {children}
    <ErrorText error={error} />
    <div className="actions"><button type="button" className="button secondary" onClick={onClose} autoFocus>Go back</button>
      <button type="button" className="button primary" onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>
}
