const artistNames = [
  'Mira Vale', 'Jules Park', 'Nico Arden', 'Lena Sol', 'Eli Moss', 'June Keane',
  'Rafi Noon', 'Sasha Reed', 'Inez Bloom', 'Alma Coast', 'Remy Shore', 'Theo Finch',
  'Zoe Hart', 'Cleo Ames', 'Kit Moreno', 'Ari Lane', 'Eden Stone', 'Pia Quinn',
  'Luca Grey', 'Tess Wilder', 'Sam Sato', 'Noah West', 'Rae Finch', 'Lee Mercer', 'Ada Fox',
]
const trackTitles = [
  'Soft Relay', 'Cable Drift', 'Night Transit', 'Porcelain Sky', 'Glass Orchard',
  'Quiet Current', 'Borrowed Light', 'Orange Static', 'Antenna Garden', 'Hollow Signal',
  'Turning Basin', 'Low Ceiling', 'Western Window', 'Silt Lines', 'Halogen Morning',
  'Paper Receiver', 'Tidal Memory', 'Transit Loop', 'Saffron Haze', 'A Slow North',
  'Elsewhere, in the Low Light', 'Hour of Blue', 'Foam Study', 'Folded Maps',
  'Listening Station', 'Silver Wake', 'Canal Lights', 'Return Path', 'Late Crossing',
  'Amber Field', 'Understory', 'Beacon Room', 'Water Glass', 'Soft Relay',
  'Slow Signal', 'Loose Stones', 'Pressure Bloom', 'Starlit Service Road', 'Far Banks',
  'Ripple Index', 'Night Transit', 'Softer Edges', 'Overtone', 'Sunken Hall',
  'South Frequency', 'Warm Receiver', 'Pale Ribbon', 'Mile Marker',
]
const playlistTitles = [
  'Night Transit', 'Field Notes', 'Slow Mornings', 'Soft Relay', 'Studio Demos',
  'Loose Signals', 'After the Rain', 'Low Light Listening', 'Window Seats',
  'Tape Exchange', 'Night Transit', 'Warm Frequencies', 'Work in Progress',
  'Instrumental Cuts', 'Coastal Signals', 'Restless Hours', 'Sound Sketches',
  'Long Way Home', 'Textural Studies', 'Quiet Rooms', 'Late Summer',
  'Small Hours', 'Open Water', 'Pieces for a Gentle Landing',
]
const genres = ['Ambient', 'Downtempo', 'Electronic', 'Instrumental', 'House', 'Experimental']
const notes = [
  'Love the space around the drums here.',
  'That soft synth line has been stuck in my head all day.',
  'This sounds like the last bus home with the windows open.',
  'The bass comes in at exactly the right moment.',
  'I keep catching little details on headphones.',
  'The way the texture opens up near the end is lovely.',
  'I had this loop on during the whole morning walk.',
  'Really enjoying how the percussion moves across the mix.',
  'The room tone gives this so much character.',
]
const replies = [
  'Thanks for listening closely. That part came from an old tape loop.',
  'I kept coming back to that section while mixing too.',
  'Glad the quieter details came through!',
  'That is exactly the mood I was chasing in the studio.',
]
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const day = (offset) => new Date(Date.UTC(2026, 8, 28 + offset)).toISOString().slice(0, 10)
const moment = (offset, hour = 16) => day(offset) + 'T' + String(hour).padStart(2, '0') + ':00:00.000Z'

export function createInitialData() {
  const users = artistNames.map((displayName) => ({
    id: 'usr-' + slug(displayName), displayName, handle: slug(displayName).replaceAll('-', ''),
  }))
  const userId = users[0].id
  const tracks = trackTitles.map((title, index) => {
    const suffix = slug(title) + (trackTitles.indexOf(title) === index ? '' : '-' + index)
    return {
      id: 'trk-' + suffix,
      ownerId: index < 32 ? userId : users[1 + (index - 32) % 24].id,
      uploadId: index < 30 ? 'upl-' + suffix : null,
      title, genre: genres[index % genres.length], tags: index % 2 ? ['synth', 'studio session'] : ['field recording', 'tape'],
      description: [
        'Tape loops from a late train ride.',
        'A restless sketch built from drum machines and soft analog chords.',
        'Recorded between dusk and the last train out of town.',
        'A quiet instrumental from the autumn studio sessions.',
      ][index % 4],
      artworkKey: 'cover-' + index,
      durationSeconds: 212 + ((index * 37) % 121) - (index % 4) * 23,
      visibility: index % 7 === 4 ? 'private' : 'public',
      status: 'published', createdAt: moment(46 - index),
    }
  })
  const uploads = tracks.filter((track) => track.uploadId).map((track) => ({
    id: track.uploadId, trackId: track.id, actorId: userId, status: 'published', createdAt: track.createdAt,
  }))
  const playlists = playlistTitles.map((title, index) => ({
    id: 'pl-' + slug(title) + (playlistTitles.indexOf(title) === index ? '' : '-' + index),
    ownerId: userId, title, artworkKey: 'collection-' + index,
    description: [
      'Slow and spacious cuts for the ride home.',
      'A collection of small sounds and ideas from the studio.',
      'Warm textures and percussion for early hours.',
      'Releases and sketches I keep coming back to.',
    ][index % 4],
    visibility: index % 3 === 0 ? 'private' : 'public',
    trackIds: Array.from({ length: index === 4 ? 0 : index === 3 ? 1 : 3 + index % 5 },
      (_, order) => tracks[(index * 5 + order * 3) % tracks.length].id),
    createdAt: moment(40 - index),
  }))
  const comments = Array.from({ length: 56 }, (_, index) => ({
    id: index === 0 ? 'cmt-relay-bridge' : 'cmt-listener-' + (index + 1),
    trackId: tracks[index % 26].id, authorId: users[1 + (index % 24)].id,
    parentId: null, offsetSeconds: index % 4 === 3 ? null : 48 + (index * 11) % 90,
    body: notes[index % notes.length], status: 'active', createdAt: moment(46 - Math.floor(index / 3), 15),
  }))
  comments.push(...comments.slice(0, 20).map((parent, index) => ({
    id: 'cmt-reply-' + (index + 1), trackId: parent.trackId, authorId: userId,
    parentId: parent.id, offsetSeconds: parent.offsetSeconds, body: replies[index % replies.length],
    status: 'active', createdAt: parent.createdAt.replace('T15:', 'T19:'),
  })))
  const dailyStats = []
  for (let index = 0; index < 47; index += 1) {
    for (let slot = 0; slot < 1 + index % 5; slot += 1) {
      const trackId = tracks[(index * 3 + slot * 7) % 30].id
      const date = day(index)
      dailyStats.push({
        id: 'stat-' + trackId.slice(4) + '-' + date, trackId, date,
        plays: 42 + (index * 31 + slot * 17) % 226, likes: (index * 3 + slot) % 26,
        comments: (index + slot * 3) % 8, reposts: (index * 2 + slot) % 7, downloads: (index + slot) % 6,
      })
    }
  }
  return { account: { userId }, users, tracks, uploads, playlists, comments, dailyStats, insightViews: [] }
}
