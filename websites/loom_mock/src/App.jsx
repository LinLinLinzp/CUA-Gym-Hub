import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Archive, ArrowLeft, Check, Film, FolderPlus, Plus, Search, X } from 'lucide-react'
import { ActionsDialog } from './ActionsDialog.jsx'
import { Avatar, Empty, FolderIcon, FolderList, FolderPanel, ItemMenu, SearchResults, VideoList, folderPath, videoPath } from './Library.jsx'
import VideoDetail, { Breadcrumb } from './VideoDetail.jsx'
import { dateLabel, findFolder, folderName, isActive, records, status, userName, useWorkspace, videoIsVisible, videoTitle } from './store.jsx'
import { withSid } from './utils/dataManager.js'

function Masthead({ query, setQuery, user, workspace }) {
  const { pathname } = useLocation()
  return <header className="masthead">
    <div className="masthead-inner">
      <Link className="wordmark" to={withSid('/library')} aria-label="Loom library">Loom<span aria-hidden="true">.</span></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className={pathname === '/' || pathname === '/library' ? 'nav-active' : undefined}
          aria-current={pathname === '/' || pathname === '/library' ? 'page' : undefined} to={withSid('/library')}>Library</Link>
        <NavLink to={withSid('/folders')}>Folders</NavLink>
        <NavLink to={withSid('/archive')}>Archive</NavLink>
      </nav>
      <div className="account-tools">
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input aria-label="Search" placeholder="Search videos and folders" value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') setQuery('') }} />
          {query && <button type="button" aria-label="Clear search" className="icon-button"
            onClick={(event) => { event.currentTarget.previousElementSibling.focus(); setQuery('') }}><X size={17} /></button>}
        </div>
        <div className="account" title={userName(user) + ' · ' + workspace}>
          <Avatar user={user} />
          <div><strong>{userName(user)}</strong><span>{workspace}</span></div>
        </div>
      </div>
    </div>
  </header>
}

function PageHeading({ title, children, description }) {
  return <header className="page-heading"><div><h1 tabIndex={-1}>{title}</h1>
    {description && <p>{description}</p>}</div>{children && <div className="heading-actions">{children}</div>}</header>
}

function ArchiveView({ videos, folders, choose }) {
  const groups = [
    { items: videos, title: 'Archived videos', path: videoPath, name: videoTitle, kind: 'Video' },
    { items: folders, title: 'Archived folders', path: folderPath, name: folderName, kind: 'Folder' },
  ]
  return <>
    <PageHeading title="Archive" description="Restore recordings and folders, or delete them permanently." />
    {!videos.length && !folders.length ? <Empty title="Archive is empty" icon={Archive}>
      <p>Archived recordings and folders appear here.</p>
      <Link className="button" to={withSid('/library')}>Back to My Library</Link>
    </Empty> : <div className="archive-groups">
      {groups.map(({ items, title, path, name, kind }) => <section key={title} aria-label={title}>
        <div className="section-heading"><div className="section-label"><h2>{title}</h2><span className="list-count">{items.length}</span></div></div>
        {items.length ? <ul className="archive-list">
          {items.map((item) => <li key={item.id}>
            <Link className="archive-item" to={withSid(path(item.id))}>
              {kind === 'Folder' ? <FolderIcon folder={item} /> : <span className="folder-icon tone-orchid"><Film size={19} /></span>}
              <div><strong>{name(item)}</strong><span>{item.archivedAt ? 'Archived ' + dateLabel(item.archivedAt) : 'Archived'}</span></div>
            </Link>
            <div className="archive-actions">
              <button className="button compact" aria-label={'Restore ' + name(item)} onClick={() => choose({ type: 'restore' + kind, item })}>Restore</button>
              <button className="button compact delete-link" aria-label={'Delete ' + name(item)} onClick={() => choose({ type: 'delete' + kind, item })}>Delete</button>
            </div>
          </li>)}
        </ul> : <p className="archive-empty">No {title.toLowerCase()}.</p>}
      </section>)}
    </div>}
  </>
}

function Missing() {
  return <>
    <PageHeading title="This item isn’t available" />
    <Empty icon={Film} title="We couldn’t find that item">
      <p>It may have been deleted or the link may be incomplete.</p>
      <Link className="button primary" to={withSid('/library')}><ArrowLeft size={16} /> Back to My Library</Link>
    </Empty>
  </>
}

export default function App() {
  const { state, commit, notice, setNotice } = useWorkspace()
  const [search, setSearch] = useState({ location: null, value: '' })
  const [selection, setSelection] = useState({ location: null, ids: null })
  const [action, setAction] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const query = search.location === location.key ? search.value : ''
  const selectedIds = selection.location === location.key && !query.trim() ? selection.ids : null
  const setSelectionIds = (ids) => setSelection({ location: location.key, ids })
  const setQuery = (value) => {
    setSearch({ location: location.key, value })
    if (value.trim() && selectedIds) setSelectionIds(null)
  }
  const choose = (next) => setAction(next)
  const close = () => setAction(null)

  useEffect(() => {
    setSelection({ location: null, ids: null })
    setSearch({ location: null, value: '' })
    setAction(null)
    window.scrollTo(0, 0)
  }, [location.key])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(id)
  }, [notice, setNotice])

  const folders = records(state.folders)
  const videos = records(state.videos)
  const users = new Map(records(state.users).map((user) => [user.id, user]))
  const activeFolders = folders.filter(isActive)
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]))
  const activeVideos = videos.filter((video) => isActive(video) && isActive(folderMap.get(video.folderId)))
  const counts = new Map()
  for (const video of activeVideos) {
    if (video.folderId != null) counts.set(video.folderId, (counts.get(video.folderId) ?? 0) + 1)
  }
  const workspace = state.account?.workspaceName || 'Workspace'
  const listProps = { users, choose, duplicate, selection: selectedIds, setSelection: setSelectionIds }

  function duplicate(video) {
    commit((previous, meta) => {
      const { archivedAt, deletedAt, ...copy } = video
      return { ...previous, videos: [...records(previous.videos), {
        ...copy, ...meta, id: crypto.randomUUID(), status: 'active', title: 'Copy of ' + videoTitle(video),
        createdAt: meta.updatedAt, ownerId: meta.updatedBy, folderId: video.folderId ?? null,
      }] }
    }, 'Video duplicated.')
  }

  function openedFolder() {
    const id = matchPath('/folders/:folderId', location.pathname)?.params.folderId
    const folder = findFolder(folders, decodeId(id))
    if (!folder || status(folder) === 'deleted') return <Missing />
    if (status(folder) === 'archived') return <>
      <Breadcrumb archive />
      <PageHeading title={folderName(folder)} />
      <Empty title="This folder is archived" icon={Archive}>
        <p>Restore the folder to view its active recordings.</p>
        <button className="button primary" onClick={() => choose({ type: 'restoreFolder', item: folder })}>Restore folder</button>
      </Empty>
    </>
    return <>
      <Breadcrumb />
      <PageHeading title={folderName(folder)} description="Recordings filed in this folder.">
        <button className="button primary" onClick={() => choose({ type: 'newVideo', folderId: folder.id })}><Plus size={18} /> New Video</button>
        <ItemMenu label={folderName(folder)} choices={[
          ['Rename', () => choose({ type: 'renameFolder', item: folder })],
          ['Archive', () => choose({ type: 'archiveFolder', item: folder })],
        ]} />
      </PageHeading>
      <VideoList key={folder.id} videos={activeVideos.filter((video) => video.folderId === folder.id)} folderId={folder.id} {...listProps} />
    </>
  }

  function openedVideo() {
    const id = matchPath('/share/:videoId', location.pathname)?.params.videoId
    const video = videos.find((entry) => entry.id === decodeId(id))
    const parent = findFolder(folders, video?.folderId)
    if (!video || status(video) === 'deleted' || status(parent) === 'deleted') return <Missing />
    const archived = !videoIsVisible(video, folders)
    return <VideoDetail key={video.id} video={video} parent={parent} users={users} choose={choose} duplicate={duplicate}
      archived={archived} parentArchived={isActive(video) && status(parent) === 'archived'} />
  }

  const library = <>
    <PageHeading title="My Library" description={'Your recordings and folders in ' + workspace + '.'}>
      <button className="button" onClick={() => choose({ type: 'newFolder' })}><FolderPlus size={18} /> New Folder</button>
      <button className="button primary" onClick={() => choose({ type: 'newVideo' })}><Plus size={18} /> New Video</button>
    </PageHeading>
    <div className="library-layout">
      <VideoList key="library" videos={activeVideos.filter((video) => video.folderId == null || !folderMap.has(video.folderId))} {...listProps} />
      <FolderPanel folders={activeFolders} counts={counts} choose={choose} />
    </div>
  </>

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Masthead query={query} setQuery={setQuery} user={users.get(state.account?.currentUserId)} workspace={workspace} />
    <main id="main-content" className="page" tabIndex={-1}>
      {query.trim() ? <SearchResults query={query.trim()} videos={activeVideos} folders={activeFolders} /> : <Routes>
        <Route path="/" element={library} />
        <Route path="/library" element={library} />
        <Route path="/folders" element={<>
          <PageHeading title="Folders" description="Browse recordings grouped by project or team.">
            <button className="button primary" onClick={() => choose({ type: 'newFolder' })}><FolderPlus size={18} /> New Folder</button>
          </PageHeading>
          <FolderList folders={activeFolders} counts={counts} choose={choose} />
        </>} />
        <Route path="/folders/:folderId" element={openedFolder()} />
        <Route path="/share/:videoId" element={openedVideo()} />
        <Route path="/archive" element={<ArchiveView videos={videos.filter((video) => status(video) === 'archived')}
          folders={folders.filter((folder) => status(folder) === 'archived')} choose={choose} />} />
        <Route path="*" element={<Missing />} />
      </Routes>}
    </main>
    {action && <ActionsDialog action={action} close={close} activeFolders={activeFolders} onBatch={() => setSelectionIds(null)}
      onCreated={(id) => navigate(withSid(videoPath(id)))}
      onArchived={(type, id) => {
        if ((type === 'archiveFolder' && location.pathname === folderPath(id)) ||
          (type === 'archiveVideo' && location.pathname === videoPath(id))) navigate(withSid('/archive'))
      }} />}
    <div className="notice-region" role="status">
      {notice && <div className="notice"><Check size={17} aria-hidden="true" />{notice.message}
        <button className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button></div>}
    </div>
  </>
}

function decodeId(id) {
  try { return decodeURIComponent(id) } catch { return id }
}
