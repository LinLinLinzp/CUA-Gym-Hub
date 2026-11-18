import { useId, useState } from 'react'
import { ArrowLeft, CheckCircle2, Globe2, Link2, Send, Settings2, Shield, Users, X } from 'lucide-react'
import { canEdit, emailKey, permissionLabels, rows, scopeLabels, userOf } from '../data/access.js'
import { changeAccess, copyLink, invitePeople, linkConfiguration, recipientIdentity } from '../data/sharing.js'
import { useWorkspace } from '../data/store.jsx'
import { withSid } from '../utils/dataManager.js'
import { ManageAccess } from './ManageAccess.jsx'
import { Avatar, Modal } from './ui.jsx'

const blankRecipients = { recipients: [], query: '', error: '' }

function makeRecipient(state, doc, draft, value) {
  const recipient = recipientIdentity(state, value)
  if (!recipient) return { error: 'Enter a valid email address or choose a person.' }
  const owner = userOf(state, doc.ownerId)
  if (recipient.email === emailKey(owner?.email) || recipient.userId === doc.ownerId) return { error: 'The owner already has access.' }
  if (draft.recipients.some(({ email }) => email === recipient.email)) return { error: 'This person is already on the list.' }
  return { recipient }
}

function completeRecipients(state, doc, draft) {
  if (draft.query.trim()) {
    const { error, recipient } = makeRecipient(state, doc, draft, draft.query)
    return error ? { error } : { recipients: [...draft.recipients, recipient] }
  }
  return draft.recipients.length ? { recipients: draft.recipients } : { error: 'Add at least one person.' }
}

function Recipients({ state, doc, draft, setDraft }) {
  const id = useId()
  const search = draft.query.trim().toLowerCase()
  const choices = search ? rows(state, 'users').filter((user) => user.id !== doc.ownerId && user.email &&
    !draft.recipients.some(({ email }) => email === emailKey(user.email)) &&
    [user.name, user.email].some((value) => value?.toLowerCase().includes(search))).slice(0, 6) : []
  function add(value) {
    const { recipient, error } = makeRecipient(state, doc, draft, value)
    setDraft(error ? { ...draft, error } : { recipients: [...draft.recipients, recipient], query: '', error: '' })
  }
  return <div className="recipient-picker">
    <label htmlFor={id}>Add people</label>
    <div className="recipient-input">
      {draft.recipients.map(({ email, userId }) => <span className="recipient-chip" key={email}>
        <span>{userOf(state, userId)?.name ?? email}</span>
        <button type="button" aria-label={`Remove ${email}`} onClick={() => setDraft({ ...draft, error: '', recipients: draft.recipients.filter((item) => item.email !== email) })}><X size={13} /></button>
      </span>)}
      <input id={id} type="text" value={draft.query} autoComplete="off" aria-invalid={Boolean(draft.error)}
        placeholder={draft.recipients.length ? 'Add another person' : 'Enter a name or email address'}
        onChange={(event) => setDraft({ ...draft, query: event.target.value, error: '' })}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ',') && draft.query.trim()) {
            event.preventDefault()
            const exactName = choices.find((user) => user.name?.toLowerCase() === search)
            add(exactName?.email || (choices.length === 1 && !search.includes('@') ? choices[0].email : draft.query))
          }
        }} />
    </div>
    {choices.length > 0 && <ul className="recipient-suggestions" aria-label="Suggested people">
      {choices.map((user) => <li key={user.id}><button type="button" onClick={() => add(user.email)}>
        <Avatar user={user} small /><span><strong>{user.name || user.email}</strong><small>{user.email}</small></span>
      </button></li>)}
    </ul>}
    {draft.error && <p className="error-message" role="alert">{draft.error}</p>}
  </div>
}

function Permission({ value, onChange, label = 'Permission' }) {
  return <label className="field-label">{label}
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(permissionLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </select>
  </label>
}

function LinkSettings({ state, doc, settings, onApply, onBack }) {
  const [scope, setScope] = useState(settings.scope)
  const [permission, setPermission] = useState(settings.permission)
  const [draft, setDraft] = useState({ ...blankRecipients, recipients: settings.recipientEmails.map((email) => recipientIdentity(state, email)).filter(Boolean) })
  const [error, setError] = useState('')
  const icons = { anyone: Globe2, organization: Users, existingAccess: Shield, specificPeople: Users }
  function apply(event) {
    event.preventDefault()
    let emails = []
    if (scope === 'specificPeople') {
      const result = completeRecipients(state, doc, draft)
      if (result.error) { setDraft({ ...draft, error: result.error }); return }
      emails = result.recipients.map(({ email }) => email)
    }
    const next = { scope, permission, recipientEmails: emails }
    const result = linkConfiguration(state, next)
    if (result.error) { setError(result.error); return }
    onApply(next)
  }
  return <form className="share-form" onSubmit={apply}>
    <fieldset className="scope-options">
      <legend>Who can use this link?</legend>
      {Object.entries(scopeLabels).map(([value, label]) => {
        const Icon = icons[value]
        return <label className="scope-option" key={value}>
          <input type="radio" name="scope" value={value} checked={scope === value} onChange={() => { setScope(value); setError('') }} />
          <Icon size={17} /><span>{label}</span>
        </label>
      })}
    </fieldset>
    {scope !== 'existingAccess' && <Permission value={permission} label="Link permission" onChange={setPermission} />}
    {scope === 'specificPeople' && <Recipients state={state} doc={doc} draft={draft} setDraft={setDraft} />}
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="share-primary-actions"><button className="button" type="button" onClick={onBack}>Cancel</button><button className="button primary">Apply</button></div>
  </form>
}

export function ShareDrawer({ state, doc, role, onClose }) {
  const { commit } = useWorkspace()
  const [step, setStep] = useState('share')
  const [settings, setSettings] = useState({ scope: 'existingAccess', permission: 'edit', recipientEmails: [] })
  const [url, setUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [draft, setDraft] = useState(blankRecipients)
  const [permission, setPermission] = useState('edit')
  const [note, setNote] = useState('')
  const [confirmation, setConfirmation] = useState('')
  function send(event) {
    event.preventDefault()
    if (!canEdit(role)) return
    const { recipients, error } = completeRecipients(state, doc, draft)
    if (error) { setDraft({ ...draft, error }); return }
    commit((current) => invitePeople(current, doc, recipients, permission, note))
    setDraft(blankRecipients)
    setNote('')
    setConfirmation(recipients.length === 1 ? 'Invitation sent to 1 person.' : `Invitations sent to ${recipients.length} people.`)
  }
  function copy() {
    let result
    commit((current) => {
      result = copyLink(current, doc, settings)
      return result.state
    })
    if (result.error) { setLinkError(result.error); return }
    const address = new URL(withSid(result.link.path), window.location.origin).href
    setUrl(address)
    setLinkError('')
    navigator.clipboard?.writeText(address).catch(() => {})
  }
  const back = () => setStep('share')
  if (step === 'access') return <Modal title="Manage access" drawer onClose={onClose}>
    <button type="button" className="button ghost drawer-back" onClick={back}><ArrowLeft size={16} />Back to sharing</button>
    <ManageAccess state={state} doc={doc} role={role} onChange={(collection, id, value) => {
      commit((current) => changeAccess(current, doc, collection, id, value))
      if (collection === 'shareLinks' && url && new URL(url).pathname === '/share/' + encodeURIComponent(id)) setUrl('')
    }} />
  </Modal>
  if (step === 'link') return <Modal title="Link settings" drawer onClose={onClose}>
    <button type="button" className="button ghost drawer-back" onClick={back}><ArrowLeft size={16} />Back to sharing</button>
    <LinkSettings state={state} doc={doc} settings={settings} onBack={back} onApply={(value) => {
      setSettings(value); setUrl(''); setLinkError(''); back()
    }} />
  </Modal>
  return <Modal title="Share document" drawer onClose={onClose}>
    <div className="share-doc-label"><Users size={17} /><strong>{doc.title || 'Untitled document'}</strong>
      <button type="button" className="button ghost" onClick={() => setStep('access')}>Manage access</button>
    </div>
    <form className="share-form" onSubmit={send}>
      <Recipients state={state} doc={doc} draft={draft} setDraft={setDraft} />
      <Permission value={permission} onChange={setPermission} />
      <label className="field-label">Message <span className="optional-label">Optional</span>
        <textarea className="field" placeholder="Add a message" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </label>
      <div className="share-primary-actions"><button className="button primary"><Send size={15} />Send</button></div>
    </form>
    {confirmation && <p className="share-confirmation" role="status"><CheckCircle2 size={17} />{confirmation}</p>}
    <div className="share-link-section">
      <div><h3>Share a link</h3><p>{scopeLabels[settings.scope]}{settings.scope !== 'existingAccess' && ` · ${permissionLabels[settings.permission]}`}</p></div>
      <div className="link-actions">
        <button type="button" className="button" onClick={copy}><Link2 size={16} />Copy link</button>
        <button type="button" className="button" onClick={() => setStep('link')}><Settings2 size={16} />Link settings</button>
      </div>
      {url && <label className="field-label link-output">Sharing link
        <input className="field" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      </label>}
      {url && <p className="muted" role="status">The sharing link is ready to use.</p>}
      {linkError && <p className="error-message" role="alert">{linkError}</p>}
    </div>
  </Modal>
}
