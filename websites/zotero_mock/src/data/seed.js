import citationSnapshots from './citationSnapshots.js'

const actorId = 'usr_maya_chen'
const account = { id: actorId, name: 'Maya Chen', email: 'maya.chen@example.test' }
const stamp = (offset) => new Date(Date.UTC(2025, 7, 4, 10, offset)).toISOString()
const audit = (offset) => ({ actorId, createdAt: stamp(offset), updatedAt: stamp(offset) })

const librarySpecs = [
  ['my_library', 'My Library', 'personal', 'owner', 'References and reading lists for my research.'],
  ['urban_methods', 'Urban Methods Lab', 'group', 'owner', 'Fieldwork sources for the neighborhood methods seminar.'],
  ['coastal_atlas', 'Coastal Atlas Working Group', 'group', 'editor', 'Research on estuaries, shoreline access, and coastal change.'],
  ['public_archive', 'Public Archive Collective', 'group', 'reader', 'Reading lists on archives and public memory.'],
  ['design_studio', 'Civic Design Studio', 'group', 'owner', 'Case studies in public services and neighborhood design.'],
]
const collectionSets = [
  [
    ['article_drafts', 'Article Drafts'], ['spatial_evidence', 'Spatial Evidence', 'article_drafts'],
    ['comparative_cases', 'Comparative Cases', 'article_drafts'], ['field_methods', 'Field Methods'],
    ['interviews', 'Interviews', 'field_methods'], ['observation', 'Observation Notes', 'field_methods'],
    ['public_space', 'Public Space'], ['markets', 'Markets & Streets', 'public_space'],
    ['climate', 'Climate Adaptation'], ['water', 'Water & Coasts', 'climate'],
    ['policy', 'Policy & Planning'], ['reading', 'Reading Queue'], ['seminar', 'Seminar Readings'],
    ['maps', 'Maps & Atlases'], ['archives', 'Archives'], ['methods', 'Research Methods'],
  ],
  [['urban_public', 'Public Space'], ['urban_field', 'Field Methods', 'urban_public'], ['urban_maps', 'Mapping'], ['urban_cases', 'Case Studies'], ['urban_queue', 'Reading Queue']],
  [['coastal_estuaries', 'Estuaries'], ['coastal_tides', 'Tidal Records', 'coastal_estuaries'], ['coastal_access', 'Shoreline Access'], ['coastal_maps', 'Historical Maps'], ['coastal_queue', 'Reading Queue']],
  [['archive_memory', 'Public Memory'], ['archive_oral', 'Oral Histories', 'archive_memory'], ['archive_digit', 'Digital Archives'], ['archive_policy', 'Access Policy'], ['archive_queue', 'Reading Queue']],
  [['civic_service', 'Service Design'], ['civic_trials', 'Prototype Trials', 'civic_service'], ['civic_streets', 'Shared Streets'], ['civic_policy', 'Implementation'], ['civic_queue', 'Reading Queue']],
]
const subjects = [
  'Corner Stores and Informal Gathering', 'Shade Networks on School Routes',
  'Mapping Everyday Shortcuts', 'A Field Guide to Shared Streets',
  'Heat Exposure at Bus Stops', 'Workshops for Participatory Mapping',
  'Street Markets and Neighborhood Memory', 'Measuring Public Bench Use',
  'Community Gardens and Summer Cooling', 'Walking Interviews after Dark',
  'Temporary Libraries and Public Life', 'Flood Markers and Civic Memory',
  'The Geography of Small Repair Shops', 'Oral Histories of Waterfront Workers',
  'Mapping Tides and Shoreline Change', 'Conservation at Working Harbors',
  'Street Design for Winter Access', 'Rain Gardens as Social Infrastructure',
  'Planning for Evening Transit', 'An Atlas of Neighborhood Paths',
  'Community Archives and Local Knowledge', 'Designing Quiet Public Rooms',
  'Public Noticeboards and Informal Exchange', 'Everyday Use of Covered Walkways',
  'Approaches to Estuary Monitoring', 'Reusing Vacant Municipal Buildings',
  'The Social Life of Small Plazas',
]
const places = ['Ternwick', 'Alderport', 'Willowmere', 'Brackenford', 'East Marlow', 'Juniper Bay', 'Lake Arden']
const people = [
  ['Noor', 'Hale'], ['Lena', 'Ortiz'], ['Adrian', 'Bell'], ['Pilar', 'Duarte'],
  ['Inez', 'Park'], ['Tariq', 'Rahman'], ['Jules', 'Vaughn'], ['Nadia', 'Sato'],
  ['Eli', 'Morgan'], ['Amara', 'Okafor'], ['Rosa', 'Cortez'], ['Jonah', 'Lin'],
]
const topics = ['fieldwork', 'public space', 'mapping', 'climate', 'planning', 'archives', 'mobility', 'coastal access']
const outlets = ['Journal of Everyday Urbanism', 'Review of Civic Landscapes', 'Methods in Place Research', 'Quarterly of Public Design']
const publishers = ['Juniper Press', 'North Window Books', 'Harbor Field Notes', 'Alder Research Institute']
const types = ['journalArticle', 'book', 'report', 'webpage']
const styles = ['apa-7', 'mla-9', 'chicago-author-date']

function person(index) {
  const [firstName, lastName] = people[index % people.length]
  return { creatorType: 'author', firstName, lastName }
}

export function createInitialData() {
  const libraries = librarySpecs.map(([key, name, kind, role, description], index) => ({
    id: 'lib_' + key, name, kind, role, description,
    visibility: index === 3 ? 'public' : 'private', status: 'active', ...audit(index),
  }))
  const collections = collectionSets.flatMap((set, group) => set.map(([key, name, parent], index) => ({
    id: 'col_' + key, libraryId: libraries[group].id, parentId: parent ? 'col_' + parent : null,
    name, status: 'active', ...audit(200 + group * 20 + index), deletedAt: null,
  })))
  const items = libraries.flatMap((library, group) => Array.from({ length: group === 0 ? 48 : 15 }, (_, index) => {
    const ordinal = group === 0 ? index : 48 + (group - 1) * 15 + index
    const itemType = types[index % types.length]
    const place = places[(Math.floor(ordinal / subjects.length) + group) % places.length]
    const set = collectionSets[group]
    const collectionIds = index % 7 === 6 ? [] : ['col_' + set[index % set.length][0]]
    if (index % 5 === 0) collectionIds.push('col_' + set[(index + 1) % set.length][0])
    const creators = index % 11 === 10
      ? [{ creatorType: 'author', name: place + ' Research Council' }]
      : [person(ordinal), ...(index % 6 === 5 ? [person(ordinal + 3)] : [])]
    const year = String(2024 - ordinal % 13)
    return {
      id: ordinal === 0 ? 'item_corner_stores' : 'item_' + String(ordinal + 1).padStart(3, '0'),
      libraryId: library.id, collectionIds, itemType,
      title: subjects[ordinal % subjects.length] + ' in ' + place,
      creators, date: index % 3 === 0 ? year + '-10' : year,
      publicationTitle: itemType === 'journalArticle' ? outlets[Math.floor(ordinal / 4) % outlets.length] : itemType === 'webpage' ? place + ' Research Archive' : '',
      publisher: ['book', 'report'].includes(itemType) ? publishers[Math.floor(ordinal / 4) % publishers.length] : '',
      place: ['book', 'report'].includes(itemType) ? place : '',
      volume: itemType === 'journalArticle' ? String(ordinal % 14 + 12) : '',
      issue: itemType === 'journalArticle' ? '2' : '',
      pages: itemType === 'journalArticle' ? '38–56' : '',
      DOI: itemType === 'journalArticle' ? '10.5555/field.' + year + '.' + String(ordinal + 1).padStart(3, '0') : '',
      ISBN: '', url: itemType === 'webpage' ? 'https://archive.example.test/records/' + (ordinal + 1) : '',
      abstractNote: 'A study of ' + topics[ordinal % topics.length] + ' using evidence from ' + place + '.',
      tags: [topics[ordinal % topics.length], topics[(ordinal + 3) % topics.length]],
      status: index === (group === 0 ? 47 : 14) ? 'trashed' : 'active',
      ...audit(600 + ordinal),
      trashedAt: index === (group === 0 ? 47 : 14) ? stamp(800 + ordinal) : null,
    }
  }))
  const citations = Array.from({ length: 30 }, (_, index) => {
    const group = index % libraries.length
    const item = items[(group === 0 ? 0 : 48 + (group - 1) * 15) + (Math.floor(index / 5) % 3) * 4]
    const style = styles[index % styles.length]
    const mode = index % 2 ? 'bibliography' : 'citation'
    const locator = index % 4 === 0 ? '42' : ''
    return {
      id: 'cite_' + String(index + 1).padStart(3, '0'), libraryId: item.libraryId, itemIds: [item.id],
      locators: mode === 'citation' && locator ? [{ itemId: item.id, label: 'page', value: locator }] : [],
      style, mode, output: citationSnapshots[index],
      action: ['saved', 'copied', 'downloaded'][Math.floor(index / 3) % 3], sourceCitationId: null,
      status: 'completed', actorId, createdAt: stamp(1000 + index),
    }
  })
  return { account: { ...account }, libraries, collections, items, citations }
}
