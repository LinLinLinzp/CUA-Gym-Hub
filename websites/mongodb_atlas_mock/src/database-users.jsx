import { useState } from 'react'
import { Actions, Badge, Confirm, Feedback, Field, Inventory, Modal, Select, displayDate, expiryOptions, expiryStatus, resolveExpiry, searchText } from './components.jsx'
import { liveClusters, rows, scoped, useWorkspace } from './workspace.jsx'

const roles = [
  ['read', 'Read'], ['readWrite', 'Read and write'], ['dbAdmin', 'Database admin'],
  ['readAnyDatabase', 'Read any database'], ['readWriteAnyDatabase', 'Read and write any database'],
  ['atlasAdmin', 'Atlas admin'],
]
const nameFor = row => row.username || row.id
const defaultRole = () => ({ roleName: 'read', databaseName: '' })

function DatabaseUserForm({ original, records, clusters, clusterNames, onClose, onSave }) {
  const [username, setUsername] = useState(original?.username ?? '')
  const [password, setPassword] = useState('')
  const [assignments, setAssignments] = useState(() => (rows(original?.roles).length ? original.roles : [defaultRole()])
    .map((role, index) => ({ ...role, key: index })))
  const [nextKey, setNextKey] = useState(assignments.length)
  const originalScope = original?.clusterIds
  const [restricted, setRestricted] = useState(Array.isArray(originalScope))
  const [clusterIds, setClusterIds] = useState(rows(originalScope))
  const [duration, setDuration] = useState(original ? 'keep' : 'permanent')
  const [errors, setErrors] = useState({})
  const liveIds = new Set(clusters.map(cluster => cluster.id))
  const unavailableIds = rows(originalScope).filter(id => !liveIds.has(id))

  function changeRole(key, field, value) {
    setAssignments(current => current.map(role => role.key === key ? { ...role, [field]: value } : role))
    setErrors(current => ({ ...current, roles: undefined }))
  }

  function submit() {
    const selectedName = username.trim()
    const next = {}
    if (!original && !/^[a-zA-Z0-9_.@-]{1,64}$/.test(selectedName)) next.username = 'Use 1–64 letters, numbers, underscores, dots, @ signs or hyphens.'
    else if (!original && records.some(row => row.username === selectedName)) next.username = 'This database username already exists in this project.'
    if (!original && password.length < 8) next.password = 'Enter a credential of at least 8 characters.'
    const roleValues = assignments.map(({ key, roleName, databaseName, collectionName, ...rest }) => ({
      ...rest, roleName, databaseName: (databaseName ?? '').trim(),
      ...(collectionName?.trim() ? { collectionName: collectionName.trim() } : {}),
    }))
    if (!roleValues.length || roleValues.some(role => !role.roleName || !role.databaseName)) next.roles = 'Select a role and enter a database for each assignment.'
    else if (new Set(roleValues.map(role => JSON.stringify([role.roleName, role.databaseName, role.collectionName]))).size !== roleValues.length) next.roles = 'Remove duplicate role assignments.'
    const sameScope = restricted === Array.isArray(originalScope) && (!restricted ||
      clusterIds.length === originalScope.length && clusterIds.every(id => originalScope.includes(id)))
    if (restricted && !sameScope && !clusterIds.some(id => liveIds.has(id))) next.scope = 'Select at least one available cluster.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSave(now => ({
      ...(!original && { username: selectedName, authMethod: 'SCRAM', authDatabase: 'admin', status: 'active' }),
      roles: roleValues,
      ...((!original || !sameScope) && { clusterIds: restricted ? clusterIds : null }),
      expiresAt: resolveExpiry(duration, original?.expiresAt, now),
    }))
  }

  return <Modal sheet title={original ? 'Edit database user' : 'Add database user'} onClose={onClose} onSubmit={submit} submitLabel={original ? 'Save changes' : 'Add user'}>
    {original ? <p className="machine">{nameFor(original)}</p> : <>
      <Field label="Username" error={errors.username}>{props => <input {...props} autoFocus autoComplete="off" value={username} onChange={event => { setUsername(event.target.value); setErrors({ ...errors, username: undefined }) }} />}</Field>
      <Field label="Password" error={errors.password} hint="Use a synthetic password of at least 8 characters.">{props => <input {...props} type="password" autoComplete="new-password" value={password} onChange={event => { setPassword(event.target.value); setErrors({ ...errors, password: undefined }) }} />}</Field>
    </>}
    <fieldset className="role-builder">
      <legend>Database roles</legend>
      {assignments.map((role, index) => <div className="role-fields" key={role.key}>
        <div className="form-grid">
          <Field label={index ? 'Role ' + (index + 1) : 'Role'}>{props => <Select {...props} options={roles.some(([id]) => id === role.roleName) || !role.roleName ? roles : [...roles, [role.roleName, role.roleName]]} value={role.roleName || 'read'} onChange={event => changeRole(role.key, 'roleName', event.target.value)} />}</Field>
          <Field label={index ? 'Database ' + (index + 1) : 'Database'}>{props => <input {...props} value={role.databaseName ?? ''} placeholder="e.g. catalog" onChange={event => changeRole(role.key, 'databaseName', event.target.value)} />}</Field>
        </div>
        <Field label={index ? 'Collection ' + (index + 1) + ' (optional)' : 'Collection (optional)'}>{props => <input {...props} value={role.collectionName ?? ''} onChange={event => changeRole(role.key, 'collectionName', event.target.value)} />}</Field>
        {assignments.length > 1 && <button type="button" className="button" aria-label={'Remove role ' + (index + 1)} onClick={() => setAssignments(assignments.filter(item => item.key !== role.key))}>Remove role</button>}
      </div>)}
      {errors.roles && <p className="field-error" role="alert">{errors.roles}</p>}
      <button type="button" className="button" onClick={() => { setAssignments([...assignments, { ...defaultRole(), key: nextKey }]); setNextKey(nextKey + 1) }}>Add role</button>
    </fieldset>
    <Field label="Cluster scope" error={errors.scope}>{props => <Select {...props} options={[[ 'all', 'All project clusters' ], ['selected', 'Selected clusters']]} value={restricted ? 'selected' : 'all'} onChange={event => { setRestricted(event.target.value === 'selected'); setErrors({ ...errors, scope: undefined }) }} />}</Field>
    {restricted && <fieldset><legend>Clusters</legend>
      {clusters.length || unavailableIds.length ? <div className="checklist">{[
        ...clusters.map(cluster => ({ id: cluster.id, label: cluster.name || cluster.id })),
        ...unavailableIds.map(id => ({ id, label: (clusterNames.get(id) || id) + ' (unavailable)' })),
      ].map(({ id, label }) => <label className="checkbox" key={id}>
        <input type="checkbox" checked={clusterIds.includes(id)} onChange={event => {
          setClusterIds(event.target.checked ? [...clusterIds, id] : clusterIds.filter(selected => selected !== id))
          setErrors({ ...errors, scope: undefined })
        }} />{label}
      </label>)}</div> : <p className="muted">No clusters are available in this project.</p>}
    </fieldset>}
    <Field label="Access duration" hint={original?.expiresAt ? 'Current expiry: ' + displayDate(original.expiresAt) : undefined}>{props => <Select {...props} options={expiryOptions(original)} value={duration} onChange={event => setDuration(event.target.value)} />}</Field>
  </Modal>
}

export function DatabaseUsers() {
  const { state, project, mutate } = useWorkspace()
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [message, setMessage] = useState('')
  const records = scoped(state, 'databaseUsers', project.id).filter(row => row.status !== 'deleted')
  const clusters = liveClusters(state, project.id)
  const clusterNames = new Map(scoped(state, 'clusters', project.id).map(row => [row.id, row.name || row.id]))
  return <Inventory title="Database Access" description="Manage database users, their roles and which clusters they can access."
    addLabel="Add database user" onAdd={() => setForm({})} records={records}
    columns={['Username', 'Roles', 'Cluster scope', 'Expiry', 'Status', 'Actions']}
    searchLabel="Search database users" search={row => searchText(row.username)} name={nameFor}
    filters={[
      { label: 'Role', placeholder: 'All roles', options: roles, match: (row, value) => rows(row.roles).some(role => role?.roleName === value) },
      { label: 'Status', placeholder: 'All statuses', options: [['active', 'Active'], ['expired', 'Expired']], match: (row, value) => expiryStatus(row) === value },
    ]}
    render={row => <>
      <td><strong className="machine">{nameFor(row)}</strong></td>
      <td>{rows(row.roles).map(role => role?.roleName && [role.roleName, role.databaseName, role.collectionName].filter(Boolean).join(' · ')).filter(Boolean).join(', ') || '—'}</td>
      <td>{Array.isArray(row.clusterIds) ? row.clusterIds.map(id => clusterNames.get(id) || id).join(', ') || 'No clusters' : 'All clusters'}</td>
      <td>{displayDate(row.expiresAt, 'Permanent')}</td><td><Badge status={expiryStatus(row)} /></td>
      <td><Actions name={nameFor(row)} options={[
        { label: 'Edit database user', run: () => setForm({ original: row }) },
        { label: 'Delete database user', danger: true, run: () => setDeleting(row) },
      ]} /></td>
    </>}>
    {form && <DatabaseUserForm original={form.original} records={records} clusters={clusters} clusterNames={clusterNames} onClose={() => setForm(null)} onSave={fields => {
      const updated = mutate(project.id, 'databaseUsers', form.original?.id, form.original ? 'database_user.updated' : 'database_user.created', fields)
      setForm(null)
      if (updated) setMessage(form.original ? 'Database user updated.' : 'Database user added.')
    }} />}
    {deleting && <Confirm title="Delete database user" label="Delete user" text={'Delete ' + nameFor(deleting) + ' from this project?'} onClose={() => setDeleting(null)} dangerous
      onConfirm={() => {
        mutate(project.id, 'databaseUsers', deleting.id, 'database_user.deleted', now => ({ status: 'deleted', deletedAt: now }))
        setDeleting(null)
        setMessage('Database user deleted.')
      }} />}
    <Feedback message={message} />
  </Inventory>
}
