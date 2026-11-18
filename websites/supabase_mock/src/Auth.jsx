import React, { useState } from 'react'
import { date, label, list, matches, record, replace, useWorkspace, without } from './workspace.jsx'
import { Badge, Button, DataGrid, Dialog, Empty, Field, Filter, PageHead, Pager, Search } from './ui.jsx'

const statuses = ['active', 'invited', 'unconfirmed', 'banned']
const tones = { active: 'success', invited: 'warning', banned: 'error' }
const statusOf = user => user.status || 'unconfirmed'
const providerOf = user => user.provider || 'email'

export function Auth() {
  const { state, commit, reportError } = useWorkspace()
  const users = list(state.authUsers)
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const [editor, setEditor] = useState(null)
  const user = users.find(item => item.id === selected)
  const providers = [...new Set(users.map(providerOf))].sort()
  const filtered = users.filter(item => (!provider || providerOf(item) === provider) && (!status || statusOf(item) === status) && matches(query, item.email, item.id))
  const pageSize = 15
  const activePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))
  const close = () => setEditor(null)

  async function changeUser(action) {
    const messages = { confirmed: 'User confirmed.', banned: 'User banned.', unbanned: 'User unbanned.', deleted: 'User deleted.' }
    await commit((current, meta) => {
      const previous = list(current.authUsers).find(item => item.id === user.id)
      const details = { email: previous.email ?? null, fromStatus: statusOf(previous) }
      if (action === 'deleted') return record({ authUsers: without(current.authUsers, user.id) }, 'auth_user.deleted', user.id, { userId: user.id }, details)
      const patch = {
        confirmed: { status: 'active', confirmedAt: meta.createdAt },
        banned: { status: 'banned', bannedAt: meta.createdAt },
        unbanned: { status: previous.confirmedAt ? 'active' : previous.invitedAt ? 'invited' : 'unconfirmed', bannedAt: null },
      }[action]
      const next = { ...previous, ...patch, actorId: meta.actorId, updatedAt: meta.updatedAt }
      return record({ authUsers: replace(current.authUsers, user.id, next) }, `auth_user.${action}`, user.id, { userId: user.id }, { ...details, toStatus: next.status })
    }, messages[action])
    if (action === 'deleted') setSelected(null)
  }

  return <>
    <PageHead eyebrow="Identity" title="Authentication" description="Manage the project’s user accounts, invitations, and sign-in access.">
      <Button variant="primary" icon="plus" onClick={() => setEditor('add')}>Add user</Button>
    </PageHead>
    {user && <section className="panel user-detail" aria-label="User details">
      <div className="panel-heading">
        <div><div className="eyebrow">User details</div><h2>{user.email || user.id}</h2><code>{user.id}</code></div>
        <Button icon="close" variant="quiet" aria-label="Close user details" onClick={() => setSelected(null)} />
      </div>
      <dl className="identity-properties"><div><dt>Status</dt><dd><UserStatus user={user} /></dd></div>
        <div><dt>Provider</dt><dd>{label(providerOf(user))}</dd></div>
        <div><dt>Signed up</dt><dd>{date(user.createdAt)}</dd></div>
        <div><dt>Last sign-in</dt><dd>{date(user.lastSignInAt)}</dd></div>
        <div><dt>Invited</dt><dd>{date(user.invitedAt)}</dd></div>
        <div><dt>Confirmed</dt><dd>{date(user.confirmedAt)}</dd></div>
        {user.bannedAt && <div><dt>Banned</dt><dd>{date(user.bannedAt)}</dd></div>}
      </dl>
      <div className="detail-actions">
        {['invited', 'unconfirmed'].includes(statusOf(user)) && <Button onClick={() => changeUser('confirmed').catch(reportError)}>Confirm user</Button>}
        {statusOf(user) === 'banned' ? <Button onClick={() => changeUser('unbanned').catch(reportError)}>Unban user</Button>
          : <Button onClick={() => changeUser('banned').catch(reportError)}>Ban user</Button>}
        <Button variant="danger-outline" onClick={() => setEditor('delete')}>Delete user</Button>
      </div>
    </section>}
    <section className="panel" aria-label="Project users">
      <div className="toolbar">
        <Search title="Search by email or user ID" value={query} onChange={value => { setQuery(value); setPage(0) }} />
        <Filter title="Provider" value={provider} options={[[ '', 'All providers'], ...providers.map(value => [value, label(value)])]} onChange={value => { setProvider(value); setPage(0) }} />
        <Filter title="Status" value={status} options={[[ '', 'All statuses'], ...statuses.map(value => [value, label(value)])]} onChange={value => { setStatus(value); setPage(0) }} />
        <span className="result-count">{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</span>
      </div>
      {filtered.length ? <>
        <DataGrid title="Project users"><thead><tr><th>Email</th><th>User ID</th><th>Provider</th><th>Status</th><th>Signed up</th><th>Last sign-in</th></tr></thead>
          <tbody>{filtered.slice(activePage * pageSize, (activePage + 1) * pageSize).map(item => <tr key={item.id} className={item.id === selected ? 'selected' : ''}>
            <td><button className="text-button" type="button" onClick={() => setSelected(item.id)}>{item.email || item.id}</button></td>
            <td className="mono">{item.id}</td><td>{label(providerOf(item))}</td><td><UserStatus user={item} /></td>
            <td>{date(item.createdAt)}</td><td>{date(item.lastSignInAt)}</td>
          </tr>)}</tbody>
        </DataGrid>
        <Pager page={activePage} pageSize={pageSize} total={filtered.length} onChange={setPage} />
      </> : <Empty title={users.length ? 'No matching users' : 'No project users'}>{users.length ? 'Try changing your search or filters.' : 'Create a user or record an invitation to get started.'}</Empty>}
    </section>
    {editor === 'add' && <UserEditor close={close} onCreated={id => { setSelected(id); setQuery(''); setProvider(''); setStatus(''); setPage(0) }} />}
    {editor === 'delete' && user && <Dialog title="Delete user" confirm danger onClose={close} onSubmit={() => changeUser('deleted')} submitLabel="Delete user">
      <p>Delete <strong>{user.email || user.id}</strong> from the project’s user directory?</p><code>{user.id}</code>
    </Dialog>}
  </>
}

function UserStatus({ user }) {
  const status = statusOf(user)
  return <Badge tone={tones[status]}>{label(status)}</Badge>
}

function UserEditor({ close, onCreated }) {
  const [mode, setMode] = useState('create')
  const { commit } = useWorkspace()
  const invite = mode === 'invite'
  async function save(form) {
    const email = form.get('email').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) throw new Error('Enter a valid email address.')
    const id = crypto.randomUUID()
    await commit((state, meta) => {
      const users = list(state.authUsers)
      if (users.some(user => user.email?.trim().toLowerCase() === email)) throw new Error('A project user with this email already exists.')
      const confirmed = !invite && form.has('confirmed')
      const status = invite ? 'invited' : confirmed ? 'active' : 'unconfirmed'
      const user = { id, email, provider: 'email', status, invitedAt: invite ? meta.createdAt : null,
        confirmedAt: confirmed ? meta.createdAt : null, lastSignInAt: null, bannedAt: null, ...meta }
      return record({ authUsers: [...users, user] }, invite ? 'auth_user.invited' : 'auth_user.created', id, { userId: id }, { email, status })
    }, invite ? 'Invitation recorded.' : 'User created.')
    onCreated(id)
  }
  return <Dialog title="Add user" onClose={close} onSubmit={save} submitLabel={invite ? 'Invite user' : 'Create user'}>
    <Field title="Method"><select value={mode} onChange={event => setMode(event.target.value)}>
      <option value="create">Create user</option><option value="invite">Invite user</option>
    </select></Field>
    <Field title="Email address"><input type="text" inputMode="email" autoComplete="off" name="email" required maxLength={254} /></Field>
    {invite ? <p className="muted">The project directory will show the user as invited.</p>
      : <label className="toggle"><input type="checkbox" name="confirmed" />Confirm email on creation</label>}
  </Dialog>
}
