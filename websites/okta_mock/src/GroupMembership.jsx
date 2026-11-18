import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { directories, useRouteLink } from './routes'
import { useWorkspace } from './state'
import { label, personName } from './model'
import { Button, Confirm, Pill } from './ui'
import { Picker, RecordLink, RelationshipTable } from './relationships'

export function GroupActions({ record, onEdit }) {
  const { commit } = useWorkspace()
  const navigate = useNavigate()
  const to = useRouteLink()
  const [deleting, setDeleting] = useState(false)

  async function removeGroup() {
    const saved = await commit((state, meta) => {
      if (!state.groups.some(group => group.id === record.id && group.source === 'OKTA')) return null
      const members = state.groupMemberships.filter(row => row.groupId === record.id)
      const grants = state.appAssignments.filter(row => row.principalType === 'GROUP' && row.principalId === record.id)
      meta.event('GROUP_DELETED', 'GROUP', record.id, {
        removedMembershipIds: members.map(row => row.id), removedAssignmentIds: grants.map(row => row.id),
      })
      return {
        groups: state.groups.filter(group => group.id !== record.id),
        groupMemberships: state.groupMemberships.filter(row => !members.includes(row)),
        appAssignments: state.appAssignments.filter(row => !grants.includes(row)),
      }
    }, 'Group deleted.')
    if (!saved) return 'This group is no longer editable.'
    navigate(to(directories.groups.path))
  }

  if (record.source !== 'OKTA') return null
  return <>
    <Button onClick={onEdit}>Edit Group</Button>
    <Button tone="danger" onClick={() => setDeleting(true)}>Delete Group</Button>
    {deleting && <Confirm title="Delete group" actionLabel="Delete Group" dangerous
      description={'Permanently delete ' + record.name + ' and remove all of its memberships and application grants?'}
      onConfirm={removeGroup} onClose={() => setDeleting(false)} />}
  </>
}

function eligible(state, id, forGroup) {
  const existing = new Set(state.groupMemberships.filter(row => (forGroup ? row.groupId : row.userId) === id)
    .map(row => forGroup ? row.userId : row.groupId))
  if (forGroup) {
    const group = state.groups.find(row => row.id === id)
    if (group?.source !== 'OKTA') return []
    return state.users.filter(row => row.status !== 'DEACTIVATED' && !existing.has(row.id))
  }
  const user = state.users.find(row => row.id === id)
  if (!user || user.status === 'DEACTIVATED') return []
  return state.groups.filter(row => row.source === 'OKTA' && !existing.has(row.id))
}

export function GroupMembership({ record, forGroup }) {
  const { state, commit } = useWorkspace()
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState(null)
  const otherKind = forGroup ? 'people' : 'groups'
  const title = forGroup ? 'Members' : 'Group memberships'
  const assignTitle = forGroup ? 'Assign People' : 'Assign to Groups'
  const canAssign = forGroup ? record.source === 'OKTA' : record.status !== 'DEACTIVATED'
  const rows = state.groupMemberships.filter(row => (forGroup ? row.groupId : row.userId) === record.id)
  const groups = new Map(state.groups.map(group => [group.id, group]))
  const users = new Map(state.users.map(user => [user.id, user]))

  async function add(ids) {
    const didSave = await commit((snapshot, meta) => {
      const allowed = new Set(eligible(snapshot, record.id, forGroup).map(row => row.id))
      if (ids.some(id => !allowed.has(id))) return null
      const added = ids.map(id => {
        const membership = {
          id: meta.id('mem'), groupId: forGroup ? record.id : id, userId: forGroup ? id : record.id,
          status: 'ACTIVE', ...meta.created,
        }
        meta.event('GROUP_MEMBER_ADDED', 'GROUP_MEMBERSHIP', membership.id, { groupId: membership.groupId, userId: membership.userId })
        return membership
      })
      return { groupMemberships: [...snapshot.groupMemberships, ...added] }
    }, 'Memberships updated.')
    return didSave ? undefined : 'One or more selections are no longer eligible.'
  }

  async function remove() {
    const didSave = await commit((snapshot, meta) => {
      const membership = snapshot.groupMemberships.find(row => row.id === removing.id)
      if (!membership || !snapshot.groups.some(row => row.id === membership.groupId && row.source === 'OKTA')) return null
      const { id, groupId, userId } = membership
      meta.event('GROUP_MEMBER_REMOVED', 'GROUP_MEMBERSHIP', id, { groupId, userId })
      return { groupMemberships: snapshot.groupMemberships.filter(row => row.id !== id) }
    }, 'Membership removed.')
    return didSave ? undefined : 'This membership is no longer editable.'
  }

  return <>
    <RelationshipTable title={title} actions={canAssign && <Button tone="primary" onClick={() => setAssigning(true)}>{assignTitle}</Button>}
      headers={[forGroup ? 'Person' : 'Group', forGroup ? 'Status' : 'Source', '']} rows={rows}
      empty={forGroup ? 'No people assigned to this group' : 'No group memberships'}>
      {row => {
        const group = groups.get(row.groupId)
        const user = users.get(row.userId)
        const target = forGroup ? user : group
        const name = forGroup && user ? personName(user) : target?.name
        return <tr key={row.id}>
          <td><RecordLink kind={otherKind} record={target} id={forGroup ? row.userId : row.groupId} /></td>
          <td><Pill value={forGroup ? user?.status : group?.source} /></td>
          <td>{group?.source === 'OKTA' && <Button className="button table-action" aria-label={name ? 'Remove ' + name : 'Remove membership'}
            onClick={() => setRemoving(row)}>Remove</Button>}</td>
        </tr>
      }}
    </RelationshipTable>
    {assigning && <Picker title={assignTitle} searchLabel={forGroup ? 'Search eligible people' : 'Search eligible groups'}
      items={eligible(state, record.id, forGroup).map(row => ({
        id: row.id, name: forGroup ? personName(row) : row.name || 'Unnamed group',
        subtitle: forGroup ? [...new Set([row.username, row.email].filter(Boolean))].join(' · ') : row.description || label(row.source),
      }))} onSave={add} onClose={() => setAssigning(false)} />}
    {removing && <Confirm title="Remove membership" actionLabel="Remove" dangerous
      description={'Remove ' + (users.has(removing.userId) ? personName(users.get(removing.userId)) : 'this person') +
        ' from ' + (groups.get(removing.groupId)?.name || 'this group') + '?'}
      onConfirm={remove} onClose={() => setRemoving(null)} />}
  </>
}
