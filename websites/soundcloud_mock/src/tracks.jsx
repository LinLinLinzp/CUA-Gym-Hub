import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AudioLines, FileAudio, ListPlus, Pencil, Search, Upload } from 'lucide-react'
import { clockTime, formatDate, newId, newest, now, records, titleOf, updateRecord, useFeedback, useStore } from './store'
import { Artwork, Back, Badge, Empty, ErrorMessage, Field, PageHeading, Privacy, SiteLink, useSiteNavigate } from './ui'
import { AddToPlaylist } from './playlists'
import { TrackComments } from './comments'
import { withSid } from './utils/dataManager'

const audioExtension = /\.(aac|aif|aiff|alac|amr|flac|m4a|mp3|mp4|ogg|oga|opus|wav|wave|wma|webm)$/i
const trackPath = (id) => '/tracks/' + encodeURIComponent(id)
const newTrackDraft = { title: '', genre: '', tags: '', description: '', visibility: 'public' }
const uploadAction = <SiteLink className="button primary" to="/upload"><Upload size={17} /> Upload a track</SiteLink>

function TrackFields({ draft, setDraft, disabled }) {
  const change = (key, value) => setDraft({ ...draft, [key]: value })
  return <fieldset disabled={disabled} className="fields">
    <Field name="Title"><input required maxLength={180} value={draft.title} onChange={(event) => change('title', event.target.value)} /></Field>
    <Field name="Genre"><input maxLength={80} value={draft.genre} onChange={(event) => change('genre', event.target.value)} placeholder="e.g. Ambient" /></Field>
    <Field name="Tags" hint="Separate tags with commas."><input value={draft.tags} maxLength={300} onChange={(event) => change('tags', event.target.value)} /></Field>
    <Field name="Description"><textarea value={draft.description} maxLength={2000} onChange={(event) => change('description', event.target.value)} rows={4} /></Field>
    <Privacy value={draft.visibility} onChange={(value) => change('visibility', value)} />
  </fieldset>
}

function metadata(draft) {
  return {
    title: draft.title.trim(), genre: draft.genre.trim(),
    tags: [...new Set(draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean))],
    description: draft.description.trim(), visibility: draft.visibility,
  }
}

function readDuration(file) {
  const audio = new Audio()
  const url = URL.createObjectURL(file)
  return new Promise((resolve) => {
    function finish() {
      const seconds = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.max(1, Math.round(audio.duration)) : null
      clearTimeout(timeout)
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(seconds)
    }
    const timeout = setTimeout(finish, 2000)
    audio.onloadedmetadata = finish
    audio.onerror = finish
    audio.preload = 'metadata'
    audio.src = url
  })
}

export function UploadPage() {
  const { commit, userId } = useStore()
  const feedback = useFeedback()
  const navigate = useSiteNavigate()
  const [draft, setDraft] = useState(newTrackDraft)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const picker = useRef(null)
  const submitting = useRef(false)

  function choose(selected) {
    if (submitting.current || !selected) return
    if (!selected.size || !audioExtension.test(selected.name)) {
      setFile(null)
      setError('Choose a nonempty audio file in a supported format, such as WAV, MP3 or FLAC.')
      return
    }
    setFile(selected)
    setError('')
    if (!draft.title.trim() || draft.title === file?.name.replace(audioExtension, '')) {
      setDraft({ ...draft, title: selected.name.replace(audioExtension, '') })
    }
  }

  async function publish(event) {
    event.preventDefault()
    if (submitting.current) return
    if (!file) return setError('Choose an audio file to publish.')
    if (!draft.title.trim()) return setError('Enter a title for this track.')
    submitting.current = true
    setBusy(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    try {
      const duration = readDuration(file)
      const response = await fetch(withSid('/upload'), { method: 'POST', body })
      if (!response.ok) throw new Error('Upload failed')
      const { files } = await response.json()
      const saved = files?.[0]
      if (!saved?.url || !saved.stored_name || !saved.size) throw new Error('Missing audio metadata')
      const durationSeconds = await duration
      const trackId = newId('trk')
      const uploadId = newId('upl')
      const createdAt = now()
      const track = {
        id: trackId, ownerId: userId, uploadId, ...metadata(draft), artworkKey: trackId,
        durationSeconds, status: 'published', createdAt,
      }
      const upload = {
        id: uploadId, trackId, actorId: userId, status: 'published', createdAt,
        file: {
          originalName: saved.original_name, storedName: saved.stored_name,
          url: saved.url, sizeBytes: saved.size, contentType: saved.content_type,
        },
      }
      commit((state) => ({ ...state, uploads: [...records(state.uploads), upload], tracks: [...records(state.tracks), track] }))
      feedback('Track published.')
      navigate(trackPath(trackId))
    } catch {
      setError('The audio upload failed. Keep this file selected and choose Publish track to retry.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return <>
    <Back to="/tracks">Tracks</Back>
    <PageHeading title="Upload a track" description="Choose an audio file and prepare its release details." />
    <form className="upload-grid" onSubmit={publish} noValidate>
      <div className={'drop-zone ' + (dragging ? 'dragging' : '')}
        onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]) }}>
        <span className="drop-icon"><FileAudio size={30} /></span>
        <h2>{file ? file.name : 'Drop your audio here'}</h2>
        <p>{file ? Math.max(1, Math.round(file.size / 1024)) + ' KB selected' : 'WAV, MP3, FLAC and other common audio formats'}</p>
        <label className="sr-only" htmlFor="audio-file">Audio file</label>
        <input id="audio-file" ref={picker} className="sr-only" tabIndex={-1} type="file" disabled={busy}
          accept="audio/*,.aif,.aiff,.alac,.wma,.m4a" onChange={(event) => {
            choose(event.target.files[0])
            event.target.value = ''
          }} />
        <button className="button" type="button" disabled={busy} onClick={() => picker.current.click()}>{file ? 'Choose another file' : 'Choose audio file'}</button>
      </div>
      <section className="panel padded">
        <h2>Track details</h2>
        <TrackFields draft={draft} setDraft={setDraft} disabled={busy} />
        <ErrorMessage>{error}</ErrorMessage>
        <div className="actions">
          {!busy && <SiteLink className="button" to="/tracks">Cancel</SiteLink>}
          <button className="button primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish track'}</button>
        </div>
      </section>
    </form>
  </>
}

export function TrackList() {
  const { ownedTracks } = useStore()
  const [query, setQuery] = useState('')
  const [visibility, setVisibility] = useState('')
  const [sort, setSort] = useState('recent')
  const filtered = ownedTracks.filter((track) =>
    (!visibility || track.visibility === visibility) &&
    (titleOf(track) + ' ' + (track.genre || '')).toLowerCase().includes(query.trim().toLowerCase()))
  filtered.sort(sort === 'title' ? (a, b) => titleOf(a).localeCompare(titleOf(b)) : sort === 'oldest' ? (a, b) => newest(b, a) : newest)

  return <>
    <PageHeading title="Tracks" description="Browse and update your releases." action={uploadAction} />
    <section className="panel">
      <div className="filter-bar">
        <Field name="Search tracks" icon={Search}><input type="search" placeholder="Title or genre" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
        <Field name="Visibility"><select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <option value="">All visibility</option><option value="public">Public</option><option value="private">Private</option>
        </select></Field>
        <Field name="Sort by"><select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option>
        </select></Field>
      </div>
      {filtered.length ? <div className="table-wrap"><table>
        <thead><tr><th>Track</th><th>Genre</th><th>Visibility</th><th>Duration</th><th>Published</th></tr></thead>
        <tbody>{filtered.map((track) => <tr key={track.id}>
          <td><SiteLink className="table-track" to={trackPath(track.id)}><Artwork artworkKey={track.artworkKey} />{titleOf(track)}</SiteLink></td>
          <td>{track.genre || '—'}</td><td><Badge visibility={track.visibility} /></td>
          <td>{clockTime(track.durationSeconds)}</td><td>{formatDate(track.createdAt)}</td>
        </tr>)}</tbody>
      </table></div> : <Empty>{ownedTracks.length ? 'No tracks match these filters.' : 'Publish a track to start your catalog.'}</Empty>}
    </section>
  </>
}

function TrackEditor({ track, close }) {
  const { commit, userId } = useStore()
  const feedback = useFeedback()
  const [draft, setDraft] = useState({
    title: track.title || '', genre: track.genre || '', tags: Array.isArray(track.tags) ? track.tags.join(', ') : '',
    description: track.description || '', visibility: track.visibility === 'private' ? 'private' : 'public',
  })
  const [error, setError] = useState('')
  function save(event) {
    event.preventDefault()
    if (!draft.title.trim()) return setError('Enter a title for this track.')
    commit((state) => ({ ...state, tracks: updateRecord(state.tracks, track.id, { ...metadata(draft), updatedBy: userId, updatedAt: now() }) }))
    feedback('Track details saved.')
    close()
  }
  return <form className="panel padded edit-panel" onSubmit={save} noValidate>
    <h2>Edit details</h2><TrackFields draft={draft} setDraft={setDraft} />
    <ErrorMessage>{error}</ErrorMessage>
    <div className="actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary">Save changes</button></div>
  </form>
}

const bars = Array.from({ length: 62 }, (_, index) => 13 + Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.27)) * 57)
function Timeline({ track, localFile, position, setPosition }) {
  const duration = Number.isFinite(track.durationSeconds) && track.durationSeconds > 0 ? Math.floor(track.durationSeconds) : null
  const [hoveredSecond, setHoveredSecond] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const audio = useRef(null)
  const fileUrl = localFile?.url
  useEffect(() => {
    if (!fileUrl?.startsWith('/files/')) return
    const controller = new AbortController()
    let url
    fetch(fileUrl, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error('Audio unavailable')
      return response.blob()
    }).then((blob) => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(new Blob([blob], { type: localFile.contentType || blob.type }))
      setAudioUrl(url)
    }).catch(() => { if (!controller.signal.aborted) setPlaybackError('The audio preview is unavailable.') })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [fileUrl, localFile?.contentType])

  function seek(seconds) {
    setPosition(seconds)
    if (audio.current && Number.isFinite(audio.current.duration)) audio.current.currentTime = Math.min(seconds, audio.current.duration)
  }

  return <section className="panel padded timeline">
    <div className="section-heading"><h2><AudioLines size={20} /> Track timeline</h2>
      {duration !== null && <span className="timeline-time">{clockTime(hoveredSecond ?? position ?? 0)} / {clockTime(duration)}</span>}
    </div>
    <div className="waveform">
      <div className="wave-bars" aria-hidden="true">{bars.map((height, index) => <i key={index}
        className={position !== null && index / bars.length <= position / duration ? 'passed' : ''}
        style={{ height: height + 'px' }} />)}</div>
      {duration !== null && <input type="range" min="0" max={duration} step="1" value={position ?? 0}
        aria-label="Comment position" aria-valuetext={clockTime(position ?? 0)}
        onPointerMove={(event) => {
          const { left, width } = event.currentTarget.getBoundingClientRect()
          const fraction = Math.max(0, Math.min(1, (event.clientX - left) / width))
          setHoveredSecond(Math.round(fraction * duration))
        }}
        onPointerLeave={() => setHoveredSecond(null)}
        onChange={(event) => seek(Number(event.target.value))}
        onPointerUp={(event) => { if (position === null) seek(Number(event.currentTarget.value)) }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); seek(Number(event.currentTarget.value)) } }} />}
    </div>
    <div className="section-heading timeline-caption">
      <span>{duration === null ? 'Timing unavailable for this track.' : position === null ? 'Select a position to time your next comment.' : 'Next comment at ' + clockTime(position)}</span>
      {position !== null && <button type="button" className="text-button" onClick={() => setPosition(null)}>Clear time</button>}
    </div>
    {audioUrl && <audio aria-label="Track audio preview" ref={audio} controls preload="metadata" src={audioUrl} onError={() => setPlaybackError('This browser could not play the audio file.')} />}
    <ErrorMessage>{playbackError}</ErrorMessage>
  </section>
}

function TrackView({ track }) {
  const { userId, users, state } = useStore()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [position, setPosition] = useState(null)
  const owner = users.find((user) => user.id === track.ownerId)?.displayName
  const localFile = records(state.uploads).find((upload) => upload.id === track.uploadId)?.file
  return <>
    <Back to="/tracks">Tracks</Back>
    <section className="panel track-hero">
      <Artwork artworkKey={track.artworkKey} />
      <div className="track-identity">
        <Badge visibility={track.visibility} /><h1>{titleOf(track)}</h1>
        <p>{[owner, track.genre, track.createdAt && formatDate(track.createdAt)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="track-actions">
        {track.ownerId === userId && <button className="button" type="button" onClick={() => setEditing(true)}><Pencil size={15} /> Edit details</button>}
        <button className="button primary" type="button" onClick={() => setAdding(true)}><ListPlus size={17} /> Add to playlist</button>
      </div>
      {track.description && <p className="track-description">{track.description}</p>}
      {Array.isArray(track.tags) && track.tags.length > 0 && <div className="tag-list">{track.tags.map((tag, index) => <span key={index}>{String(tag)}</span>)}</div>}
    </section>
    {editing && <TrackEditor track={track} close={() => setEditing(false)} />}
    <Timeline track={track} localFile={localFile} position={position} setPosition={setPosition} />
    <TrackComments track={track} position={position} clearPosition={() => setPosition(null)} />
    {adding && <AddToPlaylist track={track} close={() => setAdding(false)} />}
  </>
}

export function TrackDetail() {
  const { trackId } = useParams()
  const { tracks } = useStore()
  const track = tracks.find((item) => item.id === trackId)
  return track ? <TrackView key={track.id} track={track} /> : <>
    <Back to="/tracks">Tracks</Back><PageHeading title="Track unavailable" description="This track could not be found in your workspace." />
  </>
}
