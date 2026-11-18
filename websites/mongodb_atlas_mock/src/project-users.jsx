import { useState } from 'react'
import { Actions, Badge, Confirm, Feedback, Field, Inventory, Modal, displayDate, searchText } from './components.jsx'
import { rows, scoped, useWorkspace } from './workspace.jsx'

const roles = [
  ['GROUP_READ_ONLY', 'Project Read Only'], ['GROUP_CLUSTER_MANAGER', 'Project Cluster Manager'],
  ['GROUP_DATA_ACCESS_READ_ONLY', 'Project Data Access Read Only'], ['GROUP_OWNER', 'Project Owner'],
]
const roleNames = Object.fromEntries(roles)
const nameFor = row => row.email || row.name || row.id

function ProjectUserForm({ original, records, onClose, onSave }) {
  const [email, setEmail] = useState(original?.email ?? '')
  const [selected, setSelected] = useState(rows(original?.roles))
  const [errors, setErrors] = useState({})
  const options = [...roles, ...rows(original?.roles).filter(role => !roleNames[role]).map(role => [role, role])]
  function submit() {
    const address = email.trim().toLowerCase()
    const next = {}
    if (!original && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) next.email = 'Enter a valid email address.'
    else if (!original && records.some(row => row.email?.trim().toLowerCase() === address)) next.email = 'This address already has access or a pending invitation.'
    if (!selected.length) next.roles = 'Select at least one project role.'
    setErrors(next)
    if (!Object.keys(next).length) onSave(address, selected)
  }

  return <Modal sheet title={original ? 'Edit project roles' : 'Grant access'} onClose={onClose} onSubmit={submit} submitLabel={original ? 'Save roles' : 'Grant access'}>
    {original ? <p>{nameFor(original)}</p> : <Field label="Email address" error={errors.email}>{props => <input {...props} type="email" autoFocus value={email} onChange={event => { setEmail(event.target.value); setErrors({ ...errors, email: undefined }) }} />}</Field>}
    <fieldset><legend>Project roles</legend>
      <div className="checklist">{options.map(([id, label]) => <label className="checkbox" key={id}>
        <input type="checkbox" checked={selected.includes(id)} onChange={event => {
          setSelected(event.target.checked ? [...selected, id] : selected.filter(role => role !== id))
          setErrors({ ...errors, roles: undefined })
        }} />{label}
      </label>)}</div>
      {errors.roles && <p className="field-error" role="alert">{errors.roles}</p>}
    </fieldset>
  </Modal>
}

export function ProjectUsers() {
  const { state, project, mutate } = useWorkspace()
  const [form, setForm] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [message, setMessage] = useState('')
  const records = scoped(state, 'projectUsers', project.id).filter(row => row.status !== 'removed')
  const cancelling = removing?.status === 'pending'
  const removeLabel = cancelling ? 'Cancel invitation' : 'Remove access'

  function grant(email, selected) {
    const member = rows(state.organizationMembers).find(row => row && row.organizationId === (project.organizationId || state.organization?.id) && row.email?.trim().toLowerCase() === email)
    const action = member ? 'project_user.granted' : 'project_user.invited'
    mutate(project.id, 'projectUsers', null, action, now => ({
      email, roles: selected, status: member ? 'active' : 'pending',
      ...(member?.name && { name: member.name }),
      ...(!member && { invitedAt: now, expiresAt: new Date(new Date(now).getTime() + 30 * 86400000).toISOString() }),
    }))
    setMessage(member ? 'Project access granted.' : 'Invitation recorded.')
  }

  return <Inventory title="Project Access" description="Manage project members, invitations and roles."
    addLabel="Grant access" onAdd={() => setForm({})} records={records}
    columns={['Name / email', 'Project roles', 'Status', 'Invitation expiry', 'Actions']}
    searchLabel="Search by name or email" search={row => searchText(row.name, row.email)} name={nameFor}
    filters={[
      { label: 'Role', placeholder: 'All roles', options: roles, match: (row, value) => rows(row.roles).includes(value) },
      { label: 'Status', placeholder: 'All statuses', options: [['active', 'Active'], ['pending', 'Pending']], match: (row, value) => row.status === value },
    ]}
    render={row => <>
      <td>{row.name ? <><strong>{row.name}</strong><small className="muted">{row.email}</small></> : <strong>{nameFor(row)}</strong>}</td>
      <td>{rows(row.roles).map(role => roleNames[role] || role).join(', ') || '—'}</td><td><Badge status={row.status} /></td>
      <td>{displayDate(row.expiresAt)}</td>
      <td><Actions name={nameFor(row)} options={[
        { label: 'Edit project roles', run: () => setForm({ original: row }) },
        { label: row.status === 'pending' ? 'Cancel invitation' : 'Remove access', danger: true, run: () => setRemoving(row) },
      ]} /></td>
    </>}>
    {form && <ProjectUserForm original={form.original} records={records} onClose={() => setForm(null)} onSave={(email, selected) => {
      if (form.original) {
        const old = rows(form.original.roles)
        if ((old.length !== selected.length || selected.some(role => !old.includes(role))) &&
          mutate(project.id, 'projectUsers', form.original.id, 'project_user.roles_updated', { roles: selected })) setMessage('Project roles updated.')
      } else grant(email, selected)
      setForm(null)
    }} />}
    {removing && <Confirm title={removeLabel} label={removeLabel} text={cancelling ? 'Cancel the invitation for ' + nameFor(removing) + '?' : 'Remove ' + nameFor(removing) + ' from this project?'}
      onClose={() => setRemoving(null)} dangerous onConfirm={() => {
        mutate(project.id, 'projectUsers', removing.id, cancelling ? 'project_user.invite_cancelled' : 'project_user.removed',
          now => ({ status: 'removed', removedAt: now }))
        setRemoving(null)
        setMessage(cancelling ? 'Invitation cancelled.' : 'Project access removed.')
      }} />}
    <Feedback message={message} />
  </Inventory>
}
