import { useState } from 'react'
import { ArrowDown, ArrowUp, Layers3, Plus, X } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Recovery, WorkspaceLink, useWorkspaceNavigate } from '../navigation.jsx'
import { addVideos, changeMember, createRecord } from '../changes.js'
import { Breadcrumbs, DetailsForm, RecordHeader } from '../details.jsx'
import { makeId, useWorkspace } from '../store.jsx'
import { Empty, ImageFrame, Modal, ModalActions, ModeOptions, PrivacyBadge, PrivacyFields, SearchField, matched, modeOf, plural, privacySettings, showcasePath, titleOf, videoPath } from '../ui.jsx'

const memberRecords = (showcase, videoIndex) => [...new Set(showcase.videoIds ?? [])].map((id) => videoIndex.get(id)).filter(Boolean)
const videoIndexOf = (videos) => new Map(videos.map((video) => [video.id, video]))

function NewShowcase({ onClose }) {
  const { commit, saving } = useWorkspace()
  const navigate = useWorkspaceNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState({ mode: 'private', password: '' })
  const [error, setError] = useState('')
  return <Modal title="New showcase" onClose={onClose}>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (!title.trim()) return setError('Enter a title.')
      const settings = privacySettings(privacy, 'showcase')
      if (settings.mode === 'password' && !settings.password) return setError('Enter a viewing password.')
      const record = { id: makeId('showcase'), title: title.trim(), description: description.trim(), privacy: settings, videoIds: [] }
      if (await commit(createRecord('showcases', record, 'showcase.created', { mode: settings.mode }), 'Showcase created.')) navigate(showcasePath(record.id))
    }}>
      <fieldset disabled={saving}>
        <label className="field">Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
        <PrivacyFields kind="showcase" draft={privacy} setDraft={setPrivacy} />
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
      <ModalActions onClose={onClose} action="Create showcase" busy={saving} />
    </form>
  </Modal>
}

export function ShowcaseList() {
  const { state } = useWorkspace()
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('')
  const videoIndex = videoIndexOf(state.videos)
  const results = state.showcases.filter((showcase) => (!mode || modeOf(showcase, 'showcase') === mode) && matched(showcase, query))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const hasFilters = Boolean(query || mode)
  return <>
    <div className="page-heading">
      <div><h1>Showcases</h1><p>Curate collections from your video library.</p></div>
      <button className="primary" onClick={() => setShowNew(true)}><Plus size={18} /> New showcase</button>
    </div>
    <section className="catalog-controls showcase-controls" aria-label="Showcase controls">
      <SearchField value={query} onChange={setQuery} label="Search showcases" />
      <select aria-label="Filter by privacy" value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="">All privacy</option><ModeOptions kind="showcase" />
      </select>
    </section>
    <div className="results-bar"><span role="status">{plural(results.length, 'showcase')}</span></div>
    {results.length ? <div className="catalog-grid">
      {results.map((showcase) => {
        const members = memberRecords(showcase, videoIndex)
        return <article className="catalog-card" key={showcase.id}>
          <WorkspaceLink to={showcasePath(showcase.id)} className="card-media" tabIndex={-1} aria-hidden="true">
            <ImageFrame record={members[0]} />
            <span className="stack-mark"><Layers3 size={17} /></span>
          </WorkspaceLink>
          <div className="card-copy">
            <h2><WorkspaceLink to={showcasePath(showcase.id)}>{titleOf(showcase, 'showcase')}</WorkspaceLink></h2>
            <div className="card-meta">
              <PrivacyBadge mode={modeOf(showcase, 'showcase')} /><span>{plural(members.length, 'video')}</span>
            </div>
          </div>
        </article>
      })}
    </div> : <Empty icon={Layers3} title={hasFilters ? 'No matching showcases' : 'No showcases yet'}>
      {hasFilters ? <button onClick={() => { setQuery(''); setMode('') }}>Clear filters</button>
        : <button className="primary" onClick={() => setShowNew(true)}><Plus size={17} /> New showcase</button>}
    </Empty>}
    {showNew && <NewShowcase onClose={() => setShowNew(false)} />}
  </>
}

function AddVideos({ showcase, onClose }) {
  const { state, commit, saving } = useWorkspace()
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState([])
  const results = state.videos.filter((video) => matched(video, query, true))
  return <Modal title="Add videos" onClose={onClose} wide>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (await commit(addVideos([showcase.id], selection), 'Videos added to showcase.')) onClose()
    }}>
      <SearchField value={query} onChange={setQuery} label="Search videos" />
      <div className="picker">
        {results.map((video) => {
          const alreadyAdded = showcase.videoIds?.includes(video.id)
          return <label className="picker-row" key={video.id}>
            <input type="checkbox" checked={Boolean(alreadyAdded || selection.includes(video.id))} disabled={alreadyAdded || saving}
              onChange={(event) => setSelection(event.target.checked ? [...selection, video.id] : selection.filter((id) => id !== video.id))} />
            <ImageFrame record={video} />
            <span>{titleOf(video)}</span>
            {alreadyAdded && <small>Added</small>}
          </label>
        })}
        {!results.length && <p className="hint">No videos found.</p>}
      </div>
      <p className="hint" aria-live="polite">{selection.length} selected</p>
      <ModalActions onClose={onClose} action="Add selected videos" busy={saving} disabled={!selection.length} />
    </form>
  </Modal>
}

function Members({ showcase }) {
  const { state, commit, saving } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const members = memberRecords(showcase, videoIndexOf(state.videos))
  return <section className="panel members">
    <div className="panel-heading">
      <div><h2>Videos</h2><p>{plural(members.length, 'video')} in this showcase</p></div>
      <button onClick={() => setAdding(true)}><Plus size={17} /> Add videos</button>
    </div>
    {members.length ? <ol className="members-list">
      {members.map((video, index) => <li key={video.id}>
        <WorkspaceLink className="member-link" to={videoPath(video.id)}><ImageFrame record={video} /><span>{titleOf(video)}</span></WorkspaceLink>
        <div className="row-actions">
          <button className="icon-button" title="Move up" aria-label={`Move up ${titleOf(video)}`} disabled={saving || !index}
            onClick={() => commit(changeMember(showcase.id, video.id, -1), 'Video order saved.')}><ArrowUp size={17} /></button>
          <button className="icon-button" title="Move down" aria-label={`Move down ${titleOf(video)}`} disabled={saving || index === members.length - 1}
            onClick={() => commit(changeMember(showcase.id, video.id, 1), 'Video order saved.')}><ArrowDown size={17} /></button>
          <button className="icon-button danger" title="Remove from showcase" aria-label={`Remove from showcase: ${titleOf(video)}`} disabled={saving}
            onClick={() => commit(changeMember(showcase.id, video.id, 0), 'Video removed from showcase.')}><X size={17} /></button>
        </div>
      </li>)}
    </ol> : <Empty icon={Layers3} title="This showcase is empty"><p>Select Add videos to choose from the Library.</p></Empty>}
    {adding && <AddVideos showcase={showcase} onClose={() => setAdding(false)} />}
  </section>
}

export function ShowcaseEditor() {
  const { showcaseId } = useParams()
  const { state } = useWorkspace()
  const showcase = state.showcases.find((record) => record.id === showcaseId)
  if (!showcase) return <Recovery title="Showcase unavailable" area="Showcases" />
  return <div key={showcase.id}>
    <Breadcrumbs items={[[ 'Showcases', '/showcases' ]]} current={titleOf(showcase, 'showcase')} />
    <RecordHeader record={showcase} kind="showcase" />
    <div className="detail-layout">
      <Members showcase={showcase} />
      <DetailsForm record={showcase} kind="showcase" />
    </div>
  </div>
}
