import { periodEnd, plans, totalsFor } from '../model.js'

const restaurants = [
  ['juniper', 'Juniper Kitchen', 'Pacific Northwest', ['Ginger Rice Bowl', 1395], ['Roasted Carrots', 675], ['Blackberry Soda', 425]],
  ['copper', 'Copper Kettle', 'Comfort food', ['Smoky Chicken Sandwich', 1425], ['Sea Salt Fries', 525], ['Peach Iced Tea', 375]],
  ['miso', 'Miso & Maple', 'Japanese', ['Shoyu Ramen', 1675], ['Pork Gyoza', 795], ['Yuzu Lemonade', 495]],
  ['olive', 'Olive Grove', 'Mediterranean', ['Falafel Plate', 1550], ['Lemon Hummus', 625], ['Mint Tea', 350]],
  ['luna', 'Luna Verde', 'Mexican', ['Mushroom Tacos', 1325], ['Street Corn', 575], ['Hibiscus Agua Fresca', 450]],
  ['ember', 'Ember & Crust', 'Pizza', ['Wild Mushroom Pizza', 1975], ['Arugula Salad', 875], ['Tiramisu', 750]],
  ['lotus', 'Lotus Table', 'Vietnamese', ['Lemongrass Noodle Bowl', 1525], ['Fresh Spring Rolls', 725], ['Vietnamese Iced Coffee', 525]],
  ['saffron', 'Saffron Yard', 'Indian', ['Tomato Butter Paneer', 1750], ['Garlic Naan', 425], ['Mango Lassi', 595]],
]

const groupNames = [
  'Friday Studio Lunch', 'Design Team Dinner', 'Book Club Takeout', 'Sunday Family Lunch',
  'Neighbors’ Pizza Night', 'Volunteer Lunch', 'Thursday Game Night', 'Team Welcome Lunch',
  'Market Crew Dinner', 'Park Picnic', 'Film Club Takeout', 'Saturday Pottery Class',
  'Studio Open House', 'Late Shift Dinner', 'Birthday Lunch', 'Workshop Break',
  'Planning Day Lunch', 'Choir Dinner', 'Garden Crew Lunch', 'Friday Movie Night',
  'Office Lunch', 'Family Movie Night', 'Art Club Dinner', 'Weekend Reunion',
]
const guests = ['Avery Brooks', 'Jules Rivera', 'Samira Patel', 'Morgan Bell', 'Theo Martin', 'Noah Kim']
const calendar = (day, hour = 19) => new Date(Date.UTC(2026, 10, day, hour, 20)).toISOString()
const fees = { deliveryFeeCents: 299, serviceFeeCents: 199, taxCents: 0, tipCents: 400 }
const snapshot = (menuItem, id, quantity) => ({
  id, menuItemId: menuItem.id, name: menuItem.name, quantity, unitPriceCents: menuItem.unitPriceCents,
})

export function createInitialData() {
  const account = {
    id: 'acct-maya', name: 'Maya Chen', paymentMethodId: 'pay-visa',
    paymentLabel: 'Visa •••• 4826', deliveryAddress: '184 Juniper Lane, Apt 3B, Portland, OR',
  }
  const merchants = restaurants.map(([key, name, cuisine, ...dishes]) => ({
    id: 'm-' + key, name, cuisine, menu: dishes.map(([name, unitPriceCents], index) => ({
      id: 'mi-' + key + '-' + (index + 1), name, unitPriceCents,
    })),
  }))
  const orders = Array.from({ length: 38 }, (_, index) => {
    const id = 'DD-' + (240118 - index)
    const merchant = merchants[index % merchants.length]
    const createdAt = calendar(18 - Math.floor(index / 2), index % 2 ? 13 : 18)
    const status = index < 2 ? 'placed' : index < 4 ? 'preparing' : index < 34 ? 'delivered' : 'canceled'
    const items = merchant.menu.slice(0, index % 3 ? 2 : 3)
      .map((entry, line) => snapshot(entry, id + '-' + (line + 1), line ? 1 : 1 + index % 3))
    return {
      id, merchantId: merchant.id, merchantName: merchant.name, createdBy: account.id, createdAt, status,
      items, totals: totalsFor(items, fees), deliveryAddress: account.deliveryAddress, paymentLabel: account.paymentLabel,
      ...(status === 'delivered' && { deliveredAt: new Date(Date.parse(createdAt) + 2700000).toISOString() }),
      ...(status === 'canceled' && { canceledAt: createdAt, updatedAt: createdAt, canceledBy: account.id }),
    }
  })
  const groupOrders = groupNames.map((name, index) => {
    const id = 'GO-' + (1030 - index)
    const linkedOrder = index >= 10 && index < 18 ? orders[index + 8] : null
    const merchant = linkedOrder
      ? merchants.find((entry) => entry.id === linkedOrder.merchantId)
      : merchants[index % merchants.length]
    const createdAt = linkedOrder ? new Date(Date.parse(linkedOrder.createdAt) - 3600000).toISOString() : calendar(18 - index, 12)
    const status = index < 5 ? 'open' : index < 10 ? 'closed' : linkedOrder ? 'placed' : 'canceled'
    const guestId = id + '-guest'
    const hostItems = linkedOrder ? linkedOrder.items.slice(0, 1) : [snapshot(merchant.menu[0], id + '-host-line', 1 + index % 2)]
    const guestItems = linkedOrder ? linkedOrder.items.slice(1) : [snapshot(merchant.menu[1], id + '-guest-line', 1)]
    const participants = [
      { id: account.id, name: account.name, role: 'host', joinedAt: createdAt, items: hostItems },
      { id: guestId, name: guests[index % guests.length], role: 'guest', joinedAt: createdAt, items: guestItems },
    ]
    const closedAt = new Date(Date.parse(createdAt) + 1800000).toISOString()
    if (linkedOrder) {
      linkedOrder.groupOrderId = id
      linkedOrder.items = linkedOrder.items.map((item, line) => ({ ...item, participantId: line === 0 ? account.id : guestId }))
    }
    return {
      id, name, merchantId: merchant.id, merchantName: merchant.name, hostId: account.id,
      inviteToken: 'join-' + id.toLowerCase(), createdAt, createdBy: account.id, status, participants,
      ...(status === 'open' && { deadlineAt: calendar(18 + index, 21) }),
      ...(['placed', 'closed'].includes(status) && { closedAt, updatedAt: closedAt, updatedBy: account.id }),
      ...(linkedOrder && { orderId: linkedOrder.id, placedAt: linkedOrder.createdAt, updatedAt: linkedOrder.createdAt }),
      ...(status === 'canceled' && { canceledAt: closedAt, updatedAt: closedAt, updatedBy: account.id }),
    }
  })
  const refunds = orders.slice(8, 32).map((order, index) => {
    const line = order.items[index % order.items.length]
    const status = ['issued', 'issued', 'declined', 'requested'][index % 4]
    const createdAt = new Date(Date.parse(order.deliveredAt) + 1800000).toISOString()
    return {
      id: 'RF-' + (1124 - index), orderId: order.id, merchantName: order.merchantName, createdBy: account.id,
      createdAt, status, reason: index % 2 ? 'incorrect_item' : 'missing_item',
      method: index % 3 ? 'original_payment' : 'doordash_credit',
      items: [{ orderItemId: line.id, name: line.name, quantity: 1, amountCents: line.unitPriceCents }],
      totalCents: line.unitPriceCents,
      ...(status !== 'requested' && { resolvedAt: new Date(Date.parse(createdAt) + 7200000).toISOString() }),
    }
  })

  const firstCharge = '2024-12-18T15:00:00.000Z'
  const dashpassEvents = [{
    id: 'DPE-100', membershipId: 'DP-1', type: 'enrolled', actorId: account.id,
    createdAt: firstCharge, effectiveAt: firstCharge, previousStatus: 'inactive', nextStatus: 'active',
    previousPlanId: null, nextPlanId: 'monthly',
  }]
  for (let index = 0; index < 11; index++) {
    const period = new Date(periodEnd(firstCharge, index * 2))
    const paused = new Date(period.getTime() + 4 * 86400000).toISOString()
    const resumed = new Date(period.getTime() + 9 * 86400000).toISOString()
    const common = { membershipId: 'DP-1', actorId: account.id, previousPlanId: 'monthly', nextPlanId: 'monthly' }
    dashpassEvents.push(
      { ...common, id: 'DPE-' + (101 + index * 2), type: 'paused', createdAt: paused, effectiveAt: paused, previousStatus: 'active', nextStatus: 'paused' },
      { ...common, id: 'DPE-' + (102 + index * 2), type: 'resumed', createdAt: resumed, effectiveAt: resumed, previousStatus: 'paused', nextStatus: 'active' },
    )
  }
  const canceled = '2026-10-23T15:00:00.000Z'
  const reactivated = '2026-10-27T15:00:00.000Z'
  dashpassEvents.push(
    { id: 'DPE-123', membershipId: 'DP-1', type: 'canceled', actorId: account.id, createdAt: canceled, effectiveAt: canceled, previousStatus: 'active', nextStatus: 'canceled', previousPlanId: 'monthly', nextPlanId: 'monthly', reason: 'Taking a break' },
    { id: 'DPE-124', membershipId: 'DP-1', type: 'reactivated', actorId: account.id, createdAt: reactivated, effectiveAt: reactivated, previousStatus: 'canceled', nextStatus: 'active', previousPlanId: 'monthly', nextPlanId: 'monthly' },
  )
  const dashpassPayments = Array.from({ length: 24 }, (_, index) => {
    const periodStart = periodEnd(firstCharge, index)
    return {
      id: 'DPP-' + (100 + index), membershipId: 'DP-1', ...(index === 0 && { eventId: 'DPE-100' }),
      planId: 'monthly', status: 'paid', amountCents: plans.monthly.amountCents, paymentMethodId: account.paymentMethodId,
      paymentLabel: account.paymentLabel, periodStart, periodEnd: periodEnd(firstCharge, index + 1),
      createdAt: periodStart, actorId: account.id,
    }
  })
  const nextBillingAt = dashpassPayments.at(-1).periodEnd
  const dashpass = {
    id: 'DP-1', accountId: account.id, status: 'active', planId: 'monthly', pendingPlanId: null,
    paymentMethodId: account.paymentMethodId, paymentLabel: account.paymentLabel,
    createdAt: firstCharge, updatedAt: reactivated, nextBillingAt, accessUntil: nextBillingAt,
  }
  return { account, merchants, orders, groupOrders, refunds, dashpass, dashpassEvents, dashpassPayments }
}
