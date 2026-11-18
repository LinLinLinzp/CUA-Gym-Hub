import { activeLabel, cents, completeAddress, openBatches, outboundIssue, quote, returnable, returnIssue, rows, unusedLabel } from './shipping.js'

const fail = message => { throw new Error(message) }
const requireThat = (condition, message) => { if (!condition) fail(message) }
const find = (state, key, id) => rows(state[key]).find(record => record.id === id)
const append = (state, key, record) => { state[key] = [...rows(state[key]), record] }
const update = (state, key, id, fields) => {
  state[key] = rows(state[key]).map(record => record.id === id ? { ...record, ...fields } : record)
}
const unique = values => [...new Set(rows(values))]
const normalize = value => String(value ?? '').trim().toLowerCase()
const editable = status => ['awaiting_payment', 'awaiting_shipment', 'on_hold'].includes(status)

export function batchOrderIssues(state, ids, batchId) {
  return ids.flatMap(id => {
    const order = find(state, 'orders', id)
    const name = order?.number || id
    if (openBatches(state, id).some(batch => batch.id !== batchId)) return [name + ' belongs to another open batch.']
    if (order?.status !== 'awaiting_shipment') return [name + ' is unavailable or is no longer awaiting shipment.']
    return []
  })
}

export function batchReview(state, batch) {
  return unique(batch.orderIds).map(id => {
    const order = find(state, 'orders', id)
    const issue = outboundIssue(state, order, order?.shipping, batch.id)
    return { id, order, issue, cents: issue ? null : quote(order.shipping) }
  })
}

const sequences = {
  labels: ['LBL-', 2001, 'number'], batches: ['B-', 3001, 'number'], returns: ['RMA-', 4001, 'rma'],
}
function displayNumber(state, collection) {
  const [prefix, start, field] = sequences[collection]
  const issued = new Set(rows(state[collection]).map(record => normalize(record[field])))
  let candidate = start
  do {
    if (!issued.has(normalize(prefix + candidate))) return prefix + candidate
    candidate++
  } while (true)
}

export const reasons = ['Damaged', 'Wrong Item', 'Does Not Fit', 'Changed Mind', 'Other']

export function applyAction(world, action, data) {
  const state = { ...world }
  const time = new Date().toISOString()
  const actor = state.account?.actorId || rows(state.users)[0]?.id || 'usr-01'
  const created = { createdAt: time, createdBy: actor }
  const updated = { updatedAt: time, updatedBy: actor }
  const record = (action, { orderIds = [], labelIds = [], batchId, returnId, details = {} } = {}) =>
    append(state, 'activity', { id: crypto.randomUUID(), action, orderIds, labelIds, batchId, returnId,
      createdAt: time, actorId: actor, details })
  const order = find(state, 'orders', data.orderId)
  const label = find(state, 'labels', data.labelId)
  const batch = find(state, 'batches', data.batchId)
  const authorization = find(state, 'returns', data.returnId)
  let result

  function createLabel(source, shipping, shipFrom, shipTo, related) {
    const number = displayNumber(state, 'labels')
    const carrier = shipping.carrier.toUpperCase()
    const trackingStem = 'SIM-' + carrier + '-' + number.slice(4)
    const taken = new Set(rows(state.labels).map(entry => normalize(entry.trackingNumber)))
    let trackingNumber = trackingStem
    for (let suffix = 2; taken.has(normalize(trackingNumber)); suffix++) trackingNumber = trackingStem + '-' + suffix
    const entry = {
      id: crypto.randomUUID(), number, orderId: source.id, trackingNumber,
      direction: 'outbound', status: 'active', trackingStatus: 'label_created', shipFrom, shipTo,
      shipping, cost: quote(shipping) / 100, ...related, ...created,
    }
    append(state, 'labels', entry)
    return entry
  }

  function createOutbound(source, shipping, batchId) {
    const origin = find(state, 'locations', shipping.shipFromId)
    const entry = createLabel(source, shipping, origin.address, source.shipTo, batchId ? { batchId } : {})
    update(state, 'orders', source.id, { shipping, status: 'shipped', ...updated })
    return entry
  }

  switch (action) {
    case 'order_created': {
      const { number, recipient, shipTo, storeId, notes } = data
      requireThat(number.trim() && number.length <= 48, 'Enter an order number up to 48 characters.')
      requireThat(find(state, 'stores', storeId)?.type === 'manual', 'Select a manual store.')
      requireThat(!rows(state.orders).some(entry => entry.storeId === storeId && normalize(entry.number) === normalize(number)),
        'This order number already exists in the selected store.')
      requireThat(recipient.name.trim() && completeAddress(shipTo), 'Enter the recipient and a complete shipping address.')
      const items = rows(data.items).map(item => {
        requireThat(item.sku.trim() && item.name.trim() && Number.isInteger(item.quantity) && item.quantity > 0
          && Number.isSafeInteger(cents(item.unitPrice) * item.quantity) && item.unitPrice >= 0,
        'Complete each item with a SKU, name, positive whole quantity, and nonnegative price.')
        return { ...item, unitPrice: cents(item.unitPrice) / 100, id: crypto.randomUUID() }
      })
      const totalCents = items.reduce((sum, item) => sum + cents(item.unitPrice) * item.quantity, 0)
      requireThat(Number.isSafeInteger(totalCents), 'Order total is too large.')
      result = { id: crypto.randomUUID(), number, recipient, shipTo, storeId, notes, items,
        total: totalCents / 100, orderedAt: time, status: 'awaiting_shipment', ...created }
      append(state, 'orders', result)
      record(action, { orderIds: [result.id], details: { status: result.status, total: result.total } })
      break
    }
    case 'order_updated':
    case 'shipping_options_saved': {
      requireThat(editable(order?.status), 'This order is no longer editable.')
      const fields = action === 'order_updated'
        ? { recipient: { ...order.recipient, ...data.recipient }, shipTo: { ...order.shipTo, ...data.shipTo }, notes: data.notes }
        : { shipping: data.shipping }
      if (data.shipping) {
        requireThat(completeAddress(find(state, 'locations', data.shipping.shipFromId)?.address) && quote(data.shipping) !== null,
          'Select a complete origin, service and package.')
      } else requireThat(fields.recipient.name.trim() && completeAddress(fields.shipTo), 'Enter a complete recipient and address.')
      update(state, 'orders', order.id, { ...fields, ...updated })
      record('order_updated', { orderIds: [order.id], details: { fields: Object.keys(fields) } })
      break
    }
    case 'order_status_changed': {
      const transitions = {
        awaiting_payment: ['awaiting_shipment', 'cancelled'],
        awaiting_shipment: ['on_hold', 'cancelled'],
        on_hold: ['awaiting_shipment', 'cancelled'],
      }
      requireThat(transitions[order?.status]?.includes(data.status), 'This status change is unavailable.')
      requireThat(!['on_hold', 'cancelled'].includes(data.status) || !openBatches(state, order.id).length,
        'Remove this order from its open batch first.')
      update(state, 'orders', order.id, { status: data.status, ...updated })
      record(action, { orderIds: [order.id], details: { fromStatus: order.status, status: data.status } })
      break
    }
    case 'outbound_label_created': {
      const issue = outboundIssue(state, order, data.shipping)
      requireThat(!issue, issue)
      requireThat(quote(data.shipping) === data.reviewedCents, 'Review the updated postage before confirming.')
      result = createOutbound(order, data.shipping)
      record(action, { orderIds: [order.id], labelIds: [result.id], details: { cost: result.cost, trackingNumber: result.trackingNumber } })
      break
    }
    case 'outbound_label_voided': {
      requireThat(label?.direction === 'outbound' && unusedLabel(label), 'Only unused outbound labels can be voided.')
      update(state, 'labels', label.id, { status: 'voided', voidedAt: time, ...updated })
      const source = find(state, 'orders', label.orderId)
      const reopened = source?.status === 'shipped' && !activeLabel(state, label.orderId)
      if (reopened) update(state, 'orders', source.id, { status: 'awaiting_shipment', ...updated })
      record(action, { orderIds: label.orderId ? [label.orderId] : [], labelIds: [label.id],
        batchId: label.batchId, details: { reopened } })
      break
    }
    case 'labels_print_requested': {
      const ids = unique(data.labelIds)
      requireThat(!data.batchId || batch, 'This batch is unavailable.')
      const labels = ids.map(id => find(state, 'labels', id))
      requireThat(labels.length && labels.every(entry => entry?.status === 'active'
        && (!batch || entry.batchId === batch.id)), 'Select active labels to print.')
      record(action, { orderIds: unique(labels.map(entry => entry.orderId)), batchId: batch?.id,
        returnId: labels.length === 1 ? labels[0].returnId : undefined, labelIds: ids, details: { labelCount: ids.length } })
      break
    }
    case 'batch_created':
    case 'batch_updated': {
      const { name, assigneeId } = data
      requireThat(name.trim() && name.length <= 80, 'Enter a batch name up to 80 characters.')
      requireThat(!assigneeId || find(state, 'users', assigneeId), 'Select an available operator.')
      if (action === 'batch_created') {
        const orderIds = unique(data.orderIds)
        const issues = batchOrderIssues(state, orderIds)
        requireThat(!issues.length, issues.join(' '))
        result = { id: crypto.randomUUID(), number: displayNumber(state, 'batches'), name, assigneeId, orderIds,
          status: 'open', ...created }
        append(state, 'batches', result)
        record(action, { orderIds, batchId: result.id, details: { name, assigneeId } })
      } else {
        requireThat(batch?.status === 'open', 'This batch is no longer open.')
        update(state, 'batches', batch.id, { name, assigneeId, ...updated })
        record(action, { orderIds: rows(batch.orderIds), batchId: batch.id, details: { fields: ['name', 'assigneeId'].filter(key => batch[key] !== data[key]) } })
      }
      break
    }
    case 'batch_orders_added':
    case 'batch_orders_removed': {
      requireThat(batch?.status === 'open', 'This batch is no longer open.')
      const current = unique(batch.orderIds)
      const adding = action === 'batch_orders_added'
      const affected = unique(data.orderIds).filter(id => current.includes(id) !== adding)
      requireThat(affected.length, adding ? 'Choose orders outside this batch.' : 'Choose orders in this batch.')
      if (adding) {
        const issues = batchOrderIssues(state, affected, batch.id)
        requireThat(!issues.length, issues.join(' '))
      }
      const orderIds = adding ? [...current, ...affected] : current.filter(id => !affected.includes(id))
      update(state, 'batches', batch.id, { orderIds, ...updated })
      record(action, { orderIds: affected, batchId: batch.id, details: { orderIds: affected } })
      break
    }
    case 'batch_processed': {
      requireThat(batch?.status === 'open', 'This batch is no longer open.')
      const review = batchReview(state, batch)
      requireThat(review.length && review.every(entry => !entry.issue), 'Resolve all order issues before processing.')
      const cost = review.reduce((total, entry) => total + entry.cents, 0)
      requireThat(cost === data.reviewedCents && review.length === data.orderCount, 'Review the updated batch before confirming.')
      const labelIds = review.map(({ order }) => createOutbound(order, order.shipping, batch.id).id)
      const totalCost = cost / 100
      update(state, 'batches', batch.id, { status: 'processed', processedAt: time, totalCost, ...updated })
      record(action, { orderIds: review.map(entry => entry.id), labelIds, batchId: batch.id,
        details: { status: 'processed', orderCount: review.length, totalCost } })
      break
    }
    case 'batch_archived': {
      requireThat(batch?.status === 'processed', 'Only processed batches can be archived.')
      update(state, 'batches', batch.id, { status: 'archived', archivedAt: time, ...updated })
      record(action, { batchId: batch.id, orderIds: rows(batch.orderIds), details: { status: 'archived' } })
      break
    }
    case 'return_authorized': {
      const issue = returnIssue(state, order)
      requireThat(!issue, issue)
      const { items, shipping, locationId, notes } = data
      const warehouse = find(state, 'locations', locationId)
      requireThat(completeAddress(warehouse?.address) && warehouse.address.country === order.shipTo.country,
        'Select a warehouse with a complete address in the recipient’s country.')
      requireThat(items.length && unique(items.map(item => item.orderItemId)).length === items.length
        && items.every(item => {
          const source = rows(order.items).find(line => line.id === item.orderItemId)
          return source && Number.isInteger(item.quantity) && item.quantity > 0
            && item.quantity <= returnable(state, order, source) && reasons.includes(item.reason)
        }), 'Choose at least one item with an available quantity and a reason.')
      requireThat(quote(shipping) !== null && quote(shipping) === data.reviewedCents, 'Review the completed return shipping options.')
      const outbound = rows(state.labels).find(entry => entry.id === data.outboundLabelId && entry.orderId === order.id
        && entry.direction === 'outbound' && entry.status === 'active')
        || rows(state.labels).find(entry => entry.orderId === order.id && entry.direction === 'outbound' && entry.status === 'active')
      const id = crypto.randomUUID()
      const inbound = createLabel(order, shipping, order.shipTo, warehouse.address, { direction: 'return', returnId: id })
      result = { id, rma: displayNumber(state, 'returns'), orderId: order.id, labelId: inbound.id,
        ...(outbound && { outboundLabelId: outbound.id }), locationId, status: 'outstanding', items, notes, cost: inbound.cost, ...created }
      append(state, 'returns', result)
      record(action, { orderIds: [order.id], labelIds: [inbound.id], returnId: id, details: { items, cost: inbound.cost } })
      break
    }
    case 'return_received':
    case 'return_voided': {
      requireThat(authorization?.status === 'outstanding', 'Only outstanding returns can be updated.')
      const linked = find(state, 'labels', authorization.labelId)
      const receiving = action === 'return_received'
      const details = receiving ? { receivedDate: data.receivedDate } : { status: 'voided' }
      if (receiving) {
        const date = new Date(data.receivedDate + 'T00:00:00Z')
        requireThat(/^\d{4}-\d{2}-\d{2}$/.test(data.receivedDate) && !Number.isNaN(+date)
          && date.toISOString().slice(0, 10) === data.receivedDate, 'Enter a valid warehouse receipt date.')
      } else {
        requireThat(linked?.direction === 'return' && linked.returnId === authorization.id && unusedLabel(linked),
          'An active unused inbound label is required to cancel this return.')
        update(state, 'labels', linked.id, { status: 'voided', voidedAt: time, ...updated })
      }
      update(state, 'returns', authorization.id, { status: receiving ? 'received' : 'voided',
        ...(receiving ? details : { voidedAt: time }), ...updated })
      record(action, { orderIds: authorization.orderId ? [authorization.orderId] : [],
        labelIds: linked ? [linked.id] : [], returnId: authorization.id, details })
      break
    }
    default: fail('Unknown workspace action.')
  }
  return { state, result }
}

