import { quote } from './shipping.js'

const account = { id: 'acct-northline', name: 'Northline Goods', actorId: 'usr-01', currency: 'USD' }
const users = [
  { id: 'usr-01', name: 'Morgan Ellis', role: 'Shipping Coordinator' },
  { id: 'usr-02', name: 'Casey Nguyen', role: 'Outbound Lead' },
  { id: 'usr-03', name: 'Jordan Reyes', role: 'Warehouse Associate' },
  { id: 'usr-04', name: 'Avery Brooks', role: 'Operations Manager' },
]
const stores = [
  { id: 'store-01', name: 'Manual Orders', type: 'manual' },
  { id: 'store-02', name: 'Northline Online', type: 'shopify' },
  { id: 'store-03', name: 'Northline Workshop', type: 'etsy' },
  { id: 'store-04', name: 'Northline Marketplace', type: 'amazon' },
]
const address = (line1, city, region, postalCode) => ({ line1, city, region, postalCode, country: 'US' })
const locations = [
  { id: 'loc-01', name: 'Portland Warehouse', address: address('240 Cedar Spur', 'Portland', 'OR', '97205') },
  { id: 'loc-02', name: 'Columbus Fulfillment', address: address('195 Lantern Court', 'Columbus', 'OH', '43215') },
  { id: 'loc-03', name: 'Reno Distribution', address: address('810 Juniper Loop', 'Reno', 'NV', '89501') },
]
const firstNames = ['Mina', 'Rafael', 'Tessa', 'Iris', 'Jonah', 'Priya', 'Miles', 'Nora', 'Eden', 'Sylvia', 'Theo', 'Lena']
const lastNames = ['Patel', 'Santos', 'Holloway', 'Kim', 'Foster', 'Bennett', 'Alvarez', 'Chen']
const destinations = [
  ['Portland', 'OR', '97209'], ['Spokane', 'WA', '99201'], ['Boise', 'ID', '83702'], ['Denver', 'CO', '80205'],
  ['Austin', 'TX', '78702'], ['Madison', 'WI', '53703'], ['Durham', 'NC', '27701'], ['Providence', 'RI', '02903'],
]
const streets = ['Thimble Lane', 'Mossbank Way', 'Wren Hollow', 'Sable Creek Drive', 'Blue Heron Spur', 'Copperleaf Court']
const products = [
  ['NLG-CANVAS-04', 'Canvas tool roll', 28], ['NLG-MUG-12', 'Speckled trail mug', 18.5],
  ['NLG-POUCH-02', 'Waxed canvas pouch', 22], ['NLG-TOTE-14', 'Field tote', 34],
  ['NLG-BOOK-06', 'Pocket field journal', 9.5], ['NLG-STRAP-08', 'Utility strap set', 14],
]
const batchNames = [
  'Portland morning pickup', 'East Coast Economy', 'Friday Parcel Pickup', 'Portland Priority',
  'Marketplace dispatch', 'Mountain West boxes', 'Afternoon mailers', 'Online store pickup',
  'Great Lakes Economy', 'Manual order dispatch', 'West Coast ground', 'Workshop weekend orders',
  'Columbus regional pickup', 'Pacific Priority', 'Reno outbound parcels', 'Midweek marketplace',
  'Northwest mailers', 'Thursday ground orders', 'Weekend priority parcels', 'Workshop outbound',
  'Reno first pickup', 'Columbus afternoon route', 'Online store parcels', 'Economy pickup',
  'Mountain region parcels', 'Tuesday workshop dispatch',
]
const stamp = (i, offset = 0) => new Date(Date.UTC(2025, 8, 8 + Math.floor(i / 4) + offset, 15 + i % 4, 15)).toISOString()
const metadata = (i, offset) => ({ createdAt: stamp(i, offset), createdBy: account.actorId })
const item = (n, index, product, quantity) => ({
  id: 'item-' + n + '-' + index, sku: product[0], name: product[1], quantity, unitPrice: product[2],
})

export function createInitialData() {
  const orders = Array.from({ length: 96 }, (_, i) => {
    const n = 1001 + i
    const items = i === 3 ? [] : [item(n, 1, products[i % products.length], i === 40 ? 2 : i === 41 ? 1 : 1 + i % 3)]
    if (i % 4 === 2) items.push(item(n, 2, products[(i + 1) % products.length], 1))
    return {
      id: 'ord-' + n, number: 'NG-' + n, storeId: stores[i % stores.length].id, orderedAt: stamp(i),
      status: i < 40 ? 'awaiting_shipment' : i < 74 ? 'shipped' : i < 82 ? 'on_hold' : i < 90 ? 'awaiting_payment' : 'cancelled',
      recipient: { name: firstNames[i % firstNames.length] + ' ' + lastNames[Math.floor(i / firstNames.length)] },
      shipTo: address(110 + i * 7 + ' ' + streets[i % streets.length], ...destinations[i % destinations.length]),
      items, total: items.reduce((total, line) => total + Math.round(line.unitPrice * 100) * line.quantity, 0) / 100,
      notes: i % 9 === 0 ? 'Leave at the receiving desk.' : '',
      ...(i !== 0 && i !== 25 && { shipping: {
        shipFromId: locations[i % locations.length].id, carrier: i % 3 === 0 ? 'UPS' : 'USPS',
        service: i % 3 === 0 ? 'Ground' : i % 3 === 1 ? 'Ground Advantage' : 'Priority Mail',
        packageType: i % 3 === 1 ? 'Mailer' : 'Box', weightOz: 10 + i % 27,
        dimensionsIn: { length: 10 + i % 4, width: 7, height: i % 3 === 1 ? 1 : 4 },
      } }),
      ...metadata(i),
    }
  })
  const batches = batchNames.map((name, i) => {
    const n = 3001 + i
    const open = i < 10
    const archived = i >= 18
    const index = open ? i * 2 : 40 + (i - 10) * 2
    const members = orders.slice(index, index + 2)
    const timeIndex = open ? 60 + i : index
    return {
      id: 'bat-' + n, number: 'B-' + n, name, status: open ? 'open' : archived ? 'archived' : 'processed',
      assigneeId: users[i % users.length].id, orderIds: members.map(order => order.id), ...metadata(timeIndex, 1),
      ...(!open && { processedAt: stamp(timeIndex, 2), totalCost: members.reduce((total, order) => total + quote(order.shipping), 0) / 100 }),
      ...(archived && { archivedAt: stamp(timeIndex, 3) }),
    }
  })
  const outbound = [...orders.slice(40, 74), ...orders.slice(31, 35)].map((order, i) => {
    const n = 2001 + i
    const voided = i >= 34
    return {
      id: 'lbl-' + n, number: 'LBL-' + n, orderId: order.id, direction: 'outbound',
      status: voided ? 'voided' : 'active',
      trackingStatus: i >= 30 ? 'label_created' : i % 5 === 0 ? 'in_transit' : 'delivered',
      trackingNumber: 'SIM-' + order.shipping.carrier.toUpperCase() + '-' + n,
      shipping: order.shipping, shipTo: order.shipTo,
      shipFrom: locations.find(location => location.id === order.shipping.shipFromId).address,
      cost: quote(order.shipping) / 100, ...metadata(i + (voided ? 0 : 40), 2),
      ...(i < 32 && { batchId: batches[10 + Math.floor(i / 2)].id }),
      ...(voided && { voidedAt: stamp(i, 3) }),
    }
  })
  const inbound = []
  const returns = Array.from({ length: 30 }, (_, i) => {
    const n = 4001 + i
    const labelNumber = 2039 + i
    const order = orders[40 + i]
    const warehouse = locations[i % locations.length]
    const { shipFromId, ...shipping } = order.shipping
    const voided = i >= 26
    const received = i >= 14 && !voided
    const cost = quote(shipping) / 100
    const time = metadata(42 + i, 5)
    inbound.push({
      id: 'lbl-' + labelNumber, number: 'LBL-' + labelNumber, orderId: order.id, returnId: 'ret-' + n,
      direction: 'return', status: voided ? 'voided' : 'active', trackingStatus: received ? 'delivered' : 'label_created',
      trackingNumber: 'SIM-' + shipping.carrier.toUpperCase() + '-' + labelNumber,
      shipping, shipFrom: order.shipTo, shipTo: warehouse.address, cost, ...time,
      ...(voided && { voidedAt: stamp(42 + i, 7) }),
    })
    return {
      id: 'ret-' + n, rma: 'RMA-' + n, orderId: order.id, labelId: 'lbl-' + labelNumber,
      outboundLabelId: outbound[i].id, locationId: warehouse.id,
      items: [{ orderItemId: order.items[0].id, quantity: 1, reason: ['Does Not Fit', 'Damaged', 'Wrong Item', 'Changed Mind'][i % 4] }],
      status: voided ? 'voided' : received ? 'received' : 'outstanding', cost, notes: '', ...time,
      ...(received && { receivedDate: stamp(42 + i, 7).slice(0, 10) }),
      ...(voided && { voidedAt: stamp(42 + i, 7) }),
    }
  })
  const activity = batches.slice(10, 14).map((batch, i) => ({
    id: 'act-' + (5001 + i), action: 'batch_processed', actorId: account.actorId, createdAt: batch.processedAt,
    orderIds: batch.orderIds, labelIds: outbound.filter(label => label.batchId === batch.id).map(label => label.id),
    batchId: batch.id, details: { status: 'processed', orderCount: batch.orderIds.length, totalCost: batch.totalCost },
  }))
  return structuredClone({ account, users, stores, locations, orders, labels: [...outbound, ...inbound], batches, returns, activity })
}

