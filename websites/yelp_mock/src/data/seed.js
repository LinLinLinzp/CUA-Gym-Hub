const users = ['Maya Chen', 'Rory Bennett', 'Nina Patel', 'Leo Alvarez', 'Tessa Grant', 'Owen Park', 'Samira Reed', 'Elliot Moss', 'Imani Brooks', 'Jules Carter', 'Avery Singh', 'Milo Dunn'].map((displayName, index) => ({
  id: index === 0 ? 'usr_maya' : `usr_${index}`,
  displayName,
  email: `${displayName.toLowerCase().replace(' ', '.')}@example.test`,
  city: 'Portland, OR',
  joinedAt: '2021-08-17T18:00:00.000Z',
}))

const listings = [
  ['Juniper Hearth', 'Pacific Northwest', 'Sellwood', 'Seasonal plates from a wood-fired kitchen and a short Oregon wine list.'],
  ['Alder & Ash', 'Pacific Northwest', 'Alberta', 'Roasted vegetables, river fish and cider in a converted millhouse.'],
  ['Marigold Table', 'Italian', 'Hawthorne', 'Hand-cut pasta and slow Sunday suppers.'],
  ['Little Fern Bistro', 'French', 'St. Johns', 'Market-driven bistro cooking with a garden patio.'],
  ['Cedar Counter', 'Japanese', 'Division', 'A small dining room serving grilled skewers and seasonal rice bowls.'],
  ['Canto Verde', 'Mexican', 'Montavilla', 'House tortillas, braised meats and bright seasonal salsas.'],
  ['Northbank Supper Club', 'Pacific Northwest', 'Pearl District', 'A menu inspired by farms and fisheries along the Columbia.'],
  ['Olive & Orchard', 'Mediterranean', 'Richmond', 'Warm flatbreads, charred vegetables and shareable mains.'],
  ['Rind & Rye', 'American', 'Kenton', 'Roasted chicken and sourdough in a neighborhood dining room.'],
  ['Blue Hour Kitchen', 'American', 'Buckman', 'Comfort food, locally milled bread and zero-proof cocktails.'],
  ['Maple Noodle House', 'Japanese', 'Woodstock', 'Slow-simmered broths and springy noodles.'],
  ['Poppy Lunchroom', 'American', 'Alberta', 'Breakfast sandwiches, biscuits and generous grain bowls.'],
  ['Fieldstone Pasta', 'Italian', 'Sellwood', 'Fresh pasta and a changing menu of regional Italian dishes.'],
  ['Crown & Fig', 'Mediterranean', 'Kerns', 'Mezze, braised lamb and roasted figs when in season.'],
  ['Sparrow Brasserie', 'French', 'Nob Hill', 'Neighborhood French fare with a compact bar menu.'],
  ['La Mesa del Sol', 'Mexican', 'Lents', 'Family-style plates with handmade masa and roasted chiles.'],
  ['Riverbend Home Care', 'Home Cleaning', 'Sellwood', 'Household cleaning for apartments, family homes and move-outs.', ['Deep cleaning', 'Move-out cleaning', 'Recurring cleaning'], 'biz_riverbend_care'],
  ['Tidy Willow', 'Home Cleaning', 'Kerns', 'Flexible cleaning plans with fragrance-free supplies available.', ['Deep cleaning', 'Recurring cleaning']],
  ['Mossline Garden Works', 'Landscaping', 'St. Johns', 'Native planting and garden maintenance for small urban yards.', ['Garden cleanup', 'Planting plan']],
  ['Good Soil Yard Care', 'Landscaping', 'Richmond', 'Seasonal pruning, leaf removal and raised beds.', ['Pruning', 'Raised bed installation']],
  ['Westbank Pipe & Drain', 'Plumbing', 'Nob Hill', 'Residential drain clearing and fixture replacement.', ['Drain clearing', 'Fixture installation']],
  ['Lantern Plumbing', 'Plumbing', 'Pearl District', 'Leak diagnosis and kitchen and bathroom repairs.', ['Leak repair', 'Fixture installation']],
  ['Red Alder Electric', 'Electricians', 'Kenton', 'Lighting upgrades and residential electrical repairs.', ['Lighting installation', 'Electrical repair']],
  ['Bridgeway Electric', 'Electricians', 'Buckman', 'Outlet repairs, troubleshooting and added circuits.', ['Outlet repair', 'Circuit installation']],
  ['Hearthside Paint Co.', 'Painters', 'Hawthorne', 'Interior painting and careful preparation for older homes.', ['Interior painting', 'Cabinet painting']],
  ['Chalk & Timber Painting', 'Painters', 'Montavilla', 'Exterior finishes and trim painting.', ['Exterior painting', 'Trim painting']],
  ['Thimble Appliance Repair', 'Appliance Repair', 'Woodstock', 'Appointments for common kitchen and laundry appliances.', ['Oven repair', 'Washer repair']],
  ['Roseway Appliance Care', 'Appliance Repair', 'Roseway', 'Diagnosis and servicing for household appliances.', ['Dishwasher repair', 'Dryer repair']],
  ['Boxwood Moving', 'Movers', 'Division', 'Local apartment moves and packing support.', ['Local move', 'Packing help']],
  ['Two Bridges Moving', 'Movers', 'Lents', 'Residential moves and heavy-item transport.', ['Local move', 'Furniture moving']],
  ['Clearpane Window Care', 'Window Washing', 'Alberta', 'Interior and exterior window cleaning for homes.', ['Window cleaning', 'Screen cleaning']],
  ['Daybreak Glass Care', 'Window Washing', 'Sellwood', 'Seasonal glass washing and skylight cleaning.', ['Window cleaning', 'Skylight cleaning']],
  ['Bracken Coffee', 'Cafés', 'Hawthorne', 'Small-batch coffee, oat biscuits and a sunny bench out front.'],
  ['Clover Mornings', 'Cafés', 'Sellwood', 'Espresso and cardamom buns in a corner storefront.'],
  ['Needle & Steam', 'Cafés', 'St. Johns', 'Pour-over coffee and used records on a rotating shelf.'],
  ['Solstice Roasters', 'Cafés', 'Montavilla', 'Freshly roasted beans and an espresso bar with a standing counter.'],
  ['Saltbox Bakery', 'Bakeries', 'Woodstock', 'Long-fermented loaves and salted honey pastries.'],
  ['Orchard Crumb', 'Bakeries', 'Kerns', 'Seasonal pies and hand-shaped croissants.'],
  ['Pinecone Books', 'Bookstores', 'Alberta', 'New fiction, regional history and a small children’s room.'],
  ['Marginalia Books', 'Bookstores', 'Nob Hill', 'Used books with handwritten recommendations from the staff.'],
  ['Paper Finch Studio', 'Art Supplies', 'Buckman', 'Watercolors, sketchbooks and papers by the sheet.'],
  ['Roseglass Florals', 'Florists', 'Pearl District', 'Locally grown flowers and simple seasonal arrangements.'],
  ['Roundhouse Cycles', 'Bike Shops', 'Kenton', 'Commuter bikes, tune-ups and a selection of repair parts.'],
  ['Highwater Bicycles', 'Bike Shops', 'Division', 'Neighborhood repair counter and everyday cycling gear.'],
  ['Lark & Laurel Market', 'Specialty Food', 'Richmond', 'Regional cheese, pantry staples and fresh sandwiches.'],
  ['Twenty Pines Pantry', 'Specialty Food', 'Lents', 'Loose-leaf tea, dried spices and jars of local preserves.'],
  ['Buttonwood Ceramics', 'Art Studios', 'St. Johns', 'Handmade tableware and open studio hours.'],
  ['Soft Light Gallery', 'Art Galleries', 'Pearl District', 'Rotating exhibitions by nearby painters and printmakers.'],
]

const businesses = listings.map(([name, category, neighborhood, description, quoteServices, id], index) => ({
  id: id || `biz_${name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/ +/).join('_')}`,
  name, category, neighborhood, description,
  kind: index < 16 ? 'restaurant' : index < 32 ? 'service' : 'other',
  city: 'Portland, OR',
  address: `${427 + index * 13} ${['Willow Quay', 'Copperleaf Lane', 'Wren Court', 'Larkspur Way'][index % 4]}, Portland, OR`,
  rating: index === 0 ? 4.6 : Number((3.8 + (index % 12) / 10).toFixed(1)),
  reviewCount: index === 0 ? 144 : 18 + index * 7 % 220,
  priceLevel: 1 + index % 3,
  imagePath: `/art/${index < 16 ? 'restaurant' : index < 32 ? 'service' : index < 38 ? 'cafe' : 'shop'}.webp`,
  ...(quoteServices && { quoteServices }),
  ...(index < 16 && { reservationPolicy: {
    timeZone: 'America/Los_Angeles',
    openWeekdays: index === 0 ? [0, 2, 3, 4, 5, 6] : index % 2 ? [1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6],
    slotTimes: index === 11 ? ['09:00', '09:30', '10:00', '10:30', '11:00'] :
      index % 3 === 1 ? ['16:30', '17:30', '18:30', '19:30', '20:30'] : ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30'],
    maxPartySize: index % 4 === 1 ? 8 : index % 4 === 2 ? 4 : 6,
  } }),
}))

const currentUserId = users[0].id
const numberId = (prefix, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`
const stamp = (index) => new Date(Date.UTC(2026, 10, 14 - index, 17 + index % 6)).toISOString()
const reviewNotes = [
  'We had time to settle in, and the staff were warm even with a steady stream of people coming through the door.',
  'Everything was ready when promised. I appreciated the clear explanations and the time spent answering my questions.',
  'The experience was okay, though the wait was longer than expected and there was little communication about timing.',
  'The visit was straightforward from start to finish. I would happily come back and recommend it to a neighbor.',
  'The team was friendly, though the service felt rushed and I left with a few questions that could have been answered.',
  'It was a good first visit. The staff gave thoughtful suggestions and made sure we had what we needed before leaving.',
]

const reviews = Array.from({ length: 56 }, (_, index) => {
  const owned = index < 26
  const business = businesses[owned ? index + 1 : (index - 26) * 5 % 43]
  const removed = index === 24 || index === 25
  return {
    id: numberId('rev', index), userId: owned ? currentUserId : users[1 + index % 11].id,
    businessId: business.id, rating: [5, 4, 2, 5, 3, 4][index % 6],
    text: `I tried ${business.name} after hearing about it from a neighbor. ${reviewNotes[index % reviewNotes.length]}`,
    status: removed ? 'removed' : 'published', createdAt: stamp(index + 5),
    ...(removed && { removalReason: 'Posted to the wrong location', removedAt: stamp(index), updatedAt: stamp(index) }),
  }
})

const collections = [
  ['col_want_to_go', 'Want to go'], ['col_sunday_breakfast', 'Sunday breakfast'], ['col_patio_tables', 'Patio tables'],
  ['col_home_projects', 'Home projects'], ['col_weekend_errands', 'Weekend errands'], ['col_out_of_town_guests', 'Out-of-town guests'],
].map(([id, name], i) => ({ id, name, userId: currentUserId, status: 'active', createdAt: stamp(i + 30) }))

const bookmarks = Array.from({ length: 32 }, (_, index) => {
  const collectionIndex = index % 5
  const businessIndex = [
    [1, 2, 4, 6, 32, 38, 42], [11, 32, 33, 34, 35, 36, 37], [3, 6, 7, 10, 13, 15],
    [16, 18, 20, 22, 24, 28], [38, 39, 41, 42, 44, 47],
  ][collectionIndex][Math.floor(index / 5)]
  const removed = index >= 29
  return {
    id: numberId('bm', index), userId: currentUserId, businessId: businesses[businessIndex].id,
    collectionId: collections[collectionIndex].id, status: removed ? 'removed' : 'saved', createdAt: stamp(index + 2),
    ...(removed && { removedAt: stamp(index - 3), updatedAt: stamp(index - 3) }),
  }
})

const quoteRequests = Array.from({ length: 26 }, (_, index) => {
  const business = businesses[16 + index % 16]
  const archived = index % 3 === 1
  const details = [
    'Please include labor and supplies in the estimate. Street parking is available near the side entrance.',
    'I would appreciate weekday availability and a rough timeline. I can share measurements at an initial visit.',
    'Please let me know which materials are included. I am available in the afternoon for a site visit.',
    'I am coordinating several small projects and would like to know how much time to set aside for this one.',
  ]
  return {
    id: numberId('quote', index), userId: currentUserId, businessId: business.id,
    serviceType: business.quoteServices[Math.floor(index / 3) % business.quoteServices.length],
    details: details[index % details.length], zipCode: ['97202', '97211', '97214', '97203'][index % 4],
    preferredDate: index % 2 ? null : `2026-11-${21 + index % 9}`,
    status: archived ? 'archived' : 'submitted', createdAt: stamp(index + 1),
    ...(index % 5 === 2 && { quotedAmount: 145.5 + 10 * index, currency: 'USD' }),
    ...(archived && { archivedAt: stamp(index - 1), updatedAt: stamp(index - 1) }),
  }
})

const reservations = Array.from({ length: 28 }, (_, index) => {
  const business = businesses[index % 16]
  const cancelled = index % 5 === 3
  const date = new Date(Date.UTC(2026, 9, 20 + index * 2))
  while (!business.reservationPolicy.openWeekdays.includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1)
  const beforeSlot = days => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - days, 17)).toISOString()
  const createdAt = [stamp(index + 3), beforeSlot(7)].sort()[0]
  const cancelledAt = [stamp(index), beforeSlot(4)].sort()[0]
  const { slotTimes, maxPartySize } = business.reservationPolicy
  return {
    id: numberId('rsv', index), userId: currentUserId, businessId: business.id,
    date: date.toISOString().slice(0, 10), time: slotTimes[index % slotTimes.length],
    partySize: 1 + index % maxPartySize, guestName: users[0].displayName, email: users[0].email,
    phone: index % 2 ? null : '503-555-0142', notes: index % 4 ? null : 'Window table if available',
    confirmationCode: `YLP-PDX${String(index + 1).padStart(3, '0')}`,
    status: cancelled ? 'cancelled' : 'confirmed', createdAt,
    ...(cancelled && { cancelledAt, updatedAt: cancelledAt }),
  }
})

export function createInitialData() {
  return structuredClone({ currentUserId, users, businesses, reviews, collections, bookmarks, quoteRequests, reservations })
}
