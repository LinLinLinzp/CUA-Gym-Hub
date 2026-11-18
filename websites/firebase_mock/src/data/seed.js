const project = {
  id: 'northstar-notes', name: 'Northstar Field Notes',
  environment: 'Workspace', databaseId: '(default)', region: 'us-central1',
}
const operator = { id: 'operator_mira', displayName: 'Mira Chen', email: 'mira@example.test' }
const scope = { projectId: project.id, databaseId: project.databaseId }
const fixedDate = (day) => new Date(Date.UTC(2026, 6, day, 15, 20)).toISOString()
const index = (n) => String(n).padStart(3, '0')
const created = (day) => ({ createdAt: fixedDate(day), createdBy: operator.id })
const updated = (day) => ({ updatedAt: fixedDate(day), updatedBy: operator.id })

const givenNames = ['Ada', 'Jonah', 'Sofia', 'Leo', 'Leila', 'Evan', 'Inez', 'Ravi', 'Tessa', 'Marco', 'Noor', 'Owen']
const familyNames = ['Brooks', 'Santos', 'Patel', 'Kim']
const providers = [['password'], ['google.com'], ['phone'], ['anonymous'], ['password', 'google.com']]
const collectionNames = [
  'trailReports', 'trailReportsArchive', 'accessNotices', 'campsites', 'checkpoints',
  'equipment', 'fieldTeams', 'habitats', 'incidentReports', 'inspections', 'landmarks',
  'mapLayers', 'observations', 'permits', 'photoLogs', 'routes', 'samplingSites',
  'seasonalClosures', 'surveyNotes', 'trailheads', 'visits', 'weatherStations',
]
const areas = ['North Ridge', 'Cedar Basin', 'Alder Creek', 'Granite Pass', 'Willow Flats', 'Juniper Hollow']

function seedFirestore() {
  const firestoreCollections = []
  const firestoreDocuments = []
  function addCollection(id, parentDocumentPath, count, prefix) {
    const path = parentDocumentPath ? `${parentDocumentPath}/${id}` : id
    firestoreCollections.push({ id, path, parentDocumentPath, ...scope, ...created(2) })
    for (let i = 1; i <= count; i++) {
      const docId = `${prefix}_${index(i)}`
      const area = areas[(i - 1) % areas.length]
      const fields = [
        { name: 'name', type: 'string', value: area },
        { name: 'distanceKm', type: 'number', value: i + 0.5 },
        { name: 'published', type: 'boolean', value: i % 3 !== 0 },
        { name: 'reviewedAt', type: 'null', value: null },
        { name: 'observedAt', type: 'timestamp', value: fixedDate(i + 12) },
        { name: 'conditions', type: 'map', value: { windKph: 13 + i, surface: i % 2 ? 'dry' : 'damp' } },
        { name: 'tags', type: 'array', value: ['survey', i % 2 ? 'ridge' : 'waterway'] },
      ]
      firestoreDocuments.push({
        id: docId, path: `${path}/${docId}`, collectionPath: path,
        ...scope, fields, ...created(i + 2), ...updated(i + 2),
      })
    }
  }
  collectionNames.forEach((name, i) => addCollection(name, null, i === 0 ? 26 : 4, i < 2 ? 'report' : 'record'))
  addCollection('observations', 'trailReports/report_001', 4, 'note')
  addCollection('observations', 'trailReports/report_002', 4, 'note')
  return { firestoreCollections, firestoreDocuments }
}

function seedRules() {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `rules_${index(i + 1)}`, ...scope, ...created(60 + i),
    source: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Field reports policy · revision ${i + 1}
    match /trailReports/{reportId} {
      allow get, list: if ${i % 3 === 0 ? 'request.auth != null' : 'true'};
      allow create, update, delete: if request.auth != null;
    }
  }
}`,
  }))
}

function seedHosting() {
  const hostingSites = []
  const hostingReleases = []
  const hostingDomains = []
  for (const [key, name] of [['public', 'Northstar Public'], ['preview', 'Northstar Preview']]) {
    const id = `northstar-${key}`
    const currentReleaseId = `release_${key}_024`
    hostingSites.push({ id, projectId: project.id, name, currentReleaseId, ...created(3), ...updated(94) })
    for (let i = 1; i <= 24; i++) {
      hostingReleases.push({
        id: `release_${key}_${index(i)}`, siteId: id, versionId: `version_${key}_${index(i)}`,
        kind: 'deploy', fileCount: 22 + i, ...created(70 + i),
        note: ['Field report update', 'Route map refresh', 'Seasonal notice updates'][i % 3],
      })
    }
    const subdomains = ['field-notes', 'reports', 'trails', 'maps', 'alerts', 'surveys', 'routes', 'stations', 'access', 'archive', 'teams']
    const hosts = [`${id}.example.test`, ...subdomains.map((label) => `${label}.${key}.example.test`)]
    hosts.forEach((hostname, i) => {
      const status = i < 5 ? 'connected' : ['needs_setup', 'pending', 'minting_certificate'][i % 3]
      hostingDomains.push({
        id: `domain_${key}_${index(i + 1)}`, siteId: id, hostname, type: i ? 'custom' : 'default',
        status, dnsRecords: i ? domainRecords(hostname, `northstar-${key}-${index(i + 1)}`) : [], ...created(40 + i),
      })
    })
  }
  return { hostingSites, hostingReleases, hostingDomains }
}

export function domainRecords(hostname, token) {
  return [
    { type: 'TXT', host: hostname, value: `firebase-verification=${token}` },
    { type: 'A', host: hostname, value: '192.0.2.42' },
  ]
}

export function createInitialData() {
  const authUsers = familyNames.flatMap((family, group) => givenNames.map((given, row) => {
    const i = group * givenNames.length + row + 1
    const providerIds = [...providers[(i - 1) % providers.length]]
    const phone = providerIds.includes('phone')
    const anonymous = providerIds.includes('anonymous')
    return {
      uid: `auth_${index(i)}`, projectId: project.id,
      ...(!phone && !anonymous && { email: `${given.toLowerCase()}.${family.toLowerCase()}@example.test` }),
      ...(phone && { phoneNumber: `+120255501${String(i).padStart(2, '0')}` }),
      ...(!anonymous && { displayName: `${given} ${family}` }),
      providerIds, disabled: i % 7 === 0, emailVerified: !phone && !anonymous && i % 6 !== 0,
      lastSignInAt: i % 4 === 0 ? null : fixedDate(45 + i),
      ...created(i), ...updated(i),
    }
  }))
  const ruleVersions = seedRules()
  const activity = [
    ['auth.user.create', 'auth_001', { email: 'ada.brooks@example.test' }, 1],
    ['firestore.collection.create', 'trailReports', { databaseId: scope.databaseId, firstDocumentPath: 'trailReports/report_001' }, 2],
    ['firestore.document.create', 'trailReports/report_013', { databaseId: scope.databaseId, collectionPath: 'trailReports' }, 15],
    ['hosting.domain.add', 'domain_public_002', { siteId: 'northstar-public', hostname: 'field-notes.public.example.test' }, 41],
    ['rules.publish', 'rules_023', { databaseId: scope.databaseId, previousVersionId: 'rules_022' }, 82],
    ['rules.publish', 'rules_024', { databaseId: scope.databaseId, previousVersionId: 'rules_023' }, 83],
    ['hosting.release.deploy', 'release_public_024', { siteId: 'northstar-public', versionId: 'version_public_024' }, 94],
  ].map(([action, targetId, details, day], i) => ({
    id: `activity_${index(i + 1)}`, projectId: project.id, actorId: operator.id,
    createdAt: fixedDate(day), action, targetId, details,
  }))
  return {
    project: { ...project }, operator: { ...operator }, authUsers, ...seedFirestore(),
    firestoreRules: { ...scope, activeVersionId: 'rules_024', ...updated(83) },
    ruleVersions, ...seedHosting(), activity,
  }
}
