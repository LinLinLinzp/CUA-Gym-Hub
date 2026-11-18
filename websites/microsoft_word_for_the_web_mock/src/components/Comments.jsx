import { useRef, useState } from 'react'
import { Check, MessageSquare, MessageSquarePlus, Pencil, RotateCcw, Trash2, X } from 'lucide-react'
import { userOf } from '../data/access.js'
import { inBounds } from '../data/body.js'
import { Avatar, displayDate, Menu } from './ui.jsx'

function Composer({ label, people, initial = '', onPost, onCancel, postLabel = 'Post' }) {
  const [value, setValue] = useState(initial)
  const [position, setPosition] = useState(value.length)
  const field = useRef(null)
  const mention = value.slice(0, position).match(/(?:^|\s)@([^@\n]{0,48})$/)
  const suggestions = mention ? people.filter((user) => [user.name, user.email].some((entry) => entry?.toLowerCase().includes(mention[1].toLowerCase()))).slice(0, 7) : []
  function addMention(user) {
    const next = value.slice(0, position - mention[1].length - 1) + '@' + user.name + ' '
    setValue(next + value.slice(position))
    setPosition(next.length)
    requestAnimationFrame(() => { field.current?.focus(); field.current?.setSelectionRange(next.length, next.length) })
  }
  function post() {
    if (value.trim()) onPost(value)
  }
  return <form className="comment-composer" onSubmit={(event) => { event.preventDefault(); post() }}>
    <textarea className="field" aria-label={label} placeholder={label} ref={field} value={value} autoFocus rows={2}
      onChange={(event) => { setValue(event.target.value); setPosition(event.target.selectionStart) }}
      onSelect={(event) => setPosition(event.target.selectionStart)} onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); post() }
        if (event.key === 'Escape') { event.stopPropagation(); onCancel() }
      }} />
    {suggestions.length > 0 && <ul className="mention-suggestions" aria-label="Mention people">
      {suggestions.map((user) => <li key={user.id}><button type="button" onClick={() => addMention(user)}><Avatar user={user} small /><span>{user.name}</span></button></li>)}
    </ul>}
    <div className="composer-actions">
      <button className="button ghost" type="button" onClick={onCancel}>Cancel</button>
      <button className="button primary" disabled={!value.trim()}>{postLabel}</button>
    </div>
  </form>
}

function CommentCard({ thread, state, attached, people, selected, writable, onSelect, onUpdate }) {
  const [composing, setComposing] = useState(null)
  const messages = (thread.messages ?? []).filter((message) => !message.deletedAt)
  const resolved = thread.status === 'resolved'
  const starter = messages[0]
  const firstAuthor = userOf(state, starter?.authorId)
  const cancel = () => setComposing(null)
  const save = (action, options) => { onUpdate(thread.id, action, options); cancel() }
  function messageOptions(message) {
    const isStarter = message.id === starter?.id
    const items = []
    if (writable && isStarter) items.push(resolved
      ? { label: 'Reopen thread', icon: <RotateCcw size={15} />, action: () => onUpdate(thread.id, 'reopen') }
      : { label: 'Resolve thread', icon: <Check size={15} />, action: () => onUpdate(thread.id, 'resolve') })
    if (writable && message.authorId === state.currentUserId) items.push(
      { label: 'Edit comment', icon: <Pencil size={15} />, action: () => { onSelect(thread); setComposing(message.id) } },
      { label: isStarter ? 'Delete thread' : 'Delete reply', icon: <Trash2 size={15} />, danger: true, action: () => save('delete', { messageId: message.id }) },
    )
    return items
  }
  return <article className={`comment-card ${selected ? 'comment-selected' : ''}`}>
    <button type="button" className="thread-target" onClick={() => onSelect(thread)} aria-pressed={selected}
      aria-label={`Select comment by ${firstAuthor?.name || 'Unknown author'}`}>
      <MessageSquare size={13} /><span>{thread.anchor?.quote ? `“${thread.anchor.quote}”` : 'Comment at caret'}</span>
    </button>
    {(resolved || !attached) && <div className="thread-states">{resolved && <span><Check size={12} />Resolved</span>}{!attached && <span>Detached from text</span>}</div>}
    {messages.map((message, index) => {
      const author = userOf(state, message.authorId)
      const items = messageOptions(message)
      return <div key={message.id} className={index ? 'comment-message comment-reply' : 'comment-message'}>
        <div className="comment-meta"><Avatar user={author} small /><div><strong>{author?.name || 'Unknown author'}</strong>
          <small>{displayDate(message.createdAt)}{message.editedAt && ' · Edited'}</small></div>
          {items.length > 0 && <Menu label={index ? 'Reply options' : 'Thread options'} items={items} />}
        </div>
        {writable && composing === message.id ? <Composer label="Edit comment" people={people} initial={message.body} postLabel="Save"
          onCancel={cancel} onPost={(text) => save('edit', { text, messageId: message.id })} /> : <p>{message.body}</p>}
      </div>
    })}
    {!messages.length && <p className="muted">This thread has no visible messages.</p>}
    {selected && writable && !resolved && (composing === 'reply' ?
      <Composer label="Type a reply" people={people} onCancel={cancel} onPost={(text) => save('reply', { text })} /> :
      !composing && <button className="button reply-button" type="button" onClick={() => setComposing('reply')}>Reply</button>)}
  </article>
}

export function Comments({ state, body, threads, people, draft, selectedId, writable, onNew, onClose, onSelect, onPost, onCancel, onUpdate }) {
  const [view, setView] = useState('contextual')
  const visible = threads.filter((thread) => view === 'list' || thread.status !== 'resolved')
  return <aside className="collaboration" aria-label="Comments">
    <div className="panel-heading"><h2>Comments</h2><button aria-label="Close comments" className="icon-button" onClick={onClose}><X size={18} /></button></div>
    <div className="panel-tabs" aria-label="Comment view">
      <button className="button ghost" type="button" aria-pressed={view === 'contextual'} onClick={() => setView('contextual')}>Contextual</button>
      <button className="button ghost" type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List view</button>
      {writable && <button className="button new-comment" type="button" onClick={onNew} disabled={Boolean(draft)} aria-label="New Comment"><MessageSquarePlus size={15} />New</button>}
    </div>
    <div className="comment-cards">
      {draft && <article className="comment-card comment-selected">
        <div className="comment-meta"><Avatar user={userOf(state, state.currentUserId)} small /><strong>New comment</strong></div>
        {draft.quote && <p className="draft-quote">“{draft.quote}”</p>}
        <Composer label="Write a comment" people={people} onCancel={onCancel} onPost={onPost} />
      </article>}
      {visible.map((thread) => <CommentCard key={thread.id} thread={thread} state={state} people={people}
        selected={thread.id === selectedId} writable={writable} attached={!thread.anchor?.detached && inBounds(body, thread.anchor)}
        onSelect={onSelect} onUpdate={onUpdate} />)}
      {!visible.length && !draft && <div className="panel-empty"><MessageSquare size={25} strokeWidth={1.5} /><p>{view === 'contextual' ? 'No active comments' : 'No comments yet'}</p></div>}
    </div>
  </aside>
}
