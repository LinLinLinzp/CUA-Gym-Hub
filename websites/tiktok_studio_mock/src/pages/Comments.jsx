import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog, Cover, Empty, Icon, PageHeading, Pagination, Search, Select, usePagination } from '../components/ui.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { metadata, updateRecord } from '../utils/changes.js'
import { actor, creatorReplies, dateKey, dateLabel, handle, initials, isAudienceComment, items, newId, queryMatch } from '../utils/view.js'

function CommentRow({ comment, post, replies, onReply, onHeart, onDelete, selected, onSelect }) {
  const [writing, setWriting] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!body.trim()) return setError('Write a reply before sending.')
    if (!onReply(comment.id, body.trim())) return setError('This comment is no longer available.')
    setBody('')
    setError('')
    setWriting(false)
  }
  return <article className="comment-row">
    <div className="comment-main">
      <div className="comment-header"><input type="checkbox" aria-label={`Select comment by ${comment.authorHandle || comment.authorName || "viewer"}`} checked={selected} onChange={(event) => onSelect(comment.id, event.target.checked)} /><span className="avatar">{initials(comment.authorName || comment.authorHandle || 'Viewer')}</span>
        <div><strong>{comment.authorName || 'Viewer'}</strong> <span className="meta">{handle(comment.authorHandle)}</span><span className="meta comment-time">{dateLabel(comment.createdAt, { hour: 'numeric', minute: '2-digit' })}</span></div>
      </div>
      <p className="comment-body">{comment.body || 'Comment unavailable'}</p>
      <div className="action-row comment-actions">
        <button type="button" className="text-button" aria-expanded={writing} onClick={() => { setWriting(!writing); setError('') }}>Reply</button>
        <button type="button" className="text-button heart-button" aria-pressed={Boolean(comment.likedByCreator)} onClick={() => onHeart(comment.id)}><Icon name="heart" filled={Boolean(comment.likedByCreator)} />Heart</button>
        <details className="row-menu"><summary aria-label="Comment actions" title="Comment actions"><Icon name="more" /></summary>
          <button type="button" onClick={(event) => {
            const menu = event.currentTarget.closest('details')
            menu.open = false
            menu.querySelector('summary').focus()
            onDelete(comment)
          }}>Delete comment</button>
        </details>
        {replies.length > 0 && <span className="meta">Replied</span>}
      </div>
      {replies.map((reply) => <div className="thread-reply" key={reply.id}><strong>{reply.authorName || 'Creator'}</strong> <span className="meta">· {dateLabel(reply.createdAt)}</span><p>{reply.body || 'Reply unavailable'}</p></div>)}
      {writing && <form className="inline-reply" onSubmit={submit}>
        <label className="field"><span>Your reply</span><textarea autoFocus rows={2} value={body} onChange={(event) => { setBody(event.target.value); setError('') }} placeholder="Write a reply" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="action-row"><button type="button" onClick={() => { setWriting(false); setBody(''); setError('') }}>Cancel</button><button className="button primary" type="submit">Send reply</button></div>
      </form>}
    </div>
    <div className="comment-post"><Cover className="mini-cover" url={post?.coverUrl} /><span><small>On post</small><span>{post?.caption || 'Post unavailable'}</span></span></div>
  </article>
}

export default function Comments() {
  const { state, commit, notify } = useStudio()
  const [params, setParams] = useSearchParams()
  const currentFilter = params.get('reply')
  const replyFilter = ['unanswered', 'replied'].includes(currentFilter) ? currentFilter : 'all'
  const [query, setQuery] = useState('')
  const [postFilter, setPostFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [removing, setRemoving] = useState(null)
  const [selection, setSelection] = useState({ key: '', ids: [] })
  const comments = items(state.comments)
  const accountId = actor(state)
  const replies = creatorReplies(comments, accountId)
  const audience = comments.filter((comment) => isAudienceComment(comment, accountId))
  const posts = new Map(items(state.posts).filter((post) => post.status !== 'deleted').map((post) => [post.id, post]))
  const missingId = 'missing-post'
  const postKey = (value) => value || missingId
  const filters = Array.from(new Set(audience.map((comment) => postKey(comment.postId))))
  const records = audience.filter((comment) => {
    const replied = replies.has(comment.id)
    return queryMatch(query, comment.body, comment.authorHandle, handle(comment.authorHandle), comment.authorName) &&
      (postFilter === 'all' || postFilter === postKey(comment.postId)) &&
      (replyFilter === 'all' || (replyFilter === 'replied' ? replied : !replied))
  }).sort((left, right) => {
    const order = dateKey(right.createdAt).localeCompare(dateKey(left.createdAt))
    return sort === 'newest' ? order : -order
  })
  const filterKey = JSON.stringify([query, postFilter, replyFilter, sort])
  const pagination = usePagination(records, filterKey, 10)
  const selectionKey = JSON.stringify([filterKey, pagination.page])
  const selectedIds = selection.key === selectionKey ? selection.ids.filter((id) => pagination.rows.some((comment) => comment.id === id)) : []

  function selectComment(id, checked) {
    setSelection({ key: selectionKey, ids: checked ? [...selectedIds, id] : selectedIds.filter((selected) => selected !== id) })
  }

  function setReplyFilter(value) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('reply')
    else next.set('reply', value)
    setParams(next, { replace: true })
  }

  function reply(id, body) {
    const timestamp = new Date().toISOString()
    const saved = commit((current) => {
      const creatorId = actor(current)
      const parent = items(current.comments).find((item) => item.id === id && isAudienceComment(item, creatorId))
      if (!parent) return current
      const record = {
        id: newId('reply'), postId: parent.postId ?? null, parentCommentId: parent.id,
        actorId: creatorId, authorName: current.account?.displayName || 'Creator',
        authorHandle: current.account?.handle || '', body, status: 'visible',
        likedByCreator: false, likedAt: null, likedById: null, createdAt: timestamp, deletedAt: null,
        ...metadata(current, timestamp),
      }
      return { ...current, comments: [...current.comments, record] }
    })
    if (saved) notify('Reply posted.')
    return saved
  }

  function heart(id) {
    const timestamp = new Date().toISOString()
    commit((current) => {
      const creatorId = actor(current)
      const eligible = (comment) => isAudienceComment(comment, creatorId)
      const target = items(current.comments).find((comment) => comment.id === id && eligible(comment))
      if (!target) return current
      const likedByCreator = !target.likedByCreator
      return updateRecord(current, 'comments', id, eligible, {
        likedByCreator, likedAt: likedByCreator ? timestamp : null, likedById: likedByCreator ? creatorId : null,
        ...metadata(current, timestamp),
      })
    })
  }

  function remove() {
    const timestamp = new Date().toISOString()
    const ids = new Set(removing.ids)
    if (commit((current) => {
      const creatorId = actor(current)
      const fields = { status: 'deleted', deletedAt: timestamp, ...metadata(current, timestamp) }
      let changed = false
      const comments = current.comments.map((comment) => {
        if (!comment || !ids.has(comment.id) || !isAudienceComment(comment, creatorId)) return comment
        changed = true
        return { ...comment, ...fields }
      })
      return changed ? { ...current, comments } : current
    })) {
      notify(removing.bulk ? `${ids.size} comments deleted.` : 'Comment deleted.')
      setSelection({ key: selectionKey, ids: selectedIds.filter((id) => !ids.has(id)) })
    }
    setRemoving(null)
  }

  return <>
    <PageHeading title="Comments" description="Reply to viewers and manage the conversation on your posts." />
    <section className="card" aria-label="Comment inbox">
      <div className="toolbar">
        <Search label="Search comments" value={query} onChange={setQuery} placeholder="Search comments or usernames" />
        <Select label="Post" value={postFilter} onChange={setPostFilter}><option value="all">All posts</option>
          {!filters.includes(postFilter) && postFilter !== 'all' && <option value={postFilter}>Post unavailable</option>}
          {filters.map((id) => {
            const caption = posts.get(id)?.caption
            return <option value={id} key={id}>{caption ? caption.length > 58 ? caption.slice(0, 57) + '…' : caption : id === missingId ? 'Post unavailable' : `Post unavailable (${id})`}</option>
          })}
        </Select>
        <Select label="Reply status" value={replyFilter} onChange={setReplyFilter}><option value="all">All comments</option><option value="unanswered">Unanswered</option><option value="replied">Replied</option></Select>
        <Select label="Sort by" value={sort} onChange={setSort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></Select>
      </div>
      {selectedIds.length > 0 && <div className="selection-bar"><span>{selectedIds.length} selected</span>
        <button type="button" className="danger-text" onClick={() => setRemoving({ ids: selectedIds, bulk: true })}>Delete selected</button>
        <button type="button" className="text-button" onClick={() => setSelection({ key: selectionKey, ids: [] })}>Clear selection</button>
      </div>}
      {records.length ? <div>{pagination.rows.map((comment) => <CommentRow key={comment.id} comment={comment} post={posts.get(comment.postId)} replies={replies.get(comment.id) || []} onReply={reply} onHeart={heart} onDelete={(item) => setRemoving({ ids: [item.id], bulk: false })} selected={selectedIds.includes(comment.id)} onSelect={selectComment} />)}</div>
        : <Empty title="No matching comments" icon="comments">Try another search or change the filters.</Empty>}
      <Pagination {...pagination} noun="comments" />
    </section>
    {removing && <ConfirmDialog title={removing.bulk ? `Delete ${removing.ids.length} selected ${removing.ids.length === 1 ? "comment" : "comments"}?` : "Delete this comment?"} close={() => setRemoving(null)} confirm={remove} action={removing.bulk ? "Delete selected comments" : "Delete comment"}>Selected comments will be removed from your inbox.</ConfirmDialog>}
  </>
}
