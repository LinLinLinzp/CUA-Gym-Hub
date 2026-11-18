import { sampleClips } from './library.js'

const creator = {
  id: 'creator_mara_ellis',
  displayName: 'Mara Ellis',
  handle: 'fieldnotes.culture',
  workspaceName: 'Field Notes on Culture',
}

const captions = [
  'A sort of alphabet you can hold. Touring a working letterpress room. #PrintCulture #WoodType',
  'How a bookbinder gives a split spine a second life. #BookRepair #Handmade',
  'A small geometry lesson at the community loom. #TextileStories #Weaving',
  'The sign stays lit until the last person leaves the cinema. #NeonHistory #IndependentFilm',
  'A neighborhood in one drawer of contact sheets. #CommunityArchive #LocalHistory',
  'Three glaze tests from a single firing, three entirely different greens. #Ceramics #GlazeStudy',
  'Reading the backwards letters on a proof before the press rolls. #Letterpress #Typography',
  'The blue thread that held a library book together for fifty years. #Bookbinding #LibraryStories',
  'Tracing the repeat in a handwoven window panel. #Textiles #Pattern',
  'A projectionist walks us through the five-minute changeover. #CinemaCulture #35mm',
  'What a bus route looked like before the highway cut across it. #ArchiveFind #LocalHistory',
  'A potter explains why the bottom of a cup matters. #Pottery #StudioVisit',
  'The grocery lettering that survived three coats of paint. #HandPaintedSigns #Lettering',
  'A day with the volunteers who mend the reading room collection. #Libraries #Repair',
  'Looking for the tiny decision that breaks an almost perfect pattern. #Weaving #DesignDetails',
  'The last neon repair bench on the east side. #Neon #StudioVisit',
  'Reading the notes on the back of unlabeled photographs. #PhotoArchive #OralHistory',
  'A short walk through the shelf of bowls that never made it to market. #Clay #Craft',
  'Why the letter R is the hardest part of this shop sign. #SignPainting #Type',
  'A stitched map of the city, folded inside a public library book. #LocalStories #BookArts',
  'The difference between a seam that hides and a seam that decorates. #VisibleMending #Textiles',
  'Saving a cinema trailer on its original reel. #FilmArchive #IndependentCinema',
  'The ticket stub collection that tells a neighborhood story. #Ephemera #Archive',
  'Brushing a slip trail across red clay before the first firing. #Pottery #Clay',
  'Matching gold leaf to the lettering on a 1920s storefront. #Lettering #Craft',
  'A paper conservator shows how to relax a crease. #PaperRepair #Archives',
  'Learning to read the edges of a woven sample. #Weaving #Handmade',
  'What the marquee looked like before the bulbs were replaced. #Cinema #NeonHistory',
  'Rainy day inside a photo archive, looking at the corners of lost streets. #CommunityArchive',
  'The green that only appears near the hottest shelf of the kiln. #GlazeStudy #Ceramics',
  'Four printing blocks, one tiny poster for the winter fair. #PrintCulture',
  'Making a protective sleeve for a fragile fair program. #PaperConservation',
  'A close look at the red squares in an old woven runner. #TextileStories',
  'Before the doors open at the neighborhood cinema. #CinemaCulture',
  'The handwritten index behind a small-town photo collection. #CommunityArchive',
  'Sorting the glaze tiles by where they sat in the kiln. #Ceramics',
]

const draftCaptions = [
  'The neighborhood cinema before the first screening. #CinemaCulture',
  'What the repair labels tell us about a traveling book.',
  'A Saturday at the community dye garden. #Textiles',
  'Behind the glass at the old ticket booth.',
  'Walking the streets in a box of glass negatives.',
  'Comparing ash glazes from two different kilns.',
  'Two lines of wood type from the same drawer.',
  'The foldout map sewn into a field guide.',
  'A weaving sample with one missing warp thread.',
  'How a neon letter gets its first bend.',
  'The neighborhood archive cataloging day.',
  'The kiln shelf that leaves a mark on every cup.',
  'Testing the ink for a one-color broadsheet.',
  'Why a paper patch has feathered edges.',
  'The motif that repeats along a winter scarf.',
  'A silent film cue sheet from the collection.',
  'When a single photograph has six captions.',
  'Testing the angle of a pouring lip.',
  'A condensed typeface made for narrow doors.',
  'The story hidden inside a repaired cover.',
  'Three ways to finish a handwoven edge.',
  'A sign painter at work on a rainy afternoon.',
  'An invitation printed beside the ferry schedule.',
  '',
]

const viewers = [
  ['Vera Cho', 'vera_types'], ['Jon Bell', 'jonbellprints'], ['Mina Ortiz', 'mina.makes'],
  ['Ruth Levin', 'ruthinthearchive'], ['Dev Shah', 'devatthereels'], ['Eli Torres', 'eli.torres'],
  ['Noa Reed', 'noa.nearby'], ['Samir Ali', 'samircollects'], ['Jules Park', 'julesonpaper'],
  ['Celia Moss', 'celia.moss'], ['Aisha Lane', 'aishabyhand'], ['Theo King', 'theoking'],
]

const reactions = [
  ['Is that a hand-carved ampersand in the second drawer?', 'My aunt set type by hand. This brought back the sound of her workroom.', 'Do you know who made the original lettering?', 'I love seeing how the spacing changes between the proof and the print.', 'The close-up of the worn edge is beautiful.', 'Would you show the finished poster in another clip?', 'I never noticed how much the paper changes the ink color.', 'Saving this for our next print club meeting.', 'The drawer labels are a whole design lesson.', 'I can almost hear the press from here.', 'That old serif still looks so fresh.', 'The ink roller shot made me want to try this.'],
  ['Was that the original thread in the spine?', 'My library has a repair table, but I have never seen them do this part.', 'The before and after was so satisfying.', 'How do you choose paper that will age like the original?', 'I still have the book my grandmother repaired for me.', 'I would watch a longer version about the stitching.', 'The old owner’s note is such a sweet find.', 'Do they leave the repair visible on purpose?', 'I had no idea a cover could be taken apart like that.', 'This makes me see the library shelves differently.', 'The corners are always the first to go on my books.', 'I wish our town had a repair day like this.'],
  ['How many colors did the weaver use here?', 'The uneven little red squares make the pattern feel alive.', 'I recognize that shuttle from my grandmother’s loom.', 'Is that a linen warp?', 'I keep coming back to the border detail.', 'The loom is so much quieter than I imagined.', 'Do you know where the original pattern came from?', 'I want to try that edge on my first sampler.', 'The daylight makes the blue look completely different.', 'I used to pass this workshop every morning.', 'Watching the strands line up is so calming.', 'Thank you for showing the back of the piece.'],
  ['I remember this place from the Saturday matinees.', 'Does the old sign still run on its original tubes?', 'The way the light reaches the pavement is lovely.', 'How long has that marquee been there?', 'I can almost smell the lobby popcorn.', 'We had a theater like this on the next block.', 'That lettering deserves its own episode.', 'I would love to see the booth during a screening.', 'Do they keep any of the old letters backstage?', 'My first film club met under that sign.', 'There is something special about the slow light-up.', 'Glad someone is documenting places like this.'],
  ['Is that collection open to visitors?', 'The names on the back are the best part.', 'I think I recognize the corner in the third photo.', 'Were those pictures all taken by the same person?', 'We have a shoebox of these at home.', 'I would love to hear more about the volunteers.', 'It is wild how familiar an old street can feel.', 'Did the archive scan the negatives too?', 'I wonder who kept the original ticket.', 'That first photograph could be my neighborhood.', 'What a good reminder to label our own prints.', 'Please do another visit to this collection.'],
  ['Is the green from copper or ash?', 'I like the slight drip near the foot.', 'How hot do they fire these tests?', 'That matte blue looks entirely different in sunlight.', 'I never thought about where a piece sits in the kiln.', 'The little test tiles look beautiful together.', 'Is that the same clay for all three cups?', 'The potter’s shelf looks like a color chart.', 'Could you show the bowl after firing?', 'That glaze break along the edge is my favorite.', 'We had a cup just like this at home.', 'I want to see more of this studio.'],
]

const replies = [
  'It is! The printer carved it for a job about twenty years ago.',
  'Yes, most of it survived. The binder kept what was still strong.',
  'There are four colors, including the natural linen underneath.',
  'The projectionist remembered those matinees too.',
  'Yes, the reading room opens on Wednesdays and Saturdays.',
  'This green uses ash from the studio stove.',
  'The shop records credit a painter named Ida Martin.',
  'I’ll ask the conservator if we can show the paper samples.',
  'The weaver found it in a notebook from the 1960s.',
  'The lettering is from 1954. A few of the tubes are newer.',
  'Good eye. That is the corner of Ash and Fourth.',
  'The potter fired these together at cone six.',
]

const fixedId = (prefix, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`
const at = (day, hour = 16, minute = 20) => new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString()
const daysAfter = (iso, days) => new Date(Date.parse(iso) + days * 86400000).toISOString()
const counters = (views) => ({ views, likes: Math.floor(views / 12), comments: Math.floor(views / 265), shares: Math.floor(views / 105) })

function content(index, caption, createdAt, hasMedia = true) {
  const clip = sampleClips[index % sampleClips.length]
  return {
    caption, createdAt, updatedAt: createdAt, actorId: creator.id, updatedById: creator.id,
    media: hasMedia ? { ...clip.media } : null, coverUrl: hasMedia ? clip.coverUrl : null,
    visibility: ['public', 'public', 'public', 'friends', 'public', 'private'][index % 6],
    allowComments: index % 9 !== 8, allowDuet: index % 4 === 0, allowStitch: index % 3 === 0,
  }
}

export function createInitialData() {
  const posts = captions.map((caption, index) => {
    const published = index < 30
    const createdAt = at(published ? 15 - index : 13, 15 + index % 5, index * 7 % 60)
    return {
      id: fixedId('post', index), ...content(index, caption, createdAt),
      status: published ? 'published' : 'scheduled', publishedAt: published ? createdAt : null,
      scheduledAt: published ? null : at(20 + index - 30, 17, 30),
      deletedAt: null, sourceDraftId: null,
      metrics: counters(published ? 8700 + (index * 7127 + 24318) % 43000 : 0),
    }
  })
  const drafts = draftCaptions.map((caption, index) => ({
    id: fixedId('draft', index), ...content(index + 3, caption, at(17 - Math.floor(index / 2), 19 - index % 8), index % 5 !== 2),
    status: 'draft', postId: null, convertedAt: null, discardedAt: null,
  }))
  const viewersComments = Array.from({ length: 72 }, (_, index) => {
    const postIndex = index % 26
    const post = posts[postIndex]
    const [authorName, authorHandle] = viewers[(index * 7 + Math.floor(index / 6)) % viewers.length]
    const createdAt = daysAfter(post.publishedAt, 1 + Math.floor(index / 26))
    const likedByCreator = index % 7 === 0
    const likedAt = likedByCreator ? daysAfter(createdAt, 1) : null
    return {
      id: fixedId('comment', index), postId: post.id, parentCommentId: null, actorId: `viewer_${authorHandle.replace('.', '_')}`,
      authorName, authorHandle, body: reactions[postIndex % 6][Math.floor(index / 6)], status: 'visible',
      likedByCreator, likedAt, likedById: likedByCreator ? creator.id : null,
      createdAt, updatedAt: likedAt || createdAt, updatedById: likedByCreator ? creator.id : `viewer_${authorHandle.replace('.', '_')}`, deletedAt: null,
    }
  })
  const comments = [...viewersComments, ...replies.map((body, index) => {
    const parent = viewersComments[index]
    const createdAt = daysAfter(parent.createdAt, 1)
    return {
      id: fixedId('reply', index), postId: parent.postId, parentCommentId: parent.id, actorId: creator.id,
      authorName: creator.displayName, authorHandle: creator.handle, body, status: 'visible',
      likedByCreator: false, likedAt: null, likedById: null, deletedAt: null,
      createdAt, updatedAt: createdAt, updatedById: creator.id,
    }
  })]
  const analyticsSamples = Array.from({ length: 56 }, (_, index) => {
    const date = at(index - 39).slice(0, 10)
    const views = Math.round(4100 + index * 118 + Math.sin(index * 1.55) * 1250 + Math.cos(index * 0.48) * 1700)
    return { id: `sample_account_${date}`, date, postId: null, ...counters(views), profileViews: Math.round(views / 21), netFollowers: Math.round(views / 230) - (index % 7 === 2 ? 33 : 0) }
  })
  posts.filter((post) => post.status === 'published').forEach((post, index) => {
    for (let day = 0; day < 7; day++) {
      const date = daysAfter(post.publishedAt, day).slice(0, 10)
      if (date > '2026-11-16') break
      const views = Math.round(post.metrics.views * (8 - day) / 75) + day * 17
      analyticsSamples.push({ id: `sample_${post.id}_${date}`, date, postId: post.id, ...counters(views) })
    }
  })
  return { account: { ...creator }, posts, drafts, comments, analyticsSamples, analyticsReports: [] }
}
