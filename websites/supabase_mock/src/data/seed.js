export const fixtures = {
  'csv': {
    mimeType: 'text/csv',
    url: '/fixtures/field-log.csv',
    content: 'sector,checkpoint,status\nNorth Ridge,NR-14,cleared\nAlder Basin,AB-07,review\n',
  },
  'txt': {
    mimeType: 'text/plain',
    url: '/fixtures/crew-notes.txt',
    content: 'Trailhead field notes\nNorth Ridge crew cleared the drainage crossing at 09:20.\n',
  },
  'svg': {
    mimeType: 'image/svg+xml',
    url: '/fixtures/sector-map.svg',
    content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160"><rect width="280" height="160" fill="#e8eee4"/><path d="M0 138Q60 42 116 83T280 39M0 158Q71 62 136 109T280 69M0 108Q52 17 108 64T280 13" fill="none" stroke="#719284" stroke-width="2"/><path d="m42 129 51-39 60 17 78-65" fill="none" stroke="#17495a" stroke-width="4" stroke-dasharray="6 5"/><circle cx="231" cy="42" r="6" fill="#086956"/></svg>\n',
  },
}

const schemas = {
  public: ['inspections', 'work_orders', 'field_crews', 'sites', 'equipment', 'checklists', 'hazards', 'assignments'],
  operations: ['dispatches', 'shift_logs', 'permits', 'vehicles', 'maintenance', 'handoffs', 'incident_notes', 'waypoints'],
  reporting: ['route_summaries', 'weekly_metrics', 'crew_utilization', 'inspection_totals', 'issue_register', 'service_windows', 'exports', 'archive_index'],
}
const places = ['North Ridge', 'Alder Basin', 'Cedar Pass', 'Granite Creek', 'Juniper Flats', 'West Lookout', 'Pine Divide', 'Maple Crossing']
const firstNames = ['Amelia', 'Milo', 'Sofia', 'Ezra', 'Nora', 'Owen', 'Iris', 'Hugo', 'Tessa', 'Leo']
const lastNames = ['Bennett', 'Nguyen', 'Rivera', 'Patel']
const bucketNames = ['field-reports', 'site-photos', 'crew-documents', 'route-maps', 'inspection-exports', 'permit-archive', 'equipment-guides', 'incident-files', 'public-notices', 'work-orders', 'training-materials', 'dispatch-logs', 'vehicle-records', 'safety-sheets', 'handoff-notes', 'taxonomies', 'site-plans', 'audit-evidence', 'weekly-summaries', 'contract-forms', 'trail-signage', 'metrics-dumps', 'operator-avatars', 'new-intake']
const roleSets = [['authenticated'], ['anon'], ['authenticated', 'service_role']]
const commands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL']
const stamp = (index = 0) => new Date(Date.UTC(2026, 0, 5 + index, 14)).toISOString()
const metadata = (index = 0) => ({ actorId: 'operator_rowan', createdAt: stamp(index), updatedAt: stamp(index) })

function seedTable(schema, name, index) {
  const columns = [
    ['id', 'bigint', false, 'identity'],
    ['created_at', 'timestamptz', false, 'now()'],
    ['title', 'text', false],
    ['zone', 'text', true],
    ['completed', 'boolean', false],
    ['priority', 'integer', true],
  ].map(([key, type, nullable, defaultExpression]) => ({
    id: `col_${name}_${key}`, name: key, type, nullable,
    primaryKey: key === 'id', defaultValue: key === 'completed' ? false : null,
    ...(defaultExpression ? { defaultExpression } : {}),
  }))
  const description = {
    inspections: 'Field inspection reports and completion status',
    work_orders: 'Scheduled repairs and crew assignments',
    route_summaries: 'Coverage and outcomes for field routes',
  }[name] || `Trailhead ${name.replaceAll('_', ' ')} records`
  return { id: `table_${name}`, schema, name, description, rlsEnabled: index % 4 !== 1, columns, ...metadata(index) }
}

export function createInitialData() {
  const tables = Object.entries(schemas).flatMap(([schema, names]) => names.map(seedTable.bind(null, schema)))
  const rows = tables.flatMap((table, index) => {
    const count = index < 2 ? 36 : index < 12 ? 6 : index === 12 ? 1 : 0
    return Array.from({ length: count }, (_, position) => {
      const place = places[position % places.length]
      const titles = table.name === 'work_orders' ? ['Drainage repair', 'Sign replacement', 'Surface grading'] : ['Access review', 'Condition survey', 'Safety walk']
      const values = [position + 1, stamp(position), `${place} · ${titles[Math.floor(position / 8) % 3]}`, position % 7 ? place : null, position % 3 !== 1, position % 6 ? position % 5 + 1 : null]
      return { id: `row_${table.name}_${position + 1}`, tableId: table.id, values: Object.fromEntries(table.columns.map((column, i) => [column.id, values[i]])), ...metadata(position) }
    })
  })
  const authUsers = Array.from({ length: 40 }, (_, index) => {
    const status = ['active', 'active', 'active', 'invited', 'unconfirmed', 'banned'][index % 6]
    const confirmed = ['active', 'banned'].includes(status)
    const first = firstNames[index % 10].toLowerCase()
    const last = lastNames[Math.floor(index / 10)].toLowerCase()
    return {
      id: index === 0 ? 'auth_amelia' : `auth_${first}_${last}`,
      email: `${first}.${last}@example.com`,
      provider: status === 'invited' ? 'email' : ['email', 'github', 'google', 'email'][index % 4],
      status, invitedAt: status === 'invited' ? stamp(index) : null,
      confirmedAt: confirmed ? stamp(index) : null, lastSignInAt: confirmed ? stamp(index + 2) : null,
      bannedAt: status === 'banned' ? stamp(index + 4) : null, ...metadata(index),
      updatedAt: stamp(index + (status === 'banned' ? 4 : confirmed ? 2 : 0)),
    }
  })
  const buckets = bucketNames.map((name, index) => ({
    id: `bucket_${name.replaceAll('-', '_')}`, name, public: index % 4 === 1 || index % 4 === 3,
    maxFileSizeBytes: index % 3 === 0 ? 5242880 : null,
    allowedMimeTypes: index % 3 === 0 ? ['text/csv', 'text/plain'] : index % 3 === 1 ? ['image/*'] : [],
    ...metadata(index),
  }))
  const objects = buckets.slice(0, 16).flatMap((bucket, index) => {
    const folder = index === 0 ? 'reports' : '2026'
    const paths = [folder, `${folder}/january`, '', folder, `${folder}/january`, `${folder}/january`]
    return paths.map((parent, position) => {
      const kind = position < 2 ? 'folder' : 'file'
      const ext = index % 3 === 1 ? 'svg' : position % 2 ? 'txt' : 'csv'
      const fixture = fixtures[ext]
      const name = ['sector-overview', 'weekly', 'access-review', 'crew-handoff'][position - 2]
      return {
        id: index === 0 && position === 3 ? 'obj_weekly_report' : `obj_${index + 1}_${position + 1}`,
        bucketId: bucket.id, kind,
        path: kind === 'folder' ? parent : [parent, `${name}.${ext}`].filter(Boolean).join('/'),
        sizeBytes: kind === 'file' ? fixture.content.length : null,
        mimeType: kind === 'file' ? fixture.mimeType : null,
        url: kind === 'file' ? fixture.url : null, ...metadata(position),
      }
    })
  })
  // Match the primary field report's documented name and format.
  const weekly = objects.find(object => object.id === 'obj_weekly_report')
  Object.assign(weekly, { path: 'reports/weekly.csv', url: fixtures.csv.url, mimeType: fixtures.csv.mimeType, sizeBytes: fixtures.csv.content.length })
  const targets = [tables[0], tables[1], ...tables.slice(3, 15), ...buckets.slice(0, 6)]
  const policies = Array.from({ length: 32 }, (_, index) => {
    const target = targets[index % targets.length]
    const targetType = target.schema ? 'table' : 'bucket'
    const command = commands[index % commands.length]
    const expression = targetType === 'table' ? 'true' : `bucket_id = '${target.name}'`
    const verbs = { SELECT: 'read', INSERT: 'add', UPDATE: 'edit', DELETE: 'remove', ALL: 'manage' }
    const roles = roleSets[index % roleSets.length].slice()
    const name = `Members can ${verbs[command]} ${target.name.replaceAll('_', ' ')}`
    return {
      id: index === 0 ? 'policy_inspections_read' : `policy_${index + 1}`,
      targetType, targetId: target.id, name: index < targets.length ? name : `${name} (${roles.join(', ')})`,
      command, roles,
      usingExpression: command === 'INSERT' ? null : expression,
      checkExpression: command === 'INSERT' || command === 'UPDATE' ? expression : null,
      ...metadata(index),
    }
  })
  return {
    project: { id: 'proj_trailhead', name: 'Trailhead', organization: 'Summit Fieldworks' },
    currentUser: { id: 'operator_rowan', name: 'Rowan Ellis', email: 'rowan@example.com' },
    tables, rows, authUsers, buckets, objects, policies, activity: [],
  }
}
