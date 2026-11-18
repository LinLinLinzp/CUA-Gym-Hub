import { useState } from 'react'
import { byTime, find, matches, pageName, personName, records, relativeDate } from './data/model.js'
import { useWorkspace } from './store.jsx'
import { Avatar } from './ui.jsx'

function pointStyle(x, y) {
  const percent = (value) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5) * 100 + '%'
  return { left: percent(x), top: percent(y) }
}

export function CommentPins({ threads, all, current, anchor, openThread }) {
  const numbers = new Map(all.map((item, index) => [item.id, index + 1]))
  return <>
    {threads.map((thread) => <button type="button" className={'pin' + (thread.status === 'resolved' ? ' resolved' : '')}
      key={thread.id} aria-label={'Comment ' + numbers.get(thread.id) + ': ' + (thread.body || 'Feedback')}
      aria-pressed={thread.id === current} style={pointStyle(thread.x, thread.y)}
      onClick={(event) => { event.stopPropagation(); openThread(thread) }}>{numbers.get(thread.id)}</button>)}
    {anchor && <span className="pin draft-pin" style={pointStyle(anchor.x, anchor.y)} aria-label="New comment anchor">+</span>}
  </>
}

export function CommentDock({ threads, current, page, anchor, placing, start, cancel, save, showResolved, toggleResolved, openThread, closeThread, perform }) {
  const { state } = useWorkspace()
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const ids = new Set(threads.map((thread) => thread.id))
  const relevantReplies = records(state, 'commentReplies').filter((item) => ids.has(item.threadId))
  const visible = threads.filter((thread) => (thread.status !== 'resolved' || showResolved || thread.id === current?.id) &&
    (matches(thread.body, query) || relevantReplies.some((reply) => reply.threadId === thread.id && matches(reply.body, query))))
    .sort((a, b) => byTime(b, a))
  const resolved = current?.status === 'resolved'

  return <div className="dock-content comment-dock">
    <div className="panel-actions"><button className="primary" type="button" onClick={start} disabled={!page || placing}>Add comment</button>
      <label className="check"><input type="checkbox" checked={showResolved} onChange={(event) => toggleResolved(event.target.checked)} />Show resolved</label></div>
    {placing && <p className="hint">Select a point or layer on the canvas.</p>}
    {anchor && <div className="comment-composer"><h3>New comment</h3><small>{pageName(page)}</small>
      <MessageForm autoFocus label="Comment" verb="Post comment" onSubmit={save} onCancel={cancel} /></div>}
    {current && !placing && !anchor && <section className="thread-detail" aria-label="Comment thread">
      <div className="panel-actions"><button type="button" className="text-button" onClick={closeThread}>← All comments</button>
        {resolved ? <button type="button" onClick={() => perform({ type: 'reopen', threadId: current.id }, 'Thread reopened')}>Reopen</button>
          : <button type="button" onClick={() => { if (perform({ type: 'resolve', threadId: current.id }, 'Thread resolved') && !showResolved) closeThread() }}>Resolve</button>}
      </div>
      <small>{pageName(find(state, 'pages', current.pageId))}{resolved && <span className="badge success">Resolved</span>}</small>
      <Message message={current} />
      <div className="replies">{relevantReplies.filter((item) => item.threadId === current.id).sort(byTime).map((item, index) => <Message key={item.id ?? index} message={item} />)}</div>
      {!resolved && <MessageForm key={current.id} label="Reply" verb="Post reply"
        onSubmit={(body) => perform({ type: 'reply', body, threadId: current.id }, 'Reply posted')} />}
    </section>}
    {!current && !anchor && <><label className="field">Search comments<input type="search" value={search}
      placeholder="Search comments and replies" onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="comment-list">
        {visible.map((thread) => <button type="button" key={thread.id} className="comment-entry" onClick={() => openThread(thread)}
          disabled={!find(state, 'pages', thread.pageId) || find(state, 'pages', thread.pageId)?.fileId !== thread.fileId}>
          <small>{pageName(find(state, 'pages', thread.pageId))}{thread.status === 'resolved' && ' · Resolved'}</small>
          <Message message={thread} />
        </button>)}
        {!visible.length && <p className="hint">{query ? 'No matching comments.' : 'No comments here yet. Add a comment to start a discussion.'}</p>}
      </div></>}
  </div>
}

function Message({ message }) {
  const { state } = useWorkspace()
  const person = find(state, 'users', message.createdById)
  return <div className="message">
    <Avatar name={person?.name} color={person?.avatarColor} />
    <div><b>{personName(state, message.createdById)}</b><small title={message.createdAt}>{relativeDate(message.createdAt)}</small>
      <p>{message.body || 'Feedback'}</p></div>
  </div>
}

function MessageForm({ label, verb, onSubmit, onCancel, autoFocus }) {
  const [body, setBody] = useState('')
  return <form className="message-form" onSubmit={(event) => {
    event.preventDefault()
    if (body.trim() && onSubmit(body) !== false) setBody('')
  }}>
    <label className="field">{label}<textarea rows={3} autoFocus={autoFocus} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your feedback…" /></label>
    {body && !body.trim() && <small className="destructive-text">Enter a nonblank message.</small>}
    <div className="form-footer">{onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      <button type="submit" className="primary" disabled={!body.trim()}>{verb}</button></div>
  </form>
}

