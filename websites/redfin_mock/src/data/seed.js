const id = (kind, index) => kind + '-' + String(index + 1).padStart(3, '0')
const date = (day, calendarMonth = 10, hour = 18) => new Date(Date.UTC(2026, calendarMonth, day, hour)).toISOString()

export const photoStyles = ['craftsman', 'townhouse', 'split-level', 'bungalow', 'condo', 'contemporary']

const areas = [
  ['Ballard', 'Seattle', '98107', 795000],
  ['Fremont', 'Seattle', '98103', 830000],
  ['Columbia City', 'Seattle', '98118', 620000],
  ['West Seattle', 'Seattle', '98116', 735000],
  ['Greenwood', 'Seattle', '98103', 690000],
  ['Richmond Beach', 'Shoreline', '98177', 720000],
  ['Crossroads', 'Bellevue', '98008', 970000],
  ['Juanita', 'Kirkland', '98034', 880000],
]
const streets = ['Alder Lantern Way', 'Cedar Quay Lane', 'Rainbell Avenue', 'Foxglove Terrace', 'Fern Crest Place', 'Driftwood Hollow', 'Windward Grove', 'Salal Ridge Court']
const types = ['house', 'townhouse', 'house', 'house', 'condo', 'house']
const descriptions = [
  'A covered front porch opens to warm wood floors and a dining room with built-in shelving. The rear garden has room for outdoor dining.',
  'A corner townhouse with a fenced patio, generous windows, and a bright top-floor office.',
  'A flexible split-level with two living areas, a wide deck and space for a workshop downstairs.',
  'A brick bungalow with mature landscaping, updated kitchen cabinetry and a sunny breakfast nook.',
  'An open-plan condo with a sheltered balcony, secure parking and space for a full-size dining table.',
  'A contemporary home with an open kitchen, tall windows and sliding doors leading to a landscaped courtyard.',
]

export function createInitialData() {
  const account = { id: 'buyer-001', displayName: 'Avery Morgan', email: 'avery.morgan@example.test', timeZone: 'America/Los_Angeles' }
  const { id: actorId } = account
  const agents = ['Maya Chen', 'Jordan Ellis', 'Priya Shah', 'Mateo Rivera', 'Sophie Park', 'Theo Bennett'].map((displayName, i) => ({
    id: id('agent', i), displayName, title: 'Redfin Agent',
    market: ['Seattle', 'Seattle', 'Seattle', 'Shoreline', 'Bellevue', 'Kirkland'][i],
    initials: displayName.split(' ').map(part => part[0]).join(''),
  }))
  const homes = Array.from({ length: 48 }, (_, i) => {
    const [neighborhood, city, zip, basePrice] = areas[i % areas.length]
    const style = i % photoStyles.length
    const offset = Math.floor(i / areas.length)
    return {
      id: id('home', i), address: (4217 + i * 57 + offset * 2) + ' ' + streets[(i + offset * 3) % streets.length],
      city, region: 'WA', zip, neighborhood, price: basePrice + [80000, 15000, -30000, 45000, -245000, 160000][style] + offset * 8750,
      beds: [3, 3, 4, 2, 2, 4][style] + (offset % 3 === 2 ? 1 : 0),
      baths: [2.5, 2, 3, 1, 2, 3.5][style], sqft: [1840, 1590, 2280, 1320, 1105, 2580][style] + offset * 75,
      propertyType: types[style], status: i >= 42 ? 'sold' : i >= 35 && i < 40 ? 'pending' : 'active',
      photo: '/homes/' + photoStyles[style] + '-01.webp', description: descriptions[style],
      agentId: agents[i % agents.length].id, listedAt: date(2 + i % 11),
    }
  })
  const savedHomes = homes.slice(0, 32).map((home, i) => ({
    id: id('saved', i), homeId: home.id, actorId, status: i >= 28 ? 'removed' : 'saved',
    createdAt: date(17 - Math.floor(i / 3), 10, 20 - i % 3),
    updatedAt: i >= 28 ? date(17) : date(17 - Math.floor(i / 3), 10, 20 - i % 3),
    ...(i >= 28 && { removedAt: date(17) }),
  }))
  const tours = Array.from({ length: 24 }, (_, i) => {
    const { id: homeId, agentId } = homes[i]
    const status = i < 9 ? (i % 2 ? 'confirmed' : 'requested') : i % 4 === 0 ? 'canceled' : 'completed'
    const createdAt = date(i < 9 ? 15 : 1 + i % 5)
    return {
      id: id('tour', i), homeId, agentId, actorId, status, mode: i % 4 === 1 ? 'video' : 'in_person',
      scheduledAt: i < 9 ? date(21 + i, 10, i % 3 === 0 ? 18 : 21) : date(8 + i % 8),
      timeZone: account.timeZone, ...(i % 3 === 0 && { notes: 'Please allow a few minutes to look at the storage space.' }),
      createdAt, updatedAt: status === 'canceled' ? date(7) : createdAt,
      ...(status === 'canceled' && { canceledAt: date(7) }),
    }
  })
  const offers = Array.from({ length: 24 }, (_, i) => {
    const { id: homeId, agentId, price } = homes[(i + 7) % homes.length]
    const status = ['submitted', 'draft', 'accepted', 'draft', 'declined', 'submitted', 'withdrawn'][i % 7]
    const createdAt = date(16 - Math.floor(i / 2))
    const submittedAt = date(16 - Math.floor(i / 2), 10, 20)
    return {
      id: id('offer', i), homeId, agentId, actorId, status, amount: price + (i % 4 - 2) * 7500,
      currency: 'USD', financing: ['conventional', 'cash', 'fha', 'va', 'other'][i % 5],
      closingDate: '2026-12-' + String(12 + i % 10), createdAt,
      updatedAt: status === 'withdrawn' ? date(17) : status === 'draft' ? createdAt : submittedAt,
      ...(status !== 'draft' && { submittedAt }),
      ...(status === 'withdrawn' && { withdrawnAt: date(17) }),
      ...(i % 2 === 0 && { notes: 'Include a standard inspection contingency.' }),
    }
  })
  const questions = [
    ['Parking access', 'Is there a dedicated parking space?', 'The listing packet includes a parking diagram. I can walk you through it.'],
    ['Natural light', 'Which rooms get afternoon light?', 'The main living area has west-facing windows and good light on clear days.'],
    ['Tour availability', 'Would a weekend viewing be possible?', 'A weekend viewing may work. Let me know which window you prefer.'],
    ['Storage options', 'Could you tell me more about the storage?', 'We can check the storage dimensions and access during a visit.'],
    ['Home search', 'Can we discuss what is available in my price range?', 'Happy to help. Send over the neighborhoods and features you have in mind.'],
    ['Inspection details', 'Is there an inspection summary available?', 'I can help review the disclosures and flag questions to bring to an inspector.'],
  ]
  const messages = []
  const messageThreads = Array.from({ length: 24 }, (_, i) => {
    const home = i % 5 === 4 ? undefined : homes[i]
    const agent = agents[i % 6]
    const threadId = id('thread', i)
    const [topic, question, answer] = questions[i % questions.length]
    const day = 16 - Math.floor(i / 2)
    const times = [date(day - 1), date(day, 10, 17), date(day, 10, 19 + i % 2)]
    const bodies = ['Hi ' + agent.displayName.split(' ')[0] + ', ' + question.charAt(0).toLowerCase() + question.slice(1), 'Thanks for checking in. ' + answer, i % 4 === 0 ? 'I am around this week if you would like to go over it together.' : 'Thanks, I will keep that in mind while I compare my shortlist.']
    times.forEach((createdAt, j) => {
      const inbound = j === 1 || (j === 2 && i % 4 === 0)
      messages.push({
        id: id('message', i * 3 + j), threadId, body: bodies[j], status: 'sent', createdAt,
        senderId: inbound ? agent.id : actorId, recipientId: inbound ? actorId : agent.id,
      })
    })
    return {
      id: threadId, agentId: agent.id, actorId, ...(home && { homeId: home.id }),
      subject: home ? topic + ' · ' + home.address : topic + ' in ' + agent.market,
      createdAt: times[0], lastMessageAt: times[2], lastReadAt: i % 3 === 0 ? times[0] : times[2], readById: actorId,
    }
  })
  return { account, agents, homes, savedHomes, tours, offers, messageThreads, messages }
}
