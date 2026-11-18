const people = [
  ['user-maya', 'maya-chen', 'Maya Chen', 'maya.chen'],
  ['user-nora', 'nora-fields', 'Nora Fields', 'nora.fields'],
  ['user-ilyas', 'ilyas-shah', 'Ilyas Shah', 'ilyas.shah'],
  ['user-sofia', 'sofia-vale', 'Sofia Vale', 'sofia.vale'],
  ['user-leo', 'leo-tan', 'Leo Tan', 'leo.tan'],
]

const modelNames = [
  'Alder Retriever', 'Harbor Summarizer', 'Heron Sound Classifier', 'Orchard Translate', 'Basin Embeddings', 'Signal Captioner',
  'Cedar Instruct', 'Moraine Vision', 'Lark Speech', 'Bluewater Classifier', 'Reed Translate', 'Quartz Draft',
  'Terrace Encoder', 'Canopy QA', 'Sunroom Vision', 'Foxglove Small', 'Shelter Audio', 'Outpost NER',
  'Granite Embed', 'Jetty Chat', 'Juniper Shapes', 'Acorn Transcribe', 'Fennel Sentiment', 'Cove Translate',
  'Glen Reader', 'Hearth Writer', 'Tidal Tiles', 'Peregrine Voice', 'Finch Topics', 'Aspen Translate',
]
const datasetNames = [
  'Coastal Survey Notes', 'Estuary Bird Census', 'Neighborhood Transit Logs', 'Orchard Species Cards', 'Watershed Field Reports', 'Community Workshop Notes',
  'Open Quay Register', 'Rain Garden Inventory', 'Regional Trail Counts', 'Historic Beacon Texts', 'Hilltop Weather Samples', 'Library Event Index',
  'Wetland Acoustics', 'Volunteer Shift Notes', 'Shoreline Plot Labels', 'Street Tree Observations', 'River Market Receipts', 'Public Garden Catalog',
  'Ridgeline Trail Markers', 'Urban Creek Survey', 'Park Sign Transcripts', 'Bike Lane Observations', 'Salt Marsh Measurements', 'Museum Object Labels',
  'Seed Exchange Index', 'Tide Pool Findings', 'Ferry Schedule Archive', 'North Bank Journal', 'Native Plant Cards', 'Harbor Light Register',
]
const spaceNames = [
  'Embedding Atlas', 'Archive Query Lab', 'Boardwalk Gallery', 'Watershed Explorer', 'Field Notes Viewer', 'Trail Signal Studio',
  'Heron Audio Bench', 'Cedar Prompt Desk', 'Museum Labels Gallery', 'Quartz Image Probe', 'Library Search Room', 'Wetland Sample Browser',
  'Cloud Caption Pad', 'Map Tile Compare', 'Reed Examples', 'Workshop Text Desk', 'Jetty Evaluation Board', 'Orchard Cards',
  'Audio Sketchbook', 'Sparrow Topic Lens', 'Cove Documentation', 'Park Data Lab', 'Terrace Index Viewer', 'Bluewater Report',
  'Local Translation Desk', 'Ferry Schedule Explorer', 'Sunroom Demo Guide', 'Bench Classifier', 'Ridgeline Match Lab', 'Rain Garden Fieldbook',
]

const modelSummaries = [
  'Sentence embeddings tuned for civic planning records.', 'A compact generator for summarizing public meeting transcripts.',
  'Classifies imagery from illustrated habitat and field guides.', 'Transcribes short voice memos from traveling field teams.',
  'Assigns topic labels to public-interest research notes.', 'Translates short bilingual reference cards and catalog entries.',
]
const modelDescriptionOverrides = {
  'Heron Sound Classifier': 'Recognizes short calls and ambient sounds in recordings from wetland surveys.',
  'Orchard Translate': 'Translates bilingual species cards and field guides for volunteer monitors.',
  'Basin Embeddings': 'Produces vectors for matching watershed studies by topic and region.',
  'Signal Captioner': 'Labels field photographs by scene and highlights the most likely category.',
  'Cedar Instruct': 'Drafts short summaries and answers for civic research teams.',
  'Moraine Vision': 'Labels terrain and surface features in annotated trail photography.',
}
const datasetSummaries = [
  'Transcribed observations from shoreline surveys and water-quality walks.', 'Structured observations from seasonal counting and monitoring projects.',
  'Annotated excerpts with source notes for lightweight evaluation.',
]
const spaceSummaries = [
  'Explore a small collection of embeddings and compare nearby examples.', 'Compare retrieval results across a set of local archive records.',
  'Browse a curated gallery with examples and maintainer notes.',
]
const modelTasks = ['feature-extraction', 'text-generation', 'image-classification', 'automatic-speech-recognition', 'text-classification', 'translation']
const formats = ['parquet', 'csv', 'jsonl']
const sdks = ['gradio', 'docker', 'static']
const slug = (name) => name.toLowerCase().replaceAll(' ', '-')
const timestamp = (day) => new Date(Date.UTC(2026, 9, day, 14, 30)).toISOString()

export function createInitialData() {
  const users = people.map(([id, username, displayName, mail]) => ({ id, username, displayName, email: mail + '@example.test' }))
  const [account, nora, ilyas, sofia, leo] = users

  function base(type, name, description, index, tags) {
    const owner = index < 6 ? account : users[index % 4 + 1]
    const id = type + '-' + slug(name)
    const createdAt = timestamp(1 + index % 7)
    const updatedAt = timestamp(31 - index % 20)
    const content = '# ' + name + '\n\n' + description + '\n'
    return {
      id, ownerId: owner.id, owner: owner.username, name, slug: slug(name), description, tags,
      visibility: [4, 5].includes(index) ? 'private' : 'public',
      createdBy: owner.id, createdAt, updatedAt, likes: (index * 17 + 26) % 240, likedBy: index === 3 ? [account.id] : [],
      files: [{ id: id + '-readme', path: 'README.md', content, sizeBytes: new TextEncoder().encode(content).length, createdAt, updatedAt, createdBy: owner.id, updatedBy: owner.id }],
    }
  }

  const models = modelNames.map((name, index) => {
    const task = ({ 2: 'automatic-speech-recognition', 3: 'translation', 4: 'feature-extraction', 5: 'image-classification', 6: 'text-generation', 7: 'image-classification' })[index] || modelTasks[index % modelTasks.length]
    const description = modelDescriptionOverrides[name] || modelSummaries[modelTasks.indexOf(task)]
    return { ...base('model', name, description, index, [task, ['civic-data', 'research', 'multilingual'][index % 3]]),
      task, license: ['apache-2.0', 'mit', 'other'][index % 3], gating: ({ 0: 'manual', 6: 'manual', 7: 'auto' })[index] || 'off', downloads: 1200 + index * 379 }
  })
  const datasets = datasetNames.map((name, index) => {
    const format = formats[index % 3]
    const splits = index % 7 === 6 ? [] : [
      { name: 'train', rowCount: 4200 + index * 173 }, { name: 'validation', rowCount: 600 + index * 23 }, { name: 'test', rowCount: 850 + index * 31 },
    ]
    const sampleRows = splits.flatMap(({ name: split }) => ['West quay', 'East inlet', 'North footbridge'].map((record, row) => ({
      split, values: { record, category: ['survey', 'field-note', 'inventory'][index % 3], observations: 11 + row * 3 + index },
    })))
    return { ...base('dataset', name, datasetSummaries[index % 3], index, [format, ['environment', 'observations', 'transport'][index % 3]]),
      format, license: ['cc-by-4.0', 'cc0-1.0', 'other'][index % 3], gating: ({ 1: 'manual', 7: 'auto', 8: 'manual', 9: 'manual' })[index] || 'off',
      downloads: 620 + index * 281, splits, sampleRows }
  })
  const spaces = spaceNames.map((name, index) => {
    const sdk = sdks[index % 3]
    const repo = base('space', name, spaceSummaries[index % 3], index, [sdk, ['retrieval', 'exploration', 'gallery'][index % 3]])
    return { ...repo, sdk, hardware: sdk === 'static' ? null : (index % 4 === 0 ? 'cpu-upgrade' : 'cpu-basic'),
      runtimeStatus: sdk === 'static' ? 'static' : index % 4 === 1 ? 'paused' : 'running', lastStartedAt: sdk === 'static' ? null : repo.updatedAt }
  })
  const request = (id, repo, repoType, requester, status, purpose, day) => {
    const createdAt = timestamp(day)
    return { id, repoType, repoId: repo.id, requesterId: requester.id, status, purpose, consent: true, createdAt,
      updatedAt: status === 'pending' ? createdAt : timestamp(day + 1),
      reviewedAt: status === 'pending' ? null : timestamp(day + 1),
      reviewedBy: status === 'pending' ? null : account.id,
      rejectionReason: status === 'rejected' ? 'Please describe which documents will be used in the evaluation.' : null }
  }
  const accessRequests = [
    request('request-alder-nora', models[0], 'model', nora, 'pending', 'Compare passage recall on harbor planning reports.', 23),
    request('request-alder-ilyas', models[0], 'model', ilyas, 'pending', 'Evaluate multilingual retrieval on public records.', 25),
    request('request-estuary-sofia', datasets[1], 'dataset', sofia, 'accepted', 'Study changes in seasonal census patterns.', 18),
    request('request-estuary-leo', datasets[1], 'dataset', leo, 'rejected', 'Explore archival census materials.', 15),
    request('request-beacon-maya', datasets[9], 'dataset', account, 'pending', 'Index the archive for citation lookup.', 24),
  ]
  const accessTokens = [
    ['token-eval-001', 'Evaluation notebooks', 'read', [], 'D8Q3', 'active'],
    ['token-publish-002', 'Repository publishing', 'fine-grained', ['repo:read', 'repo:write'], 'K2L7', 'active'],
    ['token-script-003', 'Archive import', 'write', [], 'F4A8', 'revoked'],
  ].map(([id, name, role, permissions, suffix, status], index) => ({
    id, ownerId: account.id, name, role, permissions, suffix, status, createdAt: timestamp(10 + index),
    revokedAt: status === 'revoked' ? timestamp(19) : null, revokedBy: status === 'revoked' ? account.id : null,
  }))
  const activity = [[models[0], 'model'], [datasets[0], 'dataset'], [spaces[0], 'space']].map(([repo, repoType], index) => ({
    id: 'activity-seed-' + index, action: 'repository.created', actorId: repo.createdBy, repoType, repoId: repo.id, createdAt: repo.createdAt,
    details: { slug: repo.slug, visibility: repo.visibility },
  }))
  return { account: { ...account }, users, models, datasets, spaces, accessRequests, accessTokens, activity }
}
