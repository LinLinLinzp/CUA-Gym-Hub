import { useRef, useState } from 'react'
import { Clapperboard, Film, Grid2X2, List, MoreHorizontal, Plus, Upload } from 'lucide-react'
import { WorkspaceLink } from '../navigation.jsx'
import { addVideos, createRecord } from '../changes.js'
import { makeId, useWorkspace } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'
import { Empty, ImageFrame, Modal, ModalActions, ModeOptions, PrivacyBadge, PrivacyFields, SearchField, matched, modeOf, plural, privacySettings, shortDate, titleOf, videoPath } from '../ui.jsx'

const defaultSort = 'updated'
const defaultPrivacy = { mode: 'unlisted', password: '', allowDownloads: false }
const sorters = {
  updated: (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
  newest: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  title: (a, b) => titleOf(a).localeCompare(titleOf(b)),
  duration: (a, b) => (b.durationSeconds ?? -1) - (a.durationSeconds ?? -1),
}

function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const timer = window.setTimeout(() => done(null), 3000)
    function done(duration) {
      window.clearTimeout(timer)
      video.onloadedmetadata = video.onerror = null
      video.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration * 1000) / 1000 : null)
    video.onerror = () => done(null)
    video.src = url
  })
}

function UploadDialog({ onClose }) {
  const { commit } = useWorkspace()
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [privacy, setPrivacy] = useState(defaultPrivacy)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inFlight = useRef(false)

  function choose(next) {
    if (inFlight.current || !next) return
    if (!next.size || !(next.type.startsWith('video/') || (!next.type && /\.(mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(next.name)))) {
      setFile(null)
      setError('Choose a nonempty video file.')
      return
    }
    setFile(next)
    if (!title || title === file?.name.replace(/\.[^.]+$/, '')) setTitle(next.name.replace(/\.[^.]+$/, ''))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (inFlight.current) return
    if (!file) return setError('Choose a video file to upload.')
    if (!title.trim()) return setError('Enter a title.')
    const settings = privacySettings(privacy, 'video')
    if (settings.mode === 'password' && !settings.password) return setError('Enter a viewing password.')
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const [response, durationSeconds] = await Promise.all([
        fetch(withSid('/upload'), { method: 'POST', body: form }),
        readDuration(file),
      ])
      if (!response.ok) throw new Error('Upload failed')
      const result = (await response.json()).files?.[0]
      if (!result?.url?.startsWith('/files/')) throw new Error('Missing uploaded file')
      const source = {
        kind: 'upload', url: result.url, originalName: result.original_name,
        storedName: result.stored_name, size: result.size, contentType: result.content_type,
      }
      const record = {
        id: makeId('video'), title: title.trim(), description: '', tags: [],
        thumbnailKey: 'film-slate', durationSeconds, source, privacy: settings,
      }
      if (await commit(createRecord('videos', record, 'video.created', { originalName: source.originalName, mode: settings.mode }), 'Video uploaded.')) onClose()
    } catch {
      setError('The video could not be uploaded. Try again.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <Modal title="Upload video" onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <label className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }} onDragLeave={() => setDragging(false)} onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          choose(event.dataTransfer.files[0])
        }}>
          <Upload size={25} />
          <strong>{file ? file.name : 'Drop a video here or browse files'}</strong>
          <input type="file" accept="video/*,.mkv,.avi" aria-label="Choose video file" onChange={(event) => {
            choose(event.target.files[0])
            event.target.value = ''
          }} />
        </label>
        <label className="field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <PrivacyFields kind="video" draft={privacy} setDraft={setPrivacy} />
      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <ModalActions onClose={onClose} action={busy ? 'Uploading…' : 'Upload video'} busy={busy} />
    </form>
  </Modal>
}

function BulkDialog({ selection, onClose, onSave }) {
  const { state, commit, saving } = useWorkspace()
  const [query, setQuery] = useState('')
  const [destinations, setDestinations] = useState([])
  const results = state.showcases.filter((record) => matched(record, query))
  return <Modal title="Add to showcase" onClose={onClose} wide>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (await commit(addVideos(destinations, selection), 'Videos added to showcases.')) onSave()
    }}>
      <p className="dialog-subtitle">{plural(selection.length, 'video')} selected</p>
      <SearchField value={query} onChange={setQuery} label="Search showcases" />
      <div className="picker">
        {results.map((record) => {
          const alreadyAdded = selection.every((id) => record.videoIds?.includes(id))
          return <label className="picker-row" key={record.id}>
            <input type="checkbox" checked={alreadyAdded || destinations.includes(record.id)} disabled={alreadyAdded || saving}
              onChange={(event) => setDestinations(event.target.checked ? [...destinations, record.id] : destinations.filter((id) => id !== record.id))} />
            <span>{titleOf(record, 'showcase')}</span>
            {alreadyAdded && <small>Added</small>}
          </label>
        })}
        {!results.length && <p className="hint">No showcases found.</p>}
      </div>
      <ModalActions onClose={onClose} action="Add to showcase" busy={saving} disabled={!destinations.length} />
    </form>
  </Modal>
}

function VideoCard({ video, checked, onToggle, compact }) {
  const title = titleOf(video)
  return <article className="catalog-card video-card">
    <WorkspaceLink to={videoPath(video.id)} className="card-media" tabIndex={-1} aria-hidden="true">
      <ImageFrame record={video} duration />
    </WorkspaceLink>
    <div className="card-copy">
      <h2><WorkspaceLink to={videoPath(video.id)}>{title}</WorkspaceLink></h2>
      <div className="card-meta">
        <PrivacyBadge mode={modeOf(video)} />
        <time dateTime={video.updatedAt} title="Last modified">{shortDate(video.updatedAt)}</time>
      </div>
    </div>
    <label className="card-select">
      <input type="checkbox" aria-label={`Select ${title}`} checked={checked} onChange={onToggle} />
    </label>
    {compact && <details className="row-menu" onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.currentTarget.open = false
        event.currentTarget.querySelector('summary').focus()
      }
    }}>
      <summary aria-label={`Options for ${title}`}><MoreHorizontal size={19} /></summary>
      <div>
        <WorkspaceLink to={videoPath(video.id)}>Video details</WorkspaceLink>
        <WorkspaceLink to={`${videoPath(video.id)}/review`}>Review video</WorkspaceLink>
      </div>
    </details>}
  </article>
}

export function Library() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('')
  const [sort, setSort] = useState(defaultSort)
  const [view, setView] = useState('grid')
  const [selection, setSelection] = useState([])
  const [modal, setModal] = useState('')
  const videos = state.videos.filter((video) => (!mode || modeOf(video) === mode) && matched(video, query, true)).sort(sorters[sort])
  const hasFilters = Boolean(query || mode)
  return <>
    <div className="page-heading">
      <div><h1>Library</h1><p>Browse and manage your studio’s videos.</p></div>
      <button className="primary" onClick={() => setModal('upload')}><Upload size={17} /> Upload video</button>
    </div>
    <section className="catalog-controls" aria-label="Library controls">
      <SearchField value={query} onChange={setQuery} label="Search videos" />
      <select aria-label="Filter by privacy" value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="">All privacy</option><ModeOptions kind="video" />
      </select>
      <select aria-label="Sort videos" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="updated">Last modified</option><option value="newest">Newest</option>
        <option value="title">Title A–Z</option><option value="duration">Duration</option>
      </select>
      <div className="segmented" aria-label="Video layout">
        <button className="icon-button" onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2X2 size={17} /></button>
        <button className="icon-button" onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}><List size={19} /></button>
      </div>
    </section>
    <div className="results-bar">
      <span role="status">{plural(videos.length, 'video')}</span>
      {selection.length > 0 && <div className="bulk-actions">
        <span>{selection.length} selected</span>
        <button disabled={!state.showcases.length} onClick={() => setModal('bulk')}><Plus size={16} /> Add to showcase</button>
        <button className="quiet" onClick={() => setSelection([])}>Clear selection</button>
      </div>}
    </div>
    {videos.length ? <div className={view === 'grid' ? 'catalog-grid' : 'catalog-list'}>
      {videos.map((video) => <VideoCard key={video.id} video={video} compact={view === 'list'} checked={selection.includes(video.id)}
        onToggle={(event) => setSelection(event.target.checked ? [...selection, video.id] : selection.filter((id) => id !== video.id))} />)}
    </div> : <Empty icon={hasFilters ? Film : Clapperboard} title={hasFilters ? 'No matching videos' : 'No videos yet'}>
      {hasFilters ? <button onClick={() => { setQuery(''); setMode('') }}>Clear filters</button>
        : <button className="primary" onClick={() => setModal('upload')}><Upload size={17} /> Upload video</button>}
    </Empty>}
    {modal === 'upload' && <UploadDialog onClose={() => setModal('')} />}
    {modal === 'bulk' && <BulkDialog selection={selection} onClose={() => setModal('')} onSave={() => { setModal(''); setSelection([]) }} />}
  </>
}
