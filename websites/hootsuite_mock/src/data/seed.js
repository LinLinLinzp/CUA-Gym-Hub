const id = (kind, index) => `${kind}-${String(index + 1).padStart(2, '0')}`

const people = [
  ['Maya Chen', 'MC', 'Social lead'],
  ['Rowan Park', 'RP', 'Content coordinator'],
  ['Ella Brooks', 'EB', 'Programs manager'],
  ['Jamal Reed', 'JR', 'Community editor'],
  ['Lucia Flores', 'LF', 'Partnerships lead'],
  ['Owen Bell', 'OB', 'Volunteer coordinator'],
]

const channels = [
  ['Juniper Works', '@juniperworks', 'instagram'],
  ['Juniper Works', '@juniperworks', 'linkedin'],
  ['Juniper Works', '@juniperworks', 'facebook'],
  ['Juniper Works', '@juniperworks', 'x'],
  ['Juniper Workshops', '@juniperworkshops', 'instagram'],
  ['Juniper Tool Library', '@junipertools', 'facebook'],
]

const captions = [
  'The tool library reopens Friday. Bring a project, borrow a kit, and meet the volunteers who make it possible.',
  'A bike with a flat tire can still have a long life. Bring it to the next Repair Club and we’ll work through the fix together.',
  'Our first evening orientation covers safe tool handling, checkouts, and how to help a first-time borrower.',
  'What would you build with a free afternoon and a borrowed drill? Share your project in the comments.',
  'This month’s reuse report tracks 86 tools returned to circulation and 14 repair kits donated to neighborhood groups.',
  'Thanks to Cedar Street Market for hosting our mobile tool library. The pop-up returns next month with a bigger selection.',
  'Have extra bolts, brackets, or working hand tools? Bring them to the donation table during open shop hours.',
  'Next Saturday’s lamp clinic starts with a short safety demo. Bring an unplugged lamp and its shade if you have it.',
  'The volunteer sign-up is open for our winter workshop series. Choose a two-hour shift at the check-in or repair bench.',
  'Small fix of the week: a loose chair rung usually needs a clean joint and a clamp before it needs replacement.',
  'We’ve added a second workbench for the school holiday repair session. All ages are welcome with an adult.',
  'Borrow a sewing kit for everyday mending. Each one includes thread, needles, fabric scissors, pins, and a guide.',
  'The neighborhood exchange now accepts garden tools. Please wipe them down before drop-off so they can go straight onto the shelf.',
  'Join our open house for a quick shop tour and an introduction to the lending collection.',
  'Here’s a peek at the adjustable shelving our volunteers built out of reclaimed plywood.',
  'We’re adding a quiet hour to the community repair clinic for anyone who prefers a lower-noise workspace.',
  'When winter weather moves in, check here for workshop hours before loading up your project.',
  'Three ways to prep for your first repair session: bring all the parts, pack a photo, and leave enough time to ask questions.',
  'Look for the green Juniper Works crate at Maple Square. It holds free fasteners and small hardware sorted by size.',
  'Take a look at the newly cataloged clamps, work lights, and hand sanders in the lending collection.',
  'Spend a lunch break with our training team and learn how to sharpen garden shears safely.',
  'The borrowed drill that built a pantry: Jules shares how they tackled shelves in a narrow kitchen.',
  'Meet the Friday crew who test, label, and put every tool back into circulation.',
  'Our partner repair shops are sharing a full week of beginner-friendly demonstrations this season.',
  'No room for a home workshop? Book a bench during open shop hours and use the shared clamps and work lights.',
  'Show us the thing you almost threw away. We’re collecting stories of small repairs that made a big difference.',
  'Our upcoming swap table makes it easy to trade leftover materials and pick up a few pieces for your next project.',
  'The repair guide for tomorrow’s session is ready. We’ll start by helping everyone identify which fastener they need.',
  'This week, the lending desk will keep a short list of substitutes for our most popular weekend tools.',
  'Winterize your garden tools with a wipe-down, a little oil, and a dry place to store them.',
  'Neighbor spotlight: Amina used our folding workbench to make a shoe rack for the shared entryway.',
  'The community center is collecting clean offcuts for youth workshops. Staff can help sort them by material at drop-off.',
  'Reserve a spot at the repair café. We’ll have separate tables for textiles, bikes, and small household fixes.',
  'Our updated borrowing guide shows which items fit in a backpack and which ones need a cart.',
  'If you’ve been meaning to learn how to patch a pair of jeans, Tuesday’s mending table is a good place to start.',
  'Thanks to everyone who helped unload the mobile workshop. The rebuilt cart is now ready for another season.',
  'Help us make workshop signage easier to read. We’ll put two samples by the borrowing desk this week.',
  'The last beginner woodwork session filled up quickly. We’ve opened a second session for the following weekend.',
  'A loose handle or persistent wobble is reason enough to stop by the repair table with a chair or cabinet drawer.',
  'We’re putting together tool bundles for the community garden. Each includes items for pruning, staking, and cleanup.',
  'Here’s what happens to a donated wrench before it makes it onto the lending wall.',
  'We’ll have spare tubes at the bike station, but please bring your tire size to speed up check-in.',
  'Our youth training group is testing a simpler way to record maintenance on shared tools.',
  'Sunday’s mending table starts at noon. Bring one garment and any matching buttons or fabric you have.',
  'We’re piloting an extra drop-off window for tools borrowed over long weekends.',
  'Ask a volunteer to show you the difference between a driver bit and a drill bit during open shop.',
  'The courtyard swap is paused while the ramps are repaired. We’ll share a new date when access is restored.',
  'Tonight’s outdoor demonstration is canceled because of wind. The library desk will keep its regular hours.',
]

const boardNames = ['Brand watch', 'Community programs', 'Events', 'Publishing', 'Partnerships', 'Industry watch']
const boardStreams = [
  [['Repair Club conversations', 3, 'keyword_search', '#RepairClub'], ['Juniper mentions', 3, 'mentions'], ['Studio dispatches', 0, 'my_posts'], ['Juniper on X', 3, 'my_posts']],
  [['Workshop highlights', 4, 'my_posts'], ['Tool loans', 5, 'my_posts'], ['Community notices', 2, 'my_posts'], ['Garden projects', 3, 'keyword_search', 'garden']],
  [['Open shop', 3, 'keyword_search', 'open shop'], ['Workshop announcements', 4, 'my_posts'], ['Upcoming programs', 2, 'my_posts'], ['Visitor mentions', 3, 'mentions']],
  [['Studio Instagram', 0, 'my_posts'], ['LinkedIn publishing', 1, 'my_posts'], ['Facebook publishing', 2, 'my_posts'], ['X publishing', 3, 'my_posts']],
  [['Partner updates', 1, 'my_posts'], ['Cedar Street Market', 3, 'keyword_search', 'Cedar Street'], ['Library updates', 5, 'my_posts'], ['Partner mentions', 3, 'mentions']],
  [['Reuse conversations', 3, 'keyword_search', 'reuse'], ['Libraries on LinkedIn', 1, 'my_posts'], ['Repair news', 3, 'keyword_search', 'repair'], ['Upcoming tool swaps', 3, 'keyword_search', '#JuniperToolSwap']],
]
const communityFeed = [
  ['Jordan Silva', '@jordansilva', 'Thanks @juniperworks for bringing a second workbench to #RepairClub this Saturday.'],
  ['Cedar Street Market', '@cedarstreetmarket', 'Cedar Street Market is making room for another mobile tool library visit. Bring your garden shears to the repair table.'],
  ['Leah Okafor', '@leahfixes', 'The new open shop bench at @juniperworks is great for clamping wider boards.'],
  ['Maple Reuse Network', '@maplereuse', 'Our fall reuse roundup includes a great checklist for donating tools to a lending library.'],
  ['Amina Patel', '@aminapatel', 'I finally fixed the old kitchen drawer at #RepairClub. Thanks for showing me how to size the new screws, @juniperworks.'],
  ['Brookside Bikes', '@brooksidebikes', 'The next community bike repair meetup will include a quick lesson on checking chain wear.'],
  ['Jules Weber', '@julesmakes', 'Borrowed a level from @juniperworks and got both pantry shelves up before dinner.'],
  ['West Grove Community Garden', '@westgrovegarden', 'We’re collecting working trowels and spare gloves at this year’s garden cleanup.'],
]

const bootTime = '2026-11-09T14:00:00.000Z'
const metadata = (actor, date) => ({ createdBy: actor, createdAt: date, updatedBy: actor, updatedAt: date })
const activeFields = (actor, date) => ({ status: 'active', ...metadata(actor, date), removedBy: null, removedAt: null })
const timestamp = (day, hour, minute = 0) => new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString()

function scheduleFor(index, status) {
  if (index === 0) return timestamp(20, 16)
  if (index === 1) return timestamp(21, 15, 30)
  if (status === 'draft' && index % 3 !== 0) return null
  if (status === 'published') return timestamp(4 + (index % 15), 10 + index % 7)
  return timestamp(16 + (index * 3) % 7, 10 + index % 10, index % 2 ? 30 : 0)
}

function createPosts() {
  const statuses = [
    ...Array(10).fill('pending_approval'), ...Array(12).fill('scheduled'), ...Array(8).fill('draft'),
    ...Array(10).fill('published'), ...Array(6).fill('rejected'), ...Array(2).fill('canceled'),
  ]
  return statuses.map((status, index) => {
    const author = index < 4 ? [1, 3, 0, 0][index] : index === 40 ? 0 : index % people.length
    const profileIds = index === 0 ? ['profile-04'] : [id('profile', index % channels.length)]
    if (index % 5 === 1) profileIds.push(id('profile', (index + 2) % channels.length))
    return {
      id: id('post', index), body: captions[index], profileIds, status,
      scheduledAt: scheduleFor(index, status),
      ...metadata(id('user', author), timestamp(index === 0 ? 12 : 1 + index % 10, 15, 15)),
      ...(index === 0 ? { updatedAt: timestamp(13, 15, 15) } : {}),
    }
  })
}

function createApprovals(posts) {
  const earlier = [2, 3, 4, 5].map((postIndex, index) => ({
    postIndex, reviewer: index < 2 ? 0 : 2, status: 'rejected', createdAt: timestamp(10, 13, index),
  }))
  const pending = posts.slice(0, 10).map((_, index) => ({
    postIndex: index, reviewer: index < 4 ? [0, 0, 2, 4][index] : (index + 1) % 6,
    status: 'pending', createdAt: timestamp(13, 15, 15 + index), previousRequestId: index >= 2 && index < 6 ? id('approval', 24 + index) : null,
    requestNote: index === 0 ? "Please check Friday's reopening details." : 'Please check the schedule and confirm the workshop details.',
  }))
  const approved = posts.slice(10, 20).map((_, index) => ({
    postIndex: 10 + index, reviewer: (index + 2) % 6, status: 'approved', createdAt: timestamp(11, 11, index),
  }))
  const rejected = posts.slice(40, 46).map((_, index) => ({
    postIndex: 40 + index, reviewer: (index + 2) % 6, status: 'rejected', createdAt: timestamp(12, 12, index),
  }))
  return [...pending, ...approved, ...rejected, ...earlier].map((entry, index) => {
    const { postIndex, status, createdAt, previousRequestId = null, requestNote = '' } = entry
    const { id: postId, createdBy: requestedBy } = posts[postIndex]
    const candidate = id('user', entry.reviewer)
    const reviewerId = candidate === requestedBy ? id('user', (entry.reviewer + 1) % 6) : candidate
    return {
      id: id('approval', index), postId, reviewerId, requestedBy, status, createdAt, previousRequestId, requestNote,
      decisionNote: status === 'rejected' ? 'Please add the location and confirm when volunteers should arrive.' : null,
      decidedBy: status === 'pending' ? null : reviewerId,
      decidedAt: status === 'pending' ? null : new Date(Date.parse(createdAt) + 3_600_000).toISOString(),
    }
  })
}

export function createInitialData() {
  const posts = createPosts()
  const users = people.map(([name, initials, role], index) => ({ id: id('user', index), name, initials, role }))
  const profiles = channels.map(([name, handle, network], index) => ({ id: id('profile', index), name, handle, network }))
  return {
    workspace: { id: 'workspace-01', name: 'Juniper Works', timeZone: 'UTC', currentUserId: 'user-01' },
    users,
    profiles,
    posts,
    approvals: createApprovals(posts),
    streamBoards: boardNames.map((name, position) => ({
      id: id('board', position), name, position, ...activeFields('user-01', bootTime),
    })),
    streams: boardStreams.flatMap((items, boardIndex) => items.map(([name, profile, type, query = null], position) => ({
      id: id('stream', boardIndex * 4 + position), boardId: id('board', boardIndex),
      name, profileId: id('profile', profile), type, query, position, ...activeFields('user-01', timestamp(9, 14, 5 + position)),
    }))),
    feedItems: Array.from({ length: 72 }, (_, index) => {
      const profileIndex = index === 0 ? 3 : index <= 3 ? index - 1 : index % 6
      const profile = profiles[profileIndex]
      const round = Math.floor(index / 6)
      const isCommunity = profileIndex === 3 && (round < 4 || (round >= 6 && round < 10))
      const [authorName, authorHandle, body] = isCommunity
        ? communityFeed[round % 6 + (round >= 6 ? 2 : 0)]
        : [profile.name, profile.handle, captions[(index + 7) % captions.length]]
      return {
        id: id('feed', index), profileId: profile.id, authorName, authorHandle, body,
        kind: isCommunity ? (round % 2 === 0 ? 'mention' : 'discovery') : 'owned',
        createdAt: timestamp(16 - round, index === 0 ? 17 : 16 - profileIndex, index === 0 ? 45 : 15),
      }
    }),
  }
}
