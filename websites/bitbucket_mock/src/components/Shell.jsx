import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { BookOpen, Box, ChevronDown, CircleHelp, FolderGit2, FolderKanban, GitPullRequest, House, Menu, Plus, Search, Star } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { activeRepos, byId, defaultWorkspace, list, person, repoPath, wsPath } from '../utils/model.js'
import { Avatar, Button, Empty, Modal, RouteLink, RouteNav, Status, useShortcut } from './ui.jsx'

const workspaceNav = [
  ['for-you', 'For you', House],
  ['repositories', 'Repositories', FolderGit2],
  ['pull-requests', 'Pull requests', GitPullRequest],
  ['starred', 'Starred', Star],
  ['projects', 'Projects', FolderKanban],
]

function Wordmark() {
  return <><span className="brand-icon"><Box size={19} strokeWidth={2.5} /></span>Bitbucket</>
}

export function Shell() {
  const { state, user } = useStore()
  const { workspaceSlug, repoSlug } = useParams()
  const workspace = list(state.workspaces).find(item => item.slug === workspaceSlug)
  const repo = workspace && activeRepos(state, workspace).find(item => item.slug === repoSlug)
  const home = workspace || defaultWorkspace(state)
  const location = useLocation()
  const [popover, setPopover] = useState('')
  const [keyword, setKeyword] = useState('')
  const [railOpen, setRailOpen] = useState(false)
  const [help, setHelp] = useState(false)
  const header = useRef(null)
  const search = useRef(null)
  useShortcut(event => {
    if (event.key === '/') {
      event.preventDefault()
      search.current?.focus()
    } else if (event.key === '?') {
      event.preventDefault()
      setPopover('')
      setHelp(true)
    }
  })

  useEffect(() => {
    setPopover('')
    setRailOpen(false)
    setKeyword('')
  }, [location.pathname])
  useEffect(() => {
    function dismiss(event) {
      if (!header.current?.contains(event.target)) setPopover('')
    }
    function dismissOnEscape(event) {
      if (event.key === 'Escape') {
        setPopover('')
        setRailOpen(false)
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [])

  const repos = home ? activeRepos(state, home) : []
  const needle = keyword.trim().toLowerCase()
  const searchRepos = needle ? repos.filter(item => [item.name, item.slug].some(value => (value || '').toLowerCase().includes(needle))).slice(0, 8) : []
  const searchPRs = needle ? list(state.pullRequests).filter(pr => byId(repos, pr.repositoryId) && (pr.title?.toLowerCase().includes(needle) || String(pr.number).includes(needle.replace(/^#/, '')) && needle !== '#')).slice(0, 8) : []
  const toggle = id => setPopover(current => current === id ? '' : id)
  const createPRPath = repo ? repoPath(home, repo, 'pull-requests/new') : home && wsPath(home, 'pull-requests/new')

  return <>
    <header className="topbar" ref={header}>
      <div className="top-start">
        <Button variant="top-quiet" className="rail-toggle" aria-label="Workspace navigation" aria-expanded={railOpen} onClick={() => setRailOpen(!railOpen)}><Menu size={19} /></Button>
        <RouteLink to={home ? wsPath(home) : '/'} className="wordmark"><Wordmark /></RouteLink>
        {home && <div className="popover-anchor workspace-switch">
          <button className="top-workspace" aria-expanded={popover === 'workspace'} onClick={() => toggle('workspace')}>
            <span className="workspace-mark">{home.name?.[0] || 'W'}</span><span>{home.name || home.slug}</span><ChevronDown size={15} />
          </button>
          {popover === 'workspace' && <div className="popover"><small>Workspaces</small>{list(state.workspaces).map(item => <RouteLink key={item.id} to={wsPath(item)} onClick={() => setPopover('')} aria-current={item.id === home.id ? 'page' : undefined}>{item.name || item.slug}</RouteLink>)}</div>}
        </div>}
      </div>
      <div className="global-search popover-anchor">
        <div className="search-control"><Search size={18} /><input ref={search} type="search" aria-label="Search Bitbucket" placeholder="Search repositories and pull requests" value={keyword} onFocus={() => setPopover('search')} onChange={event => { setKeyword(event.target.value); setPopover('search') }} /></div>
        {popover === 'search' && needle && <div className="popover search-results">
          {!!searchRepos.length && <><small>Repositories</small>{searchRepos.map(item => <RouteLink key={item.id} to={repoPath(home, item)}><FolderGit2 size={16} />{item.name}</RouteLink>)}</>}
          {!!searchPRs.length && <><small>Pull requests</small>{searchPRs.map(pr => <RouteLink key={pr.id} to={repoPath(home, byId(repos, pr.repositoryId), `pull-requests/${pr.number}`)}><GitPullRequest size={16} />#{pr.number} {pr.title}</RouteLink>)}</>}
          {!searchRepos.length && !searchPRs.length && <p>No results for “{keyword.trim()}”</p>}
        </div>}
      </div>
      <div className="top-end">
        <Button variant="top-quiet" className="shortcut-help" aria-label="Keyboard shortcuts" onClick={() => setHelp(true)}><CircleHelp size={19} /></Button>
        {home && <div className="popover-anchor">
          <Button variant="primary" aria-expanded={popover === 'create'} onClick={() => toggle('create')}><Plus size={16} />Create</Button>
          {popover === 'create' && <div className="popover right"><RouteLink to={wsPath(home, 'repository/create')}><FolderGit2 size={17} />Repository</RouteLink><RouteLink to={createPRPath}><GitPullRequest size={17} />Pull request</RouteLink></div>}
        </div>}
        {user && <div className="popover-anchor">
          <button className="profile-button" aria-label={`Account for ${user.name || 'current user'}`} aria-expanded={popover === 'profile'} onClick={() => toggle('profile')}><Avatar user={user} size={32} /></button>
          {popover === 'profile' && <div className="popover right profile"><Avatar user={user} size={32} /><div><strong>{user.name}</strong><div className="muted">@{user.username || user.id}</div></div></div>}
        </div>}
      </div>
    </header>
    <div className="app-layout">
      <aside className={`rail ${railOpen ? 'rail-open' : ''}`}>
        {home && <nav aria-label="Workspace">
          <div className="rail-title"><span className="workspace-mark">{home.name?.[0] || 'W'}</span><strong>{home.name || home.slug}</strong></div>
          {workspaceNav.map(([page, label, Icon]) => <RouteNav key={page} to={wsPath(home, page)} onClick={() => setRailOpen(false)}><Icon size={18} />{label}</RouteNav>)}
        </nav>}
      </aside>
      <main className="main-content" id="main-content">
        {workspaceSlug && !workspace ? <Empty title="Workspace unavailable"><p>This workspace could not be found.</p>{home && <Button to={wsPath(home)}>Back to workspace</Button>}</Empty> : <Outlet context={{ workspace, repo }} />}
      </main>
    </div>
    {help && <Modal title="Keyboard shortcuts" onClose={() => setHelp(false)}>
      <dl className="shortcut-list">{[['/', 'Focus global search'], ['?', 'Open shortcut help'], ['1', 'Pull request overview'], ['2', 'Pull request files changed'], ['3', 'Pull request commits']].map(([key, label]) =>
        <div key={key}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}</dl>
      <div className="form-actions"><Button onClick={() => setHelp(false)}>Done</Button></div>
    </Modal>}
  </>
}

export function ForYou({ workspace }) {
  const { state, user } = useStore()
  const repos = activeRepos(state, workspace)
  const requests = list(state.pullRequests).filter(pr => pr.status === 'open' && byId(repos, pr.repositoryId))
  const builds = list(state.pipelineRuns).filter(run => byId(repos, run.repositoryId))
    .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))
  const review = user ? requests.filter(pr => list(pr.reviewerIds).includes(user.id)) : []
  const authored = user ? requests.filter(pr => pr.authorId === user.id) : []
  const cards = [['Assigned to you', review], ['Your open pull requests', authored]]
  return <>
    <div className="breadcrumb">{workspace.name}</div>
    <div className="page-heading"><div><h1>For you</h1><div className="heading-meta">Review work and build activity in {workspace.name || workspace.slug}.</div></div><Button to={wsPath(workspace, 'repositories')}>Browse repositories</Button></div>
    <div className="dashboard-grid">
      {cards.map(([title, records]) => <section className="panel" key={title}><div className="panel-title"><GitPullRequest size={18} /><h2>{title}</h2><span className="pill neutral">{records.length}</span></div>
        {records.length ? records.slice(0, 5).map(pr => {
          const repo = byId(repos, pr.repositoryId)
          return <RouteLink className="dashboard-row" key={pr.id} to={repoPath(workspace, repo, `pull-requests/${pr.number}`)}><span><strong>{pr.title || 'Untitled pull request'}</strong><small>{repo.name} · #{pr.number} · {person(state, pr.authorId)}</small></span></RouteLink>
        }) : <p className="panel-copy muted">No open pull requests here.</p>}
      </section>)}
      <section className="panel dashboard-wide"><div className="panel-title"><BookOpen size={18} /><h2>Recent pipeline runs</h2></div>
        {builds.length ? builds.slice(0, 6).map(run => {
          const repo = byId(repos, run.repositoryId)
          return <RouteLink className="dashboard-row" key={run.id} to={repoPath(workspace, repo, `pipelines/results/${run.buildNumber}`)}><span><strong>{run.definitionSnapshot?.name || 'Pipeline'} #{run.buildNumber}</strong><small>{repo.name} · {run.branchName || 'Unknown branch'}</small></span><Status value={run.status} /></RouteLink>
        }) : <p className="panel-copy muted">No recent pipeline runs.</p>}
      </section>
    </div>
  </>
}

