import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { accountId, artistNames, canRead, inviteStatus, isEditor, isOwner, label, lookup, matches, route } from './data/model.js'
import { Art, Card, Chips, Empty, FollowButton, Icon, SearchField, SiteLink, TrackList } from './ui.jsx'

const collectionTypes = [['all', 'All items'], ['playlist', 'Playlists'], ['album', 'Albums'], ['artist', 'Artists'], ['shared', 'Shared']]
const browseTypes = [['all', 'All results'], ['track', 'Tracks'], ['album', 'Albums'], ['artist', 'Artists'], ['playlist', 'Playlists'], ['user', 'Profiles']]
const plural = (type) => browseTypes.find(([key]) => key === type)?.[1]
const recency = (record) => record.updatedAt || record.createdAt || ''

export function Library({ onCreate }) {
  const { state } = useAccount()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const type = collectionTypes.some(([key]) => key === params.get('type')) ? params.get('type') : 'all'
  function filter(value) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('type')
    else next.set('type', value)
    setParams(next, { replace: true })
  }
  const actor = accountId(state)
  const saved = state.libraryEntries.filter((entry) => entry.userId === actor && entry.status === 'saved')
  const liked = saved.filter((entry) => entry.targetType === 'track' && lookup(state.tracks, entry.targetId)).length
  const owned = state.playlists.filter((playlist) => isOwner(state, playlist))
  const shared = state.playlists.filter((playlist) => !isOwner(state, playlist) && isEditor(state, playlist))
  const invites = state.playlistInvites.filter((invite) => invite.recipientId === actor && invite.status === 'pending' &&
    inviteStatus(state, invite) === 'joinable')
  const feature = lookup(owned, 'playlist-sunday') || [...owned, ...shared].sort((a, b) => recency(b).localeCompare(recency(a)))[0]
  const collectedPlaylists = state.playlists.flatMap((playlist) => {
    const own = isOwner(state, playlist)
    const member = !own && isEditor(state, playlist)
    const entry = saved.find((entry) => entry.targetType === 'playlist' && entry.targetId === playlist.id)
    if (!canRead(state, playlist) || !(own || member || entry)) return []
    return [{
      type: 'playlist', record: playlist, shared: member,
      detail: own ? (playlist.collaborative ? 'Collaborative playlist' : 'Playlist · You') : `Playlist · ${label(lookup(state.users, playlist.ownerId), 'Unknown listener')}`,
      date: own || member ? recency(playlist) : recency(entry),
    }]
  })
  const entries = [
    ...collectedPlaylists,
    ...saved.filter((entry) => entry.targetType === 'album').flatMap((entry) => {
      const record = lookup(state.albums, entry.targetId)
      return record ? [{ type: 'album', record, detail: `Album · ${artistNames(state, record) || 'Unknown artist'}`, date: recency(entry) }] : []
    }),
    ...state.follows.filter((entry) => entry.followerId === actor && entry.targetType === 'artist' && entry.status === 'following').flatMap((entry) => {
      const record = lookup(state.artists, entry.targetId)
      return record ? [{ type: 'artist', record, detail: record.genre || 'Artist', date: recency(entry) }] : []
    }),
  ]
  const byTitle = (a, b) => label(a.record).localeCompare(label(b.record))
  const filtered = entries.filter((entry) => (type === 'all' || type === entry.type || (type === 'shared' && entry.shared)) &&
    matches(query, label(entry.record), entry.detail))
    .sort((a, b) => sort === 'title' ? byTitle(a, b) : b.date.localeCompare(a.date) || byTitle(a, b))
  return <>
    <header className="page-heading">
      <div><h1>Your Library</h1><p>Playlists, saved music, and artists you follow.</p></div>
      <button className="button primary" type="button" onClick={onCreate}><Icon name="plus" />Create playlist</button>
    </header>
    <div className="library-layout">
      <aside className="rail" aria-label="Library shortcuts">
        <section>
          <h2>Shortcuts</h2>
          <SiteLink className="rail-link" to="/library/liked-songs">
            <span className="rail-icon liked"><Icon name="heart" /></span>
            <span><strong>Liked Songs</strong><small>{liked} {liked === 1 ? 'song' : 'songs'}</small></span>
            <Icon name="arrow" size={16} />
          </SiteLink>
        </section>
        <section>
          <h2>Shared with you</h2>
          {shared.length ? shared.slice(0, 3).map((playlist) => <SiteLink className="rail-link" to={route('playlist', playlist.id)} key={playlist.id}>
            <Art record={playlist} loading="eager" /><span><strong>{label(playlist)}</strong><small>By {label(lookup(state.users, playlist.ownerId), 'Unknown listener')}</small></span>
          </SiteLink>) : <p className="metadata">Shared playlists appear here when you join.</p>}
          {shared.length > 3 && <button className="text-button" type="button" onClick={() => filter('shared')}>View all shared playlists</button>}
        </section>
        <section>
          <h2>Invitations</h2>
          {invites.length ? invites.map((invite) => {
            const playlist = lookup(state.playlists, invite.playlistId)
            const inviter = label(lookup(state.users, invite.invitedBy), 'Unknown listener')
            return <SiteLink className="rail-link" to={`/invite/${encodeURIComponent(invite.token)}`} key={invite.id}>
              <span className="rail-icon mail"><Icon name="mail" /></span>
              <span><strong>{label(playlist)}</strong><small>{inviteStatus(state, invite) === 'expired' ? 'Expired invitation' : `From ${inviter}`}</small></span>
            </SiteLink>
          }) : <p className="metadata">No pending invitations.</p>}
        </section>
      </aside>
      <div className="collection-main">
        {feature && <section className="feature" aria-label="From your collection">
          <div className="feature-copy">
            <p className="eyebrow"><Icon name="record" size={16} /> From your collection</p>
            <h2>{label(feature)}</h2>
            {feature.description && <p className="feature-description">{feature.description}</p>}
            <SiteLink className="button primary" to={route('playlist', feature.id)}>Open playlist <Icon name="arrow" size={17} /></SiteLink>
          </div>
          <div className={`feature-print${feature.artKey === 'paper-sun' ? ' sun-print' : ''}`}>
            <Art record={feature} loading="eager" />
          </div>
        </section>}
        <section className="collection">
          <div className="section-heading">
            <div className="section-title"><h2>Collection</h2><span>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</span></div>
            <label className="sort"><span>Sort by</span><select aria-label="Sort collection" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recent">Recent</option><option value="title">Title</option>
            </select></label>
          </div>
          <div className="collection-toolbar">
            <Chips options={collectionTypes} active={type} onChange={filter} label="Collection type" />
            <SearchField label="Search collection" value={query} onChange={setQuery} />
          </div>
          {filtered.length ? <div className="card-grid">{filtered.map(({ type, record, detail }, index) =>
            <Card key={`${type}-${record.id}`} type={type} record={record} description={detail} loading={index < 10 ? 'eager' : 'lazy'} />)}</div>
            : <Empty title={query.trim() ? 'No matches in your collection' : 'Nothing here yet'}>
              <p>{query.trim() ? 'Try a different title or name.' : 'Browse for music or start a playlist of your own.'}</p>
              {query.trim() ? <button className="button" type="button" onClick={() => setQuery('')}>Clear search</button> : <SiteLink className="button" to="/search">Browse catalog</SiteLink>}
            </Empty>}
        </section>
      </div>
    </div>
  </>
}

export function Browse() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const results = {
    track: state.tracks.filter((track) => matches(query, label(track), artistNames(state, track), label(lookup(state.albums, track.albumId), ''))),
    album: state.albums.filter((album) => matches(query, label(album), artistNames(state, album))),
    artist: state.artists.filter((artist) => matches(query, label(artist), artist.genre)),
    playlist: state.playlists.filter((playlist) => canRead(state, playlist) && matches(query, label(playlist))),
    user: state.users.filter((user) => matches(query, label(user), user.handle)),
  }
  const sections = type === 'all' ? ['album', 'playlist', 'artist', 'track', 'user'] : [type]
  const searching = Boolean(query.trim())
  return <>
    <header className="page-heading"><div><h1>Browse</h1><p>Find music, playlists, and listeners.</p></div></header>
    <div className="browse-toolbar">
      <SearchField label="Search the catalog" value={query} onChange={setQuery} placeholder="Search songs, albums, artists, and more" />
      <Chips options={browseTypes} active={type} onChange={setType} label="Browse type" />
    </div>
    {sections.every((key) => !results[key].length) && <Empty title={searching ? 'No results found' : 'Nothing to browse yet'}>
      {searching && <button className="button" type="button" onClick={() => setQuery('')}>Clear search</button>}
    </Empty>}
    {sections.filter((key) => results[key].length).map((key) => {
      const records = type === 'all' ? results[key].slice(0, key === 'track' ? 6 : 5) : results[key]
      return <section className="page-section" key={key}>
        <header className="section-heading"><h2>{plural(key)}</h2>
          {records.length < results[key].length && <button className="text-button" type="button" onClick={() => setType(key)}>See all {plural(key).toLowerCase()} <Icon name="arrow" size={16} /></button>}
        </header>
        {key === 'track' ? <TrackList tracks={records} key={type} /> : <div className="card-grid">{records.map((record) =>
          <Card key={record.id} type={key} record={record} description={{
            album: () => artistNames(state, record) || 'Album', playlist: () => label(lookup(state.users, record.ownerId), 'Unknown listener'),
            artist: () => record.genre || 'Artist', user: () => record.handle ? `@${record.handle}` : 'Listener',
          }[key]()} />)}</div>}
      </section>
    })}
  </>
}

export function LikedSongs() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const tracks = state.libraryEntries.filter((entry) => entry.userId === accountId(state) && entry.targetType === 'track' && entry.status === 'saved')
    .sort((a, b) => recency(b).localeCompare(recency(a)))
    .map((entry) => lookup(state.tracks, entry.targetId)).filter(Boolean)
  const visible = tracks.filter((track) => matches(query, label(track), artistNames(state, track), label(lookup(state.albums, track.albumId), '')))
  return <>
    <BackLink />
    <header className="page-heading"><div><h1>Liked Songs</h1><p>{tracks.length} saved {tracks.length === 1 ? 'song' : 'songs'}</p></div></header>
    <SearchField label="Search Liked Songs" value={query} onChange={setQuery} className="standalone-search" />
    {visible.length ? <TrackList tracks={visible} /> : <Empty title={query.trim() ? 'No matching songs' : 'No liked songs yet'}>
      <SiteLink to="/search" className="button">Browse catalog</SiteLink>
    </Empty>}
  </>
}

export function Following() {
  const { state } = useAccount()
  const actor = accountId(state)
  return <>
    <header className="page-heading"><div><h1>Following</h1><p>Artists and listeners you follow.</p></div></header>
    {['artist', 'user'].map((type) => {
      const collection = type === 'artist' ? state.artists : state.users
      const records = state.follows.filter((entry) => entry.followerId === actor && entry.targetType === type &&
        entry.status === 'following' && (type !== 'user' || entry.targetId !== actor))
        .map((entry) => lookup(collection, entry.targetId)).filter(Boolean).sort((a, b) => label(a).localeCompare(label(b)))
      return <section className="page-section" key={type}>
        <h2>{type === 'artist' ? 'Artists' : 'People'}</h2>
        {records.length ? <div className="card-grid following-cards">{records.map((record) =>
          <Card key={record.id} type={type} record={record} description={type === 'artist' ? record.genre || 'Artist' : record.handle ? `@${record.handle}` : 'Listener'}>
            <FollowButton type={type} record={record} />
          </Card>)}</div> : <p className="metadata">You don’t follow any {type === 'artist' ? 'artists' : 'people'} yet.</p>}
      </section>
    })}
  </>
}

export function BackLink({ to = '/library', children = 'Your Library' }) {
  return <SiteLink className="back-link" to={to}><Icon name="back" size={16} />{children}</SiteLink>
}


