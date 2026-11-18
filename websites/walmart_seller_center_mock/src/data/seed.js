import { artKeys, categories, cents } from '../model.js'

const account = {
  id: 'seller-hp01',
  storeName: 'Harbor & Pine Supply',
  actorId: 'usr-maya-chen',
  actorName: 'Maya Chen',
  inventoryLocation: 'Columbus Fulfillment Center',
  currency: 'USD',
}

const products = [
  ['Bamboo Drawer Organizer', 'Ceramic Pour-Over Set', 'Linen Dinner Napkins', 'Maple Cutting Board', 'Stoneware Mixing Bowls', 'Glass Pantry Jars', 'Silicone Baking Mat', 'Enamel Prep Tray', 'Acacia Serving Tongs', 'Stainless Steel Measuring Cups'],
  ['Stacking Storage Baskets', 'Canvas Underbed Bin', 'Cedar Shoe Rack', 'Woven Entry Basket', 'Modular Shelf Dividers', 'Felt Drawer Trays', 'Closet Garment Bag', 'Wall-Mount Key Rail', 'Foldable Laundry Hamper', 'Label Clip Set'],
  ['Folding Camp Stool', 'Ripstop Picnic Blanket', 'Rechargeable Trail Lantern', 'Insulated Cooler Tote', 'Garden Kneeling Pad', 'Compact Hammock', 'Copper Plant Markers', 'Collapsible Water Carrier', 'All-Weather Deck Cushion', 'Steel Camp Mug'],
  ['Walnut Monitor Stand', 'Undated Desk Planner', 'Cork Desk Mat', 'Steel Document Tray', 'Softcover Grid Notebook', 'Felt Cable Organizer', 'Recycled Paper File Folders', 'Adjustable Reading Stand', 'Brass Binder Clips'],
  ['Elevated Pet Bowls', 'Washable Crate Mat', 'Braided Rope Tug', 'Travel Water Bowl', 'Reflective Nylon Leash', 'Treat Training Pouch', 'Soft Pet Grooming Brush', 'Cat Window Perch', 'Rubber Slow Feeder'],
]

const collections = ['Harbor & Pine', 'Juniper House', 'Field Ledger', 'Fern & Flint']
const people = ['Jordan Avery', 'Nina Patel', 'Miles Brooks', 'Elena Torres', 'Kai Nguyen', 'Sofia Reed', 'Cameron Ellis', 'Priya Shah', 'Jasper Lin', 'Taylor Morgan', 'Amelia Ortiz', 'Reese Carter']
const addresses = [
  ['14 Cedar Trace', 'Columbus', 'OH', '43215'], ['82 Willow Ridge', 'Madison', 'WI', '53703'],
  ['326 Alder Lane', 'Boulder', 'CO', '80302'], ['51 Mesa Bend', 'Tucson', 'AZ', '85701'],
  ['710 Maple Court', 'Raleigh', 'NC', '27601'], ['22 Rainier Way', 'Tacoma', 'WA', '98402'],
]
const reasons = ['Arrived damaged', 'Wrong item received', 'No longer needed', 'Item did not match description', 'Missing parts']
const stamp = (day, hour = 14, month = 11) => new Date(Date.UTC(2026, month - 1, day, hour)).toISOString()

export function createInitialData() {
  const items = products.flatMap((names, group) => names.map((name, offset) => {
    const index = group * 10 + offset
    const [price, availableQuantity] = index === 0 ? [24.95, 37] : [12.45 + (index * 7 % 64), index % 7 === 3 ? 0 : index * 13 % 92 + 1]
    return {
      id: 'itm-' + (1001 + index),
      sku: 'HP-' + ['KT', 'HO', 'OU', 'OF', 'PT'][group] + '-' + (101 + offset),
      name, brand: collections[index % collections.length], category: categories[group],
      productId: String(850000100016 + index * 10).padStart(14, '0'),
      description: index === 0 ? 'Six compartments with a natural finish.' : name + ' from the ' + collections[index % collections.length] + ' collection.',
      imageKey: artKeys[group], price, availableQuantity,
      status: index % 11 === 8 ? 'draft' : index % 11 === 9 ? 'unpublished' : index % 11 === 10 ? 'retired' : 'published',
      fulfillment: index % 7 === 5 ? 'walmart' : 'seller',
      createdAt: stamp(19 + index % 8, 15, 10), updatedAt: stamp(14 - index % 11, 10), updatedBy: account.actorId,
    }
  }))
  const itemActions = items.slice(0, 8).map(({ id, createdAt, updatedAt, updatedBy, ...fields }, index) => ({
    id: 'ia-' + (1001 + index), itemId: id, sku: fields.sku, type: 'created',
    actorId: account.actorId, createdAt, status: fields.status, before: {}, after: fields,
  }))

  const orders = Array.from({ length: 60 }, (_, index) => {
    const sequence = 2010 + index
    const status = index < 12 ? 'new' : index < 22 ? 'acknowledged' : index < 56 ? 'shipped' : 'canceled'
    const createdDay = index < 22 ? 16 + index % 3 : 3 + index % 8
    const createdAt = stamp(createdDay, 10)
    const [address1, city, state, postalCode] = addresses[index % addresses.length]
    const lines = Array.from({ length: index % 3 === 0 || index === 33 ? 2 : 1 }, (_, lineIndex) => {
      const item = items[(index * 7 + lineIndex * 3) % items.length]
      const quantity = index === 0 ? 2 : 1 + (index + lineIndex + 1) % 4
      return {
        id: 'ol-' + sequence + '-' + (lineIndex + 1), itemId: item.id, sku: item.sku, itemName: item.name,
        quantity, unitPrice: item.price, amount: cents(item.price) * quantity / 100, status,
      }
    })
    return {
      id: String(6402108012010 + index), customerOrderId: String(20001456002210 + index),
      customerName: people[index % people.length], shipTo: { address1, city, state, postalCode },
      fulfillment: index % 9 === 7 ? 'walmart' : 'seller', status,
      total: lines.reduce((sum, line) => sum + cents(line.amount), 0) / 100, lines, createdAt,
      shipByAt: stamp(createdDay + 2, 17), updatedAt: stamp(createdDay, 16), updatedBy: account.actorId,
      ...(status === 'acknowledged' || status === 'shipped' ? { acknowledgedAt: stamp(createdDay, 11) } : {}),
      ...(status === 'shipped' ? { shippedAt: stamp(createdDay, 16) } : {}),
      ...(status === 'canceled' ? { canceledAt: stamp(createdDay, 16) } : {}),
    }
  })
  const orderActions = orders.filter((order) => order.status !== 'new').map((order, index) => ({
    id: 'oa-' + (2010 + index), orderId: order.id, type: order.status, status: order.status,
    actorId: account.actorId, createdAt: order.status === 'acknowledged' ? order.acknowledgedAt : order.updatedAt,
    lines: order.lines.map((line) => ({ orderLineId: line.id, sku: line.sku, quantity: line.quantity })),
    ...(order.status === 'shipped' ? { carrier: 'UPS', trackingNumber: '1ZHP000000' + (2010 + index) } : {}),
    ...(order.status === 'canceled' ? { reason: 'Out of stock' } : {}),
  }))

  const returns = orders.slice(22, 52).map((order, index) => {
    const sequence = 3010 + index
    const status = index < 10 ? 'in_transit' : index < 22 ? 'received' : 'refunded'
    const refundStatus = status === 'refunded' ? 'refunded' : index === 10 ? 'partially_refunded' : 'not_refunded'
    const lines = order.lines.map((line, i) => ({
      id: 'rl-' + sequence + '-' + (i + 1), orderLineId: line.id, itemId: line.itemId,
      sku: line.sku, itemName: line.itemName, quantity: line.quantity, unitRefundAmount: line.unitPrice,
      refundedQuantity: status === 'refunded' ? line.quantity : index === 10 ? 1 : 0,
    }))
    const refundableAmount = lines.reduce((sum, line) => sum + cents(line.unitRefundAmount) * line.quantity, 0) / 100
    const refundedAmount = lines.reduce((sum, line) => sum + cents(line.unitRefundAmount) * line.refundedQuantity, 0) / 100
    const createdAt = stamp(12 + index % 3, 12)
    const receivedAt = stamp(15 + index % 3, 10)
    const latest = stamp(18, 16)
    return {
      id: String(7000160003010 + index), orderId: order.id, customerName: order.customerName,
      reason: reasons[index % reasons.length], status, refundStatus, refundableAmount, refundedAmount, lines,
      carrier: index % 2 === 0 ? 'FedEx' : 'USPS', trackingNumber: 'HP46' + (805063010 + index),
      createdAt, updatedAt: refundedAmount ? latest : status === 'received' ? receivedAt : createdAt,
      updatedBy: account.actorId,
      ...(status !== 'in_transit' ? { receivedAt } : {}),
      ...(status === 'refunded' ? { refundedAt: latest } : {}),
    }
  })

  const returnActions = returns.filter((record) => record.receivedAt).map((record, index) => ({
    id: 'ra-' + (3010 + index), returnId: record.id, orderId: record.orderId, type: 'received', status: 'received',
    actorId: account.actorId, createdAt: record.receivedAt,
    lines: record.lines.map(({ id, orderLineId, sku, quantity }) => ({ returnLineId: id, orderLineId, sku, quantity })),
  }))
  const refunds = returns.filter((record) => record.refundedAmount > 0).map((record, index) => ({
    id: 'rf-' + (3010 + index), returnId: record.id, orderId: record.orderId, actorId: account.actorId,
    createdAt: record.updatedAt, status: 'issued', currency: 'USD', amount: record.refundedAmount,
    lines: record.lines.filter((line) => line.refundedQuantity).map(({ id, orderLineId, sku, refundedQuantity, unitRefundAmount }) => ({
      returnLineId: id, orderLineId, sku, quantity: refundedQuantity, amount: cents(unitRefundAmount) * refundedQuantity / 100,
    })),
  }))
  return { account: { ...account }, items, itemActions, orders, orderActions, returns, returnActions, refunds }
}
