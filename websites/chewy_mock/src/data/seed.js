const catalog = [
  ['dog_food', '24 lb bag', 'Turkey & Oat Recipe Dry Dog Food', 'Chicken & Brown Rice Kibble', 'Salmon & Barley Sensitive Skin Recipe', 'Lamb & Sweet Potato Kibble', 'Beef & Pumpkin Adult Recipe', 'Small Breed Chicken Kibble'],
  ['cat_food', '12 count', 'Chicken Pâté Wet Cat Food', 'Tuna Flaked Entrées', 'Salmon Chunks in Gravy', 'Turkey & Liver Dinner', 'Whitefish Pâté Variety Pack', 'Indoor Chicken Dry Cat Food'],
  ['litter', '18 lb bag', 'Unscented Clumping Cat Litter', 'Low Dust Clay Cat Litter', 'Pine Pellet Cat Litter', 'Corn & Cassava Cat Litter', 'Lightweight Multi-Cat Litter', 'Paper Pellet Cat Litter'],
  ['chews', '12 count', 'Mint Dental Chews', 'Peanut Butter Training Bites', 'Sweet Potato Chew Strips', 'Chicken Jerky Bites', 'Beef Tendon Chews', 'Pumpkin & Oat Biscuits'],
  ['grooming', '1 pack', 'Oatmeal Dog Shampoo', 'Soft Slicker Brush', 'Hypoallergenic Pet Wipes', 'Deodorizing Coat Spray', 'Cat Nail Clippers', 'Double-Sided Grooming Comb'],
  ['toys', '1 pack', 'Squeaky Canvas Fox', 'Braided Cotton Tug', 'Crinkle Feather Wand', 'Catnip Felt Mouse Set', 'Treat Puzzle Ball', 'Natural Rubber Fetch Ring'],
  ['small_pet', '1 pack', 'Timothy Hay for Small Pets', 'Paper Bedding', 'Rabbit Willow Chew Rings', 'Alfalfa Pellets', 'Applewood Chew Sticks', 'Ceramic Feeding Bowl'],
  ['supplies', '1 pack', 'Senior Dog Mobility Supplement', 'Waste Bags with Handles', 'Stainless Steel Water Bowl', 'Washable Feeding Mat', 'Travel Water Bottle', 'Disposable Puppy Pads'],
]

const petNames = [
  ['Juniper', 'Dog', 'Australian Shepherd mix'], ['Pippin', 'Cat', 'Domestic Shorthair'], ['Biscuit', 'Rabbit', 'Holland Lop'],
  ['Waffles', 'Dog', 'Pembroke Welsh Corgi'], ['Marigold', 'Cat', 'Domestic Longhair'], ['Basil', 'Bird', 'Budgerigar'],
  ['Clover', 'Rabbit', 'Mini Rex'], ['Fig', 'Cat', 'Siamese mix'], ['Nori', 'Dog', 'Shiba Inu'],
  ['Peaches', 'Guinea pig', 'American'], ['Scout', 'Dog', 'Beagle mix'], ['Fern', 'Cat'],
  ['Milo', 'Dog', 'Terrier mix'], ['Dottie', 'Guinea pig'], ['Olive', 'Cat', 'Calico'],
  ['Maple', 'Dog', 'Golden Retriever'], ['Bean', 'Hamster'], ['Sage', 'Rabbit'],
  ['Ash', 'Cat', 'Russian Blue mix'], ['Ziggy', 'Bird', 'Cockatiel'], ['Otis', 'Dog'],
  ['Poppy', 'Cat'], ['Mochi', 'Hamster', 'Syrian'], ['Tansy', 'Bird'],
]
const planNames = [
  'Dog food and dental chews', 'Wet food for Pippin', 'Litter for the foster room', 'Rabbit hay and bedding',
  'Cabin pet supplies', 'Puppy training treats', 'Cat pantry staples', 'Gentle grooming supplies',
  'Weekend enrichment toys', 'Small pet pantry', 'Senior dog meals', 'Unscented litter refill',
  'Dental care for Scout', 'Foster kitten supplies', 'Bedding for Biscuit', 'Travel bag essentials',
  'Everyday dog treats', 'Cat variety packs', 'Extra kibble for the cabin', 'Winter grooming supplies',
  'Puppy pad refill', 'Timothy hay bundle', 'Guest room litter', 'Monthly chew box',
]

const seedDay = '2026-11-18'
const seedTime = Date.parse(seedDay + 'T15:00:00Z')
const after = (days) => new Date(seedTime + days * 86400000).toISOString()
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const usd = (amount) => Math.round(amount * 100) / 100

export function createInitialData() {
  const account = { id: 'acct-maya', firstName: 'Maya', lastName: 'Bennett' }
  const actorId = account.id
  const addresses = [
    { id: 'addr-home', label: 'Home', recipient: 'Maya Bennett', line1: '42 Clover Lane', city: 'Madison', region: 'WI', postalCode: '53703' },
    { id: 'addr-cabin', label: 'Cabin', recipient: 'Maya Bennett', line1: '18 Birch Cove', city: 'Minocqua', region: 'WI', postalCode: '54548' },
    { id: 'addr-foster', label: 'Foster supplies', recipient: 'Maya Bennett', line1: '705 Finch Avenue', line2: 'Suite 2', city: 'Madison', region: 'WI', postalCode: '53704' },
  ]
  const paymentMethods = [
    { id: 'pay-visa', brand: 'Visa', last4: '4242', label: 'Visa ending in 4242' },
    { id: 'pay-mastercard', brand: 'Mastercard', last4: '7351', label: 'Mastercard ending in 7351' },
    { id: 'pay-discover', brand: 'Discover', last4: '1608', label: 'Discover ending in 1608' },
  ]
  const basePrices = [38.99, 22.49, 18.5, 12.89, 10.99, 8.49, 14.99, 16.99]
  const products = catalog.flatMap(([category, variant, ...names], group) => names.map((name, index) => ({
    id: id('prod', group * 6 + index),
    name, category, variant, unitPrice: usd(basePrices[group] + index * 3.25),
    autoshipEligible: group !== 5 || index < 3,
    returnable: group !== 7 || index > 1,
    imageKey: category,
  })))
  const line = (parent, index, productIndex, quantity) => {
    const { id: productId, name, variant, imageKey, returnable, unitPrice } = products[productIndex]
    return { id: parent + '-item-' + String(index + 1).padStart(2, '0'), productId, name, variant, imageKey, quantity, unitPrice, returnable }
  }
  const planProducts = [0, 6, 12, 36, 44, 19, 7, 24, 30, 37, 4, 13, 18, 9, 38, 45, 21, 10, 1, 27, 47, 39, 14, 22]
  const autoships = planNames.map((name, index) => {
    const planId = id('as', index)
    const cancelled = index >= 18
    const items = [line(planId, 0, planProducts[index], index % 3 === 0 && index > 0 ? 2 : 1)]
    if (index % 3 !== 1) items.push(line(planId, 1, index === 0 ? 18 : 19 + index % 5, 1))
    return {
      id: planId, name, status: cancelled ? 'cancelled' : 'active',
      nextShipDate: after(cancelled ? -5 - index : 15 + index * 3).slice(0, 10),
      frequencyWeeks: [4, 2, 6, 8, 12][index % 5],
      addressId: addresses[index % 3].id, paymentMethodId: paymentMethods[index % 3].id,
      items, actorId, createdAt: after(-310 + index * 4),
      ...(cancelled ? { cancelledAt: after(-25 - index), updatedAt: after(-25 - index), updatedBy: actorId } : {}),
    }
  })
  const orders = Array.from({ length: 48 }, (_, index) => {
    const orderId = id('ord', index)
    const age = index === 0 ? 6 : index === 1 ? 4 : index === 2 ? 2 : 9 + (index - 3) * 8
    const status = index === 1 ? 'shipped' : index === 2 || index === 7 ? 'processing' : [8, 18, 32].includes(index) ? 'cancelled' : 'delivered'
    const createdAt = after(-age)
    const items = [
      line(orderId, 0, index === 0 ? 0 : (index * 5) % products.length, index % 3 === 0 ? 2 : 1),
      line(orderId, 1, index === 0 ? 18 : (index * 7 + 12) % products.length, 1),
    ].map(item => ({ ...item, lineTotal: usd(item.quantity * item.unitPrice) }))
    const subtotal = usd(items.reduce((sum, item) => sum + item.lineTotal, 0))
    const shipping = index % 4 === 0 || subtotal < 49 ? 4.95 : 0
    const tax = usd(subtotal * 0.055)
    const deliveredAt = status === 'delivered' ? after(-age + 3) : undefined
    const tracking = status === 'delivered' || status === 'shipped'
    return {
      id: orderId, orderNumber: 'CHE-' + (5821047 + index * 39), status, createdAt, actorId, items,
      address: { ...addresses[index % 3] }, paymentLabel: paymentMethods[index % 3].label,
      subtotal, shipping, tax, total: usd(subtotal + shipping + tax),
      ...(index > 2 && index < 34 && index % 3 === 0 ? { autoshipId: autoships[(index / 3) % 18].id } : {}),
      ...(deliveredAt ? { deliveredAt } : {}),
      ...(status === 'cancelled' ? { cancelledAt: after(-age + 1), updatedAt: after(-age + 1), updatedBy: actorId } : {}),
      ...(tracking ? {
        carrier: index % 2 ? 'UPS' : 'FedEx',
        trackingNumber: String(774640521003 + index * 31),
        trackingEvents: [
          { label: 'Order packed', location: 'Joliet, IL', createdAt },
          { label: 'Handed to carrier', location: 'Joliet, IL', createdAt: after(-age + 1) },
          ...(deliveredAt ? [{ label: 'Delivered', location: addresses[index % 3].city + ', WI', createdAt: deliveredAt }] : []),
        ],
      } : {}),
    }
  })
  const pets = petNames.map(([name, species, breed], index) => ({
    id: id('pet', index), name, species, ...(breed ? { breed } : {}),
    ...(index % 4 !== 3 ? { birthday: index === 0 ? '2020-04-18' : (2018 + index % 7) + '-05-12' } : {}),
    ...(index % 3 === 0 ? { weightLbs: index === 0 ? 43.5 : species === 'Dog' ? 29 + index : species === 'Cat' ? 9.5 : 2.5 } : {}),
    ...(index === 0 ? { notes: 'Prefers soft training treats.', imageKey: 'dog-03' } : {}),
    status: index < 22 ? 'active' : 'removed', actorId, createdAt: after(-240 + index * 7),
    ...(index >= 22 ? { removedAt: after(-14 + index % 5), updatedAt: after(-14 + index % 5), updatedBy: actorId } : {}),
  }))
  const returnOrders = orders.slice(4).filter(order => order.status === 'delivered' && order.items.some(item => item.returnable)).slice(0, 24)
  const returns = returnOrders.map((order, index) => {
    const full = index % 5 === 0 && order.items.every(item => item.returnable)
    const selected = full ? order.items : [order.items.find(item => item.returnable)]
    const items = selected.map(item => {
      const quantity = full ? item.quantity : 1
      return {
        orderItemId: item.id, productId: item.productId, name: item.name, quantity,
        unitPrice: item.unitPrice, amount: usd(item.unitPrice * quantity),
        reason: ['wrong_size', 'damaged', 'incorrect_item', 'no_longer_needed'][index % 4],
      }
    })
    const itemsAmount = usd(items.reduce((sum, item) => sum + item.amount, 0))
    const shippingRefund = full ? order.shipping : 0
    const taxRefund = usd(order.tax * itemsAmount / order.subtotal)
    const createdAt = new Date(Date.parse(order.deliveredAt) + 86400000).toISOString()
    const status = index < 3 ? 'requested' : index < 7 ? 'in_transit' : 'refunded'
    return {
      id: id('ret', index), returnNumber: 'RET-' + (10428 + index * 17), orderId: order.id,
      status, refundMethod: index % 3 === 0 ? 'account_credit' : 'original_payment',
      items, itemsAmount, shippingRefund, taxRefund,
      refundAmount: usd(itemsAmount + shippingRefund + taxRefund), actorId, createdAt,
      ...(status === 'refunded' ? { refundedAt: new Date(Date.parse(createdAt) + 4 * 86400000).toISOString() } : {}),
    }
  })
  return { account, addresses, paymentMethods, products, autoships, autoshipEvents: [], orders, orderEvents: [], pets, petEvents: [], returns }
}

