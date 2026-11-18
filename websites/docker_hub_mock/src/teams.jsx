import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { actions } from './actions.js'
import {
  alphabetical, byId, current, label, matches, organizationUsers, permissionNames, qualified, repoPath, teamPath,
} from './model.js'
import { useStore } from './store.jsx'
import { ActionLink, Dialog, Empty, ErrorText, Field, FormActions, Icon, LocalLink, Page, Search, Select, Table, useLocalNavigate } from './ui.jsx'

const section = 'Teams'
const organizations = state => current(state, 'namespaces').filter(namespace => namespace.type === 'organization')

function initialOrganization(state, choices, requested) {
  return choices.find(namespace => namespace.id === requested)?.id
    ?? choices.find(namespace => namespace.id === state.account?.defaultNamespaceId)?.id
    ?? choices[0]?.id ?? ''
}

export function TeamIndex() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const choices = organizations(state)
  const namespaceId = initialOrganization(state, choices, params.get('organization'))
  const namespace = choices.find(item => item.id === namespaceId)
  const query = params.get('q') ?? ''
  const teams = current(state, 'teams').filter(team => team.namespaceId === namespaceId).sort(alphabetical)
  const visible = teams.filter(team => matches(query, team.name, team.description))
  const memberships = current(state, 'teamMemberships')
  const grants = current(state, 'repositoryPermissions')
  const createPath = namespaceId ? `/teams/new?organization=${encodeURIComponent(namespaceId)}` : '/teams/new'
  function setFilter(key, value) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  return <Page section={section} title={section} context={namespace && label(namespace)}
    description="Manage organization members and their repository access."
    action={namespace && <ActionLink to={createPath}>Create team</ActionLink>}>
    <div className="filters">
      <Search label="Search teams" value={query} onChange={value => setFilter('q', value)} placeholder="Name or description" />
      <Select label="Organization" value={namespaceId} onChange={value => setFilter('organization', value)}
        options={choices.length ? choices.map(item => [item.id, label(item)]) : [['', 'No organizations available']]} />
    </div>
    {visible.length ? <>
      <div className="results-label" role="status">{visible.length} {visible.length === 1 ? 'team' : 'teams'}</div>
      <Table headers={['Team', 'Members', 'Repository grants']}>
        {visible.map(team => <tr key={team.id}>
          <td><div className="object-cell">
            <span className="object-icon"><Icon name="team" size={17} /></span>
            <span className="object-label"><LocalLink className="mono object" to={teamPath(team)}>{team.name}</LocalLink>
              {team.description && <small>{team.description}</small>}</span>
          </div></td>
          <td className="numeric">{memberships.filter(member => member.teamId === team.id).length}</td>
          <td className="numeric">{grants.filter(grant => grant.teamId === team.id).length}</td>
        </tr>)}
      </Table>
    </> : <Empty title={!namespace ? 'No organizations available' : teams.length ? 'No matching teams' : 'No teams yet'} icon="team">
      {namespace && (teams.length ? <button type="button" onClick={() => setFilter('q', '')}>Clear search</button> :
        <ActionLink to={createPath}>Create team</ActionLink>)}
    </Empty>}
  </Page>
}

export function TeamCreate() {
  const { state, commit, announce } = useStore()
  const [params] = useSearchParams()
  const navigate = useLocalNavigate()
  const choices = organizations(state)
  const [namespaceId, setNamespace] = useState(() => initialOrganization(state, choices, params.get('organization')))
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    try {
      const team = commit('team.created', actions.createTeam({ namespaceId, name, description }))
      announce('Team created.')
      navigate(teamPath(team))
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <Page section={section} title="Create team" trail={[{ name: 'Create team' }]}>
    <form className="panel form" onSubmit={submit}>
      <Select label="Organization" value={namespaceId} onChange={setNamespace}
        options={choices.length ? choices.map(item => [item.id, label(item)]) : [['', 'No organizations available']]} />
      <TeamFields name={name} setName={setName} description={description} setDescription={setDescription} />
      <ErrorText error={error} />
      <FormActions to="/teams" label="Create team" disabled={!namespaceId} />
    </form>
  </Page>
}

function TeamFields({ name, setName, description, setDescription }) {
  return <>
    {setName && <Field label="Team name" value={name} onChange={setName}
      hint="2–64 lowercase letters, digits, hyphens, or underscores." />}
    <Field label="Description" value={description} onChange={setDescription} multiline rows={4} />
  </>
}

export function TeamDetail() {
  const { state } = useStore()
  const { teamId } = useParams()
  const team = byId(state, 'teams', teamId)
  if (!team) return <Page section={section} title="Team unavailable">
    <Empty title="This team could not be opened" icon="team"><LocalLink to="/teams">Browse teams</LocalLink></Empty>
  </Page>
  const namespace = byId(state, 'namespaces', team.namespaceId)
  return <Page section={section} title={team.name} trail={[{ name: team.name }]}
    context={namespace && label(namespace)} description={namespace && label(namespace)}>
    <TeamPanels key={team.id} team={team} />
  </Page>
}

function TeamPanels({ team }) {
  const { state, commit, announce } = useStore()
  const navigate = useLocalNavigate()
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')
  const memberships = current(state, 'teamMemberships').filter(row => row.teamId === team.id)
  const grants = current(state, 'repositoryPermissions').filter(row => row.teamId === team.id)
  const users = new Map(current(state, 'users').map(user => [user.id, user]))
  const directory = `/teams?organization=${encodeURIComponent(team.namespaceId ?? '')}`
  function save(event) {
    event.preventDefault()
    try {
      const changed = commit('team.updated', actions.updateTeam(team.id, description))
      setEditing(false)
      if (changed) announce('Team description saved.')
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <div className="stack">
    <section className="panel">
      <div className="section-head"><h2>Team information</h2>
        {!editing && <button type="button" onClick={() => {
          setDescription(team.description ?? '')
          setError('')
          setEditing(true)
        }}>Edit description</button>}
      </div>
      {editing ? <form className="form" onSubmit={save}>
        <TeamFields description={description} setDescription={setDescription} />
        <ErrorText error={error} />
        <FormActions onCancel={() => setEditing(false)} />
      </form> : <p className="prose">{team.description || '—'}</p>}
    </section>
    <section className="stack">
      <div className="section-head"><h2>Members <span className="count">{memberships.length}</span></h2>
        <button type="button" className="primary" onClick={() => setAdding(true)}><Icon name="plus" />Add member</button>
      </div>
      {memberships.length ? <Table headers={['Name', 'Docker ID', 'Email', 'Actions']}>
        {memberships.map(row => {
          const user = users.get(row.userId)
          return <tr key={row.id}>
            <td>{user?.displayName || user?.username || 'Unavailable member'}</td>
            <td className="mono">{user?.username || '—'}</td><td>{user?.email || '—'}</td>
            <td><button type="button" onClick={() => setRemoving(row)}>Remove member</button></td>
          </tr>
        })}
      </Table> : <Empty title="No team members" icon="team"><p>Add an existing organization member to this team.</p></Empty>}
    </section>
    <section className="stack">
      <div className="section-head"><h2>Repository access <span className="count">{grants.length}</span></h2></div>
      {grants.length ? <Table headers={['Repository', 'Permission']}>
        {grants.map(row => {
          const repository = byId(state, 'repositories', row.repositoryId)
          const namespace = repository && byId(state, 'namespaces', repository.namespaceId)
          return <tr key={row.id}>
            <td>{repository && namespace?.slug ?
              <LocalLink className="mono object" to={`${repoPath(namespace, repository)}/permissions`}>{qualified(namespace, repository)}</LocalLink> :
              repository?.name || 'Unavailable repository'}</td>
            <td>{permissionNames[row.permission] ? <span className="chip permission">{permissionNames[row.permission]}</span> : '—'}</td>
          </tr>
        })}
      </Table> : <Empty title="No repository grants"><p>Grant access from an organization repository’s Permissions tab.</p></Empty>}
    </section>
    <section className="panel danger">
      <h2>Delete team</h2>
      <p>Deleting this team removes {memberships.length} {memberships.length === 1 ? 'membership' : 'memberships'} and {grants.length} repository {grants.length === 1 ? 'grant' : 'grants'}.</p>
      <button type="button" className="danger-button" onClick={() => { setTyped(''); setDeleting(true) }}>Delete team</button>
    </section>
    {adding && <MemberPicker team={team} memberships={memberships} onCancel={() => setAdding(false)} />}
    {removing && <Dialog title="Remove team member?" confirm="Remove member" onCancel={() => setRemoving(null)}
      onConfirm={() => {
        commit('team.member_removed', actions.removeMember(removing.id))
        setRemoving(null)
        announce('Team member removed.')
      }}>
      <p>Remove <strong>{users.get(removing.userId)?.displayName || users.get(removing.userId)?.username || 'this member'}</strong> from <strong>{team.name}</strong>.</p>
    </Dialog>}
    {deleting && <Dialog title="Delete team?" confirm="Delete team" disabled={typed !== team.name}
      onCancel={() => setDeleting(false)} onConfirm={() => {
        commit('team.deleted', actions.deleteTeam(team.id))
        announce('Team deleted.')
        navigate(directory)
      }}>
      <p>Delete <strong className="mono">{team.name}</strong>, {memberships.length} team {memberships.length === 1 ? 'membership' : 'memberships'}, and {grants.length} repository {grants.length === 1 ? 'grant' : 'grants'}.</p>
      <Field label="Type the team name" value={typed} onChange={setTyped} autoComplete="off" />
    </Dialog>}
  </div>
}

function MemberPicker({ team, memberships, onCancel }) {
  const { state, commit, announce } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const existing = new Set(memberships.map(row => row.userId))
  const users = organizationUsers(state, team.namespaceId)
    .filter(user => matches(query, user.username, user.displayName, user.email))
    .sort((a, b) => String(a.displayName ?? a.username ?? '').localeCompare(String(b.displayName ?? b.username ?? '')))
  return <Dialog title="Add organization member" confirm="Add member" disabled={!selected} onCancel={onCancel}
    onConfirm={() => {
      commit('team.member_added', actions.addMember(team.id, selected))
      announce('Team member added.')
      onCancel()
    }}>
    <Search label="Search organization members" value={query} placeholder="Docker ID, name, or email"
      onChange={value => { setQuery(value); setSelected('') }} />
    {users.length ? <fieldset className="member-picker">
      <legend>Select a member</legend>
      {users.map(user => <label key={user.id}>
        <input type="radio" name="member" value={user.id} checked={selected === user.id}
          disabled={existing.has(user.id)} onChange={() => setSelected(user.id)} />
        <span><strong>{user.displayName || user.username || 'Unnamed member'}</strong>
          <small>{[user.username && `@${user.username}`, user.email].filter(Boolean).join(' · ')}</small></span>
        {existing.has(user.id) && <small className="chip permission">Already added</small>}
      </label>)}
    </fieldset> : <p role="status">No matching organization members.</p>}
  </Dialog>
}

