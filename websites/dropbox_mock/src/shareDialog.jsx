import { useId, useState } from 'react'
import { active, getFile, inviteMember, memberships, revokeLink, saveLink, updateMember } from './model'
import { Dialog, ErrorText, Field, LinkCopy, userName } from './ui'
import { useStore } from './store'

export const roleLabel = role => role === 'editor' ? 'Can edit' : 'Can view'

function AccessRow({ name, secondary, children }) {
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <li className="access-row">
    <span className="avatar" aria-hidden="true">{initials || '?'}</span>
    <div className="access-name"><strong>{name}</strong>{secondary && <span className="metadata">{secondary}</span>}</div>
    <div className="access-controls">{children}</div>
  </li>
}

export function RoleSelect({ value, onChange, label }) {
  return <select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>
    <option value="viewer">Can view</option><option value="editor">Can edit</option>
  </select>
}

export function ShareDialog({ fileId, onClose }) {
  const { state, commit, notify } = useStore()
  const id = useId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const item = getFile(state, fileId)
  if (!active(item)) return <Dialog title="Share" onClose={onClose}><p>This item is unavailable.</p></Dialog>
  const all = memberships(state, item)

  function handleInvite(event) {
    event.preventDefault()
    try {
      commit(latest => inviteMember(latest, fileId, email, role))
      setEmail('')
      setError('')
      notify('Access granted.')
    } catch (failure) { setError(failure.message) }
  }

  function change(id, nextRole) {
    try {
      commit(latest => updateMember(latest, fileId, id, nextRole))
      setError('')
      notify(nextRole ? 'Access updated.' : 'Access removed.')
    } catch (failure) { setError(failure.message) }
  }

  return <Dialog title={'Share ' + (item.name || 'item')} wide onClose={onClose}>
    <form className="invite-form" onSubmit={handleInvite}>
      <Field label="Invite by email"><input data-autofocus type="email" list={id} placeholder="name@example.com" value={email} onChange={event => setEmail(event.target.value)} required /></Field>
      <datalist id={id}>{state.users.filter(user => user.email && user.id !== item.ownerId).map(user => <option key={user.id} value={user.email}>{user.name}</option>)}</datalist>
      <Field label="Permission"><RoleSelect value={role} onChange={setRole} /></Field>
      <button className="button primary" type="submit">Invite</button>
    </form>
    <ErrorText>{error}</ErrorText>
    <section className="share-section" aria-label="People with access">
      <h3>People with access</h3>
      <ul className="access-list">
        <AccessRow name={userName(state, item.ownerId)}><span className="metadata">Owner</span></AccessRow>
        {all.map(member => {
          const direct = member.fileId === item.id
          const name = state.users.find(user => user.id === member.userId)?.name || member.email || 'Workspace member'
          const source = getFile(state, member.fileId)
          return <AccessRow key={member.id} name={name} secondary={direct ? member.email !== name && member.email : 'From ' + (source?.name || 'parent folder')}>
            {direct ? <><RoleSelect label={'Role for ' + name} value={member.role || 'viewer'} onChange={value => change(member.id, value)} />
              <button className="text-button danger-text" type="button" aria-label={'Remove access for ' + name} onClick={() => change(member.id, null)}>Remove</button></>
              : <span className="metadata">{roleLabel(member.role)} · Inherited</span>}
          </AccessRow>
        })}
      </ul>
    </section>
    <ShareLinks fileId={fileId} />
  </Dialog>
}

const audiences = { anyone: 'Anyone with the link', team: 'Team members', invited: 'Only people invited' }

function ShareLinks({ fileId }) {
  const { state } = useStore()
  const links = state.shareLinks.filter(link => link.fileId === fileId && link.status === 'active')
  const [selectedId, setSelectedId] = useState(null)
  const link = links.find(record => record.id === selectedId) || links[0]
  return <section className="share-section" aria-label="Share link">
    <h3>Share link</h3>
    {links.length > 1 && <Field label="Active link"><select value={link.id} onChange={event => setSelectedId(event.target.value)}>
      {links.map(record => <option key={record.id} value={record.id}>{audiences[record.audience] || 'Share link'} · {record.token}</option>)}
    </select></Field>}
    <LinkSettings key={link?.id || 'new'} fileId={fileId} link={link} />
  </section>
}

function LinkSettings({ fileId, link }) {
  const { commit, notify } = useStore()
  const [audience, setAudience] = useState(link?.audience || 'anyone')
  const [role, setRole] = useState(link?.role || 'viewer')
  const [error, setError] = useState('')
  const dirty = audience !== link?.audience || role !== link?.role

  function act(revoke = false) {
    try {
      commit(latest => revoke ? revokeLink(latest, fileId, link.id) : saveLink(latest, fileId, link?.id, audience, role))
      setError('')
      notify(revoke ? 'Link revoked.' : link ? 'Link settings saved.' : 'Link created.')
    } catch (failure) { setError(failure.message) }
  }

  return <>
    <form className="invite-form" onSubmit={event => { event.preventDefault(); act() }}>
      <Field label="Link audience"><select value={audience} onChange={event => setAudience(event.target.value)}>
        {Object.entries(audiences).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select></Field>
      <Field label="Link permission"><RoleSelect value={role} onChange={setRole} /></Field>
      <button type="submit" className="button primary" disabled={!!link && !dirty}>{link ? 'Save settings' : 'Create link'}</button>
    </form>
    <ErrorText>{error}</ErrorText>
    {link && <><LinkCopy path={'/shared-link/' + encodeURIComponent(link.token)} />
      <button type="button" className="text-button danger-text" onClick={() => act(true)}>Revoke link</button></>}
  </>
}
