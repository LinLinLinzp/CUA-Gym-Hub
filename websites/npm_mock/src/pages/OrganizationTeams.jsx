import { useState } from 'react'
import {
  active, appendRecord, byId, created, membersOf, newId, patchRecord, records, removed, roleIn, teamsOf, updated, useStore,
} from '../store.jsx'
import { AppLink, Badge, Confirm, Empty, ErrorText, Panel, Select, Table, TextField, orgPath, packagePath, teamPath, useAppNavigate } from '../ui.jsx'
import { memberName, validName } from './organizationLabels.js'

const permissions = ['read-only', 'read-write']
const canManage = (world, orgId) => ['owner', 'admin'].includes(roleIn(world, orgId))
const memberships = (world, teamId) => records(world.teamMembers).filter(item => item.teamId === teamId && active(item))
const grantsFor = (world, teamId) => records(world.teamPackageGrants).filter(item => item.teamId === teamId && active(item))
const teamName = (team) => team.name || 'Unnamed team'

export function OrganizationTeams({ org }) {
  const { world, commit } = useStore()
  const navigate = useAppNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const teams = teamsOf(world, org.id)
  const allowed = canManage(world, org.id)

  function createTeam(event) {
    event.preventDefault()
    const clean = name.trim()
    if (!validName(clean) || clean.length > 50) {
      setError('Enter a team name of up to 50 lowercase letters, numbers, and separating hyphens.')
      return
    }
    const id = newId('team')
    const saved = commit((state, actor) => {
      if (!canManage(state, org.id) || teamsOf(state, org.id).some(team => team.name?.toLowerCase() === clean)) return state
      return appendRecord(state, 'teams', {
        id, organizationId: org.id, name: clean, description: description.trim() || null, isDefault: false,
        status: 'active', ...created(actor), removedAt: null, removedBy: null,
      })
    }, 'Team created.')
    if (saved) navigate(teamPath(org.id, id))
    else setError('That team name is already in use.')
  }

  return <Panel>
    <div className="section-head"><h2>Organization teams</h2>
      {allowed && !open && <button className="button primary" type="button" onClick={() => setOpen(true)}>Create team</button>}
    </div>
    {allowed && open && <form className="inline-form" onSubmit={createTeam} noValidate>
      <h3>New team</h3>
      <TextField label="Team name" value={name} onChange={value => { setName(value); setError('') }} placeholder="release-engineering" maxLength={50} />
      <TextField label="Team description (optional)" value={description} onChange={setDescription} maxLength={300} multiline />
      <ErrorText>{error}</ErrorText>
      <div className="actions"><button className="button primary">Create team</button>
        <button type="button" className="button" onClick={() => { setOpen(false); setName(''); setDescription(''); setError('') }}>Cancel</button></div>
    </form>}
    {teams.length ? <Table label="Organization teams table" headers={[[ 'team', 'Team' ], ['members', 'Members'], ['packages', 'Packages']]}>
      {teams.map(team => <tr key={team.id}>
        <td><AppLink className="row-main" to={teamPath(org.id, team.id)}>{teamName(team)}</AppLink>
          {team.description && <span className="row-description">{team.description}</span>}</td>
        <td>{memberships(world, team.id).length}</td><td>{grantsFor(world, team.id).length}</td>
      </tr>)}
    </Table> : <Empty title="No teams yet" />}
  </Panel>
}

function GrantEditor({ grant, name, onSave }) {
  const [permission, setPermission] = useState(grant.permission ?? '')
  return <form className="form-row nowrap" onSubmit={event => { event.preventDefault(); onSave(permission) }}>
    <Select hiddenLabel label={'Permission for ' + name} value={permission} onChange={setPermission}
      options={grant.permission ? permissions : [['', 'Choose access'], ...permissions]} />
    <button className="button compact" disabled={!permission || permission === grant.permission}>Save permission</button>
  </form>
}

export function TeamDetail({ team, org, packages }) {
  const { world, commit } = useStore()
  const navigate = useAppNavigate()
  const [memberId, setMemberId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [permission, setPermission] = useState('read-only')
  const [confirm, setConfirm] = useState(null)
  const allowed = canManage(world, org.id)
  const members = membersOf(world, org.id)
  const assignments = memberships(world, team.id)
  const grants = grantsFor(world, team.id)
  const addableMembers = members.filter(member => !assignments.some(item => item.organizationMemberId === member.id))
  const grantablePackages = packages.filter(pkg => !grants.some(item => item.packageId === pkg.id))

  function changeTeam(change, message) {
    return commit((state, actor) => {
      const currentTeam = byId(state.teams, team.id)
      if (!active(currentTeam) || currentTeam.organizationId !== org.id || !canManage(state, org.id)) return state
      return change(state, actor, currentTeam)
    }, message)
  }

  function addMember(event) {
    event.preventDefault()
    if (changeTeam((state, actor) => {
      if (!membersOf(state, org.id).some(member => member.id === memberId) ||
        memberships(state, team.id).some(item => item.organizationMemberId === memberId)) return state
      return appendRecord(state, 'teamMembers', { id: newId('tm'), teamId: team.id, organizationMemberId: memberId,
        status: 'active', ...created(actor), removedAt: null, removedBy: null })
    }, 'Team member added.')) setMemberId('')
  }

  function grantAccess(event) {
    event.preventDefault()
    if (changeTeam((state, actor) => {
      if (byId(state.packages, packageId)?.organizationId !== org.id || !permissions.includes(permission) ||
        grantsFor(state, team.id).some(item => item.packageId === packageId)) return state
      return appendRecord(state, 'teamPackageGrants', { id: newId('grant'), teamId: team.id, packageId, permission,
        status: 'active', ...created(actor), updatedAt: null, updatedBy: null, removedAt: null, removedBy: null })
    }, 'Package access granted.')) setPackageId('')
  }

  function savePermission(id, next) {
    changeTeam((state, actor) => {
      const grant = byId(state.teamPackageGrants, id)
      if (!active(grant) || grant.teamId !== team.id || !permissions.includes(next) || next === grant.permission ||
        byId(state.packages, grant.packageId)?.organizationId !== org.id) return state
      return patchRecord(state, 'teamPackageGrants', id, { permission: next, ...updated(actor) })
    }, 'Package permission updated.')
  }

  function removeAssociation(key, id, message) {
    changeTeam((state, actor) => {
      const item = byId(state[key], id)
      if (!active(item) || item.teamId !== team.id) return state
      return patchRecord(state, key, id, removed(actor))
    }, message)
    setConfirm(null)
  }

  function removeTeam() {
    const saved = changeTeam((state, actor, currentTeam) => {
      if (currentTeam.isDefault || currentTeam.name === 'developers') return state
      const patch = removed(actor)
      const removeRelated = (key) => records(state[key]).map(item => item.teamId === team.id && active(item) ? { ...item, ...patch } : item)
      return {
        ...patchRecord(state, 'teams', team.id, patch),
        teamMembers: removeRelated('teamMembers'),
        teamPackageGrants: removeRelated('teamPackageGrants'),
        organizationInvitations: records(state.organizationInvitations).map(item => item.organizationId === org.id &&
          item.teamId === team.id && item.status === 'pending' ? { ...item, teamId: null } : item),
      }
    }, 'Team removed.')
    setConfirm(null)
    if (saved) navigate(orgPath(org.id) + '/teams')
  }

  return <>
    <Panel title="Team members">
      {allowed && <form onSubmit={addMember} className="form-row form-width">
        <Select label="Organization member" value={memberId} onChange={setMemberId} disabled={!addableMembers.length}
          options={[[ '', 'Choose a member' ], ...addableMembers.map(member => [member.id, memberName(member)])]} />
        <button className="button" disabled={!memberId}>Add member</button>
      </form>}
      {assignments.length ? <Table label="Team members table" headers={[[ 'member', 'Member' ], ['role', 'Organization role'], ...(allowed ? [['action', 'Actions']] : [])]}>
        {assignments.map(item => {
          const member = members.find(record => record.id === item.organizationMemberId)
          const name = member ? memberName(member) : 'Unavailable member'
          return <tr key={item.id}>
            <td><strong className="row-main">{name}</strong>{member?.username && <code className="row-description">@{member.username}</code>}</td>
            <td><Badge value={member?.role} /></td>
            {allowed && <td><button type="button" className="button compact" onClick={() => setConfirm({ item, name })}>Remove from team</button></td>}
          </tr>
        })}
      </Table> : <Empty title="No team members yet" />}
    </Panel>
    <Panel title="Package access">
      {allowed && <form onSubmit={grantAccess} className="form-row form-width">
        <Select label="Organization package" value={packageId} onChange={setPackageId} disabled={!grantablePackages.length}
          options={[[ '', 'Choose a package' ], ...grantablePackages.map(pkg => [pkg.id, pkg.name || 'Unnamed package'])]} />
        <Select label="Package permission" value={permission} onChange={setPermission} options={[[ 'read-only', 'Read' ], 'read-write']} />
        <button className="button" disabled={!packageId}>Grant access</button>
      </form>}
      {grants.length ? <Table label="Team package grants table" headers={[[ 'pkg', 'Package' ], ['permission', 'Permission'],
        ...(allowed ? [['change', 'Change permission'], ['action', 'Actions']] : [])]}>
        {grants.map(grant => {
          const pkg = packages.find(item => item.id === grant.packageId)
          const name = pkg?.name || 'Unavailable package'
          return <tr key={grant.id}>
            <td>{pkg ? <AppLink className="row-main mono" to={packagePath(pkg.id)}>{name}</AppLink> : name}</td>
            <td><Badge value={grant.permission} /></td>
            {allowed && <><td>{pkg && <GrantEditor key={grant.id + ':' + grant.permission} grant={grant} name={name}
              onSave={next => savePermission(grant.id, next)} />}</td>
              <td><button type="button" className="button compact" onClick={() => setConfirm({ grant, name })}>Remove access</button></td></>}
          </tr>
        })}
      </Table> : <Empty title="No package access granted" />}
    </Panel>
    {allowed && <Panel title="Team settings">
      {team.isDefault || team.name === 'developers' ? <p className="muted">The default developers team is protected.</p> :
        <div className="actions"><button type="button" className="button danger" onClick={() => setConfirm({ team: true })}>Remove team</button></div>}
    </Panel>}
    {confirm?.item && <Confirm title="Remove from team?" action="Confirm removal" onClose={() => setConfirm(null)}
      onConfirm={() => removeAssociation('teamMembers', confirm.item.id, 'Team member removed.')}>
      <p><strong>{confirm.name}</strong> will lose access granted through this team.</p>
    </Confirm>}
    {confirm?.grant && <Confirm title="Remove package access?" action="Confirm removal" onClose={() => setConfirm(null)}
      onConfirm={() => removeAssociation('teamPackageGrants', confirm.grant.id, 'Package access removed.')}>
      <p>This team will lose access to <code>{confirm.name}</code>.</p>
    </Confirm>}
    {confirm?.team && <Confirm title="Remove team?" action="Confirm team removal" onClose={() => setConfirm(null)} onConfirm={removeTeam}>
      <p>Removing <strong>{teamName(team)}</strong> will remove its team assignments and package grants.</p>
      <p>Pending invitations will stay open without an initial team.</p>
    </Confirm>}
  </>
}
