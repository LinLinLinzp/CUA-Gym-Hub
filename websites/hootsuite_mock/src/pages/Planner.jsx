import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { blankFilters, Confirm, Empty, Filters, Icon, Modal, PostPreview, ProfileSummary, Status } from '../components/ui.jsx'
import { bumpDate, dateKey, dateTimeLabel, formatDate, initialWeek, monday, timeZoneFor, weekLabel } from '../utils/dates.js'
import { findRecord, records, text } from '../utils/records.js'
import { canEdit, changeScheduledStatus, hasOpenRequest, matchesPost, postStatuses } from '../features/posts.js'

const order = (post) => Number.isFinite(Date.parse(post.scheduledAt)) ? Date.parse(post.scheduledAt) : Infinity

export function Planner({ openComposer }) {
  const { state, actor, commit } = useWorkspace()
  const location = useLocation()
  const zone = timeZoneFor(state.workspace?.timeZone)
  const today = dateKey(new Date(), zone)
  const posts = records(state.posts)
  const [week, setWeek] = useState(() => initialWeek(posts, new Date(), zone))
  const [view, setView] = useState('week')
  const [filters, setFilters] = useState(blankFilters)
  const detailTrigger = useRef(null)
  const [opened, setOpened] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const revealTarget = useRef(null)
  const [reveal, setReveal] = useState(null)
  const [message, setMessage] = useState('')
  const focus = location.state?.planner

  useEffect(() => {
    if (!focus) return
    if (focus.day) {
      setWeek(monday(focus.day))
      setView('week')
    } else {
      setView('list')
    }
    setFilters(blankFilters)
    setOpened(null)
    setMessage(focus.message)
    setReveal(focus.postId)
  }, [focus])

  useEffect(() => {
    if (!reveal) return
    revealTarget.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    setReveal(null)
  }, [reveal])

  const filtered = posts.filter((post) => matchesPost(post, filters)).sort((a, b) => order(a) - order(b))
  const edited = findRecord(state.posts, opened)
  const editingAllowed = Boolean(actor && edited?.id && canEdit(edited) && !hasOpenRequest(state, edited.id))

  function showDetails(postId, event) {
    detailTrigger.current = event.currentTarget
    setOpened(postId)
  }

  function openEdit(mode) {
    const postId = edited.id
    setOpened(null)
    openComposer({ postId, mode, returnFocus: detailTrigger.current })
  }

  function confirmChange() {
    const error = commit((current, change) => changeScheduledStatus(current, change, edited?.id, confirmation))
    if (!error) {
      setMessage(confirmation === 'draft' ? 'Post moved to Drafts.' : 'Scheduled post canceled.')
      setConfirmation(null)
      setOpened(null)
      if (confirmation === 'draft') setView('list')
      setFilters(blankFilters)
    }
    return error
  }

  return <>
    <div className="page-heading">
      <div><h1>Planner</h1><p>Plan and schedule posts across your social accounts.</p></div>
      <div className="segmented" aria-label="Planner view">
        <button onClick={() => setView('week')} aria-pressed={view === 'week'}><Icon name="calendar" />Week</button>
        <button onClick={() => setView('list')} aria-pressed={view === 'list'}><Icon name="list" />List</button>
      </div>
    </div>
    {message && <p className="notice" role="status">{message}<button className="quiet icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}><Icon name="close" /></button></p>}
    <section className="panel planner-panel" aria-label="Planner">
      <div className="toolbar planner-toolbar">
        <div className="date-nav">
          {view === 'week' && <>
            <div className="date-buttons">
              <button className="icon-button" aria-label="Previous week" onClick={() => setWeek(bumpDate(week, -7))}><Icon name="left" /></button>
              <button className="icon-button" aria-label="Next week" onClick={() => setWeek(bumpDate(week, 7))}><Icon name="right" /></button>
            </div>
            <button onClick={() => setWeek(monday(today))}>Today</button>
          </>}
          <div className="range"><h2>{view === 'week' ? weekLabel(week) : 'All posts'}</h2><span><Icon name="clock" size={13} />{zone}</span></div>
        </div>
        <Filters value={filters} onChange={setFilters} profiles={state.profiles} options={postStatuses} />
      </div>

      {view === 'week' ? <div className="calendar-scroll">
        <div className="calendar">
          {Array.from({ length: 7 }, (_, offset) => {
            const date = bumpDate(week, offset)
            const daysPosts = filtered.filter((post) => dateKey(post.scheduledAt, zone) === date)
            const longDate = formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })
            return <section className="day" key={date} aria-label={longDate}>
              <div className={`day-label${date === today ? ' today' : ''}`} aria-current={date === today ? 'date' : undefined}>
                <span>{formatDate(date, { weekday: 'short' })}</span><strong>{Number(date.slice(-2))}</strong>
              </div>
              <div className="day-posts">
                {daysPosts.map((post, index) => <button className={`post-card card-${text(post.status)}`} key={post.id || index}
                  ref={reveal === post.id ? revealTarget : null} disabled={!post.id} onClick={(event) => showDetails(post.id, event)}>
                  <span className="card-top"><time>{formatDate(post.scheduledAt, { hour: 'numeric', minute: '2-digit' }, zone)}</time><Status value={post.status} /></span>
                  <span className="card-copy">{text(post.body) || 'Untitled post'}</span>
                  <ProfileSummary ids={post.profileIds} profiles={state.profiles} />
                </button>)}
                {actor && <button className="add-day" aria-label={`New post for ${longDate}`} onClick={() => openComposer({ day: date })}><Icon name="plus" size={15} /></button>}
                {!daysPosts.length && !actor && <p className="day-empty">No posts</p>}
              </div>
            </section>
          })}
        </div>
        {!filtered.some((post) => { const day = dateKey(post.scheduledAt, zone); return day >= week && day <= bumpDate(week, 6) }) &&
          <div className="week-empty" role="status">No posts to show this week.</div>}
      </div> : <div className="table-scroll">
        <table className="post-table"><thead><tr><th>Date</th><th>Post</th><th>Profiles</th><th>Status</th></tr></thead>
          <tbody>{filtered.map((post, index) => <tr key={post.id || index}>
            <td>{dateTimeLabel(post.scheduledAt, zone)}</td>
            <td><button className="text-button post-link" ref={reveal === post.id ? revealTarget : null} disabled={!post.id} onClick={(event) => showDetails(post.id, event)}>{text(post.body) || 'Untitled post'}</button></td>
            <td><ProfileSummary ids={post.profileIds} profiles={state.profiles} /></td>
            <td><Status value={post.status} /></td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <Empty icon="calendar" title="No posts found">Try changing the filters or start a new post.</Empty>}
      </div>}
    </section>
    {edited && !confirmation && <Modal title="Post details" returnFocus={detailTrigger.current} onClose={() => setOpened(null)}>
      <PostPreview post={edited} profiles={state.profiles} zone={zone} />
      {editingAllowed && <footer className="modal-actions">
        {edited.status === 'scheduled' && <>
          <button className="danger" onClick={() => setConfirmation('canceled')}>Cancel scheduled post</button>
          <button onClick={() => setConfirmation('draft')}>Move to Drafts</button>
          <button onClick={() => openEdit('reschedule')}>Reschedule</button>
        </>}
        <button onClick={() => openEdit('review')}>Request approval</button>
        <button className="primary" onClick={() => openEdit('edit')}>Edit post</button>
      </footer>}
    </Modal>}
    {confirmation && <Confirm title={confirmation === 'draft' ? 'Move to Drafts?' : 'Cancel scheduled post?'}
      action={confirmation === 'draft' ? 'Move to Drafts' : 'Cancel scheduled post'}
      onClose={() => setConfirmation(null)} onConfirm={confirmChange}>
      {confirmation === 'draft' ? 'This clears the scheduled time and keeps the post in Planner.' : 'This removes the post from the schedule. You can still find it in Planner under Canceled.'}
    </Confirm>}
  </>
}
