
import React, { createContext, useContext, useId, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export const AccountContext = createContext(null)
export const useAccount = () => useContext(AccountContext)
export const records = (value) => Array.isArray(value) ? value.filter((record) => record && typeof record === 'object') : []
export const find = (value, id) => records(value).find((record) => String(record.id) === String(id))
export const replace = (value, id, change) => value.map((record) => record && String(record.id) === String(id) ? change(record) : record)
export const route = (base, id) => base + '/' + encodeURIComponent(id)
export const newId = (prefix) => prefix + '-' + Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
  byte.toString(16).padStart(2, '0')).join('')
export const stamp = (state) => ({ actorId: state.account?.id, createdAt: new Date().toISOString() })

export const label = (value) => value ? String(value).replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase()) : 'Unknown'
export const matches = (query, ...values) => values.some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const money = (value) => value == null || value === '' || !Number.isFinite(Number(value))
  ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100
export const validPrice = (value) => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
export const whole = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0
export const date = (value, time = false) => {
  const parsed = new Date(value || '')
  return Number.isNaN(parsed.valueOf()) ? 'Date unavailable'
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...(time && { hour: 'numeric', minute: '2-digit' }) })
}
export const latest = (collection, field = 'createdAt') => records(collection).slice()
  .sort((a, b) => (Date.parse(b[field]) || 0) - (Date.parse(a[field]) || 0))
export const active = (collection) => records(collection).filter((record) => !record.status || record.status === 'active')
export const orderName = (order) => order?.orderNumber || order?.id || 'Order details unavailable'
export const storeName = (state, id) => find(state.stores, id)?.name || 'Store details unavailable'
export const fulfillmentLabels = { ship_to_home: 'Ship to home', store_pickup: 'Store pickup', in_store: 'In store' }
export const methodLabels = { in_store: 'In-store drop-off', mail: 'Mail return' }

export function AppLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useAccountNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Heading({ title, intro, back, action }) {
  return <header className="page-heading">
    {back && <AppLink className="back" to={back.to}>← {back.label}</AppLink>}
    <div className="heading-row">
      <div><h1>{title}</h1>{intro && <p>{intro}</p>}</div>
      {action}
    </div>
  </header>
}

export function Status({ value }) {
  return <span className={'status status-' + (value || 'unknown')}>{label(value)}</span>
}

export function Field({ label: title, children }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{title}</label>{React.cloneElement(children, { id })}</div>
}

export function SelectOptions({ options }) {
  return Object.entries(options).map(([key, title]) => <option key={key} value={key}>{title}</option>)
}

export function ErrorMessage({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null
}

export function Empty({ title, children }) {
  return <div className="panel empty"><h2>{title}</h2>{children && <div>{children}</div>}</div>
}

export function Missing({ title = 'We couldn’t find that page.', to = '/', link = 'Back to Overview' }) {
  return <><Heading title={title} /><AppLink className="button secondary" to={to}>{link}</AppLink></>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()

  useLayoutEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  function keepFocus(event) {
    if (event.key !== 'Tab') return
    const controls = [...ref.current.querySelectorAll('button, input, select, textarea, a[href]')]
      .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length)
    const edge = event.shiftKey ? controls[0] : controls.at(-1)
    if (edge && document.activeElement === edge) {
      event.preventDefault()
      const target = event.shiftKey ? controls.at(-1) : controls[0]
      target.focus()
    }
  }

  return <dialog ref={ref} aria-labelledby={titleId} onKeyDown={keepFocus} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2>
      <button className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>
}

export function Metric({ title, children }) {
  return <div className="metric"><dt>{title}</dt><dd>{children}</dd></div>
}

export function ResultCount({ count, singular, plural = singular + 's', reset }) {
  return <div className="result-count"><span role="status">{count} {count === 1 ? singular : plural}</span>
    {reset && <button className="text-button" onClick={reset}>Reset filters</button>}
  </div>
}
