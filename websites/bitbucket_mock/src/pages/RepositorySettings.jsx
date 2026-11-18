import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { PipelineSettings } from './PipelineSetup.jsx'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { createRepository, deleteRepository, editRepository } from '../domain/repositories.js'
import { byId, list, openBranches, repoPath, scoped, slugify, wsPath } from '../utils/model.js'
import { Button, ErrorText, Field, FormActions, Modal, PageHeading, useGo } from '../components/ui.jsx'

function ProjectSelect({ projects, value, onChange }) {
  return <Field label="Project" hint={!projects.length ? 'This workspace has no available projects.' : undefined}>
    <select value={value} required onChange={event => onChange(event.target.value)}>
      <option value="" disabled>Choose a project</option>
      {projects.map(project => <option key={project.id} value={project.id}>{project.name || project.key}</option>)}
    </select>
  </Field>
}

function Visibility({ value, onChange }) {
  return <Field label="Access level"><select value={value} onChange={event => onChange(event.target.value)}><option value="private">Private</option><option value="public">Public</option></select></Field>
}

export function CreateRepository({ workspace }) {
  const { state, user, transact } = useStore()
  const toast = useToast()
  const go = useGo()
  const [workspaceId, setWorkspaceId] = useState(workspace.id)
  const selected = byId(state.workspaces, workspaceId) || workspace
  const projects = scoped(state.projects, 'workspaceId', selected.id)
  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [includeReadme, setIncludeReadme] = useState(false)
  const [error, setError] = useState('')
  const project = byId(projects, projectId) || projects[0]
  const slug = slugify(name)
  function submit(event) {
    event.preventDefault()
    const response = transact(createRepository, { workspaceId: selected.id, projectId: project?.id, name, description, visibility, includeReadme })
    if (response.error) return setError(response.error)
    toast('Repository created')
    go(repoPath(selected, response.result))
  }

  return <>
    <div className="breadcrumb">{workspace.name || workspace.slug} / Repositories</div>
    <PageHeading title="Create a new repository" />
    <form className="panel form-panel form-layout" onSubmit={submit}>
      <div className="two-fields">
        <Field label="Workspace"><select value={selected.id} onChange={event => { setWorkspaceId(event.target.value); setProjectId('') }}>{list(state.workspaces).map(item => <option key={item.id} value={item.id}>{item.name || item.slug}</option>)}</select></Field>
        <ProjectSelect projects={projects} value={project?.id || ''} onChange={setProjectId} />
      </div>
      <Field label="Repository name" hint={`URL: /${selected.slug}/${slug || 'repository-name'}`}><input name="name" value={name} onChange={event => setName(event.target.value)} required maxLength={62} /></Field>
      <Visibility value={visibility} onChange={setVisibility} />
      <Field label="Description"><textarea value={description} onChange={event => setDescription(event.target.value)} /></Field>
      <Field label="Include a README?"><select value={includeReadme ? 'yes' : 'no'} onChange={event => setIncludeReadme(event.target.value === 'yes')}><option value="no">No</option><option value="yes">Yes</option></select></Field>
      <ErrorText>{error || (!user && 'A signed-in workspace member is required to create a repository.')}</ErrorText>
      <div className="form-actions"><Button to={wsPath(workspace, 'repositories')}>Cancel</Button><Button variant="primary" type="submit" disabled={!project || !user}>Create repository</Button></div>
    </form>
  </>
}

function SettingsForm({ workspace, repo }) {
  const { state, user, transact } = useStore()
  const toast = useToast()
  const projects = scoped(state.projects, 'workspaceId', workspace.id)
  const branches = openBranches(state, repo)
  const [values, setValues] = useState({ name: repo.name || repo.slug, description: repo.description || '', visibility: repo.visibility || 'private',
    projectId: repo.projectId || '', defaultBranchId: repo.defaultBranchId || '' })
  const [error, setError] = useState('')
  const update = (field, value) => setValues(current => ({ ...current, [field]: value }))
  const projectId = byId(projects, values.projectId)?.id || ''
  const defaultBranchId = byId(branches, values.defaultBranchId)?.id || ''
  function submit(event) {
    event.preventDefault()
    const response = transact(editRepository, { ...values, repositoryId: repo.id })
    if (response.error) return setError(response.error)
    setError('')
    toast('Repository details saved')
  }
  return <form className="panel form-panel form-layout" onSubmit={submit}>
    <h2>Repository details</h2>
    <Field label="Repository name" hint={`URL slug: ${repo.slug}`}><input value={values.name} required maxLength={62} onChange={event => update('name', event.target.value)} /></Field>
    <Field label="Description"><textarea value={values.description} onChange={event => update('description', event.target.value)} /></Field>
    <div className="two-fields">
      <ProjectSelect projects={projects} value={projectId} onChange={value => update('projectId', value)} />
      <Visibility value={values.visibility} onChange={value => update('visibility', value)} />
    </div>
    <Field label="Default branch" hint={!branches.length ? 'This repository has no active branches.' : undefined}><select value={defaultBranchId} required onChange={event => update('defaultBranchId', event.target.value)}><option value="" disabled>Choose a default branch</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
    <ErrorText>{error || (!user && 'A signed-in workspace member is required to edit repository details.')}</ErrorText>
    <FormActions label="Save changes" disabled={!user || !projects.length || !branches.length} />
  </form>
}

export function RepositorySettings({ workspace, repo }) {
  const { user, transact } = useStore()
  const toast = useToast()
  const go = useGo()
  const [showDelete, setShowDelete] = useState(false)
  const [error, setError] = useState('')
  function confirm(event) {
    event.preventDefault()
    const response = transact(deleteRepository, { repositoryId: repo.id })
    if (response.error) return setError(response.error)
    toast('Repository deleted')
    go(wsPath(workspace, 'repositories'), { replace: true })
  }
  return <>
    <PageHeading title="Repository settings" />
    <div className="stack">
      <SettingsForm workspace={workspace} repo={repo} />
      <PipelineSettings workspace={workspace} repo={repo} />
      <section className="panel form-panel form-layout"><h2>Manage repository</h2><p className="muted">Delete this repository from {workspace.name || workspace.slug}.</p>
        <div><Button variant="danger" disabled={!user} title={!user ? 'Sign in to delete a repository.' : undefined} onClick={() => { setError(''); setShowDelete(true) }}><Trash2 size={16} />Delete repository</Button></div>
      </section>
    </div>
    {showDelete && <Modal title="Delete repository?" onClose={() => setShowDelete(false)}><form className="form-layout" onSubmit={confirm}>
      <p>Delete <strong>{repo.name || repo.slug}</strong>? It will be removed from the workspace and its links will no longer open.</p><ErrorText>{error}</ErrorText>
      <FormActions label="Delete repository" danger onClose={() => setShowDelete(false)} />
    </form></Modal>}
  </>
}
