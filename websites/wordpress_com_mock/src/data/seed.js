import { slugify } from './records.js'
import { mediaFixtures } from './seed-media.js'

const actor = 'user-maya'
const users = [
  ['maya', 'Maya Chen', 'mayachen', 'administrator'],
  ['imani', 'Imani Brooks', 'imanibrooks', 'editor'],
  ['nora', 'Nora Alvarez', 'noraalvarez', 'editor'],
  ['elliot', 'Elliot Reed', 'elliotreed', 'author'],
]
const categories = [
  ['uncategorized', 'Uncategorized'], ['arts', 'Arts & Culture'], ['books', 'Books'],
  ['history', 'Local History'], ['place', 'Place'], ['events', 'Events'],
]
const tagNames = ['printmaking', 'waterfront', 'bookshops', 'poetry', 'oral history', 'architecture', 'public art', 'neighborhoods', 'walking', 'archives', 'museums', 'markets', 'performance', 'accessibility']

const stories = [
  ['Inside the Lantern District Print Fair', 'Proofs from the press', 'The first proofs at Pier Hall came off the press before the doors opened. Three coastal print collectives shared ink, paper, and the long worktables down the center aisle.', 1, [0, 6, 11]],
  ['The Last Independent Map Shop', 'A city in layers', 'Behind the counter on Bay Street, Cora Hughes keeps a drawer of survey maps organized by shoreline. The oldest of them marks a pier that disappeared before the shop opened in 1974.', 2, [2, 5, 9]],
  ['Five Winter Readings by the Waterfront', 'In the reading room', 'This winter the lighted windows of the Harbor Library will stay open on Thursdays. The series brings together five readers whose work traces everyday life along the coast.', 5, [1, 3, 12]],
  ['The First Ferry of the Day', 'Before the shops open', 'At six in the morning there are just enough passengers to fill the lower deck. Tobin, who has worked the first crossing for eleven years, still calls the skyline the best part of the route.', 4, [1, 7, 8]],
  ['A Kiln Shared by Seven Neighborhoods', 'Unloading day', 'The Clay Rooms open their shared kiln every other Saturday. First-time potters arrive with pieces wrapped in old tea towels and leave space on the shelf for the next batch.', 1, [6, 7, 13]],
  ['The Gallery With an Open Door', 'The late session', 'The Bay Street Gallery has started keeping its doors open until eight on Wednesdays. Its newest exhibition pairs tide charts from the municipal archive with paintings made on the quay.', 1, [1, 6, 10]],
  ['What Grows at the Saturday Market', 'From the growers', 'The flower stall has been in the same spot since the market moved inland. This month the growers are bringing paperwhite bulbs, winter cabbage, and eucalyptus cuttings for the holidays.', 4, [7, 11]],
  ['Inside the Old Pump House', 'An industrial landmark', 'The brick pump house has a second life as a small museum. Volunteers are working through boxes of shift records and have installed the first set of labels beside the machinery.', 3, [4, 5, 10]],
  ['One Shelf at the Harbor Library', 'The lending collection', 'Elliot spent a morning with the librarians who keep the local writing shelf. Several of its titles were printed in editions of under fifty and never reached a bookshop.', 2, [2, 3, 9]],
  ['Music Under the Bandstand', 'Songs after sundown', 'The trees blocked the wind for most of the early set. Musicians carried their instruments down from the green room and played a second set after the electric lights came on.', 5, [1, 7, 12]],
  ['Listening Back to Mill Street', 'Original recordings', 'Four former mill workers recorded their recollections of the bell that began each shift. The tape includes the sounds of their new neighborhood gathering around the kitchen table.', 3, [4, 7, 9]],
  ['Walking the Salt Marsh in November', 'The east trail', 'Begin at the gate beside the old rail bridge and follow the high path. When the tide is out, herons stand along the shallowest channels beneath the last bend in the trail.', 4, [1, 8, 13]],
  ['Letterpress Lessons After Closing', 'Type by hand', 'On Tuesday evenings the Bridge Street bindery clears a table for visitors to set two lines of type. There is room for six people and no previous printing experience is required.', 1, [0, 2, 13]],
  ['How the Reading Room Was Saved', 'A neighborhood petition', 'The planning archive still holds a petition signed by 416 people. Some of the signatures include a brief explanation of who the reading room belonged to and what they used it for.', 3, [2, 4, 9]],
  ['The Mural Behind the Fish Market', 'The paint is drying', 'Painter Sarai Nwosu drew the outlines on the wall using chalk and a carpenter’s line. Fishmongers supplied a ladder and asked for two local boats to be included in the design.', 1, [6, 7, 11]],
  ['A Field Guide to the Waterfront Stairs', 'From quay to hill', 'Eleven public stairways climb from the waterfront to the town center. We walked each one after a week of rain to see where the handrails begin and which landings hold water.', 4, [1, 5, 8]],
  ['Letters From the Old Quay', 'From the archive', 'The municipal archivist has put three original letters on display. The shortest is a note asking the harbor master to keep a light on for a fishing boat coming back after midnight.', 3, [1, 4, 9]],
  ['A Reading List for the Rainy Season', 'The books on our desks', 'We asked four booksellers what they reach for when the weather keeps everyone indoors. Their recommendations include a slim translation and a pocket guide to the city’s trees.', 2, [2, 3]],
  ['The Lighthouse Keeper’s Garden', 'What remains', 'Even after the lamp was automated, neighbors kept tending the long beds beside the keeper’s cottage. Next spring a local school hopes to count the varieties of daffodil still growing there.', 3, [1, 4, 8]],
  ['A Morning With the Pier Repair Crew', 'On the workboat', 'The crew starts with a slow pass under the pier to see what the latest swell has shifted. The carpenters are marking the old timbers that can be patched in place.', 4, [1, 5]],
  ['Paper Things Worth Keeping', 'From the catalogue', 'An exhibition of local ephemera puts handbills and ferry tickets into the gallery cases. The curators have left room in the last case for material sent in by readers.', 1, [0, 6, 9]],
  ['Planning the Spring Book Exchange', 'How the tables work', 'Organizers will begin sorting the first donation boxes in February. The children’s table will be closest to the doors and staff will reserve a quieter corner for browsing.', 5, [2, 11, 13]],
  ['After the Last Market Bell', 'Closing the stall', 'At four in the afternoon the stallholders share out everything that will not keep overnight. It takes about half an hour to fold the canopies and reopen the street.', 4, [7, 11]],
  ['A Short Walk Through the Shipyard', 'A working shoreline', 'The route passes two active slips and the building where apprentices now learn tool maintenance. A painted line marks the portion of the lane that stays open to the public.', 4, [1, 5, 8]],
  ['Listening Sessions at North Hall', 'The next conversation', 'The community archive is setting aside time for residents to listen back to their own recordings. Headsets and edited transcripts will be available in the side room.', 5, [4, 9, 13]],
  ['The Story Behind the Ferry Posters', 'Ink and timetables', 'The ferry office saved the posters used to announce changes to the route. The collection shows how a photograph of the terminal became smaller every time a new timetable was added.', 1, [0, 1, 9]],
  ['Poems for the Long Crossing', 'A pocket anthology', 'The anthology traces the commute across the harbor in six short poems. The last invites passengers to read aloud while the deck crew lowers the ramp.', 2, [1, 3, 12]],
  ['A Museum Built From Borrowed Cabinets', 'The first displays', 'The society started with three glass cabinets borrowed from the library. Decades later, volunteers still use the original inventory cards when objects arrive from neighborhood donors.', 3, [4, 9, 10]],
  ['Winter Light at the East Pier', 'Midafternoon', 'From the shelter on the east pier it is possible to see the sun under the clouds for just a few minutes. We are gathering reader photographs taken from that spot.', 4, [1, 7, 8]],
  ['A Night at the Community Print Studio', 'The final pull', 'The workshop is extending its late print sessions through December. Holiday cards are popular, but the instructors are making time for larger experiments with folded paper.', 1, [0, 7, 13]],
  ['December Guide to Gallery Openings', 'Across the district', 'The first weekend brings four openings within walking distance of the terminal. We have gathered hours, exhibition titles, and access details in one itinerary.', 5, [6, 10, 13]],
  ['The Quiet Hour at Harbor Library', 'Before the main event', 'The library is trying a low-sensory opening before its largest winter event. Staff will dim the overhead lights and set the reading room aside for visitors who need a break.', 5, [2, 12, 13]],
  ['Tracks Along the Flood Wall', 'Rail lines beneath the path', 'Two strips of iron are still visible where the path crosses the freight entrance. An engineer drew our attention to the shallow curve that once took trains around a warehouse.', 3, [5, 8, 9]],
  ['Notes for an Editorial Roundtable', 'Topics for discussion', 'The next meeting will begin with the letters that came in after the street naming feature. We are collecting questions about reporting on buildings that are still in use.', 0, [5, 7]],
  ['Market Pavilion Interview Notes', 'Background', 'The planning group asked for a separate tour of the service entrances. Three stallholders have offered to explain how they use the side doors when the pavement freezes.', 0, [4, 11]],
  ['Early Draft of the Winter Events Notice', 'Original venues', 'The first draft lists events by neighborhood. Several dates changed after the venues coordinated their holiday opening hours.', 5, [7, 12]],
]
const pageEntries = [
  ['Home', null, 0, 'Start here for the latest writing from Harbor & Field Journal, an independent publication about life on the coast.'],
  ['About', null, 1, 'We produce stories about art, local history, books, and the public spaces around the harbor.'],
  ['Visit', null, 2, 'Plan a trip to the waterfront and find practical information for exploring the places in our stories.'],
  ['Calendar', null, 3, 'Find readings, exhibitions, public walks, and workshops around the harbor.'],
  ['Archive', null, 4, 'Browse articles and recordings by season. Our earliest newsletters are included in the print collections.'],
  ['Community Guidelines', null, 5, 'Share a relevant experience or question. Keep criticism specific, and give other readers the same room to speak.'],
  ['Visitor Information', 3, 1, 'Visitor information desks open first at the ferry terminal and at the Harbor Library.'],
  ['Getting Here', 3, 2, 'For the north shore, take the ferry to Pier 4 or the 16 bus to Market Street.'],
  ['Access and Inclusion', 3, 3, 'This guide collects step-free routes, accessible toilets, and quieter visiting times.'],
  ['Our Team', 2, 1, 'Meet the editors, writers, and contributors who publish the journal.'],
  ['Editorial Policy', 2, 2, 'We fact-check dates, names, and locations before publication and publish corrections on the relevant story.'],
  ['Ferry Terminal Hours', 7, 1, 'Check opening hours for the terminal and its indoor waiting room before your first crossing.'],
  ['Walking Guides', 5, 2, 'Download the routes used in our public walking stories and explore them at your own pace.'],
  ['Oral History Collection', 5, 3, 'Listen to recorded memories of Mill Street, the dock workshops, and the Saturday market.'],
  ['Contact', null, 6, 'Send letters, corrections, and local story tips to the editorial desk.'],
  ['Corrections', 2, 3, 'Our corrections record explains substantial changes to published stories.'],
  ['Host a Reading', 4, 1, 'Libraries and independent booksellers can register their interest in hosting a reading next season.'],
  ['Volunteer at the Archive', 5, 4, 'Volunteers can help with transcripts, scanning, or public visits to the reading room.'],
  ['Local History Resources', 5, 5, 'Use this list to find public collections, maps, and neighborhood research groups.'],
  ['Contributor Handbook', 2, 4, 'Our handbook explains pitches, source notes, image permissions, and editorial deadlines.'],
  ['Waterfront Venue Index', 3, 4, 'The index brings public venue addresses and opening hours together in one place.'],
  ['Teachers’ Resources', null, 7, 'Classroom visits and printable activities introduce students to printmaking and local history.'],
  ['Spring Walk Registration', 4, 5, 'Registration for the spring marsh and ferry walks will open in early February.'],
  ['Photography Submissions', 2, 5, 'Photographers can share a small selection of recent work featuring regional arts or public spaces.'],
  ['December Reading Schedule', 4, 2, 'Times and venue details for the journal’s December reading sessions.'],
  ['Editorial Contacts', 2, 6, 'Contact details and handover notes for the current editorial team.'],
  ['Previous Visitor Notice', null, 8, 'Original visitor arrangements for the summer renovation period.'],
  ['Old Market Route', null, 9, 'Directions for the market’s former site before stalls moved back to the square.'],
]

const localReaders = [
  ['Ruth Ellis', 'ruth.ellis@example.net'], ['Samir Patel', 'samir.patel@example.net'], ['Lena Morris', 'lena.morris@example.net'],
  ['Jules Park', 'jules.park@example.net'], ['Theo Graham', 'theo.graham@example.net'], ['Clara Rossi', 'clara.rossi@example.net'],
  ['Ada Boateng', 'ada.boateng@example.net'], ['Devin Young', 'devin.young@example.net'], ['Joanne Price', 'joanne.price@example.net'],
]
const readerNotes = [
  [
    'Will there be a quiet hour on Sunday?', 'The noticeboard at Pier Hall says there is a quiet session from 10 to 11.', 'Thanks for checking. We have added that hour to the program.', 'Is there a table for people who are trying printing for the first time?', 'I have a box of offcuts that the workshop can use.', 'The volunteers at the door helped us find a place to leave the stroller.',
  ], [
    'The shop once kept a map from the old dredger in its front window.', 'Was that the chart with the yellow compass rose?', 'The archive has a photograph of that window from 1982.', 'My father used to order survey sheets there for the school.', 'Do you know whether the drawer of early ferry maps is open to visitors?', 'I caught the owner on Saturday and she showed us the bound index.',
  ], [
    'Is the Thursday reading in the upstairs room or beside the entrance?', 'The front desk told me the ground-floor room is booked.', 'We have confirmed the reading is downstairs, just past the information desk.', 'Will transcripts be available later?', 'I am bringing a student group and would appreciate the opening time.', 'It was lovely to hear the last poem read by the author.',
  ], [
    'The first crossing was the best part of my old commute.', 'Does the passenger shelter still open before the ticket office?', 'The crew opened the shelter when we arrived at 5:45.', 'Look for porpoises off the west side when the water is still.', 'I moved away five years ago and that photograph takes me right back.', 'Is there room for two bicycles on the early route?',
  ], [
    'I can bring some spare aprons to the next unloading day.', 'The open hours on the door are longer than the ones in the article.', 'The room has started staying open until four. Thanks for flagging the change.', 'Do the introductory classes use the same clay?', 'Several artists in the photo were my neighbors ten years ago.', 'Does the studio accept donations of unopened glaze?',
  ], [
    'The quieter Wednesday visit worked well for us.', 'Does the side entrance have a step?', 'The courtyard entrance is level. Ask staff at the main desk if the gate is closed.', 'I enjoyed seeing the chart from the east channel.', 'How long will the exhibition be up?', 'Please pass on our thanks to the person staffing the desk.',
  ], [
    'The growers sold out of paperwhites by noon last week.', 'More pots are coming this Saturday according to the stallholder.', 'Is the market at the square during the roadworks?', 'Those eucalyptus stems stayed fresh for two weeks.', 'Can I bring my own basket when buying loose flowers?', 'Thanks for including the market in the walking guide.',
  ], [
    'There is another photograph of that gear cabinet in the library archive.', 'I will check the collection when the reading room opens.', 'Is the original clock still running?', 'I remember the scaffolding going up when the roof was replaced.', 'Does the museum welcome school groups on Fridays?', 'The handwritten shift cards were my favorite part of the exhibition.',
  ], [
    'Can the books on this shelf be borrowed through the branch library?', 'The catalogue marks a few editions for reference only.', 'A new copy of the harbor poems has just joined the lending shelf.', 'The blue pamphlet in the photo was printed on Marina Road.', 'Is anyone collecting local translations?', 'The library staff helped me find the companion chapbook.',
  ], [
    'What time does the north entrance to the green open?', 'The last bus stops at the main gate after the concert.', 'There are folding chairs available beside the bandstand steps.', 'Will the string quartet be back in December?', 'I watched from the path along the water and could hear well.', 'Please include the secondary entrance in the map next time.',
  ], [
    'Can the recorded interviews be played at the archive desk?', 'The archive will prepare headphones for visitors on Thursday.', 'Do you have an interview with the person who used to repair the bell?', 'The sound of the tea cups made the recording feel very close.', 'I would be glad to check a transcript for names.', 'My copy of the reunion program lists two former shift leaders.',
  ], [
    'The high trail stayed dry after yesterday’s rain.', 'Is the gate open at the west end at dusk?', 'The gate stays open. There are no lights along that stretch.', 'We saw three herons where the path approaches the bridge.', 'One of the direction signs is turned away from the path.', 'The boardwalk is a good place to stop and watch the tide come in.',
  ],
]

const pad = (value) => String(value).padStart(2, '0')
const id = (prefix, n) => prefix + '-' + String(n).padStart(3, '0')
const stamp = (createdAt, author = actor, updatedAt = createdAt, editor = author) => ({ createdAt, createdBy: author, updatedAt, updatedBy: editor })
const dated = (index, hour) => '2026-' + pad(8 + index % 4) + '-' + pad(2 + (index * 5) % 14) + 'T' + pad(hour) + ':00:00.000Z'
const scheduled = (index) => '2026-12-' + pad(3 + index % 22) + 'T17:00:00.000Z'
const distribution = (counts) => counts.flatMap(([status, count]) => Array(count).fill(status))
const postStatuses = distribution([['published',17],['draft',9],['pending',3],['scheduled',3],['private',2],['trash',2]])
const pageStatuses = distribution([['published',16],['draft',6],['pending',2],['scheduled',1],['private',1],['trash',2]])
const commentStatuses = distribution([['approved',36],['pending',19],['spam',11],['trash',6]])
const termCreated = '2026-08-01T14:00:00.000Z'

function contentSeed(prefix, entries, statuses, accounts) {
  return entries.map((entry, index) => {
    const number = index + 1
    const status = statuses[index]
    const authorId = accounts[index % accounts.length].id
    const createdAt = dated(index, 13)
    const updatedAt = ({ 1: '2026-11-17T17:00:00.000Z', 18: '2026-11-16T18:00:00.000Z', 26: '2026-11-15T18:00:00.000Z' })[number] || dated(index, 17)
    const common = {
      id: id(prefix, number), ...stamp(createdAt, authorId, updatedAt, index % 3 === 0 ? actor : authorId),
      title: entry[0], slug: slugify(entry[0]), authorId, status,
      scheduledAt: status === 'scheduled' ? scheduled(index) : null,
      publishedAt: ['published', 'private'].includes(status) || (status === 'trash' && index % 2 === 0) ? dated(index, 16) : null,
      trashedAt: status === 'trash' ? updatedAt : null,
    }
    if (prefix === 'page') {
      const [, parent, menuOrder, text] = entry
      return {
        ...common, parentId: parent ? id('page', parent) : null, menuOrder,
        excerpt: text, blocks: [{ id: 'block-001', type: 'paragraph', text }],
        featuredImageId: [1, 3, 7, 13].includes(number) ? id('media', number + 13) : null,
        commentsOpen: [3, 6, 7, 13].includes(number),
      }
    }
    const [, heading, text, category, tags] = entry
    const image = index < 18 ? id('media', number) : null
    return {
      ...common, excerpt: text.split(/(?<=\.) /)[0],
      blocks: [
        { id: 'block-001', type: 'heading', text: heading, level: 2 },
        { id: 'block-002', type: 'paragraph', text },
        ...(image ? [{ id: 'block-003', type: 'image', mediaId: image, caption: heading + ' · Harbor & Field Journal' }] : []),
      ],
      featuredImageId: index < 10 ? image : null, commentsOpen: index % 9 !== 8,
      categoryIds: ['cat-' + categories[category][0]], tagIds: tags.map((tag) => 'tag-' + slugify(tagNames[tag])),
    }
  })
}

export function createInitialData() {
  const accounts = users.map(([key, name, username, role]) => ({ id: 'user-' + key, name, username, role, email: key + '@harborfield.example' }))
  const posts = contentSeed('post', stories, postStatuses, accounts)
  const pages = contentSeed('page', pageEntries, pageStatuses, accounts)
  const media = mediaFixtures.map(([fileName, mimeType, sizeBytes, width, height, title, altText], index) => {
    const authorId = accounts[(index + 1) % accounts.length].id
    const uploadedTo = index < 27
      ? { type: 'post', id: id('post', index % 20 + 1) }
      : index < 34 ? { type: 'page', id: id('page', index % 16 + 1) } : null
    return {
      id: id('media', index + 1), ...stamp(dated(index, 14), authorId), title, fileName, url: '/media/' + fileName,
      mimeType, sizeBytes, width, height, altText: index % 5 !== 4 ? altText : '',
      caption: index % 3 === 0 ? title + ' · Harbor & Field Journal' : '',
      description: index % 4 === 2 ? 'From the journal’s fall editorial collection.' : '', authorId, uploadedTo,
    }
  })
  const targets = [posts[0], posts[1], posts[2], posts[3], posts[4], posts[5], posts[6], posts[7], pages[6], posts[9], posts[10], pages[12]]
  const comments = commentStatuses.map((status, index) => {
    const thread = index % targets.length
    const sequence = Math.floor(index / targets.length)
    const content = targets[thread]
    const mine = sequence === 2 || index === 12 || index === 13 || index === 39
    const [authorName, authorEmail] = mine ? [accounts[0].name, accounts[0].email] : localReaders[(index + sequence) % localReaders.length]
    const parentId = sequence > 0 && (thread % 3 === 0 || sequence <= 2) ? id('comment', index + 1 - targets.length) : null
    const day = 5 + sequence * 2 + Number(thread > 7)
    const time = '2026-11-' + pad(day) + 'T' + pad(9 + thread) + ':15:00.000Z'
    const priorStatus = ['spam', 'trash'].includes(status) ? (index % 2 ? 'approved' : 'pending') : null
    return {
      id: id('comment', index + 1), ...stamp(time, mine ? actor : null), authorId: mine ? actor : null, authorName, authorEmail,
      contentId: content.id, contentType: content.id.startsWith('page-') ? 'page' : 'post',
      parentId, body: readerNotes[thread][sequence], status, priorStatus,
    }
  })
  const activity = [
    ['comment_approved', comments[0], 'pending', 'approved', []],
    ['comment_replied', comments[12], null, 'approved', [comments[0].id]],
    ['comment_spammed', comments[55], comments[55].priorStatus, 'spam', []],
  ].map(([action, record, fromStatus, toStatus, relatedIds], index) => ({
    id: id('activity', index + 1), action, targetType: 'comment', targetId: record.id, actorId: actor,
    createdAt: action === 'comment_replied' ? record.createdAt : record.createdAt.replace(':15:', ':25:'),
    contentType: record.contentType, contentId: record.contentId, fromStatus, toStatus, relatedIds,
  }))
  for (const change of [activity[0], activity[2]]) {
    const comment = comments.find((record) => record.id === change.targetId)
    comment.updatedAt = change.createdAt
    comment.updatedBy = actor
  }
  return {
    site: { id: 'site-harbor-field', name: 'Harbor & Field Journal', tagline: 'Arts, places, and public life on the coast', locale: 'en-US', timezone: 'UTC' },
    currentUserId: actor, users: accounts, posts, pages,
    categories: categories.map(([key, name]) => ({ id: 'cat-' + key, name, slug: slugify(name), ...stamp(termCreated) })),
    tags: tagNames.map((name) => ({ id: 'tag-' + slugify(name), name, slug: slugify(name), ...stamp(termCreated) })),
    media, comments, activity,
  }
}
