import { addDays, CHANNEL_ZONE, wallTime, weekdayOf, zonedParts } from '../utils/calendar.js'

const fixed = '2026-11-16T22:05:00.000Z'
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const catalog = [
  ['art', 'Art', 'printmaking'], ['makers', 'Makers & Crafting', 'book-arts'],
  ['photo', 'Photography', 'photography'], ['music', 'Music', 'ceramics'],
  ['talk', 'Talk Shows & Podcasts', 'book-arts'], ['chat', 'Just Chatting', 'photography'],
  ['pottery', 'Ceramics', 'ceramics'], ['books', 'Book Arts', 'book-arts'],
  ['print', 'Printmaking', 'printmaking'], ['drawing', 'Drawing', 'printmaking'],
  ['paint', 'Painting', 'ceramics'], ['textiles', 'Fiber Arts', 'book-arts'],
  ['design', 'Design', 'printmaking'], ['film', 'Film & Video', 'photography'],
  ['travel', 'Travel & Outdoors', 'photography'], ['food', 'Food & Drink', 'ceramics'],
  ['history', 'History', 'book-arts'], ['science', 'Science & Technology', 'photography'],
  ['wood', 'Woodworking', 'ceramics'], ['writing', 'Creative Writing', 'book-arts'],
  ['illustration', 'Illustration', 'printmaking'], ['sculpture', 'Sculpture', 'ceramics'],
  ['garden', 'Gardening', 'printmaking'], ['archive', 'Archives', 'photography'],
]

const recordings = [
  ['Proofing the second color', 'art'], ['Contact sheets from the coast', 'photo'],
  ['Mixing an iron glaze', 'pottery'], ['A field guide to endpapers', 'books'],
  ['Sunday studio notes', 'chat'], ['Drawing from a borrowed postcard', 'drawing'],
  ['The small edition', 'print'], ['Window light with a single reflector', 'photo'],
  ['Trimming cups on the wheel', 'pottery'], ['Repairing a loose hinge', 'makers'],
  ['Bookbinding after hours', 'makers'], ['Recording the sound of paper', 'music'],
  ['A morning with the neighborhood archive', 'archive'], ['An interview with the typesetter', 'talk'],
  ['Packing prints for the fair', 'print'], ['Pinch pots and tea', 'pottery'],
  ['Watercolor on toned paper', 'paint'], ['Darning a studio apron', 'textiles'],
  ['Designing a two-ink poster', 'design'], ['A tiny studio tour', 'film'],
  ['Field notes from the tidal flats', 'travel'], ['Lunch from the market', 'food'],
  ['Mapping an old rail yard', 'history'], ['How film grain works', 'science'],
  ['Sharpening a bench chisel', 'wood'], ['Notes for a short essay', 'writing'],
  ['Quick contour portraits', 'illustration'], ['A clay maquette in ten minutes', 'sculpture'],
  ['Drawing seeds from the garden', 'garden'], ['Scanning a family negative', 'archive'],
  ['Pulling a clean block print', 'print'], ['Glazing the kiln tests', 'pottery'],
  ['A pocket notebook from scrap paper', 'books'], ['Matting a darkroom print', 'photo'],
  ['Sketching the studio corner', 'drawing'], ['Binding a catalog with linen thread', 'books'],
]
const viewerLogins = [
  'paperatlas', 'mossyline', 'coastalcamera', 'rivetandreed', 'linenfold', 'glazebird',
  'smallpresslane', 'rooflight', 'clayandthread', 'fieldlens', 'platemargins', 'chalkletter',
  'softgrain', 'porchproofs', 'bluegouge', 'copperhaze', 'quietstitch', 'paperbay',
  'brushandbirch', 'stilllight', 'juniperink', 'moonglaze', 'spineandpage', 'grainpocket',
  'studiothimble', 'sandandstone', 'archivefern', 'draftgarden', 'framewalk', 'wovenedge',
  'carbonpath', 'weekdaypress',
]
const viewerNames = [
  'Paper Atlas', 'Mossy Line', 'Coastal Camera', 'Rivet and Reed', 'Linen Fold', 'Glaze Bird',
  'Small Press Lane', 'Rooflight', 'Clay and Thread', 'Field Lens', 'Plate Margins', 'Chalk Letter',
  'Soft Grain', 'Porch Proofs', 'Blue Gouge', 'Copper Haze', 'Quiet Stitch', 'Paper Bay',
  'Brush and Birch', 'Still Light', 'Juniper Ink', 'Moon Glaze', 'Spine and Page', 'Grain Pocket',
  'Studio Thimble', 'Sand and Stone', 'Archive Fern', 'Draft Garden', 'Frame Walk', 'Woven Edge',
  'Carbon Path', 'Weekday Press',
]
const prompts = [
  'What paper weight are you using for that edition?', 'The registration on that second layer looks great.',
  'Do you mix the glaze by weight?', 'I brought my sketchbook to follow along.',
  'The raking light makes the texture easy to see.', 'Could you show the fold one more time?',
  'I tried that ink last weekend and loved it.', 'Thanks for sharing the test print.',
  'Is that a fresh blade or a resharpened one?', 'That color reminds me of a trail near home.',
  'Hello from the book arts table!', 'How long do you let that dry?',
  'The contact sheet is my favorite part.', 'I’m saving this method for my next edition.',
  'Will the notebook fit in a coat pocket?', 'The studio sounds lovely this evening.',
]
const programs = [
  ['Friday print lab', 'art'], ['Darkroom desk', 'photo'], ['Wheel room', 'pottery'],
  ['The small press hour', 'books'], ['Open sketchbook', 'drawing'], ['Textile repair club', 'textiles'],
  ['Museum sketchbook swap', 'drawing'], ['Two-color proofs', 'print'], ['Meet the neighborhood binder', 'talk'],
  ['Studio visit: north windows', 'photo'], ['Paper marbling at the sink', 'books'],
  ['Tea bowls in three shapes', 'pottery'], ['A photo walk at dusk', 'travel'], ['Sorting the print archive', 'archive'],
  ['Wood type and soft ink', 'art'], ['Draw your favorite tool', 'illustration'], ['A shelf for drying cups', 'wood'],
  ['Market color studies', 'paint'], ['Small batch zines', 'books'], ['Mending basket', 'textiles'],
  ['Night at the print bench', 'art'], ['Editing a one-minute studio film', 'film'], ['Glaze test tiles', 'pottery'],
  ['Making a camera strap', 'makers'], ['Letters from the coast', 'writing'], ['Plant silhouettes', 'garden'],
  ['A tintype conversation', 'photo'], ['Hand lettering a fair sign', 'design'], ['Pop-up reading room', 'books'],
  ['Yearbook of studio experiments', 'chat'],
]

export function createInitialData() {
  const now = new Date()
  const today = zonedParts(now, CHANNEL_ZONE).date
  const moderators = [
    { id: 'moderator-001', login: 'inkandivy', displayName: 'Ivy Rowan' },
    { id: 'moderator-002', login: 'pressmoth', displayName: 'Owen Bell' },
  ]
  const categories = catalog.map(([key, name, artworkKey]) => ({ id: 'cat-' + key, name, artworkKey }))
  const videos = recordings.map(([title, key], index) => {
    const createdAt = new Date(Date.parse('2026-11-18T02:00:00Z') - index * 43200000).toISOString()
    const publishedAt = index % 3 === 1 && index !== 10 ? null : new Date(Date.parse(createdAt) + 480000).toISOString()
    return { id: id('video', index), title, categoryId: 'cat-' + key, language: 'en',
      description: 'From the Fieldnote Live studio journal: ' + title + '. Includes audience questions and process notes.',
      type: index < 24 ? 'past_broadcast' : index < 32 ? 'highlight' : 'upload',
      status: publishedAt ? 'published' : 'unpublished', durationSeconds: index < 24 ? 4235 + (index - 10) * 87 : 440 + index * 23,
      viewCount: 84 + index * 30 % 822, createdAt, updatedAt: publishedAt || createdAt, publishedAt }
  })
  const viewers = viewerLogins.map((login, index) => ({
    id: id('viewer', index), login, displayName: viewerNames[index],
    joinedAt: new Date(Date.parse('2025-09-26T12:00:00Z') + index * 86400000).toISOString(), restriction: null,
  }))
  const chatMessages = Array.from({ length: 48 }, (_, index) => ({
    id: id('msg', index), viewerId: id('viewer', index % 32), text: prompts[(index + Math.floor(index / 16) * 5) % prompts.length],
    createdAt: new Date(Date.parse('2026-11-16T23:12:00Z') + (index - 11) * 60000).toISOString(), status: 'visible',
  }))
  const modActions = []
  function record(viewerIndex, action, createdAt, options = {}) {
    const viewer = viewers[viewerIndex]
    const actorId = moderators[modActions.length % 2].id
    const { message, durationSeconds, reason = '' } = options
    const prior = viewer.restriction
    const expiresAt = durationSeconds ? new Date(Date.parse(createdAt) + durationSeconds * 1000).toISOString() : null
    const resultingStatus = { timeout: 'timed_out', ban: 'banned', delete_message: 'deleted' }[action] || 'clear'
    const event = { id: id('mod-action', modActions.length), action, actorId, viewerId: viewer.id, reason, resultingStatus, createdAt }
    if (durationSeconds) Object.assign(event, { durationSeconds, expiresAt })
    if (prior && (action === 'ban' || action === 'unban' || action === 'untimeout')) event.relatedActionId = prior.actionId
    if (message) {
      event.messageId = message.id
      Object.assign(message, { status: 'deleted', deletedAt: createdAt, deletedBy: actorId })
    } else {
      viewer.restriction = ['ban', 'timeout'].includes(action) ? { type: action, reason, startedAt: createdAt, expiresAt, actionId: event.id } : null
      viewer.updatedAt = createdAt
    }
    modActions.push(event)
  }
  for (let index = 0; index < 10; index++) {
    const action = index % 2 ? 'ban' : 'timeout'
    record(index + 18, action, new Date(Date.parse('2026-11-17T04:00:00Z') + index * 180000).toISOString(),
      { reason: index % 2 ? 'Repeated spam' : 'Repeated off-topic links', durationSeconds: index % 2 ? undefined : 600 })
    record(index + 18, index % 2 ? 'unban' : 'untimeout', new Date(Date.parse('2026-11-17T04:01:00Z') + index * 180000).toISOString(),
      { reason: 'Reviewed by a moderator' })
  }
  for (const index of [3, 17, 28, 45]) record(index % 32, 'delete_message', '2026-11-17T20:00:00.000Z', { message: chatMessages[index] })
  for (const index of [8, 15]) record(index, 'ban', '2026-11-17T20:40:00.000Z', { reason: 'Repeated spam' })
  for (const [index, minutes] of [[5, -30], [14, -25], [6, -2], [10, -3]]) {
    record(index, 'timeout', new Date(+now + minutes * 60000).toISOString(), { durationSeconds: 600, reason: 'Repeated off-topic links' })
  }
  const weeklyDays = [5, 3, 6, 2, 7, 4]
  const offsets = [1, 2, 3, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 24, 28, 31, -1, -3, -5, -7, -9, -12, -16, -20]
  const scheduleEntries = programs.map(([title, key], index) => {
    const weekday = weeklyDays[index] || null
    const date = addDays(today, weekday ? -14 + (weekday - weekdayOf(today) + 7) % 7 : offsets[index - 6])
    return { id: id('slot', index), title, categoryId: 'cat-' + key,
      startsAt: wallTime(date, index % 3 === 0 ? '18:30' : index % 3 === 1 ? '19:00' : '16:00', CHANNEL_ZONE),
      timezone: CHANNEL_ZONE, durationMinutes: [90, 60, 120, 45][index % 4],
      recurrence: weekday ? 'weekly' : 'once', weekday, status: [11, 23].includes(index) ? 'cancelled' : 'scheduled',
      createdAt: fixed, updatedAt: fixed }
  })
  const scheduleExceptions = scheduleEntries.slice(0, 3).map((entry, index) => {
    const occurrenceDate = addDays(today, (entry.weekday - weekdayOf(today) + 7) % 7 + index * 7)
    return { id: entry.id + ':' + occurrenceDate, entryId: entry.id, occurrenceDate,
      status: index === 2 ? 'restored' : 'cancelled', createdAt: fixed, updatedAt: fixed }
  })
  return {
    account: { id: 'creator-001', login: 'fieldnotelive', displayName: 'Rhea Mercer', channelName: 'Fieldnote Live', tier: 'affiliate' },
    moderators, categories, videos, viewers, chatMessages, modActions, scheduleEntries, scheduleExceptions,
    streamSettings: { id: 'stream-001', title: 'Late Studio: carving a two-color linocut',
      goLiveNotification: 'The print bench is open.', categoryId: 'cat-art', language: 'en',
      tags: ['Printmaking', 'StudioSession'], classificationLabels: [], storePastBroadcasts: true,
      alwaysPublishVods: false, excludedCategoryIds: ['cat-music'], updatedAt: fixed },
    scheduleSettings: { id: 'schedule-001', timezone: CHANNEL_ZONE, vacationEnabled: false,
      vacationStartDate: null, vacationEndDate: null, updatedAt: fixed },
    stateChanges: [],
  }
}

