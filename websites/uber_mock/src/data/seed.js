const rider = {
  id: 'rider_maya',
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
  phone: '+1 415 555 0134',
  timeZone: 'America/Los_Angeles',
}

const paymentMethods = [
  { id: 'pay_01', brand: 'Visa', last4: '4242' },
  { id: 'pay_02', brand: 'Mastercard', last4: '5108' },
  { id: 'pay_03', brand: 'American Express', last4: '3009' },
  { id: 'pay_04', brand: 'Visa', last4: '7426' },
]

const projects = [
  'Personal', 'Studio travel', 'Client visits', 'Field research', 'Conference travel',
  'Redwood accounts', 'Mission workshops', 'East Bay interviews', 'Harbor proposal',
  'Peninsula planning', 'Coastline rollout', 'Civic design', 'Spring exhibit',
  'Citywide survey', 'Warehouse visits', 'North Bay sessions', 'Station briefings',
  'Studio residency', 'Marina meetings', 'Airport transfers', 'Retail walkthroughs',
  'Bayview pilot', 'Quarterly offsite', 'Foundry project',
]
const profileId = (index) => 'profile_' + String(index + 1).padStart(3, '0')
const numbered = (prefix, index) => prefix + '_' + String(index + 1).padStart(3, '0')
const usd = (cents) => cents / 100

function createProfiles() {
  return projects.map((name, index) => {
    const createdAt = '2026-05-' + String(index + 1).padStart(2, '0') + 'T16:00:00Z'
    return {
      id: profileId(index), riderId: rider.id, name,
      type: index === 0 ? 'personal' : 'business',
      status: index < 5 ? 'active' : 'archived',
      receiptEmail: index === 0 ? rider.email : index === 1 ? 'maya.expenses@example.org' : name.toLowerCase().replaceAll(' ', '.') + '@example.org',
      paymentMethodId: paymentMethods[index % paymentMethods.length].id,
      reportFrequency: ['none', 'monthly', 'weekly'][index % 3],
      expenseProvider: index % 3 === 1 ? 'Concur' : '',
      createdAt, updatedAt: index === 1 ? '2026-11-08T16:00:00Z' : createdAt, updatedBy: rider.id,
    }
  })
}

const routes = [
  ['San Francisco', 'Duboce Park', 'Ferry Building', 'UberX', 'Jordan M.'],
  ['San Francisco', 'Noe Valley Town Square', 'SFO International Terminal', 'Comfort', 'Amira S.'],
  ['Oakland', 'MacArthur BART', 'Oakland Museum', 'UberX', 'Sofia P.'],
  ['Oakland', 'Grand Lake Theatre', 'Jack London Square', 'Uber Green', 'Luis R.'],
  ['Palo Alto', 'Stanford Shopping Center', 'Palo Alto Caltrain', 'UberX', 'Ben C.'],
  ['Berkeley', 'North Berkeley BART', 'Greek Theatre', 'UberXL', 'Avery K.'],
  ['San Francisco', 'Glen Park BART', 'Fort Mason Center', 'Uber Green', 'Yasmin D.'],
  ['Emeryville', 'Bay Street Emeryville', 'Public Market', 'Comfort', 'Marcus T.'],
  ['San Francisco', 'Dolores Park', 'Chase Center', 'UberX', 'Nora V.'],
  ['Redwood City', 'Courthouse Square', 'Redwood City Marina', 'UberX', 'Mateo A.'],
  ['Alameda', 'Webster Street', 'Alameda Point', 'Uber Green', 'Nadia H.'],
  ['Daly City', 'Westlake Shopping Center', 'Thornton State Beach', 'Comfort', 'Drew N.'],
  ['San Francisco', 'Ghirardelli Square', 'California Academy of Sciences', 'UberXL', 'Devon L.'],
  ['Berkeley', 'Berkeley Bowl West', 'Tilden Regional Park', 'Comfort', 'Inez W.'],
  ['San Francisco', 'Balboa Park Station', 'Crocker Amazon Park', 'UberX', 'Samira E.'],
  ['San Mateo', 'Central Park', 'Hillsdale Caltrain', 'Uber Green', 'Elliot G.'],
  ['San Francisco', 'Civic Center Plaza', 'Divisadero Street', 'UberX', 'Priya B.'],
  ['Walnut Creek', 'Walnut Creek BART', 'Ruth Bancroft Garden', 'UberX', 'Bianca Q.'],
  ['South San Francisco', 'Grand Avenue Library', 'Oyster Point Marina', 'Uber Green', 'Omar Z.'],
  ['Richmond', 'Point Richmond', 'Richmond Ferry Terminal', 'Comfort', 'Lena I.'],
  ['San Francisco', 'West Portal Station', 'Ocean Beach', 'UberXL', 'Alex J.'],
  ['San Carlos', 'Laurel Street', 'Hiller Aviation Museum', 'UberX', 'Wesley U.'],
  ['Oakland', 'Temescal Alley', 'Lake Merritt', 'Uber Green', 'Camila F.'],
  ['San Francisco', 'San Francisco Main Library', '16th Street Mission BART', 'UberX', 'Theo N.'],
]

function createTripsAndReceipts(profiles) {
  const trips = []
  const receipts = []

  for (let index = 0; index < 48; index += 1) {
    const [city, firstStop, secondStop, service, driverName] = routes[index % routes.length]
    const [pickup, destination] = index < routes.length ? [firstStop, secondStop] : [secondStop, firstStop]
    const started = Date.UTC(2026, 10, 16, 17, 45) - (index * 113 + (index % 4) * 3) * 3_600_000
    const startedAt = new Date(started).toISOString()
    const completed = ![8, 13, 19, 28, 35, 44].includes(index)
    const charged = completed || index === 8 || index === 28
    const tripId = numbered('trip', index)
    const receiptId = charged ? numbered('receipt', index) : undefined
    const profile = profiles[index % profiles.length]
    const line = (kind, label, amount) => ({ id: numbered('line', index) + '_' + kind, label, quantity: 1, amount: usd(amount) })
    const lineItems = completed
      ? [line('fare', 'Trip fare', index === 0 ? 1890 : 880 + (index * 613) % 4200), line('fee', 'Booking fee', index === 0 ? 350 : 175 + (index % 6) * 35)]
      : charged ? [line('cancellation', 'Cancellation fee', index === 8 ? 575 : 695)] : []
    if (completed && index % 7 === 1) lineItems.push(line('toll', 'Bridge toll', 700))
    if (completed && index % 6 === 2) lineItems.push(line('tip', 'Tip', 300 + (index % 4) * 100))
    if (completed && index % 5 === 3) lineItems.push(line('discount', 'Ride discount', -250))
    const total = usd(lineItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0))
    const ended = started + (completed ? 23 + (index % 12) * 2 : 3) * 60_000
    trips.push({
      id: tripId, riderId: rider.id, startedAt, endedAt: new Date(ended).toISOString(),
      city, pickup, destination, service, driverName: charged || completed ? driverName : undefined,
      status: completed ? 'completed' : 'canceled', total, currency: 'USD', expenseProfileId: profile.id, receiptId,
    })

    if (receiptId) {
      const { brand, last4 } = paymentMethods[index % paymentMethods.length]
      receipts.push({
        id: receiptId, number: 'UB-' + startedAt.slice(2, 10).replaceAll('-', '') + '-' + String(index + 1).padStart(3, '0'),
        tripId, issuedAt: new Date(ended + 60_000).toISOString(), currency: 'USD', total,
        billedProfileId: profile.id, receiptEmail: profile.receiptEmail, payment: { brand, last4 }, lineItems,
      })
    }
  }

  return { trips, receipts }
}

const items = [
  ['phone', 'Black phone with a red case'], ['wallet', 'Brown card wallet under the seat'],
  ['bag', 'Grey canvas tote with a paperback inside'], ['keys', 'Two brass keys on a yellow loop'],
  ['clothing', 'Navy rain shell with a folded hood'], ['other', 'Clear glasses in a hard green case'],
  ['phone', 'Silver phone in an opaque blue cover'], ['wallet', 'Slim zip wallet with a teal lining'],
  ['bag', 'Black backpack with a water bottle clipped on'], ['keys', 'House key with a silver bicycle keychain'],
  ['clothing', 'Charcoal cardigan with pearl buttons'], ['other', 'Steel travel mug with a white lid'],
  ['phone', 'Older phone with a white case and strap'], ['wallet', 'Stone-colored wallet with a clasp'],
  ['bag', 'Olive gym bag with a striped handle'], ['keys', 'Car fob on a woven black loop'],
  ['clothing', 'Maroon baseball cap from the game'], ['other', 'Earbuds in a round cream case'],
  ['phone', 'Phone with a clear case and floral sticker'], ['wallet', 'Small black coin purse on the back seat'],
  ['bag', 'Canvas grocery tote with long blue straps'], ['keys', 'Apartment keys with a blue plastic tag'],
  ['clothing', 'Tan scarf from the back seat'], ['other', 'Folded umbrella with a wooden handle'],
]

function createLostReports(trips) {
  const completed = trips.filter((trip) => trip.status === 'completed').slice(2)
  return items.map(([category, description], index) => {
    const trip = completed[index]
    const createdAt = new Date(Date.parse(trip.endedAt) + 4 * 3_600_000).toISOString()
    const status = ['in_progress', 'returned', 'closed', 'submitted'][index % 4]
    const updatedAt = status === 'submitted' ? createdAt : new Date(Date.parse(createdAt) + 36 * 3_600_000).toISOString()
    return {
      id: numbered('lost', index), tripId: trip.id, reporterId: rider.id, category, description,
      callbackPhone: '+1 415 555 01' + String(34 + index % 7), status, createdAt, updatedAt,
      ...(status === 'returned' ? { resolvedAt: updatedAt, resolvedBy: rider.id } : {}),
    }
  })
}

const explanations = {
  unexpected_fare: 'The final charge differed from the fare shown before pickup.',
  duplicate_charge: 'My statement shows a second charge for this ride.',
  cancellation_fee: 'The ride was canceled before I could meet the driver.',
  wait_time_fee: 'I was at the pickup point when the driver arrived.',
  other: 'Please review this charge against the route shown on the receipt.',
}

function createRefunds(receipts, trips) {
  return receipts.slice(2, 26).map((receipt, index) => {
    const trip = trips.find((entry) => entry.id === receipt.tripId)
    const line = receipt.lineItems[index % 2] ?? receipt.lineItems[0]
    const requestedAmount = index % 3 === 0 ? usd(Math.round(line.amount * 70)) : line.amount
    const reason = trip.status === 'canceled' ? 'cancellation_fee' : ['unexpected_fare', 'duplicate_charge', 'wait_time_fee', 'other'][index % 4]
    const status = ['under_review', 'submitted', 'approved', 'declined', 'withdrawn'][index % 5]
    const createdAt = new Date(Date.parse(receipt.issuedAt) + 2 * 3_600_000).toISOString()
    const updatedAt = status === 'submitted' ? createdAt : new Date(Date.parse(createdAt) + 24 * 3_600_000).toISOString()
    return {
      id: numbered('refund', index), tripId: trip.id, receiptId: receipt.id, requesterId: rider.id,
      reason, description: explanations[reason],
      lineItems: [{ receiptLineId: line.id, label: line.label, quantity: line.quantity, chargedAmount: line.amount, requestedAmount }],
      requestedAmount, currency: receipt.currency, status, createdAt, updatedAt,
      ...(status === 'approved' ? { approvedAmount: requestedAmount } : {}),
      ...(status === 'withdrawn' ? { withdrawnAt: updatedAt, withdrawnBy: rider.id } : {}),
    }
  })
}

export function createInitialData() {
  const expenseProfiles = createProfiles()
  const { trips, receipts } = createTripsAndReceipts(expenseProfiles)
  return {
    rider: { ...rider },
    paymentMethods: paymentMethods.map((payment) => ({ ...payment })),
    trips,
    receipts,
    expenseProfiles,
    receiptActions: [],
    lostItemReports: createLostReports(trips),
    refundRequests: createRefunds(receipts, trips),
  }
}
