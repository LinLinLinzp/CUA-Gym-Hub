import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

const AccountContext = createContext(null)

export function AccountProvider({ initialData, children }) {
  const current = useRef(initialData)
  const [data, setData] = useState(initialData)
  const [message, setMessage] = useState('')

  function commit(update, confirmation) {
    const now = new Date().toISOString()
    const previous = current.current
    const next = update(previous, { now, actorId: previous.rider?.id ?? null })
    if (next === previous) return false
    saveState('uber', next)
    current.current = next
    setData(next)
    setMessage(confirmation)
    return true
  }

  return <AccountContext.Provider value={{ data, commit, message, dismiss: () => setMessage('') }}>
    {children}
  </AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}

export const records = (items) => Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
export const byId = (items, id) => id == null ? undefined : records(items).find((item) => item.id === id)
export const routeId = (id) => encodeURIComponent(id)
export function newId(prefix) {
  const parts = crypto.getRandomValues(new Uint32Array(4))
  return prefix + '_' + Array.from(parts, (part) => part.toString(16).padStart(8, '0')).join('-')
}
export const finite = (value) => value != null && value !== '' && Number.isFinite(Number(value))
export const cents = (value) => finite(value) ? Math.round(Number(value) * 100) : 0

export function money(amount, currency = 'USD') {
  if (!finite(amount)) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
  } catch {
    return Number(amount).toFixed(2)
  }
}

export function date(value, timeZone) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return '—'
  const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: timeZone || 'UTC' }
  try {
    return parsed.toLocaleDateString('en-US', options)
  } catch {
    return parsed.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
  }
}

export const newest = (items, field) => [...records(items)].sort((a, b) => String(b[field] ?? '').localeCompare(String(a[field] ?? '')))
export const matches = (query, ...fields) => {
  const text = fields.filter(Boolean).join(' ').toLowerCase()
  return query.trim().toLowerCase().split(/\s+/).every((word) => text.includes(word))
}
export const label = (value) => value ? String(value).replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase()) : '—'
export const paymentLabel = (payment) => payment ? [payment.brand, payment.last4 && '•••• ' + payment.last4].filter(Boolean).join(' ') || '—' : '—'
export const tripLabel = (trip) => trip?.destination || 'Trip destination unavailable'
export function relatedReceipt(data, trip) {
  if (!trip) return undefined
  const linked = byId(data.receipts, trip.receiptId)
  if (linked && (!linked.tripId || linked.tripId === trip.id)) return linked
  return records(data.receipts).find(receipt => receipt.tripId === trip.id)
}
export const refundableLines = (receipt) => records(receipt?.lineItems).filter((line) => line.id && cents(line.amount) > 0)
export const isChargeEligible = (data, trip) => {
  const receipt = relatedReceipt(data, trip)
  return Boolean(receipt?.id && cents(receipt.total) > 0 && refundableLines(receipt).length)
}
