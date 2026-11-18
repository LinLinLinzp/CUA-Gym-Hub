import React, { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FileText, Folder, GitBranch, GitCommitHorizontal, Plus } from 'lucide-react'
import { ActionMenu, Button, Code, Dialog, Empty, ErrorText, Field, Missing, MultiSelect, PageHead, Panel, Person, Select, Table, Tabs, dateText } from '../components/ui.jsx'
import { PLink, useProject, useProjectNav, useQuery } from '../navigation.jsx'
import { useStore } from '../store.jsx'
import { byNewest, find, includes, list, repoPath, scoped, segment } from '../model.js'
import { commitChain, commitFile, createBranch, hasHead, initializeRepo, newRepo, repoBranches, resolveBranch, snapshot } from '../git.js'
import PullRequests from './PullRequests.jsx'

const options = (rows) => rows.map((row) => [row.id, row.name ?? row.id])
export const itemOptions = (rows) => rows.map((row) => [row.id, '#' + row.id + ' ' + (row.title ?? 'Work item')])

export default function Repos() {
  const { data } = useStore()
  const { project, route } = useProject()
  const [target, view, id] = route
  const repos = scoped(data.repositories, project.id)
  const repo = target ? repos.find((row) => row.slug === target || row.id === target) : repos[0]
  if (target && !repo) return <Missing title="Repository unavailable" to="/_git" />
  if (route.length === 3 && view === 'pullrequest' && id || route.length === 2 && ['pullrequests','pullrequestcreate'].includes(view)) {
    return <PullRequests key={JSON.stringify(route)} repo={repo} view={view} id={id} />
  }
  if (route.length === 2 && view === 'branches') return <Branches key={repo?.id} repo={repo} />
  if (route.length === 2 && view === 'commits') return <Commits key={repo?.id} repo={repo} />
  if (route.length > 1) return <Missing title="Repository view unavailable" to={repoPath(repo)} />
  return <Files key={repo?.id ?? 'empty'} repo={repo} repos={repos} />
}

export function RepoSelect({ repo, suffix = '' }) {
  const { data } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const repos = scoped(data.repositories, project.id)
  return <Select aria-label="Repository" value={repo?.id ?? ''} options={options(repos)} empty={repo ? undefined : 'Select a repository'} onChange={(event) => {
    const next = find(repos, event.target.value)
    if (next) navigate(repoPath(next) + suffix)
  }} />
}

function NewRepository({ onClose, onCreated }) {
  const { commit, notify } = useStore()
  const { project } = useProject()
  const [name, setName] = useState('')
  const [readme, setReadme] = useState(true)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      const repo = await commit((state, actor, now) => newRepo(state, project.id, name, readme, actor, now))
      notify('Repository created')
      onCreated(repo)
    } catch (failure) { setError(failure.message) }
  }
  return <Dialog title="Create a repository" onClose={onClose}><form onSubmit={submit}>
    <div className="dialog-body">
      <Field label="Repository name"><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <label className="inline"><input type="checkbox" checked={readme} onChange={(event) => setReadme(event.target.checked)} /> Add a README</label>
      <ErrorText error={error} />
    </div><footer><Button onClick={onClose}>Cancel</Button><Button type="submit" primary>Create</Button></footer>
  </form></Dialog>
}

function Files({ repo, repos }) {
  const { data, user, commit, notify } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const [params, setQuery] = useQuery()
  const [modal, setModal] = useState('')
  const [error, setError] = useState('')
  const branches = repo ? repoBranches(data, repo.id) : []
  const branch = repo ? resolveBranch(data, repo, params.get('version')) : null
  const readable = repo && hasHead(data, repo.id, branch)
  const files = readable ? snapshot(data, repo.id, branch.headCommitId) : new Map()
  const requestedPath = params.get('path')?.replace(/^\/+|\/+$/g,'')
  const path = requestedPath ?? (files.has('README.md') ? 'README.md' : '')
  const isFile = files.has(path)
  const folder = isFile ? path.split('/').slice(0,-1).join('/') : path
  const folderExists = !folder || [...files.keys()].some((file) => file.startsWith(folder + '/'))
  const tab = ['Contents','Preview','History'].includes(params.get('tab')) ? params.get('tab') : 'Contents'
  const title = repo?.name ?? 'Files'
  const fileActions = readable && user
  async function initialize() {
    try {
      await commit((state, actor, now) => initializeRepo(state, project.id, repo.id, actor, now))
      setError('')
      notify('Repository initialized')
    } catch (failure) { setError(failure.message) }
  }
  function open(path) { setQuery({ path: path || '/', tab: null }) }
  return <>
    <PageHead title={title} subtitle={repo ? 'Files' : undefined}>
      {repos.length > 0 && <RepoSelect repo={repo} />}
      <Button primary disabled={!user} onClick={() => setModal('repo')}><Plus size={16} /> New repository</Button>
    </PageHead>
    <ErrorText error={error} />
    {!repo ? <Empty title="No repositories yet"><p>Create a Git repository to start versioning files.</p></Empty>
      : !branches.length ? <Empty title="This repository is empty"><p>Initialize the repository with a README and a main branch.</p><Button primary onClick={initialize} disabled={!user}>Initialize</Button></Empty>
      : <>
        <div className="toolbar spread">
          <div className="inline"><GitBranch size={16} /><Select aria-label="Branch" empty={branch ? undefined : 'Choose a branch'} value={branch?.id ?? ''} options={options(branches)}
            onChange={(event) => setQuery({ version: find(branches,event.target.value)?.name, path: null, tab: null })} />
          <div className="breadcrumbs"><button type="button" onClick={() => open('')}>{repo.name ?? repo.id}</button>
            {path.split('/').filter(Boolean).map((part,index,parts) => <React.Fragment key={index}><ChevronRight size={14} /><button type="button" onClick={() => open(parts.slice(0,index+1).join('/'))}>{part}</button></React.Fragment>)}</div></div>
          <div className="actions"><Button disabled={!fileActions} title={!fileActions ? 'Select an available branch and sign in' : undefined} onClick={() => setModal('create')}><Plus size={15} /> New file</Button>
            {isFile && <Button disabled={!fileActions} onClick={() => setModal('edit')}>Edit</Button>}</div>
        </div>
        {!readable ? <Missing title={branch ? 'Branch commit unavailable' : 'Branch unavailable'} to={repoPath(repo)} />
          : <div className="split left"><Panel title="Files"><FileTree files={files} selected={path} onOpen={open} /></Panel>
            <Panel><div className="stack">
              {isFile ? <>
                <h2><FileText size={17} /> {path.split('/').at(-1)}</h2>
                <Tabs items={['Contents','Preview','History']} value={tab} onChange={(value) => setQuery({ tab: value === 'Contents' ? null : value })} />
                {tab === 'History' ? <CommitTable repo={repo} branch={branch} rows={commitChain(data, repo.id, branch.headCommitId).filter((row) => list(row.changes).some((change) => change.path === path))} />
                  : tab === 'Preview' && /\.md$/i.test(path) ? <Markdown text={files.get(path)} /> : <Code text={files.get(path)} />}
              </> : folderExists ? <FolderRows files={files} folder={folder} onOpen={open} /> : <Empty title="File or folder unavailable"><Button onClick={() => open('')}>Browse repository</Button></Empty>}
            </div></Panel>
          </div>}
        </>}
    {modal === 'repo' && <NewRepository onClose={() => setModal('')} onCreated={(row) => { setModal(''); navigate(repoPath(row)) }} />}
    {fileActions && ['create','edit'].includes(modal) && <FileEditor repo={repo} branch={branch} mode={modal}
      initialPath={modal === 'edit' ? path : folder && folderExists ? folder + '/' : ''}
      text={modal === 'edit' ? files.get(path) : ''}
      onClose={() => setModal('')} onCommit={(nextPath, branch) => { setQuery({ version: branch.name, path: nextPath, tab: null }); setModal('') }} />}
  </>
}

function Markdown({ text }) {
  return <article className="markdown">{String(text ?? '').split('\n').filter(Boolean).map((line,index) => {
    if (line.startsWith('# ')) return <h2 key={index}>{line.slice(2)}</h2>
    if (line.startsWith('## ')) return <h3 key={index}>{line.slice(3)}</h3>
    return <p key={index}>{line}</p>
  })}</article>
}

function folderEntries(files, folder) {
  const prefix = folder ? folder + '/' : ''
  const entries = new Map()
  for (const path of files.keys()) {
    if (!path.startsWith(prefix)) continue
    const [name, more] = path.slice(prefix.length).split('/')
    if (name) entries.set(name,{ name, path: prefix + name, folder: Boolean(more) })
  }
  return [...entries.values()].sort((a,b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name))
}

function FileTree({ files, selected, onOpen, folder = '' }) {
  const rows = folderEntries(files, folder)
  return <div className="file-tree">{rows.map((row) => row.folder ?
    <details key={row.path} open={selected === row.path || selected.startsWith(row.path + '/') || undefined}><summary><Folder size={15} /> {row.name}</summary>
      <FileTree files={files} selected={selected} onOpen={onOpen} folder={row.path} />
    </details> : <button type="button" className={selected === row.path ? 'selected' : ''} key={row.path} onClick={() => onOpen(row.path)}><FileText size={15} /> {row.name}</button>)}</div>
}

function FolderRows({ files, folder, onOpen }) {
  const rows = folderEntries(files, folder)
  return <Table columns={['Name']} rows={rows.map((row) => ({ ...row,id:row.path }))} empty="This folder is empty" render={(row) =>
    <td><button className="link-button" onClick={() => onOpen(row.path)}>{row.folder ? <Folder size={15} /> : <FileText size={15} />} {row.name}</button></td>} />
}

function FileEditor({ repo, branch, mode, initialPath, text, onClose, onCommit }) {
  const { data, commit, notify } = useStore()
  const { project } = useProject()
  const [path, setPath] = useState(initialPath)
  const [value, setValue] = useState(text ?? '')
  const [branchId, setBranch] = useState(branch.id)
  const [originalContents, setOriginalContents] = useState(() => new Map([[branch.id, text]]))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const choices = repoBranches(data, repo.id).filter((row) => hasHead(data, repo.id, row))
  const selected = find(choices, branchId)
  function selectBranch(id) {
    const target = find(choices, id)
    if (mode === 'edit' && target && !originalContents.has(id)) {
      const original = snapshot(data, repo.id, target.headCommitId).get(initialPath)
      setOriginalContents(new Map(originalContents).set(id, original))
    }
    setBranch(id)
  }
  async function submit(event) {
    event.preventDefault()
    try {
      const trimmed = path.trim()
      const record = await commit((state, actor, now) => commitFile(state, project.id, repo.id, branchId, trimmed, value, message, actor, now,
        { mode, original: originalContents.get(branchId) }))
      notify(record ? 'File committed' : 'File is already up to date')
      onCommit(trimmed, selected)
    } catch (failure) { setError(failure.message) }
  }
  return <Dialog onClose={onClose} title={mode === 'edit' ? 'Edit file and commit' : 'Create file and commit'}><form onSubmit={submit}>
    <div className="dialog-body">
      <Field label="File path"><input autoFocus required readOnly={mode === 'edit'} value={path} onChange={(event) => setPath(event.target.value)} /></Field>
      <Field label="Contents"><textarea className="mono" value={value} rows={8} onChange={(event) => setValue(event.target.value)} /></Field>
      <Field label="Commit message"><input required value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
      <Field label="Commit to branch"><Select value={branchId} options={options(choices)} onChange={(event) => selectBranch(event.target.value)} /></Field>
      <ErrorText error={error} />
    </div><footer><Button onClick={onClose}>Cancel</Button><Button primary type="submit" disabled={!selected}>Commit</Button></footer>
  </form></Dialog>
}

function Branches({ repo }) {
  const { data, user } = useStore()
  const { project } = useProject()
  const [scope, setScope] = useState('All')
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const branches = repoBranches(data, repo?.id)
  if (!repo) return <Missing title="Select a repository to see branches" to="/_git" />
  const rows = [...branches].filter((row) => includes(row.name, filter) && (scope !== 'Mine' || user && row.createdBy === user.id)).sort((a,b) => String(a.name).localeCompare(b.name))
  const pr = (id) => list(data.pullRequests).find((row) => row.repoId === repo.id && row.status === 'active' && row.sourceBranchId === id)
  return <>
    <PageHead title="Branches"><RepoSelect repo={repo} suffix="/branches" /><Button primary disabled={!user || !branches.some((row) => hasHead(data, repo.id,row))}
      onClick={() => setAdding(true)}><Plus size={16} /> New branch</Button></PageHead>
    <Tabs items={['Mine','All']} value={scope} onChange={setScope} />
    <div className="toolbar"><input type="search" aria-label="Filter branches" placeholder="Filter branches" value={filter} onChange={(event) => setFilter(event.target.value)} /></div>
    <Table columns={['Name','Last commit','Updated','Pull request']} rows={rows} empty="No branches match this view" render={(row) => {
      const head = find(list(data.commits).filter((item) => item.repoId === repo.id),row.headCommitId)
      const request = pr(row.id)
      return <><td><PLink to={repoPath(repo) + '?version=' + segment(row.name)}><GitBranch size={15} /> {row.name ?? row.id}</PLink>{row.id === repo.defaultBranchId && <span className="meta"> · Default</span>}</td>
        <td>{head ? <PLink to={repoPath(repo) + '/commits?version=' + segment(row.name) + '&commitId=' + segment(head.id)}>{head.message}</PLink> : '—'}</td>
        <td className="meta">{dateText(row.updatedAt)}</td><td>{request ? <PLink to={repoPath(repo) + '/pullrequest/' + segment(request.id)}>#{request.id} {request.title}</PLink> : '—'}</td></>
    }} />
    {adding && <NewBranch repo={repo} rows={branches.filter((row) => hasHead(data, repo.id,row))} items={scoped(data.workItems, project.id)} onClose={() => setAdding(false)} />}
  </>
}

function NewBranch({ repo, rows, items, onClose }) {
  const { project } = useProject()
  const { commit, notify } = useStore()
  const [name, setName] = useState('')
  const [base, setBase] = useState(find(rows, repo.defaultBranchId)?.id ?? rows[0]?.id ?? '')
  const [linked, setLinked] = useState([])
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      await commit((state, actor, now) => createBranch(state, project.id, repo.id, name, base, linked, actor, now))
      notify('Branch created')
      onClose()
    } catch (failure) { setError(failure.message) }
  }
  return <Dialog title="Create a branch" onClose={onClose}><form onSubmit={submit}><div className="dialog-body">
    <Field label="Name"><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="feature/branch-name" /></Field>
    <Field label="Based on"><Select required options={options(rows)} value={base} onChange={(event) => setBase(event.target.value)} /></Field>
    <Field label="Work items to link"><MultiSelect options={itemOptions(items)} value={linked} onChange={setLinked} /></Field>
    <ErrorText error={error} />
  </div><footer><Button onClick={onClose}>Cancel</Button><Button primary type="submit">Create</Button></footer></form></Dialog>
}

function CommitTable({ repo, branch, rows }) {
  return <Table columns={['Commit','Author','Date','Changed paths']} rows={rows} empty="No commits" render={(row) =>
    <><td><PLink to={repoPath(repo) + '/commits?version=' + segment(branch?.name ?? '') + '&commitId=' + segment(row.id)}><GitCommitHorizontal size={16} /> {row.message ?? row.id}</PLink></td>
      <td><Person id={row.createdBy} /></td><td className="meta">{dateText(row.createdAt)}</td><td>{list(row.changes).map((change) => change.path).filter(Boolean).join(', ') || '—'}</td></>} />
}

function Commits({ repo }) {
  const { data } = useStore()
  const [params, setQuery] = useQuery()
  if (!repo) return <Missing title="Select a repository to see commits" to="/_git" />
  const branches = repoBranches(data, repo.id)
  const branch = resolveBranch(data, repo, params.get('version'))
  const commitId = params.get('commitId')
  const record = find(list(data.commits).filter((row) => row.repoId === repo.id), commitId)
  return <>
    <PageHead title="Commits"><RepoSelect repo={repo} suffix="/commits" /></PageHead>
    <div className="toolbar"><GitBranch size={16} /><Select aria-label="Branch" empty={branch ? undefined : 'Choose a branch'} value={branch?.id ?? ''} options={options(branches)} onChange={(event) => setQuery({ version: find(branches,event.target.value)?.name, commitId: null })} /></div>
    {commitId ? record ? <div className="stack"><div><Button onClick={() => setQuery({ commitId: null })}>Back to commits</Button></div><Panel title={record.message ?? record.id}>
      <dl className="facts"><dt>Commit</dt><dd className="mono">{record.id}</dd><dt>Author</dt><dd><Person id={record.createdBy} /></dd><dt>Date</dt><dd>{dateText(record.createdAt)}</dd></dl>
    </Panel>{list(record.changes).map((change,index) => <Panel title={change.path} key={change.path + ':' + index}><p className="meta">{change.kind}</p><Code text={change.after ?? change.before} /></Panel>)}</div>
      : <Missing title="Commit unavailable" to={repoPath(repo) + '/commits'} />
      : <CommitTable repo={repo} branch={branch} rows={commitChain(data, repo.id, branch?.headCommitId)} />}
  </>
}
