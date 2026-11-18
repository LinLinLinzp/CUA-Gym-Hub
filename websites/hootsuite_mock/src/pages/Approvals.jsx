import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { blankFilters, Empty, Filters, Icon, PostPreview, ProfileSummary, Status } from '../components/ui.jsx'
import { dateTimeLabel, timeZoneFor } from '../utils/dates.js'
import { array, findRecord, initials, lower, text } from '../utils/records.js'
import { canDecide, decideRequest } from '../features/approvals.js'
import { canRevise, newestRequests } from '../features/posts.js'

const views = [['assigned', 'Assigned to me'], ['requested', 'Requested by me'], ['history', 'History']]
const statuses = ['pending', 'approved', 'rejected']

function memberName(state, id) {
  return text(findRecord(state.users, id)?.name) || 'Unavailable teammate'
}

function queueContains(request, view, actorId) {
  if (view === 'history') return request.status === 'approved' || request.status === 'rejected'
  if (!actorId) return false
  if (view === 'assigned') return request.status === 'pending' && request.reviewerId === actorId
  return request.requestedBy === actorId
}

function matchesRequest(state, request, post, filters) {
  if (filters.profile && !array(post?.profileIds).includes(filters.profile)) return false
  if (filters.status && request.status !== filters.status) return false
  const query = lower(filters.query.trim())
  const searchable = [post?.body, request.requestNote, request.decisionNote, memberName(state, request.requestedBy), memberName(state, request.reviewerId)]
  return !query || searchable.some((field) => lower(field).includes(query))
}

export function Approvals({ openComposer }) {
  const { state, actor, commit } = useWorkspace()
  const focus = useLocation().state?.approval
  const zone = timeZoneFor(state.workspace?.timeZone)
  const [view, setView] = useState('assigned')
  const [filters, setFilters] = useState(blankFilters)
  const [selected, setSelected] = useState(undefined)
  const [message, setMessage] = useState('')
  const detailRef = useRef(null)
  const requests = newestRequests(state.approvals)
  const queued = requests.filter((item) => queueContains(item, view, actor?.id))
  const filtered = queued.filter((request) => matchesRequest(state, request, findRecord(state.posts, request.postId), filters))
  const activeId = selected === undefined ? filtered.find((item) => item.id)?.id : selected
  const request = findRecord(state.approvals, activeId)
  const post = findRecord(state.posts, request?.postId)

  useEffect(() => {
    if (focus) {
      setView('requested')
      setFilters(blankFilters)
      setSelected(focus.id)
      setMessage(focus.message)
    }
  }, [focus])

  function openRequest(id) {
    setSelected(id)
    if (window.matchMedia('(max-width: 900px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'start' }))
    }
  }

  function decide(status, note) {
    const error = commit((current, change) => decideRequest(current, change, request.id, status, note))
    if (!error) {
      setSelected(request.id)
      setMessage(status === 'approved' ? 'Post approved and scheduled.' : 'Post rejected and returned to its author.')
    }
    return error
  }

  return <>
    <div className="page-heading"><div><h1>Approvals</h1><p>Review scheduled content and follow your requests.</p></div></div>
    {message && <p className="notice" role="status">{message}<button className="quiet icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}><Icon name="close" /></button></p>}
    <div className="approval-grid">
      <section className="panel approval-queue" aria-label="Approval queue">
        <div className="queue-controls">
          <div className="segmented approval-tabs" aria-label="Approval view">{views.map(([id, label]) =>
            <button key={id} aria-pressed={id === view} onClick={() => { setView(id); setSelected(undefined) }}>{label}</button>)}</div>
          <Filters value={filters} onChange={(next) => { setFilters(next); setSelected(undefined) }} profiles={state.profiles} options={statuses} placeholder="Search requests" />
        </div>
        <div className="queue-label"><h2>{views.find(([id]) => id === view)[1]}</h2><span>{filtered.length} {filtered.length === 1 ? 'request' : 'requests'}</span></div>
        {filtered.length ? <ul className="queue-list">{filtered.map((item, index) => {
          const linkedPost = findRecord(state.posts, item.postId)
          const name = memberName(state, view === 'requested' ? item.reviewerId : item.requestedBy)
          return <li key={item.id || index}>
            <button className="queue-row" disabled={!item.id} aria-pressed={item.id != null && item.id === activeId} onClick={() => openRequest(item.id)}>
              <span className="person-tile">{initials(name)}</span>
              <span className="queue-copy">
                <strong>{text(linkedPost?.body) || (linkedPost ? 'Untitled post' : 'Post unavailable')}</strong>
                <span>{view === 'requested' ? 'Reviewer' : 'Requester'} · {name}</span>
                <span className="queue-meta"><ProfileSummary ids={linkedPost?.profileIds} profiles={state.profiles} />{item.createdAt && <time dateTime={item.createdAt}>{dateTimeLabel(item.createdAt, zone)}</time>}</span>
              </span>
              <Status value={item.status} />
            </button>
          </li>
        })}</ul> : <Empty icon="review" title="No requests in this view">Change the filters or choose another queue.</Empty>}
      </section>
      <section className="panel approval-detail" aria-label="Approval details" ref={detailRef}>
        {request ? <>
          <header className="detail-header"><h2>Approval details</h2><Status value={request.status} /></header>
          <dl className="facts detail-facts">
            <div><dt>Post author</dt><dd>{memberName(state, post?.createdBy)}</dd></div>
            <div><dt>Reviewer</dt><dd>{memberName(state, request.reviewerId)}</dd></div>
            <div><dt>Requested by</dt><dd>{memberName(state, request.requestedBy)}</dd></div>
            <div><dt>Requested on</dt><dd>{dateTimeLabel(request.createdAt, zone)}</dd></div>
          </dl>
          {post ? <PostPreview post={post} profiles={state.profiles} zone={zone} showStatus={false} /> : <p className="feedback">The linked post is unavailable.</p>}
          {request.requestNote && <div className="review-note"><h3>Request note</h3><p>{text(request.requestNote)}</p></div>}
          {(request.status === 'approved' || request.status === 'rejected') && <div className="review-note">
            <h3>{request.status === 'rejected' ? 'Rejection reason' : 'Decision'}</h3>
            <p>{text(request.decisionNote) || 'No decision note added.'}</p>
            <small>{memberName(state, request.decidedBy)} · {dateTimeLabel(request.decidedAt, zone)}</small>
          </div>}
          {canDecide(state, request, actor?.id) && <Decision key={request.id} onDecide={decide} />}
          {canRevise(state, request, actor?.id) && <div className="detail-actions">
            <button className="primary" onClick={() => openComposer({ postId: post.id, previousRequestId: request.id, mode: 'review' })}>Revise and resubmit</button>
          </div>}
        </> : <Empty icon="review" title="No request selected">Choose a request to read its post and review details.</Empty>}
      </section>
    </div>
  </>
}

function Decision({ onDecide }) {
  const [status, setStatus] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function pick(value) {
    setStatus(value)
    setNote('')
    setError('')
  }

  if (!status) return <div className="detail-actions">
    <button className="danger" onClick={() => pick('rejected')}>Reject</button>
    <button className="primary" onClick={() => pick('approved')}>Approve</button>
  </div>

  const rejecting = status === 'rejected'
  return <form className="decision" onSubmit={(event) => { event.preventDefault(); setError(onDecide(status, note)) }}>
    <label>{rejecting ? 'Reason for rejection' : 'Approval note (optional)'}
      <textarea rows="3" autoFocus value={note} onChange={(event) => { setNote(event.target.value); setError('') }} />
    </label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="detail-actions">
      <button type="button" onClick={() => pick(null)}>Back</button>
      <button type="submit" className={rejecting ? 'danger-fill' : 'primary'}>{rejecting ? 'Reject post' : 'Approve post'}</button>
    </div>
  </form>
}
