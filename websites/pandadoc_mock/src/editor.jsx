import { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { createDocument, currencyOf, documentById, id, saveDraft, savePricing, sendDocument, sendError } from './model.js'
import { items } from './pricing.js'
import { ContactDialog } from './library.jsx'
import { PricingDialog, PricingDisplay } from './pricing-ui.jsx'
import { Dialog, Empty, LocalLink, Notice, PageHead, Search, Status, capitalize, includesText, initials, money, nameOf, shortDate, signingPath, titleOf, useLocalNavigate } from './ui.jsx'

export function NewDocument() {
  const { state, commit } = useWorkspace()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const templates = items(state.templates)
  const initialTemplate = templates.find(template => template.id === params.get('template'))
  const [data, setData] = useState({ title: initialTemplate?.name || '', company: '', templateId: initialTemplate?.id || '' })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const update = changes => setData(current => ({ ...current, ...changes }))

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    const documentId = id('doc')
    try {
      await commit(current => createDocument(current, { ...data, documentId }))
      navigate('/documents/' + documentId)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  return <main className="page narrow">
    <LocalLink className="back-link" to="/documents">← Documents</LocalLink>
    <PageHead title="New document">Set up a proposal for your client.</PageHead>
    <form className="surface form-panel stacked" onSubmit={submit}>
      {params.get('template') && !initialTemplate && <Notice message="This template is unavailable. You can still start a blank proposal." />}
      <label>Start from<select value={data.templateId} onChange={event => {
        const templateId = event.target.value
        const template = templates.find(entry => entry.id === templateId)
        update({ templateId, title: data.title || template?.name || '' })
      }}>
        <option value="">Blank proposal</option>
        {templates.map(template => <option key={template.id} value={template.id}>{nameOf(template, 'Untitled template')}</option>)}
      </select></label>
      <label>Proposal title<input required value={data.title} onChange={event => update({ title: event.target.value })} /></label>
      <label>Client company<input value={data.company} onChange={event => update({ company: event.target.value })} /></label>
      <Notice error={error} />
      <div className="actions end"><LocalLink to="/documents" className="button">Cancel</LocalLink>
        <button className="primary" disabled={pending}>Create proposal</button></div>
    </form>
  </main>
}

function RecipientList({ recipients, document, editable, onRemove, onMove, sequential }) {
  return recipients.length ? <ul className="recipient-list">
    {recipients.map((recipient, index) => <li key={recipient.id}>
      <div className="person">
        <span className="avatar">{initials(recipient.name)}</span>
        <div><strong>{nameOf(recipient, 'Unnamed recipient')}</strong><small className="table-note">{recipient.email || 'Email unavailable'}</small>
          <small className="table-note">{recipient.role === 'cc' ? 'CC' : 'Signer'}
            {sequential && recipient.role === 'signer' ? ' · ' + recipients.slice(0, index + 1).filter(person => person.role === 'signer').length : ''}
            {!editable && recipient.status ? ' · ' + capitalize(recipient.status) : ''}
          </small></div>
      </div>
      {editable ? <div className="actions recipient-actions">
        {sequential && recipient.role === 'signer' && index > 0 && <button type="button" onClick={() => onMove(index)}
          aria-label={'Move ' + nameOf(recipient) + ' earlier'}>↑</button>}
        <button type="button" onClick={() => onRemove(recipient.id)} aria-label={'Remove ' + nameOf(recipient)}>Remove</button>
      </div> : document && ['sent', 'viewed', 'completed'].includes(document.status) &&
        <LocalLink to={signingPath(document, recipient)} aria-label={'Open recipient link for ' + nameOf(recipient)}>Open recipient link ↗</LocalLink>}
    </li>)}
  </ul> : <p className="muted">No recipients added.</p>
}

function RecipientsPanel({ document, contacts, draft, onChange, onSave, pending, editable, dirty }) {
  const [query, setQuery] = useState('')
  const [contactId, setContactId] = useState('')
  const [role, setRole] = useState('signer')
  const [newContact, setNewContact] = useState(false)
  const [error, setError] = useState('')
  const recipients = editable ? draft.recipients : items(document.recipients)
  const sequential = editable ? draft.signingOrderEnabled : document.signingOrderEnabled
  const matching = contacts.filter(contact => contact.id === contactId
    || includesText(query, contact.name, contact.email, contact.company))
  const choices = matching.slice(0, 40)
  const selected = contacts.find(contact => contact.id === contactId)
  if (selected && !choices.includes(selected)) choices.push(selected)

  function change(changes) {
    setError('')
    onChange(changes)
  }
  function add() {
    if (!selected) return setError('Choose a contact to add.')
    if (recipients.some(recipient => recipient.contactId === selected.id
      || (selected.email && recipient.email?.toLowerCase() === selected.email.toLowerCase()))) {
      return setError('This contact is already a recipient.')
    }
    change({ recipients: [...recipients, {
      id: id('rcp'), contactId: selected.id, name: selected.name || '', email: selected.email || '', role, status: 'pending',
    }] })
    setContactId('')
  }

  function move(index) {
    const result = [...recipients]
    const [recipient] = result.splice(index, 1)
    result.splice(index - 1, 0, recipient)
    change({ recipients: result })
  }

  return <section className="surface inspector-panel" aria-labelledby="recipients-title">
    <h2 id="recipients-title">Recipients</h2>
    <RecipientList document={document} recipients={recipients} sequential={sequential} editable={editable} onMove={move}
      onRemove={key => change({ recipients: recipients.filter(recipient => recipient.id !== key) })} />
    {editable && <div className="stacked">
      <Search label="Find a contact" placeholder="Find a contact" value={query} onChange={setQuery} />
      <label>Contact<select value={contactId} onChange={event => setContactId(event.target.value)}>
        <option value="">Choose a contact</option>
        {choices.map(contact => <option value={contact.id} key={contact.id}>{nameOf(contact, 'Unnamed contact')}{contact.company ? ' · ' + contact.company : ''}</option>)}
      </select></label>
      {matching.length > 40 && <small className="muted">Refine the search to find more contacts.</small>}
      <label>Role<select value={role} onChange={event => setRole(event.target.value)}><option value="signer">Signer</option><option value="cc">CC</option></select></label>
      <button type="button" onClick={add}>Add recipient</button>
      <button type="button" className="quiet" onClick={() => setNewContact(true)}>New contact</button>
      <label className="check"><input type="checkbox" checked={sequential} onChange={event => change({ signingOrderEnabled: event.target.checked })} />Set signing order</label>
      <Notice error={error} />
      <button type="button" disabled={pending || !dirty} onClick={onSave}>Save recipients</button>
      {newContact && <ContactDialog onClose={() => setNewContact(false)} onCreated={key => {
        setNewContact(false); setQuery(''); setContactId(key)
      }} />}
    </div>}
  </section>
}

function FieldsPanel({ draft, document, editable, pending, onChange, onSave, dirty }) {
  const fields = editable ? draft.fields : items(document.fields)
  const recipients = editable ? draft.recipients : items(document.recipients)
  const sections = editable ? draft.sections : items(document.sections)
  const signers = recipients.filter(recipient => recipient.role === 'signer')
  function update(key, changes) {
    onChange({ fields: fields.map(field => field.id === key ? { ...field, ...changes } : field) })
  }
  return <section className="surface inspector-panel" aria-labelledby="fields-title">
    <h2 id="fields-title">Fields</h2>
    {fields.length === 0 && <p className="muted">No signature fields added.</p>}
    {fields.map((field, index) => editable ? <fieldset className="field-card stacked" key={field.id}>
      <legend>Signature {index + 1}</legend>
      <label>Label<input value={field.label || ''} onChange={event => update(field.id, { label: event.target.value })} /></label>
      <label>Assigned signer<select value={signers.some(person => person.id === field.recipientId) ? field.recipientId : ''}
        onChange={event => update(field.id, { recipientId: event.target.value })}>
        <option value="">Choose a signer</option>{signers.map(person => <option key={person.id} value={person.id}>{nameOf(person, 'Unnamed signer')}</option>)}
      </select></label>
      <label>Section<select value={sections.some(section => section.id === field.sectionId) ? field.sectionId : ''}
        onChange={event => update(field.id, { sectionId: event.target.value })}>
        <option value="">Choose a section</option>{sections.map(section => <option key={section.id} value={section.id}>{section.heading || 'Untitled section'}</option>)}
      </select></label>
      <label className="check"><input type="checkbox" checked={!!field.required}
        onChange={event => update(field.id, { required: event.target.checked })} />Required</label>
      <button type="button" onClick={() => onChange({ fields: fields.filter(entry => entry.id !== field.id) })}>Remove field</button>
    </fieldset> : <p key={field.id}><strong>{field.label || 'Signature'}</strong>
      <small className="table-note">{nameOf(recipients.find(person => person.id === field.recipientId), 'Unassigned')}</small></p>)}
    {editable && <div className="stacked">
      <button type="button" onClick={() => onChange({ fields: [...fields, {
        id: id('fld'), type: 'signature', label: 'Signature', sectionId: sections[0]?.id || '',
        recipientId: signers[0]?.id || '', required: true,
      }] })}>Add signature field</button>
      <button type="button" disabled={pending || !dirty} onClick={onSave}>Save fields</button>
    </div>}
  </section>
}

const draftFrom = document => ({
  title: titleOf(document), company: document.company || '', sections: items(document.sections),
  recipients: items(document.recipients), fields: items(document.fields), signingOrderEnabled: !!document.signingOrderEnabled,
})
const areaKeys = { content: ['title', 'company', 'sections'], recipients: ['recipients', 'signingOrderEnabled'], fields: ['fields'] }
const sectionAnchor = sectionId => 'section-' + sectionId

export function EditorRoute() {
  const { documentId } = useParams()
  const { state } = useWorkspace()
  const document = documentById(state, documentId)
  if (!document) return <main className="page"><Empty title="Proposal unavailable"><LocalLink to="/documents">Browse documents</LocalLink></Empty></main>
  return <Editor key={documentId} document={document} />
}

function Editor({ document }) {
  const { state, commit } = useWorkspace()
  const navigate = useLocalNavigate()
  const [draft, setDraft] = useState(() => draftFrom(document))
  const baseline = useRef(document)
  const [dialog, setDialog] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const editable = document.status === 'draft'
  const currency = currencyOf(document, state.workspace)
  const persisted = draftFrom(document)
  const dirtyAreas = Object.keys(areaKeys).filter(area =>
    areaKeys[area].some(key => JSON.stringify(draft[key]) !== JSON.stringify(persisted[key])))
  const shown = editable ? draft : persisted

  function change(changes) {
    setError('')
    setMessage('')
    setDraft(current => ({ ...current, ...changes }))
  }
  function changeSection(sectionId, changes) {
    change({ sections: draft.sections.map(section => section.id === sectionId ? { ...section, ...changes } : section) })
  }
  async function perform(mutate, success) {
    if (pending) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      const next = await commit(mutate)
      baseline.current = documentById(next, document.id)
      setMessage(success)
      return next
    } catch (failure) {
      setError(failure.message)
      throw failure
    } finally {
      setPending(false)
    }
  }
  async function save(areas) {
    try {
      const next = await perform(current => saveDraft(current, baseline.current, draft, areas), 'Draft saved.')
      if (!next) return
      const saved = draftFrom(documentById(next, document.id))
      const changes = Object.fromEntries(areas.flatMap(area => areaKeys[area]).map(key => [key, saved[key]]))
      setDraft(current => ({ ...current, ...changes }))
    } catch {
      // The editor notice shows the validation or synchronization error.
    }
  }
  async function duplicate() {
    const documentId = id('doc')
    try {
      await perform(current => createDocument(current, {
        documentId, sourceDocumentId: document.id, title: titleOf(document) + ' (copy)', company: document.company,
      }), 'Proposal duplicated.')
      navigate('/documents/' + documentId)
    } catch {
      // The editor notice retains the error.
    }
  }

  function review() {
    if (dirtyAreas.length) {
      setError('Save your draft changes before reviewing and sending.')
      return
    }
    setError('')
    setDialog({ type: 'send' })
  }

  return <main className="page editor-page">
    <LocalLink to="/documents" className="back-link">← Documents</LocalLink>
    <div className="editor-toolbar">
      <div className="toolbar-title"><h1>{shown.title}</h1><Status value={document.status} /></div>
      <div className="actions">
        <button type="button" onClick={duplicate} disabled={pending}>Duplicate</button>
        {editable && <>
          <button type="button" onClick={() => save(dirtyAreas.length ? dirtyAreas : ['content'])} disabled={pending}>Save draft</button>
          <button type="button" onClick={review} disabled={pending} className="primary">Review and send</button>
        </>}
      </div>
    </div>
    <Notice error={error} message={message} />
    <div className="editor-grid">
      <aside className="context-rail" aria-label="Document outline">
        <h2>Outline</h2>
        <nav aria-label="Proposal sections">{shown.sections.map(section =>
          <a key={section.id} href={'#' + sectionAnchor(section.id)}>{section.heading || 'Untitled section'}</a>,
        )}<a href="#pricing">Pricing</a></nav>
        <dl><div><dt>Proposal value</dt><dd>{money(document.value, currency)}</dd></div>
          <div><dt>Updated</dt><dd>{shortDate(document.updatedAt)}</dd></div></dl>
      </aside>
      <article className="paper">
        <header className="paper-title">
          <span>{state.workspace?.name || 'Workspace'}</span>
          {editable ? <div className="stacked">
            <label>Proposal title<input value={draft.title} onChange={event => change({ title: event.target.value })} /></label>
            <label>Client company<input value={draft.company} onChange={event => change({ company: event.target.value })} /></label>
          </div> : <><h2>{shown.title}</h2>{shown.company && <p>{shown.company}</p>}</>}
        </header>
        {shown.sections.map((section, index) => <section className="paper-section" key={section.id} id={sectionAnchor(section.id)}>
          {editable ? <div className="stacked">
            <label>Section heading<input value={section.heading || ''} onChange={event => changeSection(section.id, { heading: event.target.value })} /></label>
            <label>Section text<textarea rows={3} value={section.body || ''} onChange={event => changeSection(section.id, { body: event.target.value })} /></label>
            <button className="quiet self-start" type="button" aria-label={'Remove section ' + (index + 1)}
              onClick={() => change({ sections: draft.sections.filter(entry => entry.id !== section.id) })}>Remove section</button>
          </div> : <><h2>{section.heading || 'Untitled section'}</h2><p className="prose">{section.body || 'No section text.'}</p></>}
          {shown.fields.filter(field => field.sectionId === section.id).map(field => {
            const person = shown.recipients.find(recipient => recipient.id === field.recipientId)
            return <div className="signature-placeholder" key={field.id}><strong>{field.label || 'Signature'}</strong>
              <span>{nameOf(person, 'Unassigned')}{field.required ? ' · Required' : ' · Optional'}</span></div>
          })}
        </section>)}
        {editable && <button type="button" onClick={() => change({ sections: [...draft.sections, { id: id('sec'), heading: 'New section', body: '' }] })}>Add section</button>}
        <section className="paper-section" id="pricing">
          <div className="section-head"><h2>Pricing</h2>
            {editable && <button type="button" onClick={() => setDialog({ type: 'pricing' })}>Add pricing table</button>}</div>
          {!items(document.pricingTables).length && <p className="muted">No pricing tables yet.</p>}
          {items(document.pricingTables).map(table => <section className="quoted-table" key={table.id}>
            <div className="section-head"><h3>{nameOf(table, 'Pricing table')}</h3>
              {editable && <button type="button" aria-label={'Edit pricing table: ' + nameOf(table, 'Pricing table')}
                onClick={() => setDialog({ type: 'pricing', table })}>Edit table</button>}</div>
            <PricingDisplay table={table} currency={table.currency || currency} />
          </section>)}
        </section>
      </article>
      <aside className="inspector" aria-label="Document settings">
        <RecipientsPanel document={document} contacts={items(state.contacts)} draft={draft} editable={editable} pending={pending} onChange={change}
          dirty={dirtyAreas.includes('recipients')} onSave={() => save(['recipients'])} />
        <FieldsPanel document={document} draft={draft} editable={editable} pending={pending} onChange={change}
          dirty={dirtyAreas.includes('fields')} onSave={() => save(['fields'])} />
      </aside>
    </div>
    {dialog?.type === 'pricing' && <PricingDialog table={dialog.table} currency={currency} catalog={state.catalogItems} onClose={() => setDialog(null)}
      onSave={table => perform(current => savePricing(current, baseline.current, table), 'Pricing table saved.')}
      onRemove={table => perform(current => savePricing(current, baseline.current, table, true), 'Pricing table removed.')} />}
    {dialog?.type === 'send' && <SendDialog document={document} currency={currency} onClose={() => setDialog(null)}
      onSend={(subject, message) => perform(current => sendDocument(current, baseline.current, subject, message), 'Proposal sent. Recipient links are ready.')} />}
  </main>
}

function SendDialog({ document, currency, onClose, onSend }) {
  const [subject, setSubject] = useState(titleOf(document))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const validation = sendError(document)

  async function submit(event) {
    event.preventDefault()
    if (pending || validation) return
    setPending(true)
    try {
      await onSend(subject, message)
      onClose()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }
  return <Dialog title="Review and send" onClose={pending ? () => {} : onClose}>
    <form className="stacked" onSubmit={submit}>
      <div className="send-summary"><strong>{titleOf(document)}</strong><span>{money(document.value, currency)}</span></div>
      <RecipientList recipients={items(document.recipients)} sequential={document.signingOrderEnabled} />
      <Notice error={error || validation} message="Signature fields are ready. Sending creates local recipient links." />
      <label>Subject<input value={subject} onChange={event => setSubject(event.target.value)} /></label>
      <label>Message<textarea rows={3} value={message} onChange={event => setMessage(event.target.value)} /></label>
      <div className="actions end"><button type="button" onClick={onClose} disabled={pending}>Cancel</button>
        <button className="primary" disabled={pending || !!validation}>Send proposal</button></div>
    </form>
  </Dialog>
}
