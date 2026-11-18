import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { actions } from './actions.js'
import { alphabetical, byId, current, dateText, label, matches, newest, numberText, qualified, repoPath } from './model.js'
import { useStore } from './store.jsx'
import {
  ActionLink, Dialog, Empty, ErrorText, Field, FormActions, Icon, LocalLink, Page,
  PullCommand, Search, Select, Table, useLocalNavigate, Visibility,
} from './ui.jsx'
import { TagDetail, TagIndex } from './tags.jsx'
import { Permissions } from './permissions.jsx'

const section = 'Repositories'
const indexPath = '/repositories'
const visibilityOptions = [['private', 'Private'], ['public', 'Public']]
const tabs = [['general', 'General'], ['tags', 'Tags'], ['permissions', 'Permissions'], ['settings', 'Settings']]
const pageSize = 12

export function RepositoryIndex() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const namespaceId = params.get('namespace') ?? ''
  const visibility = params.get('visibility') ?? ''
  const sort = params.get('sort') ?? 'updated'
  const namespaces = current(state, 'namespaces')
  const namespaceById = new Map(namespaces.map(namespace => [namespace.id, namespace]))
  const selectedNamespace = namespaceById.get(namespaceId)
  const repositories = current(state, 'repositories')
    .filter(repository => !namespaceId || repository.namespaceId === namespaceId)
  const tags = new Map()
  for (const tag of current(state, 'tags')) {
    tags.set(tag.repositoryId, (tags.get(tag.repositoryId) ?? 0) + 1)
  }
  const visible = repositories.filter(repository => (!visibility || repository.visibility === visibility)
    && matches(query, repository.name, qualified(namespaceById.get(repository.namespaceId), repository), repository.description))
  if (sort === 'name') visible.sort(alphabetical)
  else if (sort === 'pulls') visible.sort((a, b) => (b.pullCount ?? -1) - (a.pullCount ?? -1) || alphabetical(a, b))
  else visible.sort((a, b) => newest(a, b) || alphabetical(a, b))

  const pages = Math.max(1, Math.ceil(visible.length / pageSize))
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page'), 10) || 1))
  const start = (page - 1) * pageSize
  const createPath = selectedNamespace ? `/repositories/new?namespace=${encodeURIComponent(namespaceId)}` : '/repositories/new'
  function setFilter(key, value) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (key !== 'page') next.delete('page')
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }
  function clearFilters() {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      for (const key of ['q', 'visibility', 'sort', 'page']) next.delete(key)
      return next
    }, { replace: true })
  }

  return <Page section={section} title={section} description="Browse and manage container image repositories."
    context={selectedNamespace ? label(selectedNamespace) : 'All namespaces'}
    action={<ActionLink to={createPath}>Create repository</ActionLink>}>
    <div className="filters">
      <Search label="Search repositories" value={query} onChange={value => setFilter('q', value)}
        placeholder="Name or description" />
      <Select label="Namespace" value={namespaceId} onChange={value => setFilter('namespace', value)}
        options={[[ '', 'All namespaces' ], ...namespaces.map(namespace => [namespace.id, label(namespace)])]} />
      <Select label="Visibility" value={visibility} onChange={value => setFilter('visibility', value)}
        options={[[ '', 'All visibility' ], ['public', 'Public'], ['private', 'Private']]} />
      <Select label="Sort by" value={sort} onChange={value => setFilter('sort', value)}
        options={[[ 'updated', 'Last updated' ], ['name', 'Name'], ['pulls', 'Pulls']]} />
    </div>
    {visible.length ? <>
      <div className="results-label" role="status">{visible.length} {visible.length === 1 ? 'repository' : 'repositories'}</div>
      <Table className="inventory" headers={['Repository', 'Visibility', 'Tags', 'Pulls', 'Last updated']}>
        {visible.slice(start, start + pageSize).map(repository => {
          const namespace = namespaceById.get(repository.namespaceId)
          return <tr key={repository.id}>
            <td><div className="object-cell">
              <span className="object-icon"><Icon name="repository" size={17} /></span>
              <span className="object-label">
                {namespace?.slug ?
                  <LocalLink className="mono object" to={repoPath(namespace, repository)}>
                    <span className="muted">{namespace.slug}/</span>{repository.name}
                  </LocalLink> : <span className="mono">{qualified(namespace, repository)}</span>}
                {repository.description && <small>{repository.description}</small>}
              </span>
            </div></td>
            <td><Visibility value={repository.visibility} /></td>
            <td className="numeric">{tags.get(repository.id) ?? 0}</td>
            <td className="numeric">{numberText(repository.pullCount)}</td>
            <td className="muted nowrap">{dateText(repository.updatedAt)}</td>
          </tr>
        })}
      </Table>
      <div className="pagination" aria-label="Repository pagination">
        <span>Showing {start + 1}–{Math.min(start + pageSize, visible.length)} of {visible.length}</span>
        <div><button type="button" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setFilter('page', String(page + 1))}>Next</button></div>
      </div>
    </> : repositories.length ?
      <Empty title="No matching repositories"><p>Try a different search or visibility filter.</p>
        <button type="button" onClick={clearFilters}>Clear filters</button></Empty> :
      <Empty title={selectedNamespace ? 'This namespace has no repositories' : 'No repositories yet'}>
        <ActionLink to={createPath}>Create repository</ActionLink>
      </Empty>}
  </Page>
}

export function RepositoryCreate() {
  const { state, commit, announce } = useStore()
  const [params] = useSearchParams()
  const navigate = useLocalNavigate()
  const namespaces = current(state, 'namespaces')
  const [namespaceId, setNamespace] = useState(() => {
    const wanted = params.get('namespace') || state.account?.defaultNamespaceId
    return namespaces.find(namespace => namespace.id === wanted)?.id ?? namespaces[0]?.id ?? ''
  })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    try {
      const repository = commit('repository.created', actions.createRepository({ namespaceId, name, description, visibility }))
      announce('Repository created.')
      navigate(`${repoPath(byId(state, 'namespaces', namespaceId), repository)}/general`)
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <Page section={section} trail={[{ name: 'Create repository' }]} title="Create repository"
    description="Choose where the repository lives and who can see it.">
    <form className="panel form" onSubmit={submit}>
      <Select label="Namespace" value={namespaceId} onChange={setNamespace}
        options={namespaces.length ? namespaces.map(namespace => [namespace.id, label(namespace)]) : [['', 'No namespaces available']]} />
      <Field label="Repository name" value={name} onChange={setName}
        hint="2–255 lowercase letters, digits, hyphens, or underscores." />
      <Field label="Short description" value={description} onChange={setDescription} hint="Up to 100 characters." />
      <Select label="Visibility" value={visibility} onChange={setVisibility} options={visibilityOptions} />
      <ErrorText error={error} />
      <FormActions to={indexPath} label="Create repository" disabled={!namespaceId} />
    </form>
  </Page>
}

export function RepositoryRoute() {
  const { state } = useStore()
  const { namespace: slug, name, tab, tagName } = useParams()
  const namespace = current(state, 'namespaces').find(item => item.slug === slug)
  const repository = namespace && current(state, 'repositories')
    .find(item => item.namespaceId === namespace.id && item.name === name)
  const activeTab = tagName ? 'tags' : tab || 'general'
  if (!repository || !tabs.some(([key]) => activeTab === key)) {
    return <Page section={section} title="Repository unavailable">
      <Empty title="This repository could not be opened"><LocalLink to={indexPath}>Browse repositories</LocalLink></Empty>
    </Page>
  }
  const base = repoPath(namespace, repository)
  const reference = qualified(namespace, repository)
  const trail = [{ name: reference, to: `${base}/general` }]
  if (activeTab !== 'general') trail.push({ name: tabs.find(([key]) => key === activeTab)[1], to: `${base}/${activeTab}` })
  if (tagName) trail.push({ name: tagName })
  return <Page section={section} title={repository.name} description={<span className="mono">{reference}</span>}
    trail={trail} context={label(namespace)} action={<Visibility value={repository.visibility} />}>
    <nav className="tabs" aria-label="Repository sections">
      {tabs.map(([key, text]) => <LocalLink key={key} to={`${base}/${key}`}
        aria-current={activeTab === key ? 'page' : undefined}>{text}</LocalLink>)}
    </nav>
    <div className="stack" key={`${repository.id}/${activeTab}/${tagName ?? ''}`}>
      {activeTab === 'general' && <RepositoryGeneral repository={repository} reference={reference} />}
      {activeTab === 'tags' && (tagName ? <TagDetail repository={repository} base={base} reference={reference} name={tagName} /> :
        <TagIndex repository={repository} base={base} />)}
      {activeTab === 'permissions' && <Permissions repository={repository} namespace={namespace} />}
      {activeTab === 'settings' && <RepositorySettings repository={repository} reference={reference} />}
    </div>
  </Page>
}

function RepositoryGeneral({ repository, reference }) {
  const { commit, announce } = useStore()
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [overview, setOverview] = useState('')
  const [error, setError] = useState('')
  function edit() {
    setDescription(repository.description ?? '')
    setOverview(repository.overview ?? '')
    setError('')
    setEditing(true)
  }
  function save(event) {
    event.preventDefault()
    try {
      const result = commit('repository.updated', actions.updateRepository(repository.id, { description, overview }))
      setEditing(false)
      if (result) announce('Repository information saved.')
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <>
    <section className="panel">
      <h2>Pull this image</h2>
      <PullCommand reference={reference} />
    </section>
    <section className="panel">
      <div className="section-head"><h2>Repository information</h2>
        {!editing && <button type="button" onClick={edit}>Edit information</button>}
      </div>
      {editing ? <form className="form" onSubmit={save}>
        <Field label="Short description" value={description} onChange={setDescription} hint="Up to 100 characters." />
        <Field label="Overview" multiline rows={6} value={overview} onChange={setOverview} />
        <ErrorText error={error} />
        <FormActions onCancel={() => setEditing(false)} />
      </form> : <dl className="details">
        <div><dt>Short description</dt><dd>{repository.description || '—'}</dd></div>
        <div><dt>Overview</dt><dd className="prose">{repository.overview || '—'}</dd></div>
      </dl>}
    </section>
  </>
}

function RepositorySettings({ repository, reference }) {
  const { state, commit, announce } = useStore()
  const navigate = useLocalNavigate()
  const [dialog, setDialog] = useState('')
  const [typed, setTyped] = useState('')
  const newVisibility = repository.visibility === 'public' ? 'private' : 'public'
  const tagCount = current(state, 'tags').filter(row => row.repositoryId === repository.id).length
  const grantCount = current(state, 'repositoryPermissions').filter(row => row.repositoryId === repository.id).length
  const consequence = newVisibility === 'public' ? 'Anyone can find this repository and pull its images.'
    : 'Only people with access can find this repository and pull its images.'
  return <>
    <section className="panel">
      <div className="section-head"><h2>Repository visibility</h2><Visibility value={repository.visibility} /></div>
      <p>{consequence}</p>
      <button type="button" onClick={() => setDialog('visibility')}>Make {newVisibility}</button>
    </section>
    <section className="panel danger">
      <h2>Delete repository</h2>
      <p>Deleting this repository also removes its {tagCount} active {tagCount === 1 ? 'tag' : 'tags'} and {grantCount} team {grantCount === 1 ? 'grant' : 'grants'}.</p>
      <button type="button" className="danger-button" onClick={() => { setTyped(''); setDialog('delete') }}>Delete repository</button>
    </section>
    {dialog === 'visibility' && <Dialog title={`Make repository ${newVisibility}?`} confirm={`Make ${newVisibility}`}
      onCancel={() => setDialog('')} onConfirm={() => {
        commit('repository.visibility_changed', actions.visibility(repository.id, newVisibility))
        setDialog('')
        announce('Repository visibility updated.')
      }}><p><strong className="mono">{reference}</strong></p><p>{consequence}</p></Dialog>}
    {dialog === 'delete' && <Dialog title="Delete repository?" confirm="Delete repository"
      disabled={typed !== reference} onCancel={() => setDialog('')} onConfirm={() => {
        commit('repository.deleted', actions.deleteRepository(repository.id))
        announce('Repository deleted.')
        navigate(indexPath)
      }}>
      <p>Delete <strong className="mono">{reference}</strong>, {tagCount} active {tagCount === 1 ? 'tag' : 'tags'}, and {grantCount} team {grantCount === 1 ? 'grant' : 'grants'}.</p>
      <Field label="Type the qualified repository name" value={typed} onChange={setTyped} autoComplete="off" />
    </Dialog>}
  </>
}

