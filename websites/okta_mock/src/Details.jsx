import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { directories, Missing, useRouteLink } from './routes'
import { useWorkspace } from './state'
import { label, personName, recordPath } from './model'
import { Button, Confirm, PageHeader, Pill, Tile } from './ui'
import { profileFields, RecordForm } from './RecordForm'

import { GroupActions, GroupMembership } from './GroupMembership'

import { ApplicationAssignments } from './ApplicationAssignments'

const tabs = {
  people: [['profile', 'Profile'], ['groups', 'Groups'], ['applications', 'Applications']],
  groups: [['members', 'Members'], ['applications', 'Applications']],
  apps: [['people', 'People'], ['groups', 'Groups']],
}
const transitions = {
  ACTIVE: [['Suspend', 'SUSPENDED'], ['Deactivate', 'DEACTIVATED']],
  STAGED: [['Activate', 'ACTIVE'], ['Deactivate', 'DEACTIVATED']],
  SUSPENDED: [['Unsuspend', 'ACTIVE'], ['Deactivate', 'DEACTIVATED']],
  DEACTIVATED: [['Activate', 'ACTIVE'], ['Delete', null]],
}

function Profile({ record }) {
  return <section className="panel profile-panel">
    <h2>Profile details</h2>
    <dl>{profileFields.map(([key, caption]) => <div key={key}><dt>{caption}</dt><dd>{record[key] || '—'}</dd></div>)}</dl>
  </section>
}

function PersonActions({ record, name, onEdit }) {
  const { commit } = useWorkspace()
  const navigate = useNavigate()
  const to = useRouteLink()
  const [pending, setPending] = useState(null)

  async function confirm() {
    const [action, status] = pending
    const saved = await commit((state, meta) => {
      const person = state.users.find(item => item.id === record.id)
      if (!person || !(transitions[person.status] || []).some(([allowed]) => allowed === action)) return null
      const previousStatus = person.status
      if (status) {
        meta.event('USER_STATUS_CHANGED', 'USER', person.id, { previousStatus, status })
        return { users: state.users.map(item => item.id === person.id ? { ...item, ...meta.updated, status } : item) }
      }
      const members = state.groupMemberships.filter(row => row.userId === person.id)
      const grants = state.appAssignments.filter(row => row.principalType === 'USER' && row.principalId === person.id)
      meta.event('USER_DELETED', 'USER', person.id, {
        previousStatus, removedMembershipIds: members.map(row => row.id), removedAssignmentIds: grants.map(row => row.id),
      })
      return {
        users: state.users.filter(item => item.id !== person.id),
        groupMemberships: state.groupMemberships.filter(row => !members.includes(row)),
        appAssignments: state.appAssignments.filter(row => !grants.includes(row)),
      }
    }, status ? 'Account status updated.' : 'Person deleted.')
    if (!saved) return 'This action is no longer available.'
    if (!status) navigate(to(directories.people.path))
  }

  return <>
    <Button onClick={onEdit}>Edit Profile</Button>
    <details className="action-menu">
      <summary className="button">Actions <span className="chevron" aria-hidden="true" /></summary>
      <div className="menu-popover">
        {(transitions[record.status] || []).map(([action, status]) => <button key={action} type="button"
          onClick={event => {
            event.currentTarget.closest('details').querySelector('summary').focus()
            event.currentTarget.closest('details').open = false
            setPending([action, status])
          }}>{action}</button>)}
        {!transitions[record.status] && <span>No account actions available</span>}
      </div>
    </details>
    {pending && <Confirm
      title={pending[0] + ' person'} actionLabel={pending[0]}
      description={pending[1] ? 'Change ' + name + '’s status to ' + label(pending[1]).toLowerCase() + '?' : 'Permanently delete ' + name + ' and remove their memberships and direct application grants?'}
      dangerous={pending[0] === 'Delete' || pending[0] === 'Deactivate'}
      onConfirm={confirm} onClose={() => setPending(null)}
    />}
  </>
}

function RecordDetails({ kind, record, section }) {
  const to = useRouteLink()
  const { search } = useLocation()
  const [editing, setEditing] = useState(false)
  const person = kind === 'people'
  const name = person ? personName(record) : record.name || 'Unnamed record'
  const path = recordPath(section.path, record.id)
  const requested = new URLSearchParams(search).get('tab')
  const tab = tabs[kind].some(([value]) => value === requested) ? requested : tabs[kind][0][0]
  const info = person ? record.username : record.description || record.category
  return <>
    <Link className="back-link" to={to(section.path)}><span aria-hidden="true">←</span> {section.title}</Link>
    <PageHeader title={name} leading={<Tile kind={kind} value={name} category={record.category} />}
      subtitle={<>{info && <span>{info}</span>}<Pill value={record.status || record.source} /></>}>
      {person && <PersonActions record={record} name={name} onEdit={() => setEditing(true)} />}
      {kind === 'groups' && <GroupActions record={record} onEdit={() => setEditing(true)} />}
    </PageHeader>
    {kind === 'apps' && <h2 className="assignment-heading">Assignments</h2>}
    <nav className="tabs" aria-label={kind === 'apps' ? 'Assignment views' : 'Record views'}>
      {tabs[kind].map(([value, caption]) => <Link key={value} aria-current={tab === value ? 'page' : undefined} to={to(path, value)}>{caption}</Link>)}
    </nav>
    {person && tab === 'profile' && <Profile record={record} />}
    {(kind === 'groups' && tab === 'members' || person && tab === 'groups') && <GroupMembership key={tab} record={record} forGroup={kind === 'groups'} />}
    {(kind === 'apps' || tab === 'applications') && <ApplicationAssignments key={tab} kind={kind} record={record} tab={tab} />}
    {editing && <RecordForm kind={kind} record={record} onClose={() => setEditing(false)} />}
  </>
}

export function Details({ kind }) {
  const { id } = useParams()
  const { state } = useWorkspace()
  const section = directories[kind]
  const record = state[section.collection].find(item => item.id === id)
  if (!record) return <Missing section={section} />
  return <RecordDetails key={id} kind={kind} record={record} section={section} />
}
