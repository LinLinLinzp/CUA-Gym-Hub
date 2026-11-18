import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Confirm, Details, Dialog, Field, Missing, PageTitle, Pill, SiteLink, Table } from '../components/ui.jsx'
import { activity, byId, byName, changesBetween, filterText, formatDate, identifier, label, list, revokeGrants, transactionInfo, uid, updateRecord, validIdentifier } from '../model.js'
import { activeGrants, createGrant, dropRole, grantDirection, grantKinds, grantTarget, privileges, validateGrant } from '../roles.js'
import { useAccount } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'

const path = '/roles'
const detailLink = id => path + '/' + encodeURIComponent(id)

export function Roles() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('asc')
  const [creating, setCreating] = useState(false)
  const roles = list(state.roles)
  const matches = roles.filter(role => filterText(query, role.name, role.comment) && (!type || type === role.type))
    .sort(sort === 'asc' ? byName : (a, b) => byName(b, a))
  const counts = new Map()
  for (const grant of activeGrants(state)) counts.set(grant.roleId, (counts.get(grant.roleId) ?? 0) + 1)

  return <>
    <PageTitle title="Roles" description="Manage account roles, role hierarchy, and warehouse privileges."
      actions={<button className="primary" onClick={() => setCreating(true)}>Create role</button>} />
    <div className="toolbar">
      <div className="search"><Field label="Search roles"><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or comment" /></Field></div>
      <Field label="Type"><select value={type} onChange={event => setType(event.target.value)}>
        <option value="">All types</option><option value="SYSTEM">System</option><option value="CUSTOM">Custom</option>
      </select></Field>
      <Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="asc">Name (A–Z)</option><option value="desc">Name (Z–A)</option>
      </select></Field>
    </div>
    <Table caption="Roles" columns={['Name', 'Type', 'Owner', 'Active grants', 'Comment']}
      empty={!matches.length && (roles.length ? 'No roles match your filters.' : 'No roles yet.')}>
      {matches.map(role => <tr key={role.id}>
        <td>{role.id ? <SiteLink className="mono" to={detailLink(role.id)}>{role.name ?? 'Unnamed role'}</SiteLink> : role.name ?? '—'}</td>
        <td><Pill value={role.type} /></td><td className="mono">{label(state.roles, role.ownerRoleId)}</td>
        <td className="number">{counts.get(role.id) ?? 0}</td><td className="wrap">{role.comment || '—'}</td>
      </tr>)}
    </Table>
    <div className="list-summary">{matches.length} of {roles.length} roles</div>
    {creating && <RoleForm onClose={() => setCreating(false)} />}
  </>
}

const groups = [
  ['Direct user assignments', (grant, id) => grant.kind === 'ROLE_TO_USER' && grant.roleId === id],
  ['Roles granted to this role', (grant, id) => grant.kind === 'ROLE_TO_ROLE' && grant.targetId === id],
  ['Parent roles', (grant, id) => grant.kind === 'ROLE_TO_ROLE' && grant.roleId === id],
  ['Warehouse privileges', (grant, id) => grant.kind === 'WAREHOUSE_PRIVILEGE' && grant.roleId === id],
]

export function RoleDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const role = byId(state.roles, id)
  return role ? <RoleProfile key={id} role={role} /> : <Missing area="Roles" />
}

function RoleProfile({ role }) {
  const { state, commit } = useAccount()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState(null)
  const name = role.name ?? 'Unnamed role'
  const grants = activeGrants(state)
  const custom = role.type === 'CUSTOM'
  const hasTarget = [state.users, state.roles, state.warehouses].some(items => list(items).some(item => item.id && item !== role))
  const close = () => setDialog(null)

  function drop() {
    commit(current => {
      const target = byId(current.roles, role.id)
      return target?.type === 'CUSTOM' ? dropRole(current, transactionInfo(current), target) : current
    })
    navigate(withSid(path))
  }

  function revoke() {
    commit(current => {
      const grant = byId(current.grants, dialog.grant.id)
      return grant?.status === 'ACTIVE' ? revokeGrants(current, transactionInfo(current), [grant]) : current
    })
    close()
  }

  return <>
    <PageTitle title={name} description={role.comment || 'Role details'} back={{ to: path, label: 'Roles' }}
      actions={<>
        <button className="primary" disabled={!hasTarget} onClick={() => setDialog({ type: 'grant' })}>Grant access</button>
        {custom && <>
          <button onClick={() => setDialog({ type: 'edit' })}>Edit role</button>
          <button className="destructive" onClick={() => setDialog({ type: 'drop' })}>Drop role</button>
        </>}
      </>} />
    <div className="detail-grid">
      <div className="stack">
        {groups.map(([title, matches]) => {
          const items = grants.filter(grant => matches(grant, role.id))
          return <section className="panel grant-panel" key={title}>
            <h2>{title} <span className="count">{items.length}</span></h2>
            {items.length ? <ul className="grant-list">{items.map(grant => {
              const linkedRoleId = grant.roleId === role.id ? grant.targetId : grant.roleId
              const linkedRole = grant.kind === 'ROLE_TO_ROLE' ? byId(state.roles, linkedRoleId) : null
              return <li key={grant.id}>
                <span className="mono">{linkedRole?.id ? <SiteLink to={detailLink(linkedRole.id)}>{grantDirection(state, grant)}</SiteLink> : grantDirection(state, grant)}</span>
                <button disabled={!grant.id} onClick={() => setDialog({ type: 'revoke', grant })}>Revoke</button>
              </li>
            })}</ul> : <div className="empty">No active grants in this group.</div>}
          </section>
        })}
      </div>
      <aside className="panel"><h2>Role properties</h2><Details items={[
        ['Type', <Pill value={role.type} />], ['Owner', label(state.roles, role.ownerRoleId)], ['Comment', role.comment || '—'],
        ['Created', formatDate(role.createdAt)], ['Last updated', formatDate(role.updatedAt)],
      ]} /></aside>
    </div>
    {dialog?.type === 'edit' && <RoleForm role={role} onClose={close} />}
    {dialog?.type === 'grant' && <GrantForm role={role} onClose={close} />}
    {dialog?.type === 'drop' && <Confirm title="Drop role" action="Drop" danger onClose={close} submit={drop}
      description={'Drop ' + name + '? Related grants will be revoked and current role references will be cleared.'} />}
    {dialog?.type === 'revoke' && <Confirm title="Revoke grant" action="Revoke" danger onClose={close} submit={revoke}
      description={'Revoke this grant? ' + grantDirection(state, dialog.grant) + '.'} />}
  </>
}

function RoleForm({ role, onClose }) {
  const { state, commit } = useAccount()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [comment, setComment] = useState(role?.comment ?? '')
  const [parent, setParent] = useState('')
  const [error, setError] = useState('')
  const [parentError, setParentError] = useState('')
  const parents = list(state.roles).filter(item => item.id).sort(byName)
  function submit(event) {
    event.preventDefault()
    const canonical = identifier(name)
    setError('')
    setParentError('')
    if (!role && !validIdentifier(canonical)) { setError('Start with a letter or underscore. Use letters, numbers, underscores or dollar signs.'); return }
    if (!role && list(state.roles).some(item => identifier(item.name ?? '') === canonical)) { setError('A role with this name already exists.'); return }
    if (parent && !byId(state.roles, parent)) { setParentError('Choose an available parent role.'); return }
    const id = role?.id ?? uid('role')
    commit(current => {
      const tx = transactionInfo(current)
      if (role) {
        const target = byId(current.roles, id)
        if (target?.type !== 'CUSTOM' || (target.comment ?? '') === comment) return current
        return activity(updateRecord(current, 'roles', id, { comment, updatedAt: tx.createdAt }),
          tx, 'role.updated', target, changesBetween(target, { comment }))
      }
      const item = { id, name: canonical, type: 'CUSTOM', comment, ownerRoleId: tx.actorRoleId, createdByUserId: tx.actorUserId, createdAt: tx.createdAt, updatedAt: tx.createdAt }
      const next = activity({ ...current, roles: [...list(current.roles), item] }, tx, 'role.created', item)
      return parent ? createGrant(next, tx, { kind: 'ROLE_TO_ROLE', roleId: id, targetId: parent, privilege: null }) : next
    })
    onClose()
    if (!role) navigate(withSid(detailLink(id)))
  }
  return <Dialog title={role ? 'Edit role' : 'Create role'} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <div className="form-fields">
        {!role && <Field label="Name" error={error}><input autoFocus value={name} placeholder="TEAM_READER" onChange={event => setName(event.target.value)} /></Field>}
        <Field label="Comment"><textarea rows={3} value={comment} onChange={event => setComment(event.target.value)} /></Field>
        {!role && <Field label="Parent role (optional)" error={parentError}><select value={parent} disabled={!parents.length} onChange={event => setParent(event.target.value)}>
          <option value="">No parent role</option>{parents.map(item => <option key={item.id} value={item.id}>{item.name ?? 'Unnamed role'}</option>)}
        </select></Field>}
        {parent && <p className="muted">{identifier(name) || 'New role'} granted to {label(state.roles, parent)}</p>}
      </div>
      <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">{role ? 'Save changes' : 'Create role'}</button></div>
    </form>
  </Dialog>
}

function GrantForm({ role, onClose }) {
  const { state, commit } = useAccount()
  const [kind, setKind] = useState('ROLE_TO_USER')
  const [targetId, setTargetId] = useState('')
  const [privilege, setPrivilege] = useState('USAGE')
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const collections = { ROLE_TO_USER: state.users, ROLE_TO_ROLE: state.roles, WAREHOUSE_PRIVILEGE: state.warehouses }
  const targets = list(collections[kind]).filter(item => item.id && (kind !== 'ROLE_TO_ROLE' || item.id !== role.id)).sort(byName)
  const grant = { kind, roleId: role.id, targetId, privilege: kind === 'WAREHOUSE_PRIVILEGE' ? privilege : null }
  const targetLabel = { ROLE_TO_USER: 'User', ROLE_TO_ROLE: 'Parent role', WAREHOUSE_PRIVILEGE: 'Warehouse' }[kind]

  function review(event) {
    event.preventDefault()
    const message = validateGrant(state, grant)
    setError(message)
    if (!message) setReviewing(true)
  }

  function submit() {
    const message = validateGrant(state, grant)
    if (message) { setReviewing(false); setError(message); return }
    commit(current => {
      if (!byId(current.roles, role.id) || validateGrant(current, grant)) return current
      return createGrant(current, transactionInfo(current), grant)
    })
    onClose()
  }
  return <Dialog title={reviewing ? 'Confirm grant' : 'Grant access'} onClose={onClose}>
    {reviewing ? <>
      <p>{grantDirection(state, grant)}.</p>
      <div className="form-actions"><button onClick={() => setReviewing(false)}>Back</button><button className="primary" onClick={submit}>Grant</button></div>
    </> : <form onSubmit={review} noValidate>
      <div className="form-fields">
        <Field label="Grant type"><select value={kind} onChange={event => { setKind(event.target.value); setTargetId(''); setError('') }}>
          {Object.entries(grantKinds).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select></Field>
        <Field label={targetLabel} error={error}><select value={targetId} disabled={!targets.length} onChange={event => { setTargetId(event.target.value); setError('') }}>
          <option value="">{targets.length ? 'Choose ' + targetLabel.toLowerCase() : 'No targets available'}</option>
          {targets.map(item => <option value={item.id} key={item.id}>{item.displayName ?? item.name ?? 'Unnamed target'}</option>)}
        </select></Field>
        {kind === 'WAREHOUSE_PRIVILEGE' && <Field label="Privilege"><select value={privilege} onChange={event => { setPrivilege(event.target.value); setError('') }}>
          {privileges.map(value => <option key={value}>{value}</option>)}
        </select></Field>}
        {grantTarget(state, kind, targetId) && <p>{grantDirection(state, grant)}</p>}
      </div>
      <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={!targets.length}>Review grant</button></div>
    </form>}
  </Dialog>
}
