import { products } from './products.js'

const account = {
  id: 'customer-ava-morgan',
  name: 'Ava Morgan',
  email: 'ava.morgan@example.test',
  timeZone: 'America/New_York',
}
const shipTo = {
  name: 'Ava Morgan', line1: '82 Sample Lane', line2: 'Unit 3B',
  city: 'Providence', region: 'RI', postalCode: '02906', country: 'US',
}

const featured = [
  [[['sectional', 1]], 'freight', 'ready_to_schedule', 4],
  [[['sideboard', 1]], 'freight', 'ready_to_schedule', 6],
  [[['lamp', 2]], 'parcel', 'delivered', 8],
  [[['rug', 1], ['pillow', 1, false]], 'parcel', 'delivered', 10],
  [[['sideTable', 2], ['basket', 1, true, 2]], 'parcel', 'preparing', 3, 'in_transit'],
  [[['bedding', 1]], 'parcel', 'delivered', 52],
  [[['armchair', 1]], 'freight', 'delivered', 13],
  [[['chair', 2], ['floorLamp', 1, true, 2]], 'parcel', 'delivered', 7, 'preparing'],
]

export function createInitialData() {
  const clock = new Date()
  const at = (offset, hour = 16) => new Date(Date.UTC(
    clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate() + offset, hour,
  )).toISOString()
  const orders = []
  const shipments = []
  const orderCancellations = []
  const deliveryAppointments = []
  const damageClaims = []
  const returns = []
  const keys = Object.keys(products)
  const currency = 'USD'
  const actorId = account.id

  function line(orderId, position, [productKey, quantity, returnable = true, group = 1], canceledQuantity = 0) {
    const [name, sku, variant, unitPrice] = products[productKey]
    return {
      id: orderId + '-i' + position, name, sku, variant, imageKey: productKey,
      quantity, canceledQuantity, unitPrice, unitTax: Math.round(unitPrice * 8) / 100,
      returnable, shipmentId: orderId + '-s' + group,
    }
  }

  function addShipment(orderId, group, type, status, age) {
    const id = orderId + '-s' + group
    const deliveryDate = -age + 3
    const isFreight = type === 'freight'
    const onRoute = ['delivered', 'in_transit', 'out_for_delivery'].includes(status)
    const trackingEvents = [{ at: at(-age), label: 'Order received' }]
    if (onRoute) trackingEvents.push({ at: at(-age + 1), label: 'Picked up by the carrier' })
    if (status === 'delivered') trackingEvents.push({ at: at(deliveryDate), label: 'Delivered', location: 'Providence, RI' })
    if (status === 'ready_to_schedule') trackingEvents.push({ at: at(-age + 2), label: 'Arrived at the local delivery station', location: 'Providence, RI' })
    if (status === 'out_for_delivery') trackingEvents.push({ at: at(0, 13), label: 'Out for delivery', location: 'Providence, RI' })
    if (status === 'canceled') trackingEvents.push({ at: at(-age + 1), label: 'Shipment canceled' })
    const shipment = {
      id, orderId, type, status, carrier: isFreight ? 'Harbor Home Delivery' : 'Northline Parcel',
      trackingNumber: (isFreight ? 'HHD-' : 'NLP-') + orderId.slice(3) + '40' + group,
      timeZone: account.timeZone, trackingEvents,
    }
    if (status === 'delivered') shipment.deliveredAt = at(deliveryDate)
    if (status === 'in_transit' || status === 'out_for_delivery') shipment.estimatedAt = at(status === 'in_transit' ? 3 : 0, 22)
    if (status === 'ready_to_schedule') {
      shipment.availableSlots = Array.from({ length: 6 }, (_, index) => {
        const day = 2 + Math.floor(index / 2)
        const hour = index % 2 ? 18 : 14
        return { id: id + '-slot-' + (index + 1), startAt: at(day, hour), endAt: at(day, hour + 4) }
      })
    }
    shipments.push(shipment)
    return shipment
  }

  for (let index = 1; index <= 64; index++) {
    const id = 'wf-' + (1000 + index)
    const fixture = featured[index - 1]
    const historicalBooking = index >= 9 && index <= 31
    const historicalService = index >= 32 && index <= 55
    const historicalCancellation = index >= 9 && index <= 32 || index === 64
    const status = fixture?.[2] ?? (index <= 55 ? 'delivered' : [
      'preparing', 'in_transit', 'out_for_delivery', 'ready_to_schedule', 'delivered',
    ][(index - 56) % 5])
    const age = fixture?.[3] ?? (index === 9 ? 15
      : index === 32 || index === 33 ? 19 + index % 3
      : index >= 56 && index !== 60 && index !== 64 ? 9 + index % 5
      : 26 + (index - 9) * 12)
    const type = fixture?.[1] ?? (historicalBooking || status === 'ready_to_schedule' ? 'freight' : 'parcel')
    const firstKey = index === 9 ? 'dresser' : keys[(index - 1) % keys.length]
    const descriptors = fixture?.[0] ?? [[firstKey, 1 + index % 2]]
    if (index === 9 || historicalService) descriptors.push([keys[(index + 2) % keys.length], 1, true, 2])
    const items = index === 64 ? [] : descriptors.map((descriptor, position) => line(id, position + 1, descriptor))
    const primary = index === 64 ? null : addShipment(id, 1, type, status, age)
    if (items.some((item) => item.shipmentId === id + '-s2')) {
      addShipment(id, 2, 'parcel', fixture?.[4] || status, age)
    }

    if (historicalCancellation) {
      const group = index === 64 ? 1 : 3
      const canceled = line(id, items.length + 1, ['pillow', 1, true, group], 1)
      items.push(canceled)
      addShipment(id, group, 'parcel', 'canceled', age)
      const estimatedCredit = (Math.round(canceled.unitPrice * 100) + Math.round(canceled.unitTax * 100)) / 100
      orderCancellations.push({
        id: 'cancel-' + id, orderId: id, status: 'confirmed', reason: 'changed_mind',
        items: [{ orderItemId: canceled.id, quantity: 1, estimatedCredit }],
        estimatedCredit, currency, actorId, createdAt: at(-age + 1),
      })
    }

    if (index === 2 || historicalBooking) {
      const slot = primary.availableSlots?.[1]
      const bookingStatuses = ['completed', 'canceled', 'rescheduled']
      const bookingStatus = index === 2 ? 'confirmed' : index === 9 ? 'completed' : bookingStatuses[index % bookingStatuses.length]
      const bookingId = 'appt-' + id
      const startAt = slot?.startAt || at(-age + (bookingStatus === 'rescheduled' ? 2 : 3), 14)
      const booking = {
        id: bookingId, orderId: id, shipmentId: primary.id, slotId: slot?.id || primary.id + '-past-slot',
        startAt, endAt: slot?.endAt || at(-age + (bookingStatus === 'rescheduled' ? 2 : 3), 18),
        timeZone: account.timeZone, status: bookingStatus, instructions: index === 2 ? 'Please use the driveway entrance.' : '',
        actorId, createdAt: at(index === 2 ? -1 : -age + 1),
      }
      if (bookingStatus === 'canceled') {
        booking.canceledAt = at(-age + 2, 12)
        booking.updatedAt = booking.canceledAt
        booking.updatedBy = actorId
      }
      if (bookingStatus === 'rescheduled') {
        booking.replacedByAppointmentId = bookingId + '-replacement'
        booking.updatedAt = at(-age + 2, 12)
        booking.updatedBy = actorId
        deliveryAppointments.push({
          ...booking, id: booking.replacedByAppointmentId, slotId: primary.id + '-replacement-slot',
          startAt: at(-age + 3, 14), endAt: at(-age + 3, 18), status: 'completed',
          createdAt: booking.updatedAt, previousAppointmentId: bookingId,
          updatedAt: undefined, updatedBy: undefined, replacedByAppointmentId: undefined,
        })
      }
      deliveryAppointments.push(booking)
    }

    if (historicalService) {
      const [claimLine, returnLine] = items
      const statuses = ['submitted', 'in_review', 'approved', 'resolved', 'denied', 'withdrawn']
      const reason = ['damaged', 'missing_parts', 'wrong_item', 'defective'][index % 4]
      const descriptions = {
        damaged: 'One corner was chipped when we opened the box.',
        missing_parts: 'The hardware pouch listed in the instructions was missing.',
        wrong_item: 'The finish on the delivered piece differs from the order.',
        defective: 'The finish lifts at the edge during normal use.',
      }
      damageClaims.push({
        id: 'claim-' + id, orderId: id, orderItemId: claimLine.id, shipmentId: primary.id, quantity: 1,
        issueType: reason, description: descriptions[reason], requestedResolution: index % 3 ? 'replacement' : 'refund',
        attachments: [], status: statuses[(index - 32) % statuses.length], actorId, createdAt: at(-age + 5),
      })
      const refundCents = Math.round(returnLine.unitPrice * 100) + Math.round(returnLine.unitTax * 100)
      const feeCents = Math.min(refundCents, 895)
      const entry = {
        id: 'return-' + id, orderId: id, items: [{ orderItemId: returnLine.id, quantity: 1, reason: 'did_not_fit', refundAmount: refundCents / 100 }],
        handoffMethod: 'drop_off', refundMethod: 'original_payment', refundSubtotal: refundCents / 100,
        returnFee: feeCents / 100, estimatedRefund: (refundCents - feeCents) / 100, currency,
        status: ['requested', 'in_transit', 'received', 'refunded', 'canceled'][(index - 32) % 5],
        actorId, createdAt: at(-age + 6),
      }
      if (entry.status === 'canceled') {
        entry.canceledAt = at(-age + 7)
        entry.updatedAt = entry.canceledAt
        entry.updatedBy = actorId
      }
      returns.push(entry)
    }

    const shippingAmount = type === 'freight' ? 39 : 0
    const itemTotal = items.reduce((sum, item) => sum + item.quantity * (Math.round(item.unitPrice * 100) + Math.round(item.unitTax * 100)), 0)
    orders.push({
      id, orderNumber: 'WF-840' + (1000 + index), placedAt: at(-age),
      currency, shippingAmount, totalAmount: (itemTotal + shippingAmount * 100) / 100,
      paymentLabel: 'Visa ending in 0184', shipTo: { ...shipTo }, items,
    })
  }

  return { account: { ...account }, orders, shipments, orderCancellations, deliveryAppointments, damageClaims, returns }
}
