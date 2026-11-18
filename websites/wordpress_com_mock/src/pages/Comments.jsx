import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { activeComment, commentActions, moderateComments, moderationLabels } from '../data/comments.js'
import { useStore } from '../data/store.jsx'
import { contentFor, displayDate, rows, titleOf } from '../utils/display.js'
import { commentsPath, editorPath, SiteLink, useSessionRouting } from '../utils/navigation.jsx'
import { CommentForm, CommentHistory } from '../components/CommentForms.jsx'
import { BulkActions, Confirm, Pagination, SearchBox, StatusPill, TabBar, useSelection } from '../components/Controls.jsx'

const tabs = [['all', 'All'], ['mine', 'Mine'], ['pending', 'Pending'], ['approved', 'Approved'], ['spam', 'Spam'], ['trash', 'Trash']]
const size = 15
const commenter = (comment) => comment.authorName || 'Guest'
const sortColumns = { author: 'Author', target: 'In response to', date: 'Submitted on' }

export default function Comments() {
  const { state, commit, notify } = useStore()
  const [params] = useSearchParams()
  const { go } = useSessionRouting()
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(null)
  const [historyId, setHistoryId] = useState(null)
  const history = rows(state.comments).find((row) => row.id === historyId)
  const tab = tabs.some(([value]) => value === params.get('comment_status')) ? params.get('comment_status') : 'all'
  const targetId = params.get('contentId')
  const sort = Object.hasOwn(sortColumns, params.get('orderby')) ? params.get('orderby') : 'date'
  const direction = params.get('order') || 'desc'
  const content = new Map([...rows(state.posts).map((row) => ['post:' + row.id, row]), ...rows(state.pages).map((row) => ['page:' + row.id, row])])
  const targetFor = (comment) => content.get(comment.contentType + ':' + comment.contentId)
  const target = targetId && (contentFor(state, 'post', targetId) || contentFor(state, 'page', targetId))
  const url = (patch) => {
    const next = new URLSearchParams(params)
    next.delete('paged')
    for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key)
    return commentsPath + (next.size ? '?' + next : '')
  }
  const change = (patch) => go(url(patch))
  const onTab = (comment, value) => {
    if (value === 'all') return activeComment(comment.status)
    if (value === 'mine') return Boolean(state.currentUserId && comment.authorId === state.currentUserId)
    return comment.status === value
  }
  const queue = rows(state.comments).filter((row) => !targetId || row.contentId === targetId)
  const searchText = search.trim().toLowerCase()
  const sortValue = (comment) => {
    if (sort === 'author') return commenter(comment)
    if (sort === 'target') return targetFor(comment)?.title || ''
    return comment.createdAt || ''
  }
  const visible = queue.filter((comment) => onTab(comment, tab) && (!searchText ||
    [comment.authorName, comment.authorEmail, comment.body, targetFor(comment)?.title].some((value) => String(value || '').toLowerCase().includes(searchText))
  )).sort((a, b) => (direction === 'asc' ? 1 : -1) * sortValue(a).localeCompare(sortValue(b), undefined, { sensitivity: 'base' }))
  const page = Math.min(Math.max(1, Number.parseInt(params.get('paged'), 10) || 1), Math.max(1, Math.ceil(visible.length / size)))
  const shown = visible.slice((page - 1) * size, page * size)
  const selection = useSelection(JSON.stringify([tab, targetId, searchText, sort, direction, page, visible.map((comment) => comment.id)]))
  const bulkActions = Object.entries(moderationLabels).filter(([action]) => {
    if (tab === 'all') return ['approve', 'unapprove', 'spam', 'trash'].includes(action)
    if (tab === 'mine') return true
    return commentActions(tab).includes(action)
  })
  const apply = (ids, action) => {
    const result = commit((current, stamp) => moderateComments(current, stamp, ids, action))
    if (result.error) notify(result.error)
    selection.clear()
  }
  const run = (ids, action) => {
    if (action === 'delete') setDeleting(ids)
    else apply(ids, action)
  }
  const count = (value) => queue.filter((comment) => onTab(comment, value)).length
  const sortHeader = (key) => <th scope="col" aria-sort={sort === key ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}>
    <button className="table-sort" type="button" onClick={() => change({ orderby: key, order: sort === key && direction === 'asc' ? 'desc' : 'asc' })}>{sortColumns[key]}{sort === key && <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>}</button>
  </th>
  return <section className="list-screen comments-screen">
    <header className="screen-header"><h1>Comments</h1>{targetId && <div className="inline-controls target-filter">
      {target ? <SiteLink to={editorPath(target.id)}>{titleOf(target)}</SiteLink> : <span>Content unavailable</span>}
      <SiteLink to={url({ contentId: '' })}>Clear filter</SiteLink>
    </div>}</header>
    <TabBar label="Comment status" items={tabs.map(([value, label]) => [value, label, count(value)])} current={tab} path={(value) => url({ comment_status: value === 'all' ? '' : value })} />
    <div className="list-toolbar">
      <BulkActions actions={bulkActions} count={selection.ids.length} submit={(action) => run(selection.ids, action)} />
      <SearchBox label="Search comments" value={search} onChange={(value) => { setSearch(value); if (params.has('paged')) change({ paged: '' }) }} />
    </div>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Comments table">
      <table className="comments-table"><thead><tr>
        <th className="check-cell"><input type="checkbox" aria-label="Select all comments on this page" checked={shown.length > 0 && selection.ids.length === shown.length} disabled={!shown.length} onChange={() => selection.toggleAll(shown.map((row) => row.id))} /></th>
        {sortHeader('author')}<th scope="col">Comment</th>{sortHeader('target')}{sortHeader('date')}
      </tr></thead><tbody>
        {shown.map((comment) => {
          const linked = targetFor(comment)
          const selected = selection.ids.includes(comment.id)
          return <tr key={comment.id} className={(comment.status === 'pending' ? 'pending-row ' : '') + (selected ? 'selected-row' : '')}>
            <td className="check-cell"><input type="checkbox" aria-label={'Select comment by ' + commenter(comment)} checked={selected} onChange={() => selection.toggle(comment.id)} /></td>
            <td className="comment-author"><strong>{commenter(comment)}</strong>{comment.authorEmail && <div className="meta">{comment.authorEmail}</div>}</td>
            <td className="comment-main">
              <StatusPill status={comment.status} />
              <p className="comment-body">{comment.body || '—'}</p>
              <div className="comment-actions">
                {commentActions(comment.status).map((action) => <button className={'text-button' + (['trash', 'spam', 'delete'].includes(action) ? ' text-danger' : '')} key={action} type="button" onClick={() => run([comment.id], action)}>{moderationLabels[action]}</button>)}
                {activeComment(comment.status) && <button type="button" className="text-button" onClick={() => setForm({ id: comment.id, mode: comment.status === 'pending' ? 'approve-reply' : 'reply' })}>{comment.status === 'pending' ? 'Approve and Reply' : 'Reply'}</button>}
                <button type="button" className="text-button" onClick={() => setForm({ id: comment.id, mode: 'edit' })}>Quick Edit</button>
                <button type="button" className="text-button" onClick={() => setHistoryId(comment.id)}>History</button>
              </div>
              {form?.id === comment.id && <CommentForm key={form.mode} comment={comment} mode={form.mode} close={() => setForm(null)} />}
            </td>
            <td className="comment-target">{linked ? <SiteLink className="record-title" to={editorPath(linked.id)}>{titleOf(linked)}</SiteLink> : <span className="meta">Content unavailable</span>}</td>
            <td className="meta nowrap">{displayDate(comment.createdAt)}</td>
          </tr>
        })}
      </tbody></table>
      {!visible.length && <div className="table-empty empty"><h2>No comments found</h2></div>}
    </div>
    <Pagination count={visible.length} page={page} size={size} change={(next) => change({ paged: next === 1 ? '' : String(next) })} />
    {history && <CommentHistory comment={history} close={() => setHistoryId(null)} />}
    {deleting && <Confirm title={deleting.length === 1 ? 'Delete comment permanently?' : 'Delete selected comments permanently?'} action="Delete permanently" destructive close={() => setDeleting(null)} confirm={() => { apply(deleting, 'delete'); setDeleting(null) }}>
      <p>Eligible comments in Spam or Trash will be permanently removed. Replies will stay in the thread.</p>
    </Confirm>}
  </section>
}
