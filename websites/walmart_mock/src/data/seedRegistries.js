import { day, find, snapshot } from './model.js'
import { storeDate } from './pickup.js'

const profiles = [
  ['Olivia Martinez', 'baby', 'Olivia’s Baby Shower'],
  ['Ethan Walker', 'wedding', 'Ethan & Avery’s Wedding'],
  ['Sofia Rivera', 'classroom', 'Ms. Rivera’s First Grade'],
  ['Amelia Clark', 'baby', 'Amelia’s Baby Essentials'],
  ['Noah Bennett', 'wedding', 'Noah & Ella’s Registry'],
  ['Ava Reed', 'classroom', 'Ava Reed’s Art Room'],
  ['Harper Brooks', 'baby', 'Baby Brooks Registry'],
  ['Liam Nguyen', 'wedding', 'Liam & Taylor’s Wedding'],
  ['Isabella Patel', 'classroom', 'Books for Ms. Patel’s Class'],
  ['Mia Lewis', 'baby', 'Mia’s Nursery Checklist'],
  ['Lucas Morris', 'wedding', 'The Morris Wedding'],
  ['Charlotte Hall', 'classroom', 'Ms. Hall’s Kindergarten'],
  ['Elijah Carter', 'baby', 'Baby Carter’s Registry'],
  ['Evelyn Adams', 'wedding', 'Evelyn & Sam’s Wedding'],
  ['James Mitchell', 'classroom', 'Mr. Mitchell’s Science Room'],
  ['Ella Robinson', 'baby', 'Baby Robinson'],
  ['Henry Collins', 'wedding', 'Henry & Drew’s Registry'],
  ['Abigail Young', 'classroom', 'Ms. Young’s Reading Corner'],
  ['William Scott', 'baby', 'Scott Family Baby Shower'],
  ['Aria Nelson', 'wedding', 'Aria & Jules’ Wedding'],
  ['Grace Baker', 'classroom', 'Supplies for Ms. Baker'],
  ['Leo Gonzalez', 'baby', 'Gonzalez Baby Registry'],
  ['Nora King', 'wedding', 'Nora & Jamie’s Wedding'],
  ['Zoe Wright', 'classroom', 'Ms. Wright’s Second Grade'],
  ['Mateo Hill', 'baby', 'Mateo’s Baby Shower'],
  ['Chloe Green', 'wedding', 'Chloe & Alex’s Registry'],
  ['Jack Evans', 'classroom', 'Mr. Evans’ Classroom'],
  ['Lily Cooper', 'baby', 'Baby Cooper’s Essentials'],
]

const giftsByType = {
  baby: ['diapers-size3-84', 'bottles-5oz-2', 'walker-first-steps', 'blocks-50pc', 'teddy-10in'],
  wedding: ['air-fryer-4qt', 'glass-storage-6pc', 'towels-sage-2', 'bedding-queen', 'speaker-gray'],
  classroom: ['blocks-30pc', 'blocks-letters', 'teddy-16in', 'glass-storage-10pc', 'cable-6ft'],
}

function seedItems({ registryId, type, ownerId, catalog, createdAt, index }) {
  const count = index < 2 ? 3 : index % 5 + 1
  return giftsByType[type].slice(0, count).map((sku, position) => {
    const product = find(catalog, `sku-${sku}`)
    const id = `${registryId}-item-${String(position + 1).padStart(2, '0')}`
    const quantityRequested = (position + index) % 3 + 2
    const quantityPurchased = position % 4 === 0 ? 1 : position % 4 === 1 ? quantityRequested : 0
    return {
      id, productId: product.id, product: snapshot(product), status: 'active', quantityRequested, quantityPurchased,
      actorId: ownerId, createdAt, updatedBy: ownerId, updatedAt: createdAt,
      purchases: quantityPurchased ? [{
        id: `${id}-purchase-01`, quantity: quantityPurchased, giverName: ['Jordan Thompson', 'Riley Martin', 'Renee Howard'][index % 3],
        retailer: 'Walmart', unitPrice: product.price, actorId: ownerId, createdAt,
      }] : [],
    }
  })
}

export function seedRegistries(profile, catalog, now) {
  return [
    [profile.name, 'baby', 'Maya’s Baby Registry', 'registry-maya-baby', 'public'],
    [profile.name, 'wedding', 'Maya & Jordan’s Wedding', 'registry-maya-wedding', 'private'],
    ...profiles,
  ].map(([registrantName, type, name, registryId, access], index) => {
    const ownerId = index < 2 ? profile.id : `user-registry-${String(index + 1).padStart(3, '0')}`
    const id = registryId || `registry-${String(index + 1).padStart(3, '0')}`
    const createdAt = new Date(+now - (index + 7) * day).toISOString()
    const eventDate = storeDate(new Date(+now + (index * 3 + 18) * day), 'America/Chicago')
    const visibility = access || (index % 7 === 0 ? 'private' : 'public')
    const fields = { type, name, registrantName, eventDate, visibility, ...(index < 2 ? { addressId: 'address-home' } : {}) }
    return {
      id, ownerId, ...fields, status: 'active',
      actorId: ownerId, createdAt, updatedBy: ownerId, updatedAt: createdAt,
      items: seedItems({ registryId: id, type, ownerId, catalog, createdAt, index }),
      events: [{
        id: `${id}-created`, type: 'created', actorId: ownerId, createdAt,
        changes: Object.entries(fields).map(([field, after]) => ({ field, before: null, after })),
      }],
    }
  })
}
