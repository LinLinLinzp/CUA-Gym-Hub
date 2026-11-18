import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from './store.jsx'
import { AppLink, Breadcrumb, Dialog, Empty, ErrorText, FormActions, Intro, Metric, Pager, SortHead, Table, Tags, usePager, useRoute, useSort } from './ui.jsx'
import { campaignsFor, latestHistory, list, lower, newest, normalizeTarget, numberLabel, projectLabel, projectPath, replaceRecord, runsFor, same, splitItems, textSort } from './model.js'

const trackingTool = 'position-tracking'
const auditTool = 'site-audit'
const owners = (project) => project.ownerName || 'Unassigned'
const byText = (values) => [...new Set(values)].sort(textSort)

function ToolBadge({ row, tool }) {
  const tracking = tool === trackingTool
  const value = tracking ? row.visibility : row.run?.healthScore
  const exists = tracking ? row.campaign : row.run
  const label = exists ? numberLabel(value, '%') : (tracking ? 'Set up tracking' : 'Set up audit')
  return <AppLink className={'badge ' + (exists ? 'success' : 'notice')} to={projectPath(row.project, tool)}
    aria-label={exists && value == null ? 'Open ' + (tracking ? 'Position Tracking' : 'Site Audit') + ' (metric unavailable)' : undefined}>{label}</AppLink>
}

export function Projects({ tool }) {
  const { state } = useWorkspace()
  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState('')
  const [tag, setTag] = useState('')
  const [dialog, setDialog] = useState(null)
  const sort = useSort('createdAt', 'desc')
  const projects = list(state.projects)
  const all = projects.map(project => {
    const campaign = campaignsFor(state, project.id)[0]
    return { project, campaign, run: runsFor(state, project.id)[0], visibility: latestHistory(campaign).at(-1)?.visibility,
      name: projectLabel(project), owner: owners(project), domain: project.domain, createdAt: project.createdAt }
  })
  const query = lower(search.trim())
  const filtered = all.filter(row => (!query || lower(row.name).includes(query) || lower(row.domain).includes(query))
    && (!owner || row.owner === owner) && (!tag || list(row.project.tags).includes(tag)))
    .sort((a, b) => Number(Boolean(b.project.pinned)) - Number(Boolean(a.project.pinned))
      || sort.compare(a[sort.key], b[sort.key]) || newest(a.project, b.project))
  const pager = usePager(filtered)
  function reset() {
    setSearch('')
    setOwner('')
    setTag('')
    pager.setPage(1)
  }
  const create = () => setDialog({ type: 'create' })
  const title = tool === trackingTool ? 'Position Tracking' : tool === auditTool ? 'Site Audit' : 'Projects'
  const subtitle = tool === trackingTool ? 'Open a project to set up tracking or review its keyword rankings.'
    : tool === auditTool ? 'Open a project to configure a crawl or review its technical findings.'
    : 'Manage the websites, rankings and technical audits in your portfolio.'

  return <>
    <Intro title={title} subtitle={subtitle}>
      <button className="button primary" onClick={create}><span aria-hidden="true">+</span> Create project</button>
    </Intro>
    {!tool && <div className="metric-strip portfolio" aria-label="Portfolio summary">
      <Metric label="Total projects" value={all.length} />
      <Metric label="Projects with tracking" value={all.filter(row => row.campaign).length} />
      <Metric label="Projects with audits" value={all.filter(row => row.run).length} />
    </div>}
    <section className="directory" aria-label="Project directory">
      {all.length > 0 && <div className="toolbar">
        <input type="search" aria-label="Search projects" placeholder="Search by project or domain" value={search} onChange={event => { setSearch(event.target.value); pager.setPage(1) }} />
        <select aria-label="Filter by owner" value={owner} onChange={event => { setOwner(event.target.value); pager.setPage(1) }}>
          <option value="">All owners</option>
          {byText(all.map(row => row.owner)).map(value => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by tag" value={tag} onChange={event => { setTag(event.target.value); pager.setPage(1) }}>
          <option value="">All tags</option>
          {byText(projects.flatMap(project => list(project.tags))).map(value => <option key={value}>{value}</option>)}
        </select>
        {(owner || tag || search) && <button className="text-button" onClick={reset}>Clear filters</button>}
      </div>}
      {pager.total ? <>
        <Table label="Projects"><thead><tr>
          <SortHead sort={sort} field="name" onChange={() => pager.setPage(1)}>Project / Domain</SortHead>
          <SortHead sort={sort} field="owner" onChange={() => pager.setPage(1)}>Owner</SortHead>
          <th scope="col">Tags</th>
          {tool !== auditTool && <SortHead sort={sort} field="visibility" onChange={() => pager.setPage(1)}>Position Tracking</SortHead>}
          {tool !== trackingTool && <th scope="col">Site Audit</th>}
          {!tool && <th scope="col" className="align-right">Actions</th>}
        </tr></thead><tbody>{pager.rows.map(row => {
          const { project } = row
          return <tr key={project.id}>
            <td><div className="project-name">
              <span className="project-marker" aria-hidden="true" />
              <div><AppLink to={projectPath(project)}>{row.name}</AppLink><div className="path">{project.domain || 'Domain unavailable'}</div></div>
              {project.pinned && <span className="pin-mark" role="img" aria-label="Pinned" title="Pinned" />}
            </div></td>
            <td>{row.owner}</td><td><Tags items={list(project.tags)} /></td>
            {tool !== auditTool && <td><ToolBadge row={row} tool={trackingTool} /></td>}
            {tool !== trackingTool && <td><ToolBadge row={row} tool={auditTool} /></td>}
            {!tool && <td className="align-right"><ProjectMenu project={project} onEdit={() => setDialog({ type: 'edit', project })} onDelete={() => setDialog({ type: 'delete', project })} /></td>}
          </tr>
        })}</tbody></Table>
        <Pager pager={pager} noun="projects" />
      </> : all.length ? <Empty title="No matching projects" action={<button className="button" onClick={reset}>Clear filters</button>}>Try another search, owner or tag.</Empty>
        : <Empty title="No projects yet" action={<button className="button primary" onClick={create}>Create project</button>}>Add a website to set up Position Tracking and Site Audit.</Empty>}
    </section>
    {dialog?.type === 'delete' && <DeleteProject project={dialog.project} onClose={() => setDialog(null)} />}
    {dialog && dialog.type !== 'delete' && <ProjectForm project={dialog.project} onClose={() => setDialog(null)} />}
  </>
}

function ProjectMenu({ project, onEdit, onDelete }) {
  const { commit } = useWorkspace()
  const [location, setLocation] = useState(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  useEffect(() => {
    if (!location) return
    menu.current.querySelector('button').focus()
    function outside(event) {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setLocation(null)
    }
    function dismiss() { setLocation(null) }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
    }
  }, [location])

  function close(action) {
    setLocation(null)
    trigger.current.focus()
    action?.()
  }
  function toggle(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    setLocation(location ? null : { right: Math.max(8, window.innerWidth - bounds.right),
      ...(window.innerHeight - bounds.bottom < 130 ? { bottom: window.innerHeight - bounds.top + 4 } : { top: bounds.bottom + 4 }) })
  }
  function pin() {
    commit((state, { edit }) => {
      const current = list(state.projects).find(row => row.id === project.id)
      if (!current) return null
      const pinned = !current.pinned
      return {
        changes: { projects: replaceRecord(state.projects, current.id, { pinned, ...edit }) },
        event: { type: 'project.pin_changed', projectId: current.id, details: { pinned } },
      }
    }, project.pinned ? 'Project unpinned.' : 'Project pinned.')
  }

  return <>
    <button ref={trigger} className="icon-button" aria-label={'Actions for ' + projectLabel(project)} aria-expanded={Boolean(location)} onClick={toggle}>⋯</button>
    {location && <div ref={menu} className="menu" style={location} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) setLocation(null)
    }} onKeyDown={event => { if (event.key === 'Escape') close() }}>
      <button onClick={() => close(pin)}>{project.pinned ? 'Unpin project' : 'Pin project'}</button>
      <button onClick={() => close(onEdit)}>Project settings</button>
      <button className="delete" onClick={() => close(onDelete)}>Delete project</button>
    </div>}
  </>
}

export function ProjectOverview({ project }) {
  const { state } = useWorkspace()
  const [dialog, setDialog] = useState('')
  const campaign = campaignsFor(state, project.id)[0]
  const run = runsFor(state, project.id)[0]
  const latest = latestHistory(campaign).at(-1)
  return <>
    <Breadcrumb items={[[ 'Projects', '/projects' ], [projectLabel(project)]]} />
    <Intro title={projectLabel(project)} subtitle={project.domain}>
      <button className="button" onClick={() => setDialog('edit')}>Project settings</button>
      <button className="button" onClick={() => setDialog('delete')}>Delete project</button>
    </Intro>
    <div className="two-columns">
      <section className="card padded stack tool-panel">
        <h2>Position Tracking</h2>
        {campaign ? <p>Current visibility <strong>{numberLabel(latest?.visibility, '%')}</strong></p> : <p className="muted">Choose a target and the keywords you want to monitor.</p>}
        <div className="actions"><AppLink className={'button ' + (campaign ? '' : 'primary')} to={projectPath(project, trackingTool)}>{campaign ? 'Open Position Tracking' : 'Set up Position Tracking'}</AppLink></div>
      </section>
      <section className="card padded stack tool-panel audit-panel">
        <h2>Site Audit</h2>
        {run ? <p>Site Health <strong>{numberLabel(run.healthScore, '%')}</strong> · {numberLabel(run.pagesCrawled)} pages crawled</p> : <p className="muted">Configure a crawl to identify technical issues on this site.</p>}
        <div className="actions"><AppLink className={'button ' + (run ? '' : 'primary')} to={projectPath(project, auditTool)}>{run ? 'Open Site Audit' : 'Set up Site Audit'}</AppLink></div>
      </section>
    </div>
    <section className="card padded stack"><h2>Project details</h2><p>Owner · {owners(project)}</p><Tags items={list(project.tags)} /></section>
    {dialog === 'edit' && <ProjectForm project={project} onClose={() => setDialog('')} />}
    {dialog === 'delete' && <DeleteProject project={project} onClose={() => setDialog('')} />}
  </>
}

function ProjectForm({ project, onClose }) {
  const { commit, account } = useWorkspace()
  const { go } = useRoute()
  const [domainInput, setDomain] = useState(project?.domain || '')
  const [name, setName] = useState(project?.name || '')
  const [tags, setTags] = useState(list(project?.tags).join(', '))
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const domain = project?.domain || normalizeTarget(domainInput, 'root_domain')
    if (!project && !domain) return setError('Enter a valid website domain, such as northstar-supply.example.')
    if (project && !name.trim()) return setError('Enter a project name.')
    let created
    let duplicate = false
    commit((state, { make, edit }) => {
      const rows = list(state.projects)
      if (project) {
        const current = rows.find(row => row.id === project.id)
        if (!current) return null
        const values = { name: name.trim(), tags: splitItems(tags) }
        const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => !same(value, current[key] ?? (key === 'tags' ? [] : ''))))
        return Object.keys(changes).length ? {
          changes: { projects: replaceRecord(rows, current.id, { ...changes, ...edit }) },
          event: { type: 'project.updated', projectId: current.id, details: { changes } },
        } : null
      }
      duplicate = rows.some(row => row.status !== 'deleted' && row.status !== 'archived' && normalizeTarget(row.domain, 'root_domain') === domain)
      if (duplicate) return null
      created = { ...make('prj'), name: name.trim() || domain, domain, ownerId: account.id, ownerName: account.name, tags: [], pinned: false }
      return { changes: { projects: [...rows, created] }, event: { type: 'project.created', projectId: created.id, details: { name: created.name, domain } } }
    }, project ? 'Project settings saved.' : 'Project created.')
    if (duplicate) return setError('A project already uses this domain.')
    onClose()
    if (created) go(projectPath(created))
  }

  return <Dialog title={project ? 'Project settings' : 'Create project'} onClose={onClose}>
    <form className="form" onSubmit={submit} noValidate>
      {!project && <label className="field">Website domain<input value={domainInput} onChange={event => { setDomain(event.target.value); setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'project-error' : undefined} placeholder="example.com" autoFocus required /></label>}
      <label className="field">Project name {project ? '' : '(optional)'}
        <input maxLength={120} value={name} onChange={event => { setName(event.target.value); setError('') }} autoFocus={Boolean(project)} required={Boolean(project)} aria-invalid={Boolean(project && error)} aria-describedby={project && error ? 'project-error' : undefined} />
      </label>
      {project && <label className="field">Tags<input aria-label="Tags" aria-describedby="project-tag-hint" value={tags} onChange={event => setTags(event.target.value)} placeholder="Retail, Priority" /><small id="project-tag-hint">Separate tags with commas.</small></label>}
      <ErrorText message={error} id="project-error" />
      <FormActions onClose={onClose} submit={project ? 'Save changes' : 'Create project'} />
    </form>
  </Dialog>
}

function DeleteProject({ project, onClose }) {
  const { commit } = useWorkspace()
  const { go } = useRoute()
  function remove(event) {
    event.preventDefault()
    commit(state => {
      const id = project.id
      const campaignIds = new Set(campaignsFor(state, id).map(row => row.id))
      const configs = new Set(list(state.auditConfigs).filter(row => row.projectId === id).map(row => row.id))
      const runIds = new Set(list(state.auditRuns).filter(row => row.projectId === id || configs.has(row.auditConfigId)).map(row => row.id))
      const selectors = {
        projects: row => row.id === id,
        trackingCampaigns: row => campaignIds.has(row.id),
        trackedKeywords: row => campaignIds.has(row.campaignId),
        trackingCompetitors: row => campaignIds.has(row.campaignId),
        auditConfigs: row => configs.has(row.id),
        auditRuns: row => runIds.has(row.id),
        auditIssues: row => runIds.has(row.runId),
        auditPages: row => runIds.has(row.runId),
      }
      const changes = {}
      const removedIds = {}
      for (const [key, match] of Object.entries(selectors)) {
        changes[key] = []
        removedIds[key] = []
        for (const row of list(state[key])) {
          if (match(row)) removedIds[key].push(row.id)
          else changes[key].push(row)
        }
      }
      if (!removedIds.projects.length) return null
      return { changes, event: { type: 'project.deleted', projectId: id, details: { name: projectLabel(project), domain: project.domain ?? null, removedIds } } }
    }, 'Project deleted.')
    onClose()
    go('/projects')
  }

  return <Dialog title="Delete project" onClose={onClose}>
    <form className="form" onSubmit={remove}>
      <p>Delete <strong>{projectLabel(project)}</strong> and all of its tracking campaigns, keywords, competitors, audit settings, and crawl history?</p>
      <FormActions onClose={onClose} submit="Delete project" danger />
    </form>
  </Dialog>
}


