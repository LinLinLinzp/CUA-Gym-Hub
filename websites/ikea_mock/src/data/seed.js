const catalog = [
  ['Storage', 'shelving', [
    ['Linden', 'Open oak shelving', 89, 18, 52], ['Alder', 'Low cabinet', 149, 12, 65],
    ['Birk', 'Two-door wardrobe', 229, 8, 79], ['Fjord', 'Modular wall shelf', 65, 21, 34],
    ['Sanna', 'Entryway shoe cabinet', 115, 16, 48], ['Vika', 'Storage bench', 129, 10, 49],
    ['Gran', 'Six-drawer chest', 189, 7, 72], ['Hedda', 'Stackable storage basket', 18.99, 32],
    ['Ansel', 'Narrow bookcase', 79, 0, 42], ['Tova', 'Lidded storage box', 12.99, 24],
  ]],
  ['Seating', 'seating', [
    ['Maren', 'Upholstered lounge chair', 179, 11, 52], ['Isak', 'Dining chair', 69, 30, 21],
    ['Edvin', 'Two-seat sofa', 439, 5, 84], ['Nova', 'Padded footstool', 59, 14],
    ['Linnea', 'Solid wood bench', 119, 17, 38], ['Siv', 'Folding chair', 34.99, 18],
    ['Frey', 'Counter stool', 85, 20, 29], ['Karina', 'Reading armchair', 249, 0, 59],
    ['Oskar', 'Dining bench', 149, 9, 42], ['Disa', 'Low pouf', 45, 13],
  ]],
  ['Lighting', 'lighting', [
    ['Solna', 'Adjustable floor lamp', 49.99, 18], ['Sund', 'Opal table lamp', 29.99, 25],
    ['Elin', 'Pleated pendant shade', 39.99, 16], ['Alva', 'Directional desk lamp', 24.99, 11],
    ['Glimt', 'Rechargeable lantern', 21.99, 28], ['Norr', 'Compact wall light', 32.99, 9],
    ['Mira', 'Linen lampshade', 22.99, 29], ['Bosse', 'LED reading light', 19.99, 17],
    ['Liv', 'Amber bedside light', 34.99, 0], ['Helle', 'Dome pendant light', 54.99, 6],
  ]],
  ['Textiles', 'textiles', [
    ['Runa', 'Textured cushion cover', 14.99, 40], ['Inga', 'Woven cotton throw', 24.99, 21],
    ['Saga', 'Flatwoven hallway runner', 39.99, 15], ['Iris', 'Pair of linen-blend curtains', 49.99, 13],
    ['Elsa', 'Striped bath towel', 11.99, 34], ['Astrid', 'Quilted cotton bedspread', 59.99, 12],
    ['Tuva', 'Patterned table runner', 12.99, 22], ['Maja', 'Wool-blend area rug', 169, 4],
    ['Klara', 'Cotton duvet cover set', 44.99, 19],
  ]],
  ['Home office', 'office', [
    ['Nils', 'Compact writing desk', 139, 15, 52], ['Rune', 'Sit-stand desk', 329, 8, 79],
    ['Viggo', 'Rolling drawer unit', 79, 14, 38], ['Arvid', 'Desk organizer', 16.99, 34],
    ['Britta', 'Swivel task chair', 129, 9, 49], ['Ture', 'Wall-mounted work table', 99, 4, 45],
    ['Ida', 'Monitor riser', 24.99, 22], ['Ivarn', 'Cable organizer tray', 13.99, 32],
    ['Mikkel', 'Letter tray set', 19.99, 19],
  ]],
]

const baseTime = '2026-11-18T12:00:00.000Z'
const actor = 'acct-avery'
const pad = (n, width = 3) => String(n).padStart(width, '0')
const timestamp = (days) => new Date(Date.UTC(2026, 10, 18 + days, 15)).toISOString()
const variants = ['Natural', 'Warm white', 'Charcoal', 'Soft blue', 'Sand']
export const roundMoney = (amount) => Math.round(amount * 100) / 100
export const lineAmount = (price, quantity) => Math.round(price * 100) * quantity / 100
export const sumMoney = (amounts) => amounts.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100

export function createInitialData() {
  const address = { line1: '18 Alder Lane', city: 'Brooklyn', region: 'NY', postalCode: '11215', country: 'US' }
  const profile = { id: actor, name: 'Avery Morgan', email: 'avery.morgan@example.com', address }
  let productNumber = 0
  const products = catalog.flatMap(([category, imageKey, entries]) =>
    entries.map(([name, description, unitPrice, stock, assemblyUnitPrice]) => {
      const number = ++productNumber
      return {
        id: 'prod-' + pad(number), articleNumber: '700.10.' + pad(number), name, description,
        category, variant: variants[(number - 1) % variants.length], unitPrice, stock,
        ...(assemblyUnitPrice === undefined ? {} : { assemblyUnitPrice }),
        parcelEligible: Number(assemblyUnitPrice ?? 0) <= 21 && unitPrice < 100, imageKey,
      }
    }),
  )
  const cart = {
    id: 'cart-avery', updatedAt: baseTime,
    lines: [[0, 2], [21, 1], [30, 3]].map(([index, quantity], i) => {
      const { id: productId, unitPrice } = products[index]
      return { id: 'cart-line-' + pad(i + 1), productId, quantity, unitPrice,
        lineAmount: lineAmount(unitPrice, quantity), createdAt: baseTime, updatedAt: baseTime, actor }
    }),
  }

  const orders = Array.from({ length: 36 }, (_, i) => {
    const number = i + 1
    const id = 'ord-2026-' + pad(number)
    const createdAt = timestamp(-(36 - number) * 4 - 2)
    const isActive = number === 35 || number === 34
    const status = isActive ? (number === 35 ? 'on_the_way' : 'preparing')
      : number === 33 ? 'cancelled' : number % 4 === 0 && number !== 32 && number !== 36 ? 'collected' : 'delivered'
    const fulfillment = status === 'collected' ? 'store' : 'delivery'
    const fulfilledAt = ['delivered', 'collected'].includes(status) && number !== 32
      ? timestamp(-(36 - number) * 4 - 1) : undefined
    const indexes = number === 36 ? [21, 30, 0] : number === 32 ? [31, 39]
      : isActive ? [0, 23] : [20 + i % 18, (i * 7 + 1) % products.length, 31].slice(0, 1 + i % 3)
    const lines = indexes.map((index, j) => {
      const { id: productId, articleNumber, name, variant, unitPrice, parcelEligible, assemblyUnitPrice } = products[index]
      const quantity = number === 36 ? [4, 2, 1][j] : 1 + (i + j) % 3
      return {
        id: id + '-line-' + pad(j + 1, 2), productId, articleNumber, name, variant, quantity, unitPrice,
        lineAmount: lineAmount(unitPrice, quantity), parcelEligible, returnable: status !== 'cancelled',
        ...(assemblyUnitPrice === undefined ? {} : { assemblyUnitPrice }),
      }
    })
    const subtotal = sumMoney(lines.map((line) => line.lineAmount))
    const delivery = fulfillment === 'delivery' ? 49 : 0
    const tax = roundMoney(subtotal * 0.08)
    return { id, reference: String(7610041000 + number), actor, createdAt, status, fulfillment, currency: 'USD',
      address: { ...address }, ...(fulfilledAt ? { fulfilledAt } : {}), lines,
      totals: { subtotal, delivery, assembly: 0, tax, total: sumMoney([subtotal, delivery, tax]) } }
  })

  function seededBooking(number, order, type, status, date, deliveryBookingId) {
    const morning = type === 'delivery'
    const createdAt = order.createdAt
    const slot = {
      id: type + '-' + date + (morning ? '-am' : '-pm'),
      startsAt: date + (morning ? 'T09:00:00' : 'T13:00:00') + (date < '2026-11-01' ? '-04:00' : '-05:00'),
      endsAt: date + (morning ? 'T12:00:00' : 'T16:00:00') + (date < '2026-11-01' ? '-04:00' : '-05:00'),
      timeZone: 'America/New_York',
    }
    const id = 'svc-2026-' + pad(number)
    const items = (morning ? order.lines : order.lines.filter((line) => line.assemblyUnitPrice !== undefined).slice(0, 1))
      .map(({ id: orderLineId, productId, quantity, assemblyUnitPrice }) => ({
        orderLineId, productId, quantity: morning ? quantity : 1,
        ...(morning ? {} : { unitPrice: assemblyUnitPrice, lineAmount: assemblyUnitPrice }),
      }))
    const history = [{ id: id + '-history-1', type: 'scheduled', actor, createdAt, statusAfter: 'scheduled' }]
    const updatedAt = status === 'completed' ? new Date(slot.endsAt).toISOString() : createdAt
    if (status === 'cancelled') history.push({
      id: id + '-history-2', type: 'cancelled', actor, createdAt: updatedAt,
      statusBefore: 'scheduled', statusAfter: 'cancelled',
    })
    return {
      id, reference: 'SV-' + (10000 + number), type, status, orderId: order.id, actor, createdAt, updatedAt,
      currency: 'USD', address: { ...address }, amount: morning ? 49 : items[0].lineAmount, slot, items, history,
      ...(morning ? {} : { deliveryBookingId, consentAcceptedAt: createdAt }),
    }
  }

  const historicalDeliveries = orders.filter((order) => order.fulfillment === 'delivery' && order.fulfilledAt).slice(0, 22)
  const bookings = historicalDeliveries.map((order, i) =>
    seededBooking(i + 1, order, 'delivery', 'completed', order.fulfilledAt.slice(0, 10)),
  )
  const priorAssemblyOrders = historicalDeliveries.filter((order) => order.lines.some((line) => line.assemblyUnitPrice !== undefined)).slice(0, 3)
  priorAssemblyOrders.forEach((order, i) => {
    const delivery = bookings.find((booking) => booking.orderId === order.id)
    bookings.push(seededBooking(23 + i, order, 'assembly', i === 2 ? 'cancelled' : 'completed',
      order.fulfilledAt.slice(0, 10), delivery.id))
  })
  bookings.push(
    seededBooking(26, orders[33], 'delivery', 'scheduled', '2026-11-24'),
    seededBooking(27, orders[34], 'delivery', 'scheduled', '2026-11-25'),
    seededBooking(28, orders[34], 'assembly', 'scheduled', '2026-11-26', 'svc-2026-027'),
  )

  const returnedOrders = [...orders.slice(0, 23), orders[35]]
  const returns = returnedOrders.map((order, i) => {
    const number = i + 1
    const status = number === 24 ? 'refunded' : ['refunded', 'received', 'cancelled', 'declined', 'requested'][i % 5]
    const selected = order.lines.filter((line) => line.parcelEligible).slice(0, i % 4 === 2 ? 2 : 1)
    const items = selected.map((line) => {
      const quantity = number !== 24 && i % 5 === 0 ? line.quantity : 1
      return { orderLineId: line.id, productId: line.productId, quantity, reason: 'changed_mind',
        condition: i % 2 ? 'opened' : 'unopened', unitPrice: line.unitPrice,
        refundAmount: lineAmount(line.unitPrice, quantity) }
    })
    const merchandiseAmount = sumMoney(items.map((item) => item.refundAmount))
    const method = i % 2 ? 'parcel' : 'in_store'
    const feeAmount = method === 'parcel' ? Math.min(5, merchandiseAmount) : 0
    const createdAt = new Date(Date.parse(order.fulfilledAt) + 2 * 3600000).toISOString()
    return {
      id: 'ret-2026-' + pad(number), reference: 'RT-' + (10000 + number), orderId: order.id, actor, createdAt,
      updatedAt: status === 'requested' ? createdAt : new Date(Date.parse(createdAt) + 3600000).toISOString(),
      status, method, currency: 'USD', items, merchandiseAmount, feeAmount,
      refundAmount: sumMoney([merchandiseAmount, -feeAmount]),
    }
  })
  return { profile, products, cart, cartEvents: [], orders, bookings, returns }
}
