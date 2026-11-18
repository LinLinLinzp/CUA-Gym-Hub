import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import {
  accountId, artistNames, canEdit, duration, followEntry, label, lookup, matches, orderedItems, route, savedEntry,
} from './data/model.js'

export const covers = [
  ['paper-sun', 'Paper Sun'], ['blue-hour', 'Blue Hour'], ['cabin-print', 'Cabin Print'],
  ['rain-print', 'Rain Print'], ['fresh-press', 'Fresh Press'], ['kitchen-print', 'Kitchen Print'],
  ['porch-print', 'Porch Print'],
]
const illustrations = [...covers.map(([key]) => key), ...Array.from({ length: 8 }, (_, i) => `print-${i}`)]
export function coverPath(key) {
  const value = String(key || 'paper-sun')
  const hash = Array.from(value).reduce((result, character) => (Math.imul(result, 31) + character.codePointAt(0)) >>> 0, 0)
  const artwork = illustrations.includes(value) ? value : `print-${hash % 8}`
  return `/covers/${artwork}.webp`
}

export function Icon({ name, size = 18 }) {
  const shapes = {
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
    search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4 4"/></>,
    heart: <path d="M20.2 5.9a4.5 4.5 0 0 0-6.4 0L12 7.7l-1.8-1.8a4.5 4.5 0 1 0-6.4 6.4l8.2 8 8.2-8a4.5 4.5 0 0 0 0-6.4Z"/>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M2.5 19v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1M16 5a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3.5 4v1"/></>,
    mail: <><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    back: <path d="M20 12H5m6-6-6 6 6 6"/>,
    up: <path d="M12 19V5m-5 5 5-5 5 5"/>,
    down: <path d="M12 5v14m-5-5 5 5 5-5"/>,
    grip: <path d="M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01"/>,
    record: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 6a6 6 0 0 0-6 6"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'grip' ? 3 : 1.65} strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path) => navigate(withSid(path))
}

export function Art({ record, person = false, className = '', loading = 'lazy' }) {
  if (person && !record?.artKey) {
    const initials = label(record, 'Listener').trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
    return <span aria-hidden="true" className={`art initials ${className}`}>{initials}</span>
  }
  return <img alt="" className={`art ${className}`} src={coverPath(record?.artKey || record?.id)} loading={loading} />
}

export function SearchField({ label: name, value, onChange, placeholder, className = '' }) {
  return <label className={`search-field ${className}`}>
    <Icon name="search" />
    <input aria-label={name} type="search" data-initial-focus value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || name} />
  </label>
}

export function Chips({ options, active, onChange, label: name }) {
  return <div className="chips" role="group" aria-label={name}>
    {options.map(([value, text]) => <button key={value} type="button" aria-pressed={active === value} onClick={() => onChange(value)}>{text}</button>)}
  </div>
}

export function Empty({ title, children }) {
  return <div className="empty"><span className="empty-icon"><Icon name="record" size={24} /></span><h2>{title}</h2>{children}</div>
}

export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-initial-focus]')?.focus()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="dialog-header">
      <h2 id="dialog-title">{title}</h2>
      <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
    </header>
    {children}
  </dialog>
}

export function Card({ type, record, description, children, loading = 'eager' }) {
  return <article className="card">
    <SiteLink to={route(type, record.id)} className="card-link">
      <Art record={record} person={type === 'user'} loading={loading} />
      <h3>{label(record)}</h3>
    </SiteLink>
    <p className="metadata">{description}</p>
    {children}
  </article>
}

export function SaveButton({ type, record, compact = false }) {
  const { state, dispatch } = useAccount()
  const saved = Boolean(savedEntry(state, type, record.id))
  const noun = type === 'track' ? 'Liked Songs' : 'library'
  const change = () => dispatch({
    type: 'setLibrary', targetType: type, targetId: record.id, status: saved ? 'removed' : 'saved',
  }, saved ? `Removed from ${noun}.` : `Saved to ${noun}.`)
  return <button type="button" className={compact ? 'button small' : 'button'} aria-label={`${saved ? 'Remove' : 'Save'} ${label(record)} ${saved ? 'from' : 'to'} ${noun}`} onClick={change}>
    <Icon name={saved ? 'check' : type === 'track' ? 'heart' : 'plus'} size={16} />{saved ? (compact ? 'Remove' : `Remove from ${noun}`) : (compact ? 'Save' : `Save to ${noun}`)}
  </button>
}

export function FollowButton({ type, record }) {
  const { state, dispatch } = useAccount()
  if (type === 'user' && record.id === accountId(state)) return null
  const following = Boolean(followEntry(state, type, record.id))
  return <button type="button" className={following ? 'button' : 'button primary'} aria-label={`${following ? 'Following' : 'Follow'} ${label(record)}`} title={following ? 'Click to unfollow' : undefined}
    onClick={() => dispatch({ type: 'setFollow', targetType: type, targetId: record.id, status: following ? 'unfollowed' : 'following' },
      following ? `Unfollowed ${label(record)}.` : `Now following ${label(record)}.`)}>
    <Icon name={following ? 'check' : 'plus'} size={16} />{following ? 'Following' : 'Follow'}
  </button>
}

export function ArtistLinks({ ids = [] }) {
  const { state } = useAccount()
  const artists = (ids || []).map((id) => lookup(state.artists, id)).filter(Boolean)
  return artists.length ? artists.map((artist, index) => <span key={artist.id}>
    {index > 0 ? ', ' : ''}<SiteLink to={route('artist', artist.id)}>{label(artist)}</SiteLink>
  </span>) : 'Unknown artist'
}

export function PersonLink({ id }) {
  const { state } = useAccount()
  const person = lookup(state.users, id)
  return person ? <SiteLink to={route('user', id)}>{label(person)}</SiteLink> : 'Unknown listener'
}

function DestinationDialog({ track, onClose }) {
  const { state, dispatch } = useAccount()
  const [query, setQuery] = useState('')
  const eligible = state.playlists.filter((playlist) => canEdit(state, playlist))
  const results = eligible.filter((playlist) => matches(query, playlist.name))
  const containsTrack = new Set(state.playlistItems.filter((item) => item.trackId === track.id &&
    (item.status ?? 'active') === 'active').map((item) => item.playlistId))
  return <Dialog title="Add to playlist" onClose={onClose} wide>
    <p className="metadata dialog-description">{label(track)} · {artistNames(state, track) || 'Unknown artist'}</p>
    {eligible.length > 0 && <SearchField label="Find a playlist" value={query} onChange={setQuery} />}
    <ul className="picker">
      {results.map((playlist) => {
        const added = containsTrack.has(playlist.id)
        return <li key={playlist.id}><Art record={playlist} /><strong>{label(playlist)}</strong>
          <button className="button small" type="button" disabled={added} aria-label={added ? `Already in ${label(playlist)}` : `Add to ${label(playlist)}`}
            onClick={async () => { if (await dispatch({ type: 'addTrack', playlistId: playlist.id, trackId: track.id }, `Added to ${label(playlist)}.`)) onClose() }}>
            {added ? 'Added' : 'Add'}
          </button>
        </li>
      })}
    </ul>
    {!results.length && <p className="metadata">{eligible.length ? 'No matching playlists.' : 'Create a playlist to add this track.'}</p>}
  </Dialog>
}

export function TrackList({ tracks = [], playlist, editable = false }) {
  const { state, dispatch } = useAccount()
  const [destination, setDestination] = useState(null)
  const [dragged, setDragged] = useState(null)
  const [drop, setDrop] = useState(null)
  const rows = playlist ? orderedItems(state, playlist.id).map((item) => ({ item, track: lookup(state.tracks, item.trackId) }))
    : tracks.map((track) => ({ track }))
  const sourceIndex = rows.findIndex(({ item }) => item?.id === dragged)
  const hasDestination = state.playlists.some((entry) => canEdit(state, entry))
  function move(itemId, placement) {
    dispatch({ type: 'moveTrack', playlistId: playlist.id, itemId, ...placement }, 'Track order updated.')
  }
  function finishDrag() {
    setDragged(null)
    setDrop(null)
  }
  return <>
    <ul className="track-list" aria-label={playlist ? 'Playlist tracks' : 'Tracks'}>
      {rows.map(({ track, item }, index) => {
        const album = lookup(state.albums, track?.albumId)
        const title = label(track, 'Unavailable track')
        return <li key={item?.id ?? track.id} className={`track-row${drop === item?.id && dragged ? (index > sourceIndex ? ' drop-after' : ' drop-target') : ''}`}
          onDragOver={editable ? (event) => { if (dragged) { event.preventDefault(); setDrop(item.id) } } : undefined}
          onDrop={editable ? (event) => {
            event.preventDefault()
            if (dragged && dragged !== item.id) move(dragged, { targetItemId: item.id })
            finishDrag()
          } : undefined}>
          <span className="track-index">
            {editable ? <span className="drag-handle" draggable title={`Drag to reorder ${title}`}
              onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); setDragged(item.id) }}
              onDragEnd={finishDrag}><Icon name="grip" size={17} /></span> : index + 1}
          </span>
          <Art record={album || track} className="track-art" />
          <div className="track-title">
            <strong>{title}</strong>
            <span className="metadata"><ArtistLinks ids={track?.artistIds} /></span>
            {album && <span className="metadata mobile-album"><SiteLink to={route('album', album.id)}>{label(album)}</SiteLink></span>}
            {playlist?.collaborative && <span className="metadata contributor">Added by <PersonLink id={item.addedBy} /></span>}
          </div>
          <div className="track-album metadata">{album && <SiteLink to={route('album', album.id)}>{label(album)}</SiteLink>}</div>
          <div className="track-duration metadata">{duration(track?.durationMs)}</div>
          <div className="track-actions">
            {track && <SaveButton type="track" record={track} compact />}
            {track && hasDestination && <button className="button small" type="button" aria-label={`Add ${title} to playlist`} onClick={() => setDestination(track)}>Add to playlist</button>}
            {editable && <>
              <div className="move-buttons">
                <button className="icon-button small" type="button" title="Move up" aria-label={`Move up ${title} (track ${index + 1})`} disabled={index === 0} onClick={() => move(item.id, { delta: -1 })}><Icon name="up" size={15} /></button>
                <button className="icon-button small" type="button" title="Move down" aria-label={`Move down ${title} (track ${index + 1})`} disabled={index === rows.length - 1} onClick={() => move(item.id, { delta: 1 })}><Icon name="down" size={15} /></button>
              </div>
              <button className="icon-button small" type="button" title="Remove from playlist" aria-label={`Remove ${title} from playlist (track ${index + 1})`}
                onClick={() => dispatch({ type: 'removeTrack', playlistId: playlist.id, itemId: item.id }, 'Track removed from playlist.')}><Icon name="close" size={16} /></button>
            </>}
          </div>
        </li>
      })}
    </ul>
    {destination && <DestinationDialog track={destination} onClose={() => setDestination(null)} />}
  </>
}

export function DetailHero({ type, record, metadata, children }) {
  return <div className="detail-hero">
    <Art record={record} person={type === 'Profile'} loading="eager" />
    <div className="hero-body">
      <p className="eyebrow">{type}</p>
      <h1>{label(record)}</h1>
      {metadata && <p className="metadata hero-meta">{metadata}</p>}
      {(record.description || record.bio) && <p className="hero-description">{record.description || record.bio}</p>}
      {children}
    </div>
  </div>
}



