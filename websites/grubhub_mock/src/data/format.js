export const list = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

export const money = value => value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : dollars.format(Number(value))
export const dateLabel = value => Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : 'Date unavailable'
export const timeValue = value => Date.parse(value) || 0
export const searchable = (...parts) => parts.filter(Boolean).join(' ').toLowerCase()
export const paymentLabel = payment => payment?.last4 ? `${payment.brand || 'Card'} ending in ${String(payment.last4).slice(-4)}` : 'Payment details unavailable'
export const addressLine = address => [address?.street, address?.unit].filter(Boolean).join(', ')
export const addressCity = address => [address?.city, [address?.state, address?.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
export const orderHref = id => `/orders/${encodeURIComponent(id)}`
export const refundHref = id => `/refunds/${encodeURIComponent(id)}`
export const restaurantHref = id => `/restaurants/${encodeURIComponent(id)}`
export const timingPath = (to, scheduled) => scheduled ? `${to}?timing=scheduled` : to
export const restaurantFor = (state, restaurantId) => restaurantId && list(state.restaurants).find(restaurant => restaurant.id === restaurantId)
export const orderName = (order, restaurant) => order?.restaurantName || restaurant?.name || 'Restaurant unavailable'

export function windowLabel(window, { timeOnly = false } = {}) {
  const start = Date.parse(window?.windowStartAt)
  const end = Date.parse(window?.windowEndAt)
  if (!(end > start)) return 'Window unavailable'
  const timeZone = window.timeZone || 'America/New_York'
  try {
    const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
    const range = clock.formatRange(start, end)
    const zone = new Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZone, timeZoneName: 'short' })
      .formatToParts(start).find(part => part.type === 'timeZoneName').value
    if (timeOnly) return `${range} ${zone}`
    const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone })
    return `${day.format(start)} · ${range} ${zone}`
  } catch (error) {
    if (error instanceof RangeError) return 'Window unavailable'
    throw error
  }
}

const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
export const dayLabel = value => dayFormat.format(new Date(`${value}T00:00:00Z`))
