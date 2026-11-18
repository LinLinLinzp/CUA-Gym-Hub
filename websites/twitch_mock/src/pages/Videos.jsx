import { useEffect, useRef, useState } from 'react'
import { Badge, CategoryField, Confirm, Cover, Dialog, Empty, Heading, LanguageField, categoryName } from '../common.jsx'
import { appendChanges, audit, editRecord, useWorkspace } from '../workspace.jsx'
import { displayInstant } from '../utils/calendar.js'

const types = { past_broadcast: 'Past Broadcast', highlight: 'Highlight', upload: 'Upload' }
const perPage = 12

function duration(seconds) {
  if (!Number.isFinite(seconds)) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const remainder = String(seconds % 60).padStart(2, '0')
  return hours ? hours + ':' + String(minutes).padStart(2, '0') + ':' + remainder : minutes + ':' + remainder
}

function VideoEditor({ video, close }) {
  const { state, commit } = useWorkspace()
  const [title, setTitle] = useState(video.title ?? '')
  const [description, setDescription] = useState(video.description ?? '')
  const [categoryId, setCategory] = useState(video.categoryId ?? '')
  const [language, setLanguage] = useState(video.language ?? '')
  const [error, setError] = useState(false)
  async function save(event) {
    event.preventDefault()
    if (!title.trim()) {
      setError(true)
      return
    }
    const patch = { title: title.trim() }
    if (description.trim() !== '' || video.description != null) patch.description = description.trim()
    if (categoryId !== '' || video.categoryId != null) patch.categoryId = categoryId
    if (language !== '' || video.language != null) patch.language = language
    await commit((current, tx) => editRecord(current, 'videos', video.id, patch, tx, 'update_video', 'video'), 'Video details saved.')
    close()
  }
  return <Dialog title="Edit Video Details" close={close}>
    <form className="form" onSubmit={save}>
      <label>Title<input autoFocus required aria-invalid={error} aria-describedby={error ? 'video-title-error' : undefined}
        value={title} onChange={event => { setTitle(event.target.value); setError(false) }} /></label>
      {error && <p className="error" id="video-title-error" role="alert">Enter a video title.</p>}
      <label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} /></label>
      <CategoryField categories={state.categories ?? []} value={categoryId} onChange={setCategory} />
      <LanguageField value={language} onChange={setLanguage} required={Boolean(video.language)} />
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Save</button></div>
    </form>
  </Dialog>
}

function VideoMenu({ video, edit, apply, remove }) {
  const [position, setPosition] = useState(null)
  const root = useRef(null)
  const trigger = useRef(null)
  function close() {
    setPosition(null)
    trigger.current?.focus()
  }
  useEffect(() => {
    if (!position) return
    function outside(event) {
      if (!root.current?.contains(event.target)) setPosition(null)
    }
    function scroll(event) {
      if (!root.current?.contains(event.target)) setPosition(null)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', scroll)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', scroll)
    }
  }, [position])
  return <div ref={root} onKeyDown={event => { if (event.key === 'Escape' && position) close() }}>
    <button ref={trigger} type="button" className="icon-button" aria-label={'Actions for ' + (video.title || 'video')} aria-expanded={Boolean(position)}
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPosition(position ? null : {
          right: window.innerWidth - rect.right,
          top: window.innerHeight - rect.bottom >= 144 ? rect.bottom + 4 : Math.max(4, rect.top - 135),
        })
      }}>⋯</button>
    {position && <div className="video-menu" style={position}>
      <button onClick={() => { close(); edit(video) }}>Edit Details</button>
      <button onClick={() => { close(); apply(video.status === 'published' ? 'unpublish' : 'publish', [video.id]) }}>
        {video.status === 'published' ? 'Unpublish' : 'Publish'}
      </button>
      <button className="danger-text" onClick={() => { close(); remove([video.id]) }}>Delete</button>
    </div>}
  </div>
}

export function VideoProducer() {
  const { state, commit } = useWorkspace()
  const [filters, setFilters] = useState({ query: '', type: '', visibility: '', sort: 'newest' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const videos = (state.videos ?? []).filter(video => video.status !== 'deleted')
  const categories = state.categories ?? []
  const query = filters.query.trim().toLowerCase()
  const matching = videos.filter(video => (!filters.type || video.type === filters.type)
    && (!filters.visibility || video.status === filters.visibility)
    && (!query || (video.title ?? '').toLowerCase().includes(query) || (video.description ?? '').toLowerCase().includes(query)))
  const newest = (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  const metric = filters.sort === 'views' ? 'viewCount' : 'durationSeconds'
  matching.sort(filters.sort === 'newest' ? newest : (a, b) => (b[metric] ?? -1) - (a[metric] ?? -1) || newest(a, b))
  const pages = Math.max(1, Math.ceil(matching.length / perPage))
  const currentPage = Math.min(page, pages)
  const visible = matching.slice((currentPage - 1) * perPage, currentPage * perPage)
  const allSelected = visible.length > 0 && visible.every(video => selected.includes(video.id))
  function updateFilters(next) {
    setFilters(next)
    setPage(1)
    setSelected([])
  }
  function clearFilters() { updateFilters({ query: '', type: '', visibility: '', sort: 'newest' }) }
  function changeFilter(event) { updateFilters({ ...filters, [event.target.name]: event.target.value }) }
  function jump(next) { setPage(next); setSelected([]) }

  async function apply(action, ids) {
    const targets = new Set(ids)
    const status = { publish: 'published', unpublish: 'unpublished', delete: 'deleted' }[action]
    const message = { publish: 'Videos published.', unpublish: 'Videos unpublished.', delete: 'Videos deleted.' }[action]
    await commit((current, tx) => {
      const changes = []
      const records = (current.videos ?? []).map(video => {
        if (!targets.has(video.id) || video.status === status || video.status === 'deleted') return video
        const dates = action === 'delete' ? { deletedAt: tx.now } : { publishedAt: action === 'publish' ? tx.now : null }
        const next = { ...video, ...dates, status, updatedAt: tx.now }
        changes.push(audit(tx, action + '_video', 'video', video.id, video, next))
        return next
      })
      return changes.length ? { ...current, videos: records, stateChanges: appendChanges(current, changes) } : current
    }, message)
    setSelected([])
  }

  const selectedVideos = visible.filter(video => selected.includes(video.id))
  const deletingVideo = deleting?.length === 1 ? videos.find(video => video.id === deleting[0]) : null
  return <><Heading title="Video Producer" description="Find recordings and manage what appears on your channel." />
    <section className="panel video-library stack">
      <div className="video-filters">
        <label>Search videos<input type="search" name="query" value={filters.query} onChange={changeFilter} placeholder="Search title or description" /></label>
        <label>Video type<select name="type" value={filters.type} onChange={changeFilter}>
          <option value="">All types</option>{Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Visibility<select name="visibility" value={filters.visibility} onChange={changeFilter}>
          <option value="">All visibility</option><option value="published">Published</option><option value="unpublished">Unpublished</option>
        </select></label>
        <label>Sort by<select name="sort" value={filters.sort} onChange={changeFilter}>
          <option value="newest">Newest</option><option value="views">Most views</option><option value="duration">Longest duration</option>
        </select></label>
      </div>
      <div className="row between library-meta" aria-live="polite">
        <span className="meta">{matching.length} {matching.length === 1 ? 'video' : 'videos'}</span>
        {(filters.query || filters.type || filters.visibility || filters.sort !== 'newest') && <button onClick={clearFilters}>Clear filters</button>}
      </div>
      {!!selectedVideos.length && <div className="bulk-bar row between">
        <strong>{selectedVideos.length} selected</strong><div className="actions">
          <button disabled={selectedVideos.every(video => video.status === 'published')} onClick={() => apply('publish', selected)}>Publish selected</button>
          <button disabled={selectedVideos.every(video => video.status === 'unpublished')} onClick={() => apply('unpublish', selected)}>Unpublish selected</button>
          <button className="danger-text" onClick={() => setDeleting(selected)}>Delete selected</button>
        </div>
      </div>}
      {!visible.length ? <Empty title={videos.length ? 'No videos match these filters.' : 'No videos in the library.'}>
        {!(filters.query || filters.type || filters.visibility || filters.sort !== 'newest') ? null : <p>Clear filters to return to the full library.</p>}
      </Empty> : <>
        <div className="table-scroll"><table className="video-table"><thead><tr>
          <th scope="col"><input type="checkbox" aria-label="Select all videos on this page" checked={allSelected}
            onChange={() => setSelected(allSelected ? [] : visible.map(video => video.id))} /></th>
          <th scope="col">Video</th><th scope="col">Type</th><th scope="col">Visibility</th><th scope="col">Date</th><th scope="col">Views</th>
          <th scope="col"><span className="sr-only">Actions</span></th>
        </tr></thead><tbody>{visible.map(video => {
          const name = video.title || 'Untitled video'
          const checked = selected.includes(video.id)
          return <tr key={video.id} className={checked ? 'selected' : ''}>
            <td><input type="checkbox" checked={checked} aria-label={'Select ' + name} onChange={() =>
              setSelected(ids => checked ? ids.filter(id => id !== video.id) : [...ids, video.id])} /></td>
            <td><div className="video-name">
              <div className="thumbnail"><Cover categories={categories} categoryId={video.categoryId} artworkKey={video.artworkKey} />
                <span className="duration metric">{duration(video.durationSeconds)}</span></div>
              <div><button className="text-button" onClick={() => setEditing(video)}>{name}</button>
                <small>{categoryName(categories, video.categoryId)}</small></div>
            </div></td>
            <td>{types[video.type] || video.type || '—'}</td><td><Badge status={video.status} /></td>
            <td className="metric nowrap">{displayInstant(video.createdAt)}</td>
            <td className="metric">{video.viewCount?.toLocaleString('en-US') ?? '—'}</td>
            <td><VideoMenu video={video} edit={setEditing} apply={apply} remove={setDeleting} /></td>
          </tr>
        })}</tbody></table></div>
        <div className="row between pagination"><span className="meta">Page {currentPage} of {pages}</span><div className="actions">
          <button disabled={currentPage <= 1} onClick={() => jump(currentPage - 1)}>Previous</button>
          <button disabled={currentPage >= pages} onClick={() => jump(currentPage + 1)}>Next</button>
        </div></div>
      </>}
    </section>
    {editing && <VideoEditor video={editing} close={() => setEditing(null)} />}
    {deleting && <Confirm title={deleting.length === 1 ? 'Delete video?' : 'Delete videos?'} verb="Delete" close={() => setDeleting(null)}
      confirm={() => { apply('delete', deleting); setDeleting(null) }}>
      {deletingVideo ? 'Delete “' + (deletingVideo.title || 'Untitled video') + '” from your library?' : 'Delete ' + deleting.length + ' selected videos from your library?'}
    </Confirm>}
  </>
}

