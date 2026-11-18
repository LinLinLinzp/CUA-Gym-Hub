import { READ, READING, WANT, SYSTEM_SHELVES } from '../model.js'

const catalog = [
  ['The Glass Orchard', 'Nell Arden', 'A botanist returns to her hometown after an early frost reveals a locked greenhouse.'],
  ['A Tide of Small Mercies', 'Inez Calder', 'A harbor pilot finds a letter inside a bell that has been silent for thirty years.'],
  ['Where the Hills Keep Time', 'Emmett Vale', 'Two brothers inherit a mountain inn and disagree about the guest who has never checked out.'],
  ['The Northbound Stars', 'Sana Mire', 'An apprentice navigator searches for the missing star that guides her city through winter.'],
  ['The House of Painted Doors', 'Kira Sato', 'A muralist takes a commission in a boardinghouse where every door has a story.'],
  ['An Atlas of Quiet Rooms', 'Ruth Bellamy', 'A traveling archivist inventories the possessions of people who left their towns behind.'],
  ['Letters to the Hawthorn', 'Oona Fenwick', 'A gardener and a schoolteacher exchange notes in the hollow of an old tree.'],
  ['The Mapmaker at Low Water', 'Lewis Cove', 'A sound engineer returns to an island to record the last crossing of its passenger ferry.'],
  ['Blue Ridge Lanterns', 'Hazel Teague', 'Friends hiking an abandoned trail discover a caretaker still lighting the way.'],
  ['A Constellation of Porches', 'Mira Solano', 'In a town without streetlights, a teenager learns astronomy from her insomniac neighbors.'],
  ['The Last Orange Ticket', 'Jules Penn', 'A projectionist races to recover the only print of a film made by his grandmother.'],
  ['Windows for the Rain', 'Dara Ellison', 'A restorer of historic windows discovers a second set of family initials beneath the paint.'],
  ['The City of Borrowed Seeds', 'Tamsin Voss', 'A street market stall becomes a seed library after the municipal gardens shut down.'],
  ['Salt on the Ledger', 'Rowan Crewe', 'A young clerk investigates a suspiciously perfect set of accounts on a fishing boat.'],
  ['A Season of Switchbacks', 'Soren Pike', 'A survey crew plots a route to a village that wants to stay off the map.'],
  ['Midnight in the Planet Room', 'Adela Quinn', 'A museum guard discovers that the planetarium’s oldest recording changes every night.'],
  ['Paper Keys', 'Mina Halden', 'Two locksmiths compete to open a small safe whose owner has forbidden them to use metal.'],
  ['The Room Above the Bakery', 'Celia Wynn', 'A baker takes in a lodger who writes restaurant obituaries for a living.'],
  ['A Bench Under Apricot Trees', 'Niko Danner', 'A village carpenter takes on the repair of a bench that has outlived every house around it.'],
  ['Ferries of the Inland Sea', 'Lena Verran', 'A ferry captain and her aunt piece together the story of a decades-old storm.'],
  ['The Granite Letter', 'Perry Lorne', 'An apprentice stonecutter carves a message that was supposed to remain private.'],
  ['The Second Moon Almanac', 'Farah Tull', 'An almanac editor must decide whether to publish a year that has never happened.'],
  ['13 Ways to Fold a City', 'Hugo Aster', 'An architect collects the folding paper models that made him reconsider who streets are for.'],
  ['The Curtain Shop on Vale Street', 'June Marlow', 'Three sisters sort through their mother’s fabric samples and the lives she kept in them.'],
  ['Figs Before Winter', 'Teo Brin', 'A fruit seller tries to persuade a reluctant neighborhood to save a small orchard.'],
  ['The Hour of Clear Water', 'Etta Lynd', 'A swimmer crosses a lake each morning while rebuilding a friendship on the far shore.'],
  ['Footnotes from the Summit', 'Wren Malo', 'A mountain guide annotates a classic travel diary with accounts from the people it overlooked.'],
  ['Pockets Full of Satellites', 'Sasha Keene', 'A scavenger tracks the fragments of a satellite said to carry messages from the future.'],
  ['The Magenta Hotel', 'Rae Serrano', 'An illustrator spending a month in a roadside hotel starts drawing its regular guests.'],
  ['The Light in Flat Six', 'Isa Rook', 'An empty flat becomes the meeting place for an unlikely group of neighbors.'],
  ['Once More into the Garden', 'Ari Kestrel', 'A retired teacher converts a schoolyard into a garden with her least promising former pupil.'],
  ['Beyond the Breakwater', 'Drew Morrow', 'A rescue swimmer follows an abandoned boat back to the village where she grew up.'],
  ['June Above the Snowline', 'Clara Haldane', 'A weather observer faces an early thaw and an unexpected guest.'],
  ['A Night for Silver Comets', 'Sumi Calderon', 'An astronomer preparing for a reunion decides to invite the teacher who once doubted her.'],
  ['A Pocket Guide to Lost Trains', 'Eli Merritt', 'A railway porter follows a pocket timetable for a line that closed before he was born.'],
  ['The Unfinished Floor', 'Nadia Renn', 'A carpenter hired to restore a dance hall finds entries from its first season under the boards.'],
  ['Twelve Seeds in an Envelope', 'Pia Hollis', 'A postal worker delivers a packet of seeds to the only vacant lot on his route.'],
  ['Harbor Without a Name', 'Rey Fen', 'A diver cataloging shipwrecks near a headland finds markings from her own family.'],
  ['The Day the Valley Sang', 'Milo Bex', 'An acoustics researcher tries to explain why a valley echoes only on the first day of spring.'],
  ['Notes from an Empty Orbit', 'Vera Lyle', 'A maintenance engineer aboard a station keeps a journal for a colleague still in transit.'],
  ['The Copper Type Foundry', 'Aya Selwyn', 'A printer of wedding invitations inherits a typeface with a disputed history.'],
  ['Two Rooms Facing East', 'Mae Hsu', 'An exchange of apartment keys gives two strangers a view of each other’s quiet routines.'],
  ['The Blackthorn Index', 'Nessa Carrow', 'A park ranger discovers an old register of plants that flower out of season.'],
  ['The River Under Noon', 'Jonah Wardell', 'A bridge inspector volunteers to swim the last stretch of a river before its channel is moved.'],
  ['The Winter Hut Guestbook', 'Alix Verne', 'Hikers stranded at a snowed-in hut find different versions of a local legend.'],
  ['Constellations for Beginners', 'Noor Savin', 'A night-shift librarian writes a practical guide to the sky for readers who have never seen the Milky Way.'],
  ['The Brass Postcard', 'Remy Dask', 'A metalsmith receives a postcard cast from a forgotten mold she recognizes.'],
  ['The Green Apartment', 'Ivy Caul', 'A new tenant sets about tracing the history of an apartment painted one color from floor to ceiling.'],
  ['Fieldwork at Dusk', 'Finley Moss', 'A student helping to survey an old farm learns that its boundaries are still disputed.'],
  ['A Channel for Small Boats', 'Sylvie March', 'Two sisters take a homemade boat through the tidal canal that divides their town.'],
  ['Stone Steps to Ravel', 'Callum Reeve', 'A runner follows a path of hand-laid stairs and makes an unlikely training partner.'],
  ['The Sky Beyond Sunday', 'Yuna Fenner', 'A piano tuner takes up amateur radio and finds a voice she remembers from childhood.'],
  ['The Clockwork Bookshop', 'Ivo Crane', 'A repair technician finds an unclaimed watch inside a secondhand atlas.'],
  ['In the House of Dusk', 'Anya Venn', 'A young translator takes a winter residency at the estate of a poet her family once knew.'],
  ['The Juniper Letters', 'Arlo Wen', 'An orchard manager uncovers a run of letters in a long-abandoned irrigation shed.'],
  ['Strait of Still Water', 'Rina Brack', 'A ferry dispatcher must account for a sailing that vanished from the harbor log.'],
  ['The Hills After Rain', 'Cora Thorne', 'A landscape photographer retraces the walks her father marked on a folded map.'],
  ['Sundials in the Snow', 'Jasper Moon', 'A watchmaker keeps an unusual appointment at an observatory closed for winter.'],
  ['The Spare Set of Keys', 'Nia Hartwell', 'A building superintendent has one week to work out which tenant owns an unmarked key.'],
  ['An Inn with Six Windows', 'Esther Harker', 'An innkeeper discovers that the letters tucked beneath her guestbook belong to a former cook.'],
  ['The Alder Book', 'Kavi Flint', 'A field botanist reconstructs the life of an unknown illustrator through her drawings.'],
  ['Every Island Has a Shore', 'Lila Grantham', 'An oceanographer spends a season counting tides with someone who once taught her to swim.'],
  ['The Ridge Between Us', 'Amos Tern', 'A geologist and his sister revisit the ridge where they first learned to read a map.'],
  ['All the Little Orbits', 'Demi Walsh', 'Small town friends build an observatory in an old grain silo and choose who gets the first look.'],
  ['The Unclaimed Blueprint', 'Otto Sayer', 'A building conservator finds an unsigned blueprint with an entire extra floor.'],
  ['Windows Facing the Orchard', 'Mei Archer', 'A carpenter restores her aunt’s farmhouse as the orchard is divided into new plots.'],
  ['Gathering Nightshade', 'Sal Dorn', 'A forager sets out to solve the disappearance of a plant recorded only in family notebooks.'],
  ['The Saltglass Season', 'Tala West', 'A glassblower on the coast begins gathering sand at the site of a drowned village.'],
  ['The Long Way to Granite Pass', 'Bram Niven', 'A mail carrier keeps his winter route open after a landslide cuts off the main road.'],
  ['Night Signal at Kestrel Point', 'Ada Havel', 'A lighthouse volunteer logs a signal that appears precisely when the station turns dark.'],
  ['Ink for Tomorrow', 'Marta Sen', 'A newspaper editor tries to put out a final issue during a citywide power outage.'],
  ['A Window Open in Winter', 'Eva Sorrell', 'A young archivist returns a box of photographs to an address she has never visited.'],
]

const styles = ['orchard', 'tide', 'hills', 'stars', 'blocks', 'window']
const genres = [
  ['Literary Fiction', 'Nature'], ['Mystery', 'Coastal Fiction'], ['Adventure', 'Contemporary Fiction'],
  ['Speculative Fiction', 'Science Fiction'], ['Historical Fiction', 'Mystery'], ['Contemporary Fiction', 'Literary Fiction'],
]
const readers = [
  'Avery Ng', 'Leona Hart', 'Cameron Ellis', 'Priya Das', 'Mateo Arcos', 'Hazel Kim',
  'Nia Sharpe', 'Ellis Boone', 'Ishan Sethi', 'Luca Park', 'Daphne Shaw', 'Naomi Reyes',
  'Sam Okafor', 'Cora Lin', 'Mae Sutton', 'Jamie Farrow', 'Asha Rao', 'Max Varela',
  'Leo Bennett', 'Nora Santos', 'Drew Lam', 'Robin Yu', 'Tess Adler', 'Imani Reed',
]
const shelfNames = [
  ['coastal', 'Coastal Fiction'], ['paperbacks', 'Paperbacks'], ['weekend', 'Weekend Reads'],
  ['book-club', 'Book Club'], ['atmospheric', 'Atmospheric'], ['favorite-endings', 'Favorite Endings'],
  ['local-library', 'Local Library'], ['comfort', 'Comfort Reads'], ['under-300', 'Under 300 Pages'],
  ['beautiful-covers', 'Beautiful Covers'], ['field-notes', 'Field Notes'], ['road-trips', 'Road Trips'],
  ['borrowed', 'Borrowed'], ['winter', 'Winter Reading'], ['gift-ideas', 'Gift Ideas'], ['revisit', 'To Revisit'],
  ['north-country', 'North Country'], ['island-stories', 'Island Stories'], ['after-dark', 'After Dark'],
  ['quiet-mysteries', 'Quiet Mysteries'], ['translated', 'In Translation'], ['long-weekends', 'Long Weekends'],
  ['read-aloud', 'Read Aloud'], ['summer-picks', 'Summer Picks'],
]
const reviewBodies = [
  'Quietly suspenseful, with an ending that rewards a second look.',
  'The setting stayed with me for days. I could almost hear the weather change between chapters.',
  'Small moments between the characters carried more weight than the main mystery.',
  'I loved the opening chapters, especially the attention paid to the routines of a place.',
  'The final turn was gentle and earned. I went back to the opening after finishing.',
  'I read this in short sections and kept looking forward to the next one.',
  'The details of the work felt well observed, and the conversations never sounded rehearsed.',
  'There is a patience to the writing that I appreciated more each time I picked it up.',
  'I’m still thinking about the relationship at the center of this story.',
  'The pacing took a while to settle, but I enjoyed the second half.',
  'I had hoped for more time with the supporting characters. The setting made up for it.',
  'The book found a lovely way to make the ordinary feel worth paying attention to.',
]

const userId = 'user-mara'
const baseTime = '2025-01-07T13:00:00.000Z'
const numbered = (prefix, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`
const bookId = index => numbered('book', index)

export function createInitialData() {
  const books = catalog.map(([title, author, synopsis], index) => ({
    id: bookId(index), title, author, synopsis, genres: [...genres[index % styles.length]],
    publicationYear: 2014 + (index * 5 % 12), pageCount: index === 0 ? 304 : 208 + (index * 29 % 248),
    coverStyle: styles[index % styles.length],
  }))
  const users = [{ id: userId, displayName: 'Mara Chen' }, ...readers.map((displayName, index) => ({ id: numbered('user', index), displayName }))]
  const shelves = [
    ...SYSTEM_SHELVES.map(shelf => ({ ...shelf, kind: 'system' })),
    ...shelfNames.map(([slug, name]) => ({ id: `shelf-${slug}`, name, kind: 'custom' })),
  ].map(shelf => ({ ...shelf, userId, createdAt: baseTime, updatedAt: baseTime }))
  const shelfEntries = books.slice(0, 48).map((book, index) => {
    const addedAt = `2025-${String(1 + Math.floor(index / 12)).padStart(2, '0')}-${String(7 + index % 12).padStart(2, '0')}T13:00:00.000Z`
    return {
      id: numbered('entry', index), userId, bookId: book.id,
      statusShelfId: index < 25 ? READ : index < 31 ? READING : WANT,
      customShelfIds: [shelves[3 + index % 23].id, ...(index % 3 === 0 ? [shelves[3 + (index + 4) % 23].id] : [])],
      createdAt: addedAt, updatedAt: addedAt,
    }
  })
  const reviews = Array.from({ length: 44 }, (_, index) => ({
    id: numbered('review', index),
    userId: index < 16 ? userId : users[1 + (index - 16) % readers.length].id,
    bookId: bookId(index < 16 ? index : (index - 16) * 5 % books.length),
    rating: index % 9 === 8 ? null : [4, 5, 4, 3, 5][index % 5],
    body: index % 8 === 3 ? '' : reviewBodies[index % reviewBodies.length],
    containsSpoilers: index % 6 === 4,
    createdAt: baseTime, updatedAt: baseTime,
  }))
  const annual = [
    { year: 2023, goalBooks: 8, count: 7, firstBook: 0 },
    { year: 2024, goalBooks: 9, count: 9, firstBook: 6 },
    { year: 2025, goalBooks: 8, count: 10, firstBook: 14 },
    { year: 2026, goalBooks: 20, count: 12, firstBook: 0 },
  ]
  const readingLogs = annual.flatMap(({ year, count, firstBook }) => Array.from({ length: count }, (_, index) => {
    const finishedOn = `${year}-${String(1 + Math.floor(index / 2)).padStart(2, '0')}-${index % 2 === 0 ? '08' : '21'}`
    const time = `${finishedOn}T19:26:00.000Z`
    return { userId, bookId: bookId(firstBook + index), finishedOn, createdAt: time, updatedAt: time }
  })).map((record, index) => ({ ...record, id: numbered('finish', index) }))
  const challenges = annual.map(({ year, goalBooks }) => {
    const time = `${year}-01-01T13:00:00.000Z`
    return { id: `goal-mara-${year}`, userId, year, goalBooks, createdAt: time, updatedAt: time }
  })
  return { account: { userId }, users, books, shelves, shelfEntries, reviews, readingLogs, challenges }
}
