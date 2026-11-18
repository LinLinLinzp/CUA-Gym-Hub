import { useState } from 'react'
import { File, Folder, FolderGit2, GitBranch, GitCommitHorizontal, LockKeyhole, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { RunPipelineButton } from './PipelineRunForm.jsx'
import { FileEditor, NewBranch } from './SourceActions.jsx'
import { useStore } from '../context/AppContext.jsx'
import { ancestry, commitIndex, history, treeAt } from '../domain/git.js'
import { CONFIG_PATH } from '../data/pipelineFixtures.js'
import { activeRepos, byId, encodedPath, human, list, newest, openBranches, person, query, relative, repoPath, scoped, shortHash, starRecord, wsPath } from '../utils/model.js'
import { Avatar, Button, Empty, Field, PageHeading, RouteLink, Status, Table, usePage, useQuery } from '../components/ui.jsx'

export function RepositoryDirectory({ workspace, starred = false }) {
  const { state } = useStore()
  const [params] = useQuery()
  const fromProject = params.get('project')
  const [filters, setFilters] = useState({ name: '', project: null, visibility: '', starred: false, order: 'recent' })
  const projects = scoped(state.projects, 'workspaceId', workspace.id)
  const repos = activeRepos(state, workspace)
  const latestRuns = new Map()
  for (const run of list(state.pipelineRuns)) {
    if ((latestRuns.get(run.repositoryId)?.buildNumber ?? -1) < run.buildNumber) latestRuns.set(run.repositoryId, run)
  }
  const selectedProject = filters.project ?? fromProject ?? ''
  const rows = repos.filter(repo => {
    const star = starRecord(state, repo)
    return (!selectedProject || repo.projectId === selectedProject) && (!filters.visibility || filters.visibility === repo.visibility) &&
      (!(starred || filters.starred) || Boolean(star && !star.removedAt)) &&
      [repo.name, repo.slug].some(value => (value || '').toLowerCase().includes(filters.name.trim().toLowerCase()))
  }).sort(filters.order === 'name' ? (a, b) => (a.name || a.slug).localeCompare(b.name || b.slug) : newest)
  const page = usePage(rows, JSON.stringify([workspace.id, starred, filters, selectedProject]))
  function update(key, value) {
    setFilters(current => ({ ...current, [key]: value }))
  }

  return <>
    <div className="breadcrumb">{workspace.name || workspace.slug}</div>
    <PageHeading title={starred ? 'Starred repositories' : 'Repositories'} meta={selectedProject && byId(projects, selectedProject)?.name}>
      <Button to={wsPath(workspace, 'repository/create')} variant="primary"><Plus size={16} />Create repository</Button>
    </PageHeading>
    <div className="filters">
      <Field label="Find a repository"><input type="search" placeholder="Search repositories" value={filters.name} onChange={event => update('name', event.target.value)} /></Field>
      <Field label="Project"><select value={selectedProject} onChange={event => update('project', event.target.value)}><option value="">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name || project.key}</option>)}</select></Field>
      <Field label="Visibility"><select value={filters.visibility} onChange={event => update('visibility', event.target.value)}><option value="">Any visibility</option><option value="private">Private</option><option value="public">Public</option></select></Field>
      <Field label="Sort by"><select value={filters.order} onChange={event => update('order', event.target.value)}><option value="recent">Last updated</option><option value="name">Name</option></select></Field>
      {!starred && <label className="checkbox filter-check"><input type="checkbox" checked={filters.starred} onChange={event => update('starred', event.target.checked)} />Starred</label>}
    </div>
    {page.rows.length ? <Table label={starred ? 'Starred repositories' : 'Repositories'} columns={['Repository', 'Project', 'Visibility', 'Latest build', 'Last updated']}>
      {page.rows.map(repo => {
        const run = latestRuns.get(repo.id)
        const project = byId(projects, repo.projectId)
        return <tr key={repo.id}>
          <td><RouteLink className="row-title" to={repoPath(workspace, repo)}><FolderGit2 className="row-icon" size={16} />{repo.name || repo.slug}</RouteLink>{repo.description && <small className="row-meta">{repo.description}</small>}</td>
          <td>{project?.name || project?.key || '—'}</td>
          <td className="nowrap">{repo.visibility === 'private' && <LockKeyhole size={13} className="row-icon" />}{human(repo.visibility)}</td>
          <td>{run ? <RouteLink to={repoPath(workspace, repo, `pipelines/results/${run.buildNumber}`)}><Status value={run.status} /></RouteLink> : '—'}</td>
          <td className="nowrap">{relative(repo.updatedAt || repo.createdAt)}</td>
        </tr>
      })}
    </Table> : <div className="panel"><Empty title={starred ? 'No starred repositories' : 'No repositories found'} icon={FolderGit2}><p>{starred ? 'Star a repository to keep it in this list.' : 'Try a different search or create a repository.'}</p></Empty></div>}
    {page.controls}
  </>
}

function branchSelect(state, repo, name) {
  const branches = openBranches(state, repo)
  return { branches, branch: name ? branches.find(item => item.name === name) : byId(branches, repo.defaultBranchId) || branches[0] }
}

function BranchPicker({ branches, branch, onChange }) {
  return <Field label="Branch"><select value={branch?.name || ''} onChange={event => onChange(event.target.value)}>{!branch && <option value="" disabled>Choose a branch</option>}{branches.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
}

function SourceBreadcrumb({ workspace, repo, branch, path, tree }) {
  const parts = path.split('/').filter(Boolean)
  return <nav className="file-breadcrumb" aria-label="File path">
    <RouteLink to={query(repoPath(workspace, repo), { branch: branch.name })}>{repo.name || repo.slug}</RouteLink>
    {parts.map((part, index) => {
      const name = parts.slice(0, index + 1).join('/')
      return <span key={name}> / {index === parts.length - 1 ? part : <RouteLink to={query(repoPath(workspace, repo, `src/${encodedPath(name)}`), { branch: branch.name })}>{part}</RouteLink>}{tree && index === parts.length - 1 ? '/' : ''}</span>
    })}
  </nav>
}

function Readme({ content }) {
  return <section className="panel section-space"><div className="panel-title"><File size={17} /><h2>README.md</h2></div>
    <div className="panel-pad readme">{content.split('\n').map((line, index) => {
      if (!line.trim()) return null
      if (line.startsWith('# ')) return <h2 key={index}>{line.slice(2)}</h2>
      if (line.startsWith('## ')) return <h3 key={index}>{line.slice(3)}</h3>
      return <p key={index}>{line}</p>
    })}</div></section>
}

export function Source({ workspace, repo }) {
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const { '*': rawPath = '' } = useParams()
  const path = rawPath.replace(/\/$/, '')
  const { branches, branch } = branchSelect(state, repo, params.get('branch'))
  const commits = commitIndex(state, repo)
  const tree = treeAt(commits, branch?.headCommitId)
  const isFile = Boolean(path) && tree.has(path)
  const directory = new Map()
  const prefix = path ? path + '/' : ''
  for (const file of tree.keys()) {
    if (!file.startsWith(prefix)) continue
    const [child, ...rest] = file.slice(prefix.length).split('/')
    directory.set(child, (directory.get(child) || rest.length > 0))
  }
  const rows = [...directory].sort(([a, folderA], [b, folderB]) => Number(folderB) - Number(folderA) || a.localeCompare(b))
  const page = usePage(rows, `${branch?.id}/${path}`)
  const unavailable = branch?.headCommitId && !commits.has(branch.headCommitId)
  const edit = params.get('edit')
  return <>
    <PageHeading title="Source">{branch && !unavailable && <Button variant="primary" to={query(repoPath(workspace, repo, path ? `src/${encodedPath(path)}` : 'src'), { branch: branch.name, edit: 'add' })}><Plus size={16} />Add file</Button>}</PageHeading>
    {branches.length > 0 && <div className="filters"><BranchPicker branches={branches} branch={branch} onChange={name => setQuery({ branch: name, edit: null })} />{branch && <SourceBreadcrumb workspace={workspace} repo={repo} branch={branch} path={path} tree={!isFile} />}</div>}
    {!branch ? <Empty title="Branch unavailable"><p>Choose an available branch to view source.</p></Empty>
      : unavailable ? <Empty title="Source unavailable"><p>The selected branch points to a missing commit.</p></Empty>
        : isFile ? <section className="panel"><div className="panel-title"><File size={17} /><h2>{path}</h2>{path !== CONFIG_PATH ? <Button to={query(repoPath(workspace, repo, `src/${encodedPath(path)}`), { branch: branch.name, edit: 'modify' })}>Edit</Button> : <span className="pill neutral">Managed by Pipelines</span>}</div><pre className="source-content">{tree.get(path)}</pre></section>
          : rows.length ? <Table columns={['Name', 'Type']} label="Source files">{page.rows.map(([name, folder]) => <tr key={name}><td><RouteLink className="row-title" to={query(repoPath(workspace, repo, `src/${encodedPath(prefix + name)}`), { branch: branch.name })}>{folder ? <Folder className="row-icon" size={16} /> : <File className="row-icon" size={16} />}{name}</RouteLink></td><td>{folder ? 'Directory' : 'File'}</td></tr>)}</Table>
            : <div className="panel"><Empty title={path ? 'Path unavailable' : 'This branch has no files'} icon={FolderGit2}><p>{path ? 'This path does not exist on the selected branch.' : 'Add a file to make the first commit on this branch.'}</p></Empty></div>}
    {page.controls}
    {!path && tree.has('README.md') && <Readme content={tree.get('README.md')} />}
    {branch && !unavailable && (edit === 'add' || edit === 'modify' && isFile && path !== CONFIG_PATH) &&
      <FileEditor key={`${branch.id}/${path}/${edit}`} workspace={workspace} repo={repo} branch={branch} path={path} prefix={isFile ? '' : prefix}
        operation={edit} original={edit === 'modify' ? tree.get(path) : ''} onClose={() => setQuery({ edit: null }, { replace: true })} />}
  </>
}


export function CommitsTable({ records, workspace, repo, branch, identity }) {
  const { state } = useStore()
  const page = usePage(records, identity)
  return records.length ? <>
    <Table columns={['Commit', 'Message', 'Author', 'Date']} label="Commits">{page.rows.map(commit => <tr key={commit.id}>
      <td><RouteLink className="mono" to={query(repoPath(workspace, repo, `commits/${encodeURIComponent(commit.id)}`), { branch: branch?.name })}>{shortHash(commit)}</RouteLink></td>
      <td>{commit.message || 'Untitled commit'}</td>
      <td className="nowrap"><Avatar user={byId(state.users, commit.createdBy)} /> {person(state, commit.createdBy)}</td>
      <td className="nowrap">{relative(commit.createdAt)}</td>
    </tr>)}</Table>{page.controls}
  </> : <div className="panel"><Empty title="No commits" icon={GitCommitHorizontal} /></div>
}

export function CommitHistory({ workspace, repo }) {
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const { branches, branch } = branchSelect(state, repo, params.get('branch'))
  const records = branch ? history(commitIndex(state, repo), branch.headCommitId) : []
  return <>
    <PageHeading title="Commits" />
    {!!branches.length && <div className="filters"><BranchPicker branches={branches} branch={branch} onChange={name => setQuery({ branch: name })} /></div>}
    <CommitsTable records={records} workspace={workspace} repo={repo} branch={branch} identity={branch?.id} />
  </>
}

export function CommitDetail({ workspace, repo }) {
  const { state } = useStore()
  const { commitId } = useParams()
  const [params] = useQuery()
  const commits = commitIndex(state, repo)
  const commit = commits.get(commitId) || [...commits.values()].find(item => item.hash === commitId)
  if (!commit) return <Empty title="Commit unavailable"><Button to={repoPath(workspace, repo, 'commits')}>Back to commits</Button></Empty>
  const branch = openBranches(state, repo).find(item => item.name === params.get('branch') && ancestry(commits, item.headCommitId).has(commit.id)) ||
    openBranches(state, repo).find(item => ancestry(commits, item.headCommitId).has(commit.id))
  return <>
    <div className="breadcrumb"><RouteLink to={query(repoPath(workspace, repo, 'commits'), { branch: branch?.name })}>Commits</RouteLink> / <code>{shortHash(commit)}</code></div>
    <PageHeading title={commit.message || 'Untitled commit'} meta={<><Avatar user={byId(state.users, commit.createdBy)} /> {person(state, commit.createdBy)} · {relative(commit.createdAt)} · <code>{commit.hash || commit.id}</code></>}><RunPipelineButton workspace={workspace} repo={repo} branch={branch} commit={commit} /></PageHeading>
    <div className="stack">{list(commit.changes).map(change => <section className="panel" key={change.path}><div className="panel-title"><File size={16} /><h2>{change.path}</h2><span className="pill neutral">{human(change.operation)}</span></div>{change.content != null && <pre className="source-content">{change.content}</pre>}</section>)}</div>
    {!commit.changes?.length && <Empty title="No file changes" />}
  </>
}

export function Branches({ workspace, repo }) {
  const { state, user } = useStore()
  const [create, setCreate] = useState(false)
  const branches = openBranches(state, repo).sort((a, b) => Number(b.id === repo.defaultBranchId) - Number(a.id === repo.defaultBranchId) || (a.name || '').localeCompare(b.name || ''))
  const commits = commitIndex(state, repo)
  const page = usePage(branches, repo.id)
  return <>
    <PageHeading title="Branches"><Button variant="primary" disabled={!user || !branches.length} title={!user ? 'A signed-in workspace member is required.' : !branches.length ? 'An available source branch is required.' : undefined} onClick={() => setCreate(true)}><Plus size={16} />Create branch</Button></PageHeading>
    {page.rows.length ? <Table label="Branches" columns={['Branch', 'Last commit', 'Updated', 'Actions']}>{page.rows.map(branch => {
      const commit = commits.get(branch.headCommitId)
      return <tr key={branch.id}><td><RouteLink className="row-title" to={query(repoPath(workspace, repo), { branch: branch.name })}><GitBranch size={16} className="row-icon" />{branch.name}</RouteLink> {branch.id === repo.defaultBranchId && <span className="pill neutral">Default</span>}</td>
        <td>{commit ? <RouteLink className="mono" to={query(repoPath(workspace, repo, `commits/${encodeURIComponent(commit.id)}`), { branch: branch.name })}>{shortHash(commit)}</RouteLink> : '—'}</td>
        <td className="nowrap">{relative(branch.updatedAt || branch.createdAt)}</td><td><div className="action-row">{commit && branch.id !== repo.defaultBranchId && <Button to={query(repoPath(workspace, repo, 'pull-requests/new'), { branch: branch.name })}>Create pull request</Button>}<RunPipelineButton workspace={workspace} repo={repo} branch={branch} /></div></td></tr>
    })}</Table> : <Empty title="No branches" icon={GitBranch} />}
    {page.controls}
    {create && <NewBranch workspace={workspace} repo={repo} branches={branches} onClose={() => setCreate(false)} />}
  </>
}
