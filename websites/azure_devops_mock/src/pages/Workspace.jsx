import React, { useState } from 'react'
import { ArrowUpRight, Building2, FolderGit2, GitPullRequest, LayoutList, Lock, Search as SearchIcon, SquareTerminal, Users } from 'lucide-react'
import { Avatar, Empty, PageHead, Panel, Person, Select, Status, TypeIcon } from '../components/ui.jsx'
import { orgPath, orgProjects, PLink, projectPath, SiteLink, useProject, useQuery } from '../navigation.jsx'
import { find, includes, list, memberList, repoPath, scoped, segment, sprintChoices } from '../model.js'
import { useStore } from '../store.jsx'
import { snapshot } from '../git.js'

const abbreviate = (name) => name?.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'P'

export function Projects() {
  const { data } = useStore()
  const [filter, setFilter] = useState('')
  const projects = orgProjects(data).filter((project) => includes(project.name, filter) || includes(project.description, filter))
  return <>
    <div className="hub-org"><Building2 size={17} /> <SiteLink to={orgPath(data.organization)}>{data.organization?.name ?? 'Organization'}</SiteLink></div>
    <PageHead title="Projects"><input type="search" aria-label="Filter projects" placeholder="Filter projects" value={filter} onChange={(event) => setFilter(event.target.value)} /></PageHead>
    {projects.length ? <div className="project-grid">{projects.map((project, index) => {
      const members = memberList(data, project)
      return <SiteLink key={project.id} to={projectPath(data.organization, project) + '/_summary'} className="project-card">
        <div className="project-card-head"><span className={'project-tile tile-' + index % 3}>{abbreviate(project.name)}</span><div><h2>{project.name ?? project.id}</h2><span className="meta"><Lock size={12} /> {project.visibility === 'public' ? 'Public' : 'Private'}</span></div><ArrowUpRight size={17} className="card-arrow" /></div>
        <p>{project.description || 'No description'}</p>
        <div className="project-card-footer"><Users size={15} /> {members.length} members <span>{scoped(data.teams, project.id).length} teams</span></div>
      </SiteLink>
    })}</div> : <Empty title={filter ? 'No matching projects' : 'No projects are available'} />}
  </>
}
export function Summary() {
  const { data } = useStore()
  const { project, team, teams } = useProject()
  const stats = [
    ['Work items', '/_workitems', scoped(data.workItems, project.id).length, LayoutList],
    ['Repositories', '/_git', scoped(data.repositories, project.id).length, FolderGit2],
    ['Pipeline runs', '/_build?tab=runs', scoped(data.pipelineRuns, project.id).length, SquareTerminal],
    ['Deployments', '/_release', scoped(data.deployments, project.id).length, GitPullRequest],
  ]
  const members = memberList(data, project)
  return <>
    <PageHead title={project.name ?? 'Project'} subtitle={project.visibility === 'public' ? 'Public project' : 'Private project'} />
    <div className="split">
      <div className="stack">
        <Panel title="About this project"><p>{project.description || 'No project description is available.'}</p></Panel>
        <Panel title="Teams"><div className="stack">{teams.length ? teams.map((row) => {
          const sprint = find(sprintChoices(data, project.id, row.id), row.defaultSprintId)
          return <div key={row.id} className="inline spread"><span><PLink to={'/_boards/board/' + segment(row.id)}>{row.name ?? row.id}</PLink>{row.id === team?.id && <span className="meta"> · Default team</span>}</span>{sprint && <PLink to={'/_sprints/backlog/' + segment(row.id) + '/' + segment(sprint.id)}>{sprint.name ?? sprint.id}</PLink>}</div>
        }) : <p className="muted">No teams available.</p>}</div></Panel>
      </div>
      <div className="stack">
        <Panel title="Project stats"><div className="stat-grid">{stats.map(([label, to, count, Icon]) => <PLink key={label} to={to}><Icon size={17} /><strong>{count}</strong><span>{label}</span></PLink>)}</div></Panel>
        <Panel title="Members"><div className="inline">{members.map((user) => <span key={user.id} title={user.displayName}><Avatar user={user} /></span>)}{!members.length && <p className="muted">No members available.</p>}</div></Panel>
      </div>
    </div>
  </>
}
export function Search() {
  const { data } = useStore()
  const { project } = useProject()
  const [params, setQuery] = useQuery()
  const q = params.get('q') ?? ''
  const type = params.get('type') ?? ''
  const categories = [['workItems','Work items'], ['code','Code'], ['pullRequests','Pull requests']]
  const repos = scoped(data.repositories, project.id)
  const matches = (...values) => q.trim() && values.some((value) => includes(value, q))
  const results = {
    workItems: scoped(data.workItems, project.id).filter((row) => matches(row.title, row.id)).map((row) => ({
      id: row.id, title: '#' + row.id + ' ' + row.title, to: '/_workitems/edit/' + segment(row.id), meta: <Status value={row.state} />, icon: <TypeIcon type={row.type} />,
    })),
    code: (q.trim() && (!type || type === 'code') ? repos : []).flatMap((repo) => {
      const branches = list(data.branches).filter((branch) => branch.repoId === repo.id)
      const branch = find(branches, repo.defaultBranchId) ?? branches[0]
      return [...snapshot(data, repo.id, branch?.headCommitId).keys()].filter((path) => matches(path)).map((path) => ({
        id: repo.id + ':' + path, title: path, to: repoPath(repo) + '?version=' + segment(branch?.name) + '&path=' + segment(path), meta: repo.name, icon: <FolderGit2 size={16} />,
      }))
    }),
    pullRequests: list(data.pullRequests).flatMap((row) => {
      const repo = find(repos, row.repoId)
      return repo && matches(row.title, row.id) ? [{ id: row.id, title: '#' + row.id + ' ' + row.title,
        to: repoPath(repo) + '/pullrequest/' + segment(row.id), meta: <Status value={row.status} />, icon: <GitPullRequest size={16} /> }] : []
    }),
  }
  const visible = categories.filter(([key]) => !type || type === key)
  return <><PageHead title={q ? 'Search results for “' + q + '”' : 'Search'}><Select aria-label="Search category" value={type} onChange={(event) => setQuery({ type: event.target.value })} empty="All categories" options={categories} /></PageHead>
    {q.trim() && visible.some(([key]) => results[key].length) ? <div className="stack">{visible.map(([key, title]) => <Panel key={key} title={title}><div className="result-list">
      {results[key].map((row) => <div className="inline spread" key={row.id}><PLink to={row.to}>{row.icon} {row.title}</PLink><span className="meta">{row.meta}</span></div>)}
      {!results[key].length && <p className="muted">No matching {title.toLowerCase()}.</p>}
    </div></Panel>)}</div> : <Empty title={q.trim() ? 'No matching results' : 'Search this project'}><SearchIcon size={20} /><p>{q.trim() ? 'Try a different title, ID or file path.' : 'Enter a title, ID or file path in the search box.'}</p></Empty>}
  </>
}
export function Settings() {
  const { data } = useStore()
  const { project, teams } = useProject()
  return <><PageHead title="Project settings" /><div className="split"><Panel title="Overview"><dl className="facts"><dt>Name</dt><dd>{project.name ?? '—'}</dd><dt>Description</dt><dd>{project.description || '—'}</dd><dt>Process</dt><dd>{project.process ?? '—'}</dd><dt>Teams</dt><dd>{teams.length}</dd></dl></Panel>
    <Panel title="Membership"><div className="stack">{memberList(data, project).map((member) => <Person key={member.id} id={member.id} />)}{!memberList(data, project).length && <p className="muted">No members available.</p>}</div></Panel></div></>
}
