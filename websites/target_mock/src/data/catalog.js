const groups = [
  ['home', 'Home & Decor', [
    ['brightroom-bin', 'Latching Storage Bin, 17 qt', 'Brightroom', 1299, 'storage organizer tote lid', ['Charcoal', 'Clear']],
    ['threshold-side-table', 'Round Wood Accent Table', 'Threshold', 7500, 'oak side table living room'],
    ['threshold-pillow', 'Textured Square Throw Pillow', 'Threshold', 1999, 'sage green cushion couch', ['Sage', 'Cream']],
    ['room-essentials-towel', 'Everyday Cotton Bath Towel', 'Room Essentials', 699, 'white bath linens shower', ['White', 'Gray']],
    ['threshold-lamp', 'Ceramic Table Lamp with Linen Shade', 'Threshold', 4500, 'cream bedside lighting'],
    ['brightroom-basket', 'Woven Rope Storage Basket', 'Brightroom', 2499, 'dark wicker hamper organizer'],
    ['threshold-dinnerware', 'Stoneware Dinnerware Set, 12 pc', 'Threshold', 5499, 'ivory plate bowl dishes'],
    ['threshold-planter', 'Glazed Ceramic Planter, 6 in', 'Threshold', 1499, 'olive green pot indoor plant'],
    ['casaluna-throw', 'Textured Cotton Throw Blanket', 'Casaluna', 3499, 'natural cotton bedding fringe'],
  ]],
  ['household', 'Household Essentials', [
    ['up-dish-soap', 'Ultra Dish Soap, Fresh Scent, 24 fl oz', 'up & up', 299, 'blue kitchen dishwashing'],
    ['tide-detergent', 'Liquid Laundry Detergent, 84 fl oz', 'Tide', 1299, 'purple wash laundry jug'],
    ['up-paper-towels', 'Select-a-Size Paper Towels, 6 rolls', 'up & up', 999, 'paper towel kitchen cleanup'],
    ['up-trash-bags', 'Tall Kitchen Drawstring Trash Bags, 45 ct', 'up & up', 869, 'garbage liners 13 gallon'],
    ['clorox-wipes', 'Disinfecting Wipes, Fresh Scent, 75 ct', 'Clorox', 549, 'cleaning white canister'],
    ['scotch-sponges', 'Non-Scratch Scrub Sponges, 3 ct', 'Scotch-Brite', 399, 'yellow dish scrub sponge'],
    ['up-hand-soap', 'Liquid Hand Soap, Unscented, 12 fl oz', 'up & up', 249, 'clear pump handwash'],
    ['kleenex-tissues', 'Ultra Soft Facial Tissues, 120 ct', 'Kleenex', 329, 'tissue paper box'],
    ['windex-cleaner', 'Original Glass Cleaner, 23 fl oz', 'Windex', 459, 'blue window spray'],
  ]],
  ['grocery', 'Grocery', [
    ['gg-strawberries', 'Fresh Strawberries, 1 lb', 'Good & Gather', 399, 'fruit berries produce fresh'],
    ['gg-eggs', 'Cage-Free Large Brown Eggs, 12 ct', 'Good & Gather', 429, 'brown dozen dairy refrigerated'],
    ['gg-juice', 'Orange Juice, No Pulp, 52 fl oz', 'Good & Gather', 479, 'refrigerated breakfast drink'],
    ['gg-pasta', 'Penne Rigate Pasta, 16 oz', 'Good & Gather', 229, 'dry durum wheat penne pantry'],
    ['gg-coffee', 'Medium Roast Ground Coffee, 12 oz', 'Good & Gather', 749, 'breakfast drip arabica'],
    ['gg-frozen-berries', 'Frozen Mixed Berries, 16 oz', 'Good & Gather', 579, 'cold freezer fruit smoothie'],
    ['gg-oatmilk', 'Unsweetened Oatmilk, 32 fl oz', 'Good & Gather', 389, 'shelf stable dairy free milk'],
    ['gg-chips', 'Sea Salt Tortilla Chips, 12 oz', 'Good & Gather', 279, 'corn chips snack'],
    ['gg-olive-oil', 'Extra Virgin Olive Oil, 16.9 fl oz', 'Good & Gather', 1099, 'cooking oil pantry bottle'],
  ]],
  ['beauty', 'Beauty', [
    ['cerave-cleanser', 'Hydrating Facial Cleanser, 3 fl oz', 'CeraVe', 699, 'face wash travel skin'],
    ['sun-bum-spf', 'Original Face Sunscreen SPF 50, 3 fl oz', 'Sun Bum', 1299, 'sunscreen yellow summer'],
    ['native-shampoo', 'Moisturizing Shampoo, 16.5 fl oz', 'Native', 999, 'hair care amber coconut'],
    ['elf-mascara', 'Lash Extension Mascara', 'e.l.f.', 799, 'black makeup eyes wand'],
    ['burts-lip-balm', 'Tinted Lip Balm', 'Burt’s Bees', 499, 'pale pink makeup lips', ['Rose', 'Hibiscus']],
    ['aveeno-lotion', 'Daily Moisturizing Lotion, 18 fl oz', 'Aveeno', 1099, 'body lotion pump skincare'],
    ['essie-polish', 'Glossy Nail Polish', 'essie', 999, 'red manicure nails', ['Classic Red', 'Ballet Pink']],
    ['method-body-wash', 'Body Wash, Green Tea, 18 fl oz', 'method', 799, 'green shower wash'],
    ['up-cotton-rounds', 'Premium Cotton Rounds, 100 ct', 'up & up', 299, 'beauty makeup remover pads'],
  ]],
  ['electronics', 'Electronics', [
    ['heyday-earbuds', 'True Wireless Earbuds with Charging Case', 'heyday', 2499, 'black bluetooth audio headphones'],
    ['anker-charger', 'Nano USB-C Wall Charger, 30 W', 'Anker', 1999, 'white power adapter phone'],
    ['jbl-speaker', 'Flip Portable Bluetooth Speaker', 'JBL', 9999, 'black wireless waterproof audio'],
    ['heyday-cable', 'Braided USB-C to USB-C Cable, 6 ft', 'heyday', 1299, 'charger cable gray'],
    ['anker-power-bank', 'Portable Power Bank, 10,000 mAh', 'Anker', 3499, 'battery charger white'],
    ['logitech-mouse', 'Compact Wireless Mouse', 'Logitech', 1899, 'black computer mouse'],
    ['sony-headphones', 'Wireless Noise-Canceling Headphones', 'Sony', 14999, 'black bluetooth over ear audio'],
    ['room-essentials-desk-lamp', 'Adjustable LED Desk Lamp', 'Room Essentials', 2999, 'black office lighting'],
    ['westclox-clock', 'Digital LED Alarm Clock', 'Westclox', 1499, 'black nightstand alarm'],
  ]],
  ['clothing', 'Clothing', [
    ['goodfellow-tee', 'Men’s Cotton Crewneck T-Shirt', 'Goodfellow & Co', 799, 'white basic top cotton', ['White / M', 'White / L', 'Black / M']],
    ['all-motion-joggers', 'Men’s Tapered Performance Joggers', 'All in Motion', 2799, 'black workout pants', ['Black / M', 'Black / L']],
    ['universal-hoodie', 'Women’s Fleece Pullover Hoodie', 'Universal Thread', 2599, 'cream sweatshirt', ['Cream / S', 'Cream / M', 'Cream / L']],
    ['goodfellow-socks', 'Men’s Cushioned Crew Socks, 4 pairs', 'Goodfellow & Co', 1099, 'gray heather socks'],
    ['wild-fable-cap', 'Adjustable Washed Baseball Cap', 'Wild Fable', 999, 'olive green hat'],
    ['universal-tote', 'Canvas Everyday Tote Bag', 'Universal Thread', 1699, 'cream canvas carryall'],
    ['all-motion-leggings', 'Women’s High-Rise Everyday Leggings', 'All in Motion', 2499, 'pale blue activewear yoga', ['Blue / S', 'Blue / M', 'Blue / L']],
    ['stars-above-slippers', 'Women’s Knit Memory Foam Slippers', 'Stars Above', 1599, 'gray house shoes', ['Gray / 7', 'Gray / 8', 'Gray / 9']],
    ['wild-fable-shorts', 'Women’s High-Rise Denim Shorts', 'Wild Fable', 2199, 'blue jean summer shorts', ['Denim / 4', 'Denim / 6', 'Denim / 8']],
  ]],
]

const storeRows = [
  ['roseville', 'Roseville', '1515 County Road B W', 'Roseville', '55113', 825],
  ['minneapolis-ne', 'Minneapolis NE', '1650 New Brighton Blvd', 'Minneapolis', '55413', 903],
  ['midway', 'St. Paul Midway', '1300 University Ave W', 'St. Paul', '55104', 987],
  ['shoreview', 'Shoreview', '3800 Lexington Ave N', 'Shoreview', '55126', 825],
  ['richfield', 'Richfield', '6445 Richfield Pkwy', 'Richfield', '55423', 902],
  ['downtown', 'Minneapolis Downtown', '900 Nicollet Mall', 'Minneapolis', '55403', 903],
]

export function makeStores() {
  return storeRows.map(([id, name, line1, city, postalCode, taxBasisPoints]) => ({
    id: `store-${id}`, name, address: { line1, city, region: 'MN', postalCode },
    pickupEnabled: id !== 'downtown', taxBasisPoints, timeZone: 'America/Chicago',
    closingHourLocal: id === 'downtown' ? 20 : 22,
    hoursText: id === 'downtown' ? 'Daily, 8 am–8 pm' : 'Daily, 8 am–10 pm',
    pickupInstructions: id === 'minneapolis-ne' ? 'Enter on New Brighton Boulevard and follow the signs to Guest Services.' :
      'Go to Guest Services near the front entrance. Have your pickup barcode or photo ID ready.',
  }))
}

export function makeProducts(stores) {
  let index = 0
  return groups.flatMap(([categoryId, categoryLabel, rows]) => rows.map(([slug, title, brand, priceCents, keywords, labels = ['Standard']], position) => {
    const itemIndex = index++
    const freshOrFrozen = ['gg-strawberries', 'gg-eggs', 'gg-juice', 'gg-frozen-berries'].includes(slug)
    const returnMethods = ['elf-mascara', 'wild-fable-shorts'].includes(slug) ? [] : freshOrFrozen || slug === 'gg-coffee' ? ['store'] : ['store', 'mail']
    return {
      id: `prod-${slug}`, tcin: String(91000001 + itemIndex), title, brand, categoryId, categoryLabel,
      description: `${title} by ${brand}.`,
      imagePath: `/images/${slug === 'brightroom-bin' ? 'brightroom-bin-charcoal' : `${categoryId}-${position + 1}`}.webp`,
      keywords: keywords.split(' '), rating: slug === 'brightroom-bin' ? 4.6 : 3.8 + (itemIndex % 11) / 10,
      reviewCount: slug === 'brightroom-bin' ? 162 : 22 + itemIndex * 17 % 415,
      returnDays: categoryId === 'electronics' ? 30 : 90, returnMethods, freshOrFrozen,
      variants: labels.map((label, variantIndex) => ({
        id: slug === 'brightroom-bin' ? `var-bin-${label.toLowerCase()}` : `var-${slug}-${variantIndex + 1}`,
        label, priceCents,
        shippingAvailable: !freshOrFrozen, shippingRequiresMinimum: !freshOrFrozen && priceCents <= 349,
        pickupStockByStoreId: Object.fromEntries(stores.map((store, storeIndex) => [
          store.id, !store.pickupEnabled || slug === 'sony-headphones' ? 0 :
            slug === 'brightroom-bin' && variantIndex === 0 && storeIndex < 2 ? (storeIndex === 0 ? 14 : 1) :
              (itemIndex * 7 + variantIndex * 3 + storeIndex * 5) % 23 + 4,
        ])),
      })),
    }
  }))
}

export function makeOffers(products, date) {
  const examples = [
    { id: 'deal-home-10', title: '10% off Home & Decor', categoryIds: ['home'], scope: 'category', value: 10 },
    { id: 'coupon-bin-200', title: '$2 off Brightroom storage bins', productIds: ['prod-brightroom-bin'], kind: 'coupon', valueType: 'fixed', value: 200, maxUnits: 2 },
    { id: 'bonus-pickup-500', title: 'Earn a $5 reward with Order Pickup', kind: 'bonus', scope: 'order', fulfillment: ['pickup'], minSpendCents: 3000, valueType: 'reward', value: 500 },
    { id: 'coupon-pantry-300', title: '$3 off Good & Gather coffee', productIds: ['prod-gg-coffee'], kind: 'coupon', valueType: 'fixed', value: 300, maxUnits: 1 },
    { id: 'deal-order-5', title: '5% off orders of $100 or more', scope: 'order', minSpendCents: 10000, value: 5 },
    { id: 'coupon-headphones-1500', title: '$15 off Sony wireless headphones', productIds: ['prod-sony-headphones'], kind: 'coupon', valueType: 'fixed', value: 1500, maxUnits: 1, expiresAt: date(-2) },
    { id: 'bonus-home-1000', title: 'Earn a $10 reward on home purchases', kind: 'bonus', scope: 'category', categoryIds: ['home'], minSpendCents: 7500, valueType: 'reward', value: 1000, startsAt: date(3) },
    { id: 'coupon-towel-150', title: '$1.50 off everyday bath towels', productIds: ['prod-room-essentials-towel'], kind: 'coupon', valueType: 'fixed', value: 150 },
    { id: 'coupon-charger-250', title: '$2.50 off Anker Nano chargers', productIds: ['prod-anker-charger'], kind: 'coupon', valueType: 'fixed', value: 250 },
  ]
  const more = products.filter((product) => !['prod-brightroom-bin', 'prod-gg-coffee', 'prod-sony-headphones'].includes(product.id))
    .filter((_, index) => index % 2 === 0).slice(0, 26)
    .map((product, index) => ({
      id: `offer-${product.id.slice(5)}`, title: `${5 + index % 5 * 5}% off ${product.title.split(',')[0]}`,
      productIds: [product.id], kind: index % 5 === 0 ? 'coupon' : 'deal',
      value: 5 + index % 5 * 5, maxUnits: index % 3 === 0 ? 2 : undefined,
      fulfillment: index % 7 === 0 ? ['pickup'] : ['shipping', 'pickup'],
      ...(index % 9 === 4 ? { expiresAt: date(-1) } : {}),
    }))
  more.push({ id: 'deal-household-5', title: '5% off Household Essentials', categoryIds: ['household'], scope: 'category', value: 5 })
  return [...examples, ...more].map((offer, index) => ({
    kind: 'deal', scope: 'item', productIds: [], categoryIds: [], fulfillment: ['shipping', 'pickup'],
    startsAt: date(-14), expiresAt: date(5 + index % 8), minSpendCents: 0, valueType: 'percent',
    ...offer,
    terms: offer.kind === 'bonus' ? 'Activate before checkout. Earn the reward once when eligible merchandise meets the minimum.' :
      offer.kind === 'coupon' ? 'Apply before checkout. Valid on eligible items, while quantities last.' :
        'Target Circle discount applies automatically to eligible merchandise.',
  }))
}
