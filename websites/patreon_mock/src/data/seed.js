const creator = {
  id: 'creator-mara',
  name: 'Mara Chen',
  publicationName: 'Lantern Room',
  email: 'mara.chen@example.com',
}

const media = [
  { id: 'media-projection', name: 'Inside the projection booth', type: 'image', src: '/art/projection.webp', alt: 'Warm projector light in an empty cinema', durationSeconds: null },
  { id: 'media-neon', name: 'The last neon on Canal Street', type: 'image', src: '/art/neon.webp', alt: 'A coral shop light reflected in a rain-darkened street', durationSeconds: null },
  { id: 'media-library', name: 'Library windows at dusk', type: 'image', src: '/art/library.webp', alt: 'Amber reading room windows against a green evening sky', durationSeconds: null },
  { id: 'media-night-audio', name: 'Night field recording', type: 'audio', src: '/art/night.wav', alt: '', durationSeconds: 24 },
]

const postEntries = [
  ['The foyer before the doors open', 'I arrived before the programme was printed. Above the ticket window, the old clock was seven minutes fast, as it has been through three renovations.', 'image'],
  ['The last neon on Canal Street', 'Six letters still light up above the nearly empty block. I traced their reflection in the pavement until the delivery riders came through.', 'image'],
  ['What the river sounds like at midnight', 'The low note in this recording comes from the steel gangway. At high tide it knocks against its stop every few waves.', 'audio'],
  ['Marginalia for a rainy week', 'This month’s reading list starts with a weather diary and ends with three pages of handwritten recipes slipped into the back of a secondhand novel.', 'text'],
  ['A Friday matinee in late autumn', 'Five of us sat through the credits. The usher left the lamps down until the names of the people who built the sets had passed.', 'text'],
  ['When the neighborhood turns the page', 'The reading room windows are brightest just before closing. These photographs follow the soft pools of light from the stairs to the back desk.', 'image'],
  ['Field notes from the night bus', 'Listen for the window latch at the second stop. Everything after the bridge was recorded from the top deck with the microphone inside my coat.', 'audio'],
  ['Hand-painted letters at the market', 'I brought a sketchbook to the produce stalls and counted nine ways of writing the number seven.', 'image'],
  ['Five minutes in the city archive', 'The archivist showed me how to turn a brittle city map with the edge of a clean ruler. The tram depot was marked in blue pencil.', 'text'],
  ['A small atlas of empty seats', 'Before the second show, I photographed the folding seats in the balcony. They make a different pattern when only the aisle lights are on.', 'image'],
  ['The bookseller on Pacific Avenue', 'A shelf by the till holds every book that arrived with a letter tucked inside. Ask for the pale green dividers if you want to browse them.', 'text'],
  ['Listening under the overpass', 'The second tap in each pair is the echo from the concrete stairwell. It took me two evenings to find a place where the traffic did not swallow it.', 'audio'],
  ['A line around the block', 'The line started at the old seal on the pavement. By seven it had passed the repair shop, whose owner came outside with a stool.', 'text'],
  ['An afternoon at the print shop', 'We rolled a narrow strip of crimson ink across the press bed and printed one copy of a poster that had been folded away since 1984.', 'image'],
  ['Three short films about work', 'Each film returns to an ordinary gesture: tying an apron, wiping a counter, or hanging a key just out of reach of the door.', 'text'],
  ['The piano in the upstairs room', 'Someone plays the same unfinished scale every Wednesday. You can hear the room around it better when the building’s fan stops.', 'audio'],
  ['The blue hour at Mercer Library', 'I shot these frames from the steps across the street. A single desk lamp was still lit when the clock over the entrance reached nine.', 'image'],
  ['A pocket guide to festival week', 'Here are four screenings within walking distance, with enough time between the second and third to sit down somewhere quiet.', 'text'],
  ['Before the rain reaches Orchard Street', 'The street vendors cover their boxes in a particular order. First the paperbacks, then the records, and always the flowers last.', 'image'],
  ['After the last screening', 'The projection booth smelled faintly of warm dust. On the table lay a record of every bulb replaced since the theatre opened.', 'image'],
  ['The problem with a perfect restoration', 'I am collecting notes on the moments where a scratch or change in colour tells us something about who handled a print.', 'text'],
  ['The repair shop window', 'The window display changes on Tuesdays. This week there are two wall clocks, a radio with no dial and a row of small screwdrivers.', 'image'],
  ['Ideas for a winter listening walk', 'Start at the covered station and keep to the west side of the street. The arcade gives us a quiet place to stop and compare notes.', 'audio'],
  ['A letter to the collection volunteers', 'This draft will introduce the people who numbered the sleeves, repaired the folders and answered questions during the moving week.', 'text'],
  ['One room, four translations', 'The four copies have identical blue covers. I have started comparing how each translator handles the last sentence of chapter six.', 'text'],
  ['City songs without words', 'I am putting together a short sequence about melody that can survive a room full of people talking. The opening sound is a drainpipe.', 'audio'],
  ['The cinema in the old civic hall', 'We are waiting for the caretaker to confirm how the original tiered floor was covered before the hall became a cinema.', 'image'],
  ['The art of a programme note', 'I want the opening paragraph to tell readers why two films are paired, while leaving the first scene for them to discover.', 'text'],
  ['Archive night reading list', 'The earliest book in this list spends an entire chapter on filing. I want to borrow its categories for the annotations.', 'text'],
  ['The oldest lamp on the passage', 'The lamp is still wired to the corner shop. I am waiting for a foggy evening to finish the photo sequence.', 'image'],
  ['A field guide to record fairs', 'The fair opens early, but the best conversations start at lunch when the dealers trade spare sleeves and show each other what did not sell.', 'text'],
  ['The train platform at closing time', 'The announcement fades faster than the footsteps. I left twenty seconds of air at the end so you can hear the platform empty.', 'audio'],
  ['Last light on the reading tables', 'This frame catches the last stripe of natural light between two green desk lamps before the caretaker draws the blinds.', 'image'],
  ['On keeping a screening notebook', 'I have kept the same three columns since spring: title, seat number and the first detail I remembered the next morning.', 'text'],
  ['A second life for the picture palace', 'The renovation kept the ticket office and moved the toilets. Walk around the back and you can still see where the projectors vented.', 'image'],
  ['Sunday sounds from the covered market', 'The shutters form a short descending phrase as they close. I have marked the time when the last flower stall turns off its lamps.', 'audio'],
]

const tierEntries = [
  ['Field Notes', 5, 'Monthly essays and annotated reading lists.', 'Monthly essay', 'Annotated reading list'],
  ['Listening Room', 8, 'Sound diaries and recordings from the city.', 'Listening notes', 'Field recordings'],
  ['Screening Club', 12, 'Screening programmes and discussions.', 'Screening guide', 'Discussion thread'],
  ['Back Row', 16, 'Behind-the-scenes reporting from screenings.', 'Production journal', 'Member Q&A'],
  ['City Archive', 24, 'Annotated access to the Lantern Room archive.', 'Archive access', 'Quarterly reading packet'],
  ['Light Keeper', 40, 'Extra support for equipment and reporting trips.', 'All archive benefits', 'Annual print'],
  ['Rainy Window', 7, 'An early tier for the photo journal.', 'Photo journal'],
  ['The Reading Table', 9, 'A monthly envelope of reading notes.', 'Reading notes'],
  ['Night Route', 11, 'Notes on overnight transit and street photography.', 'Transit essays'],
  ['Projector Circle', 18, 'Conversations with projectionists and programmers.', 'Programme notes'],
  ['Print Drawer', 25, 'Small editions from the printing workshop.', 'Print diary'],
  ['Sound Map', 14, 'A field recording index for listeners.', 'Sound index'],
  ['Festival Week', 10, 'Schedules and guides for local screenings.', 'Festival calendar'],
  ['Civic Hall', 13, 'Reporting on public spaces and their histories.', 'City hall journal'],
  ['Friday Seat', 6, 'The early screening newsletter.', 'Friday schedule'],
  ['Patron Shelf', 35, 'Support for books and research materials.', 'Research notes'],
  ['Matinee Pass', 4, 'A founding monthly pass.', 'Matinee notes'],
  ['Corner Bookshop', 6, 'The original neighborhood reading list.', 'Shop dispatch'],
  ['Paper Lantern', 5, 'Essays from the first season.', 'Season one essays'],
  ['Opening Night', 15, 'Early supporters of the screening series.', 'Programme preview'],
  ['Blue Hour', 9, 'Short studies of the city after dusk.', 'Blue hour journal'],
  ['Folded Map', 8, 'Walking routes and annotated sketches.', 'Walking maps'],
  ['Second Reel', 10, 'Notes on films preserved on small formats.', 'Preservation diary'],
  ['The Ticket Stub', 3, 'A founding supporter tier.', 'Founding newsletter'],
]

const givenNames = ['Nina', 'Caleb', 'Priya', 'Rowan', 'Amelia', 'Darius', 'Sofia', 'Eli', 'Camille', 'Mateo', 'Leila', 'Hana', 'Isaac', 'Jules', 'Mina', 'Leo', 'Anika', 'Owen', 'Lucia', 'Milo', 'Tessa']
const familyNames = ['Ortega', 'Reed', 'Shah', 'Park', 'Bennett', 'Foster', 'Silva', 'Morgan', 'Laurent', 'Ramos', 'Haddad', 'Fujita', 'Okafor', 'Mercer', 'Hsu', 'Doyle', 'Desai', 'Hughes', 'Alvarez', 'Ibrahim', 'Nolan']
const noteBodies = [
  'Asked for more architecture reading recommendations.',
  'Prefers a plain-text reading list for the monthly dispatch.',
  'Shared a lead on the closed picture palace on Grant Avenue.',
  'Interested in contributing a short record shop interview.',
  'Attended the autumn screening and asked about the second short.',
  'Would like a reminder when the next listening walk is announced.',
  'Offered a copy of an out-of-print neighborhood history.',
]

const incoming = [
  'Will there be a reading list to go with the film essay?',
  'I went looking for the old station after your dispatch. The signs are still there.',
  'The room tone at the end of the new recording is lovely. Where did you make it?',
  'Are you planning to open another date for the listening walk?',
  'I found a postcard of the old cinema. Would a scan be useful?',
  'The archive links were a highlight for me this month.',
]
const replies = [
  'Yes, the annotated list is going out in the next dispatch.',
  'I am glad those signs survived. I will return there with a camera next week.',
  'That part was recorded on the stairs just below the ticket window.',
  'I am sorting out a second date. I will share it in the membership newsletter.',
  'A scan would be wonderful. Thank you for thinking of it.',
  'Thank you for reading. I have a few related clippings to share next month.',
]
const followups = [
  'Thanks, I will keep an eye out for it.',
  'Let me know if you want the cross street.',
  'That makes sense. I love the way the room frames the sound.',
  'Wonderful, an evening slot would work perfectly.',
  'I will include the handwritten date on the back.',
  'I look forward to seeing what you find.',
]

const recordId = (prefix, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`
const iso = (year, month, day, hour = 16, minute = 0) => new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString()

export function createInitialData() {
  const actor = creator.id
  const tiers = tierEntries.map(([name, monthlyPrice, description, ...benefits], index) => {
    const status = index < 6 ? 'published' : index < 16 ? 'unpublished' : 'retired'
    return {
      id: recordId('tier', index), name, description, monthlyPrice, currency: 'USD', benefits, status,
      createdAt: iso(2025, 9, index + 1), createdBy: actor,
      updatedAt: iso(2026, 8, index + 1), updatedBy: actor,
      unpublishedAt: status === 'unpublished' ? iso(2026, 8, index + 1) : null,
      retiredAt: status === 'retired' ? iso(2026, 8, index + 1) : null,
    }
  })
  const posts = postEntries.map(([title, body, format], index) => {
    const status = index < 20 ? 'published' : index < 30 ? 'draft' : 'scheduled'
    const audience = ['public', 'free_members', 'paid_members', 'selected_tiers'][index % 4]
    const createdAt = index < 20 ? iso(2026, 11, 16 - index) : iso(2026, 11, index - 18)
    return {
      id: recordId('post', index), authorId: actor, title, body, format,
      mediaId: format === 'image' ? media[index === 1 || index === 18 ? 1 : index === 5 || index === 16 || index === 32 ? 2 : 0].id : format === 'audio' ? media[3].id : null,
      audience, tierIds: audience === 'selected_tiers' ? [tiers[index % 6].id, tiers[6 + index % 7].id] : [],
      status, createdAt, updatedAt: createdAt, updatedBy: actor,
      scheduledAt: status === 'scheduled' ? iso(2026, 12, (index - 29) * 3) : null,
      publishedAt: status === 'published' ? createdAt : null, deletedAt: null,
    }
  })
  const members = Array.from({ length: 84 }, (_, index) => {
    const given = givenNames[(index + Math.floor(index / 21) * 5) % givenNames.length]
    const family = familyNames[(index + Math.floor(index / 21) * 11) % familyNames.length]
    const type = index < 45 ? 'paid' : index < 57 ? 'former_paid' : 'free'
    const tier = type === 'paid' ? tiers[index % 8] : type === 'former_paid' ? tiers[8 + index % 6 + (index % 3 === 0 ? 8 : 0)] : null
    const pledgeAmount = type === 'paid' ? tier.monthlyPrice + (index % 8 === 0 && index > 0 ? 2.5 : 0) : 0
    return {
      id: recordId('member', index), name: `${given} ${family}`,
      email: index % 13 === 12 ? null : `${given.toLowerCase()}.${family.toLowerCase()}@example.com`,
      type, status: type === 'former_paid' ? 'canceled' : index % 14 === 13 && type === 'paid' ? 'declined' : 'active',
      tierId: tier?.id ?? null, joinedAt: iso(2026, 3 + Math.floor(index / 12), index % 12 + 1, 13),
      pledgeAmount, lifetimePaid: type === 'free' ? 0 : index === 0 ? 45 : (pledgeAmount || tier.monthlyPrice) * (2 + index % 9),
      currency: 'USD', lastPaidAt: type === 'free' ? null : iso(2026, type === 'paid' ? 11 : 8, index % 15 + 1, 13),
    }
  })
  const memberNotes = Array.from({ length: 28 }, (_, index) => {
    const createdAt = iso(2026, 10, index + 1)
    return {
      id: recordId('note', index), memberId: members[index * 3 % members.length].id, authorId: actor,
      body: noteBodies[index % noteBodies.length], createdAt, updatedAt: createdAt, updatedBy: actor, deletedAt: null,
    }
  })
  const messages = []
  const threads = Array.from({ length: 30 }, (_, index) => {
    const member = members[index < 25 ? index : index + 20]
    const id = recordId('thread', index)
    const unreadCount = index % 4 === 0 ? 0 : index % 4 === 3 ? 2 : 1
    const createdAt = iso(2026, 11, 1 + Math.floor(index / 2), 13, index % 2 * 20)
    const lastMessageAt = iso(2026, 11, 1 + Math.floor(index / 2), 16, index % 2 * 20)
    const threadMessages = [incoming, replies, followups]
    threadMessages.forEach((bank, position) => {
      const fromCreator = position === 1
      messages.push({
        id: recordId('msg', messages.length), threadId: id, senderId: fromCreator ? actor : member.id,
        recipientId: fromCreator ? member.id : actor, body: bank[index % bank.length],
        status: 'sent', createdAt: [createdAt, iso(2026, 11, 1 + Math.floor(index / 2), 15), lastMessageAt][position], batchId: null,
      })
    })
    return {
      id, memberId: member.id, creatorId: actor, createdAt, lastMessageAt, unreadCount,
      readAt: unreadCount ? null : lastMessageAt, updatedAt: lastMessageAt, updatedBy: actor,
    }
  })
  const messageBatches = [
    'The next reading list goes out on Friday.',
    'The winter screening calendar is ready for members.',
    'Thanks for joining the listening walk. The audio notes are in the library.',
  ].map((body, index) => {
    const id = recordId('batch', index)
    const createdAt = iso(2026, 11, 15 + index, 19)
    const group = threads.slice(index * 3, index * 3 + 2)
    const sent = group.map(thread => {
      thread.lastMessageAt = createdAt
      thread.updatedAt = createdAt
      const message = {
        id: recordId('msg', messages.length), threadId: thread.id, senderId: actor,
        recipientId: thread.memberId, body, status: 'sent', createdAt, batchId: id,
      }
      messages.push(message)
      return message
    })
    return {
      id, senderId: actor, body, recipientIds: group.map(thread => thread.memberId), threadIds: group.map(thread => thread.id),
      messageIds: sent.map(message => message.id), recipientCount: sent.length, status: 'sent', createdAt,
    }
  })
  return { creator: { ...creator }, media: media.map(item => ({ ...item })), posts, tiers, members, memberNotes, threads, messages, messageBatches }
}
