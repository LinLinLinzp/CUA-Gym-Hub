import { useRef, useState } from 'react'
import { Avatar, personName } from './people.jsx'
import { ActionMenu, TrashDialog } from './ui.jsx'
import { cleanHtml, RichBody, RichEditor } from './richText.jsx'
import { useStore } from '../store.jsx'
import { byId, commentsOf, sameId, textOf } from '../utils/records.js'
import { formatInstant, validZone } from '../utils/dates.js'

function CommentForm({ label, initial, onSubmit, onCancel }) {
  const editor = useRef(null)
  const [error, setError] = useState('')
  return <form className="form comment-form" onSubmit={(event) => {
    event.preventDefault()
    const html = cleanHtml(editor.current.innerHTML)
    if (!textOf(html)) {
      setError('Enter a comment.')
      return
    }
    onSubmit(html)
  }}>
    <RichEditor label={label} initial={initial} editorRef={editor} error={error} compact />
    <div className="actions">
      <button className="button primary">{initial == null ? 'Add this comment' : 'Save changes'}</button>
      {onCancel && <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>}
    </div>
  </form>
}

function Comment({ comment, editable }) {
  const { state, update } = useStore()
  const [editing, setEditing] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const name = personName(state.people, comment.createdById)
  return <li className="comment">
    <div className="byline">
      <Avatar person={byId(state.people, comment.createdById)} />
      <div><strong>{name}</strong><time dateTime={comment.createdAt}>{formatInstant(comment.createdAt, validZone(state.workspace?.timeZone), {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })}</time></div>
      {editable && <ActionMenu label={name + ' comment options'}>
        <button type="button" onClick={() => setEditing(true)}>Edit comment</button>
        <button type="button" className="destructive" onClick={() => setTrashing(true)}>Put comment in the trash</button>
      </ActionMenu>}
    </div>
    {editing ? <CommentForm label="Edit comment" initial={comment.bodyHtml ?? ''} onCancel={() => setEditing(false)}
      onSubmit={(bodyHtml) => { update('comments', comment.id, { bodyHtml }); setEditing(false) }} /> : <RichBody html={comment.bodyHtml} />}
    {trashing && <TrashDialog title={`comment by ${name}`} description="This will remove the reply from the discussion."
      onClose={() => setTrashing(false)}
      onConfirm={() => { update('comments', comment.id, { status: 'trashed' }); setTrashing(false) }} />}
  </li>
}

export function Comments({ parent, type }) {
  const { state, add } = useStore()
  const [version, setVersion] = useState(0)
  const comments = commentsOf(state, parent, type)
  return <section className="card comment-thread">
    <h2>{comments.length ? `Comments (${comments.length})` : 'Comments'}</h2>
    {comments.length > 0 && <ol className="comment-list">{comments.map((comment) =>
      <Comment key={comment.id} comment={comment}
        editable={type === 'message' && sameId(state.workspace?.currentUserId, comment.createdById)} />)}</ol>}
    <CommentForm key={version} label="Add a comment" onSubmit={(bodyHtml) => {
      add('comments', 'comment', {
        projectId: String(parent.projectId), parentType: type, parentId: String(parent.id), bodyHtml, status: 'active',
      })
      setVersion((value) => value + 1)
    }} />
  </section>
}
