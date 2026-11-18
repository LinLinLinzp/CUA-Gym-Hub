
const names = [
  ['deck-screws', 'Exterior Deck Screws, 1 lb.', 'Hardware', 12.98],
  ['shop-towels', 'Shop Towels, 3 Pack', 'Cleaning', 8],
  ['cedar-board', 'Cedar Deck Board, 8 ft.', 'Lumber', 16.48],
  ['deck-stain', 'Cedar Tone Deck Stain, 1 gal.', 'Paint', 34.98],
  ['joist-hanger', 'Galvanized Joist Hanger', 'Hardware', 2.48],
  ['paint-roller', 'Woven Paint Roller Kit', 'Paint', 13.97],
  ['drywall-patch', 'Self-Adhesive Drywall Patch', 'Building Materials', 7.98],
  ['wall-paint', 'Warm White Interior Paint, 1 gal.', 'Paint', 29.98],
  ['garden-soil', 'Raised Bed Garden Soil, 1 cu. ft.', 'Garden', 9.97],
  ['mulch', 'Natural Cedar Mulch, 2 cu. ft.', 'Garden', 5.48],
  ['hose', 'Kink-Resistant Garden Hose, 50 ft.', 'Garden', 28.98],
  ['pruners', 'Bypass Hand Pruners', 'Garden', 17.98],
  ['gloves', 'Nitrile Work Gloves, Medium', 'Safety', 6.47],
  ['safety-glasses', 'Clear Wraparound Safety Glasses', 'Safety', 8.97],
  ['pine-board', 'Primed Pine Trim Board, 8 ft.', 'Lumber', 14.98],
  ['wood-glue', 'Interior Wood Glue, 16 oz.', 'Hardware', 7.97],
  ['sanding-discs', '120-Grit Sanding Discs, 10 Pack', 'Tools', 11.47],
  ['drill-bits', 'Titanium Drill Bit Set, 15 Piece', 'Tools', 24.97],
  ['level', 'Magnetic Torpedo Level', 'Tools', 11.98],
  ['tape-measure', 'Tape Measure, 25 ft.', 'Tools', 14.97],
  ['led-bulbs', 'Soft White LED Bulbs, 4 Pack', 'Lighting', 12.98],
  ['wall-sconce', 'Matte Black Wall Sconce', 'Lighting', 42.97],
  ['switch', 'Single-Pole Light Switch', 'Electrical', 3.97],
  ['extension-cord', 'Outdoor Extension Cord, 25 ft.', 'Electrical', 21.98],
  ['faucet', 'Single-Handle Utility Faucet', 'Plumbing', 47.98],
  ['supply-line', 'Braided Faucet Supply Line', 'Plumbing', 8.48],
  ['plumbers-tape', 'Thread Seal Tape', 'Plumbing', 2.48],
  ['silicone', 'Clear Kitchen and Bath Silicone', 'Plumbing', 9.98],
  ['porcelain-tile', 'Matte Porcelain Tile, 12 × 24 in.', 'Flooring', 4.29],
  ['tile-spacers', 'Tile Spacers, 100 Pack', 'Flooring', 4.98],
  ['grout', 'Warm Gray Sanded Grout, 10 lb.', 'Flooring', 16.98],
  ['drop-cloth', 'Canvas Drop Cloth, 6 × 9 ft.', 'Paint', 19.98],
  ['storage-tote', 'Stackable Storage Tote, 18 gal.', 'Storage', 13.48],
  ['wall-track', 'Garage Wall Storage Track', 'Storage', 15.98],
  ['shelf-bracket', 'Heavy-Duty Shelf Bracket', 'Storage', 12.47],
  ['concrete-mix', 'Fast-Setting Concrete Mix, 50 lb.', 'Building Materials', 7.48],
]

const equipment = {
  'Floor Care': ['Drum Floor Sander', 'Orbital Floor Sander', 'Floor Edger', 'Floor Buffer', 'Carpet Cleaner', 'Tile Stripper', 'Hard Floor Cleaner', 'Carpet Blower'],
  'Lawn & Garden': ['Walk-Behind Tiller', 'Lawn Aerator', 'Brush Cutter', 'Electric Hedge Trimmer', 'Sod Cutter', 'Stump Grinder', 'Towable Lawn Roller', 'Plate Compactor'],
  'Power Tools': ['Rotary Hammer', 'Wet Tile Saw', 'Sliding Miter Saw', 'Electric Demolition Hammer', 'Belt Sander', 'Brad Nailer', 'Angle Grinder'],
  'Moving Equipment': ['Appliance Dolly', 'Furniture Dolly', 'Pallet Jack', 'Material Lift', 'Panel Cart', 'Hand Truck', 'Loading Ramp Set'],
}

const projectNames = [
  'Deck Refresh', 'Front Walkway', 'Kitchen Backsplash', 'Guest Bath Lighting',
  'Garage Storage Wall', 'Raised Herb Beds', 'Mudroom Shelves', 'Laundry Faucet',
  'Dining Room Paint', 'Porch Steps', 'Workshop Bench', 'Fence Repairs',
  'Pantry Upgrade', 'Basement Utility Shelves', 'Garden Hose Station', 'Hallway Trim',
  'Patio Planters', 'Office Lighting', 'Firewood Rack', 'Entryway Touch-Ups',
  'Bathroom Caulking', 'Spare Room Flooring', 'Side Yard Gate', 'Old Shed Repairs',
]

const actorId = 'account-casey-morgan'
const fixedDate = (day) => new Date(Date.UTC(2026, 10, day, 15, 0)).toISOString()
const cents = (value) => Math.round(value * 100) / 100

export function createInitialData() {
  const stores = [
    { id: 'store-north-ridge', name: 'North Ridge Rental Center', address: '1200 Ridgeway Ave, North Ridge, OH 44010' },
    { id: 'store-willow-creek', name: 'Willow Creek Rental Center', address: '460 Willow Run Rd, Willow Creek, OH 44012' },
    { id: 'store-maple-heights', name: 'Maple Heights Rental Center', address: '805 Maple Crossing, Maple Heights, OH 44137' },
  ]
  const products = names.map(([key, name, category, unitPrice], index) => ({
    id: 'product-' + key, sku: String(71000421 + index), name, category, unitPrice,
  }))
  const orderItem = (orderNumber, index, product, quantity, returnMethods) => ({
    id: 'line-' + orderNumber + '-' + (index + 1), productId: product.id,
    sku: product.sku, name: product.name, quantity, unitPrice: product.unitPrice, returnMethods,
  })
  const orders = Array.from({ length: 36 }, (_, index) => {
    const number = 10401 + index
    const status = ['delivered', 'processing', 'ready_for_pickup', 'shipped', 'picked_up', 'purchased', 'cancelled'][index]
      ?? ['delivered', 'picked_up', 'purchased'][index % 3]
    const fulfillment = status === 'purchased' ? 'in_store'
      : ['ready_for_pickup', 'picked_up'].includes(status) ? 'store_pickup' : 'ship_to_home'
    const methods = fulfillment === 'ship_to_home' ? ['in_store', 'mail'] : ['in_store']
    const items = index === 0
      ? [orderItem(number, 0, products[0], 2, methods), orderItem(number, 1, products[1], 1, [])]
      : [orderItem(number, 0, products[index], index === 7 ? 1 : index % 4 + 1, methods),
        orderItem(number, 1, products[(index + 5) % products.length], 2, index === 7 ? [] : methods)]
    const subtotal = cents(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
    const tax = cents(subtotal * 0.08)
    const shipping = fulfillment === 'ship_to_home' && index % 5 === 4 ? 5.99 : 0
    const logistics = fulfillment === 'ship_to_home'
      ? { deliveryAddress: '214 Hawthorn Lane, North Ridge, OH 44010',
        ...(['shipped', 'delivered'].includes(status) && { carrier: 'Parcel Ground', trackingNumber: 'PG-8030' + number }) }
      : { storeId: stores[index % stores.length].id }
    return {
      id: 'order-' + number, orderNumber: 'HD-' + number, actorId, createdAt: fixedDate(12 - index * 2),
      status, fulfillment, items, subtotal, tax, shipping, total: cents(subtotal + tax + shipping), ...logistics,
      ...(['delivered', 'picked_up', 'purchased'].includes(status) && { fulfilledAt: fixedDate(13 - index * 2) }),
      ...(status === 'cancelled' && { cancellation: { reason: 'changed_mind', actorId, createdAt: fixedDate(13 - index * 2) } }),
    }
  })
  const rentalTools = Object.entries(equipment).flatMap(([category, tools], group) => tools.map((name, index) => {
    const daily = index === 0 && group === 0 ? 69 : 39 + group * 9 + index * 5
    return {
      id: name === 'Drum Floor Sander' ? 'tool-floor-sander' : 'tool-' + name.toLowerCase().replaceAll(' ', '-'),
      name, category, rates: { fourHours: daily - 20, daily, weekly: daily * 4 },
      depositAmount: index % 2 === 0 ? 75 : 50, imageKey: ['floor', 'garden', 'power', 'moving'][group],
      storeIds: stores.filter((_, store) => store === index % 3 || (index % 3 !== 0 && store === (index + 1) % 3)).map(({ id }) => id),
    }
  }))
  const rentals = Array.from({ length: 24 }, (_, index) => {
    const tool = rentalTools[index]
    const status = ['reserved', 'active', 'completed', 'cancelled'][index % 4]
    return {
      id: 'rental-' + (2001 + index), toolId: tool.id, toolName: tool.name, storeId: tool.storeIds[0],
      pickupAt: index === 0 ? '2026-11-22T15:00:00.000Z' : fixedDate((status === 'reserved' ? 23 : 16) - index),
      durationHours: 24, quantity: 1, estimatedAmount: tool.rates.daily, depositAmount: tool.depositAmount,
      status, actorId, createdAt: fixedDate(16 - index * 2),
      ...(status === 'cancelled' && { cancellation: { actorId, createdAt: fixedDate(17 - index * 2) } }),
    }
  })
  const projectLists = projectNames.map((name, index) => {
    const number = 3001 + index
    const timestamp = fixedDate(10 - index)
    const items = Array.from({ length: index === 0 ? 5 : index % 7 }, (_, line) => {
      const { id, name, sku, unitPrice } = products[(index * 3 + line) % products.length]
      return {
        id: 'list-line-' + number + '-' + (line + 1), productId: id, name, sku, unitPrice,
        quantity: index === 0 && line === 0 ? 3 : 1 + (index + line) % 5,
        note: line === 0 ? (index === 0 ? 'Use on the stair treads.' : 'Check measurements before buying.') : '',
        status: line === 2 && index % 5 === 1 ? 'removed' : 'active', actorId, createdAt: timestamp, updatedAt: timestamp,
      }
    })
    return {
      id: 'list-' + number, name, description: index === 0 ? 'Replace weathered fasteners and finish the boards.' : '',
      status: index === 23 ? 'deleted' : 'active', items, actorId, createdAt: timestamp, updatedAt: timestamp,
    }
  })
  const returnOrders = [orders[0], ...orders.slice(7, 30)]
  const returns = returnOrders.map((order, index) => {
    const method = index !== 0 && index % 2 === 0 && order.fulfillment === 'ship_to_home' ? 'mail' : 'in_store'
    const items = order.items.slice(0, index > 1 && index % 4 === 0 ? 2 : 1).map((line) => ({
      orderItemId: line.id, productId: line.productId, quantity: 1,
      reason: index % 3 === 0 ? 'no_longer_needed' : 'did_not_fit', unitPrice: line.unitPrice, amount: line.unitPrice,
    }))
    return {
      id: 'return-' + (4001 + index), orderId: order.id, method,
      ...(method === 'in_store' && { storeId: stores[index % 3].id }),
      status: index === 6 ? 'in_transit' : ['requested', 'refunded', 'cancelled', 'received', 'refunded'][index % 5],
      items, refundAmount: cents(items.reduce((sum, item) => sum + item.amount, 0)),
      actorId, createdAt: fixedDate(14 - index * 2),
    }
  })
  return {
    account: { id: actorId, name: 'Casey Morgan', email: 'casey.morgan@example.test', preferredStoreId: stores[0].id },
    stores, products, orders, rentalTools, rentals, projectLists, returns,
  }
}
