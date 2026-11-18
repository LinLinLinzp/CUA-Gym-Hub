import { useRef, useState } from 'react'
import { Check, Clock3, MessageSquare, Pause, Play, RotateCcw } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Recovery, WorkspaceLink } from '../navigation.jsx'
import { postComment, setThreadStatus } from '../changes.js'
import { Breadcrumbs, DetailsForm, RecordHeader } from '../details.jsx'
import { makeId, useWorkspace } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'
import { Empty, ImageFrame, imagePath, plural, shortDate, timecode, titleOf, videoPath } from '../ui.jsx'

function sourcePath(source) {
  return typeof source?.url === 'string' && /^\/(?:media\/[\w.-]+|files\/[\w-]+\/[\w.-]+)$/.test(source.url)
    ? withSid(source.url) : undefined
}

function Preview({ video, player, onTime, onDuration, onPlayback }) {
  const [failed, setFailed] = useState(false)
  const source = sourcePath(video.source)
  return <div className="preview">
    {source && !failed ? <video src={source} poster={imagePath(video.thumbnailKey)} ref={player} controls preload="metadata"
      controlsList={video.privacy?.allowDownloads ? undefined : 'nodownload'}
      aria-label={`Preview of ${titleOf(video)}`}
      onError={() => { setFailed(true); onPlayback?.(false, true) }}
      onPlay={() => onPlayback?.(true)} onPause={() => onPlayback?.(false)} onEnded={() => onPlayback?.(false)}
      onTimeUpdate={(event) => onTime?.(event.currentTarget.currentTime)}
      onLoadedMetadata={(event) => onDuration?.(event.currentTarget.duration)} />
      : <ImageFrame record={video} />}
  </div>
}

export function VideoDetails() {
  const { videoId } = useParams()
  const { state } = useWorkspace()
  const video = state.videos.find((record) => record.id === videoId)
  if (!video) return <Recovery title="Video unavailable" />
  return <div key={video.id}>
    <Breadcrumbs items={[[ 'Library', '/videos' ]]} current={titleOf(video)} />
    <RecordHeader record={video} kind="video">
      <WorkspaceLink to={`${videoPath(video.id)}/review`} className="button"><MessageSquare size={17} /> Review</WorkspaceLink>
    </RecordHeader>
    <div className="detail-layout">
      <section className="player panel" aria-label="Video preview"><Preview video={video} /></section>
      <DetailsForm record={video} kind="video" />
    </div>
  </div>
}

function Timeline({ duration, seekLimit, position, roots, seek, playback }) {
  return <div className="timeline">
    <div className="timeline-time">
      <div>
        {playback && <button type="button" className="playback" onClick={playback.toggle}
          aria-label={playback.playing ? 'Pause video' : 'Play video'}>
          {playback.playing ? <Pause size={17} /> : <Play size={17} />}
        </button>}
        <output aria-label="Elapsed time">{timecode(position)}</output>
      </div>
      <span>{duration === null ? 'Duration unavailable' : timecode(duration)}</span>
    </div>
    <input type="range" aria-label="Review timeline" min="0" max={seekLimit} step="0.1" value={Math.min(position, seekLimit)}
      aria-valuetext={timecode(position)} disabled={!seekLimit} onChange={(event) => seek(Number(event.target.value))} />
    {seekLimit > 0 && <div className="markers">
      {roots.filter((root) => Number.isFinite(root.timeSeconds)).map((root) => <button key={root.id}
        title={`Go to ${timecode(root.timeSeconds)}`} aria-label={`Comment marker at ${timecode(root.timeSeconds)}`}
        onClick={() => seek(root.timeSeconds)} style={{ left: `${Math.max(0, Math.min(root.timeSeconds / seekLimit, 1)) * 100}%` }} />)}
    </div>}
  </div>
}

function Note({ note, people, seek }) {
  const person = people.get(note.authorId)
  return <div className="note">
    <span className="avatar">{person?.initials || '•'}</span>
    <div className="note-main">
      <div className="note-meta"><strong>{person?.name || 'Account member'}</strong><time dateTime={note.createdAt}>{shortDate(note.createdAt)}</time></div>
      {Number.isFinite(note.timeSeconds) && <button type="button" className="time-anchor" title="Seek to comment" onClick={() => seek(note.timeSeconds)}><Clock3 size={12} /> {timecode(note.timeSeconds)}</button>}
      <p>{note.body}</p>
    </div>
  </div>
}

function Thread({ root, replies, people, seek }) {
  const { commit, saving } = useWorkspace()
  const [replying, setReplying] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const resolved = root.status === 'resolved'
  return <article className="thread">
    <Note note={root} people={people} seek={seek} />
    {replies.length > 0 && <div className="replies">{replies.map((reply) => <Note key={reply.id} note={reply} people={people} seek={seek} />)}</div>}
    {resolved && <div className="thread-status"><Check size={14} /> Resolved</div>}
    <div className="thread-actions">
      {!resolved && <button className="quiet" aria-expanded={replying} onClick={() => setReplying(!replying)}>Reply</button>}
      <button className="quiet" disabled={saving} onClick={async () => {
        if (await commit(setThreadStatus(root.videoId, root.id, !resolved), resolved ? 'Thread reopened.' : 'Thread resolved.')) setReplying(false)
      }}>{resolved ? <><RotateCcw size={14} /> Reopen thread</> : <><Check size={14} /> Resolve thread</>}</button>
    </div>
    {!resolved && replying && <form className="reply-form" onSubmit={async (event) => {
      event.preventDefault()
      if (!body.trim()) return setError('Enter a reply.')
      if (await commit(postComment({ id: makeId('comment'), videoId: root.videoId, parentId: root.id, body: body.trim(), timeSeconds: null }), 'Reply posted.')) {
        setBody('')
        setReplying(false)
      }
    }}>
      <label className="field">Reply text<textarea rows={2} value={body} disabled={saving} onChange={(event) => { setBody(event.target.value); setError('') }} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={saving}>Post reply</button>
    </form>}
  </article>
}

function ReviewPanel({ video, roots, position, seekLimit, seek, replies }) {
  const { state, commit, saving } = useWorkspace()
  const [mode, setMode] = useState('open')
  const [sort, setSort] = useState('timecode')
  const [body, setBody] = useState('')
  const [anchor, setAnchor] = useState(null)
  const [error, setError] = useState('')
  const people = new Map(state.people.map((person) => [person.id, person]))
  const shown = roots.filter((root) => mode === 'all' || (root.status ?? 'open') === mode).sort((a, b) => sort === 'newest'
    ? (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    : (a.timeSeconds ?? Infinity) - (b.timeSeconds ?? Infinity))
  return <section className="panel review-panel" aria-label="Review comments">
    <div className="panel-heading"><div><h2>Comments</h2><p>{plural(shown.length, 'thread')}</p></div>
      <select aria-label="Sort comments" value={sort} onChange={(event) => setSort(event.target.value)}><option value="timecode">Timecode</option><option value="newest">Newest</option></select>
    </div>
    <form className="comment-form" onSubmit={async (event) => {
      event.preventDefault()
      if (!body.trim()) return setError('Enter a comment.')
      if (await commit(postComment({ id: makeId('comment'), videoId: video.id, parentId: null, body: body.trim(), timeSeconds: anchor }), 'Comment posted.')) {
        setBody('')
        setAnchor(null)
        if (mode === 'resolved') setMode('open')
      }
    }}>
      <label className="field">Comment<textarea rows={3} value={body} disabled={saving} onChange={(event) => { setBody(event.target.value); setError('') }} placeholder="Leave feedback on this video" /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="comment-actions">
        {anchor === null ? <button type="button" className="quiet" disabled={!seekLimit} onClick={() => setAnchor(Math.min(seekLimit, Math.round(position * 10) / 10))}><Clock3 size={15} /> Add timestamp</button>
          : <button type="button" className="quiet" aria-label={`Remove timestamp ${timecode(anchor)}`} onClick={() => setAnchor(null)}><Clock3 size={15} /> {timecode(anchor)} ×</button>}
        <button className="primary" disabled={saving}>Post comment</button>
      </div>
    </form>
    <div className="review-filters" aria-label="Filter threads">
      {['Open', 'Resolved', 'All'].map((label) => <button key={label} type="button" aria-pressed={mode === label.toLowerCase()}
        onClick={() => setMode(label.toLowerCase())}>{label}</button>)}
    </div>
    {shown.length ? <div className="threads">{shown.map((root) => <Thread key={root.id} root={root} replies={replies.get(root.id) ?? []} people={people} seek={seek} />)}</div>
      : <Empty icon={MessageSquare} title={mode === 'all' ? 'No comments yet' : `No ${mode} threads`} />}
  </section>
}

function ReviewWorkspace({ video }) {
  const { state } = useWorkspace()
  const player = useRef(null)
  const [position, setPosition] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [unplayable, setUnplayable] = useState(false)
  const duration = mediaDuration ?? (Number.isFinite(video.durationSeconds) ? Math.max(0, video.durationSeconds) : null)
  const roots = []
  const replies = new Map()
  for (const note of state.reviewComments) {
    if (note.videoId !== video.id) continue
    if (!note.parentId) roots.push(note)
    else {
      if (!replies.has(note.parentId)) replies.set(note.parentId, [])
      replies.get(note.parentId).push(note)
    }
  }

  const seekLimit = duration ?? roots.reduce((latest, root) =>
    Number.isFinite(root.timeSeconds) ? Math.max(latest, root.timeSeconds) : latest, 0)

  function togglePlayback() {
    const media = player.current
    if (!media) return
    if (media.paused) media.play().catch(() => setPlaying(false))
    else media.pause()
  }

  function seek(seconds) {
    const target = Math.max(0, Math.min(seekLimit, seconds))
    if (player.current) player.current.currentTime = target
    setPosition(target)
  }

  return <>
    <Breadcrumbs items={[[ 'Library', '/videos' ], [titleOf(video), videoPath(video.id)]]} current="Review" />
    <div className="page-heading record-heading"><div><h1>{titleOf(video)}</h1><p>Video review</p></div></div>
    <div className="detail-layout review-layout">
      <section className="player panel" aria-label="Review player">
        <Preview video={video} player={player} onTime={setPosition} onPlayback={(active, failed) => {
          setPlaying(active)
          if (failed) setUnplayable(true)
        }} onDuration={(duration) => {
          if (Number.isFinite(duration)) setMediaDuration(duration)
        }} />
        <Timeline duration={duration} seekLimit={seekLimit} position={position} roots={roots} seek={seek}
          playback={sourcePath(video.source) && !unplayable ? { playing, toggle: togglePlayback } : null} />
      </section>
      <ReviewPanel video={video} roots={roots} replies={replies} position={position} seekLimit={seekLimit} seek={seek} />
    </div>
  </>
}

export function VideoReview() {
  const { videoId } = useParams()
  const { state } = useWorkspace()
  const video = state.videos.find((record) => record.id === videoId)
  return video ? <ReviewWorkspace key={video.id} video={video} /> : <Recovery title="Video unavailable" />
}
