import { createContext, useContext } from 'react'

export const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

export const list = (value) => Array.isArray(value) ? value : []
export const recordLines = (record) => list(record.lines)
export const text = (value) => value == null || value === '' ? '—' : String(value)
export const label = (value) => value ? String(value).replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase()) : 'Unknown'
export const money = (value) => typeof value === 'number' && Number.isFinite(value) ? usd.format(value) : '—'
export const cents = (value) => Math.round(value * 100)
export const date = (value) => value && Number.isFinite(Date.parse(value)) ? dates.format(new Date(value)) : '—'
export const matches = (query, ...values) => values.some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const route = (section, id) => '/' + section + '/' + encodeURIComponent(id)
export const openOrders = (order) => ['new', 'acknowledged'].includes(order.status)
export const remaining = (line) => line.quantity - (line.refundedQuantity ?? 0)
export const actionId = (prefix) => prefix + '-' + Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
export const categories = ['Kitchen & Dining', 'Home Organization', 'Outdoor', 'Office', 'Pet Supplies']
export const artKeys = ['kitchen', 'home', 'outdoor', 'office', 'pet']

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dates = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
