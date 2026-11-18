import React, { useState } from 'react'
import { Button, Confirm, Dialog, Field, Filter, Heading, Pill, RowActions, Search, Select, Table } from '../components.jsx'
import { principalTypes, roles } from '../data/catalog.js'
import { active, contains, rows, uid, useWorkspace } from '../workspace.jsx'

const roleName = id => roles[id] || id || 'Unknown role'
const emailKey = value => String(value ?? '').trim().toLowerCase()
const identity = (type, email) => JSON.stringify([type || '', emailKey(email)])

function RolePicker({ selected, onChange, available, inherited = [] }) {
  const [query, setQuery] = useState('')
  const matches = available.filter(id => contains(roleName(id), query) || contains(id, query))
  return <fieldset className="role-picker"><legend>Roles</legend>
    <Search label="Search roles" value={query} onChange={setQuery} />
    <div className="role-options">
      {matches.map(id => <label className="check-option" key={id}><input type="checkbox" checked={selected.includes(id)}
        onChange={e => onChange(e.target.checked ? [...selected, id] : selected.filter(role => role !== id))} />
        <span>{roleName(id)}<small className="subtext">{id}</small></span>
      </label>)}
      {!matches.length && <p className="muted">No matching roles.</p>}
    </div>
    {inherited.length > 0 && <div className="inherited"><h3>Inherited roles</h3>
      {inherited.map(r => <div key={r.id}><Pill>{roleName(r.roleId)}</Pill> <small>{r.sourceName || 'Inherited access'}</small></div>)}</div>}
  </fieldset>
}

function AccessForm({ project, group, onClose }) {
  const { transact } = useWorkspace()
  const [type, setType] = useState(group?.type || 'user')
  const [email, setEmail] = useState(group?.email || '')
  const direct = group?.bindings.filter(r => r.source !== 'inherited') || []
  const inherited = group?.bindings.filter(r => r.source === 'inherited') || []
  const [selection, setSelection] = useState(() => [...new Set(direct.map(r => r.roleId))])
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(false)
  const removed = direct.filter(r => !selection.includes(r.roleId))
  const additions = selection.filter(id => !direct.some(r => r.roleId === id))
  const available = [...new Set([...Object.keys(roles), ...direct.map(r => r.roleId)])]
    .filter(id => id && (!inherited.some(r => r.roleId === id) || direct.some(r => r.roleId === id)))

  function save(approved = false) {
    const principal = emailKey(email)
    const failures = {}
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(principal)) failures.email = 'Enter a valid email address.'
    if (!group && !selection.length) failures.roles = 'Select at least one role.'
    setErrors(failures)
    if (Object.keys(failures).length) return
    if (removed.length === 1 && !approved) { setConfirm(true); return }
    if (!additions.length && !removed.length) { onClose(); return }
    let error
    const changed = transact((state, { creation, update, event }) => {
      const bindings = rows(state.iamBindings)
      const duplicates = additions.filter(roleId => bindings.some(r => active(r) && r.projectId === project.id &&
        identity(r.principalType, r.principal) === identity(type, principal) && r.roleId === roleId))
      if (duplicates.length) {
        error = 'Already granted: ' + duplicates.map(roleName).join(', ') + '.'
        return
      }
      const removeIds = new Set(removed.map(r => r.id))
      const next = bindings.map(r => {
        if (!removeIds.has(r.id) || !active(r) || r.source === 'inherited') return r
        event('iam.revoke', r.id, { projectId: project.id }, { principal: r.principal, roleId: r.roleId, status: 'revoked' })
        return { ...r, status: 'revoked', ...update }
      })
      for (const roleId of additions) {
        const id = uid('iam')
        next.push({ id, projectId: project.id, principalType: type, principal, roleId, source: 'direct', status: 'active', ...creation })
        event('iam.grant', id, { projectId: project.id }, { principal, roleId, status: 'active' })
      }
      return { ...state, iamBindings: next }
    }, group ? 'Project access updated.' : 'Project access granted.')
    if (changed) onClose()
    else if (error) { setConfirm(false); setErrors({ roles: error }) }
  }

  return <>
    <Dialog title={group ? 'Edit access' : 'Grant access'} onClose={onClose} submit={() => save()} submitLabel={group ? 'Save changes' : 'Grant access'}>
      <p className="muted">Project · {project.record?.name || project.id}</p>
      {group ? <p><strong>{group.email || 'Unknown principal'}</strong><small className="subtext">{principalTypes[group.type] || group.type}</small></p> : <>
        <Field label="Principal type"><Select options={principalTypes} value={type} onChange={e => setType(e.target.value)} /></Field>
        <Field label="Principal email" type="email" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} autoComplete="off" />
      </>}
      <RolePicker available={available} inherited={inherited} selected={selection} onChange={setSelection} />
      {(errors.roles || (group && errors.email)) && <p role="alert" className="error">{errors.roles || errors.email}</p>}
    </Dialog>
    {confirm && <Confirm title="Revoke role" onClose={() => setConfirm(false)} submit={() => save(true)} submitLabel="Revoke role" danger>
      <p>Remove <strong>{roleName(removed[0]?.roleId)}</strong> from <strong>{group.email}</strong>?</p>
    </Confirm>}
  </>
}

function RevokeForm({ project, binding, onClose }) {
  const { transact } = useWorkspace()
  function revoke() {
    transact((state, { update, event }) => {
      const bindings = rows(state.iamBindings)
      const record = bindings.find(r => r.id === binding.id && active(r) && r.source !== 'inherited')
      if (!record) return
      event('iam.revoke', record.id, { projectId: project.id }, { principal: record.principal, roleId: record.roleId, status: 'revoked' })
      return { ...state, iamBindings: bindings.map(r => r.id === record.id ? { ...r, status: 'revoked', ...update } : r) }
    }, 'Role revoked.')
    onClose()
  }
  return <Confirm title="Revoke role" onClose={onClose} submit={revoke} submitLabel="Revoke role" danger>
    <p>Remove <strong>{roleName(binding.roleId)}</strong> from <strong>{binding.principal}</strong>?</p>
  </Confirm>
}

export function IAM({ project }) {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [dialog, setDialog] = useState(null)
  const grouped = new Map()
  for (const binding of rows(state.iamBindings)) {
    if (project.id && binding.projectId === project.id && active(binding)) {
      const key = identity(binding.principalType, binding.principal)
      const group = grouped.get(key) || { id: key, type: binding.principalType, email: binding.principal, bindings: [] }
      group.bindings.push(binding)
      grouped.set(key, group)
    }
  }
  const data = [...grouped.values()].filter(group => (!type || group.type === type) &&
    (contains(group.email, query) || group.bindings.some(r => contains(roleName(r.roleId), query) || contains(r.roleId, query))))
  return <>
    <Heading title="IAM" description="Manage which principals have access to this project."
      action={<Button variant="primary" disabled={!project.record} onClick={() => setDialog({})}>Grant access</Button>} />
    <Table label="IAM principals" data={data} filterKey={JSON.stringify([query, type])} filtered={!!(query.trim() || type) && grouped.size > 0}
      empty={project.record ? 'No principals have access to this project.' : 'Select an available project to view access.'}
      filters={<><Search label="Search by principal or role" value={query} onChange={setQuery} />
        <Filter label="Principal type" options={principalTypes} value={type} onChange={setType} /></>}
      columns={[
        { key: 'email', label: 'Principal', sort: r => r.email, cell: r => <button type="button" className="text-link" disabled={!project.record} onClick={() => setDialog({ group: r })}>{r.email || 'Unknown principal'}</button> },
        { key: 'type', label: 'Type', sort: r => principalTypes[r.type] || r.type, cell: r => principalTypes[r.type] || r.type || '—' },
        { key: 'roles', label: 'Roles', sort: r => r.bindings.map(b => roleName(b.roleId)).sort().join(', '),
          cell: r => <div className="chips">{r.bindings.map(b => <Pill key={b.id} tone={b.source === 'inherited' ? '' : 'indigo'}>
            {roleName(b.roleId)}{b.source === 'inherited' && <small title={b.sourceName}> · Inherited</small>}</Pill>)}</div> },
        { key: 'actions', label: 'Actions', align: 'actions-cell', cell: r => project.record && <RowActions label={'Actions for ' + r.email} actions={[
          ['Edit access', () => setDialog({ group: r })],
          ...r.bindings.filter(b => b.source !== 'inherited').map(b => ['Revoke ' + roleName(b.roleId), () => setDialog({ binding: b }), true]),
        ]} /> },
      ]} />
    {dialog && (dialog.binding ? <RevokeForm project={project} binding={dialog.binding} onClose={() => setDialog(null)} />
      : <AccessForm project={project} group={dialog.group} onClose={() => setDialog(null)} />)}
  </>
}
