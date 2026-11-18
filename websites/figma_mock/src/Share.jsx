import { useState } from 'react'
import { inviteError, mutate } from './data/actions.js'
import { fileName, filePath, find, normalizeEmail, owns, records, roleFor, roleLabel } from './data/model.js'
import { useWorkspace } from './store.jsx'
import { Avatar, Modal } from './ui.jsx'
import { withSid } from './utils/dataManager.js'

function RoleOptions() {
  return <><option value="view">Can view</option><option value="edit">Can edit</option></>
}

export function Share({ fileId, onClose }) {
  const { state, commit, notify } = useWorkspace()
  const file = find(state, 'files', fileId)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('view')
  const [touched, setTouched] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [audience, setAudience] = useState(file?.linkAccess?.audience ?? 'invited')
  const [linkRole, setLinkRole] = useState(file?.linkAccess?.role ?? 'view')
  const [manual, setManual] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!roleFor(state, file)) return null
  const owner = find(state, 'users', file.ownerId)
  const manage = owns(state, file)
  const grants = records(state, 'fileAccess').filter((grant) => grant.fileId === fileId && ['active', 'pending'].includes(grant.status))
  const error = inviteError(state, file, email)
  const url = new URL(withSid(filePath(fileId)), window.location.origin).href
  const linkChanged = audience !== (file.linkAccess?.audience ?? 'invited') ||
    (audience === 'anyone' ? linkRole : null) !== (file.linkAccess?.role ?? null)

  function perform(fields, message) {
    if (!commit((current) => mutate(current, { ...fields, fileId }))) return false
    if (message) notify(message)
    return true
  }
  function invite(event) {
    event.preventDefault()
    setTouched(true)
    if (error) return
    if (perform({ type: 'invite', email, role: inviteRole }, 'Access invitation saved')) {
      setEmail('')
      setTouched(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setManual(false)
    } catch {
      setCopied(false)
      setManual(true)
    }
  }

  return <Modal title={'Share ' + fileName(file)} onClose={onClose} wide>
    <section className="share-section" aria-labelledby="people-heading">
      <h3 id="people-heading">People</h3>
      {manage && <form noValidate onSubmit={invite} className="invite-form">
        <div className="field invite-address"><label htmlFor="invite-email">Email address</label>
          <input id="invite-email" data-focus list="directory" value={email} type="email" placeholder="name@example.test"
            onChange={(event) => setEmail(event.target.value)} onBlur={() => { if (email) setTouched(true) }}
            aria-invalid={Boolean(touched && error)} aria-describedby={touched && error ? 'invite-error' : undefined} />
          <datalist id="directory">{records(state, 'users').filter((item) => item.email && item.id !== file.ownerId).map((item) =>
            <option key={item.id ?? item.email} value={item.email}>{item.name}</option>)}</datalist>
        </div>
        <div className="field"><label htmlFor="invite-role">Role</label><select id="invite-role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><RoleOptions /></select></div>
        <button type="submit" className="primary" disabled={!email.trim()}>Invite</button>
        {touched && error && <p id="invite-error" className="form-error" role="alert">{error}</p>}
      </form>}
      <ul className="people-list">
        <li><Avatar name={owner?.name} color={owner?.avatarColor} /><div><b>{owner?.name || 'File owner'}</b>{owner?.email && <small>{owner.email}</small>}</div><span className="person-role">Owner</span></li>
        {grants.map((grant) => {
          const person = find(state, 'users', grant.userId)
          const label = normalizeEmail(grant.email) || person?.email || person?.name || 'Recipient'
          const canManageGrant = manage && Boolean(grant.id)
          return <li key={grant.id ?? label}>
            <Avatar name={person?.name || label} color={person?.avatarColor} /><div><b>{person?.name || label}</b>{person?.name && <small>{label}</small>}
              {grant.status === 'pending' && <span className="badge warning">Pending</span>}</div>
            {canManageGrant ? <div className="grant-actions">
              <select aria-label={'Role for ' + label} value={grant.role || 'view'}
                onChange={(event) => perform({ type: 'grant-role', grantId: grant.id, role: event.target.value }, 'Role updated')}><RoleOptions /></select>
              <button type="button" className="icon-button quiet" aria-label={'Remove access for ' + label} onClick={() => setRemoving(grant.id)}>×</button>
            </div> : <span className="person-role">{roleLabel(grant.role)}</span>}
            {canManageGrant && removing === grant.id && <div className="remove-grant">
              <p>Remove access for <strong>{label}</strong>?</p>
              <button type="button" onClick={() => setRemoving(null)}>Cancel</button>
              <button type="button" className="danger" onClick={() => { perform({ type: 'grant-remove', grantId: grant.id }, 'Access removed'); setRemoving(null) }}>Remove access</button>
            </div>}
          </li>
        })}
      </ul>
    </section>
    <section className="share-section link-section" aria-labelledby="link-heading">
      <h3 id="link-heading">Link access</h3>
      {manage ? <form className="link-form" onSubmit={(event) => {
        event.preventDefault()
        perform({ type: 'link', audience, role: linkRole }, 'Link access saved')
      }}>
        <div className="field"><label htmlFor="link-audience">Audience</label><select id="link-audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
          <option value="invited">Only invited people</option><option value="anyone">Anyone with the link</option>
        </select></div>
        {audience === 'anyone' && <div className="field"><label htmlFor="link-role">Link role</label><select id="link-role" value={linkRole} onChange={(event) => setLinkRole(event.target.value)}><RoleOptions /></select></div>}
        <button type="submit" disabled={!linkChanged}>Save link access</button>
      </form> : <p>{audience === 'anyone' ? 'Anyone with the link · ' + roleLabel(linkRole) : 'Only invited people'}</p>}
    </section>
    <div className="form-footer"><span className="copy-status" role="status">{copied ? 'Link copied' : ''}</span><button type="button" onClick={copy}>Copy link</button><button type="button" className="primary" onClick={onClose}>Done</button></div>
    {manual && <label className="field">Select and copy this link<input value={url} readOnly autoFocus onFocus={(event) => event.target.select()} /></label>}
  </Modal>
}

