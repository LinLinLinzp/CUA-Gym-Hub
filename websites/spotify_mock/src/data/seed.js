const stamp = '2025-04-14T16:15:00.000Z'

const listenerNames = [
  'Maya Chen', 'Nora Ellis', 'Theo Miles', 'Leah Brooks', 'Amir Patel', 'Inez Romero',
  'Sam Okafor', 'June Mercer', 'Oscar Monroe', 'Priya Bennett', 'Ezra Moss', 'Tessa James',
  'Roman Hale', 'Ada Fields', 'Milo Reed', 'Elena Shore', 'Noah Banks', 'Tariq Stone',
  'Ruth Kim', 'Sofia Greene', 'Eli Byrne', 'Jules Park', 'Dina Flores', 'Ivy Nolan',
  'Owen Walsh', 'Lena Watts', 'Jasper Lin', 'Clara Moss', 'Finn Avery', 'Mina Bell',
]
const listenerBios = { 'Maya Chen': 'Collecting late-night instrumentals.', 'Nora Ellis': 'Songs for the kitchen, the porch and everywhere in between.' }
const artistNames = [
  'Lantern District', 'Marble Hours', 'Dahlia Coast', 'Cedar Static', 'Paloma Glass',
  'Velvet Census', 'Hollow Current', 'Mira Fenn', 'Field Assembly', 'The Paper Reeds',
  'Rory Vale', 'Silver Parish', 'North Arcade', 'Marin Temple', 'Daylight Union',
  'Ellis Green Quartet', 'The Soft Maps', 'River Index', 'Hush Atlas', 'Amber Grammar',
  'Sorrel Choir', 'Nico Wren', 'Ridge Tapes', 'Almost Weather', 'Porch Theory',
  'Violet Landing', 'Linden Transit', 'Cora Bloom', 'Narrow Season', 'Bright Motif',
  'Studio Finch', 'Octave Orchard',
]
const titleGroups = [
  ['Blue Hour Signals', 'Window Light', 'Streetcar Echo', 'Half Past Blue', 'Last Lamp'],
  ['Low Sun Archive', 'Coastal Relay', 'Notebook Margin', 'Deep Ochre', 'In the Clearing'],
  ['Honey on the Dial', 'Honeycomb', 'Soft Receiver', 'Open Line', 'Warm Front'],
  ['Between the Pines', 'Dry Needles', 'Crosstown', 'Second Growth', 'The Long Shade'],
  ['Waterline Studies', 'Quiet Slip', 'North Pier', 'Salt Steps', 'After the Tide'],
  ['Everything in Indigo', 'Tailored Night', 'Sidewalk Silk', 'Crane Song', 'Three Turns'],
  ['Inward Sea', 'Adrift Again', 'Glass Wake', 'Common Current', 'Brine'],
  ['Notes from a Room', 'End Paper', 'Under the Door', 'Kettle', 'Silver Desk'],
  ['A Place to Stand', 'Loam', 'Wild Mint', 'Stonework', 'Daybreak Row'],
  ['Reed and Rafter', 'Quiet Parade', 'Tobacco Paper', 'Lost Chorus', 'Attic Dance'],
  ['Foxglove Road', 'Brown Rabbit', 'Low Bridge', 'Sweeping Bend', 'Home by Five'],
  ['Tarnish and Bloom', 'Sparrow Smoke', 'Small Bell', 'Ink Wash', 'Lacquer'],
  ['The Arcade at Noon', 'Token Drop', 'Neon Banister', 'Blue Screen', 'Prize Counter'],
  ['Jasmine Transit', 'Green Ticket', 'Station Garden', 'Express to Dawn', 'Soft Departure'],
  ['Public Sunshine', 'Glass Dome', 'Sun in Transit', 'Late Lunch', 'City Hammock'],
  ['In Four Corners', 'Six Paces', 'Dovetail', 'Brass Landing', 'Fourth Chair'],
  ['Drawn from Memory', 'Contour Line', 'Compass Rose', 'North of Here', 'Pencil Road'],
  ['River Index', 'High Water Mark', 'Towpath', 'Undertone', 'Silt Table'],
  ['Nothing but Distance', 'Low Latitude', 'Window Seat', 'No Signal', 'Bright Vapor'],
  ['The Amber Sentence', 'Letter Fold', 'Type Metal', 'Run-on', 'Orange Mark'],
  ['Gathering Sorrel', 'Understory', 'Broad Leaf', 'Oven Song', 'Good Soil'],
  ['Wren Weather', 'Loft Air', 'Small Wing', 'Little Gust', 'Cloud Stitch'],
  ['Tape on the Ridge', 'Fade In', 'High Meadow', 'Falling Spool', 'Far Slope'],
  ['Almost Rain', 'Waiting for Thunder', 'Thin Drops', 'Street Reflection', 'Umbrella Moon'],
  ['Front Porch Math', 'Railing', 'Neighbor Light', 'Summer Fraction', 'Blue Pitcher'],
  ['Violet Landing', 'Shifting Alibis', 'Landing Gear', 'Night Approach', 'Runway Glass'],
  ['The Linden Line', 'Leaf Transfer', 'Bus Shelter', 'Missed Stop', 'Ticket Pocket'],
  ['Garden After Dusk', 'Peony Sketch', 'Moss Film', 'Cinder Bed', 'Sprinkler Mist'],
  ['Narrow Season', 'Late Frost', 'Sleeve Weather', 'Soft Thaw', 'April Thread'],
  ['Motifs in Daylight', 'Orange Felt', 'Paper Shade', 'Pattern Repeat', 'Sun Patch'],
  ['Finch Takes', 'Room Tone', 'Tape Leader', 'Mic Check', 'Take Eight'],
  ['Octave Orchard', 'Applewood', 'Rows in Bloom', 'Split Fruit', 'Pear Ladder'],
  ['Quiet Frequencies', 'Thin Antenna', 'Distant Relay', 'Passing Signal', 'Dawn Dial'],
  ['Marble After Rain', 'Grey Landing', 'Front Steps', 'Hard Surface', 'Soft Edges'],
  ['A Coast in Winter', 'Wind Shift', 'Narrow Inlet', 'Pier Lights', 'Cold Horizon'],
  ['The Cedar Room', 'Old Floorboards', 'Corner Lamp', 'Tall Frame', 'Off Season'],
]
const playlistNames = [
  'Sunday Side A', 'Fresh Press', 'After the Rain', 'Cabin Sessions', 'Kitchen Table Tapes',
  'Porch Lights', 'Night Bus Notes', 'Slow Saturday', 'Soft Focus', 'Dust & Daylight',
  'Headphones at Noon', 'Letters in Stereo', 'The Long Way Home', 'Half Full', 'Quiet Company',
  'Café on Sixth', 'Stereo Bloom', 'Across the Courtyard', 'Handwritten Hooks', 'First Frost',
  'Over the Footbridge', 'Steel & Honey', 'Still Awake', 'The Sunday Ledger', 'Floating Point',
  'Morning Layover', 'Cobalt Weather', 'Crossing Town', 'Deep in the Stacks', 'Pocket Radio',
]
const descriptions = [
  'Warm instrumentals and soft voices for slow mornings and an open window.',
  'A clean sleeve for the next good find.',
  'Quiet percussion, slow basslines and a few late-night favorites.',
  'A shared stack of records for a weekend in the woods.',
  'Understated soul and the songs we trade over dinner.',
  'Nora’s favorites for the hour when the porch lights come on.',
  'A mix for the seats at the back and the lights going by.',
  'An unhurried mix for errands that turn into long walks.',
]
const playlistIds = ['sunday', 'fresh', 'rain', 'cabin', 'kitchen', 'porch']
const genres = ['Ambient', 'Indie', 'Soul', 'Instrumental hip-hop', 'Jazz']
const fixedDate = (day) => `2025-04-${String(day).padStart(2, '0')}T12:00:00.000Z`

export function createInitialData() {
  const users = listenerNames.map((name) => ({
    id: `user-${name.split(' ')[0].toLowerCase()}`, name,
    handle: name.toLowerCase().replace(' ', ''),
    ...listenerBios[name] && { bio: listenerBios[name] },
  }))
  const artists = artistNames.map((name, index) => ({
    id: index === 0 ? 'artist-lantern' : `artist-${index + 1}`, name,
    genre: genres[index % genres.length], artKey: index === 0 ? 'lantern' : `artist-print-${index}`,
    ...index === 0 && { bio: 'An instrumental duo from Portland working in field recordings and soft analog synths.' },
  }))
  const albums = titleGroups.map(([title], index) => ({
    id: index === 0 ? 'album-blue-hour' : `album-${index + 1}`, title,
    artistIds: [artists[index % artists.length].id], year: 2024 - index % 7,
    artKey: index === 0 ? 'blue-hour' : `album-print-${index}`,
  }))
  const tracks = titleGroups.flatMap(([, ...titles], albumIndex) => titles.map((title, index) => ({
    id: albumIndex === 0 && index === 0 ? 'track-window' : `track-${albumIndex + 1}-${index + 1}`,
    title, artistIds: [...albums[albumIndex].artistIds], albumId: albums[albumIndex].id,
    durationMs: albumIndex === 0 && index === 0 ? 237000 : 151000 + (albumIndex * 13 + index * 27) % 156 * 1000,
    trackNumber: index + 1,
  })))
  const playlists = playlistNames.map((name, index) => ({
    id: `playlist-${playlistIds[index] || index + 1}`, name, description: descriptions[index] || '',
    ownerId: index < 3 || (index >= 6 && index <= 9) ? 'user-maya' : index < 6 ? 'user-nora' : users[index - 8].id,
    visibility: index < 5 || index === 7 ? 'private' : 'public',
    collaborative: index >= 2 && index <= 4, status: 'active',
    artKey: ['paper-sun', 'fresh-press', 'rain-print', 'cabin-print', 'kitchen-print', 'porch-print'][index] || `playlist-print-${index}`,
    createdAt: fixedDate(1 + index % 10), updatedAt: index === 0 ? fixedDate(29) : fixedDate(20 - index % 12),
  }))
  const member = (id, playlistId, userId) => ({
    id, playlistId, userId, role: 'editor', status: 'active', createdAt: stamp, updatedAt: stamp, updatedBy: userId,
  })
  const invite = (id, token, playlistId, invitedBy, recipientId, status, createdAt, expiresAt) => ({
    id, token, playlistId, invitedBy, recipientId, status, createdAt, expiresAt, updatedAt: createdAt, updatedBy: invitedBy,
  })
  const playlistItems = playlists.flatMap((playlist, index) => Array.from({ length: index === 1 ? 0 : index === 0 ? 8 : 4 }, (_, position) => {
    const addedBy = position % 2 && index === 2 ? 'user-theo' : position % 2 && index === 3 ? 'user-maya' : playlist.ownerId
    return {
      id: index === 0 && position === 0 ? 'item-sunday-window' : `item-${index + 1}-${position + 1}`,
      playlistId: playlist.id, trackId: tracks[(index * 9 + position * 3) % tracks.length].id,
      position, status: 'active', addedBy, createdAt: stamp, updatedAt: stamp, updatedBy: addedBy,
    }
  }))
  const libraryEntries = [
    ...tracks.filter((_, i) => i % 7 === 0).map(({ id }) => ['track', id]),
    ...albums.filter((_, i) => i % 5 === 0).map(({ id }) => ['album', id]),
    ...[10, 14, 16, 20, 23].map((i) => ['playlist', playlists[i].id]),
  ].map(([targetType, targetId], index) => ({
    id: `lib-maya-${index + 1}`, userId: 'user-maya', targetType, targetId,
    status: 'saved', createdAt: fixedDate(2 + index % 12), updatedAt: fixedDate(3 + index % 17), updatedBy: 'user-maya',
  }))
  const follows = [
    ...artists.filter((_, i) => i % 2 === 0).map(({ id }) => ['artist', id]),
    ...users.slice(1, 6).map(({ id }) => ['user', id]),
  ].map(([targetType, targetId], index) => ({
    id: `follow-maya-${index + 1}`, followerId: 'user-maya', targetType, targetId,
    status: 'following', createdAt: stamp, updatedAt: stamp,
  }))
  return {
    account: { userId: 'user-maya' }, users, artists, albums, tracks, playlists, playlistItems, libraryEntries, follows,
    playlistCollaborators: [
      member('member-rain-theo', 'playlist-rain', 'user-theo'),
      member('member-rain-leah', 'playlist-rain', 'user-leah'),
      member('member-cabin-maya', 'playlist-cabin', 'user-maya'),
    ],
    playlistInvites: [
      invite('invite-kitchen-maya', 'kitchen-maya', 'playlist-kitchen', 'user-nora', 'user-maya', 'pending', '2026-11-15T12:00:00.000Z', '2026-11-22T12:00:00.000Z'),
      invite('invite-cabin-expired', 'cabin-expired', 'playlist-cabin', 'user-nora', 'user-maya', 'pending', '2025-04-14T12:00:00.000Z', '2025-04-21T12:00:00.000Z'),
      invite('invite-kitchen-revoked', 'kitchen-revoked', 'playlist-kitchen', 'user-nora', 'user-maya', 'revoked', '2025-04-14T12:00:00.000Z', '2025-04-21T12:00:00.000Z'),
    ],
  }
}

