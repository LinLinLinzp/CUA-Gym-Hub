import { useState } from 'react'
import { Check, MessageSquare, Plus } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { addComment, addTask, setReview, setTaskStatus, setThreadResolution } from '../domain/pullRequests.js'
import { byId, list, person, relative } from '../utils/model.js'
import { Avatar, Button, ErrorText, Field, FormActions, Modal, Status, usePage } from '../components/ui.jsx'

function useReviewMutation(repo, pr) {
  const { transact } = useStore()
  const toast = useToast()
  return (action, input, message) => {
    const result = transact(action, { repositoryId: repo.id, pullRequestId: pr.id, ...input })
    if (!result.error && message) toast(message)
    return result.error || ''
  }
}

export function Composer({ repo, pr, anchor, parent, onClose }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const mutate = useReviewMutation(repo, pr)
  const { user } = useStore()
  function submit(event) {
    event.preventDefault()
    const error = mutate(addComment, { body, anchor, parentCommentId: parent?.id }, parent ? 'Reply posted' : 'Comment posted')
    setError(error)
    if (error) return
    setBody('')
    onClose?.()
  }
  const label = anchor ? 'Inline comment' : parent ? 'Reply' : 'Add a comment'
  return <form className="form-layout small-gap" onSubmit={submit}>
    <Field label={label} hint={anchor ? `${anchor.path} · ${anchor.side} line ${anchor.line}` : undefined}>
      <textarea value={body} required onChange={event => setBody(event.target.value)} />
    </Field>
    <ErrorText>{error}</ErrorText>
    <FormActions label={parent ? 'Post reply' : 'Post comment'} onClose={onClose} disabled={!user || !body.trim()} />
  </form>
}

function TaskForm({ repo, pr, comment, onClose }) {
  const { state, user } = useStore()
  const mutate = useReviewMutation(repo, pr)
  const [body, setBody] = useState('')
  const [assigneeId, setAssignee] = useState('')
  const [error, setError] = useState('')
  const assignees = [...new Set([pr.authorId, ...list(pr.reviewerIds)])].map(id => byId(state.users, id)).filter(Boolean)
  function submit(event) {
    event.preventDefault()
    const error = mutate(addTask, { body, assigneeId, commentId: comment?.id }, 'Task added')
    if (error) return setError(error)
    onClose()
  }
  return <Modal title="Add task" onClose={onClose}><form className="form-layout" onSubmit={submit}>
    {comment && <p className="muted">{comment.body}</p>}
    <Field label="Task"><textarea value={body} required onChange={event => setBody(event.target.value)} /></Field>
    <Field label="Assignee"><select value={assigneeId} onChange={event => setAssignee(event.target.value)}><option value="">Unassigned</option>{assignees.map(user => <option key={user.id} value={user.id}>{user.name || user.username}</option>)}</select></Field>
    <ErrorText>{error}</ErrorText><FormActions label="Add task" onClose={onClose} disabled={!user || !body.trim()} />
  </form></Modal>
}

function CommentText({ comment, action }) {
  const { state } = useStore()
  return <div className="comment-text">
    <Avatar user={byId(state.users, comment.createdBy)} />
    <div><strong>{person(state, comment.createdBy)}</strong> <small>· {relative(comment.createdAt)}</small>
      {comment.anchor && <div><code>{comment.anchor.path}</code> <small>· {comment.anchor.side} line {comment.anchor.line}</small></div>}
      <p className="preserve-lines">{comment.body}</p>{action}</div>
  </div>
}

function Thread({ repo, pr, comment, replies, canWrite, onTask }) {
  const mutate = useReviewMutation(repo, pr)
  const [openReply, setOpenReply] = useState(false)
  const [error, setError] = useState('')
  const resolved = comment.status === 'resolved'
  const page = usePage(replies, comment.id)
  function toggle() {
    setError(mutate(setThreadResolution, { commentId: comment.id, resolved: !resolved }, resolved ? 'Thread reopened' : 'Thread resolved'))
  }
  return <article className="thread">
    <div className="thread-heading">
      <CommentText comment={comment} />
      {resolved && <span className="pill success"><Check size={12} />Resolved</span>}
    </div>
    {page.rows.map(reply => <div className="reply" key={reply.id}><CommentText comment={reply} action={canWrite &&
      <Button variant="quiet" onClick={() => onTask(reply)}>Add task</Button>} /></div>)}
    {page.controls}
    {canWrite && <div className="thread-actions">
      <Button variant="quiet" onClick={() => setOpenReply(!openReply)}>Reply</Button>
      <Button variant="quiet" onClick={toggle}>{resolved ? 'Reopen thread' : 'Resolve thread'}</Button>
      <Button variant="quiet" onClick={() => onTask(comment)}>Add task</Button>
    </div>}
    <ErrorText>{error}</ErrorText>
    {openReply && canWrite && <Composer repo={repo} pr={pr} parent={comment} onClose={() => setOpenReply(false)} />}
  </article>
}

export function Discussion({ repo, pr, records }) {
  const { state, user } = useStore()
  const mutate = useReviewMutation(repo, pr)
  const [task, setTask] = useState(null)
  const [error, setError] = useState('')
  const canWrite = Boolean(user && pr.status === 'open')
  const roots = records.comments.filter(comment => !comment.parentCommentId || !byId(records.comments, comment.parentCommentId))
  const comments = usePage(roots, pr.id)
  const tasks = usePage(records.tasks, pr.id)
  return <>
    <section className="panel">
      <div className="panel-title"><MessageSquare size={18} /><h2>Comments</h2><span className="pill neutral">{records.comments.length}</span></div>
      <div className="panel-pad stack">
        {canWrite && <Composer repo={repo} pr={pr} />}
        {!roots.length && <p className="muted">No comments yet.</p>}
        {comments.rows.map(comment => <Thread key={comment.id} repo={repo} pr={pr} comment={comment}
          replies={records.comments.filter(reply => reply.parentCommentId === comment.id)} canWrite={canWrite && !comment.parentCommentId} onTask={setTask} />)}
        {comments.controls}
      </div>
    </section>
    <section className="panel">
      <div className="panel-title"><h2>Tasks</h2>{canWrite && <Button onClick={() => setTask({})}><Plus size={15} />Add task</Button>}</div>
      <div className="panel-pad stack small-gap">
        {!tasks.rows.length && <p className="muted">No tasks yet.</p>}
        {tasks.rows.map(item => <div className="task-row" key={item.id}>
          <label className="checkbox"><input type="checkbox" checked={item.status === 'completed'} disabled={!canWrite}
            onChange={event => setError(mutate(setTaskStatus, { taskId: item.id, completed: event.target.checked }, event.target.checked ? 'Task completed' : 'Task reopened'))} />
            <span>{item.body}</span></label>
          <small>{item.assigneeId ? person(state, item.assigneeId) : 'Unassigned'}{item.commentId ? ' · From comment' : ''}</small>
        </div>)}
        <ErrorText>{error}</ErrorText>{tasks.controls}
      </div>
    </section>
    {pr.status === 'open' && !user && <p className="notice">A signed-in workspace member is required to comment or manage tasks.</p>}
    {task && <TaskForm repo={repo} pr={pr} comment={task.id ? task : null} onClose={() => setTask(null)} />}
  </>
}

export function ReviewDecision({ repo, pr, detail, review }) {
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const mutate = useReviewMutation(repo, pr)
  const available = detail.commitIndex.has(detail.sourceId)
  const current = review?.sourceCommitId === detail.sourceId ? review?.status : 'unreviewed'
  function submit(event) {
    event.preventDefault()
    const error = mutate(setReview, { status, sourceCommitId: detail.sourceId }, 'Review updated')
    if (error) return setError(error)
    setShow(false)
  }
  return <>
    <Button disabled={!available} title={!available ? 'The source commit is unavailable.' : undefined} onClick={() => {
      setError('')
      setStatus(current && current !== 'unreviewed' ? current : 'approved')
      setShow(true)
    }}>Review</Button>
    {show && <Modal title="Review pull request" onClose={() => setShow(false)}>
      <form className="form-layout" onSubmit={submit}>
        <div><Status value={current || 'unreviewed'} /></div>
        {[['approved', 'Approve'], ['changes_requested', 'Request changes'], ['unreviewed', 'Clear review']].map(([value, label]) =>
          <label key={value} className="checkbox"><input type="radio" name="decision" value={value} checked={status === value} onChange={() => setStatus(value)} />{label}</label>)}
        <ErrorText>{error}</ErrorText><FormActions label="Submit review" onClose={() => setShow(false)} />
      </form>
    </Modal>}
  </>
}
