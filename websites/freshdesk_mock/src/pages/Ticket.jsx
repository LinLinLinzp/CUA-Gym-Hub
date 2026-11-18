import { useRef, useState } from 'react'
import { ArrowLeft, Clock3, FileText, LockKeyhole, MessageSquare, Send } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppLink, Dialog, Empty, Field, PageHeading, Pill, SearchBox, Select, useAppNavigate } from '../components.jsx'
import { createTicket, editTickets, overrideDue, sendMessage } from '../data/actions.js'
import {
  agentName, dateLabel, dateValue, eligibleAgents, find, initials, isDone, label, overdue,
  personalize, PROPERTY_OPTIONS, records, responseMatches, STATUSES, text, ticketNumber, uid, visibleResponse,
} from '../data/model.js'
import { useAccount } from '../store.jsx'

const baseProperties = { status: 'open', priority: 'medium', type: 'question', source: 'email', groupId: null, assigneeId: null }

function Properties({ values, onChange }) {
  const { state } = useAccount()
  return <>
    {Object.entries(PROPERTY_OPTIONS).map(([key, options]) => <Field label={label(key)} key={key}>
      <Select options={options} empty={values[key] ? undefined : 'Unavailable'} value={values[key]}
        onChange={event => onChange({ ...values, [key]: event.target.value || null })} />
    </Field>)}
    <Field label="Group"><Select options={records(state.groups)} empty="No group" value={values.groupId} onChange={event => {
      const groupId = event.target.value || null
      const eligible = eligibleAgents(state, groupId).some(agent => agent.id === values.assigneeId)
      onChange({ ...values, groupId, assigneeId: eligible ? values.assigneeId : null })
    }} /></Field>
    <Field label="Assignee"><Select options={eligibleAgents(state, values.groupId)} empty="Unassigned" value={values.assigneeId}
      onChange={event => onChange({ ...values, assigneeId: event.target.value || null })} /></Field>
  </>
}

export function NewTicket() {
  const { state, commit } = useAccount()
  const navigate = useAppNavigate()
  const [props, setProps] = useState(baseProperties)
  const [query, setQuery] = useState('')
  const [contactId, setContactId] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const contacts = records(state.contacts).filter(contact => contact.id === contactId ||
    [contact.name, contact.email].some(value => text(value).includes(text(query).trim())))

  function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const subject = String(fields.get('subject')).trim()
    const description = String(fields.get('description')).trim()
    const requester = adding ? {
      name: String(fields.get('requesterName')).trim(),
      email: String(fields.get('requesterEmail')).trim(),
    } : { id: contactId }
    if (!subject || !description) return setError('Enter a subject and description.')
    if (adding && (!requester.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester.email))) return setError('Enter a requester name and valid email address.')
    if (!adding && !requester.id) return setError('Choose a requester or add a new contact.')
    const id = uid('tkt')
    if (commit(current => createTicket(current, id, { ...props, subject, description }, requester))) {
      navigate(`/tickets/${id}`)
    } else setError('The requester is unavailable. Choose another contact.')
  }

  return <>
    <AppLink to="/tickets" className="back-link"><ArrowLeft size={16} /> Tickets</AppLink>
    <PageHeading title="New ticket" description="Record a request and route it to the team that can help." />
    <form className="detail-grid" onSubmit={submit} noValidate>
      <section className="panel padded form-stack">
        <h2>Request details</h2>
        <fieldset>
          <legend>Requester</legend>
          <div className="segments">
            <button type="button" aria-pressed={!adding} onClick={() => setAdding(false)}>Existing contact</button>
            <button type="button" aria-pressed={adding} onClick={() => setAdding(true)}>New contact</button>
          </div>
          {adding ? <div className="form-grid">
            <Field label="Requester name"><input name="requesterName" required /></Field>
            <Field label="Requester email"><input name="requesterEmail" type="email" required /></Field>
          </div> : <div className="form-stack">
            <SearchBox name="Find requester" value={query} onChange={setQuery} placeholder="Find by name or email" />
            <Field label="Select requester"><Select options={contacts.map(contact => ({
              id: contact.id, name: [contact.name, contact.email].filter(Boolean).join(' · ') || 'Unnamed contact',
            }))} empty={contacts.length ? 'Choose a requester' : 'No contacts found'} value={contactId}
              onChange={event => setContactId(event.target.value)} required /></Field>
          </div>}
        </fieldset>
        <Field label="Subject"><input name="subject" required /></Field>
        <Field label="Description"><textarea name="description" required rows={7} /></Field>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions"><AppLink to="/tickets" className="button">Cancel</AppLink><button className="button primary">Create ticket</button></div>
      </section>
      <section className="panel padded form-stack"><h2>Ticket properties</h2><Properties values={props} onChange={setProps} /></section>
    </form>
  </>
}

function PropertyPanel({ ticket }) {
  const { commit } = useAccount()
  const [draft, setDraft] = useState(null)
  const [notice, setNotice] = useState('')
  const values = draft ?? ticket
  const change = fields => {
    const saved = commit(current => editTickets(current, new Set([ticket.id]), fields))
    setDraft(null)
    setNotice(saved ? 'Ticket properties saved.' : 'No property changes to save.')
  }
  return <section className="panel padded form-stack">
    <h2>Properties</h2>
    <form className="form-stack" onSubmit={event => {
      event.preventDefault()
      const fields = Object.fromEntries([...Object.keys(baseProperties), 'tags']
        .filter(key => values[key] !== ticket[key]).map(key => [key, values[key]]))
      change(fields)
    }}>
      <Properties values={values} onChange={setDraft} />
      <Field label="Tags"><input placeholder="Separate tags with commas"
        value={values.tagText ?? (Array.isArray(values.tags) ? values.tags.join(', ') : '')}
        onChange={event => setDraft({ ...values, tagText: event.target.value,
          tags: [...new Set(event.target.value.split(',').map(tag => tag.trim()).filter(Boolean))] })} /></Field>
      <button type="submit" className="button primary">Save properties</button>
    </form>
    <div className="transition-actions">
      {ticket.status !== 'resolved' && ticket.status !== 'closed' && <button className="button" onClick={() => change({ status: 'resolved' })}>Resolve</button>}
      {ticket.status !== 'closed' && <button className="button" onClick={() => change({ status: 'closed' })}>Close ticket</button>}
      {isDone(ticket) && <button className="button" onClick={() => change({ status: 'open' })}>Reopen</button>}
    </div>
    {notice && <p role="status" className="notice">{notice}</p>}
  </section>
}

const inputDate = value => Number.isFinite(dateValue(value)) ? new Date(value).toISOString().slice(0, 16) : ''
function TicketSla({ ticket }) {
  const { state, commit } = useAccount()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const policy = find(state.slaPolicies, ticket.slaPolicyId)
  const deadlines = [
    ['First response', ticket.firstResponseDueAt, Boolean(ticket.firstRespondedAt)],
    ...(ticket.nextResponseDueAt ? [['Next response', ticket.nextResponseDueAt, false]] : []),
    ['Resolution', ticket.resolutionDueAt, isDone(ticket)],
  ]
  function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const dates = {}
    for (const [field, old] of [['firstResponse', ticket.firstResponseDueAt], ['resolution', ticket.resolutionDueAt]]) {
      const value = fields.get(field)
      if (value === inputDate(old)) continue
      const parsed = dateValue(value ? `${value}Z` : '')
      if (!Number.isFinite(parsed)) return setError('Enter a valid UTC deadline in each changed field.')
      dates[field] = new Date(parsed).toISOString()
    }
    const saved = commit(current => overrideDue(current, ticket.id, dates))
    setEditing(false)
    setError('')
    setNotice(saved ? 'SLA deadlines saved.' : 'No deadline changes to save.')
  }
  return <section className="panel padded form-stack sla-panel">
    <h2><Clock3 size={19} /> SLA deadlines</h2>
    <p className="policy-name">{policy?.name || (ticket.slaPolicyId ? 'Unavailable policy' : 'No policy applied')}</p>
    <dl className="deadline-list">{deadlines.map(([name, time, done]) => <div key={name}>
      <dt>{name} due</dt><dd className={!done && overdue(time) ? 'late' : ''}>{dateLabel(time)}</dd>
      {done ? <dd><span className="pill pill-resolved">Completed</span></dd> :
        overdue(time) && <dd><span className="pill pill-urgent">Overdue</span></dd>}
    </div>)}</dl>
    <button className="button" onClick={() => { setError(''); setEditing(true) }}>Edit due dates</button>
    {notice && <p className="notice" role="status">{notice}</p>}
    {editing && <Dialog title="Edit SLA due dates" onClose={() => setEditing(false)}>
      <form className="form-stack" onSubmit={submit}>
        <Field label="First response due (UTC)"><input type="datetime-local" name="firstResponse" defaultValue={inputDate(ticket.firstResponseDueAt)} /></Field>
        <Field label="Resolution due (UTC)"><input type="datetime-local" name="resolution" defaultValue={inputDate(ticket.resolutionDueAt)} /></Field>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button" onClick={() => setEditing(false)}>Cancel</button>
          <button type="submit" className="button primary">Save due dates</button></div>
      </form>
    </Dialog>}
  </section>
}

function CannedPicker({ ticket, requester, onClose, onInsert }) {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('')
  const [responseId, setResponseId] = useState(null)
  const responses = records(state.cannedResponses).filter(response => visibleResponse(state, response) &&
    (!folder || folder === response.folderId) && responseMatches(response, query))
  const response = find(responses, responseId)
  return <Dialog title="Insert canned response" onClose={onClose}>
    <div className="form-stack picker">
      <SearchBox name="Search canned responses" value={query} onChange={setQuery} placeholder="Search title, body, or short code" />
      <Field label="Folder"><Select options={records(state.cannedResponseFolders)} empty="All folders" value={folder} onChange={event => setFolder(event.target.value)} /></Field>
      {responses.length ? <div className="picker-results">{responses.map(item => <button key={item.id} type="button"
        aria-pressed={responseId === item.id} className="rail-item" onClick={() => setResponseId(item.id)}>
        <span>{item.title || 'Untitled response'}</span>{item.shortCode && <small>{item.shortCode}</small>}
      </button>)}</div> : <Empty title="No matching responses" />}
      {response && <div className="preview"><h3>Preview</h3><p className="message-body">{personalize(response.body, ticket, requester)}</p></div>}
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button>
        <button type="button" className="button primary" disabled={!response}
          onClick={() => onInsert(response.id, personalize(response.body, ticket, requester))}>Insert response</button></div>
    </div>
  </Dialog>
}

function Composer({ ticket, requester }) {
  const { commit } = useAccount()
  const [kind, setKind] = useState('reply')
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [status, setStatus] = useState('')
  const [ids, setIds] = useState([])
  const [picker, setPicker] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editor = useRef(null)
  const replyMode = kind === 'reply'
  function insert(id, body) {
    setReply(previous => previous ? `${previous}\n\n${body}` : body)
    setIds(previous => [...new Set([...previous, id])])
    setPicker(false)
    requestAnimationFrame(() => editor.current?.focus())
  }
  function submit(event) {
    event.preventDefault()
    const body = replyMode ? reply : note
    if (!body.trim()) return setError(`Enter ${replyMode ? 'a reply' : 'a note'} before submitting.`)
    const saved = commit(current => sendMessage(current, ticket.id, { kind, body, visibility, status, cannedResponseIds: ids }))
    if (!saved) return setError('The message could not be saved.')
    if (replyMode) { setReply(''); setIds([]) } else { setNote(''); setVisibility('private') }
    setStatus('')
    setError('')
    setNotice(replyMode ? 'Reply sent.' : 'Note added.')
  }
  return <section className="panel padded form-stack">
    <h2>Respond</h2>
    <div className="segments">
      <button type="button" aria-pressed={replyMode} onClick={() => { setKind('reply'); setError(''); setNotice('') }}><MessageSquare size={16} /> Reply</button>
      <button type="button" aria-pressed={!replyMode} onClick={() => { setKind('note'); setError(''); setNotice('') }}><FileText size={16} /> Add note</button>
    </div>
    <form className="form-stack" onSubmit={submit}>
      <Field label={replyMode ? 'Reply message' : 'Note content'}><textarea ref={editor} rows={5}
        value={replyMode ? reply : note} onChange={event => {
          if (replyMode) {
            setReply(event.target.value)
            if (!event.target.value.trim()) setIds([])
          } else setNote(event.target.value)
        }} /></Field>
      <div className="composer-tools">
        {replyMode ? <button type="button" className="button" onClick={() => setPicker(true)}><FileText size={16} /> Canned responses</button> :
          <Field label="Note visibility"><Select options={['private', 'public']} value={visibility} onChange={event => setVisibility(event.target.value)} /></Field>}
        <Field label="Status after submit"><Select options={STATUSES} empty="Keep current status" value={status}
          onChange={event => setStatus(event.target.value)} /></Field>
      </div>
      {error && <p role="alert" className="error-message">{error}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      <div className="form-actions"><button className="button primary"><Send size={16} /> {replyMode ? 'Send reply' : 'Save note'}</button></div>
    </form>
    {picker && <CannedPicker ticket={ticket} requester={requester} onClose={() => setPicker(false)} onInsert={insert} />}
  </section>
}

function Message({ name, role, date, body, privateNote = false }) {
  return <article className={`message ${privateNote ? 'private-note' : ''}`}>
    <span className="avatar" aria-hidden="true">{initials(name)}</span><div>
      <div className="message-author"><strong>{name}</strong><span className="muted">{role}</span>
        {privateNote && <LockKeyhole size={14} aria-hidden="true" />}</div>
      <div className="metadata">{dateLabel(date)}</div>
      <p className="message-body">{body || 'No message text.'}</p>
    </div>
  </article>
}

export function TicketDetail() {
  const { ticketId } = useParams()
  const { state } = useAccount()
  const ticket = find(state.tickets, ticketId)
  if (!ticket) return <section className="panel empty"><h1>Ticket unavailable</h1>
    <p>This ticket could not be found in the account.</p><AppLink to="/tickets" className="button">Back to tickets</AppLink></section>
  const requester = find(state.contacts, ticket.requesterId)
  const messages = records(state.ticketConversations).filter(message => message.ticketId === ticket.id)
    .sort((a, b) => (dateValue(a.createdAt) || 0) - (dateValue(b.createdAt) || 0))
  return <div key={ticket.id}>
    <AppLink to="/tickets" className="back-link"><ArrowLeft size={16} /> Tickets</AppLink>
    <PageHeading title={ticket.subject || 'Untitled ticket'} eyebrow={`Ticket #${ticketNumber(ticket)}`}
      description={[requester?.name || 'Unknown requester', requester?.email].filter(Boolean).join(' · ')}>
      <div className="ticket-pills"><Pill value={ticket.status} /><Pill value={ticket.priority} /></div>
    </PageHeading>
    <div className="detail-grid">
      <div className="stack">
        <section className="panel conversation"><div className="section-heading"><h2>Conversation</h2><span className="muted">{messages.length + 1} entries</span></div>
          <Message name={requester?.name || 'Unknown requester'} role="Original request" date={ticket.createdAt} body={ticket.description} />
          {messages.map(message => <Message key={message.id}
            name={message.kind === 'customer_reply' ? find(state.contacts, message.authorId)?.name || 'Unknown requester' : agentName(state, message.authorId)}
            role={message.kind === 'note' ? (message.visibility === 'private' ? 'Private note' : 'Public note') :
              message.kind === 'customer_reply' ? 'Customer reply' : 'Public reply'}
            date={message.createdAt} body={message.body} privateNote={message.visibility === 'private'} />)}
        </section>
        <Composer ticket={ticket} requester={requester} />
      </div>
      <aside className="stack detail-rail"><PropertyPanel ticket={ticket} /><TicketSla ticket={ticket} /></aside>
    </div>
  </div>
}
