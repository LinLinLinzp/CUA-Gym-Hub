import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { active, byId, created, membersOf, newId, records, roleIn, teamsOf, useStore } from '../store.jsx'
import {
  AppLink, Badge, Empty, ErrorText, Heading, Icon, Info, Missing, Panel, Search, Select, Table, Tabs, TextField,
  contains, dateLabel, orgPath, useAppNavigate,
} from '../ui.jsx'
import { PackageList } from './Packages.jsx'
import { validName } from './organizationLabels.js'
import { OrganizationMembers } from './OrganizationMembers.jsx'
import { OrganizationTeams, TeamDetail } from './OrganizationTeams.jsx'

const basePath = '/organizations'
const plans = [['public', 'Public packages'], ['private', 'Private packages']]
export const organizationName = (org) => org.name || org.scope || 'Unnamed organization'
export const organizationScope = (org) => org.scope || (org.name ? '@' + org.name : '—')


const packagesOf = (world, id) => records(world.packages).filter(pkg => pkg.organizationId === id)

export function OrganizationInventory() {
  const { world } = useStore()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const organizations = records(world.organizations).filter(org =>
    (contains(org.name, search) || contains(org.scope, search)) && (!role || roleIn(world, org.id) === role))
  return <>
    <Heading title="Organizations" description="Manage registry scopes and the people who maintain them.">
      <AppLink to={basePath + '/new'} className="button primary">Create organization</AppLink>
    </Heading>
    <section className="inventory" aria-label="Organization inventory">
      <div className="filters">
        <Search label="Search organizations" placeholder="Search by name or scope" value={search} onChange={setSearch} />
        <Select label="Your role" hiddenLabel value={role} onChange={setRole} options={[[ '', 'All roles' ], 'owner', 'admin', 'member']} />
      </div>
      <div className="list-meta" aria-live="polite">{organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'}</div>
      {organizations.length ? <div className="list-surface">
        <Table label="Organizations table" headers={[
          ['name', 'Organization'], ['role', 'Your role'], ['plan', 'Plan'], ['members', 'Members'], ['packages', 'Packages'],
        ]}>
          {organizations.map(org => <tr key={org.id}>
            <td><div className="row-name"><span className="row-glyph"><Icon name="organizations" /></span><div>
              <AppLink to={orgPath(org.id)} className="row-main">{organizationName(org)}</AppLink>
              <code className="row-description">{organizationScope(org)}</code>
            </div></div></td>
            <td><Badge value={roleIn(world, org.id)} /></td><td>{plans.find(([id]) => id === org.plan)?.[1] || '—'}</td>
            <td>{membersOf(world, org.id).length}</td><td>{packagesOf(world, org.id).length}</td>
          </tr>)}
        </Table>
      </div> : <Empty title={search || role ? 'No matching organizations' : 'No organizations yet'}>
        {search || role ? 'Try another name, scope, or role.' : <AppLink to={basePath + '/new'}>Create an organization</AppLink>}
      </Empty>}
    </section>
  </>
}

export function OrganizationForm() {
  const { commit } = useStore()
  const navigate = useAppNavigate()
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('public')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const clean = name.trim()
    if (!validName(clean) || clean.length > 50) {
      setError('Enter a scope of up to 50 lowercase letters, numbers, and separating hyphens.')
      return
    }
    const scope = '@' + clean
    const organizationId = newId('org')
    const teamId = newId('team')
    const organizationMemberId = newId('mem')
    const saved = commit((state, actor) => {
      if (records(state.organizations).some(org => organizationScope(org).toLowerCase() === scope) ||
        (state.account.username && '@' + state.account.username.toLowerCase() === scope) ||
        records(state.packages).some(pkg => pkg.scope?.toLowerCase() === scope)) return state
      const metadata = created(actor)
      return {
        ...state,
        organizations: [...records(state.organizations), { id: organizationId, name: clean, scope, plan, ...metadata }],
        organizationMembers: [...records(state.organizationMembers), {
          id: organizationMemberId, organizationId, userId: state.account.id,
          username: state.account.username ?? null, displayName: state.account.displayName ?? null,
          role: 'owner', status: 'active', ...metadata, updatedAt: null, updatedBy: null, removedAt: null, removedBy: null,
        }],
        teams: [...records(state.teams), { id: teamId, organizationId, name: 'developers', description: 'Default package maintainers.',
          isDefault: true, status: 'active', ...metadata, removedAt: null, removedBy: null }],
        teamMembers: [...records(state.teamMembers), { id: newId('tm'), teamId, organizationMemberId,
          status: 'active', ...metadata, removedAt: null, removedBy: null }],
      }
    }, 'Organization created.')
    if (!saved) setError('That scope is already in use.')
    else navigate(orgPath(organizationId))
  }

  return <>
    <Heading title="Create organization" description="Choose a registry scope and the types of packages it can host." />
    <form className="form-stack form-width" onSubmit={submit} noValidate>
      <Panel title="Organization details">
        <TextField label="Organization name" value={name} onChange={value => { setName(value); setError('') }}
          placeholder="example-tools" maxLength={50} autoComplete="off" />
        <p className="muted">{name && validName(name.trim()) ? <>Package scope <code>@{name.trim()}</code></> : 'Use lowercase letters, numbers, and hyphens.'}</p>
        <Select label="Package plan" value={plan} onChange={setPlan} options={plans} />
        <p className="muted">{plan === 'private' ? 'This scope can host public and private packages.' : 'Packages in this scope are public.'}</p>
        <ErrorText>{error}</ErrorText>
        <div className="actions"><button className="button primary">Create organization</button><AppLink className="button" to={basePath}>Cancel</AppLink></div>
      </Panel>
    </form>
  </>
}

export function OrganizationDetail({ view }) {
  const { world } = useStore()
  const { organizationId, teamId } = useParams()
  const org = byId(world.organizations, organizationId)
  if (!org) return <Missing title="Organization unavailable" to={basePath} label="Return to Organizations" />
  const path = orgPath(org.id)
  const team = teamId && byId(world.teams, teamId)
  if (view === 'team' && (!active(team) || team.organizationId !== org.id)) {
    return <Missing title="Team unavailable" to={path + '/teams'} label="Return to Teams" />
  }
  const role = roleIn(world, org.id)
  const packages = packagesOf(world, org.id)
  const plan = plans.find(([id]) => id === org.plan)?.[1]
  const tabs = [[path, 'Overview'], [path + '/members', 'Members'], [path + '/teams', 'Teams'], [path + '/packages', 'Packages']]
  if (view === 'team') tabs.push([path + '/teams/' + encodeURIComponent(team.id), team.name || 'Team'])
  return <>
    <Heading title={view === 'team' ? team.name || 'Unnamed team' : organizationName(org)}
      description={view === 'team' ? team.description : organizationScope(org)}>
      {view !== 'team' && <Badge value={role} />}
      {view === 'team' && team.isDefault && <span className="badge">Default team</span>}
    </Heading>
    <Tabs entries={tabs} label="Organization views" />
    {view === 'members' && <OrganizationMembers key={org.id} org={org} />}
    {view === 'teams' && <OrganizationTeams key={org.id} org={org} />}
    {view === 'team' && <TeamDetail key={team.id} team={team} org={org} packages={packages} />}
    {view === 'packages' && <PackageList key={org.id} packages={packages} />}
    {!view && <>
      <Panel title="Organization details"><Info entries={[[ 'Package plan', plan ], ['Created', dateLabel(org.createdAt)], ['Your role', <Badge value={role} />]]} /></Panel>
      <div className="cards">
        <AppLink className="card-link" to={path + '/members'}><strong>Members <Icon name="arrow" /></strong>
          <span>{membersOf(world, org.id).length} active</span><small className="muted">{role === 'owner' ? 'Manage members and invite new people' : 'View organization members'}</small></AppLink>
        <AppLink className="card-link" to={path + '/teams'}><strong>Teams <Icon name="arrow" /></strong>
          <span>{teamsOf(world, org.id).length} active</span><small className="muted">View groups and package access</small></AppLink>
        <AppLink className="card-link" to={path + '/packages'}><strong>Packages <Icon name="arrow" /></strong>
          <span>{packages.length} in this scope</span><small className="muted">Browse the package inventory</small></AppLink>
      </div>
      {role === 'owner' && <div className="actions"><AppLink to={path + '/members?invite=1'} className="button primary">Invite member</AppLink></div>}
    </>}
  </>
}
