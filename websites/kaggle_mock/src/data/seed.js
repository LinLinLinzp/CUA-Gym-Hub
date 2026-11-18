export const licenses = ['CC BY 4.0', 'CC0 1.0', 'MIT', 'ODC-BY 1.0']
export const slugify = (title) => title.toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled'

const studies = [
  ['Ferry', 'Harbor Ferry Demand', 'Coastal Transit Lab', 'transport', 'boardings on short cross-harbor routes'],
  ['Solar', 'Rooftop Solar Yield', 'Grid Futures Group', 'energy', 'power output from neighborhood solar arrays'],
  ['Canopy', 'Urban Canopy Mapping', 'Municipal Ecology Lab', 'ecology', 'street-level tree coverage by city block'],
  ['Library', 'Library Holds Forecast', 'Civic Reading Project', 'civic data', 'demand for print and digital library holds'],
  ['Soil', 'Prairie Soil Moisture', 'Field Water Institute', 'agriculture', 'seasonal soil moisture across prairie plots'],
  ['Metro', 'Metro Delay Signals', 'Rail Systems Lab', 'transport', 'service delays from overnight rail maintenance'],
  ['Market', 'Market Basket Groups', 'Corner Market Research', 'retail', 'purchase patterns across independent grocers'],
  ['Wetland', 'Tidal Wetland Boundaries', 'Estuary Survey Office', 'ecology', 'wetland extent in aerial survey tiles'],
  ['Wind', 'Wind Farm Availability', 'Open Turbine Collective', 'energy', 'turbine availability under changing wind conditions'],
  ['Rain', 'Neighborhood Rainfall Peaks', 'Regional Water Bureau', 'climate', 'rainfall peaks measured by community weather stations'],
  ['Route', 'Bicycle Route Comfort', 'Active Streets Lab', 'transport', 'rider comfort on protected and shared lanes'],
  ['Bird', 'Marsh Bird Call Index', 'Avian Sound Archive', 'audio', 'bird presence inferred from marsh recordings'],
  ['Heat', 'Cooling Demand Windows', 'Building Energy Lab', 'energy', 'afternoon cooling loads in public buildings'],
  ['Reef', 'Reef Survey Counts', 'Marine Habitat Studio', 'ecology', 'species counts on shallow reef surveys'],
  ['Grocery', 'Fresh Produce Waste', 'Food Flow Institute', 'retail', 'produce loss across stores and seasons'],
]
const categories = [
  ['Forecasting', 'MAE', 'lower'], ['Regression', 'RMSE', 'lower'], ['Computer Vision', 'IoU', 'higher'],
  ['Classification', 'F1', 'higher'], ['Research', 'Log Loss', 'lower'],
]
const stamp = (days) => new Date(Date.UTC(2025, 7, 1 + days, 12)).toISOString()

const sampleFiles = [
  { name: 'ridership.csv', sizeBytes: 116, contentType: 'text/csv', url: '/fixtures/ridership.csv',
    preview: { columns: ['date', 'route', 'boardings'], rows: [['2025-10-01', 'Bay Loop', '43'], ['2025-10-02', 'Bay Loop', '58'], ['2025-10-03', 'East Pier', '71'], ['2025-10-04', 'East Pier', '95']] } },
  { name: 'observations.json', sizeBytes: 131, contentType: 'application/json', url: '/fixtures/observations.json' },
  { name: 'field-notes.txt', sizeBytes: 122, contentType: 'text/plain', url: '/fixtures/field-notes.txt' },
]
const notebookCells = (id, subject, language) => [
  { id: `${id}-intro`, type: 'markdown', source: `# ${subject}\nReview sample observations and compare the weekday and weekend groups.` },
  { id: `${id}-code`, type: 'code', source: language === 'r'
    ? 'readings <- c(43, 58, 71, 95)\nmean(readings)' : 'readings = [43, 58, 71, 95]\nprint(sum(readings) / len(readings))' },
]

export function createInitialData() {
  const account = { id: 'usr-morgan', username: 'morganlee', displayName: 'Morgan Lee' }
  const users = [
    { id: 'usr-inez', username: 'inezpark', displayName: 'Inez Park', initials: 'IP' },
    { id: 'usr-dev', username: 'devpatel', displayName: 'Dev Patel', initials: 'DP' },
    { id: 'usr-alba', username: 'albaruiz', displayName: 'Alba Ruiz', initials: 'AR' },
    { id: 'usr-nia', username: 'niabrooks', displayName: 'Nia Brooks', initials: 'NB' },
  ]
  const owner = (index) => index % 6 === 5 ? account : users[index % users.length]
  const competitions = Array.from({ length: 30 }, (_, i) => {
    const [key, topic, host, tag, subject] = studies[i % studies.length]
    const [category, metric, scoreDirection] = categories[i % categories.length]
    const title = i < 15 ? topic : `${key} Benchmark Sprint`
    const id = i === 0 ? 'cmp-ferry' : `cmp-${i + 1}`
    return {
      id, title, slug: slugify(title), host, category, metric, scoreDirection,
      summary: `Build a reproducible model for ${subject}.`,
      description: `The ${host} has prepared a synthetic benchmark for ${subject}. Compare a simple baseline against a model of your choice, then submit predictions for the holdout sample.`,
      status: i > 0 && i % 4 === 3 ? 'closed' : 'open',
      startsAt: stamp(i), endsAt: new Date(Date.UTC(i % 4 === 3 ? 2026 : 2027, 4, 20 + i, 23, 59)).toISOString(),
      teamCount: i === 0 ? 342 : 65 + (i * 71) % 1910, rulesVersion: 1 + Number(i % 7 === 2),
      rules: `Use only the supplied files and publicly available ${tag} references. Submit a CSV containing an id and prediction for every holdout row. Respect the stated data license and keep submissions reproducible.`,
      files: [{ ...sampleFiles[0], id: `${id}-observations` },
        { id: `${id}-sample`, name: 'sample-submission.csv', sizeBytes: 30, contentType: 'text/csv', url: '/fixtures/sample-submission.csv' }],
    }
  })
  const datasets = Array.from({ length: 42 }, (_, i) => {
    const [key, , , tag, subject] = studies[i % studies.length]
    const title = i === 0 ? 'Harbor Ferry Ridership' : `${key} ${['Observations', 'Field Archive', 'Validation Sample'][Math.floor(i / 15)]}`
    const id = i === 0 ? 'ds-ferry' : `ds-${i + 1}`
    return { id, slug: slugify(title), ownerId: owner(i).id, title,
      description: `A curated sample covering ${subject}. Use this collection for exploratory analysis, baseline comparisons, and classroom exercises.`,
      license: licenses[i % licenses.length], tags: [tag, i % 2 ? 'observations' : 'benchmark'],
      visibility: owner(i) === account && i % 2 ? 'private' : 'public', downloadCount: 240 + (i * 137) % 4000,
      createdAt: stamp(i), updatedAt: stamp(i + 25), latestVersionId: `${id}-v${i % 5 === 0 ? 2 : 1}` }
  })
  const datasetVersions = datasets.flatMap((dataset, i) =>
    Array.from({ length: i % 5 === 0 ? 2 : 1 }, (_, j) => ({
      id: `${dataset.id}-v${j + 1}`, datasetId: dataset.id, actorId: dataset.ownerId, number: j + 1,
      files: [sampleFiles[(i + j * 3) % sampleFiles.length], ...(j ? [sampleFiles[2]] : [])]
        .filter((file, index, files) => files.indexOf(file) === index)
        .map((file, k) => ({ ...file, id: `${dataset.id}-v${j + 1}-file-${k + 1}` })),
      notes: j ? 'Add field notes and confirm the column definitions.' : 'Initial collection release.', createdAt: stamp(i + j * 25),
    })))
  const notebooks = Array.from({ length: 36 }, (_, i) => {
    const [key, , , tag, subject] = studies[i % studies.length]
    const title = i === 0 ? 'Weekday Demand Baseline' : `${key} ${['Baseline Study', 'Exploratory Report', 'Validation Checks'][Math.floor(i / 15)]}`
    const id = i === 0 ? 'nb-ferry-baseline' : `nb-${i + 1}`
    const language = i % 3 === 1 ? 'r' : 'python'
    return { id, slug: slugify(title), ownerId: owner(i).id, title, language,
      summary: `Explore ${subject} with a compact, reproducible analysis.`,
      visibility: owner(i) === account ? 'private' : 'public', tags: [tag, 'analysis'],
      votes: 18 + (i * 7) % 160, cells: notebookCells(id, title, language),
      datasetIds: [datasets[i].id], latestVersionId: `${id}-v${i % 4 === 0 ? 2 : 1}`,
      createdAt: stamp(i + 8), updatedAt: stamp(i + 28) }
  })
  const notebookVersions = notebooks.flatMap((notebook, i) =>
    Array.from({ length: i % 4 === 0 ? 2 : 1 }, (_, j) => ({
      id: `${notebook.id}-v${j + 1}`, notebookId: notebook.id, actorId: notebook.ownerId, number: j + 1,
      title: notebook.title, cells: j || i % 4 !== 0 ? notebook.cells : notebook.cells.slice(0, 1),
      datasetIds: notebook.datasetIds, message: j ? 'Add numeric baseline.' : 'Initial exploration.', createdAt: stamp(i + 8 + j * 20),
    })))
  const competitionEntries = [2, 3, 5].map(i => ({
    id: `entry-${i}`, competitionId: competitions[i].id, actorId: account.id,
    rulesVersion: competitions[i].rulesVersion, status: 'joined', createdAt: stamp(i + 3),
  }))
  const competitionSubmissions = competitionEntries.slice(0, 2).map((entry, i) => ({
    id: `sub-${i + 1}`, competitionId: entry.competitionId, entryId: entry.id, actorId: account.id,
    file: { ...competitions[i + 2].files[1], id: `prediction-file-${i + 1}` },
    description: 'Holdout baseline', status: 'scored', score: i ? 0.1844 : 0.7248, createdAt: stamp(i + 14),
  }))
  const competitionLeaderboard = competitions.flatMap((competition, i) =>
    ['Tidepool Lab', 'Signal Orchard', 'Waypoint Studio', 'Open Atlas'].map((teamName, j) => ({
      id: `rank-${i + 1}-${j + 1}`, competitionId: competition.id, teamName,
      score: Number((0.1264 + j * 0.036 + (i % 5) * 0.08 + (competition.scoreDirection === 'higher' ? 0.48 : 0)).toFixed(4)),
      submittedAt: stamp(i + j + 8),
    })))
  return { account, users, competitions, competitionLeaderboard, competitionEntries, competitionSubmissions,
    notebooks, notebookVersions, notebookDraftSaves: [], datasets, datasetVersions, datasetEdits: [],
    downloads: [], visibilityChanges: [] }
}
