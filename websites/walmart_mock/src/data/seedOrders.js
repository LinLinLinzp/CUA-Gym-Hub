import { cartOrderLine } from './cart.js'
import { day, find, hours, time, totalsFor } from './model.js'
import { editCutoff } from './orders.js'
import { storeDate, zonedTime } from './pickup.js'
import { refundFor } from './returns.js'

const pad = (value, length = 3) => String(value).padStart(length, '0')
const at = (now, offsetHours) => new Date(+now + offsetHours * hours).toISOString()
const fixtureProducts = ['coffee-12oz', 'paper-towels-6', 'detergent-92oz', 'dish-soap-18oz', 'air-fryer-4qt', 'diapers-size3-84', 'blocks-50pc', 'lotion-12oz', 'dog-food-8lb']
const orderThreeProducts = ['coffee-12oz', 'paper-towels-6', 'detergent-92oz', 'milk-gallon', 'headphones-black']

function seedSlots(stores, now) {
  return stores.flatMap((store, storeIndex) => {
    const dateStamp = +new Date(`${storeDate(now, store.timezone)}T12:00:00Z`)
    return [-18, -9, -3, 0, 1, 2].flatMap((offset, dateIndex) => {
      const date = new Date(dateStamp + offset * day).toISOString().slice(0, 10)
      const dateKey = offset < 0 ? `past${pad(-offset, 2)}` : `d${pad(offset, 2)}`
      return [9, 12, 17].map((hour, hourIndex) => {
        const slug = store.id.replace(/^store-/, '')
        const locked = !storeIndex && !offset && hourIndex === 2
        const id = `slot-${slug}-${dateKey}-${locked ? 'next' : `${pad(hour, 2)}00`}`
        const startAt = locked ? at(now, 2) : zonedTime(date, hour, store.timezone)
        const endAt = at(time(startAt), 1)
        const capacity = 6
        const filled = hourIndex === 1 ? capacity : (dateIndex + storeIndex + hourIndex) % 3
        const fee = hourIndex === 2 ? 3.95 : 0
        return { id, storeId: store.id, startAt, endAt, capacity, filled, fee, enabled: store.pickupEnabled }
      })
    })
  })
}

function itemSnapshots(catalog, index) {
  const skus = index === 3 ? orderThreeProducts : index === 1 ? ['coffee-12oz', 'paper-towels-6'] : Array.from(
    { length: index % 3 + 2 }, (_, position) => fixtureProducts[(index + position) % fixtureProducts.length],
  )
  return skus.map((sku, position) => {
    const product = find(catalog, `sku-${sku}`)
    const quantity = index === 3 ? [3, 2, 1, 1, 1][position] : position === 0 ? 2 : (index + position) % 2 + 1
    const line = cartOrderLine(product, quantity, `order-${pad(index)}-line-${pad(position + 1)}`)
    if (index === 3 && sku === 'headphones-black') line.returnPolicy.windowDays = 5
    return line
  })
}

export function seedOrdersReturnsPickup(profile, catalog, stores, now) {
  const actorId = profile.id
  const pickupSlots = seedSlots(stores, now)
  const pastSlots = pickupSlots.filter(slot => slot.enabled && time(slot.startAt) < +now - day && slot.filled < slot.capacity)
  const pickupReservations = []
  const orders = []
  for (let index = 1; index <= 36; index += 1) {
    const id = `order-${pad(index)}`
    const mode = index === 1 || index === 2 || (index >= 4 && index <= 21) || [34, 36].includes(index) ? 'pickup'
      : index === 3 || index % 5 === 0 ? 'delivery' : 'shipping'
    let status = 'delivered'
    if (index < 3) status = 'placed'
    else if (index === 33) status = 'preparing'
    else if (index === 34) status = 'canceled'
    else if (index === 35) status = 'shipped'
    else if (index === 36) status = 'ready_for_pickup'
    else if (mode === 'pickup') status = 'picked_up'

    const slotId = ['slot-rogers-d01-0900', 'slot-rogers-d00-next'][index - 1]
    const slot = slotId ? find(pickupSlots, slotId)
      : index === 36 ? find(pickupSlots, 'slot-lowell-d01-0900')
      : mode === 'pickup' ? pastSlots[(index - 4) % pastSlots.length] : undefined
    const fulfilledAt = status === 'picked_up' ? slot.endAt : status === 'delivered' ? at(now, -(index === 3 ? 9 : 4 + (index % 12)) * 24) : undefined
    const createdAt = index < 3 ? at(now, -index * 2)
      : fulfilledAt ? at(time(fulfilledAt), -48 - index) : at(now, -22 - index)
    const updatedAt = fulfilledAt ?? createdAt
    const metadata = { actorId, createdAt, updatedBy: actorId, updatedAt }
    const lines = itemSnapshots(catalog, index)
    const totals = totalsFor(lines, slot?.fee)
    let pickupReservationId
    if (slot) {
      pickupReservationId = `reservation-${pad(pickupReservations.length + 1)}`
      pickupReservations.push({
        id: pickupReservationId, orderId: id, storeId: slot.storeId, slotId: slot.id,
        status: status === 'canceled' ? 'released' : 'booked', fee: slot.fee,
        ...(status === 'canceled' ? { releaseReason: 'order_canceled' } : {}),
        ...metadata,
      })
    }
    orders.push({
      id, orderNumber: `200${1380 + index}-${41987515 + index}`,
      ownerId: actorId, status, fulfillmentMode: mode, lines, totals, paymentSummary: { ...profile.paymentSummary },
      ...metadata,
      ...(fulfilledAt ? { fulfilledAt } : {}),
      ...(slot ? { storeId: slot.storeId, slotId: slot.id, pickupReservationId, editCutoffAt: editCutoff(slot), rescheduleCount: 0, pickupPerson: null }
        : { shippingAddress: { ...profile.addresses[index % 4 === 0 ? 1 : 0] }, ...(['shipped', 'delivered'].includes(status) && mode === 'shipping' ? { trackingNumber: `94001110682955210${pad(index)}` } : {}) }),
      events: [{ id: `order-event-${pad(index)}`, type: 'placed', actorId, createdAt, status: 'placed', totals, ...(pickupReservationId ? { pickupReservationId } : {}) }],
    })
  }

  const historicalSlots = pastSlots.slice(0, 4)
  for (let index = 0; index < historicalSlots.length; index += 1) {
    const slot = historicalSlots[index]
    const createdAt = at(time(slot.startAt), -48)
    pickupReservations.push({
      id: `reservation-${pad(pickupReservations.length + 1)}`, cartId: 'cart-maya',
      storeId: slot.storeId, slotId: slot.id, status: 'released', fee: slot.fee, releaseReason: index % 2 ? 'changed' : 'user_released',
      expiresAt: at(time(createdAt), 1), actorId, createdAt, updatedBy: actorId, updatedAt: at(time(createdAt), .5),
    })
  }

  const returns = orders.filter(order => ['picked_up', 'delivered'].includes(order.status)).slice(0, 24).map((order, index) => {
    const number = 730138 + index
    const line = order.lines[0]
    const quantity = 1
    const resolution = index % 7 === 6 && line.returnPolicy.resolutions.includes('replacement') ? 'replacement' : 'refund'
    const refund = refundFor(line, quantity, 0, resolution)
    return {
      id: `return-${pad(index + 1)}`, returnNumber: `RMA-${number}`, instructionsCode: `RET-${number}`, orderId: order.id, actorId,
      createdAt: at(time(order.fulfilledAt), index === 0 ? 72 : 14), status: index % 5 === 0 ? 'submitted' : 'completed',
      method: order.fulfillmentMode === 'pickup' ? 'store' : index % 2 ? 'mail' : 'fedex_dropoff',
      lines: [{
        id: `return-${pad(index + 1)}-line-001`, orderLineId: line.id, productId: line.productId, quantity,
        reason: index % 2 ? 'changed_mind' : 'damaged', resolution, unitPrice: line.unitPrice, ...refund,
      }],
      refundEstimate: refund.refundAmount,
    }
  })

  return { pickupSlots, pickupReservations, orders, returns }
}
