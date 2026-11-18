const titles = [
  ['Lanterns Under Glass', 'A ferry dispatcher pieces together a map left behind in the station lost and found.'],
  ['The Quiet Meridian', 'Two sisters follow a decommissioned survey line into the hills where their father vanished.'],
  ['Northbound at Dawn', 'A station attendant spends her last shift returning a suitcase to its owner.'],
  ['Winter Frequency', 'An amateur radio club hears a signal from a mountain observatory thought to be abandoned.'],
  ['A House for the Tide', 'A builder returns to an island where every house is moved before the winter floods.'],
  ['The Last Orchard', 'A reluctant heir and her neighbors share the work of saving a hillside orchard.'],
  ['Blue Hour District', 'A diner cook records the changing lives of customers who arrive just before sunrise.'],
  ['The Paper Astronomer', 'A bookbinder finds calculations tucked inside a set of nineteenth-century journals.'],
  ['Wild Signal', 'A wildlife researcher tracks a transmission that changes whenever the caribou move.'],
  ['Salt on the Windows', 'Three siblings negotiate the sale of their childhood home as a coastal storm rolls in.'],
  ['Every Other Sunday', 'A girl and her grandmother make a small paper town during their fortnightly visits.'],
  ['The Hidden Platform', 'A commuter follows an old transfer ticket to a station missing from every modern map.'],
  ['Map of the Floodplain', 'A surveyor and a retired ranger look for the homes lost when a river changed course.'],
  ['Two Seats by the Window', 'Two strangers share a train table and spend the journey rehearsing conversations they dread.'],
  ['A Bridge in November', 'A photographer returns to document a bridge before the county takes it down.'],
  ['Rooftop Weather', 'A neighborhood watch agrees to host a rooftop weather station and quarrels over who gets to forecast.'],
  ['The Longest Crossing', 'A cyclist plans a solo crossing but finds herself traveling with a stranded marching band.'],
  ['The Quiet Passenger', 'A bus driver recognizes a passenger from a route that stopped running twenty years ago.'],
  ['Letters from Fern Lake', 'A volunteer at a summer camp answers letters she finds hidden behind a cabin wall.'],
  ['Tin Roof Summer', 'A family prepares for a community concert while patching the roof of its old practice hall.'],
  ['The Low Season', 'A hotel caretaker tries to keep an offseason booking secret from the regulars.'],
  ['Borrowed Light', 'A projectionist rigs a temporary cinema in a mining town after its only theater closes.'],
  ['The Archive Below', 'A clerk sent to catalogue a basement archive discovers records that refer to the office upstairs.'],
  ['Four O’Clock in Harbor Town', 'A newly arrived librarian takes over the daily harbor report on local radio.'],
  ['The Meadow Line', 'Two farmers have one afternoon to decide where a boundary fence should run.'],
  ['After the Snowplows', 'A snow crew races to clear the back roads in time for a small town’s first winter festival.'],
  ['Juniper Road', 'A courier taking the old highway goes looking for the sender of an unmarked parcel.'],
  ['The Olive Room', 'A restaurant manager invites the former kitchen crew back to recreate a lost menu.'],
  ['Half a Moon Left', 'A teenager repairs a homemade telescope during the last week of summer.'],
  ['Hinterland Post', 'A substitute mail carrier learns which rural addresses matter most when a main road closes.'],
  ['How to Fold a River', 'An afternoon with a paper artist traces how maps become three-dimensional sculptures.'],
  ['The Red Switch', 'A sound technician inherits a studio console with a button nobody can identify.'],
  ['Rosewood Repair Shop', 'A repair shop tries to meet all of its outstanding promises before its lease expires.'],
  ['Dog-Eared Days', 'A used book seller traces handwritten notes left by a customer in dozens of donated novels.'],
  ['The Figure on the Jetty', 'A harbor volunteer combs old tide charts to identify a person in a damaged photograph.'],
  ['White Pines, Late Shift', 'A forestry crew makes its last round of the season from a half-empty lookout station.'],
  ['Ordinary Meteors', 'A science teacher and her former students attempt to record the same meteor shower from five towns.'],
  ['A Little Further West', 'Two cousins inherit a van and drive west to deliver its boxes to their original owners.'],
  ['The Blue Telephone', 'An operator reconstructs the last call made from a telephone booth on a vanished street.'],
  ['Low Water Mark', 'An unusually dry summer reveals the foundations of a village submerged decades earlier.'],
  ['The Night Orchard', 'A fruit picker discovers a row of trees that blooms long after the rest of the orchard.'],
  ['Cinder and Clay', 'Two potters try a centuries-old firing technique with materials found near a closed rail yard.'],
  ['Small Hours Station', 'Three security guards share a quiet overnight shift at a radio station due to go off air.'],
  ['Two Weeks in Alder Bay', 'A visitor takes a temporary job on the harbor and stays long enough to learn who built it.'],
  ['The Glass Museum', 'A conservator reconstructs a damaged sculpture with help from an apprentice glassblower.'],
  ['Ebb Season', 'An empty seaside shop becomes a meeting place for people waiting out the winter.'],
  ['Borrowed Light', 'An exhausted portrait photographer asks her neighbors to lend lamps for one final sitting.'],
  ['All the Streetlights', 'A maintenance crew tests the city’s new lamps while residents tell stories about the old ones.'],
  ['Blackwater Almanac', 'A journalist follows a planting calendar whose predictions no longer match the weather.'],
  ['The Bell Foundry', 'A foundry casts a replacement bell with the help of the original maker’s grandchildren.'],
  ['The Soft Landing', 'An amateur balloonist asks a neighboring farmer to help recover the basket before a storm.'],
  ['Song for the Causeway', 'A choir writes a piece to perform during the brief window when a tidal path is exposed.'],
  ['Three Stops to Briar', 'A shuttle driver and two passengers share a detour through an old industrial neighborhood.'],
  ['Above the Fog Line', 'A visitor at a mountain hostel returns each morning to photograph a cloud-filled valley.'],
  ['An Inventory of Quiet', 'A field recordist visits libraries, stairwells, and train depots collecting short stretches of silence.'],
  ['River Ice', 'A crew prepares to cross the river before the thaw forces it to abandon an annual expedition.'],
  ['The Folded Coast', 'An engineer retraces a childhood camping trip with the last printed version of a coastal map.'],
  ['A Season at Quarry House', 'A caretaker has one summer to reopen a quarry manager’s house as a local museum.'],
  ['Houses with Open Doors', 'A carpenter repairs the doors on an old street and learns how its residents trade favors.'],
  ['The Sandbar Letters', 'A postal historian tries to identify a set of letters recovered from a stranded boat.'],
  ['Milk Glass Morning', 'A baker, a milkman, and a passenger with a missed connection meet before the city wakes.'],
  ['Field Notes in Violet', 'A botanist revisits the gardens documented by a volunteer naturalist a century earlier.'],
  ['Before the Drawbridge', 'A municipal electrician spends his last shift working alongside the person replacing him.'],
  ['Walking in Headwind', 'A radio producer retraces the path of a long-distance walker whose journal ends abruptly.'],
  ['The Weight of November', 'A family postpones a move while its neighborhood prepares for an unseasonably early snow.'],
  ['Late Delivery', 'A courier and a night porter try to deliver an overdue parcel without a name or apartment number.'],
  ['Orbits of a Small Town', 'A traveling planetarium visits the school where its founder first learned the night sky.'],
  ['Midnight Cartography', 'A cartographer updates a street map by walking the city after the daytime traffic clears.'],
  ['Six Minutes of Rain'],
  ['The Pilot House', 'A trainee takes a shift in a harbor control room ahead of the year’s first heavy fog.'],
  ['Weathervane Street', 'A retired metalworker builds a new weather vane for each house on her street.'],
  ['Night Ferry to Bellport', 'A deckhand and an unexpected passenger ride the final ferry before a coastal route closes for the season.'],
]

const genres = [
  ['Drama', 'Mystery'], ['Mystery', 'Thriller'], ['Drama', 'Adventure'], ['Sci-Fi', 'Mystery'],
  ['Drama', 'Romance'], ['Documentary'], ['Comedy', 'Drama'], ['History', 'Drama'],
  ['Adventure', 'Sci-Fi'], ['Thriller'], ['Animation', 'Fantasy'], ['Mystery', 'Drama'],
]
const listNames = [
  'Rainy Night Mysteries', 'Night Bus Cinema', 'Kitchen Table Dramas', 'Stories at the Waterline',
  'Twenty-Minute Escapes', 'The Long Way Home', 'Sunday Matinees', 'Signals in the Dark',
  'Offseason on the Coast', 'What We Watched in October', 'Ordinary Wonders', 'Mountain Stories',
  'Little Towns, Big Weather', 'Dispatches from the Future', 'Winter Double Features',
  'The Family Archive', 'Quiet Comedies', 'First Features', 'Handmade Worlds', 'After the Last Train',
  'A Week of Shorts', 'To Revisit', 'Saturday with Friends', 'Ideas for Film Club',
]
const art = ['lanterns-under-glass', 'quiet-meridian', 'northbound-at-dawn', 'winter-frequency',
  'house-for-the-tide', 'last-orchard', 'blue-hour-district', 'paper-astronomer', 'bellport', 'archive',
  'river', 'headwind']
const userId = 'user-001'
const numbered = (prefix, n) => prefix + '-' + String(n).padStart(3, '0')
const stamp = (day, hour = 19, month = '10') =>
  '2025-' + month + '-' + String(day).padStart(2, '0') + 'T' + String(hour).padStart(2, '0') + ':25:00.000Z'
const titleId = (i) => numbered('title', i)

export function createInitialData() {
  const catalog = titles.map(([name, synopsis], i) => {
    const year = i === 21 ? 1998 : i === 46 ? 2023 : i === 0 ? 2021 : 1997 + (i * 11 % 28)
    const type = i === 0 ? 'movie' : ['movie', 'tvSeries', 'movie', 'tvSeries', 'movie', 'short', 'movie', 'tvEpisode'][i % 8]
    return {
      id: titleId(i + 1), name, type, year,
      ...(i === 53 ? {} : { releaseDate: year + (i === 0 ? '-10-08' : '-09-15'), certificate: type === 'tvSeries' ? 'TV-14' : 'PG-13' }),
      runtimeMinutes: type === 'movie' ? 108 + (i * 13 % 34) : type === 'short' ? 12 + i % 14 : 42 + i % 16,
      genres: [...genres[i % genres.length]],
      ...(i === 63 ? {} : { imdbRating: i === 0 ? 7.8 : (62 + i * 7 % 27) / 10 }),
      ...(synopsis ? { synopsis } : {}),
      ...(i === 69 ? {} : { posterPath: '/art/' + art[i === 71 ? 8 : i % art.length] + '.webp' }),
    }
  })
  const watchlist = Array.from({ length: 26 }, (_, i) => ({
    id: numbered('watch', i + 1), userId, titleId: titleId(i + 1), position: i + 1, createdAt: stamp(i + 1),
  }))
  const ratings = Array.from({ length: 32 }, (_, i) => ({
    id: numbered('rating', i + 1), userId, titleId: titleId(8 + i * 2),
    value: i === 0 ? 9 : (i * 7 % 10) + 1,
    createdAt: stamp(i % 26 + 1, 20, '09'), updatedAt: stamp(i % 27 + 1, 13, '11'),
  }))
  const lists = listNames.map((name, i) => ({
    id: numbered('list', i + 1), userId, name,
    description: [
      'Slow-burn cases and coastal settings for a rainy evening.',
      'Films and series for the hours after the city gets quiet.',
      'Stories that find their turning points in ordinary rooms.',
    ][i] || '',
    visibility: i % 3 === 1 ? 'public' : 'private',
    createdAt: stamp(i + 1, 14, '09'), updatedAt: stamp(24 - i),
  }))
  const listItems = lists.flatMap((list, i) => Array.from({
    length: i === 0 ? 12 : i === 1 ? 6 : i === 2 ? 5 : i === 21 ? 1 : i === 22 ? 2 : i === 23 ? 0 : 4,
  }, (_, j) => ({
    id: numbered('list-item', i * 12 + j + 1), userId, listId: list.id,
    titleId: titleId((i * 7 + j * 3) % 71 + 1), position: j + 1, createdAt: list.updatedAt,
  })))
  return {
    user: { id: userId, displayName: 'Morgan Ellis', watchlistVisibility: 'private', ratingsVisibility: 'public' },
    titles: catalog, watchlist, ratings, lists, listItems, stateEvents: [],
  }
}
