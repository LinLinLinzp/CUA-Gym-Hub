import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { licenses } from './data/seed.js'
import {
  activity, canRead, createNotebook, entityPath, findEntity, getOwner, latestVersion, replaceRecord, scopedRecords,
  uniqueSlug, uploadFiles, useStore, versionsFor, withRecord,
} from './store.jsx'
import {
  AppLink, Art, Catalog, DownloadFile, Empty, ErrorMessage, FormActions, Heading, Icon, Missing, Modal, Table, Tags, Visibility,
  bytes, compareUpdated, count, date, optionsFrom, titleOf, useAppNavigate,
} from './ui.jsx'
import { parseCsv } from './utils/csv.js'

const fileType = file => /\.([a-z0-9]+)$/i.exec(file.name ?? '')?.[1].toUpperCase() ?? 'Other'

export function Datasets() {
  const { state } = useStore()
  const versions = new Map()
  for (const version of state.datasetVersions) {
    const list = versions.get(version.datasetId) ?? []
    list.push(version)
    versions.set(version.datasetId, list)
  }
  const downloads = new Map()
  for (const record of state.downloads) {
    if (record.entityType === 'dataset') downloads.set(record.entityId, (downloads.get(record.entityId) ?? 0) + 1)
  }
  const records = scopedRecords(state, 'datasets').map(record => {
    const owner = getOwner(state, record.ownerId)
    const history = (versions.get(record.id) ?? []).sort((a, b) => b.number - a.number)
    const files = latestVersion(history, record)?.files ?? []
    return { ...record, owner, types: [...new Set(files.map(fileType))], downloads: (record.downloadCount ?? 0) + (downloads.get(record.id) ?? 0),
      search: [record.title, owner?.displayName, owner?.username, ...(record.tags ?? [])] }
  })
  return <Catalog label="Datasets" type="datasets" description="Find data for an analysis, inspect files, or publish a collection." records={records}
    searchPlaceholder="Search datasets"
    actions={<AppLink className="button" to="/datasets/new"><Icon name="plus" size={18} />New Dataset</AppLink>}
    filters={[
      { key: 'license', label: 'License', any: 'All licenses', options: optionsFrom(records.map(item => item.license)), match: (item, value) => item.license === value },
      { key: 'type', label: 'File type', any: 'All file types', options: optionsFrom(records.flatMap(item => item.types)), match: (item, value) => item.types.includes(value) },
      { key: 'ownership', label: 'Ownership', any: 'All datasets', options: [['mine', 'My Datasets']], match: item => item.ownerId === state.account.id },
    ]}
    sorts={[[ 'updated', 'Recently updated', compareUpdated ], [ 'downloads', 'Most downloads', (a, b) => b.downloads - a.downloads ]]}
    render={(record, index) => <AppLink to={entityPath(state, 'datasets', record)} className="panel record-card" key={record.id}>
      <Art type="datasets" variant={index} />
      <div className="record-kicker">{record.license ?? 'License unavailable'}<Visibility item={record} /></div>
      <div><h3>{titleOf(record, 'Untitled dataset')}</h3><p>{record.owner?.displayName ?? record.owner?.username ?? 'Unknown owner'}</p>
        {record.description && <p>{record.description}</p>}</div>
      <Tags values={record.tags} /><div className="record-end"><span>{count(record.downloads)} downloads</span><span>{record.types.join(' · ') || 'No files'}</span></div>
    </AppLink>} />
}

async function uploadDatasetFiles(files) {
  const records = await uploadFiles(files)
  return Promise.all(records.map(async (record, index) => {
    if (fileType(record) !== 'CSV' || files[index].size > 1048576) return record
    try {
      const [columns, ...rows] = parseCsv(await files[index].text(), 9)
      if (!columns?.length || !rows.length) return record
      return { ...record, preview: { columns, rows: rows.filter(row => row.length === columns.length) } }
    } catch {
      return record
    }
  }))
}

function DatasetForm({ mode, dataset, onCancel, onSaved }) {
  const { command } = useStore()
  const create = mode === 'create'
  const publish = mode === 'version'
  const [title, setTitle] = useState(dataset?.title ?? '')
  const [description, setDescription] = useState(dataset?.description ?? '')
  const [license, setLicense] = useState(dataset?.license ?? '')
  const [visibility, setVisibility] = useState(dataset?.visibility ?? 'private')
  const [tags, setTags] = useState(dataset?.tags?.join(', ') ?? '')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const availableLicenses = [...new Set([...licenses, ...(dataset?.license ? [dataset.license] : [])])]
  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    if (!publish && (!title.trim() || !license)) return setError('Enter a title and choose a license.')
    if ((create || publish) && (!files.length || files.some(file => !file.size))) return setError('Choose one or more nonempty files.')
    setError('')
    pending.current = true
    setBusy(true)
    let result
    try {
      const uploaded = create || publish ? await uploadDatasetFiles(files) : []
      const saved = command(current => {
        const target = dataset && current.datasets.find(item => item.id === dataset.id && item.ownerId === current.account.id)
        const properties = {
          title: title.trim(), description: description.trim(), license, visibility,
          tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))],
        }
        if (create) {
          const ownerId = current.account.id
          const id = crypto.randomUUID()
          const version = activity(current, { datasetId: id, number: 1, files: uploaded, notes: '' })
          result = { id, slug: uniqueSlug(current.datasets, ownerId, properties.title), ownerId, ...properties,
            latestVersionId: version.id, createdAt: version.createdAt, updatedAt: version.createdAt, downloadCount: 0 }
          return withRecord(withRecord(current, 'datasets', result), 'datasetVersions', version)
        }
        if (!target) return null
        if (publish) {
          const history = versionsFor(current.datasetVersions, 'datasetId', target.id)
          const version = activity(current, { datasetId: target.id, number: (history[0]?.number ?? 0) + 1, files: uploaded, notes: notes.trim() })
          result = { ...target, latestVersionId: version.id, updatedAt: version.createdAt }
          return withRecord(replaceRecord(current, 'datasets', result), 'datasetVersions', version)
        }
        const previous = { ...target, description: target.description ?? '', tags: target.tags ?? [] }
        const changedFields = Object.keys(properties).filter(key => JSON.stringify(properties[key]) !== JSON.stringify(previous[key]))
        if (!changedFields.length) return null
        const edit = activity(current, { datasetId: target.id, changedFields, status: 'saved' })
        result = { ...target, ...Object.fromEntries(changedFields.map(key => [key, properties[key]])), updatedAt: edit.createdAt }
        let next = withRecord(replaceRecord(current, 'datasets', result), 'datasetEdits', edit)
        if (changedFields.includes('visibility')) next = withRecord(next, 'visibilityChanges', activity(current, {
          entityType: 'dataset', entityId: target.id, from: target.visibility ?? null, to: visibility,
        }))
        return next
      })
      if (!saved) throw new Error('No changes were saved. Edit the details or check that you still own this dataset.')
      onSaved(result)
    } catch (err) {
      setError(err.message ?? 'The dataset could not be saved.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const form = <form className={create ? 'panel stack' : 'stack'} onSubmit={submit}>
    {!publish && <>
      <label>Dataset title<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} disabled={busy} /></label>
      <label>Description<textarea maxLength={4000} rows={4} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} /></label>
      <div className="form-columns">
        <label>License<select required value={license} onChange={event => setLicense(event.target.value)} disabled={busy}>
          <option value="">Select a license</option>{availableLicenses.map(item => <option key={item}>{item}</option>)}
        </select></label>
        <label>Visibility<select value={visibility} onChange={event => setVisibility(event.target.value)} disabled={busy}>
          <option value="private">Private</option><option value="public">Public</option>
        </select></label>
      </div>
      <label>Tags (optional)<input placeholder="Separate tags with commas" maxLength={250} value={tags} onChange={event => setTags(event.target.value)} disabled={busy} /></label>
    </>}
    {(create || publish) && <label>{publish ? 'Replacement files' : 'Dataset files'}<input required type="file" multiple disabled={busy}
      onChange={event => setFiles(Array.from(event.target.files))} /></label>}
    {publish && <label>Release notes<textarea rows={3} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} disabled={busy} /></label>}
    <ErrorMessage error={error} />
    <FormActions submit={create ? 'Create Dataset' : publish ? 'Publish Version' : 'Save Changes'} onCancel={onCancel} busy={busy}
      pending={create || publish ? 'Uploading…' : 'Saving…'} />
  </form>
  return create ? form : <Modal title={publish ? 'New Version' : 'Edit Details'} onClose={onCancel} busy={busy}>{form}</Modal>
}

export function NewDataset() {
  const { state } = useStore()
  const navigate = useAppNavigate()
  return <div className="form-page"><AppLink to="/datasets" className="breadcrumb">← Datasets</AppLink>
    <Heading title="New Dataset" type="datasets" eyebrow="Kaggle Datasets" description="Choose files and a license for the first version of your dataset." />
    <DatasetForm mode="create" onCancel={() => navigate('/datasets')} onSaved={dataset => navigate(entityPath(state, 'datasets', dataset), { replace: true })} />
  </div>
}

export function DatasetRoute() {
  const { owner, slug } = useParams()
  const { state } = useStore()
  const dataset = findEntity(state, 'datasets', owner, slug)
  return dataset ? <DatasetView key={dataset.id} dataset={dataset} /> : <Missing label="Dataset" group="datasets" />
}

function DatasetView({ dataset }) {
  const { state, command } = useStore()
  const navigate = useAppNavigate()
  const [selectedId, setSelected] = useState('')
  const [previewId, setPreview] = useState(null)
  const [modal, setModal] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const versions = versionsFor(state.datasetVersions, 'datasetId', dataset.id)
  const latest = latestVersion(versions, dataset)
  const version = versions.find(item => item.id === selectedId) ?? latest
  const files = version?.files ?? []
  const previewFile = previewId === null
    ? files.find(item => item.preview?.columns?.length)
    : files.find(item => item.id === previewId)
  const owner = getOwner(state, dataset.ownerId)
  function startNotebook(event) {
    event.preventDefault()
    let created
    command(current => {
      created = createNotebook(current, { title: `${titleOf(dataset)} analysis`, datasetId: dataset.id })
      return created && withRecord(current, 'notebooks', created)
    })
    if (created) navigate(`${entityPath(state, 'code', created)}/edit`)
    else setError('The dataset is no longer available to this account.')
  }
  function open(action) {
    setError('')
    setModal(action)
  }
  const isOwner = dataset.ownerId === state.account.id
  return <>
    <AppLink to="/datasets" className="breadcrumb">← Datasets</AppLink>
    <Heading eyebrow="Kaggle Datasets" type="datasets" title={titleOf(dataset, 'Untitled dataset')}
      actions={<>
        {isOwner && <><button className="button secondary" onClick={() => open('edit')}>Edit Details</button>
          <button className="button secondary" onClick={() => open('version')}>New Version</button></>}
        <button className="button" onClick={() => open('notebook')}>New Notebook</button>
      </>} />
    <div className="detail-grid">
      <div className="stack">
        <p className="notice" aria-live="polite">{feedback}</p>
        <section className="panel stack"><h2>About this dataset</h2><p className="detail-text">{dataset.description || 'No description available.'}</p>
          <Tags values={dataset.tags} />
        </section>
        <section className="panel"><div className="section-heading"><h2>Files</h2>{version && <span className="badge">Version {version.number}</span>}</div>
          <ErrorMessage error={modal ? '' : error} />
          {files.length ? files.map(file => <div className="file-row" key={file.id}>
            <div className="file-info"><Icon name="file" /><div><strong>{file.name ?? 'Unnamed file'}</strong><p className="muted">{bytes(file.sizeBytes)} · {fileType(file)}</p></div></div>
            <div className="actions">
              {file.preview?.columns?.length > 0 && <button className="button secondary compact" aria-pressed={previewFile?.id === file.id}
                onClick={() => setPreview(previewFile?.id === file.id ? '' : file.id)}>Preview</button>}
              <DownloadFile file={file} onError={setError} readDownload={current => {
                const target = current.datasets.find(item => item.id === dataset.id)
                const snapshot = current.datasetVersions.find(item => item.id === version.id && item.datasetId === target?.id)
                return canRead(current, target) && snapshot?.files?.some(item => item.id === file.id)
                  && { entityType: 'dataset', entityId: dataset.id, versionId: snapshot.id, fileId: file.id }
              }} />
            </div>
          </div>) : <Empty title="No files in this version" />}
        </section>
        {previewFile && <FilePreview file={previewFile} />}
      </div>
      <aside className="stack">
        <section className="panel"><h2>Dataset details</h2><dl>
          <div><dt>Owner</dt><dd>{owner?.displayName ?? owner?.username ?? 'Unknown owner'}</dd></div>
          <div><dt>License</dt><dd>{dataset.license ?? '—'}</dd></div>
          <div><dt>Visibility</dt><dd><Visibility item={dataset} /></dd></div>
          <div><dt>Current version</dt><dd>{latest ? `Version ${latest.number}` : 'No versions'}</dd></div>
          <div><dt>Updated</dt><dd>{date(dataset.updatedAt)}</dd></div>
        </dl></section>
        <section className="panel stack"><h2>Version history</h2>
          {versions.length ? <>
            <label>View version<select value={selectedId} onChange={event => { setSelected(event.target.value); setPreview(null); setError('') }}>
              <option value="">Current version</option>{versions.map(item => <option key={item.id} value={item.id}>Version {item.number}</option>)}
            </select></label>
            <div className="version-meta"><span>{date(version.createdAt)}</span>{version.notes && <p>{version.notes}</p>}</div>
          </> : <p className="muted">No versions published yet.</p>}
        </section>
      </aside>
    </div>
    {(modal === 'edit' || modal === 'version') && <DatasetForm mode={modal} dataset={dataset} onCancel={() => setModal('')} onSaved={() => {
      setFeedback(modal === 'version' ? 'Dataset version published.' : 'Dataset details saved.')
      if (modal === 'version') { setSelected(''); setPreview(null) }
      setModal('')
    }} />}
    {modal === 'notebook' && <Modal title="New Notebook from Dataset" onClose={() => setModal('')}>
      <form className="stack" onSubmit={startNotebook}><p>Create a private notebook with {titleOf(dataset)} selected as a dataset input.</p>
        <ErrorMessage error={error} /><FormActions submit="Create Notebook" onCancel={() => setModal('')} />
      </form>
    </Modal>}
  </>
}

function FilePreview({ file }) {
  const { columns, rows = [] } = file.preview
  const headers = columns.map((column, index) => column || `Column ${index + 1}`)
  return <section className="panel stack"><div><h2>File preview</h2><p className="muted">{file.name} · {rows.length} sample {rows.length === 1 ? 'row' : 'rows'}</p></div>
    <Table headers={headers} rows={rows.map((row, index) => [index, ...headers.map((_, column) => row[column] ?? '—')])} empty="No preview rows" />
    {rows.length > 0 && <details className="column-summary"><summary>Column summary</summary>
      <Table headers={['Column', 'Present', 'Missing', 'Distinct']}
        rows={headers.map((header, index) => {
          const values = rows.map(row => row[index]).filter(value => value != null && String(value).trim() !== '')
          return [index, header, values.length, rows.length - values.length, new Set(values).size]
        })} />
    </details>}
  </section>
}
