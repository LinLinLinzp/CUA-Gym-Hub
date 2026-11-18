import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ChevronRight, Clock, Film, Link2, MessageCircle, PencilLine, Send } from 'lucide-react'
import { Avatar, Empty, folderPath, ItemMenu, VideoMenu, videoPath } from './Library.jsx'
import { getSample } from './data/media.js'
import { dateLabel, durationLabel, folderName, isActive, records, useWorkspace, userName, videoTitle } from './store.jsx'
import { withSid } from './utils/dataManager.js'

function CommentForm({ kind, initial = '', getTime, onSubmit, onCancel }) {
  const [body, setBody] = useState(initial)
  const [timestamp, setTimestamp] = useState(null)
  const main = kind === 'post'
  const label = { post: 'Add a comment', reply: 'Write a reply', edit: 'Edit comment' }[kind]
  const submit = { post: 'Post comment', reply: 'Post reply', edit: 'Save edit' }[kind]
  return <form className="comment-form" onSubmit={(event) => {
    event.preventDefault()
    const clean = body.trim()
    if (!clean) return
    onSubmit(clean, timestamp)
    if (main) { setBody(''); setTimestamp(null) }
  }}>
    <textarea aria-label={label} rows={main ? 3 : 2} autoFocus={!main} value={body}
      placeholder={label + '…'} onChange={(event) => setBody(event.target.value)} />
    <div className="comment-form-actions">
      {main && getTime && <label className="timestamp-option" title="Attach the current playback time">
        <input type="checkbox" aria-label="Include timestamp" checked={timestamp !== null}
          onChange={(event) => setTimestamp(event.target.checked ? getTime() : null)} />
        {timestamp === null ? 'Include timestamp' : 'At ' + durationLabel(timestamp)}
      </label>}
      {onCancel && <button type="button" className="text-button" onClick={onCancel}>Cancel</button>}
      <button className="button primary compact" disabled={!body.trim() || (kind === 'edit' && body.trim() === initial)}>
        {main && <Send size={14} aria-hidden="true" />}{submit}
      </button>
    </div>
  </form>
}

function Discussion({ video, users, ask, getTime, seek }) {
  const { state, commit } = useWorkspace()
  const [editing, setEditing] = useState(null)
  const [replying, setReplying] = useState(null)
  const actor = state.account?.currentUserId
  const thread = records(state.comments).filter((comment) => comment.videoId === video.id)
  const byId = new Map(thread.map((comment) => [comment.id, comment]))
  const replies = new Map()
  const roots = []
  for (const comment of thread) {
    const parent = byId.get(comment.parentId)
    if (parent && parent.id !== comment.id && parent.parentId == null) {
      if (isActive(comment)) {
        if (!replies.has(parent.id)) replies.set(parent.id, [])
        replies.get(parent.id).push(comment)
      }
    } else {
      roots.push(comment)
    }
  }

  function post(body, parentId, timestampSeconds) {
    const id = crypto.randomUUID()
    commit((previous, meta) => ({ ...previous, comments: [...records(previous.comments), {
      ...meta, id, videoId: video.id, parentId, authorId: meta.updatedBy, body, timestampSeconds,
      createdAt: meta.updatedAt, status: 'active',
    }] }), parentId === null ? 'Comment posted.' : 'Reply posted.')
  }

  function edit(comment, body) {
    commit((previous, meta) => ({
      ...previous,
      comments: records(previous.comments).map((item) => item.id === comment.id
        ? { ...item, ...meta, body, editedAt: meta.updatedAt } : item),
    }), 'Comment edited.')
    setEditing(null)
  }

  function renderComment(comment, canReply) {
    const author = users.get(comment.authorId)
    const editable = actor != null && actor === comment.authorId
    const timestamp = Number.isFinite(comment.timestampSeconds) ? comment.timestampSeconds : null
    return <div className="comment" key={comment.id}>
      <Avatar user={author} />
      <div className="comment-content">
        <div className="comment-heading"><strong>{userName(author)}</strong>
          <time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time>
          {editable && <ItemMenu label={'comment by ' + userName(author)} choices={[
            ['Edit', () => setEditing(comment.id)],
            ['Delete', () => ask({ type: 'deleteComment', item: comment })],
          ]} />}
        </div>
        {editing === comment.id ? <CommentForm kind="edit" initial={comment.body ?? ''}
          onSubmit={(body) => edit(comment, body)} onCancel={() => setEditing(null)} />
          : <p>{comment.body}</p>}
        <div className="comment-tools">
          {timestamp !== null && (seek
            ? <button className="timestamp-chip" type="button" onClick={() => seek(timestamp)}
                aria-label={'Jump to ' + durationLabel(timestamp)}><Clock size={13} />{durationLabel(timestamp)}</button>
            : <span className="timestamp-chip"><Clock size={13} />{durationLabel(timestamp)}</span>)}
          {comment.editedAt && <span className="muted">Edited</span>}
          {canReply && <button className="text-button" onClick={() => setReplying(replying === comment.id ? null : comment.id)}>Reply</button>}
        </div>
      </div>
    </div>
  }

  const visible = roots.filter((comment) => isActive(comment) || replies.has(comment.id))
  const count = thread.filter(isActive).length
  return <aside className="discussion" aria-labelledby="discussion-heading">
    <div className="discussion-title"><MessageCircle size={19} aria-hidden="true" /><h2 id="discussion-heading">Discussion</h2>
      <span className="list-count">{count}</span></div>
    <div className="discussion-compose"><CommentForm kind="post" getTime={getTime}
      onSubmit={(body, timestamp) => post(body, null, timestamp)} /></div>
    {visible.length ? <ul className="threads">
      {visible.map((comment) => <li key={comment.id}>
        {isActive(comment) ? renderComment(comment, comment.parentId == null)
          : <p className="removed-comment">Comment deleted</p>}
        {(replies.has(comment.id) || replying === comment.id) && <div className="replies">
          {replies.get(comment.id)?.map((reply) => renderComment(reply, false))}
          {replying === comment.id && isActive(comment) && <CommentForm kind="reply" onCancel={() => setReplying(null)}
            onSubmit={(body) => { post(body, comment.id, null); setReplying(null) }} />}
        </div>}
      </li>)}
    </ul> : <p className="discussion-empty">No comments yet. Share feedback or ask a question.</p>}
  </aside>
}

export function Breadcrumb({ parent, archive = false }) {
  return <div className="breadcrumb">
    <Link to={withSid(archive ? '/archive' : '/library')}>{archive ? 'Archive' : 'My Library'}</Link>
    {parent && <><ChevronRight size={14} aria-hidden="true" />
      <Link to={withSid(folderPath(parent.id))}>{folderName(parent)}</Link></>}
  </div>
}

export default function VideoDetail({ video, parent, users, choose, duplicate, archived, parentArchived }) {
  const player = useRef(null)
  const pendingSeek = useRef(null)
  const { setNotice } = useWorkspace()
  const sample = getSample(video.sampleKey)
  const [mediaError, setMediaError] = useState(false)
  const title = videoTitle(video)
  const playable = sample && !mediaError
  function seek(seconds) {
    const element = player.current
    if (!element) return
    if (!Number.isFinite(element.duration)) {
      pendingSeek.current = seconds
      return
    }
    element.currentTime = Math.min(element.duration, Math.max(0, seconds))
  }

  async function copyLink() {
    const url = new URL(withSid(videoPath(video.id)), window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setNotice({ message: 'Video link copied.' })
    } catch {
      setNotice({ message: 'The link could not be copied. You can copy it from the address bar.' })
    }
  }

  return <>
    <Breadcrumb parent={archived ? null : parent} archive={archived} />
    <header className="page-heading detail-heading">
      <div><h1 tabIndex={-1}>{title}</h1>
        <p>{userName(users.get(video.ownerId))} <span aria-hidden="true">·</span> Updated {dateLabel(video.updatedAt ?? video.createdAt)}</p>
      </div>
      {!archived && <div className="heading-actions">
        <button className="button" onClick={copyLink}><Link2 size={17} /> Copy link</button>
        <button className="button" onClick={() => choose({ type: 'editVideo', item: video })}><PencilLine size={16} /> Edit details</button>
        <VideoMenu video={video} choose={choose} duplicate={duplicate} />
      </div>}
    </header>
    {archived ? <Empty title={parentArchived ? 'This video is in an archived folder' : 'This video is archived'} icon={Archive}>
      <p>{parentArchived ? 'Restore the folder to access its active recordings.' : 'Restore this video to watch it and join the discussion.'}</p>
      <button className="button primary" onClick={() => choose(parentArchived
        ? { type: 'restoreFolder', item: parent } : { type: 'restoreVideo', item: video })}>
        {parentArchived ? 'Restore folder' : 'Restore video'}
      </button>
    </Empty> : <div className="detail-layout">
      <section aria-label="Video and description">
        {playable ? <video ref={player} className="player" controls playsInline preload="metadata" aria-label={title}
          src={sample.video} poster={sample.poster} onError={() => setMediaError(true)}
          onLoadedMetadata={() => {
            if (pendingSeek.current !== null) {
              seek(pendingSeek.current)
              pendingSeek.current = null
            }
          }} />
          : <div className="player-unavailable"><Film size={32} /><strong>Video unavailable</strong></div>}
        {video.description && <section className="description"><h2>Description</h2><p>{video.description}</p></section>}
      </section>
      <Discussion video={video} users={users} ask={choose} getTime={playable ? () => {
        const seconds = player.current?.currentTime
        return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
      } : null} seek={playable ? seek : null} />
    </div>}
  </>
}
