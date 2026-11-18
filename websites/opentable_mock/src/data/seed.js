import { addDays, DEFAULT_ZONE, localClock, slotInstant } from './dates.js'
import { snapshot } from './model.js'

const venues = [
  ['Juniper & Rye', 'American', 'West Village', '18 Holloway Lane', 3, 'Open-fire cooking, seasonal vegetables and a short list of cocktails in a cozy corner dining room.'],
  ['Saffron Harbor', 'Mediterranean', 'SoHo', '72 Wren Street', 3, 'Charcoal-grilled seafood and bright mezze served on hand-painted plates.'],
  ['Paper Crane', 'Japanese', 'East Village', '39 Foxglove Court', 3, 'Hand rolls, broths and a changing selection of seasonal nigiri.'],
  ['Pasta Selva', 'Italian', 'Nolita', '104 Clover Alley', 2, 'Hand-cut pasta and bitter greens at a neighborhood trattoria.'],
  ['Marigold Brasserie', 'French', 'Tribeca', '52 Quince Row', 4, 'A polished dining room for roast chicken, oysters and late-evening desserts.'],
  ['Cobre Mesa', 'Mexican', 'Lower East Side', '61 Finch Lane', 2, 'House-milled masa, slow-cooked fillings and salsas made each afternoon.'],
  ['Namu House', 'Korean', 'Koreatown', '32 Rowan Place', 3, 'Stone-bowl rice, comforting stews and a generous spread of banchan.'],
  ['Lotus Window', 'Chinese', 'Chinatown', '20 Minna Court', 2, 'Dim sum baskets, tea and crisp vegetables served family style.'],
  ['The Ash & Apple', 'American', 'Tribeca', '23 Skipper Lane', 3, 'An intimate grill with applewood-roasted meat and warm grain salads.'],
  ['Fennel Room', 'Italian', 'West Village', '307 Briar Walk', 3, 'Classic pasta with a rotating menu of market vegetables and fresh cheeses.'],
  ['Citrus & Sumac', 'Mediterranean', 'Nolita', '12 Nest Street', 2, 'Hummus, grilled skewers and lemon-scented rice in a relaxed room.'],
  ['Tern & Tide', 'Japanese', 'SoHo', '84 Crane Row', 4, 'Seasonal sashimi and delicate grilled fish at a long timber counter.'],
  ['Rue des Vignes', 'French', 'West Village', '18 Briar Walk', 3, 'A small French bistro with duck, gratin and afternoon apéritifs.'],
  ['Sol de Maguey', 'Mexican', 'East Village', '29 Petrel Lane', 2, 'Colorful plates of mole, tamales and tacos from the griddle.'],
  ['Bowl & Blossom', 'Korean', 'Lower East Side', '77 Heron Walk', 2, 'Rice bowls, savory pancakes and crisp pickles for sharing.'],
  ['Plum Lantern', 'Chinese', 'Chinatown', '21 Celandine Lane', 3, 'Cantonese roast meats and silky noodles in a lantern-lit room.'],
  ['Orchard Hearth', 'American', 'Lower East Side', '96 Hayfield Court', 2, 'A lively neighborhood kitchen with roasted squash and a cast-iron burger.'],
  ['Riva Bianca', 'Italian', 'Tribeca', '6 Hawthorn Row', 4, 'Coastal Italian cooking with shellfish, fresh pasta and fragrant citrus.'],
  ['Aster & Olive', 'Mediterranean', 'West Village', '17 Clover Alley', 3, 'Vegetable-led small plates, flatbreads and olive oil cake.'],
  ['Sora Counter', 'Japanese', 'Nolita', '29 Clover Alley', 4, 'An intimate sushi counter with a changing menu of fish and rice.'],
  ['Miette Moderne', 'French', 'SoHo', '20 Wren Street', 3, 'Modern brasserie classics and flaky pastries from an open kitchen.'],
  ['Milpa Verde', 'Mexican', 'Tribeca', '108 Lazuli Way', 3, 'Wood-grilled vegetables, fresh corn tortillas and seasonal aguas frescas.'],
  ['Dolsot Corner', 'Korean', 'Koreatown', '116 Rowan Place', 2, 'Sizzling stone pots, scallion pancakes and fragrant barley tea.'],
  ['Jade & Ginger', 'Chinese', 'SoHo', '42 Crane Row', 2, 'Ginger-scallion noodles, dumplings and wok-fired greens.'],
  ['Cinder Picnic', 'American', 'Nolita', '19 Blackbird Close', 2, 'Grilled chops and market sides on warm ceramic platters.'],
  ['Osteria Rame', 'Italian', 'East Village', '27 Mulberry Walk', 3, 'Rustic braises, ribbon pasta and toasted almond cakes.'],
  ['Amara Courtyard', 'Mediterranean', 'East Village', '54 Petrel Lane', 3, 'Charred aubergine, lamb and salads with a bright courtyard setting.'],
  ['Kumo Kitchen', 'Japanese', 'Koreatown', '16 Rowan Place', 2, 'Comforting noodle soups and small grilled dishes.'],
  ['La Petite Treille', 'French', 'Nolita', '44 Foxglove Court', 4, 'Thoughtful French cooking, from roast poultry to poached pears.'],
  ['Casa Jacaranda', 'Mexican', 'Chinatown', '90 Minna Court', 3, 'A relaxed dining room for adobo, tostadas and house guacamole.'],
  ['Pine & Perilla', 'Korean', 'West Village', '34 Holloway Lane', 3, 'Seasonal banchan and charcoal-cooked meats with heaps of fresh herbs.'],
  ['The Porcelain Cart', 'Chinese', 'Lower East Side', '21 Finch Lane', 2, 'Steamed dumplings, crisp tofu and small clay pots for the table.'],
]

const comments = [
  'The kitchen sent everything out at a lovely pace, and we shared plates all evening.',
  'A friendly welcome and a comfortable table. I would come back for the first course alone.',
  'Dinner felt unhurried. The seasonal special was the standout.',
  'Loved the warmth of the room and the care taken with our request.',
  'The menu was easy to share and our server had thoughtful suggestions.',
  'A lively room on a busy night. Save room for dessert.',
  'Our table was ready when we arrived and the service was genuinely warm.',
  'Everything we ordered had great texture and plenty of flavor.',
]

const fixed = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const instant = (date, time) => new Date(slotInstant(date, time, DEFAULT_ZONE)).toISOString()

export function createInitialData() {
  const today = localClock(DEFAULT_ZONE).date
  const account = { id: 'diner-001', firstName: 'Jamie', lastName: 'Morgan', email: 'jamie.morgan@example.test', city: 'New York', timeZone: DEFAULT_ZONE }
  const actorId = account.id
  const restaurants = venues.map(([name, cuisine, neighborhood, address, priceTier, description], index) => ({
    id: fixed('rest', index), name, cuisine, neighborhood, address, city: 'New York', timeZone: DEFAULT_ZONE,
    priceTier, description, image: '/images/' + cuisine.toLowerCase() + '.webp',
    slots: ['12:00', '12:45', '17:30', '18:00', '18:30', '19:00', '19:45', '20:30', '21:15'].map((time, slot) => ({
      time, maxPartySize: [6, 8, 8, 6, 6, 4, 10, 8, 2][slot],
      seating: slot === 8 ? 'Counter' : 'Dining room', potentialPoints: [0, 100, 500, 100, 100, 0, 100, index % 3 === 0 ? 1000 : 100, 0][slot],
    })),
  }))
  const reservations = Array.from({ length: 40 }, (_, index) => {
    const upcoming = index < 5
    const canceled = index >= 37
    const date = addDays(today, upcoming ? 2 + index * 3 : -(2 + (index - 5) * 2))
    const restaurant = restaurants[index % restaurants.length]
    const slot = restaurant.slots[4 + index % 4]
    const createdAt = instant(upcoming ? addDays(today, index - 6) : addDays(date, -8), '15:00')
    const canceledAt = canceled ? instant(addDays(date, -1), '10:00') : undefined
    return {
      id: fixed('res', index), restaurantId: restaurant.id, actorId,
      confirmationCode: 'OT-' + (0x6F3A9D + index * 17).toString(16).toUpperCase(),
      date, time: slot.time, partySize: index % 3 + 2, seating: slot.seating,
      occasion: ['Birthday', '', '', 'Anniversary', ''][index % 5],
      specialRequest: index % 8 === 0 ? 'A quieter table if available.' : '',
      status: upcoming ? 'confirmed' : canceled ? 'canceled' : 'completed',
      potentialPoints: upcoming ? slot.potentialPoints : 0, createdAt, updatedAt: canceledAt || createdAt,
      ...(canceledAt ? { canceledAt } : {}),
    }
  })
  const reservationEvents = reservations.flatMap((booking, index) => {
    const restaurant = restaurants[index % restaurants.length]
    const before = snapshot({ ...booking, status: 'confirmed', potentialPoints: restaurant.slots[4 + index % 4].potentialPoints })
    const event = { reservationId: booking.id, actorId }
    const booked = { ...event, id: fixed('evt', index), type: 'booked', before: null, after: before, createdAt: booking.createdAt }
    return booking.canceledAt ? [booked, { ...event, id: fixed('evt', index + 40), type: 'canceled', before, after: snapshot(booking), createdAt: booking.canceledAt }] : [booked]
  })
  const reviews = reservations.slice(13, 37).map((booking, index) => ({
    id: fixed('rev', index), reservationId: booking.id, restaurantId: booking.restaurantId, actorId,
    overall: index % 3 === 0 ? 4 : 5, food: 4 + index % 2, service: 5, ambience: 4, value: 4 + index % 2,
    comment: comments[index % comments.length], status: 'submitted', createdAt: instant(addDays(booking.date, 1), '10:00'),
  }))
  const rewardOptions = [
    { id: 'reward-dining-16', name: '$16 dining credit', pointsCost: 2000, amount: 16, currency: 'USD' },
    { id: 'reward-dining-40', name: '$40 dining credit', pointsCost: 5000, amount: 40, currency: 'USD' },
  ]
  const credit = { id: 'redeem-001', actorId, rewardOptionId: rewardOptions[0].id, pointsSpent: 2000, amount: 16, currency: 'USD', status: 'issued', createdAt: instant(addDays(today, -14), '10:00') }
  const pointTransactions = reservations.slice(5, 29).map((booking, index) => ({
    id: fixed('pts', index), actorId, type: 'earned', points: index === 23 ? 1000 : index >= 21 ? 500 : 100,
    reservationId: booking.id, status: 'posted', createdAt: instant(addDays(booking.date, 1), '09:00'),
  }))
  pointTransactions.push({ id: 'pts-025', actorId, type: 'redeemed', points: -credit.pointsSpent, redemptionId: credit.id, status: 'posted', createdAt: credit.createdAt })
  return { account, restaurants, reservations, reservationEvents, reviews, rewardOptions, pointTransactions, pointRedemptions: [credit] }
}
