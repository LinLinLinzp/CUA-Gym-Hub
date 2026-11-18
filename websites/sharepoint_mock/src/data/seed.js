export const titleColumn = { id: 'title', name: 'Title', type: 'text', required: true, options: [] }

const staff = [
  ['Morgan Ellis', 'Workplace operations lead'], ['Priya Shah', 'People programs partner'],
  ['Theo Bennett', 'IT service manager'], ['Camila Park', 'Communications editor'],
  ['Nora Vega', 'Procurement specialist'], ['Elliot Chen', 'Finance operations lead'],
  ['Avery Brooks', 'Safety coordinator'], ['Jules Hart', 'Research operations partner'],
  ['Inez Flores', 'Design operations lead'], ['Malik Reed', 'Customer success manager'],
  ['Tessa Ward', 'Supply planning analyst'], ['Samir Desai', 'Learning program manager'],
]

const departments = [
  ['Workplace Operations', 'Facilities requests and workplace procedures.', 'Facilities Requests', ['Meeting room display', 'Visitor badge station', 'Floor directory'], 'Workplace Resources'],
  ['People & Culture', 'Onboarding, benefits and employee resources.', 'Onboarding Checklist', ['Orientation agenda', 'Welcome packet', 'New starter equipment'], 'People Policies'],
  ['Service Desk', 'IT intake, triage and technical operations.', 'Service Requests', ['Laptop enrollment', 'Account setup', 'Support routing'], 'Technical Guides'],
  ['Company News', 'Leadership messages and news from across Acme.', 'Editorial Calendar', ['Quarterly town hall', 'Employee spotlight', 'Leadership briefing'], 'Published Stories'],
  ['Procurement', 'Supplier intake and purchasing guidance.', 'Supplier Reviews', ['Supplier insurance', 'Office supplies quote', 'Vendor renewal'], 'Supplier Records'],
  ['Finance Operations', 'Month-end close, budgets and reporting.', 'Month-End Tracker', ['Expense reconciliation', 'Cash forecast', 'Cost center summary'], 'Reporting Packs'],
  ['Health & Safety', 'Safety procedures, inspections and incident resources.', 'Inspection Schedule', ['First aid kits', 'Evacuation signage', 'Loading bay audit'], 'Safety Manuals'],
  ['Research Programs', 'Planning and handoffs for internal research.', 'Research Intake', ['Interview guide', 'Recruitment brief', 'Participant schedule'], 'Research Briefs'],
  ['Design Studio', 'Creative delivery, critique and design resources.', 'Creative Requests', ['Template refresh', 'Design review', 'Illustration brief'], null],
  ['Customer Success', 'Account planning and customer onboarding resources.', 'Account Actions', ['Kickoff deck', 'Customer training', 'Renewal briefing'], null],
  ['Supply Planning', 'Inventory operations and regional planning.', 'Stock Exceptions', ['Inbound forecast', 'Reorder schedule', 'Carrier capacity'], null],
  ['Learning Center', 'Training programs and workshop materials.', 'Course Calendar', ['Manager training', 'Workshop handouts', 'Learning survey'], null],
  ['Field Services', 'Dispatch, coverage and field visit guidance.', 'Dispatch Register', ['North route', 'Field checklist', 'Vehicle schedule'], null],
  ['Acme Community', 'Employee events and volunteering opportunities.', 'Volunteer Signups', ['Food pantry shift', 'Park cleanup', 'Mentor matching'], null],
  ['Product Planning', 'Planning tools and release coordination.', 'Release Milestones', ['Pilot rollout', 'Feedback review', 'Release brief'], null],
  ['Security Awareness', 'Employee security education and resources.', 'Training Actions', ['Access review', 'Training calendar', 'New hire session'], null],
  ['Data & Analytics', 'Reporting requests and shared metric definitions.', 'Reporting Requests', ['Coverage dashboard', 'Metric glossary', 'Usage review'], null],
  ['Office Moves', 'Seating and facilities planning for office moves.', 'Move Readiness', ['Floor plan', 'Moving labels', 'Building access'], null],
  ['Accessibility Council', 'Accessibility review and planning resources.', 'Accessibility Reviews', ['Captioning guidance', 'Event checklist', 'Document template'], null],
  ['Retail Operations', 'Store readiness and regional updates.', 'Store Readiness', ['Store supplies', 'Training roster', 'Stockroom guide'], null],
  ['Knowledge Exchange', 'Playbooks and lessons shared across teams.', 'Knowledge Review Queue', ['Facilitation guide', 'Meeting notes', 'Process handoff'], null],
  ['Sustainability', 'Environmental reporting and office initiatives.', 'Initiative Tracker', ['Energy dashboard', 'Waste inventory', 'Supplier survey'], null],
  ['Project Delivery', 'Delivery standards, project tracking and templates.', 'Delivery Risks', ['Milestone review', 'Resource forecast', 'Project charter'], null],
  ['Office Services West', 'On-site services for the western offices.', 'West Office Requests', ['Maintenance roster', 'Room inventory', 'Catering checklist'], null],
]

const supplementalLists = [
  ['Maintenance Schedule', 'Track recurring building maintenance.'],
  ['Benefits Questions', 'Track common questions and policy updates.'],
  ['Equipment Inventory', 'Review stock and replacement needs.'],
  ['Publication Requests', 'Track submissions and publication approvals.'],
  ['Renewal Calendar', 'Plan purchase agreement renewals.'],
  ['Budget Requests', 'Record internal budget adjustments.'],
]
const workplaceItems = [
  'Replace meeting room display', 'Review visitor badge stock', 'Update third-floor signage', 'Inspect loading bay door',
  'Book annual fire drill', 'Install reception hearing loop', 'Schedule lighting review', 'Order kitchen recycling labels',
  'Repair Juniper room blinds', 'Restock first aid cabinets', 'Approve after-hours access', 'Update floor evacuation map',
  'Review elevator maintenance log', 'Replace courtyard planters', 'Check desk power outlets', 'Re-key storage closet',
  'Confirm HVAC filter delivery', 'Verify bike room access', 'Adjust Maple room speaker', 'Review parking allocations',
]
const statuses = ['New', 'In progress', 'Resolved']
const communications = new Set([3, 11, 13, 15, 18, 20, 21])
const assetSizes = {
  "office-visitor-guide.txt": 323,
  "room-inventory.csv": 133,
  "workspace-signage.txt": 222,
  "orientation-checklist.txt": 204,
  "support-routing.json": 163
}
const seedAsset = (filename) => ({
  contentUrl: '/seed-files/' + filename,
  sizeBytes: assetSizes[filename],
})
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const indexId = (n) => String(n + 1).padStart(3, '0')
const ISO = (n) => new Date(Date.UTC(2026, 9, 21 + n % 26, 13 + n % 8, n % 60)).toISOString()

function audit(userId, index) {
  return {
    createdAt: '2026-08-11T13:00:00.000Z', updatedAt: ISO(index),
    createdBy: userId, updatedBy: userId,
  }
}

function listColumns(workplace) {
  return [
    { ...titleColumn, options: [] },
    { id: 'col-status', name: 'Status', type: 'choice', required: true, options: [...statuses] },
    { id: 'col-due', name: 'Due date', type: 'date', required: false, options: [] },
    workplace ? { id: 'col-estimate', name: 'Estimate', type: 'number', required: false, options: [] }
      : { id: 'col-notes', name: 'Notes', type: 'text', required: false, options: [] },
  ]
}

export function createInitialData() {
  const userId = 'user-morgan-ellis'
  const account = { userId, organization: 'Acme' }
  const users = staff.map(([displayName, role]) => ({
    id: 'user-' + slug(displayName), displayName, role, email: slug(displayName).replace(/-/g, '.') + '@acme.example',
  }))
  const sites = []
  const siteFollows = []
  const lists = []
  const listItems = []
  const libraries = []
  const libraryEntries = []

  function addList(site, name, description, subjects, index, workplace = false, empty = false) {
    const listId = 'list-' + slug(name)
    lists.push({ id: listId, siteId: site.id, name, description, columns: listColumns(workplace), ...audit(site.ownerId, index) })
    if (empty) return
    const actions = ['Review', 'Confirm', 'Update', 'Schedule', 'Prepare']
    const notes = ['Review at the next team meeting.', 'Awaiting owner confirmation.', 'Keep the site coordinator informed.']
    const titles = workplace ? workplaceItems : actions.map((action, row) => action + ' ' + subjects[row % subjects.length].toLowerCase())
    titles.forEach((title, row) => {
      const date = new Date(Date.UTC(2026, 10, 12 + row + index % 12)).toISOString().slice(0, 10)
      listItems.push({
        id: (workplace ? 'item-facilities' : 'item-' + slug(name)) + '-' + indexId(row), listId, title,
        values: {
          'col-status': statuses[(row + index) % statuses.length],
          'col-due': date,
          ...(workplace ? { 'col-estimate': row === 0 ? 325 : 75 * (row + 1) } : { 'col-notes': notes[row % notes.length] }),
        },
        ...audit(users[(index + row) % users.length].id, index + row),
      })
    })
  }

  function addLibrary(site, key, name, description, subjects, index, isDefault) {
    const libraryId = 'lib-' + key
    libraries.push({ id: libraryId, siteId: site.id, name, description, isDefault, ...audit(site.ownerId, index) })
    if ([21, 22, 23].includes(index) && isDefault) return
    const addEntry = (suffix, kind, name, parentId, metadata = {}) => {
      const id = 'entry-' + key + '-' + suffix
      libraryEntries.push({ id, libraryId, name, kind, parentId, ...audit(site.ownerId, index + libraryEntries.length), ...metadata })
      return id
    }
    const guides = addEntry('guides', 'folder', 'Guides', null)
    const archive = addEntry('archive', 'folder', 'Archive', null)
    const file = (suffix, baseName, ext, parent, seedName) => {
      const mimeType = { txt: 'text/plain', csv: 'text/csv', pdf: 'application/pdf', json: 'application/json' }[ext]
      addEntry(suffix, 'file', baseName + '.' + ext, parent, {
        mimeType, contentUrl: null, sizeBytes: 680 + 151 * libraryEntries.length,
        ...(seedName ? seedAsset(seedName) : {}),
      })
    }
    const workplace = site.id === 'site-workplace-operations' && isDefault
    if (!workplace) {
      file('brief', subjects[0] + ' brief', 'pdf', null)
      file('checklist', subjects[1] + ' checklist', 'csv', guides)
      file('notes', subjects[2] + ' notes', 'txt', archive)
      if (index === 1 && isDefault) file('orientation', 'Orientation checklist', 'txt', guides, 'orientation-checklist.txt')
      if (index === 2 && isDefault) file('routing', 'Support routing', 'json', guides, 'support-routing.json')
      return
    }
    const layouts = addEntry('layouts', 'folder', 'Floor plans', guides)
    const year = addEntry('archive-2025', 'folder', '2025', archive)
    file('visitor-guide', 'Office visitor guide', 'txt', null, 'office-visitor-guide.txt')
    file('room-inventory', 'Room inventory', 'csv', null, 'room-inventory.csv')
    file('signage', 'Workspace signage', 'txt', guides, 'workspace-signage.txt')
    file('evacuation', 'Evacuation floor map', 'pdf', layouts)
    file('west-floor', 'West wing layout', 'pdf', layouts)
    file('maintenance', 'Maintenance handoff', 'txt', guides)
    file('desk-checklist', 'Desk allocation checklist', 'csv', guides)
    file('request-log', 'Facilities request log', 'csv', null)
    file('equipment', 'Meeting room equipment', 'pdf', null)
    file('lobby', 'Lobby restoration notes', 'txt', archive)
    file('inspections', 'Quarterly inspections', 'csv', year)
    file('room-setup', 'Room setup guide', 'pdf', null)
    file('keys', 'Key register', 'csv', year)
  }

  departments.forEach(([name, description, list, subjects, extraLibrary], index) => {
    const key = slug(name)
    const ownerId = users[index % users.length].id
    const site = {
      id: 'site-' + key, name, description, ownerId, type: communications.has(index) ? 'communication' : 'team',
      ...audit(ownerId, index === 0 ? 25 : index),
    }
    sites.push(site)
    if (index < 8) siteFollows.push({
      id: 'follow-morgan-' + key, siteId: site.id, userId, createdAt: '2026-09-01T13:00:00.000Z',
    })
    addList(site, list, 'Track and coordinate ' + list.toLowerCase() + '.', subjects, index, index === 0, index >= 21)
    addLibrary(site, (index === 0 ? 'workplace' : key) + '-documents', 'Documents', 'Shared documents for ' + name + '.', subjects, index, true)
    if (index < 6) {
      const [label, detail] = supplementalLists[index]
      addList(site, label, detail, subjects, index)
      addLibrary(site, slug(extraLibrary), extraLibrary, 'Reference material for ' + name + '.', subjects, index, false)
    }
  })

  return { account, users, sites, siteFollows, lists, listItems, libraries, libraryEntries, removals: [] }
}
