export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const find = (value, id) => id ? list(value).find((record) => record.id === id) : undefined
export const items = (order) => list(order?.items)
export const orderName = (order) => order?.orderNumber || order?.id || 'Order'
export const itemName = (item) => item?.name || item?.id || 'Item'
export const planName = (plan) => plan?.planNumber || plan?.id || 'Protection plan'

export const label = (value) => value ? String(value).replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Unknown'
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const calendar = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
export const time = (value) => value ? Date.parse(value) : NaN
export const date = (value) => Number.isFinite(time(value)) ? calendar.format(time(value)) : '—'
export const validMoney = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const cents = (value) => Math.round(value * 100)
export const money = (value) => validMoney(value) ? currency.format(value) : '—'
export const times = (value, quantity) => cents(value) * quantity / 100
export const sum = (values) => values.reduce((total, value) => total + cents(value), 0) / 100
export const latest = (records) => list(records).sort((a, b) => (time(b.createdAt) || 0) - (time(a.createdAt) || 0))
export const matches = (query, ...values) => values.some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))

export const completed = (order) => ['delivered', 'picked_up'].includes(order?.status)
export const pickupEditable = (order) => order?.status === 'ready_for_pickup' && order.fulfillment === 'pickup'
export const cancelableOrder = (order) => pickupEditable(order) || (order?.status === 'processing' && order.fulfillment === 'shipping')
const count = (value) => Number.isInteger(value) && value > 0 ? value : 0
export const remaining = (line) => Math.max(0, count(line?.quantity) - count(line?.canceledQuantity))
const reservationStatuses = ['requested', 'completed']
const matchStatuses = ['submitted', 'approved']

export function retained(state, order, line) {
  const reserved = list(state.returns).filter((record) => record.orderId === order.id && reservationStatuses.includes(record.status))
    .flatMap((record) => list(record.lines)).reduce((total, entry) => total + (entry.orderItemId === line.id ? count(entry.quantity) : 0), 0)
  return Math.max(0, remaining(line) - reserved)
}

const inWindow = (cutoff, now) => !Number.isFinite(time(cutoff)) || now <= time(cutoff)
const eligibleLine = (order, line) => Boolean(completed(order) && order.id && line?.id && validMoney(line.unitPrice))

export function returnCapacity(state, order, line, now = new Date()) {
  if (!eligibleLine(order, line) || line.eligibility?.returnable === false || !inWindow(line.eligibility?.returnBy, now)) return 0
  return retained(state, order, line)
}

export const returnStores = (state) => list(state.stores).filter((store) => store.id)

export function returnableQuantity(state, order, line) {
  if (line?.eligibility?.mailReturnable !== true && !returnStores(state).length) return 0
  return returnCapacity(state, order, line)
}

export function matchCapacity(state, order, line, now = new Date()) {
  if (!eligibleLine(order, line) || line.unitPrice <= 0 || line.eligibility?.priceMatchable === false || !inWindow(line.eligibility?.priceMatchBy, now)) return 0
  const reserved = list(state.priceMatchRequests).reduce((total, entry) => {
    return total + (entry.orderId === order.id && entry.orderItemId === line.id && matchStatuses.includes(entry.status) ? count(entry.quantity) : 0)
  }, 0)
  return Math.max(0, retained(state, order, line) - reserved)
}

export function planStatus(plan, now = new Date()) {
  return plan.status === 'active' && Number.isFinite(time(plan.coverageEndAt)) && now > time(plan.coverageEndAt) ? 'expired' : plan.status
}

export function canAddPlan(state, order, line, now = new Date()) {
  if (!eligibleLine(order, line) || !inWindow(line.eligibility?.addProtectionBy, now) || !retained(state, order, line)) return false
  const offer = line.protectionOffer
  return Boolean(offer?.name && count(offer.termMonths) && validMoney(offer.price) && list(offer.coverage).length
    && !list(state.protectionPlans).some((plan) => plan.orderId === order.id && plan.orderItemId === line.id && planStatus(plan, now) === 'active'))
}

export const openClaim = (state, plan) => list(state.protectionClaims).some((claim) =>
  claim.planId === plan.id && ['submitted', 'in_service'].includes(claim.status))

export function planDates(order, offer, now = new Date()) {
  const start = new Date(Math.max(+now, time(order.receivedAt) || 0))
  const end = new Date(start)
  const day = end.getUTCDate()
  end.setUTCDate(1)
  end.setUTCMonth(end.getUTCMonth() + offer.termMonths)
  const lastDay = new Date(end)
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0)
  end.setUTCDate(Math.min(day, lastDay.getUTCDate()))
  return { coverageStartAt: start.toISOString(), coverageEndAt: end.toISOString() }
}

export const offerChannels = { online: 'Best Buy website', app: 'Best Buy app', store: 'Best Buy store' }
export const cancelReasons = ['Ordered by mistake', 'Changed mind', 'Found a different item', 'Other']
export const returnReasons = ['Changed mind', 'Ordered the wrong item', 'Defective', 'Item arrived damaged', 'Other']
const defaultIssues = ['Other issue']
export function issueOptions(plan) {
  const terms = list(plan.coverage)
  return [...new Set([...terms, ...defaultIssues])]
}

const fail = (field, message) => ({ error: { field, message } })
const replace = (collection, id, update) => list(collection).map((record) => record.id === id ? { ...record, ...update } : record)
const append = (collection, record) => [...list(collection), record]
const id = (prefix) => prefix + '-' + crypto.randomUUID()
const clean = (value) => typeof value === 'string' ? value.trim() : ''

function chosenLines(order, selection, capacity, allowedReasons) {
  const lines = []
  for (const [lineId, entry] of Object.entries(selection)) {
    const item = find(order.items, lineId)
    const quantity = Number(entry.quantity)
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > capacity(item) || !validMoney(item.unitPrice)) {
      return fail('quantity-' + lineId, 'Enter a quantity within the available units.')
    }
    if (allowedReasons && !allowedReasons.includes(entry.reason)) return fail('reason-' + lineId, 'Choose a return reason.')
    lines.push({
      orderItemId: item.id, quantity, ...(allowedReasons ? { reason: entry.reason } : {}),
      unitPrice: item.unitPrice, refundEstimate: times(item.unitPrice, quantity),
    })
  }
  if (!lines.length) return fail('items', 'Select at least one item.')
  return { lines, refundEstimate: sum(lines.map((line) => line.refundEstimate)) }
}

export function prepare(state, action, now = new Date()) {
  const order = find(state.orders, action.orderId)
  const item = find(order?.items, action.itemId)
  const plan = find(state.protectionPlans, action.planId)
  const record = find(state.returns, action.returnId)
  const actorId = state.account?.id
  const createdAt = now.toISOString()
  const common = { actorId, createdAt }
  const purchase = { orderId: order?.id, orderItemId: item?.id }
  if (!actorId) return fail('form', 'Account information is unavailable.')

  switch (action.type) {
    case 'pickup': {
      if (!pickupEditable(order)) return fail('form', 'Pickup contact changes are unavailable for this order.')
      const pickupContact = { name: clean(action.name), email: clean(action.email), phone: clean(action.phone) }
      if (pickupContact.name.length < 2) return fail('name', 'Enter a full name.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pickupContact.email)) return fail('email', 'Enter a valid email address.')
      if (!/^\+?[\d().\s-]+$/.test(pickupContact.phone) || !/^\d{10,15}$/.test(pickupContact.phone.replace(/\D/g, ''))) {
        return fail('phone', 'Enter a valid phone number.')
      }
      return { summary: pickupContact, commit: () => ({
        state: {
          ...state,
          orders: replace(state.orders, order.id, { pickupContact, updatedAt: createdAt }),
          orderEvents: append(state.orderEvents, { ...common, id: id('oe'), orderId: order.id, type: 'pickup_contact_changed', status: 'confirmed',
            ...(order.pickupContact ? { previousContact: order.pickupContact } : {}), pickupContact }),
        }, message: 'Pickup person updated.',
      }) }
    }
    case 'cancel-items': {
      if (!cancelableOrder(order)) return fail('form', 'Cancellation is unavailable for this order.')
      const summary = chosenLines(order, action.selection, remaining)
      if (summary.error) return summary
      if (!cancelReasons.includes(action.reason)) return fail('reason', 'Choose a cancellation reason.')
      const updated = items(order).map((line) => {
        const change = summary.lines.find((entry) => entry.orderItemId === line.id)
        return change ? { ...line, canceledQuantity: count(line.canceledQuantity) + change.quantity } : line
      })
      const status = updated.every((line) => remaining(line) === 0) ? 'canceled' : order.status
      return { summary, commit: () => ({
        state: {
          ...state,
          orders: replace(state.orders, order.id, { items: updated, status, updatedAt: createdAt }),
          orderEvents: append(state.orderEvents, { ...common, id: id('oe'), orderId: order.id, type: 'items_canceled',
            status: 'confirmed', reason: action.reason, ...summary }),
        }, message: status === 'canceled' ? 'Order canceled.' : 'Selected items canceled.',
      }) }
    }
    case 'match': {
      if (!order) return fail('orderId', 'Choose an order.')
      if (!item) return fail('itemId', 'Choose an item.')
      const capacity = matchCapacity(state, order, item, now)
      if (!capacity) return fail('line', 'No units are available for a price match on this item.')
      if (!Object.hasOwn(offerChannels, action.offerChannel)) return fail('offerChannel', 'Choose where you found the offer.')
      const offerUnitPrice = Number(action.price)
      if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(clean(action.price)) || !validMoney(offerUnitPrice) || offerUnitPrice <= 0 || cents(offerUnitPrice) >= cents(item.unitPrice)) {
        return fail('price', 'Enter a positive offer price lower than the original unit price.')
      }
      const quantity = Number(action.quantity)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > capacity) return fail('quantity', 'Enter a quantity from 1 to ' + capacity + '.')
      const offerUrl = clean(action.offerUrl)
      if (offerUrl) {
        try {
          if (!/^https?:\/\//i.test(offerUrl) || !['http:', 'https:'].includes(new URL(offerUrl).protocol)) throw new Error()
        } catch {
          return fail('offerUrl', 'Enter an HTTP or HTTPS offer URL.')
        }
      }
      const summary = {
        originalUnitPrice: item.unitPrice, offerUnitPrice, quantity,
        requestedAmount: (cents(item.unitPrice) - cents(offerUnitPrice)) * quantity / 100,
      }
      return { summary, commit: () => {
        const request = { ...common, ...purchase, ...summary, id: id('pm'), status: 'submitted', offerChannel: action.offerChannel, ...(offerUrl ? { offerUrl } : {}) }
        return { state: { ...state, priceMatchRequests: append(state.priceMatchRequests, request) },
          message: 'Price match request ' + request.id + ' submitted.', anchor: request.id }
      } }
    }
    case 'add-plan': {
      if (!order) return fail('orderId', 'Choose an order.')
      if (!item) return fail('itemId', 'Choose an item.')
      if (!canAddPlan(state, order, item, now)) return fail('line', 'Protection is unavailable for this item.')
      const { name, termMonths, price, coverage } = item.protectionOffer
      const summary = { name, termMonths, price, coverage, ...planDates(order, item.protectionOffer, now) }
      return { summary, commit: () => {
        const planId = id('plan')
        const planRecord = { ...common, ...purchase, ...summary, id: planId, planNumber: 'GSP-' + planId.slice(5, 13).toUpperCase(), status: 'active', quantity: 1 }
        const event = { ...common, ...purchase, id: id('pe'), planId, type: 'added', status: 'confirmed', quantity: 1, amount: price }
        return { state: { ...state, protectionPlans: append(state.protectionPlans, planRecord), protectionPlanEvents: append(state.protectionPlanEvents, event) },
          message: 'Protection plan ' + planRecord.planNumber + ' added.', path: '/protection-plans/' + planId }
      } }
    }
    case 'claim':
    case 'cancel-plan': {
      if (!plan || !order || !item || plan.orderId !== order.id || plan.orderItemId !== item.id || planStatus(plan, now) !== 'active') {
        return fail('form', 'This plan is unavailable for that action.')
      }
      if (action.type === 'claim') {
        if (openClaim(state, plan)) return fail('form', 'This plan already has an open service request.')
        const description = clean(action.description)
        if (!issueOptions(plan).includes(action.issueType)) return fail('issueType', 'Choose an issue type.')
        if (!description) return fail('description', 'Describe the issue with your item.')
        const summary = { issueType: action.issueType, description }
        return { summary, commit: () => ({
          state: { ...state, protectionClaims: append(state.protectionClaims, { ...common, ...purchase, ...summary,
            id: id('claim'), planId: plan.id, status: 'submitted', quantity: 1 }) }, message: 'Service request submitted.',
        }) }
      }
      const reason = clean(action.reason)
      if (!reason) return fail('reason', 'Enter a reason for canceling the plan.')
      return { summary: { reason }, commit: () => ({
        state: {
          ...state, protectionPlans: replace(state.protectionPlans, plan.id, { status: 'canceled', canceledAt: createdAt }),
          protectionPlanEvents: append(state.protectionPlanEvents, { ...common, ...purchase, id: id('pe'), planId: plan.id, type: 'canceled',
            status: 'confirmed', quantity: 1, amount: 0, reason }),
        }, message: 'Protection plan canceled.',
      }) }
    }
    case 'return': {
      if (!order) return fail('orderId', 'Choose an order.')
      const summary = chosenLines(order, action.selection, (line) => returnCapacity(state, order, line, now), returnReasons)
      if (summary.error) return summary
      if (!['store', 'mail'].includes(action.method)) return fail('method', 'Choose how to return your items.')
      const store = find(state.stores, action.storeId)
      if (action.method === 'store' && !store) return fail('storeId', 'Choose a return store.')
      if (action.method === 'mail' && !summary.lines.every((line) => find(order.items, line.orderItemId)?.eligibility?.mailReturnable === true)) {
        return fail('method', 'The selected items must be returned to a store.')
      }
      return { summary, commit: () => {
        const returnId = id('ret')
        const destination = action.method === 'store' ? { storeId: store.id } : { mailReference: 'RMA-' + returnId.toUpperCase() }
        return { state: { ...state, returns: append(state.returns, { ...common, ...summary, ...destination, id: returnId,
          orderId: order.id, status: 'requested', method: action.method }) },
          message: 'Return requested.', path: '/returns/' + returnId }
      } }
    }
    case 'cancel-return': {
      if (record?.status !== 'requested') return fail('form', 'Only requested returns can be canceled.')
      return { summary: {}, commit: () => ({
        state: { ...state, returns: replace(state.returns, record.id, { status: 'canceled', canceledAt: createdAt, canceledBy: actorId }) },
        message: 'Return canceled.',
      }) }
    }
    default:
      return fail('form', 'This action is unavailable.')
  }
}

