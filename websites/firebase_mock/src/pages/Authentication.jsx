import { useState } from 'react'
import { Badge, Confirm, DialogActions, Empty, Field, Modal, Pagination, Search, ViewHeader, usePagination } from '../components'
import { formatDate, newId, searchText, useWorkspace } from '../workspace'

const providers = { password: 'Email/password', 'google.com': 'Google', phone: 'Phone', anonymous: 'Anonymous' }
const identifier = (user) => user.email || user.phoneNumber || user.uid
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AddUser({ users, onAdd, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const normalized = searchText(email).trim()
    const next = {}
    if (!emailPattern.test(normalized)) next.email = 'Enter a valid email address.'
    else if (users.some((user) => searchText(user.email).trim() === normalized)) next.email = 'A user with this email already exists.'
    if (password.length < 6) next.password = 'Enter at least 6 characters.'
    setErrors(next)
    if (!Object.keys(next).length) onAdd(normalized)
  }
  return <Modal title="Add user" onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <Field label="Email" error={errors.email}>{(props) => <input {...props} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus />}</Field>
      <Field label="Password" error={errors.password}>{(props) => <input {...props} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />}</Field>
      <DialogActions onClose={onClose} submit="Add user" />
    </form>
  </Modal>
}

export default function Authentication() {
  const { state, commit } = useWorkspace()
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState(null)
  const users = state.authUsers.filter((user) => user.projectId === state.project.id)
  const matching = users.filter((user) => {
    const matchesQuery = [user.email, user.phoneNumber, user.uid].some((key) => searchText(key).includes(searchText(query).trim()))
    return matchesQuery && (!provider || user.providerIds?.includes(provider)) && (!status || Boolean(user.disabled) === (status === 'disabled'))
  })
  const pager = usePagination(matching)
  const close = () => setDialog(null)
  const changeFilter = (setter) => (value) => { setter(value); pager.setPage(1) }

  function add(email) {
    const uid = newId('auth')
    commit('auth.user.create', `Added ${email}.`, (current, { createdAt, actorId, projectId }) => ({
      targetId: uid, details: { email },
      patch: { authUsers: [...current.authUsers, {
        uid, projectId, email, providerIds: ['password'], disabled: false, emailVerified: false,
        lastSignInAt: null, createdAt, createdBy: actorId, updatedAt: createdAt, updatedBy: actorId,
      }] },
    }))
    close()
  }

  function changeUser(user, operation) {
    const sameUser = (row) => row.projectId === user.projectId && row.uid === user.uid
    const disabled = operation === 'disable'
    const deletion = operation === 'delete'
    const verb = { delete: 'Deleted', disable: 'Disabled', enable: 'Enabled' }[operation]
    commit(`auth.user.${operation}`, `${verb} ${identifier(user)}.`, (current, { createdAt, actorId }) => ({
      targetId: user.uid, details: deletion ? { email: user.email ?? null } : { disabled },
      patch: {
        authUsers: deletion ? current.authUsers.filter((row) => !sameUser(row)) : current.authUsers.map((row) =>
          sameUser(row) ? { ...row, disabled, updatedAt: createdAt, updatedBy: actorId } : row),
      },
    }))
    close()
  }

  return <>
    <ViewHeader title="Authentication" description="Manage the accounts that sign in to this project.">
      <button className="primary" onClick={() => setDialog({ operation: 'add' })}>Add user</button>
    </ViewHeader>
    <section className="panel" aria-labelledby="auth-users">
      <header className="panel-heading"><h2 id="auth-users">Users</h2><small>{users.length} total</small></header>
      <div className="controls">
        <Search label="Search users" placeholder="Email, phone or UID" value={query} onChange={changeFilter(setQuery)} />
        <Field label="Provider">{(props) => <select {...props} value={provider} onChange={(event) => changeFilter(setProvider)(event.target.value)}>
          <option value="">All providers</option>
          {Object.entries(providers).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>}</Field>
        <Field label="Status">{(props) => <select {...props} value={status} onChange={(event) => changeFilter(setStatus)(event.target.value)}>
          <option value="">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option>
        </select>}</Field>
      </div>
      <div className="table-wrap">
        <table className="auth-table">
          <thead><tr>{['Identifier', 'Provider', 'Created', 'Last sign-in', 'UID', 'Status', 'Actions'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{pager.rows.map((user) => <tr key={user.uid}>
            <td className="identifier">{identifier(user)}</td>
            <td>{user.providerIds?.map((id) => providers[id] || id).join(', ') || '—'}</td>
            <td>{formatDate(user.createdAt)}</td><td>{formatDate(user.lastSignInAt)}</td><td><code>{user.uid}</code></td>
            <td><Badge tone={user.disabled ? 'neutral' : 'success'}>{user.disabled ? 'Disabled' : 'Enabled'}</Badge></td>
            <td><div className="actions">
              <button onClick={() => setDialog({ operation: user.disabled ? 'enable' : 'disable', user })}>{user.disabled ? 'Enable' : 'Disable'}</button>
              <button className="danger-text" onClick={() => setDialog({ operation: 'delete', user })}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!matching.length && <Empty>{users.length ? 'No users match your filters.' : 'No users have been added.'}</Empty>}
      <Pagination pager={pager} label="users" />
    </section>
    {dialog?.operation === 'add' && <AddUser users={users} onAdd={add} onClose={close} />}
    {dialog?.user && (() => {
      const { user, operation } = dialog
      const label = operation[0].toUpperCase() + operation.slice(1)
      const description = {
        disable: `${identifier(user)} will be unable to sign in until the account is enabled.`,
        enable: `${identifier(user)} will be able to sign in again.`,
        delete: `Permanently delete the authentication record for ${identifier(user)}?`,
      }[operation]
      return <Confirm title={`${label} user`} description={description} label={`${label} user`}
        danger={operation === 'delete'} onClose={close} onConfirm={() => changeUser(user, operation)} />
    })()}
  </>
}
