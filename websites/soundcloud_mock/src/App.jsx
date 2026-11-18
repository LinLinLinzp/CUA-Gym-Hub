import { useEffect, useState } from 'react'
import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, ArrowRight, AudioLines, Disc3, Layers3, LayoutGrid, Menu, MessageCircle, Upload as UploadIcon } from 'lucide-react'
import { active, formatDate, nameOf, newest, titleOf, useStore } from './store'
import { Artwork, Back, Badge, Empty, PageHeading, SiteLink } from './ui'
import { withSid } from './utils/dataManager'
import { TrackList, TrackDetail, UploadPage } from './tracks'
import { PlaylistList, PlaylistDetail } from './playlists'
import { CommentsInbox } from './comments'
import { Insights } from './insights'

const navigation = [
  ['Overview', '/', LayoutGrid], ['Tracks', '/tracks', AudioLines], ['Playlists', '/playlists', Layers3],
  ['Comments', '/comments', MessageCircle], ['Insights', '/insights', Activity],
]

function Shell() {
  const { artistName } = useStore()
  const location = useLocation()
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    setMenu(false)
    window.scrollTo(0, 0)
  }, [location.pathname])
  const initials = artistName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
  return <div className="shell">
    <a href="#workspace" className="skip-link">Skip to content</a>
    <aside className={'rail ' + (menu ? 'menu-open' : '')}>
      <SiteLink className="wordmark" to="/">SoundCloud<span>.</span></SiteLink>
      <div className="rail-label">Creator workspace</div>
      <nav aria-label="Workspace" id="workspace-navigation">
        {navigation.map(([label, href, Icon]) => <NavLink to={withSid(href)} end={href === '/'} key={href}>
          <Icon size={19} aria-hidden="true" /> {label}
        </NavLink>)}
      </nav>
      <div className="rail-footer"><Disc3 size={17} aria-hidden="true" /> {artistName}</div>
    </aside>
    <header className="header">
      <div className="header-label"><span className="status-dot" /> Creator workspace</div>
      <button className="button menu-button" type="button" aria-expanded={menu} aria-controls="workspace-navigation"
        onClick={() => setMenu(!menu)}><Menu size={18} /> Menu</button>
      <div className="header-actions">
        <div className="identity"><span aria-hidden="true" className="avatar">{initials}</span><span>{artistName}</span></div>
        <SiteLink className="button primary" to="/upload"><UploadIcon size={17} /> Upload</SiteLink>
      </div>
    </header>
    <main className="workspace" id="workspace" tabIndex={-1}><Outlet /></main>
  </div>
}

function Overview() {
  const { artistName, ownedTracks, playlists, userId, comments, users } = useStore()
  const byTrack = new Map(ownedTracks.map((track) => [track.id, track]))
  const recent = comments.filter((comment) => active(comment) && byTrack.has(comment.trackId)).sort(newest)
  const cards = [
    ['Tracks', ownedTracks.length, '/tracks', AudioLines],
    ['Playlists', playlists.filter((playlist) => playlist.ownerId === userId).length, '/playlists', Layers3],
    ['Comments', recent.length, '/comments', MessageCircle],
  ]
  return <>
    <section className="welcome">
      <div className="welcome-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="welcome-content">
        <h1>Welcome back, {artistName.split(' ')[0]}.</h1>
        <p>Manage your releases and see how listeners are responding.</p>
        <SiteLink className="button primary" to="/upload"><UploadIcon size={17} /> Upload a track</SiteLink>
      </div>
    </section>
    <div className="summary-grid">
      {cards.map(([label, count, path, Icon]) => <SiteLink className="summary-card" key={path} to={path}>
        <span className="summary-icon"><Icon size={19} /></span>
        <span><strong>{count}</strong><span>{label}</span></span>
        <ArrowRight className="card-arrow" size={18} />
      </SiteLink>)}
    </div>
    <div className="overview-grid">
      <section className="panel overview-panel">
        <div className="section-heading"><h2>Recent tracks</h2><SiteLink to="/tracks">All tracks <ArrowRight size={15} /></SiteLink></div>
        {ownedTracks.length ? [...ownedTracks].sort(newest).slice(0, 5).map((track) => <SiteLink key={track.id} to={'/tracks/' + encodeURIComponent(track.id)} className="overview-row">
          <Artwork artworkKey={track.artworkKey} />
          <span className="row-copy"><strong>{titleOf(track)}</strong><small>{track.genre || 'Track'} · {formatDate(track.createdAt)}</small></span>
          <Badge visibility={track.visibility} />
        </SiteLink>) : <Empty>Your tracks will appear here after you publish.</Empty>}
      </section>
      <section className="panel overview-panel">
        <div className="section-heading"><h2>Recent comments</h2><SiteLink to="/comments">View inbox <ArrowRight size={15} /></SiteLink></div>
        {recent.length ? recent.slice(0, 4).map((comment) => <SiteLink key={comment.id} to={'/tracks/' + encodeURIComponent(comment.trackId) + '#comment-' + encodeURIComponent(comment.id)} className="overview-row">
          <span className="comment-icon"><MessageCircle size={17} /></span>
          <span className="row-copy"><small><strong>{nameOf(users, comment.authorId)}</strong> on {titleOf(byTrack.get(comment.trackId))}</small><span>{comment.body}</span></span>
        </SiteLink>) : <Empty>There are no comments on your tracks yet.</Empty>}
        <div className="overview-insights"><SiteLink to="/insights"><Activity size={17} /> Explore listening activity <ArrowRight size={15} /></SiteLink></div>
      </section>
    </div>
  </>
}

export default function App() {
  return <Routes><Route element={<Shell />}>
    <Route index element={<Overview />} />
    <Route path="tracks" element={<TrackList />} />
    <Route path="tracks/:trackId" element={<TrackDetail />} />
    <Route path="upload" element={<UploadPage />} />
    <Route path="playlists" element={<PlaylistList />} />
    <Route path="playlists/:playlistId" element={<PlaylistDetail />} />
    <Route path="comments" element={<CommentsInbox />} />
    <Route path="insights" element={<Insights />} />
    <Route path="*" element={<><Back to="/">Overview</Back><PageHeading title="Page unavailable" /></>} />
  </Route></Routes>
}
