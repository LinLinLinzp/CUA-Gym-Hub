import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  active, appendRecord, byId, created, membersOf, newId, patchRecord, records, removed, roleIn, teamsOf, updated, useStore,
} from '../store.jsx'
import { Badge, Confirm, Empty, ErrorText, Panel, Select, Table, TextField, dateLabel } from '../ui.jsx'
import { memberName } from './organizationLabels.js'

const roles = ['owner', 'admin', 'member']

function lastOwner(world, member) {
  return member.role === 'owner' && membersOf(world, member.organizationId).filter(item => item.role === 'owner').length <= 1
}

function MemberRole({ member, onSave }) {
  const [role, setRole] = useState(member.role ?? '')
  return <form className="form-row nowrap" onSubmit={event => { event.preventDefault(); onSave(role) }}>
    <Select hiddenLabel label={'Role for ' + memberName(member)} value={role} onChange={setRole}
      options={member.role ? roles : [['', 'Choose role'], ...roles]} />
    <button className="button compact" disabled={!role || role === member.role}>Save role</button>
  </form>
}

const normalizeInvitee = (value) => value.trim().toLowerCase().replace(/^@/, '')
const validInvitee = (value) => /^[a-z0-9][a-z0-9._-]*$/.test(value) || /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value)

export function OrganizationMembers({ org }) {
  const { world, commit } = useStore()
  const { search } = useLocation()
  const [showInvite, setShowInvite] = useState(() => new URLSearchParams(search).has('invite'))
  const [invitee, setInvitee] = useState('')
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const owner = roleIn(world, org.id) === 'owner'
  const members = membersOf(world, org.id)
  const teams = teamsOf(world, org.id)
  const invitations = records(world.organizationInvitations).filter(item => item.organizationId === org.id && item.status === 'pending')

  function invite(event) {
    event.preventDefault()
    const name = normalizeInvitee(invitee)
    if (!validInvitee(name)) {
      setError('Enter a valid username or email address.')
      return
    }
    const saved = commit((state, actor) => {
      if (roleIn(state, org.id) !== 'owner' || (teamId && !teamsOf(state, org.id).some(team => team.id === teamId))) return state
      if (membersOf(state, org.id).some(member => [member.username, member.email].some(value => value && normalizeInvitee(value) === name)) ||
        records(state.organizationInvitations).some(item => item.organizationId === org.id && item.status === 'pending' &&
          item.invitee && normalizeInvitee(item.invitee) === name)) return state
      return appendRecord(state, 'organizationInvitations', { id: newId('inv'), organizationId: org.id, invitee: name,
        teamId: teamId || null, status: 'pending', ...created(actor), revokedAt: null, revokedBy: null })
    }, 'Invitation created.')
    if (saved) { setInvitee(''); setTeamId(''); setError(''); setShowInvite(false) }
    else setError('This person is already a member or has a pending invitation. Choose an active team if one is selected.')
  }

  function saveRole(id, role) {
    commit((state, actor) => {
      const member = byId(state.organizationMembers, id)
      if (roleIn(state, org.id) !== 'owner' || !active(member) || member.organizationId !== org.id ||
        !roles.includes(role) || member.role === role || lastOwner(state, member)) return state
      return patchRecord(state, 'organizationMembers', id, { role, ...updated(actor) })
    }, 'Member role updated.')
  }

  function revokeInvitation(id) {
    commit((state, actor) => {
      const invitation = byId(state.organizationInvitations, id)
      if (roleIn(state, org.id) !== 'owner' || invitation?.organizationId !== org.id || invitation.status !== 'pending') return state
      return patchRecord(state, 'organizationInvitations', id, { status: 'revoked', revokedAt: actor.at, revokedBy: actor.by })
    }, 'Invitation revoked.')
    setConfirm(null)
  }

  function removeMember(id) {
    commit((state, actor) => {
      const member = byId(state.organizationMembers, id)
      if (roleIn(state, org.id) !== 'owner' || !active(member) || member.organizationId !== org.id || lastOwner(state, member)) return state
      const patch = removed(actor)
      return {
        ...patchRecord(state, 'organizationMembers', id, patch),
        teamMembers: records(state.teamMembers).map(assignment => assignment.organizationMemberId === id && active(assignment)
          ? { ...assignment, ...patch } : assignment),
      }
    }, 'Organization member removed.')
    setConfirm(null)
  }

  return <>
    <Panel>
      <div className="section-head"><h2>Active members</h2>
        {owner && !showInvite && <button className="button primary" type="button" onClick={() => setShowInvite(true)}>Invite member</button>}
      </div>
      {owner && showInvite && <form className="inline-form" onSubmit={invite} noValidate>
        <h3>Invite a member</h3>
        <div className="form-row">
          <TextField label="Username or email" value={invitee} onChange={value => { setInvitee(value); setError('') }} maxLength={254} />
          <Select label="Initial team (optional)" value={teamId} onChange={setTeamId} options={[[ '', 'No team' ], ...teams.map(team => [team.id, team.name || 'Unnamed team'])]} />
          <button className="button primary">Send invitation</button>
          <button className="button" type="button" onClick={() => { setShowInvite(false); setInvitee(''); setTeamId(''); setError('') }}>Cancel</button>
        </div>
        <ErrorText>{error}</ErrorText>
      </form>}
      {members.length ? <Table label="Active members table" headers={[
        ['member', 'Member'], ['role', 'Role'], ...(owner ? [['change', 'Change role'], ['actions', 'Actions']] : []),
      ]}>
        {members.map(member => {
          const locked = lastOwner(world, member)
          return <tr key={member.id}>
            <td><strong className="row-main">{memberName(member)}</strong>
              {member.username && <code className="row-description">@{member.username}</code>}</td>
            <td><Badge value={member.role} /></td>
            {owner && <><td>{locked ? <span className="muted">Last owner</span> : <MemberRole key={member.id + ':' + member.role}
              member={member} onSave={role => saveRole(member.id, role)} />}</td>
              <td>{!locked && <button className="button compact" type="button" onClick={() => setConfirm({ member })}>Remove member</button>}</td></>}
          </tr>
        })}
      </Table> : <Empty title="No active members" />}
    </Panel>
    <Panel title="Pending invitations" description="Invitations remain pending until the recipient accepts.">
      {invitations.length ? <Table label="Pending invitations table" headers={[
        ['invitee', 'Invitee'], ['team', 'Initial team'], ['date', 'Invited'], ['status', 'Status'], ...(owner ? [['actions', 'Actions']] : []),
      ]}>
        {invitations.map(item => <tr key={item.id}>
          <td><strong className="row-main">{item.invitee || 'Unavailable invitee'}</strong></td>
          <td>{teams.find(team => team.id === item.teamId)?.name || '—'}</td>
          <td>{dateLabel(item.createdAt)}</td><td><Badge value="pending" /></td>
          {owner && <td><button className="button compact" type="button" onClick={() => setConfirm({ invitation: item })}>Revoke invitation</button></td>}
        </tr>)}
      </Table> : <Empty title="No pending invitations" />}
    </Panel>
    {confirm?.member && <Confirm title="Remove member?" action="Confirm removal" onClose={() => setConfirm(null)} onConfirm={() => removeMember(confirm.member.id)}>
      <p><strong>{memberName(confirm.member)}</strong> will lose membership and their team assignments.</p>
    </Confirm>}
    {confirm?.invitation && <Confirm title="Revoke invitation?" action="Confirm revocation" onClose={() => setConfirm(null)} onConfirm={() => revokeInvitation(confirm.invitation.id)}>
      <p>The invitation to <strong>{confirm.invitation.invitee}</strong> will be revoked.</p>
    </Confirm>}
  </>
}
