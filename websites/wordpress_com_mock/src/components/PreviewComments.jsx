import React from 'react'
import { visibleComments } from '../data/comments.js'
import { displayDate } from '../utils/display.js'

export default function PreviewComments({ state, type, id }) {
  const visible = visibleComments(state, type, id)
  if (!visible.length) return null
  return <section className="preview-comments">
    <h2>Comments</h2>
    <ul>{visible.map(({ comment, depth }) => <li key={comment.id} style={{ '--depth': Math.min(depth, 5) }}>
      <strong>{comment.authorName || 'Guest'}</strong> <span className="meta">{displayDate(comment.createdAt)}</span>
      <p>{comment.body}</p>
    </li>)}</ul>
  </section>
}
