import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar, BackLink, DateText, Empty, FieldError, Icon, Missing, Modal, PageHeader, Search } from '../ui.jsx'
import { SiteLink, alphabetical, byId, eligible, find, idFor, list, lower, recordPath, timestamp, upsert, useFilters, useSiteNavigate, useWorkspace } from '../workspace.jsx'

const defaults = { q: '' }
// Stable sort keeps messages in stored send order when the clock gives them the same time.
const conversationOrder = (left, right) => timestamp(left.createdAt) - timestamp(right.createdAt)

function sendMessages(state, { now, actor }, { selected, text, replyTo }) {
  const body = text.trim()
  if (!body) return { error: 'Enter a message.' }
  const recipientIds = [...new Set(selected)].filter(id => eligible(find(state.members, id)))
  if (!recipientIds.length) return { error: 'Select at least one eligible recipient.' }
  const batchId = recipientIds.length > 1 ? idFor('batch') : null
  let threads = list(state.threads)
  const sent = recipientIds.map(recipientId => {
    const thread = replyTo ? find(threads, replyTo) : threads.find(item => item.memberId === recipientId && (item.creatorId ?? actor) === actor)
    const record = {
      ...thread, id: thread?.id ?? idFor('thread'), memberId: recipientId, creatorId: thread?.creatorId ?? actor,
      createdAt: thread?.createdAt ?? now, unreadCount: thread?.unreadCount ?? 0, readAt: thread?.readAt ?? null,
      lastMessageAt: now, updatedAt: now, updatedBy: actor,
    }
    threads = upsert(threads, record)
    return {
      id: idFor('msg'), threadId: record.id, senderId: actor, recipientId, body, status: 'sent', createdAt: now, batchId,
    }
  })
  const next = { ...state, threads, messages: [...list(state.messages), ...sent] }
  if (batchId) next.messageBatches = [...list(state.messageBatches), {
    id: batchId, senderId: actor, body, recipientIds, threadIds: sent.map(message => message.threadId),
    messageIds: sent.map(message => message.id), recipientCount: sent.length, status: 'sent', createdAt: now,
  }]
  return { state: next, sent }
}

export function MessageComposer({ initialIds = [], onClose }) {
  const { state, commit, notify } = useWorkspace()
  const navigate = useSiteNavigate()
  const [selected, setSelected] = useState(initialIds)
  const [query, setQuery] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const members = list(state.members)
  const available = members.filter(eligible)
    .filter(member => lower(member.name).includes(lower(query).trim()) || lower(member.email).includes(lower(query).trim()))
    .sort((left, right) => alphabetical(left.name, right.name) || byId(left, right))
  const eligibleCount = selected.filter(id => eligible(find(members, id))).length

  function send(event) {
    event.preventDefault()
    const result = commit((latest, metadata) => sendMessages(latest, metadata, { selected, text: body }))
    if (result.error) return setError(result.error)
    const count = result.sent.length
    notify(`Message sent to ${count} ${count === 1 ? 'recipient' : 'recipients'}.`)
    onClose()
    navigate(count === 1 ? recordPath('messages', result.sent[0].threadId) : '/messages')
  }

  return <Modal title="New message" onClose={onClose} wide>
    <form onSubmit={send} noValidate>
      <fieldset className="recipient-picker">
        <legend>Recipients</legend>
        <p className="hint">{eligibleCount} of {selected.length} selected recipients eligible. Current and former paid members can receive messages.</p>
        <Search name="Find recipients" value={query} onChange={setQuery} placeholder="Search paid members" />
        <div className="check-list recipient-options">
          {available.map(member => <label key={member.id}>
            <input type="checkbox" checked={selected.includes(member.id)} onChange={event => {
              const checked = event.target.checked
              setSelected(previous => checked ? [...previous, member.id] : previous.filter(id => id !== member.id))
              setError('')
            }} />{member.name || 'Unnamed member'}{member.type === 'former_paid' && <small>Former paid</small>}
          </label>)}
          {!available.length && <p>No eligible members found.</p>}
        </div>
      </fieldset>
      <label className="field">Message<textarea rows={5} value={body} onChange={event => { setBody(event.target.value); setError('') }} /></label>
      <FieldError>{error}</FieldError>
      <div className="actions dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit" className="primary">Send message</button></div>
    </form>
  </Modal>
}

export function Messages() {
  const { threadId } = useParams()
  const { state } = useWorkspace()
  const [filters, update, clear] = useFilters(defaults)
  const [composing, setComposing] = useState(false)
  const query = lower(filters.q).trim()
  const threads = list(state.threads)
  const selectedThread = find(threads, threadId)
  const members = new Map(list(state.members).map(member => [member.id, member]))
  const conversation = new Map()
  for (const message of list(state.messages)) {
    if (!conversation.has(message.threadId)) conversation.set(message.threadId, [])
    conversation.get(message.threadId).push(message)
  }
  for (const group of conversation.values()) group.sort(conversationOrder)
  const visible = threads.filter(thread => lower(members.get(thread.memberId)?.name).includes(query) ||
    conversation.get(thread.id)?.some(message => lower(message.body).includes(query)))
    .sort((left, right) => timestamp(right.lastMessageAt) - timestamp(left.lastMessageAt) || byId(left, right))

  if (threadId && !selectedThread) return <Missing title="Conversation unavailable" section="messages" />

  return <>
    <PageHeader title="Messages" description="Private conversations with current and former paid members.">
      <button type="button" className="primary" onClick={() => setComposing(true)}><Icon name="plus" />New message</button>
    </PageHeader>
    <div className={`paper inbox${selectedThread ? ' has-thread' : ''}`}>
      <aside className="thread-rail" aria-label="Conversations">
        <div className="thread-search"><Search name="Search messages" value={filters.q} onChange={q => update({ q })} placeholder="Search conversations" />
          {filters.q && <button type="button" className="text-button" onClick={clear}>Clear filters</button>}</div>
        <div className="thread-list">
          {visible.map(thread => {
            const member = members.get(thread.memberId)
            const latest = conversation.get(thread.id)?.at(-1)
            const name = member?.name || 'Unavailable member'
            return <SiteLink key={thread.id} className={`thread-row${thread.id === threadId ? ' selected-thread' : ''}`}
              aria-current={thread.id === threadId ? 'page' : undefined}
              to={recordPath('messages', thread.id) + (filters.q ? `?q=${encodeURIComponent(filters.q)}` : '')}>
              <Avatar name={name} />
              <span className="thread-snippet"><strong>{name}</strong><span>{latest?.body || 'No messages yet'}</span></span>
              {Number(thread.unreadCount) > 0 && <span className="unread-count" aria-label={`${thread.unreadCount} unread`}>{thread.unreadCount}</span>}
            </SiteLink>
          })}
          {!visible.length && <Empty title="No conversations found">{filters.q ? 'Try a different search.' : 'Start a new message to open a conversation.'}</Empty>}
        </div>
      </aside>
      {selectedThread
        ? <Thread key={threadId} thread={selectedThread} member={members.get(selectedThread.memberId)} messages={conversation.get(threadId) ?? []} />
        : <section className="thread-pane thread-placeholder"><Empty title="Open a conversation">Select a conversation to read messages and reply.</Empty></section>}
    </div>
    {composing && <MessageComposer onClose={() => setComposing(false)} />}
  </>
}

function Thread({ thread, member, messages }) {
  const { state, commit, notify } = useWorkspace()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const unread = Number(thread.unreadCount) > 0
  const name = member?.name || 'Unavailable member'

  function changeRead() {
    const result = commit((latest, { now, actor }) => {
      const existing = find(latest.threads, thread.id)
      if (!existing) return { error: 'This conversation is unavailable.' }
      const markRead = Number(existing.unreadCount) > 0
      const record = { ...existing, unreadCount: markRead ? 0 : 1, readAt: markRead ? now : null, updatedAt: now, updatedBy: actor }
      return { state: { ...latest, threads: upsert(latest.threads, record) }, markRead }
    })
    if (result.error) return setError(result.error)
    notify(result.markRead ? 'Conversation marked as read.' : 'Conversation marked as unread.')
  }

  function reply(event) {
    event.preventDefault()
    const result = commit((latest, metadata) => {
      const existing = find(latest.threads, thread.id)
      if (!existing) return { error: 'This conversation is unavailable.' }
      return sendMessages(latest, metadata, { selected: [existing.memberId], text: body, replyTo: existing.id })
    })
    if (result.error) return setError(result.error)
    setBody('')
    setError('')
    notify('Reply sent.')
  }

  return <section className="thread-pane" aria-label={`Conversation with ${name}`}>
    <div className="mobile-back"><BackLink section="messages">Back to conversations</BackLink></div>
    <header className="thread-heading">
      <div className="thread-person"><Avatar name={name} /><div><h2>{name}</h2>{member?.email && <p>{member.email}</p>}</div></div>
      <button type="button" onClick={changeRead}>{unread ? 'Mark as read' : 'Mark as unread'}</button>
    </header>
    <ol className="transcript">
      {messages.map(message => {
        const outgoing = message.senderId === (thread.creatorId ?? state.creator?.id)
        const sender = outgoing ? state.creator?.name || 'Creator' : message.senderId === member?.id ? name : 'Unavailable sender'
        return <li key={message.id} className={outgoing ? 'outgoing' : 'incoming'}>
          <p className="message-byline"><strong>{sender}</strong> <DateText value={message.createdAt} withTime /></p>
          <p className="message-bubble prewrap">{message.body}</p>
        </li>
      })}
      {!messages.length && <li className="hint">No messages in this conversation yet.</li>}
    </ol>
    {eligible(member) ? <form className="reply-form" onSubmit={reply} noValidate>
      <label className="field">Reply<textarea rows={3} value={body} onChange={event => { setBody(event.target.value); setError('') }} /></label>
      <FieldError>{error}</FieldError><div className="actions"><button type="submit" className="primary">Send reply</button></div>
    </form> : <div className="reply-form"><p className="hint">This member is unavailable for replies.</p><FieldError>{error}</FieldError></div>}
  </section>
}
