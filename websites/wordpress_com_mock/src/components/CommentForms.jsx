import React, { useState } from 'react'
import { difference } from '../data/records.js'
import { editComment, replyToComment } from '../data/comments.js'
import { useStore } from '../data/store.jsx'
import { displayDate, formatStatus, named, rows } from '../utils/display.js'
import { Field, Modal } from './Controls.jsx'

const activityLabels = {
  comment_approved: 'Approved', comment_unapproved: 'Unapproved', comment_spammed: 'Marked as spam',
  comment_unspammed: 'Marked as not spam', comment_trashed: 'Moved to Trash', comment_restored: 'Restored',
  comment_deleted: 'Permanently deleted', comment_replied: 'Reply posted', comment_edited: 'Edited',
}

export function CommentForm({ comment, mode, close }) {
  const { commit } = useStore()
  const editing = mode === 'edit'
  const approve = mode === 'approve-reply'
  const label = editing ? 'Quick Edit' : approve ? 'Approve and Reply' : 'Reply'
  const [initial] = useState(() => ({ authorName: comment.authorName ?? '', authorEmail: comment.authorEmail ?? '', body: editing ? comment.body ?? '' : '' }))
  const [values, setValues] = useState(initial)
  const [error, setError] = useState(null)
  const set = (name, value) => { setValues((previous) => ({ ...previous, [name]: value })); setError(null) }
  const fieldError = (name) => error?.field === name ? error.error : undefined
  const save = (event) => {
    event.preventDefault()
    const changes = difference(initial, values)
    const result = commit((current, stamp) => editing
      ? editComment(current, stamp, comment.id, changes)
      : replyToComment(current, stamp, comment.id, values.body, approve))
    if (result.error) setError(result)
    else close()
  }
  return <form className="quick-form comment-form" onSubmit={save} noValidate aria-label={label}>
    <h3>{label}</h3>
    {editing && <div className="settings-grid">
      <Field label="Name" error={fieldError('authorName')}><input value={values.authorName} onChange={(event) => set('authorName', event.target.value)} /></Field>
      <Field label="Email" error={fieldError('authorEmail')}><input type="email" value={values.authorEmail} onChange={(event) => set('authorEmail', event.target.value)} /></Field>
    </div>}
    <Field label={editing ? 'Comment' : 'Reply text'} error={fieldError('body')}><textarea rows="3" autoFocus value={values.body} onChange={(event) => set('body', event.target.value)} /></Field>
    {error && !error.field && <p role="alert" className="text-danger">{error.error}</p>}
    <div className="inline-controls"><button className="button primary">{editing ? 'Update Comment' : label}</button><button className="button" type="button" onClick={close}>Cancel</button></div>
  </form>
}

export function CommentHistory({ comment, close }) {
  const { state } = useStore()
  const events = rows(state.activity).filter((row) => row.targetType === 'comment' && (row.targetId === comment.id ||
    row.action === 'comment_replied' && rows(row.relatedIds).includes(comment.id)))
    .reverse().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  return <Modal title="Comment history" close={close} footer={<button className="button" type="button" onClick={close}>Close</button>}>
    {events.length ? <ul className="activity-list">{events.map((row) => <li key={row.id}>
      <div><strong>{activityLabels[row.action] || row.action}</strong><div className="meta">{named(state.users, row.actorId)} · {displayDate(row.createdAt, true)}</div>
        {row.fromStatus && row.toStatus && row.fromStatus !== row.toStatus && <span className="meta">{formatStatus(row.fromStatus)} → {formatStatus(row.toStatus)}</span>}
      </div>
    </li>)}</ul> : <p className="muted">No moderation history yet.</p>}
  </Modal>
}
