import { useState } from 'react'
import { active, accessFor, personName } from './model'
import { useWorkspace } from './state'
import { Button, Confirm, Pill } from './ui'
import { Picker, RecordLink, RelationshipTable } from './relationships'

const isDirect = grant => grant.principalType === 'USER'
const isGroup = grant => grant.principalType === 'GROUP'

function canGrant(state, appId, type, principalId) {
  const app = state.applications.find(item => item.id === appId)
  if (!app || !active(app)) return false
  const target = type === 'USER'
    ? state.users.find(row => row.id === principalId && active(row))
    : state.groups.find(row => row.id === principalId)
  return target && !state.appAssignments.some(row => row.appId === appId && row.principalType === type && row.principalId === principalId)
}

function assignmentDetails(grant) {
  const { id, appId, principalType, principalId } = grant
  return { assignmentId: id, appId, principalType, principalId }
}

function Sources({ grants, groupById, available }) {
  return <div className="access-sources">
    {grants.map(grant => <span className="source-tag" key={grant.id}>
      {isDirect(grant) ? 'Direct' : 'Via ' + (groupById.get(grant.principalId)?.name || 'unavailable group')}
      {!active(grant) && ' · Inactive'}
    </span>)}
    {(!available || !grants.some(grant => active(grant) && (isDirect(grant) || groupById.has(grant.principalId)))) && <span className="access-unavailable">Access unavailable</span>}
  </div>
}

function ApplicationAssignMenu({ openPicker }) {
  return <details className="action-menu">
    <summary className="button primary">Assign <span className="chevron" aria-hidden="true" /></summary>
    <div className="menu-popover">{[['USER', 'Assign to People'], ['GROUP', 'Assign to Groups']].map(([type, caption]) =>
      <button key={type} type="button" onClick={event => {
        const menu = event.currentTarget.closest('details')
        menu.querySelector('summary').focus()
        menu.open = false
        openPicker(type)
      }}>{caption}</button>,
    )}</div>
  </details>
}

function collectAccess(state, record, kind, tab) {
  if (kind === 'apps') {
    const grants = state.appAssignments.filter(row => row.appId === record.id)
    if (tab === 'groups') return grants.filter(isGroup).map(grant => ({ id: grant.id, targetId: grant.principalId, grants: [grant], removable: grant }))
    const people = new Set(state.users.map(row => row.id))
    for (const grant of grants.filter(isDirect)) people.add(grant.principalId)
    return Array.from(people, userId => {
      const removable = grants.find(grant => isDirect(grant) && grant.principalId === userId)
      const sources = accessFor(state, userId, record.id)
      if (removable && !sources.includes(removable)) sources.unshift(removable)
      return { id: userId, targetId: userId, grants: sources, removable }
    }).filter(row => row.grants.length)
  }
  const type = kind === 'people' ? 'USER' : 'GROUP'
  const direct = state.appAssignments.filter(grant => grant.principalType === type && grant.principalId === record.id)
  const appIds = new Set(state.applications.map(row => row.id))
  for (const grant of direct) appIds.add(grant.appId)
  return Array.from(appIds, appId => {
    const removable = direct.find(grant => grant.appId === appId)
    const sources = type === 'USER' ? accessFor(state, record.id, appId) : direct.filter(grant => grant.appId === appId)
    if (removable && !sources.includes(removable)) sources.unshift(removable)
    return { id: appId, targetId: appId, grants: sources, removable }
  }).filter(row => row.grants.length)
}

export function ApplicationAssignments({ kind, record, tab }) {
  const { state, commit } = useWorkspace()
  const [assigning, setAssigning] = useState(null)
  const [removing, setRemoving] = useState(null)
  const forApp = kind === 'apps'
  const targetKind = forApp ? tab : 'apps'
  const showSources = targetKind === 'people' || kind === 'people'
  const principalType = kind === 'people' ? 'USER' : 'GROUP'
  const groups = new Map(state.groups.map(row => [row.id, row]))
  const users = new Map(state.users.map(row => [row.id, row]))
  const apps = new Map(state.applications.map(row => [row.id, row]))
  const targets = { people: users, groups, apps }[targetKind]
  const rows = collectAccess(state, record, kind, tab)

  function add(ids) {
    const type = forApp ? assigning : principalType
    const saved = commit((snapshot, meta) => {
      const selections = ids.map(id => [forApp ? record.id : id, forApp ? id : record.id])
      if (selections.some(([appId, principalId]) => !canGrant(snapshot, appId, type, principalId))) return null
      const added = selections.map(([appId, principalId]) => {
        const user = type === 'USER' ? snapshot.users.find(row => row.id === principalId) : null
        const grant = {
          id: meta.id('asg'), appId, principalType: type, principalId,
          ...(user?.username ? { appUsername: user.username } : {}), status: 'ACTIVE', ...meta.created,
        }
        meta.event('APP_ASSIGNED', 'APP_ASSIGNMENT', grant.id, assignmentDetails(grant))
        return grant
      })
      return { appAssignments: [...snapshot.appAssignments, ...added] }
    }, 'Application access assigned.')
    return saved ? undefined : 'One or more selections are no longer eligible.'
  }

  function unassign() {
    const saved = commit((snapshot, meta) => {
      const grant = snapshot.appAssignments.find(row => row.id === removing.id)
      if (!grant) return null
      meta.event('APP_UNASSIGNED', 'APP_ASSIGNMENT', grant.id, assignmentDetails(grant))
      return { appAssignments: snapshot.appAssignments.filter(row => row.id !== grant.id) }
    }, 'Application grant removed.')
    return saved ? undefined : 'This grant is no longer available.'
  }

  function pickerSettings() {
    if (!forApp) return {
      title: 'Assign Applications', search: 'Search eligible applications',
      items: state.applications.filter(row => canGrant(state, row.id, principalType, record.id)).map(row => ({
        id: row.id, name: row.name || 'Unnamed application', subtitle: row.category,
      })),
    }
    const toPeople = assigning === 'USER'
    return {
      title: toPeople ? 'Assign to People' : 'Assign to Groups',
      search: toPeople ? 'Search eligible people' : 'Search eligible groups',
      items: (toPeople ? state.users : state.groups).filter(row => canGrant(state, record.id, assigning, row.id)).map(row => ({
        id: row.id, name: toPeople ? personName(row) : row.name || 'Unnamed group',
        subtitle: toPeople ? [...new Set([row.username, row.email].filter(Boolean))].join(' · ') : row.description,
      })),
    }
  }

  const settings = assigning && pickerSettings()
  const title = { people: 'People with access', groups: 'Groups with grants', apps: 'Application access' }[targetKind]
  const targetHeader = { people: 'Person', groups: 'Group', apps: 'Application' }[targetKind]
  const canAssign = kind === 'groups' || active(record)
  const removalTarget = removing && (isDirect(removing) ? users.get(removing.principalId) : groups.get(removing.principalId))
  const removalName = removing && (isDirect(removing) && removalTarget ? personName(removalTarget) : removalTarget?.name || 'this principal')
  return <>
    <RelationshipTable title={title} rows={rows} empty="No application access records"
      actions={canAssign && (forApp ? <ApplicationAssignMenu openPicker={setAssigning} /> :
        <Button tone="primary" onClick={() => setAssigning(principalType)}>Assign Applications</Button>)}
      headers={[targetHeader, 'Status', showSources ? 'Access sources' : 'Grant', '']}>
      {row => {
        const target = targets.get(row.targetId)
        const app = forApp ? record : target
        const user = kind === 'people' ? record : targetKind === 'people' ? target : null
        const available = app && active(app) && (!showSources || (user && active(user)))
        const targetStatus = targetKind === 'groups' ? target?.source : target?.status
        const targetName = targetKind === 'people' && target ? personName(target) : target?.name
        return <tr key={row.id}>
          <td><RecordLink kind={targetKind} record={target} id={row.targetId} /></td>
          <td><Pill value={targetStatus} /></td>
          <td>{showSources ? <Sources grants={row.grants} groupById={groups} available={available} /> : <Pill value={row.grants[0].status} />}</td>
          <td>{row.removable && <Button className="button table-action" aria-label={targetName ? 'Unassign ' + targetName : 'Unassign grant'}
            onClick={() => setRemoving(row.removable)}>Unassign</Button>}</td>
        </tr>
      }}
    </RelationshipTable>
    {settings && <Picker title={settings.title} searchLabel={settings.search} items={settings.items}
      onSave={add} onClose={() => setAssigning(null)} />}
    {removing && <Confirm title="Unassign application" actionLabel="Unassign" dangerous
      description={'Remove the ' + (isDirect(removing) ? 'direct' : 'group') + ' grant for ' +
        (apps.get(removing.appId)?.name || 'this application') + ' from ' + removalName + '?'}
      onConfirm={unassign} onClose={() => setRemoving(null)} />}
  </>
}
