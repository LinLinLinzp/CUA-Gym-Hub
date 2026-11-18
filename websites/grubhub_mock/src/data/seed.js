import { catalog, neighborhoods } from './catalog.js'
import { cents, receiptItems, totalsFor, unitAmount } from './money.js'
import { availableDays } from './scheduling.js'

const idFor = (type, index) => `${type}-${String(index + 1).padStart(3, '0')}`
const hour = 3600000
const day = 24 * hour
const iso = timestamp => new Date(timestamp).toISOString()

const account = {
  id: 'diner-001', name: 'Maya Torres', email: 'maya.torres@example.test',
  defaultAddressId: 'address-home', defaultPaymentId: 'payment-visa',
  addresses: [
    { id: 'address-home', label: 'Home', street: '18 Sample Lane', unit: 'Apt 4B', city: 'Brooklyn', state: 'NY', postalCode: '11215', instructions: 'Leave at apartment door.' },
    { id: 'address-work', label: 'Work', street: '240 Example Avenue', unit: 'Suite 300', city: 'Brooklyn', state: 'NY', postalCode: '11217', instructions: 'Meet at the lobby desk.' },
  ],
  paymentMethods: [
    { id: 'payment-visa', brand: 'Visa', last4: '4242' },
    { id: 'payment-mastercard', brand: 'Mastercard', last4: '8603' },
  ],
}

export function emptyCart() {
  return { restaurantId: null, sourceOrderId: null, items: [], updatedAt: null, updatedBy: null }
}

export function createInitialData(now = new Date()) {
  const anchor = now.getTime()
  const restaurants = catalog.map(([name, cuisine, tile], index) => ({
    id: idFor('restaurant', index), name, cuisine, tile, neighborhood: neighborhoods[index % neighborhoods.length],
    timeZone: 'America/New_York', deliveryFee: [2.49, 1.99, 2.99, 3.49][index % 4], serviceFee: [1.76, 1.5, 1.85][index % 3],
    taxRate: 0.08875,
    deliveryHours: [{
      days: index === 11 ? [0, 1, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6],
      opensAt: ['11:30', '12:00', '11:00'][index % 3], closesAt: ['21:00', '22:30', '20:30'][index % 3],
    }],
  }))
  const menuItems = catalog.flatMap((entry, index) => entry.slice(3).map((name, item) => ({
    id: idFor('menu', index * 5 + item), restaurantId: restaurants[index].id, name,
    category: item < 3 ? 'Mains' : 'Sides',
    unitPrice: index === 0 ? [12.5, 11.75, 12, 6, 3.75][item] : ([1250, 1425, 1325, 550, 475][item] + (index % 5) * 125) / 100,
    available: item !== 3 || index % 6 !== 4,
  })))

  function order(index, restaurantIndex, status, time, scheduleId) {
    const restaurant = restaurants[restaurantIndex]
    const first = index === 0 ? 0 : index % 3
    const items = [first, 3 + index % 2].map((item, line) => {
      const menu = menuItems[restaurantIndex * 5 + item]
      return { name: menu.name, menuItemId: menu.id, unitPrice: menu.unitPrice, quantity: line === 0 && index % 3 === 0 ? 2 : 1 }
    })
    const id = idFor('order', index)
    const totals = totalsFor(items, restaurant, index % 4 === 0 ? 400 : 300)
    return {
      id, restaurantId: restaurant.id, restaurantName: restaurant.name, actorId: account.id, createdAt: iso(time),
      currency: 'USD', fulfillment: 'delivery', timing: scheduleId ? 'scheduled' : 'asap', status,
      items: receiptItems(id, items, totals), totals,
      address: { ...account.addresses[index % 7 === 4 ? 1 : 0] },
      payment: { ...account.paymentMethods[index % 5 === 3 ? 1 : 0] },
      ...(scheduleId && { scheduledDeliveryId: scheduleId }),
      ...(status === 'delivered' && { deliveredAt: iso(time + hour) }),
      ...(status === 'cancelled' && { cancelledAt: iso(time + hour / 4) }),
    }
  }

  const orders = Array.from({ length: 36 }, (_, index) => {
    const status = index < 29 ? 'delivered' : index < 34 ? 'placed' : 'cancelled'
    const offset = status === 'placed' ? (index - 28) * hour : (index + 1) * day
    return order(index, index % restaurants.length, status, anchor - offset)
  })
  const scheduledDeliveries = Array.from({ length: 24 }, (_, index) => {
    const restaurantIndex = index < 4 ? [0, 5, 3, 6][index] : (index + 3) % restaurants.length
    const restaurant = restaurants[restaurantIndex]
    const future = index < 4
    const date = future ? now : new Date(anchor - (index + 5) * day)
const options = availableDays(restaurant, date).slice(1)
    const desired = options[future ? index % 2 : 0]
    const windows = desired?.windows.length ? desired.windows : options.find(entry => entry.windows.length).windows
    const slot = windows[(index * 3 + 2) % windows.length]
    const start = Date.parse(slot.windowStartAt)
    const status = future ? 'scheduled' : index < 20 ? 'fulfilled' : 'cancelled'
    const id = idFor('schedule', index)
    const created = future ? anchor - (index + 1) * hour : start - 2 * day
    const linked = order(index + 36, restaurantIndex, status === 'fulfilled' ? 'delivered' : status, created, id)
    if (status === 'fulfilled') linked.deliveredAt = iso(start + 30 * 60000)
    if (status === 'cancelled') linked.cancelledAt = iso(start - 6 * hour)
    orders.push(linked)
    const original = index === 7 ? windows.find(window => window !== slot) : slot
    const events = [{ id: `${id}-event-01`, type: 'created', to: original, actorId: account.id, createdAt: linked.createdAt }]
    if (index === 7) events.push({ id: `${id}-event-02`, type: 'rescheduled', from: original, to: slot, actorId: account.id, createdAt: iso(start - day) })
    if (status === 'cancelled') events.push({ id: `${id}-event-02`, type: 'cancelled', from: slot, actorId: account.id, createdAt: linked.cancelledAt })
    return {
      id, orderId: linked.id, status, timeZone: restaurant.timeZone, ...slot, actorId: account.id, createdAt: linked.createdAt, events,
      ...(index === 1 && { confirmedAt: iso(anchor - 30 * 60000) }),
      ...(index === 7 && { updatedAt: events[1].createdAt, updatedBy: account.id }),
      ...(linked.cancelledAt && { cancelledAt: linked.cancelledAt, updatedAt: linked.cancelledAt, updatedBy: account.id }),
    }
  })
  const refunds = Array.from({ length: 24 }, (_, index) => {
    const order = orders[index === 0 ? 0 : index + 3]
    const status = index < 8 ? 'requested' : index < 13 ? 'approved' : index < 21 ? 'refunded' : 'denied'
    const scope = index % 3 === 1 ? 'full_order' : 'items'
    const lines = scope === 'full_order' ? order.items : order.items.slice(0, 1)
    const lineItems = lines.map(line => {
      const quantity = scope === 'full_order' ? line.quantity : 1
      return { orderItemId: line.id, quantity, amount: unitAmount(cents(line.chargedAmount), line.quantity, 0, quantity) / 100 }
    })
    const created = Date.parse(order.deliveredAt) + 3 * hour
    return {
      id: idFor('refund', index), orderId: order.id, status, scope, currency: 'USD',
      reason: ['missing_item', 'wrong_item', 'food_quality', 'delivery_issue', 'other'][index % 5],
      ...(index % 5 === 0 && { notes: 'The bag was sealed when it arrived.' }),
      ...(status !== 'requested' && { resolvedAt: iso(created + day / 2) }),
      lineItems, amount: lineItems.reduce((sum, line) => sum + cents(line.amount), 0) / 100,
      payment: { ...order.payment }, actorId: account.id, createdAt: iso(created),
    }
  })
  return { account: structuredClone(account), restaurants, menuItems, cart: emptyCart(), orders, scheduledDeliveries, refunds }
}
