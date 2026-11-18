import { useLayoutEffect, useState } from 'react'
import { Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { accountId, artistNames, canRead, label, lookup, route } from './data/model.js'
import { Art, ArtistLinks, Card, DetailHero, Empty, FollowButton, SaveButton, SiteLink, TrackList } from './ui.jsx'
import { BackLink, Browse, Following, Library, LikedSongs } from './collection.jsx'
import { Invite, Playlist, PlaylistForm } from './playlists.jsx'

function Masthead() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const actor = accountId(state)
  const person = lookup(state.users, actor)
  const library = pathname === '/' || /^\/(library|playlist|invite)(\/|$)/.test(pathname)
  const browse = /^\/(search|album|artist)(\/|$)/.test(pathname)
  return <header className="masthead">
    <div className="masthead-inner">
      <SiteLink className="wordmark" to="/">Spotify</SiteLink>
      <nav aria-label="Main navigation" className="primary-nav">
        <SiteLink to="/library" aria-current={library ? 'page' : undefined}>Your Library</SiteLink>
        <SiteLink to="/search" aria-current={browse ? 'page' : undefined}>Browse</SiteLink>
      </nav>
      <nav aria-label="Account" className="account-nav">
        <SiteLink to="/following" aria-current={pathname === '/following' ? 'page' : undefined}>Following</SiteLink>
        {actor && <SiteLink className="account-link" aria-label={label(person, 'Your profile')} to={route('user', actor)} aria-current={pathname === route('user', actor) ? 'page' : undefined}>
          <Art record={person} person /><span>{label(person, 'Your profile')}</span>
        </SiteLink>}
      </nav>
    </div>
  </header>
}

function Missing({ title = 'Page unavailable', to = '/library', link = 'Return to Your Library' }) {
  return <Empty title={title}><SiteLink to={to} className="button">{link}</SiteLink></Empty>
}

function Album() {
  const { id } = useParams()
  const { state } = useAccount()
  const album = lookup(state.albums, id)
  if (!album) return <Missing title="Album unavailable" to="/search" link="Browse catalog" />
  const tracks = state.tracks.filter((track) => track.albumId === id)
    .sort((a, b) => (a.trackNumber ?? Infinity) - (b.trackNumber ?? Infinity) || label(a).localeCompare(label(b)))
  return <>
    <BackLink to="/search">Browse</BackLink>
    <DetailHero type="Album" record={album} metadata={<><ArtistLinks ids={album.artistIds} />{album.year ? ` · ${album.year}` : ''} · {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</>}>
      <div className="action-row"><SaveButton type="album" record={album} /></div>
    </DetailHero>
    <section className="page-section"><h2>Tracks</h2>{tracks.length ? <TrackList tracks={tracks} /> : <Empty title="No tracks available" />}</section>
  </>
}

function Artist() {
  const { id } = useParams()
  const { state } = useAccount()
  const artist = lookup(state.artists, id)
  if (!artist) return <Missing title="Artist unavailable" to="/search" link="Browse catalog" />
  const albums = state.albums.filter((album) => album.artistIds?.includes(id))
  const tracks = state.tracks.filter((track) => track.artistIds?.includes(id))
  return <>
    <BackLink to="/search">Browse</BackLink>
    <DetailHero type="Artist" record={artist} metadata={artist.genre}>
      <div className="action-row"><FollowButton type="artist" record={artist} /></div>
    </DetailHero>
    <section className="page-section"><h2>Albums</h2>{albums.length ? <div className="card-grid">
      {albums.map((album) => <Card key={album.id} type="album" record={album} description={album.year || artistNames(state, album)} />)}
    </div> : <p className="metadata">No albums available.</p>}</section>
    <section className="page-section"><h2>Tracks</h2>{tracks.length ? <TrackList tracks={tracks} /> : <p className="metadata">No tracks available.</p>}</section>
  </>
}

function Profile() {
  const { id } = useParams()
  const { state } = useAccount()
  const user = lookup(state.users, id)
  const own = id === accountId(state)
  if (!user) return <Missing title="Profile unavailable" to="/search" link="Browse catalog" />
  const playlists = state.playlists.filter((playlist) => playlist.ownerId === id && canRead(state, playlist) && (own || playlist.visibility === 'public'))
  return <>
    <BackLink to={own ? '/library' : '/search'}>{own ? 'Your Library' : 'Browse'}</BackLink>
    <DetailHero type="Profile" record={user} metadata={user.handle ? `@${user.handle}` : undefined}>
      <div className="action-row">{own ? <SiteLink className="button" to="/following">View Following</SiteLink> : <FollowButton type="user" record={user} />}</div>
    </DetailHero>
    <section className="page-section"><h2>{own ? 'Your playlists' : 'Public playlists'}</h2>
      {playlists.length ? <div className="card-grid">{playlists.map((playlist) =>
        <Card key={playlist.id} type="playlist" record={playlist} description={playlist.visibility === 'public' ? 'Public playlist' : 'Private playlist'} />)}</div>
        : <p className="metadata">No {own ? '' : 'public '}playlists yet.</p>}
    </section>
  </>
}

function LibraryScreen() {
  const [creating, setCreating] = useState(false)
  return <>
    <Library onCreate={() => setCreating(true)} />
    {creating && <PlaylistForm onClose={() => setCreating(false)} />}
  </>
}

export function App() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Masthead />
    <main id="main-content" className="main" tabIndex={-1}>
      <Routes key={pathname}>
        <Route path="/" element={<LibraryScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/library/liked-songs" element={<LikedSongs />} />
        <Route path="/search" element={<Browse />} />
        <Route path="/playlist/:id" element={<Playlist />} />
        <Route path="/album/:id" element={<Album />} />
        <Route path="/artist/:id" element={<Artist />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/following" element={<Following />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
  </>
}


