import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Clock, MessageCircle, Reply } from 'lucide-react'
import { active, clockTime, formatDate, nameOf, newId, newest, now, records, titleOf, updateRecord, useFeedback, useStore } from './store'
import { Dialog, Empty, ErrorMessage, Field, PageHeading, SiteLink } from './ui'

const commentAnchor = (id) => 'comment-' + encodeURIComponent(id)
const commentLink = (comment) => '/tracks/' + encodeURIComponent(comment.trackId) + '#' + commentAnchor(comment.id)

function AuthorAvatar({ name }) {
  return <span className="avatar comment-avatar" aria-hidden="true">
    {name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}
  </span>
}

function TimeLabel({ offset }) {
  return Number.isInteger(offset) && offset >= 0
    ? <span className="time-chip"><Clock size={13} /> {clockTime(offset)}</span> : null
}

function orderThread(comments) {
  const byId = new Set(comments.map((comment) => comment.id))
  const groups = new Map()
  for (const comment of [...comments].sort(newest)) {
    const parentId = byId.has(comment.parentId) ? comment.parentId : null
    if (!groups.has(parentId)) groups.set(parentId, [])
    groups.get(parentId).push(comment)
  }
  const visited = new Set()
  const ordered = []

  function visit(roots) {
    const pending = roots.map((comment) => [comment, 0]).reverse()
    while (pending.length) {
      const [comment, depth] = pending.pop()
      if (visited.has(comment.id)) continue
      visited.add(comment.id)
      ordered.push([comment, depth])
      for (const reply of [...(groups.get(comment.id) || [])].reverse()) pending.push([reply, depth + 1])
    }
  }

  visit(groups.get(null) || [])
  visit(comments)
  return ordered
}

function Composer({ position, parent, cancel, submit }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  function send(event) {
    event.preventDefault()
    if (!body.trim()) return setError(parent ? 'Enter a reply before posting.' : 'Enter a comment before posting.')
    submit(body.trim(), parent)
    setBody('')
    setError('')
  }
  return <form className={'composer ' + (parent ? 'reply-composer' : '')} onSubmit={send}>
    <Field name={parent ? 'Write a reply' : 'Write a comment'}>
      <textarea value={body} rows={2} maxLength={2000} onChange={(event) => setBody(event.target.value)}
        placeholder={parent ? 'Add to the conversation' : 'What do you hear in this track?'} />
    </Field>
    <ErrorMessage>{error}</ErrorMessage>
    <div className="composer-actions">
      <TimeLabel offset={parent ? parent.offsetSeconds : position} />
      <div className="actions">
        {parent && <button type="button" className="button" onClick={cancel}>Cancel</button>}
        <button className="button primary">{parent ? 'Post reply' : 'Post comment'}</button>
      </div>
    </div>
  </form>
}

export function TrackComments({ track, position, clearPosition }) {
  const { comments, users, userId, commit } = useStore()
  const feedback = useFeedback()
  const [replying, setReplying] = useState(null)
  const [removing, setRemoving] = useState(null)
  const { hash } = useLocation()
  const thread = comments.filter((comment) => comment.trackId === track.id)
  const ordered = orderThread(thread)
  const count = thread.filter(active).length
  const showDeleted = new Set()
  for (const [comment, depth] of [...ordered].reverse()) {
    if (active(comment) || showDeleted.has(comment.id)) {
      if (depth > 0) showDeleted.add(comment.parentId)
    }
  }

  useEffect(() => {
    if (!hash.startsWith('#comment-')) return
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' }))
    return () => cancelAnimationFrame(frame)
  }, [hash])

  function submit(body, parent) {
    const candidate = parent ? parent.offsetSeconds : position
    const comment = {
      id: newId('cmt'), trackId: track.id, authorId: userId, parentId: parent?.id || null,
      offsetSeconds: Number.isInteger(candidate) && candidate >= 0 ? candidate : null,
      body, status: 'active', createdAt: now(),
    }
    commit((state) => ({ ...state, comments: [...records(state.comments), comment] }))
    if (parent) setReplying(null)
    else clearPosition()
    feedback(parent ? 'Reply posted.' : 'Comment posted.')
  }

  function remove() {
    commit((state) => ({ ...state, comments: updateRecord(state.comments, removing.id,
      { status: 'deleted', deletedBy: userId, deletedAt: now() }) }))
    if (replying === removing.id) setReplying(null)
    setRemoving(null)
    feedback('Comment removed.')
  }

  return <section className="panel padded discussion">
    <div className="section-heading"><h2><MessageCircle size={20} /> Comments</h2><span className="subtle">{count}</span></div>
    <Composer position={position} submit={submit} />
    {count === 0 ? <Empty>No comments on this track yet.</Empty> : <div className="thread">
      {ordered.map(([comment, depth]) => {
        if (!active(comment) && !showDeleted.has(comment.id)) return null
        const author = nameOf(users, comment.authorId)
        return <article key={comment.id} id={commentAnchor(comment.id)} className={'comment ' + (depth ? 'nested' : '')}>
          <AuthorAvatar name={author} />
          <div className="comment-main">
            <div className="comment-meta"><strong>{author}</strong><span>{formatDate(comment.createdAt)}</span><TimeLabel offset={comment.offsetSeconds} /></div>
            {active(comment) ? <>
              <p>{comment.body}</p>
              <div className="comment-actions">
                <button type="button" className="text-button" onClick={() => setReplying(comment.id)}><Reply size={15} /> Reply</button>
                {(comment.authorId === userId || track.ownerId === userId) &&
                  <button type="button" className="text-button danger" onClick={() => setRemoving(comment)}>Remove</button>}
              </div>
              {replying === comment.id && <Composer parent={comment} cancel={() => setReplying(null)} submit={submit} />}
            </> : <p className="subtle">Comment removed.</p>}
          </div>
        </article>
      })}
    </div>}
    {removing && <Dialog title="Remove comment?" onClose={() => setRemoving(null)}>
      <p className="dialog-copy">The comment will be hidden. Replies will stay visible.</p>
      <div className="actions">
        <button type="button" className="button" onClick={() => setRemoving(null)}>Cancel</button>
        <button type="button" className="button destructive" onClick={remove}>Remove comment</button>
      </div>
    </Dialog>}
  </section>
}

export function CommentsInbox() {
  const { ownedTracks, users, comments } = useStore()
  const [trackId, setTrackId] = useState('')
  const byTrack = new Map(ownedTracks.map((track) => [track.id, track]))
  const inbox = comments.filter((comment) => active(comment) && byTrack.has(comment.trackId))
  const results = inbox.filter((comment) => !trackId || comment.trackId === trackId).sort(newest)

  return <>
    <PageHeading title="Comments" description="Follow conversations on your tracks." />
    <section className="panel">
      <div className="filter-bar"><Field name="Filter by track"><select value={trackId} onChange={(event) => setTrackId(event.target.value)}>
        <option value="">All tracks</option>
        {ownedTracks.map((track) => <option key={track.id} value={track.id}>{titleOf(track)}</option>)}
      </select></Field></div>
      {results.length ? <div className="inbox">
        {results.map((comment) => {
          const author = nameOf(users, comment.authorId)
          return <article key={comment.id} className="comment inbox-comment">
            <AuthorAvatar name={author} />
            <div className="comment-main">
              <div className="comment-meta"><strong>{author}</strong><span>{formatDate(comment.createdAt)}</span><TimeLabel offset={comment.offsetSeconds} /></div>
              <p>{comment.body}</p>
              <SiteLink className="inbox-link" to={commentLink(comment)}>{titleOf(byTrack.get(comment.trackId))} <ArrowRight size={15} /></SiteLink>
            </div>
          </article>
        })}
      </div> : <Empty>{inbox.length ? 'No comments on the selected track.' : 'Comments on your tracks will appear here.'}</Empty>}
    </section>
  </>
}
