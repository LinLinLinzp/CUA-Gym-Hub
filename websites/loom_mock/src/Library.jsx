import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownUp, ArrowRight, CheckSquare, ChevronRight, Film, Folder, Folders, Plus, Search, Video } from 'lucide-react'
import { getSample } from './data/media.js'
import { dateLabel, durationLabel, findFolder, folderName, userName, videoTitle } from './store.jsx'
import { withSid } from './utils/dataManager.js'

export const videoPath = (id) => '/share/' + encodeURIComponent(id)
export const folderPath = (id) => '/folders/' + encodeURIComponent(id)
const tileColors = ['orchid', 'mint', 'peach', 'sky', 'rose', 'slate']

function videoDuration(video) {
  const duration = video.durationSeconds ?? getSample(video.sampleKey)?.duration
  return Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0
}

export function Avatar({ user }) {
  const initials = user?.initials || (typeof user?.name === 'string' ? user.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('') : '?')
  const color = tileColors.includes(user?.colorKey) ? user.colorKey : 'orchid'
  return <span className={'avatar tone-' + color} aria-hidden="true">{initials}</span>
}

export function FolderIcon({ folder }) {
  const key = String(folder.id || folder.name || '')
  const variant = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tileColors.length
  return <span className={'folder-icon tone-' + tileColors[variant]}><Folder size={19} aria-hidden="true" /></span>
}

export function ItemMenu({ label, choices }) {
  const [open, setOpen] = useState(false)
  return <details className="item-menu" open={open} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.currentTarget.querySelector('summary').focus()
      setOpen(false)
    }
  }}>
    <summary aria-label={'Actions for ' + label} onClick={(event) => { event.preventDefault(); setOpen(!open) }}>
      <span aria-hidden="true">•••</span>
    </summary>
    {open && <div className="menu-popover">
      {choices.map(([text, action]) => <button type="button" key={text} onClick={(event) => {
        event.currentTarget.closest('details').querySelector('summary').focus()
        setOpen(false)
        action()
      }}>{text}</button>)}
    </div>}
  </details>
}

export function VideoMenu({ video, choose, duplicate }) {
  return <ItemMenu label={videoTitle(video)} choices={[
    ['Rename', () => choose({ type: 'renameVideo', item: video })],
    ['Duplicate', () => duplicate(video)],
    ['Move', () => choose({ type: 'move', item: video })],
    ['Archive', () => choose({ type: 'archiveVideo', item: video })],
  ]} />
}

function Thumbnail({ video }) {
  const sample = getSample(video.sampleKey)
  return <div className="thumbnail">
    {sample ? <img src={sample.poster} alt="" loading="lazy" /> : <Film size={32} aria-hidden="true" />}
    <span className="duration">{durationLabel(videoDuration(video))}</span>
  </div>
}

function VideoCard({ video, user, choose, duplicate, selected, toggle }) {
  const title = videoTitle(video)
  const url = withSid(videoPath(video.id))
  return <article className={'video-card' + (selected ? ' selected' : '')}>
    <Link to={url} className="thumbnail-link" tabIndex={-1} aria-hidden="true"><Thumbnail video={video} /></Link>
    {toggle && <label className="selection-check">
      <input type="checkbox" checked={selected} onChange={() => toggle(video.id)} aria-label={'Select ' + title} />
    </label>}
    <div className="card-copy">
      <div className="card-text">
        <h3><Link to={url}>{title}</Link></h3>
        <p className="card-meta"><span>{userName(user)}</span><span className="dot" aria-hidden="true" />
          <time dateTime={video.updatedAt}>{dateLabel(video.updatedAt ?? video.createdAt)}</time></p>
      </div>
      <VideoMenu video={video} choose={choose} duplicate={duplicate} />
    </div>
  </article>
}

export function Empty({ icon: Icon = Video, title, children }) {
  return <div className="empty">
    <div className="empty-icon"><Icon size={25} aria-hidden="true" /></div>
    <h3>{title}</h3>
    {children}
  </div>
}

const newest = (a, b) => (Date.parse(b.updatedAt ?? b.createdAt) || 0) - (Date.parse(a.updatedAt ?? a.createdAt) || 0)
const order = {
  newest,
  title: (a, b) => videoTitle(a).localeCompare(videoTitle(b)),
  duration: (a, b) => videoDuration(b) - videoDuration(a),
}

export function VideoList({ videos, users, choose, duplicate, folderId, selection, setSelection }) {
  const [sort, setSort] = useState('newest')
  const ids = selection?.filter((id) => videos.some((video) => video.id === id)) ?? []
  function toggle(id) {
    setSelection(ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id])
  }
  return <section aria-labelledby="recordings-heading">
    <div className="section-heading">
      <div className="section-label"><h2 id="recordings-heading">Recordings</h2><span className="list-count">{videos.length}</span></div>
      <div className="section-controls">
        {videos.length > 0 && <button type="button" className={'button compact' + (selection ? ' is-selected' : '')}
          aria-pressed={Boolean(selection)} onClick={() => setSelection(selection ? null : [])}>
          <CheckSquare size={16} aria-hidden="true" /> {selection ? 'Cancel selection' : 'Select'}
        </button>}
        <label className="sort-control"><ArrowDownUp size={15} aria-hidden="true" />
          <select aria-label="Sort videos" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option><option value="title">Title A–Z</option>
            <option value="duration">Longest first</option>
          </select>
        </label>
      </div>
    </div>
    {selection && <div className="bulk-bar">
      <strong>{ids.length} selected</strong>
      <div className="section-controls">
        <button className="button compact" disabled={!ids.length} onClick={() => choose({ type: 'bulkMove', ids })}>Move selected</button>
        <button className="button compact" disabled={!ids.length} onClick={() => choose({ type: 'bulkArchive', ids })}>Archive selected</button>
      </div>
    </div>}
    {videos.length ? <div className="video-grid">
      {[...videos].sort(order[sort]).map((video) => <VideoCard key={video.id} video={video} user={users.get(video.ownerId)}
        choose={choose} duplicate={duplicate} selected={ids.includes(video.id)} toggle={selection ? toggle : null} />)}
    </div> : <Empty title="No recordings yet">
      <p>Add a video to start building this collection.</p>
      <button className="button primary" onClick={() => choose({ type: 'newVideo', folderId })}><Plus size={16} /> New video</button>
    </Empty>}
  </section>
}

function FolderRow({ folder, count, choose, compact }) {
  return <li className="folder-row">
    <Link className="folder-link" to={withSid(folderPath(folder.id))}>
      <FolderIcon folder={folder} />
      <div><strong>{folderName(folder)}</strong><span>{count} {count === 1 ? 'video' : 'videos'}</span></div>
      {compact && <ChevronRight size={15} className="folder-chevron" aria-hidden="true" />}
    </Link>
    {!compact && <ItemMenu label={folderName(folder)} choices={[
      ['Rename', () => choose({ type: 'renameFolder', item: folder })],
      ['Archive', () => choose({ type: 'archiveFolder', item: folder })],
    ]} />}
  </li>
}

export function FolderList({ folders, counts, choose, compact = false }) {
  if (!folders.length) return <Empty icon={Folders} title="No folders yet">
    <p>Create a folder to group related recordings.</p>
    <button className="button" onClick={() => choose({ type: 'newFolder' })}><Plus size={16} /> New folder</button>
  </Empty>

  return <ul className={compact ? 'folder-list compact-folders' : 'folder-list folder-index'}>
    {folders.map((folder) => <FolderRow key={folder.id} folder={folder} count={counts.get(folder.id) ?? 0} choose={choose} compact={compact} />)}
  </ul>
}

export function FolderPanel({ folders, counts, choose }) {
  return <aside className="folder-panel" aria-labelledby="folders-heading">
    <div className="panel-heading"><h2 id="folders-heading">Folders</h2><span className="list-count">{folders.length}</span></div>
    <FolderList folders={folders.slice(0, 5)} counts={counts} choose={choose} compact />
    <Link className="panel-footer" to={withSid('/folders')}>View all folders <ArrowRight size={16} aria-hidden="true" /></Link>
  </aside>
}

export function SearchResults({ query, videos, folders }) {
  const find = (...values) => values.some((value) => typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase()))
  const matchingFolders = folders.filter((folder) => find(folder.name, folder.description, ...(Array.isArray(folder.tags) ? folder.tags : [])))
  const matchingVideos = videos.filter((video) => find(video.title, video.description, ...(Array.isArray(video.tags) ? video.tags : [])))
  const count = matchingFolders.length + matchingVideos.length
  return <>
    <header className="page-heading"><div><h1 tabIndex={-1}>Search results</h1>
      <p>{count} {count === 1 ? 'result' : 'results'} for “{query}”</p></div></header>
    {count ? <ul className="result-list">
      {matchingFolders.map((folder) => <li key={folder.id}><Link to={withSid(folderPath(folder.id))}>
        <FolderIcon folder={folder} /><div><strong>{folderName(folder)}</strong><span>Folder · My Library</span></div><ChevronRight size={17} />
      </Link></li>)}
      {matchingVideos.map((video) => {
        const parent = findFolder(folders, video.folderId)
        return <li key={video.id}><Link to={withSid(videoPath(video.id))}>
          <span className="folder-icon tone-orchid"><Video size={19} /></span>
          <div><strong>{videoTitle(video)}</strong><span>Video · {parent ? folderName(parent) : 'My Library'}</span></div><ChevronRight size={17} />
        </Link></li>
      })}
    </ul> : <Empty icon={Search} title="No matching recordings or folders"><p>Try a different title, description or tag.</p></Empty>}
  </>
}
