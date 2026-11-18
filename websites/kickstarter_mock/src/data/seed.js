const creator = 'creator-maya'

const portfolio = [
  ['floodlights', 'After the Floodlights', 'Film & Video', 'live', 'Cleveland, OH', 'A documentary about the last year of a neighborhood football ground.', 'floodlights'],
  ['night-bus', 'Field Notes from the Night Bus', 'Publishing', 'funded', 'Detroit, MI', 'A photo book about the people who keep a city moving after midnight.', 'night-bus'],
  ['common-thread', 'The Common Thread', 'Art', 'funded', 'Providence, RI', 'A textile and illustration anthology about the stories stitched into everyday objects.', 'common-thread'],
  ['signal-grain', 'Signal & Grain', 'Music', 'draft', 'Oakland, CA', 'Field recordings, hand-cut loops and a book of recording notes.', 'signal-grain'],
  ['tideline', 'At the Tideline', 'Publishing', 'funded', 'Portland, ME', 'Essays and cyanotypes from a year of walking the Maine coast.', 'coast'],
  ['paper-garden', 'Paper Garden Almanac', 'Art', 'funded', 'Madison, WI', 'A hand-bound almanac of backyard plants in cut-paper illustrations.', 'paper'],
  ['map-room', 'The Map Room', 'Comics', 'funded', 'Minneapolis, MN', 'An illustrated mystery set in the basement of a public library.', 'night-bus'],
  ['subway-choir', 'The Subway Choir', 'Music', 'funded', 'Brooklyn, NY', 'A live record made with the singers of three New York subway stations.', 'signal-grain'],
  ['broken-orbit', 'A Broken Orbit', 'Comics', 'funded', 'Baltimore, MD', 'An intergenerational science-fiction story about a family of satellite repairers.', 'floodlights'],
  ['migration-index', 'The Migration Index', 'Publishing', 'funded', 'Tucson, AZ', 'An annotated field guide to desert birds and the routes they follow.', 'paper'],
  ['salt-house', 'Song for a Salt House', 'Film & Video', 'funded', 'New Orleans, LA', 'A short film about a musician returning to a changing coastal town.', 'coast'],
  ['window-seat', 'The Window Seat', 'Publishing', 'live', 'Pittsburgh, PA', 'A folding book of observations from a long-distance train.', 'night-bus'],
  ['kiln', 'Kiln Season', 'Film & Video', 'live', 'Asheville, NC', 'Three potters fire a shared wood kiln through a long winter.', 'floodlights'],
  ['street-atlas', 'A Street Atlas of Small Things', 'Art', 'live', 'Philadelphia, PA', 'A set of letterpress maps for overlooked landmarks and objects.', 'common-thread'],
  ['archive-of-rain', 'Archive of Rain', 'Music', 'live', 'Seattle, WA', 'Six compositions that blend bowed strings with Pacific Northwest weather.', 'coast'],
  ['stacks', 'Between the Stacks', 'Comics', 'unsuccessful', 'Columbus, OH', 'A comic collection about used books and the notes people leave in them.', 'paper'],
  ['last-wild', 'Last Wild Orchard', 'Film & Video', 'live', 'Ithaca, NY', 'A documentary following volunteers who care for a heritage apple orchard.', 'paper'],
  ['walking-pamphlets', 'Walking Pamphlets', 'Publishing', 'draft', 'Boston, MA', 'Six pocket essays designed to be read while walking a neighborhood.', 'coast'],
  ['rust-choir', 'Rust Choir', 'Music', 'unsuccessful', 'Buffalo, NY', 'A percussion record made with objects reclaimed from factory floors.', 'signal-grain'],
  ['slow-river', 'Slow River Press', 'Publishing', 'live', 'Richmond, VA', 'A new edition of local river stories with hand-printed maps.', 'coast'],
  ['night-market', 'Night Market Stories', 'Comics', 'unsuccessful', 'Queens, NY', 'Short comics about the cooks and vendors at a late-night food market.', 'night-bus'],
  ['porch-lights', 'Porch Lights', 'Film & Video', 'live', 'Louisville, KY', 'A film about the neighbors who run a front-porch concert series.', 'floodlights'],
  ['cut-glass', 'Cut Glass Sketchbook', 'Art', 'draft', 'Milwaukee, WI', 'A print portfolio drawn from a collection of colored glass patterns.', 'common-thread'],
  ['good-migrations', 'Good Migrations', 'Comics', 'live', 'Sacramento, CA', 'A road comic about two friends moving a small bookshop across the state.', 'paper'],
  ['weather-journal', 'The Weather Journal', 'Publishing', 'unsuccessful', 'Montpelier, VT', 'A set of illustrated notebooks inspired by 40 years of weather diaries.', 'coast'],
  ['fourth-side', 'The Fourth Side', 'Music', 'live', 'Austin, TX', 'An improvised album with illustrated liner notes from three sessions.', 'signal-grain'],
  ['repair-notes', 'Repair Notes', 'Art', 'live', 'Santa Fe, NM', 'Prints about the small marks that show how everyday things have been repaired.', 'common-thread'],
  ['blue-hour', 'Blue Hour Dispatches', 'Film & Video', 'draft', 'Portland, OR', 'Four short films made at the edge of daylight.', 'night-bus'],
]

function iso(month, day, hour = 15) {
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${hour}:00:00.000Z`
}

function metadata(createdAt, updatedAt = createdAt) {
  return { createdAt, updatedAt, createdBy: creator, updatedBy: creator }
}

function campaign(entry, index) {
  const [key, title, category, status, location, blurb, coverKey] = entry
  const goal = index === 0 ? 22000 : 2800 + ((index * 2750) % 26500)
  const pledgedAmount = status === 'draft' ? 0 : status === 'funded' ? goal + 920 + index * 174 : Math.round(goal * (.42 + (index % 7) * .075))
  const context = {
    'Film & Video': 'Pledges cover editing, sound mixing and the first community screening.',
    Publishing: 'Pledges cover copyediting, proofing and the first print run.',
    Art: 'Pledges cover materials, studio time and the print edition.',
    Comics: 'Pledges cover lettering, color proofs and production of the bound collection.',
    Music: 'Pledges cover rehearsal, mastering and the first physical edition.',
  }
  return {
    id: 'project-' + key, title, category, status, location, blurb, coverKey,
    story: `${blurb}\n\n${context[category]} We will share work in progress as we prepare the finished project.`,
    risks: category === 'Film & Video'
      ? 'Festival submissions may shift the public premiere. We will share dates as soon as they are confirmed.'
      : 'Production and material lead times may affect delivery. We have time set aside for proofs and will share any schedule changes.',
    currency: 'USD', fundingGoal: goal,
    deadline: status === 'funded' || status === 'unsuccessful' ? `2026-09-${String(5 + index % 20).padStart(2, '0')}` : '2026-12-15',
    pledgedAmount: index === 0 ? 16420 : pledgedAmount, backerCount: index === 0 ? 287 : Math.floor(pledgedAmount / (45 + index % 20)),
    launchedAt: status === 'draft' ? null : status === 'live' ? iso(11, 5) : iso(8, 12),
    ...metadata(status === 'draft' || status === 'live' ? iso(10, 5) : iso(8, 3), iso(index < 15 ? 11 : 10, index < 15 ? 16 - index : 30 - index)),
  }
}

const namedRewards = {
  floodlights: [['screening', 'Screening Pass', 35], ['poster', 'Letterpress Poster', 24], ['digital', 'Digital Film Pass', 15]],
  'common-thread': [['print', 'Studio Print', 48], ['swatches', 'Swatch Sampler', 12], ['book', 'Anthology and Print', 82]],
  'night-bus': [['book', 'Night Bus Photo Book', 48], ['print', 'Night Route Print', 18], ['signed', 'Signed Photo Book', 72]],
  'signal-grain': [['digital', 'Digital Listening Edition', 14], ['notes', 'Printed Recording Notes', 16], ['vinyl', 'Record and Notes', 52]],
}

function campaignRewards(project, key, index) {
  const presets = namedRewards[key] || [
    ['edition', 'First Edition', 25 + index % 9],
    ['print', 'Studio Print Add-on', 15 + index % 7],
    ['signed', 'Signed Studio Edition', 55 + index % 12],
  ]
  return presets.slice(0, index < 16 ? 3 : 2).map(([slug, title, minimumPledge], position) => {
    const digital = ['screening', 'digital'].includes(slug)
    const screening = slug === 'screening'
    const archived = index > 11 && index % 6 === 0 && position === 1
    return {
      id: `reward-${key === 'common-thread' ? 'thread' : key}-${slug}`, projectId: project.id,
      type: position === 1 ? 'add_on' : 'tier', title, minimumPledge,
      description: screening ? 'Two seats at the first community screening.' : `${title} from the ${project.title} campaign.`,
      estimatedDelivery: '2027-04',
      items: [{ name: screening ? 'Screening ticket' : title, quantity: screening ? 2 : 1 }],
      quantityLimit: position === 0 ? 80 : position === 1 ? 100 : null,
      claimedQuantity: project.status === 'draft' || position === 1 ? 0 : screening ? 41 : 11 + (index * 7 + position * 4) % 52,
      deliveryMethod: digital ? 'digital' : 'shipping',
      shipping: digital ? [] : [{ destination: 'United States', amount: 7 }, { destination: 'Canada', amount: 14 }],
      status: archived ? 'archived' : 'active', archivedAt: archived ? iso(11, 6) : null,
      ...metadata(project.createdAt),
    }
  })
}

const firstNames = ['Jules', 'Mara', 'Emil', 'Nina', 'Owen', 'Anika', 'Tess', 'Mateo', 'Rina', 'Imani', 'Noah', 'Sofia']
const lastNames = ['Navarro', 'Park', 'Bennett', 'Dawson', 'Mills', 'Rojas', 'Carter', 'Singh', 'Brooks', 'Evans', 'Reed', 'Kim']

function campaignBackers(project, key, index, tiers) {
  const prefix = key === 'common-thread' ? 'thread' : key
  return Array.from({ length: 8 }, (_, position) => {
    const tier = tiers[key === 'common-thread' ? 0 : position % tiers.length]
    const name = key === 'common-thread' && position === 4
      ? 'Jules Navarro'
      : firstNames[(index + position) % firstNames.length] + ' ' + lastNames[(index * 3 + position * 5) % lastNames.length]
    return {
      id: `backer-${prefix}-${String((key === 'common-thread' ? 10 : 1) + position).padStart(3, '0')}`,
      projectId: project.id, rewardId: key === 'night-bus' && position === 7 ? null : tier.id,
      name, pledgeAmount: tier.minimumPledge + 5 * (position % 3),
      paymentStatus: key === 'night-bus' && position === 5 ? 'failed' : key === 'night-bus' && position === 6 ? 'pending' : 'paid',
      createdAt: iso(project.status === 'live' ? 11 : 8, project.status === 'live' ? 6 + position : 18 + position, 11),
    }
  })
}

function campaignSurvey(project, key, backers) {
  const prefix = key === 'common-thread' ? 'thread' : key
  const garment = key === 'common-thread'
  const sent = project.status === 'funded' && key !== 'night-bus'
  const questions = [{
    id: `question-${prefix}-${garment ? 'paper' : 'credit'}`,
    label: garment ? 'Which paper finish would you like?' : 'What name should we use in the supporter credits?',
    type: garment ? 'single_choice' : 'short_text', required: true, options: garment ? ['Matte', 'Textured'] : [],
  }]
  const ids = sent ? backers.map(backer => backer.id) : []
  const sentAt = sent ? iso(10, 2, 16) : null
  return {
    id: `survey-${prefix}-fulfillment`, projectId: project.id,
    title: garment ? 'Choose your print' : key === 'night-bus' ? 'Confirm your book delivery' : 'Reward fulfillment survey',
    intro: garment ? 'Help us prepare your parcel.' : 'Tell us how to prepare your reward and credit your support.',
    collectShippingAddress: project.category !== 'Music', questions,
    status: sent ? 'sent' : 'draft', sentAt, sentBy: sent ? creator : null, recipientBackerIds: ids, recipientCount: ids.length,
    ...metadata(sent ? iso(9, 25) : project.updatedAt, sentAt || project.updatedAt),
  }
}

function campaignUpdates(project, key, index) {
  const active = project.status !== 'draft'
  const editorial = {
    'Film & Video': ['A new cut from the edit room', 'We finished a first assembly this week and are gathering notes from the crew.'],
    Publishing: ['The first proofs are in', 'We spent the week with the printer, adjusting paper and checking the layout in person.'],
    Art: ['Print tests from the studio', 'We put the first inks on paper this week. The proofs are drying before we make our final selections.'],
    Comics: ['Pages from the studio', 'The lettering pass is complete. We are checking the pacing of the final chapter before proofing.'],
    Music: ['A note from the recording room', 'The rough mixes are ready, and we have started sequencing the finished tracks.'],
  }
  const [headline, copy] = editorial[project.category]
  const updates = [
    key === 'floodlights'
      ? ['A rain delay and a new interview', 'We spent Saturday under the south stand with groundskeeper Elena. Her stories will anchor the opening sequence.', 'backers_only']
      : [headline, copy, 'public'],
    ['Production notes for the next round', 'We have a short list of questions for the team before setting the next milestone.', 'backers_only'],
    ['A closer look at the project', 'Here is what brought the team together and what we are preparing for the next stage.', 'public'],
  ]
  return updates.slice(0, index < 8 ? 3 : 2).map(([title, body, audience], position) => {
    const published = active && position !== 1
    const when = project.status === 'funded' || project.status === 'unsuccessful'
      ? iso(9, 18 - position, 17)
      : iso(11, 12 - position, 17)
    return {
      id: `update-${key}-0${position + 1}`, projectId: project.id, title, body, audience,
      status: published ? 'published' : 'draft', publishedAt: published ? when : null, publishedBy: published ? creator : null,
      ...metadata(when),
    }
  })
}

export function createInitialData() {
  const account = { id: creator, name: 'Maya Chen', initials: 'MC', studioName: 'Lantern House Studio' }
  const projects = portfolio.map(campaign)
  const rewards = []
  const backers = []
  const surveys = []
  const surveyResponses = []
  const updates = []

  for (const [index, project] of projects.entries()) {
    const [key] = portfolio[index]
    const linkedRewards = campaignRewards(project, key, index)
    rewards.push(...linkedRewards)
    updates.push(...campaignUpdates(project, key, index))
    const roster = index < 13 && index !== 3
      ? campaignBackers(project, key, index, linkedRewards.filter(reward => reward.type === 'tier')) : []
    backers.push(...roster)
    if (project.status === 'draft') continue
    const survey = campaignSurvey(project, key, roster)
    surveys.push(survey)
    if (survey.status !== 'sent') continue

    const submitted = roster.filter(backer => backer.id !== 'backer-thread-015').slice(0, 6)
    for (const [position, backer] of submitted.entries()) {
      const question = survey.questions[0]
      surveyResponses.push({
        id: 'response-' + backer.id.slice('backer-'.length), surveyId: survey.id, backerId: backer.id, status: 'submitted',
        answers: { [question.id]: question.type === 'single_choice' ? question.options[position % 2] : backer.name },
        shippingAddress: survey.collectShippingAddress ? {
          line1: `${142 + position * 7} Lantern Example Lane`, city: 'Cleveland', region: 'OH', postalCode: '44113', country: 'US',
        } : null,
        createdAt: iso(10, 4 + position, 21),
      })
    }
  }

  return { account, projects, rewards, backers, surveys, surveyResponses, updates }
}

