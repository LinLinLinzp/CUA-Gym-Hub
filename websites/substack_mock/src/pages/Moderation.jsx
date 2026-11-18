import { useState } from 'react'
import { Check, Eye, Trash2 } from 'lucide-react'
import { AppLink, Avatar } from '../components/Shell.jsx'
import { Badge, Confirm, Empty, Tabs } from '../components/UI.jsx'
import { useStore, nameOf } from '../state/Store.jsx'
import { isPublisher, moderateComment } from '../state/comments.js'
import { articlePath, date, sortTime } from '../utils/format.js'

const queues = [
  ['reported', 'Reported', comment => comment.reviewStatus === 'reported'],
  ['approved', 'Approved', comment => comment.reviewStatus === 'approved'],
  ['removed', 'Removed', comment => comment.status === 'removed'],
  ['hidden', 'Hidden', comment => comment.status === 'hidden'],
]
const queueHints = {
  reported: 'Review comments reported by readers.',
  approved: 'Comments reviewed and approved by the publication.',
  removed: 'Comments removed from public discussion.',
  hidden: 'Comments hidden from public discussion that can be restored.',
}

export function RemoveCommentDialog({ comment, onClose }) {
  const { commit } = useStore()
  return <Confirm title="Remove comment?" label="Remove comment" onClose={onClose} danger onConfirm={() => {
    commit(previous => moderateComment(previous, comment.id, 'removed'), 'Comment removed')
    onClose()
  }}><p>Remove this comment from public discussion. Replies will remain visible.</p></Confirm>
}

export default function Moderation() {
  const { state, commit } = useStore()
  const [tab, setTab] = useState('reported')
  const [removing, setRemoving] = useState(null)
  const counts = queues.map(([id, label, predicate]) => [id, label, state.comments.filter(predicate).length])
  const results = state.comments.filter(queues.find(([id]) => id === tab)[2]).sort(sortTime('createdAt'))
  const canModerate = isPublisher(state)
  return <div className="page moderation-page">
    <div className="page-heading"><div><h1>Moderation</h1><p className="muted">Moderate reported content</p></div></div>
    <Tabs label="Moderation queue" items={counts} value={tab} onChange={setTab} />
    <p className="moderation-hint muted">{queueHints[tab]}</p>
    {results.length ? <div className="panel moderation-list">{results.map(comment => {
      const post = state.posts.find(item => item.id === comment.postId)
      const author = nameOf(state, comment.authorId)
      return <article className="moderation-row" key={comment.id}>
        <Avatar name={author} />
        <div className="moderation-comment">
          <div className="comment-meta"><strong>{author}</strong><small>{date(comment.createdAt, true)}</small>
            {tab === 'reported' && <Badge tone="reported">Reported</Badge>}</div>
          <div className="moderation-post">
            {post?.status === 'published' && post.slug
              ? <AppLink to={articlePath(post) + (comment.status === 'visible' ? `#comment-${comment.id}` : '#comments')}>{post.title || 'Untitled'}</AppLink>
              : <span className="muted">{post?.title || 'Unavailable post'}</span>}
          </div>
          <p className="comment-text">{comment.body}</p>
          {comment.reportReason && <small className="report-reason">{comment.reportReason}</small>}
        </div>
        {canModerate && <div className="toolbar moderation-actions">
          {tab === 'reported' && <button className="button" onClick={() => commit(previous => moderateComment(previous, comment.id, 'approved'), 'Comment approved')}><Check size={15} /> Approve</button>}
          {tab === 'hidden' && <button className="button" onClick={() => commit(previous => moderateComment(previous, comment.id, 'unhidden'), 'Comment restored')}><Eye size={15} /> Unhide</button>}
          {comment.status !== 'removed' && ['reported', 'hidden'].includes(tab) && <button className="button moderation-remove" onClick={() => setRemoving(comment)}><Trash2 size={15} /> Remove</button>}
        </div>}
      </article>
    })}</div> : <Empty title={`No ${tab} comments`} />}
    {removing && <RemoveCommentDialog comment={removing} onClose={() => setRemoving(null)} />}
  </div>
}
