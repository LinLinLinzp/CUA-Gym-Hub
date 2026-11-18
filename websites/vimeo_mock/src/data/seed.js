const films = [
  ['Low Tide, Early Light', 'A field study of the salt marsh before the first ferry.', 'marsh', 'coast,documentary'],
  ['The Letterpress Room', 'A printer sorts wood type in a workshop that has changed little since 1962.', 'press', 'craft,portrait'],
  ['After the Last Screening', 'The staff of an independent cinema close up after its final Sunday show.', 'cinema', 'cinema,portrait'],
  ['A Map of Small Rivers', 'Field recordings from three tributaries and the towns they pass through.', 'river', 'water,field recording'],
  ['The Sound of Timber', 'A boatbuilder listens for the grain that will become a keel.', 'press', 'craft,coast'],
  ['Blue Hour at Pier Nine', 'The lights come on at the end of a working pier.', 'pier', 'coast,field recording'],
  ['Quiet Rehearsal', 'Dancers test the spacing before the house opens.', 'stage', 'performance,documentary'],
  ['Where the Breakwater Ends', 'A walk along the stone line between harbor and open sea.', 'pier', 'coast,water'],
  ['From the Projection Booth', 'A projectionist threads a reel for a Saturday matinee.', 'cinema', 'cinema,craft'],
  ['Between the Reeds', 'Wind and water move through a stand of winter reeds.', 'marsh', 'water,field recording'],
  ['Mending the Nets', 'Three neighbors mend fishing nets over a long lunch.', 'press', 'craft,coast'],
  ['The Green Room', 'Oral histories from the smallest theater on the circuit.', 'stage', 'performance,oral history'],
  ['A Bend in the Estuary', 'A morning survey follows birds across an estuary.', 'river', 'water,coast'],
  ['Handbound', 'A bookbinder makes room for the last signature.', 'press', 'craft,portrait'],
  ['Street of Marquees', 'The old cinema signs still mark the route through town.', 'cinema', 'cinema,architecture'],
  ['Ferry Weather', 'The first crossing after the fog lifts.', 'pier', 'coast,documentary'],
  ['One Hundred Steps Down', 'A stairwell leads to a sheltered bank beneath the city.', 'river', 'architecture,water'],
  ['Light Cue Number Four', 'A lighting study from an empty stage.', 'stage', 'performance,field recording'],
  ['The Last Orchard', 'An orchard keeper shares the stories behind five varieties.', 'marsh', 'oral history,portrait'],
  ['Tin Roof Studio', 'A potter opens the kiln after a night of rain.', 'press', 'craft,portrait'],
  ['Tickets at the Window', 'Conversations with a cinema team on opening night.', 'cinema', 'cinema,oral history'],
  ['Salt on the Windowsill', 'A coastal resident reads letters sent home from sea.', 'pier', 'coast,oral history'],
  ['Borrowed Light', 'Window light changes across a set between takes.', 'stage', 'performance,craft'],
  ['A Footbridge in Spring', 'A fixed camera watches the river rise below a footbridge.', 'river', 'water,field recording'],
  ['The Reed Cutters', 'A small crew harvests reeds by hand before the thaw.', 'marsh', 'craft,documentary'],
  ['Paper Dust', 'Proof sheets and photographs from a neighborhood print shop.', 'press', 'craft,oral history'],
  ['Balcony Seats', 'An usher recalls the films that drew a full house.', 'cinema', 'cinema,oral history'],
  ['Beyond the Harbor Wall', 'Open water recorded from the harbor entrance at dusk.', 'pier', 'coast,field recording'],
  ['House Lights', 'The company takes its final bow of the season.', 'stage', 'performance,documentary'],
  ['Upstream from Mill Road', 'Stone channels reveal the footprint of an old mill.', 'river', 'water,architecture'],
  ['The Winter Hide', 'A dawn recording from a wooden bird hide.', 'marsh', 'field recording,documentary'],
  ['Glaze Notes', 'A studio catalog of small experiments with ash glaze.', 'press', 'craft,documentary'],
  ['Sunday Double Feature', 'A pair of short interviews recorded between screenings.', 'cinema', 'cinema,portrait'],
  ['Lanterns on the Quay', 'A harbor procession remembered in sound and light.', 'pier', 'coast,oral history'],
  ['Marking the Floor', 'Set builders lay out a small touring production.', 'stage', 'performance,craft'],
  ['Headwaters', 'A walk from the road to the source of a tributary.', 'river', 'water,documentary'],
]

const collections = [
  ['Waterlines', 'Short films following rivers, shorelines, and the people beside them.', [1, 8, 13, 24]],
  ['Festival Shortlist', 'The studio’s selections for the fall screening program.', [2, 3, 4, 7, 22]],
  ['The Working Archive', 'Studies of the spaces and methods behind the work.', [5, 9, 14, 20, 26]],
  ['Along the Coast', 'A set of films from the edge of the water.', [6, 8, 16, 28, 34]],
  ['In the Workshop', 'Craft portraits recorded at the bench.', [2, 5, 11, 14, 32]],
  ['After Hours', 'The spaces that take on a different character once the public leaves.', [3, 18, 21, 29]],
  ['Listening Posts', 'Field recordings with an emphasis on ambient sound.', [4, 10, 28, 31]],
  ['In Conversation', 'Individual stories told in the places they happened.', [12, 19, 22, 27]],
  ['Small Rooms, Big Screens', 'Projection booths, marquees and memories of local cinema.', [9, 15, 21, 33]],
  ['On Stage', 'Rehearsals and behind-the-scenes footage from local productions.', [7, 12, 29, 35]],
  ['Estuary Studies', 'Birds, reeds and passing weather on the estuary.', [1, 10, 13, 25]],
  ['Sunday Matinee', 'A relaxed program for an afternoon screening.', [3, 14, 27, 33]],
  ['River Notes', 'Surveys and recordings from the watershed.', [4, 17, 24, 30, 36]],
  ['Accounts of Home', 'Recorded recollections of familiar places.', [19, 22, 26, 34]],
  ['Hands at Work', 'Close observations of tools and practiced gestures.', [2, 11, 20, 35]],
  ['Dusk and Dawn', 'Available-light footage from both ends of the day.', [1, 6, 16, 28]],
  ['Light on the Set', 'Lighting experiments documented during rehearsals.', [7, 18, 23, 29]],
  ['The Built Town', 'A walk through the town’s overlooked architecture.', [9, 15, 17, 30]],
  ['Winter Fieldwork', 'Recordings made in the cold months.', [10, 19, 25, 31]],
  ['Early Cuts', 'Rough cuts grouped for an internal screening.', [1, 2, 4, 23]],
  ['Water and Stone', 'Documentary studies of channels and crossings.', [8, 17, 24, 30]],
  ['Voices from the Harbor', 'Stories and recordings from the working waterfront.', [6, 11, 22, 34]],
  ['Screening Room', 'A compact program for studio visitors.', [3, 7, 14, 36]],
  ['Next Program', 'A collection reserved for the next studio screening.', []],
]

const people = [
  ['Morgan Reyes', 'Owner', 'MR'], ['Anika Shaw', 'Producer', 'AS'],
  ['Felix Okafor', 'Editor', 'FO'], ['Rowan Ellis', 'Reviewer', 'RE'],
  ['Tess Varga', 'Editor', 'TV'], ['Inez Chen', 'Producer', 'IC'],
  ['Samir Patel', 'Reviewer', 'SP'], ['June Wallace', 'Reviewer', 'JW'],
]

const notes = [
  ['Could we let the opening frame breathe for another beat?', 'I left room for that adjustment in the next cut.'],
  ['The cut here feels right. Keep the room tone underneath it.', 'Agreed. I’ll carry the ambient track through the cut.'],
  ['Check the exposure in the wide shot before export.', 'I flagged the wide shot in the grading notes.'],
  ['The transition reads clearly now. Ready for the screening edit.', 'Thanks. I’ve kept this version in the edit folder.'],
  ['A slightly tighter crop here might bring out the movement.', 'I’ll compare both crops with the full sequence.'],
  ['Can we bring up the location audio in this section?', 'I have a clean recording from the second take.'],
  ['Could we carry this image into the closing sequence?', 'I’ll see how it feels against the final sound cue.'],
  ['The opening establishes the location well.', 'Agreed. It holds up well in the full sequence.'],
  ['Please check the spelling in the credits against the production notes.', 'I’ll check with the producer before the next export.'],
]

const idFor = (prefix, number, width = 3) => `${prefix}_${String(number).padStart(width, '0')}`
const date = (days, hours = 10) => new Date(Date.UTC(2026, 6, 6 + days, hours, 30)).toISOString()
const actor = (index) => idFor('person', (index % people.length) + 1, 2)
const videoModes = ['unlisted', 'private', 'public', 'password', 'embed_only']
const showcaseModes = ['private', 'public', 'password', 'embed_only']

export function createInitialData() {
  const videos = films.map(([title, description, subject, tags], index) => {
    const mode = videoModes[index % videoModes.length]
    return {
      id: idFor('video', index + 1), title, description, tags: tags.split(','),
      thumbnailKey: index === 0 ? 'marsh-dawn' : `${subject}-${index % 4 + 1}`,
      durationSeconds: index === 0 ? 8 : 38 + (index * 73) % 558,
      source: index === 0 ? { kind: 'local', url: '/media/marsh.webm' } : null,
      privacy: { mode, password: mode === 'password' ? 'field-screening' : null, allowDownloads: false },
      createdAt: date(index), createdBy: actor(index + 1),
      updatedAt: date(index < 4 ? 42 - index : index + 2, 13), updatedBy: actor(index),
    }
  })
  const showcases = collections.map(([title, description, members], index) => {
    const mode = showcaseModes[index % showcaseModes.length]
    return {
      id: idFor('showcase', index + 1), title, description,
      videoIds: members.map((number) => idFor('video', number)),
      privacy: { mode, password: mode === 'password' ? 'studio-screening' : null },
      createdAt: date(index < 3 ? 42 - index : index + 4), createdBy: actor(index),
      updatedAt: date(index < 3 ? 42 - index : index + 4, 15), updatedBy: actor(index),
    }
  })
  const reviewComments = videos.slice(0, 18).flatMap((video, videoIndex) =>
    Array.from({ length: 4 }, (_, position) => {
      const isReply = position % 2 === 1
      const threadIndex = Math.floor(position / 2)
      const number = videoIndex * 4 + position + 1
      const resolved = threadIndex === 1 && videoIndex % 3 === 0
      const authorId = actor(videoIndex + position + 2)
      return {
        id: idFor('comment', number), videoId: video.id,
        parentId: isReply ? idFor('comment', number - 1) : null,
        body: notes[(videoIndex * 2 + threadIndex) % notes.length][isReply ? 1 : 0],
        timeSeconds: isReply || (videoIndex + threadIndex) % 5 === 4 ? null : Math.floor(video.durationSeconds * (threadIndex ? 0.7 : 0.25)),
        authorId, status: resolved ? 'resolved' : 'open',
        createdAt: date(videoIndex + 2, 11 + position), updatedAt: date(videoIndex + 2, resolved ? 17 : 11 + position),
        updatedBy: resolved ? actor(0) : authorId, resolvedAt: resolved ? date(videoIndex + 2, 17) : null,
        resolvedBy: resolved ? actor(0) : null,
      }
    }),
  )
  return {
    account: { id: 'account_northline', name: 'Northline Documentary Studio', currentUserId: 'person_01' },
    people: people.map(([name, role, initials], index) => ({ id: actor(index), name, role, initials })),
    videos, showcases, reviewComments, activity: [],
  }
}
