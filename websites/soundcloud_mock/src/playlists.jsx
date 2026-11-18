import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ListMusic, Plus, Search, X } from 'lucide-react'
import { nameOf, newId, newest, now, records, titleOf, updateRecord, useFeedback, useStore } from './store'
import { Artwork, Back, Badge, Dialog, Empty, ErrorMessage, Field, PageHeading, Privacy, SiteLink, useSiteNavigate } from './ui'

const playlistPath = (id) => '/playlists/' + encodeURIComponent(id)
const idsFor = (playlist) => Array.isArray(playlist.trackIds) ? playlist.trackIds : []

function PlaylistFields({ draft, setDraft }) {
  const change = (key, value) => setDraft({ ...draft, [key]: value })
  return <div className="fields">
    <Field name="Title"><input required maxLength={180} value={draft.title} onChange={(event) => change('title', event.target.value)} /></Field>
    <Field name="Description"><textarea value={draft.description} maxLength={2000} rows={3} onChange={(event) => change('description', event.target.value)} /></Field>
    <Privacy value={draft.visibility} onChange={(value) => change('visibility', value)} />
  </div>
}

function CreatePlaylist({ track, close, back }) {
  const { commit, userId } = useStore()
  const feedback = useFeedback()
  const navigate = useSiteNavigate()
  const [draft, setDraft] = useState({ title: '', description: '', visibility: 'public' })
  const [error, setError] = useState('')
  function create(event) {
    event.preventDefault()
    if (!draft.title.trim()) return setError('Enter a title for this playlist.')
    const id = newId('pl')
    const playlist = {
      id, ownerId: userId, title: draft.title.trim(), description: draft.description.trim(),
      visibility: draft.visibility, trackIds: track ? [track.id] : [], artworkKey: id, createdAt: now(),
    }
    commit((state) => ({ ...state, playlists: [...records(state.playlists), playlist] }))
    feedback(track ? 'Playlist created and track added.' : 'Playlist created.')
    close()
    navigate(playlistPath(id))
  }
  return <Dialog title="Create playlist" onClose={close}>
    {track && <p className="dialog-copy">{titleOf(track)} will be added to the new playlist.</p>}
    <form onSubmit={create} noValidate>
      <PlaylistFields draft={draft} setDraft={setDraft} /><ErrorMessage>{error}</ErrorMessage>
      <div className="actions">
        <button className="button" type="button" onClick={back || close}>{back ? 'Back' : 'Cancel'}</button>
        <button className="button primary">Create playlist</button>
      </div>
    </form>
  </Dialog>
}

export function AddToPlaylist({ track, close }) {
  const { playlists, userId, commit } = useStore()
  const feedback = useFeedback()
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const owned = playlists.filter((playlist) => playlist.ownerId === userId)
  const available = (playlist) => !idsFor(playlist).includes(track.id)
  const selected = owned.find((playlist) => playlist.id === selectedId)
  function add(event) {
    event.preventDefault()
    if (!selected || !available(selected)) return
    commit((state) => {
      const current = records(state.playlists).find((playlist) => playlist.id === selectedId)
      return { ...state, playlists: updateRecord(state.playlists, selectedId,
        { trackIds: [...new Set([...idsFor(current), track.id])], updatedAt: now(), updatedBy: userId }) }
    })
    feedback('Track added to ' + titleOf(selected) + '.')
    close()
  }
  if (creating) return <CreatePlaylist track={track} close={close} back={() => setCreating(false)} />
  return <Dialog title="Add to playlist" onClose={close}>
    <p className="dialog-copy">Choose where to add {titleOf(track)}.</p>
    <form onSubmit={add}>
      {owned.length ? <Field name="Playlist"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        <option value="">Choose a playlist</option>
        {owned.map((playlist) => <option key={playlist.id} value={playlist.id} disabled={!available(playlist)}>
          {titleOf(playlist)}{available(playlist) ? '' : ' (already added)'}
        </option>)}
      </select></Field> : <Empty>You have no playlists yet.</Empty>}
      <button className="text-button dialog-link" type="button" onClick={() => setCreating(true)}><Plus size={16} /> Create playlist</button>
      <div className="actions"><button type="button" className="button" onClick={close}>Cancel</button>
        <button className="button primary" disabled={!selected || !available(selected)}>Add track</button></div>
    </form>
  </Dialog>
}

export function PlaylistList() {
  const { playlists, userId, tracks } = useStore()
  const [query, setQuery] = useState('')
  const [visibility, setVisibility] = useState('')
  const [creating, setCreating] = useState(false)
  const owned = playlists.filter((playlist) => playlist.ownerId === userId)
  const known = new Set(tracks.map((track) => track.id))
  const results = owned.filter((playlist) => (!visibility || playlist.visibility === visibility) &&
    titleOf(playlist).toLowerCase().includes(query.trim().toLowerCase())).sort(newest)
  return <>
    <PageHeading title="Playlists" description="Arrange tracks into collections for your listeners or your studio."
      action={<button className="button primary" onClick={() => setCreating(true)}><Plus size={18} /> Create playlist</button>} />
    <div className="filter-bar standalone">
      <Field name="Search playlists" icon={Search}>
        <input type="search" value={query} placeholder="Playlist title" onChange={(event) => setQuery(event.target.value)} /></Field>
      <Field name="Visibility"><select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
        <option value="">All visibility</option><option value="public">Public</option><option value="private">Private</option>
      </select></Field>
    </div>
    {results.length ? <div className="collection-grid">
      {results.map((playlist) => {
        const count = idsFor(playlist).filter((id) => known.has(id)).length
        return <SiteLink key={playlist.id} to={playlistPath(playlist.id)} className="panel collection-card">
          <Artwork artworkKey={playlist.artworkKey} /><div className="collection-copy"><h2>{titleOf(playlist)}</h2>
          <div><span><ListMusic size={16} /> {count} {count === 1 ? 'track' : 'tracks'}</span><Badge visibility={playlist.visibility} /></div></div>
        </SiteLink>
      })}
    </div> : <div className="panel"><Empty>{owned.length ? 'No playlists match these filters.' : 'Create a playlist to start collecting tracks.'}</Empty></div>}
    {creating && <CreatePlaylist close={() => setCreating(false)} />}
  </>
}

function TrackPicker({ selected, add, close }) {
  const { tracks, users } = useStore()
  const [query, setQuery] = useState('')
  const filtered = tracks.filter((track) => (titleOf(track) + ' ' + nameOf(users, track.ownerId)).toLowerCase().includes(query.trim().toLowerCase()))
  return <Dialog title="Add tracks" onClose={close}>
    <Field name="Find tracks"><input type="search" placeholder="Title or artist" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
    <div className="picker-list">
      {filtered.length ? filtered.map((track) => <div className="picker-row" key={track.id}>
        <Artwork artworkKey={track.artworkKey} /><span className="row-copy"><strong>{titleOf(track)}</strong><small>{nameOf(users, track.ownerId)}</small></span>
        <button className="button small" type="button" disabled={selected.includes(track.id)}
          aria-label={selected.includes(track.id) ? titleOf(track) + ' already added' : 'Add ' + titleOf(track)}
          onClick={() => add(track.id)}>{selected.includes(track.id) ? 'Added' : 'Add'}</button>
      </div>) : <Empty>No tracks match this search.</Empty>}
    </div>
    <div className="actions"><button className="button primary" type="button" onClick={close}>Done</button></div>
  </Dialog>
}

function PlaylistView({ playlist }) {
  const { tracks, users, userId, commit } = useStore()
  const feedback = useFeedback()
  const [draft, setDraft] = useState(null)
  const [editingMetadata, setEditingMetadata] = useState(false)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const byId = new Map(tracks.map((track) => [track.id, track]))
  const editable = playlist.ownerId === userId
  const current = draft || playlist
  const trackIds = idsFor(current)
  const visibleIds = trackIds.filter((id) => byId.has(id))
  const baseDraft = () => ({
    title: playlist.title || '', description: playlist.description || '',
    visibility: playlist.visibility === 'private' ? 'private' : 'public', trackIds: idsFor(playlist),
  })

  function changeOrder(callback) {
    setDraft((existing) => {
      const previous = existing || baseDraft()
      return { ...previous, trackIds: callback(previous.trackIds) }
    })
  }
  function move(id, otherId) {
    changeOrder((previous) => {
      const copy = [...previous]
      const index = copy.indexOf(id)
      const other = copy.indexOf(otherId)
      if (index >= 0 && other >= 0) [copy[index], copy[other]] = [copy[other], copy[index]]
      return copy
    })
  }
  function cancel() {
    setDraft(null)
    setEditingMetadata(false)
    setError('')
  }
  function save(event) {
    event.preventDefault()
    if (!draft) return
    if (editingMetadata && !draft.title.trim()) return setError('Enter a title for this playlist.')
    const metadata = editingMetadata
      ? { title: draft.title.trim(), description: draft.description.trim(), visibility: draft.visibility }
      : {}
    commit((state) => ({ ...state, playlists: updateRecord(state.playlists, playlist.id,
      { ...metadata, trackIds: draft.trackIds, updatedAt: now(), updatedBy: userId }) }))
    cancel()
    feedback('Playlist changes saved.')
  }

  return <>
    <Back to="/playlists">Playlists</Back>
    <section className="panel track-hero">
      <Artwork artworkKey={playlist.artworkKey} />
      <div className="track-identity"><Badge visibility={playlist.visibility} /><h1>{titleOf(playlist)}</h1>
        <p>{nameOf(users, playlist.ownerId)} · {visibleIds.length} {visibleIds.length === 1 ? 'track' : 'tracks'}</p></div>
      {editable && <div className="track-actions">
        <button className="button" type="button" onClick={() => { setEditingMetadata(true); setDraft(draft || baseDraft()) }}>Edit details</button>
        <button className="button primary" type="button" onClick={() => setPicking(true)}><Plus size={17} /> Add tracks</button>
      </div>}
      {playlist.description && <p className="track-description">{playlist.description}</p>}
    </section>
    <form onSubmit={save} noValidate>
      {editingMetadata && <section className="panel padded edit-panel"><h2>Edit details</h2>
        <PlaylistFields draft={draft} setDraft={setDraft} />
      </section>}
      <section className="panel padded playlist-order"><h2>Track order</h2>
        {visibleIds.length ? <ol>{visibleIds.map((id, index) => {
          const track = byId.get(id)
          return <li key={id} className="order-row">
            <span className="order-index">{index + 1}</span><Artwork artworkKey={track.artworkKey} />
            <span className="row-copy"><SiteLink to={'/tracks/' + encodeURIComponent(id)}>{titleOf(track)}</SiteLink><small>{nameOf(users, track.ownerId)}</small></span>
            {editable && <div className="order-actions">
              <button className="button icon-button" type="button" aria-label={'Move ' + titleOf(track) + ' up'} title="Move up"
                disabled={index === 0} onClick={() => move(id, visibleIds[index - 1])}><ArrowUp size={17} /></button>
              <button className="button icon-button" type="button" aria-label={'Move ' + titleOf(track) + ' down'} title="Move down"
                disabled={index === visibleIds.length - 1} onClick={() => move(id, visibleIds[index + 1])}><ArrowDown size={17} /></button>
              <button className="button icon-button danger" type="button" aria-label={'Remove ' + titleOf(track)} title="Remove"
                onClick={() => changeOrder((previous) => previous.filter((item) => item !== id))}><X size={17} /></button>
            </div>}
          </li>
        })}</ol> : <Empty>This playlist has no tracks.</Empty>}
        {editable && <><ErrorMessage>{error}</ErrorMessage><div className="actions">
          {draft && <button type="button" className="button" onClick={cancel}>Cancel</button>}
          <button className="button primary" disabled={!draft}>Save changes</button>
        </div></>}
      </section>
    </form>
    {picking && <TrackPicker selected={trackIds} add={(id) => changeOrder((previous) => previous.includes(id) ? previous : [...previous, id])}
      close={() => setPicking(false)} />}
  </>
}

export function PlaylistDetail() {
  const { playlistId } = useParams()
  const { playlists } = useStore()
  const playlist = playlists.find((item) => item.id === playlistId)
  return playlist ? <PlaylistView key={playlist.id} playlist={playlist} /> : <>
    <Back to="/playlists">Playlists</Back><PageHeading title="Playlist unavailable" description="This playlist could not be found in your workspace." />
  </>
}
