import React, { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Boxes, ChevronDown, ChevronRight, CircleHelp, FolderGit2, GitPullRequestArrow, LayoutGrid, Menu, Search as SearchIcon, Settings2, Workflow } from 'lucide-react'
import { ActionMenu, Avatar, Button, Dialog, Empty } from './components/ui.jsx'
import { orgPath, orgProjects, projectPath, ProjectScope, sessionPath, SiteLink, SiteTab, useProject } from './navigation.jsx'
import { repoPath, scoped, segment, stamp } from './model.js'
import { useStore } from './store.jsx'
import { Projects, Settings, Summary, Search } from './pages/Workspace.jsx'
import './styles.css'

const Boards = lazy(() => import('./pages/Boards.jsx'))
const Repos = lazy(() => import('./pages/Repos.jsx'))
const Pipelines = lazy(() => import('./pages/Pipelines.jsx'))
const Releases = lazy(() => import('./pages/Releases.jsx'))

function Brand() {
  return <SiteLink className="brand" to="/"><span className="brand-symbol"><Boxes size={19} strokeWidth={2.2} /></span>Azure DevOps</SiteLink>
}

function Header() {
  const { data, user, commit, notify } = useStore()
  const project = useProject()?.project
  const [query] = useSearchParams()
  const navigate = useNavigate()
  const [help, setHelp] = useState(false)
  const projects = orgProjects(data)
  function search(event) {
    event.preventDefault()
    const q = new FormData(event.currentTarget).get('q').trim()
    const target = project ?? projects.find((row) => row.id === data.organization?.defaultProjectId) ?? projects[0]
    if (target) navigate(sessionPath(projectPath(data.organization, target) + '/_search?q=' + encodeURIComponent(q)))
  }
  async function theme(value) {
    try {
      await commit((state, actor, now) => state.preferences?.theme === value ? [state] : [
        { ...state, preferences: { ...state.preferences, theme: value, ...stamp(actor, now) } },
      ])
    } catch (error) { notify(error.message) }
  }
  return <header className="topbar">
    <Brand /><span className="top-divider" /><SiteLink to={orgPath(data.organization)} className="org-link">{data.organization?.name ?? 'Organization'}</SiteLink>
    <div className="top-spacer" />
    <form className="global-search" role="search" onSubmit={search} key={query.get('q') ?? ''}>
      <SearchIcon size={16} /><input name="q" aria-label="Search Azure DevOps" placeholder="Search Azure DevOps" defaultValue={query.get('q') ?? ''} disabled={!project && !projects.length} />
    </form>
    <Button className="icon-button help-button" aria-label="Keyboard shortcuts" onClick={() => setHelp(true)}><CircleHelp size={19} /></Button>
    <ActionMenu accessibleLabel={'Profile: ' + (user?.displayName ?? 'Workspace user')} label={<><Avatar user={user} /><span className="profile-name">{user?.displayName ?? 'Profile'}</span><ChevronDown size={13} /></>}>
      <p>{user?.email ?? 'Workspace profile'}</p>
      {['light','dark'].map((mode) => <button key={mode} disabled={!user} onClick={() => theme(mode)}>{mode === 'light' ? 'Light' : 'Dark'}{(data.preferences?.theme ?? 'light') === mode && ' ✓'}</button>)}
    </ActionMenu>
    {help && <Dialog title="Keyboard shortcuts" onClose={() => setHelp(false)}>
      <div className="dialog-body"><dl className="key-list"><dt>Open focused card</dt><dd><kbd>Enter</kbd></dd><dt>Move focused card</dt><dd><kbd>Shift</kbd> + <kbd>←</kbd> or <kbd>→</kbd></dd><dt>Close dialog</dt><dd><kbd>Esc</kbd></dd></dl></div>
      <footer><Button onClick={() => setHelp(false)}>Close</Button></footer>
    </Dialog>}
  </header>
}

function ProjectShell() {
  const { data } = useStore()
  const { project, base, team, defaultTeam, sprint, section, route } = useProject()
  const [menu, setMenu] = useState(false)
  const repos = scoped(data.repositories, project.id)
  const [routeRepo, repoView] = section === '_git' ? route : []
  const repo = (routeRepo && repos.find((row) => row.slug === routeRepo || row.id === routeRepo)) || repos[0]
  const git = repo ? repoPath(repo) : '/_git'
  const teamId = segment(team?.id ?? defaultTeam?.id ?? 'unavailable')
  const active = section === '_git' ? 'Repos' : ['_build','_release','_releaseDefinition','_releaseProgress'].includes(section) ? 'Pipelines' : section === '_settings' ? 'Settings' : ['_workitems','_boards','_backlogs','_sprints','_queries'].includes(section) ? 'Boards' : 'Overview'
  const services = [
    ['Overview', '/_summary', LayoutGrid], ['Boards', '/_workitems', Workflow], ['Repos', git, FolderGit2], ['Pipelines', '/_build', GitPullRequestArrow],
  ]
  const local = {
    Overview: [['Summary','/_summary']], Boards: [['Work items','/_workitems'],['Boards','/_boards/board/' + teamId],['Backlogs','/_backlogs/backlog/' + teamId],['Sprints','/_sprints/backlog/' + teamId + '/' + segment(sprint?.id ?? 'unavailable')],['Queries','/_queries']],
    Repos: [['Files', git],['Commits', git + '/commits'],['Branches', git + '/branches'],['Pull requests', git + '/pullrequests']],
    Pipelines: [['Pipelines','/_build'],['Releases','/_release']],
    Settings: [['Overview','/_settings']],
  }[active]
  const current = active === 'Repos' ? (repoView?.startsWith('pullrequest') ? 'Pull requests' : repoView === 'commits' ? 'Commits' : repoView === 'branches' ? 'Branches' : 'Files')
    : active === 'Pipelines' ? (section === '_build' ? 'Pipelines' : 'Releases') : active === 'Boards' ? ({ _boards:'Boards', _backlogs:'Backlogs', _sprints:'Sprints', _queries:'Queries' }[section] ?? 'Work items') : active === 'Settings' ? 'Overview' : 'Summary'
  return <><Header /><div className="shell">
    <aside className={'service-rail' + (menu ? ' open' : '')} aria-label="Services">
      <div className="rail-heading">Services</div>
      {services.map(([label, path, Icon]) => <SiteLink className={active === label ? 'active' : ''} key={label} to={base + path} onClick={() => setMenu(false)}><Icon size={18} />{label}</SiteLink>)}
      <SiteLink className={'rail-settings' + (active === 'Settings' ? ' active' : '')} to={base + '/_settings'} onClick={() => setMenu(false)}><Settings2 size={17} />Project settings</SiteLink>
    </aside>
    <div className="workspace">
      <div className="project-strip">
        <Button className="service-toggle" onClick={() => setMenu(!menu)} aria-expanded={menu}><Menu size={16} /> Services</Button>
        <ActionMenu label={<><span className="project-mark">{project.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'P'}</span>{project.name ?? 'Project'} <ChevronDown size={14} /></>}>
          {orgProjects(data).map((row) => <SiteLink key={row.id} to={projectPath(data.organization, row) + '/_summary'}>{row.name ?? row.id}</SiteLink>)}
        </ActionMenu>
        <ChevronRight size={14} /><span>{active === 'Settings' ? 'Project settings' : active}</span>
        {team && <span className="team-strip">{team.name ?? team.id}</span>}
      </div>
      <nav className="tabs service-tabs" aria-label={active}>{local.map(([label, path]) => <SiteTab key={label} to={base + path} className={label === current ? 'selected' : ''} aria-current={label === current ? 'page' : undefined} end>{label}</SiteTab>)}</nav>
      <main className="content">
        <Suspense fallback={<p role="status">Loading view…</p>}><Routes>
          <Route index element={<Summary />} />
          <Route path="_summary" element={<Summary />} />
          <Route path="_search" element={<Search />} />
          <Route path="_settings" element={<Settings />} />
          {['_workitems/*','_boards/*','_backlogs/*','_sprints/*','_queries'].map((path) => <Route key={path} path={path} element={<Boards />} />)}
          <Route path="_git/*" element={<Repos />} />
          <Route path="_build/*" element={<Pipelines />} />
          {['_release','_releaseDefinition','_releaseProgress'].map((path) => <Route key={path} path={path} element={<Releases />} />)}
          <Route path="*" element={<Unknown title="This page is unavailable" />} />
        </Routes></Suspense>
      </main>
    </div>
  </div></>
}

function Unknown({ title = 'This project is unavailable' }) {
  return <Empty title={title}><SiteLink to="/">Back to Projects</SiteLink></Empty>
}
function Hub() {
  const { org } = useParams()
  const { data } = useStore()
  const valid = !org || [data.organization?.id, data.organization?.slug].includes(org)
  return <><Header /><main className="hub-content">{valid ? <Projects /> : <Unknown title="This organization is unavailable" />}</main></>
}
function Workspace() {
  return <ProjectScope missing={<><Header /><main className="hub-content"><Unknown /></main></>}><ProjectShell /></ProjectScope>
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Hub />} /><Route path="/:org" element={<Hub />} />
    <Route path="/:org/:project/*" element={<Workspace />} />
  </Routes></BrowserRouter>
}
