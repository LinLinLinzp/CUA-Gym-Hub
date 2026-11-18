const assortment = {
  Grocery: [
    ['coffee-12oz', 'Medium Roast Ground Coffee', 'Great Value', '12 oz', 5.48, 'coffee', true, 'coffee-alt'],
    ['coffee-30oz', 'Medium Roast Ground Coffee', 'Great Value', '30 oz', 10.98, 'coffee', false, 'coffee-alt'],
    ['coffee-dark', 'Dark Roast Ground Coffee', 'Great Value', '12 oz', 5.98, 'coffee'],
    ['bananas', 'Fresh Bananas', 'Fresh Produce', '1 bunch', 1.62, 'bananas', true],
    ['pasta-sauce', 'Tomato Basil Pasta Sauce', 'Great Value', '24 oz', 1.98, 'pasta-sauce'],
    ['pasta-sauce-family', 'Tomato Basil Pasta Sauce', 'Great Value', '2 × 24 oz', 3.68, 'pasta-sauce'],
    ['oats-42oz', 'Old Fashioned Oats', 'Quaker', '42 oz', 5.72, 'oats'],
    ['yogurt-strawberry', 'Strawberry Lowfat Yogurt', 'Yoplait', '8 cups', 4.48, 'yogurt'],
    ['milk-gallon', 'Whole Vitamin D Milk', 'Great Value', '1 gal', 3.46, 'milk'],
  ],
  'Household Essentials': [
    ['paper-towels-6', 'Select-a-Size Paper Towels', 'Great Value', '6 double rolls', 9.48, 'paper-towels', true, 'paper-towels-alt'],
    ['paper-towels-12', 'Select-a-Size Paper Towels', 'Great Value', '12 double rolls', 17.98, 'paper-towels', false, 'paper-towels-alt'],
    ['paper-towels-2', 'Select-a-Size Paper Towels', 'Great Value', '2 double rolls', 3.58, 'paper-towels'],
    ['detergent-92oz', 'Clean Breeze Liquid Laundry Detergent', 'Tide', '92 fl oz', 12.94, 'detergent'],
    ['detergent-46oz', 'Clean Breeze Liquid Laundry Detergent', 'Tide', '46 fl oz', 7.94, 'detergent'],
    ['dish-soap-18oz', 'Ultra Original Dish Soap', 'Dawn', '18 fl oz', 3.74, 'dish-soap'],
    ['dish-soap-38oz', 'Ultra Original Dish Soap', 'Dawn', '38 fl oz', 6.64, 'dish-soap'],
    ['toilet-paper-12', 'Ultra Soft Toilet Paper', 'Charmin', '12 mega rolls', 15.98, 'toilet-paper'],
    ['cleaner-32oz', 'Multi-Surface Disinfecting Cleaner', 'Lysol', '32 fl oz', 4.76, 'cleaner'],
  ],
  Electronics: [
    ['headphones-black', 'Wireless Bluetooth Over-Ear Headphones', 'onn.', 'Black', 24.88, 'headphones', true, 'headphones-alt'],
    ['headphones-noise-canceling', 'Wireless Noise Canceling Over-Ear Headphones', 'onn.', 'Black', 39.88, 'headphones', false, 'headphones-alt'],
    ['speaker-gray', 'Portable Bluetooth Speaker', 'onn.', 'Light gray', 18.88, 'speaker'],
    ['speaker-mini-gray', 'Mini Portable Bluetooth Speaker', 'onn.', 'Light gray', 12.88, 'speaker'],
    ['cable-3ft', 'USB-C to USB-C Charging Cable', 'onn.', '3 ft', 5.88, 'cable'],
    ['cable-6ft', 'USB-C to USB-C Charging Cable', 'onn.', '6 ft', 8.88, 'cable'],
    ['cable-10ft', 'Braided USB-C Charging Cable', 'Belkin', '10 ft', 14.98, 'cable'],
    ['tv-32in', '32-inch HD Smart TV', 'onn.', '32 in', 88, 'tv'],
    ['tv-43in', '43-inch 4K Smart TV', 'onn.', '43 in', 178, 'tv'],
  ],
  Home: [
    ['air-fryer-4qt', 'Compact Digital Air Fryer', 'Mainstays', '4 qt · Black', 39.94, 'air-fryer', true, 'air-fryer-alt'],
    ['air-fryer-6qt', 'XL Digital Air Fryer', 'Mainstays', '6 qt · Black', 54.94, 'air-fryer', false, 'air-fryer-alt'],
    ['towels-sage-2', 'Everyday Cotton Bath Towels', 'Mainstays', '2 pack · Sage', 11.98, 'towels'],
    ['towels-sage-4', 'Everyday Cotton Bath Towels', 'Mainstays', '4 pack · Sage', 21.98, 'towels'],
    ['glass-storage-6pc', 'Glass Food Storage Set', 'Mainstays', '6 pieces', 13.98, 'glass-storage'],
    ['glass-storage-10pc', 'Glass Food Storage Set', 'Mainstays', '10 pieces', 19.98, 'glass-storage'],
    ['bedding-full', 'Striped Microfiber Sheet Set', 'Mainstays', 'Full · Ivory', 19.96, 'bedding'],
    ['bedding-queen', 'Striped Microfiber Sheet Set', 'Mainstays', 'Queen · Ivory', 24.96, 'bedding'],
    ['bedding-king', 'Striped Microfiber Sheet Set', 'Mainstays', 'King · Ivory', 28.96, 'bedding'],
  ],
  Baby: [
    ['diapers-size3-84', 'Gentle Touch Diapers', 'Parent’s Choice', 'Size 3 · 84 count', 18.96, 'diapers', true],
    ['diapers-size2-96', 'Gentle Touch Diapers', 'Parent’s Choice', 'Size 2 · 96 count', 18.96, 'diapers'],
    ['diapers-size4-72', 'Gentle Touch Diapers', 'Parent’s Choice', 'Size 4 · 72 count', 18.96, 'diapers'],
    ['diapers-size5-60', 'Gentle Touch Diapers', 'Parent’s Choice', 'Size 5 · 60 count', 18.96, 'diapers'],
    ['diapers-size6-54', 'Gentle Touch Diapers', 'Parent’s Choice', 'Size 6 · 54 count', 18.96, 'diapers'],
    ['bottles-5oz-2', 'Natural Flow Baby Bottles', 'Dr. Brown’s', '5 fl oz · 2 pack', 11.88, 'bottles'],
    ['bottles-8oz-2', 'Natural Flow Baby Bottles', 'Dr. Brown’s', '8 fl oz · 2 pack', 13.88, 'bottles'],
    ['bottles-8oz-4', 'Natural Flow Baby Bottles', 'Dr. Brown’s', '8 fl oz · 4 pack', 24.88, 'bottles'],
    ['walker-first-steps', 'First Steps Activity Walker', 'VTech', 'Multicolor', 32.98, 'walker'],
  ],
  Toys: [
    ['blocks-50pc', 'Classic Wooden Building Blocks', 'Melissa & Doug', '50 pieces', 16.98, 'blocks', true],
    ['blocks-100pc', 'Classic Wooden Building Blocks', 'Melissa & Doug', '100 pieces', 24.98, 'blocks'],
    ['blocks-30pc', 'First Wooden Building Blocks', 'Play Day', '30 pieces', 9.98, 'blocks'],
    ['blocks-letters', 'Wooden Alphabet Blocks', 'Melissa & Doug', '40 pieces', 19.98, 'blocks'],
    ['teddy-10in', 'Classic Plush Teddy Bear', 'HugFun', '10 in · Brown', 8.98, 'teddy'],
    ['teddy-16in', 'Classic Plush Teddy Bear', 'HugFun', '16 in · Brown', 14.98, 'teddy'],
    ['teddy-22in', 'Snuggle Plush Teddy Bear', 'HugFun', '22 in · Brown', 21.98, 'teddy'],
    ['walker-playtime', 'Playtime Push Walker', 'Fisher-Price', 'Multicolor', 27.88, 'walker'],
    ['walker-music', 'Musical Activity Walker', 'VTech', 'Multicolor', 38.88, 'walker'],
  ],
  Beauty: [
    ['lotion-12oz', 'Daily Moisture Body Lotion', 'Aveeno', '12 fl oz', 8.97, 'skincare', true],
    ['lotion-18oz', 'Daily Moisture Body Lotion', 'Aveeno', '18 fl oz', 11.97, 'skincare'],
    ['lotion-2pack', 'Daily Moisture Body Lotion', 'Aveeno', '2 × 12 fl oz', 15.94, 'skincare'],
    ['wash-16oz', 'Gentle Daily Body Wash', 'Olay', '16 fl oz', 7.97, 'skincare'],
    ['wash-23oz', 'Gentle Daily Body Wash', 'Olay', '23 fl oz', 10.47, 'skincare'],
    ['shampoo-12oz', 'Daily Clean Shampoo', 'Suave', '12 fl oz', 3.47, 'shampoo'],
    ['shampoo-22oz', 'Daily Clean Shampoo', 'Suave', '22 fl oz', 5.47, 'shampoo'],
    ['shampoo-family', 'Daily Clean Shampoo', 'Suave', '2 × 22 fl oz', 9.47, 'shampoo'],
    ['shampoo-hydrating', 'Hydrating Shampoo', 'Garnier', '13 fl oz', 5.97, 'shampoo'],
  ],
  Pets: [
    ['dog-food-8lb', 'Adult Chicken & Rice Dry Dog Food', 'Purina ONE', '8 lb', 16.98, 'dog-food'],
    ['dog-food-16lb', 'Adult Chicken & Rice Dry Dog Food', 'Purina ONE', '16 lb', 28.98, 'dog-food'],
    ['dog-food-31lb', 'Adult Chicken & Rice Dry Dog Food', 'Purina ONE', '31 lb', 49.98, 'dog-food'],
    ['dog-food-small-8lb', 'Small Breed Chicken & Rice Dry Dog Food', 'Purina ONE', '8 lb', 17.48, 'dog-food'],
    ['dog-food-puppy-8lb', 'Healthy Puppy Chicken & Rice Dry Dog Food', 'Purina ONE', '8 lb', 17.98, 'dog-food'],
    ['cat-treats-3oz', 'Crunchy Chicken Cat Treats', 'Temptations', '3 oz', 2.08, 'cat-treats'],
    ['cat-treats-6oz', 'Crunchy Chicken Cat Treats', 'Temptations', '6.3 oz', 3.98, 'cat-treats'],
    ['cat-treats-16oz', 'Crunchy Chicken Cat Treats', 'Temptations', '16 oz', 8.48, 'cat-treats'],
    ['cat-treats-seafood', 'Crunchy Seafood Cat Treats', 'Temptations', '6.3 oz', 3.98, 'cat-treats'],
  ],
}

const productImage = name => `/images/${name}.webp`
const fresh = new Set(['bananas', 'milk-gallon', 'yogurt-strawberry'])
const eligibleDepartments = new Set(['Electronics', 'Home', 'Baby', 'Toys', 'Beauty'])

export function seedCatalog(stores) {
  return Object.entries(assortment).flatMap(([department, entries], departmentIndex) => entries.map((entry, index) => {
    const [slug, name, brand, variant, price, image, featured, alternate] = entry
    const perishable = fresh.has(slug)
    const unavailable = !featured && (index + departmentIndex) % 13 === 11
    return {
      id: `sku-${slug}`, title: `${brand} ${name}`, brand, department, variant, price,
      seller: !featured && index === 8 && ['Electronics', 'Toys'].includes(department) ? 'Marketplace Direct' : 'Walmart',
      description: `${name} by ${brand}. ${variant}.`,
      imagePath: productImage(image),
      ...(alternate ? { galleryPaths: [productImage(alternate)] } : {}),
      ...(featured ? { featured: true, ...(index % 2 === 0 ? { previousPrice: Math.round((price + 2) * 100) / 100 } : {}) } : {}),
      taxRate: department === 'Grocery' ? 0.025 : 0.075,
      maxOrderQty: featured ? 6 : index % 4 + 3,
      shippingStock: perishable || unavailable ? 0 : index % 6 === 3 ? 2 : 12 + ((departmentIndex + index) % 12),
      pickupStockByStore: Object.fromEntries(stores.map((store, storeIndex) => [
        store.id, !store.pickupEnabled || unavailable || (!featured && (index + storeIndex) % 7 === 5) ? 0 : 8 + ((departmentIndex + index + storeIndex) % 12),
      ])),
      registryEligible: eligibleDepartments.has(department) && department !== 'Beauty',
      returnPolicy: perishable ? { windowDays: 0, methods: [], resolutions: [] } : {
        windowDays: department === 'Electronics' ? 30 : 90,
        methods: department === 'Electronics' ? ['mail', 'fedex_dropoff'] : ['store', 'mail', 'scheduled_pickup', 'fedex_dropoff'],
        resolutions: department === 'Grocery' ? ['refund'] : ['refund', 'replacement'],
      },
    }
  }))
}
