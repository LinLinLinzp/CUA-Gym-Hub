const stamp = (day) => new Date(Date.UTC(2026, 8, 20 + day, 15)).toISOString()
const currency = 'USD'
const buyer = {
  id: 'buyer_mara', name: 'Mara Bennett', email: 'mara.bennett@example.com', currency,
  addresses: [{ id: 'addr_mara_home', name: 'Mara Bennett', line1: '24 Linden Row', city: 'Portland', region: 'OR', postalCode: '97214', country: 'US' }],
  paymentMethods: [{ id: 'pay_mara_visa', brand: 'Visa', last4: '4242', label: 'Personal card' }],
  defaultAddressId: 'addr_mara_home', defaultPaymentMethodId: 'pay_mara_visa',
  favoriteItemsVisibility: 'private', favoriteShopsVisibility: 'public',
}

const catalog = [
  ['Home & Living', 'ceramic', [
    ['Oat Glaze Stoneware Mug', 'Lark & Clay Studio', 29.50, 'A wheel-thrown mug with a satin glaze, a wide handle and a bare clay foot.'],
    ['Juniper Breakfast Bowl', 'Field Kiln Ceramics', 34, 'A rounded breakfast bowl with dark green glaze pooling along the rim.'],
    ['Sand Ripple Bud Vase', 'Loam Vessel Works', 38, 'A small ribbed vase for a single stem or a few dried grasses.'],
    ['Speckled Espresso Pair', 'Sunday Slip Studio', 42, 'Two small hand-thrown cups with softly speckled almond glaze.'],
    ['Amber Pinch Dish', '', 16, 'A shallow thumb-formed dish for tea bags, rings or sea salt.'],
    ['Quiet Blue Pourer', '', 36, 'A little pouring jug with a deep blue glaze and pinched spout.'],
  ]],
  ['Paper & Party Supplies', 'paper', [
    ['Botanical Note Card Set', 'Fern Post Press', 18, 'Six folded cards printed with hand-drawn garden stems and paired with kraft envelopes.'],
    ['Citrus Weekly Planner', 'Margin & Bloom', 22, 'An undated tear-off desk pad with space for appointments and a short list.'],
    ['Personalized Linen Notebook', 'Folded Hours Bindery', 31, 'A clothbound notebook with unruled ivory pages and a personalized cover.'],
    ['Woodland Gift Tags', 'Letter Finch Paper', 12, 'A set of eight thick paper tags illustrated with woodland leaves.'],
    ['Moon Phase Letter Set', '', 19, 'Writing paper and envelopes with pale lunar illustrations across the margins.'],
    ['Terracotta Recipe Cards', '', 15, 'An illustrated set of twenty cards for recipes worth keeping.'],
  ]],
  ['Art & Collectibles', 'print', [
    ['Midnight Meadow Art Print', 'Blue Hour Editions', 32, 'A matte art print of wildflowers and tall grasses against an ink-blue sky.'],
    ['Desert Light Linocut', 'Ochre Window Press', 46, 'An ochre and rose landscape hand-printed on toothy cotton paper.'],
    ['Sea Glass Horizon Print', 'Low Tide Prints', 27, 'A soft coastal print with layered bands of green and gray.'],
    ['Kitchen Fig Illustration', 'Figline Illustration', 25, 'A small botanical print for a kitchen shelf or gallery wall.'],
    ['Morning Ridge Monotype', '', 44, 'An atmospheric mountain scene with subtle changes in texture across the ink.'],
    ['Autumn Aster Study', '', 30, 'A delicate illustration of asters printed on heavyweight warm-white paper.'],
  ]],
  ['Jewelry & Accessories', 'jewel', [
    ['Hammered Brass Hoops', 'Morrow Metal Studio', 38, 'Lightweight brass hoops with a hammered finish and nickel-free posts.'],
    ['Moonstone Pendant', 'Cinder & Pearl', 54, 'A small polished moonstone on a fine chain with an adjustable clasp.'],
    ['Personalized Initial Charm', 'Small Orbit Jewelry', 28, 'A hand-stamped letter on a round brass charm with a fine curb chain.'],
    ['River Pebble Studs', 'Stillwater Findings', 26, 'An understated pair of pebble-shaped studs with a satin finish.'],
    ['Twisted Silver Band', '', 43, 'A narrow band formed by twisting two silver strands together.'],
    ['Tiny Garnet Necklace', '', 48, 'A deep red garnet set on a fine chain for everyday layering.'],
  ]],
  ['Clothing & Textiles', 'textile', [
    ['Moss Linen Tea Towel', 'Junewick Textiles', 24, 'A washed linen towel with a woven stripe and a corner hanging loop.'],
    ['Rust Check Table Runner', 'Threaded Hearth', 45, 'A soft cotton table runner in muted brick and ivory checks.'],
    ['Indigo Block Print Scarf', 'Soft Loom Goods', 39, 'A light cotton scarf printed in small batches with an indigo leaf motif.'],
    ['Woven Hearth Cushion', 'Bracken Thread Co.', 52, 'A textured cushion cover with a hidden zipper and a warm flax ground.'],
    ['Saffron Market Tote', '', 28, 'A roomy cotton tote with sturdy straps and an interior pocket.'],
    ['Cloud Stripe Napkins', '', 36, 'Four washed cotton napkins with soft blue stripes and mitered corners.'],
  ]],
  ['Craft Supplies & Tools', 'wood', [
    ['Walnut Desk Catchall', 'Alder Bench Workshop', 44, 'A hand-sanded walnut tray to keep keys, coins and small tools together.'],
    ['Cherry Wood Yarn Bowl', 'Ring & Grain Studio', 57, 'A turned cherry bowl with a smooth spiral slot that guides yarn as you work.'],
    ['Maple Stitch Gauge', 'Pine Sparrow Goods', 15, 'A compact engraved maple gauge for checking stitch count and needle size.'],
    ['Oak Brush Rest', 'Northline Woodcraft', 21, 'An oiled oak rail with five shallow grooves for paintbrushes.'],
    ['Beech Embroidery Hoop', '', 13, 'A smooth beech hoop with a brass screw for adjusting fabric tension.'],
    ['Walnut Ribbon Spools', '', 19, 'Three turned walnut spools for loose ribbon, twine or thread.'],
  ]],
]

const makeCatalog = () => {
  const shops = []
  const listings = []
  for (const [categoryIndex, [category, art, products]] of catalog.entries()) {
    for (const [index, [title, shopName, price, description]] of products.entries()) {
      const key = categoryIndex * 6 + index + 1
      const shopId = shopName
        ? (key === 1 ? 'shop_lark_clay' : 'shop_' + key)
        : shops[shops.length - 4 + index - 4].id
      if (shopName) shops.push({
        id: shopId, name: shopName, ownerName: ['Asha Reed', 'Nina Solis', 'Theo Flores', 'Leah Hart'][index],
        location: ['Asheville, NC', 'Hudson, NY', 'Portland, ME', 'Madison, WI'][(index + categoryIndex) % 4],
        description: 'Small batches from an independent studio. ' + description,
        image: '/images/' + art + '-0.png', rating: 4.7 + ((key % 4) / 10), reviewCount: 48 + key * 7, createdAt: stamp(-400 - key),
      })
      const accepted = index !== 2 && index !== 5
      listings.push({
        id: key === 1 ? 'listing_oat_mug' : 'listing_' + key,
        shopId, title, description, category, price, currency,
        tags: [art, category, title.split(' ')[0].toLowerCase(), index % 2 ? 'handmade gift' : 'small batch'],
        image: '/images/' + art + '-' + index % 3 + '.png', stock: key === 3 || key === 25 ? 0 : 8 + key % 11,
        ...(key === 1 ? { variants: [{ id: 'finish', name: 'Finish', options: [{ id: 'oat', label: 'Oat' }, { id: 'juniper', label: 'Juniper' }] }] } : {}),
        ...(index === 2 && (art === 'paper' || art === 'jewel') ? { personalization: { required: true, prompt: 'Enter the initials to use on your item.', maxLength: 12 } } : {}),
        shippingPrice: key === 1 ? 5.25 : 3 + key % 5, deliveryDays: [3 + key % 4, 7 + key % 5],
        returnPolicy: accepted
          ? { accepted, windowDays: 30, summary: 'Contact the shop about your return within 30 days of delivery.' }
          : { accepted, summary: 'This shop does not accept standard returns for this item. Contact the shop if there is a problem.' },
        createdAt: stamp(-140 - key),
      })
    }
  }
  return { shops, listings }
}

const notes = [
  ['Packing for a gift', 'Would you be able to leave the prices out of the parcel?', 'Of course. I can pack it with a plain note and leave the receipt out.'],
  ['Color in daylight', 'Does the glaze look warmer in person?', 'It leans warm, especially by a window. The second color is cooler.'],
  ['Sizing question', 'Could you tell me the dimensions at the widest point?', 'I can measure the next one from this batch and send you the exact size.'],
  ['Delivery timing', 'I am hoping to have this by next weekend. When does your next batch go out?', 'My next post office run is on Tuesday morning.'],
  ['Care instructions', 'Do you have any suggestions for keeping the finish looking good?', 'Gentle hand cleaning is best. I include a small care card with it.'],
  ['Custom wording', 'Could I put a short name on this piece?', 'Please send the spelling you would like and I can check that it fits.'],
  ['A second piece', 'I would love one for my sister too. Do you have two available?', 'I set aside a few pieces from this batch and still have a pair available.'],
  ['Material question', 'Could you share a little about the material you used?', 'I source it in small quantities and check each piece before packing.'],
]

export function createInitialData() {
  const { shops, listings } = makeCatalog()
  const orders = Array.from({ length: 24 }, (_, i) => {
    const number = 1001 + i
    const listing = i === 6 ? listings[0] : listings[(i + 6) % listings.length]
    const shop = shops.find((row) => row.id === listing.shopId)
    const sibling = listings.find((row) => row.id !== listing.id && row.shopId === listing.shopId)
    const items = (i % 4 === 0 && sibling ? [listing, sibling] : [listing]).map((product, j) => {
      const quantity = i === 6 || i === 7 ? 2 : 1
      return {
        id: i === 6 ? 'line_1007_mug' : 'line_' + number + '_' + j, listingId: product.id,
        title: product.title, image: product.image, quantity, unitPrice: product.price,
        lineTotal: product.price * quantity, returnPolicy: product.returnPolicy,
        ...(product.variants ? { variants: [{ groupId: 'finish', optionId: 'oat', label: 'Oat' }] } : {}),
        ...(product.personalization ? { personalization: 'MB' } : {}),
      }
    })
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const shipping = Math.max(listing.shippingPrice, items.length > 1 ? sibling.shippingPrice : 0)
    const status = i === 6 || i === 7 || i === 8 || i === 9 || i < 19 ? 'delivered' : ['cancelled', 'delivered', 'shipped', 'delivered', 'paid'][i - 19]
    return {
      id: 'order_' + number, orderNumber: 'ET-' + number, buyerId: buyer.id, shopId: shop.id, shopName: shop.name,
      status, source: 'cart', items, currency, subtotal, shipping, tax: 0, total: subtotal + shipping,
      shippingAddress: buyer.addresses[0], paymentMethod: buyer.paymentMethods[0],
      createdAt: stamp(-36 + i * 3), estimatedDeliveryStartAt: stamp(-32 + i * 3), estimatedDeliveryEndAt: stamp(-28 + i * 3),
      ...(status === 'delivered' ? { deliveredAt: stamp(-30 + i * 3) } : {}),
    }
  })
  const messages = []
  const helpRequests = []
  const returnRequests = []
  const cases = []
  const threads = Array.from({ length: 24 }, (_, i) => {
    const order = i === 0 || i === 8 || i === 9 || i >= 20 ? orders[i === 0 ? 6 : i] : null
    const product = listings[(i * 5) % listings.length]
    const shopId = order?.shopId || product.shopId
    const key = order ? order.id.slice(6) : String(i + 1).padStart(3, '0')
    const threadId = 'thread_' + key
    const context = order ? { orderId: order.id } : i % 7 === 0 ? {} : { listingId: product.id }
    const [topic, question, reply] = notes[i % notes.length]
    const qualifying = Boolean(order && (i === 0 || i === 8 || i === 9))
    const createdAt = qualifying ? stamp(-5 + i) : stamp(39 + i)
    const [firstId, lastId] = ['message_' + key + '_a', 'message_' + key + '_b']
    const body = i === 0 ? 'One of the mugs arrived with a cracked handle. Could I return the damaged one?' : qualifying ? 'One item was damaged during delivery. Can we arrange a return?' : question
    const helpId = 'help_' + key
    messages.push(
      { id: firstId, threadId, actorId: buyer.id, actorType: 'buyer', body, ...context, ...(qualifying ? { helpRequestId: helpId } : {}), createdAt },
      { id: lastId, threadId, actorId: shopId, actorType: 'shop', body: qualifying ? 'Thanks for letting me know. I can take a look at the damage with you.' : reply, ...context, createdAt: qualifying ? stamp(-4 + i) : stamp(40 + i) },
    )
    if (qualifying) {
      const item = order.items[0]
      const lines = [{ orderItemId: item.id, listingId: item.listingId, quantity: 1, unitPrice: item.unitPrice, amount: item.unitPrice }]
      const base = { orderId: order.id, buyerId: buyer.id, shopId, reason: 'damaged', lines, createdAt }
      helpRequests.push({ ...base, id: helpId, threadId, messageId: firstId, desiredResolution: 'return', body, status: 'sent' })
      returnRequests.push({ ...base, id: 'return_' + key, helpRequestId: helpId, resolution: 'return', status: 'requested', requestedAmount: item.unitPrice, currency })
      if (i) {
        const openedAt = stamp(i + 2)
        const closed = i === 9
        const log = [{ id: 'log_' + key + '_a', actorId: buyer.id, actorType: 'buyer', action: 'opened', body, createdAt: openedAt }]
        if (closed) log.push({ id: 'log_' + key + '_b', actorId: buyer.id, actorType: 'buyer', action: 'closed', createdAt: stamp(i + 4) })
        cases.push({
          ...base, id: 'case_' + key, helpRequestId: helpId, details: body, refundPreference: 'original_payment',
          requestedAmount: item.unitPrice, currency, status: closed ? 'closed' : 'open', log, createdAt: openedAt,
          updatedAt: log.at(-1).createdAt, updatedBy: buyer.id, ...(closed ? { closedAt: log.at(-1).createdAt } : {}),
        })
      }
    }
    const updatedAt = messages.at(-1).createdAt
    return {
      id: threadId, buyerId: buyer.id, shopId, ...context, subject: order ? 'Help with order ' + order.orderNumber : topic,
      unread: i % 3 === 0, lastMessageId: lastId, createdAt, updatedAt, ...(i % 3 !== 0 ? { readAt: updatedAt } : {}),
    }
  })
  const targets = [...listings.slice(0, 17), listings[18], ...shops.slice(0, 8)]
  const favorites = targets.map((target, i) => ({
    id: 'fav_' + String(i + 1).padStart(3, '0'), buyerId: buyer.id, targetType: i < 18 ? 'listing' : 'shop',
    targetId: target.id, createdAt: stamp(-i),
  }))
  const collections = [
    ['slow_mornings', 'Slow Mornings', 'private'], ['paper_drawer', 'Paper Drawer', 'public'], ['little_gifts', 'Little Gifts', 'private'],
  ].map(([id, name, visibility]) => ({ id: 'collection_' + id, buyerId: buyer.id, name, visibility, createdAt: stamp(-18) }))
  const collectionItems = collections.flatMap((collection, i) => listings.slice(i * 6, i * 6 + 3).map((listing, j) => ({
    id: 'membership_' + i + '_' + j, collectionId: collection.id, listingId: listing.id, buyerId: buyer.id, createdAt: stamp(-16),
  })))
  return {
    buyer: { ...buyer }, shops, listings, cartItems: [], cartActivity: [], orders, threads, messages, helpRequests,
    returnRequests, cases, favorites, collections, collectionItems, favoriteActivity: [],
  }
}
