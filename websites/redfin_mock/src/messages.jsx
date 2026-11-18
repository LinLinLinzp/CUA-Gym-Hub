import React, { useMemo, useState } from 'react'
import { ArrowLeft, MessageSquare, Plus, Send } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { lookup, makeId, owned, replace, sortNewest, timeValue, unread, useReadThread, useStore } from './store'
import { dateTime, Empty, Field, homeAddress, initials, invalid, matching, Modal, PageTitle, SiteLink, useSiteNavigate } from './ui'

function sendRecord(thread, account, body, now) {
  return {
    id: makeId('message'), threadId: thread.id, senderId: account.id, recipientId: thread.agentId,
    body, status: 'sent', createdAt: now,
  }
}
const threadPath = id => '/messages/' + encodeURIComponent(id)

export function Compose({ homeId, agentId, onClose }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const [agent, setAgent] = useState(agentId || '')
  const [home, setHome] = useState(homeId || '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState({})

  function send(event) {
    event.preventDefault()
    const next = {}
    if (!lookup(state.agents, agent)) next.agent = 'Choose an agent.'
    if (!subject.trim()) next.subject = 'Enter a subject.'
    if (!body.trim()) next.body = 'Enter a message.'
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      event.currentTarget.querySelector('#compose-' + first)?.focus()
      return
    }
    const threadId = makeId('thread')
    const sent = commit((world, now) => {
      if (!lookup(world.agents, agent)) return world
      const thread = {
        id: threadId, actorId: world.account.id, agentId: agent,
        ...(home && lookup(world.homes, home) && { homeId: home }),
        subject: subject.trim(), createdAt: now, lastMessageAt: now, lastReadAt: now, readById: world.account.id,
      }
      return {
        ...world,
        messageThreads: [...world.messageThreads, thread],
        messages: [...world.messages, sendRecord(thread, world.account, body.trim(), now)],
      }
    }, 'Message sent.')
    if (sent) {
      onClose()
      navigate(threadPath(threadId))
    }
  }

  return <Modal title={homeId ? 'Ask an agent' : 'New message'} onClose={onClose}>
    <form noValidate onSubmit={send}>
      <div className="dialog-body form-fields">
        <Field label="Recipient" id="compose-agent" error={errors.agent}><select id="compose-agent" value={agent} onChange={e => setAgent(e.target.value)}
          required {...invalid('compose-agent', errors.agent)}>
          <option value="">Choose an agent</option>{state.agents.map(row => <option key={row.id} value={row.id}>{row.displayName || 'Redfin agent'}{row.market ? ' · ' + row.market : ''}</option>)}
        </select></Field>
        {state.homes.length > 0 && <Field label="Listing (optional)" id="compose-home"><select id="compose-home" value={home} onChange={e => setHome(e.target.value)}>
          <option value="">No listing</option>{state.homes.map(row => <option key={row.id} value={row.id}>{homeAddress(row)}</option>)}
        </select></Field>}
        <Field label="Subject" id="compose-subject" error={errors.subject}><input id="compose-subject" value={subject} maxLength={160} onChange={e => setSubject(e.target.value)}
          required {...invalid('compose-subject', errors.subject)} /></Field>
        <Field label="Message" id="compose-body" error={errors.body}><textarea id="compose-body" rows="5" value={body} onChange={e => setBody(e.target.value)}
          required {...invalid('compose-body', errors.body)} /></Field>
      </div>
      <div className="form-actions"><button className="secondary" type="button" onClick={onClose}>Close</button>
        <button className="primary" type="submit"><Send size={16} /> Send message</button></div>
    </form>
  </Modal>
}

function Thread({ thread, messages, agent, home, markRead }) {
  const { state, commit } = useStore()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const { account } = state
  const agentName = agent?.displayName || 'Redfin agent'
  const byTime = [...messages].sort((a, b) =>
    timeValue(a.createdAt) - timeValue(b.createdAt) || String(a.id).localeCompare(String(b.id)))

  function reply(event) {
    event.preventDefault()
    const message = body.trim()
    if (!message) {
      setError('Enter a message.')
      event.currentTarget.querySelector('textarea').focus()
      return
    }
    const sent = commit((world, now) => {
      const current = lookup(owned(world.messageThreads, account.id), thread.id)
      if (!current || !lookup(world.agents, current.agentId)) return world
      return {
        ...world,
        messages: [...world.messages, sendRecord(current, world.account, message, now)],
        messageThreads: replace(world.messageThreads, { ...current, lastMessageAt: now, lastReadAt: now, readById: account.id }),
      }
    }, 'Reply sent.')
    if (sent) {
      setBody('')
      setError('')
    } else setError('This agent is unavailable.')
  }

  return <section className="thread-panel" aria-label="Conversation">
    <div className="thread-header">
      <div className="thread-heading"><span className="avatar agent-avatar">{agent?.initials || initials(agentName)}</span><div>
        <h2>{thread.subject || 'Conversation'}</h2>
        <p>{agentName}{home && <> · <SiteLink to={'/homes/' + encodeURIComponent(home.id)}>{homeAddress(home)}</SiteLink></>}</p>
      </div></div>
      {markRead && <button className="secondary" onClick={markRead}>Mark as read</button>}
    </div>
    <div className="conversation-body" aria-label="Messages in this conversation">
      {byTime.length ? byTime.map(message => {
        const yours = message.senderId === account.id
        return <article key={message.id} className={'message ' + (yours ? 'message-yours' : 'message-agent')}>
          <div className="message-meta"><strong>{yours ? 'You' : agentName}</strong>
            {message.createdAt && <time dateTime={message.createdAt}>{dateTime(message.createdAt, account.timeZone, { hour: 'numeric', minute: '2-digit', year: 'numeric' })}</time>}</div>
          <p>{message.body || 'Message unavailable'}</p>
        </article>
      }) : <p className="muted">There are no messages in this conversation yet.</p>}
    </div>
    {agent ? <form className="reply-form" noValidate onSubmit={reply}>
      <Field label="Reply" id="reply-body" error={error}><textarea id="reply-body" rows="3" placeholder="Write a reply…" value={body}
        onChange={e => setBody(e.target.value)} {...invalid('reply-body', error)} required /></Field>
      <button type="submit" className="primary"><Send size={16} /> Send reply</button>
    </form> : <div className="reply-form muted">This agent is unavailable.</div>}
  </section>
}

export function Messages() {
  const { threadId } = useParams()
  const { state } = useStore()
  const readThread = useReadThread()
  const [search, setSearch] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [composing, setComposing] = useState(false)
  const { account, homes, agents } = state
  const threads = owned(state.messageThreads, account.id)
  const active = lookup(threads, threadId)
  const readMap = useMemo(() => new Set(threads.filter(row => unread(row, state)).map(row => row.id)), [state])
  const results = threads.filter(row => {
    const home = lookup(homes, row.homeId)
    return (!onlyUnread || readMap.has(row.id)) && matching(search, row.subject, lookup(agents, row.agentId)?.displayName, home?.address, home?.city, home?.neighborhood)
  }).sort(sortNewest('lastMessageAt'))

  return <>
    <PageTitle title="Messages" action={agents.length > 0 && <button className="primary" onClick={() => setComposing(true)}><Plus size={17} /> New message</button>}>
      Keep your conversations with agents in one place.
    </PageTitle>
    {threadId && <SiteLink className="back-link mobile-inbox-back" to="/messages"><ArrowLeft size={16} /> Back to Messages</SiteLink>}
    <div className={'inbox ' + (threadId ? 'inbox-thread-open' : '')}>
      <aside className="inbox-sidebar" aria-label="Conversation list">
        <div className="inbox-filters">
          <Field label="Search conversations" id="thread-search"><input type="search" id="thread-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Subject, agent, or property" /></Field>
          <label className="check"><input type="checkbox" checked={onlyUnread} onChange={e => setOnlyUnread(e.target.checked)} /> Unread only <span>{readMap.size}</span></label>
        </div>
        {results.length ? <ul className="thread-list">
          {results.map(row => {
            const agent = lookup(agents, row.agentId)
            return <li key={row.id}><SiteLink to={threadPath(row.id)} onClick={event => readThread(row.id, event)}
              aria-current={row.id === threadId ? 'page' : undefined}>
              <span className="avatar agent-avatar">{agent?.initials || initials(agent?.displayName || 'Redfin agent')}</span>
              <span className="thread-row-copy"><strong>{row.subject || 'Conversation'}</strong>
                <span>{agent?.displayName || 'Redfin agent'}</span>
                <span className="thread-row-date">{dateTime(row.lastMessageAt, account.timeZone)}{readMap.has(row.id) && <span className="unread-label">Unread</span>}</span></span>
            </SiteLink></li>
          })}
        </ul> : <div className="inbox-no-results">{threads.length ? 'No matching conversations.' : 'No conversations yet.'}</div>}
      </aside>
      {active ? <Thread key={active.id} thread={active} agent={lookup(agents, active.agentId)} home={lookup(homes, active.homeId)}
        messages={state.messages.filter(message => message.threadId === active.id)} markRead={readMap.has(active.id) ? () => readThread(active.id) : undefined} />
        : <div className="thread-placeholder">{threadId
          ? <Empty title="Conversation unavailable" action={<SiteLink className="secondary" to="/messages">Back to Messages</SiteLink>} />
          : <><MessageSquare size={32} aria-hidden="true" /><h2>{threads.length ? 'Select a conversation' : 'Start a conversation'}</h2>
            <p>{threads.length ? 'Choose a thread to see your messages and reply.' : 'Send a message to a Redfin agent when you have a question.'}</p></>}</div>}
    </div>
    {composing && <Compose onClose={() => setComposing(false)} />}
  </>
}
