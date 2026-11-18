import { seedCatalog } from './catalog.js'
import { day, hours } from './model.js'
import { seedOrdersReturnsPickup } from './seedOrders.js'
import { seedRegistries } from './seedRegistries.js'

const actorId = 'user-maya'
const pad = (value, length = 3) => String(value).padStart(length, '0')
const shift = (now, days = 0, additionalHours = 0) => new Date(+now + days * day + additionalHours * hours).toISOString()

function seedProfile() {
  return {
    id: actorId, name: 'Maya Thompson', email: 'maya.thompson@example.test', preferredStoreId: 'store-rogers',
    addresses: [
      { id: 'address-home', label: 'Home', recipient: 'Maya Thompson', line1: '214 Cedar Trace', line2: 'Apt 3', city: 'Rogers', region: 'AR', postalCode: '72756' },
      { id: 'address-office', label: 'Office', recipient: 'Maya Thompson', line1: '802 Linden Court', line2: 'Suite 202', city: 'Bentonville', region: 'AR', postalCode: '72712' },
    ],
    paymentSummary: { brand: 'Visa', last4: '2846' },
  }
}

function seedStores() {
  return [
    ['rogers', 'Rogers Supercenter', '1812 West Walnut Street', 'Rogers', '72756', true],
    ['bentonville', 'Bentonville Supercenter', '412 South Walton Boulevard', 'Bentonville', '72712', true],
    ['lowell', 'Lowell Neighborhood Market', '916 North Bloomington Street', 'Lowell', '72745', true],
    ['springdale', 'Springdale Supercenter', '540 West Sunset Avenue', 'Springdale', '72762', false],
  ].map(([slug, name, line1, city, postalCode, pickupEnabled]) => ({
    id: `store-${slug}`, name, address: { id: `store-address-${slug}`, line1, city, region: 'AR', postalCode },
    timezone: 'America/Chicago', pickupEnabled,
  }))
}

function metadata(createdAt, actor = actorId, updatedAt = createdAt) {
  return { actorId: actor, createdAt, updatedBy: actor, updatedAt }
}

function seedCart(profile, now) {
  const entries = [
    ['coffee-12oz', 2, 'pickup'], ['paper-towels-6', 1, 'pickup'],
    ['headphones-black', 1, 'shipping'], ['air-fryer-4qt', 1, 'shipping'],
    ['detergent-92oz', 1, 'pickup'], ['bottles-5oz-2', 2, 'shipping'], ['dog-food-8lb', 1, 'shipping'],
  ]
  return {
    id: 'cart-maya', ownerId: profile.id, pickupReservationId: null,
    lines: entries.map(([slug, quantity, fulfillmentMode], index) => ({
      id: `cart-line-${pad(index + 1)}`, productId: `sku-${slug}`, quantity, fulfillmentMode,
      status: index < 4 ? 'active' : 'saved', ...metadata(shift(now, -1, index)),
    })),
    events: [],
  }
}

export function createInitialData() {
  const now = new Date()
  const profile = seedProfile()
  const stores = seedStores()
  const catalog = seedCatalog(stores)
  return {
    profile, catalog, stores, cart: seedCart(profile, now),
    ...seedOrdersReturnsPickup(profile, catalog, stores, now),
    registries: seedRegistries(profile, catalog, now),
  }
}
