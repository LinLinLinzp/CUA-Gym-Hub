import React, { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  useWorkspace, SiteLink, useSiteNavigate, rows, find, text, fold, split, uid,
  upsert, without, deletion, revisions, dashboardPath, folderPath, rulePath,
} from '../workspace.jsx'
import { Confirm, DateLabel, Dialog, Empty, Field, PageHead, SaveBar, Section, SelectOptions } from '../ui.jsx'
import { PanelChart, timeRanges } from '../charts.jsx'
import { defaultRange } from '../data/seed.js'
import illustration from '../../assets/header-metrics.svg'

const visuals = [['timeseries', 'Time series'], ['stat', 'Stat'], ['table', 'Table']]
const tagSet = (dashboards) => [...new Set(dashboards.flatMap((item) => rows(item.tags)))].sort()
const tagsOf = (dashboard) => rows(dashboard.tags).map(text)
const folderName = (folders, id) => find(folders, id)?.title || (id ? 'Unavailable folder' : 'General')
const linkedRules = (rules, dashboardId, panelId) => rows(rules).filter((rule) =>
  rule.dashboardId === dashboardId && (panelId === undefined || rule.panelId === panelId))
const initialRange = (dashboard) => ({
  from: dashboard?.timeRange?.from || defaultRange.from,
  to: dashboard?.timeRange?.to || defaultRange.to,
})

function DashboardTags({ dashboard }) {
  const tags = tagsOf(dashboard)
  return tags.length ? <span className="tag-list">{tags.map((tag, index) => <span key={index} className="tag">{tag}</span>)}</span> : <span className="muted">—</span>
}

function Star({ dashboard, labeled = false }) {
  const { state, mutate } = useWorkspace()
  const starred = rows(state.starredDashboardIds).includes(dashboard.id)
  const label = (starred ? 'Unstar ' : 'Star ') + (dashboard.title || 'dashboard')
  return <button type="button" aria-label={label} aria-pressed={starred} title={label}
    className={(labeled ? '' : 'icon-button ') + (starred ? 'starred' : '')}
    onClick={() => mutate((latest) => {
      if (!find(latest.dashboards, dashboard.id)) return latest
      const ids = rows(latest.starredDashboardIds)
      const next = ids.includes(dashboard.id) ? ids.filter((id) => id !== dashboard.id) : [...ids, dashboard.id]
      return { ...latest, starredDashboardIds: next }
    }, starred ? 'Dashboard unstarred.' : 'Dashboard starred.')}>
    <span aria-hidden="true">{starred ? '★' : '☆'}</span>{labeled && (starred ? 'Unstar' : 'Star')}
  </button>
}

function NewFolder({ close, onSave }) {
  const { mutate } = useWorkspace()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  function save(event) {
    event.preventDefault()
    if (!title.trim()) return setError('Enter a folder name.')
    const id = uid('fld')
    const saved = mutate((latest, { createdAt, createdBy }) => {
      if (rows(latest.folders).some((folder) => fold(folder.title) === fold(title))) return latest
      return { ...latest, folders: [...rows(latest.folders), { id, title: title.trim(), createdAt, createdBy }] }
    }, 'Folder created.')
    if (saved) onSave(id)
    else setError('A folder already uses this name.')
  }
  return <Dialog title="New folder" close={close}>
    <form onSubmit={save} noValidate className="fields">
      <Field label="Folder name" error={error}><input autoFocus value={title} onChange={(event) => { setTitle(event.target.value); setError('') }} /></Field>
      <SaveBar label="Create folder" cancel={<button type="button" onClick={close}>Cancel</button>} />
    </form>
  </Dialog>
}

export function DashboardLibrary() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const navigate = useSiteNavigate()
  const [search, setSearch] = useState('')
  const [tags, setTags] = useState([])
  const [starred, setStarred] = useState(false)
  const [sort, setSort] = useState('name')
  const [newFolder, setNewFolder] = useState(false)
  const folder = find(state.folders, id)
  const dashboards = rows(state.dashboards)
  const visible = dashboards.filter((item) => (!id || item.folderId === id)
    && fold(item.title).includes(fold(search))
    && tags.every((tag) => tagsOf(item).includes(tag))
    && (!starred || rows(state.starredDashboardIds).includes(item.id)))
  visible.sort((a, b) => sort === 'updated'
    ? text(b.updatedAt).localeCompare(text(a.updatedAt)) || text(a.title).localeCompare(text(b.title))
    : text(a.title).localeCompare(text(b.title), undefined, { sensitivity: 'base' }))
  const filtering = Boolean(search || tags.length || starred)
  const clear = () => { setSearch(''); setTags([]); setStarred(false); setSort('name') }
  const createPath = '/dashboards/new' + (id ? '?folder=' + encodeURIComponent(id) : '')
  if (id && !folder) return <Empty title="Folder unavailable" detail="This folder could not be found." action={<SiteLink to="/dashboards">Back to dashboards</SiteLink>} />
  return <>
    <PageHead title="Dashboards" subtitle="Find and organize the dashboards your teams use to monitor services."
      actions={<><SiteLink className="button primary" to={createPath}>+ New dashboard</SiteLink><button onClick={() => setNewFolder(true)}>New folder</button></>}>
      <img className="hero" src={illustration} alt="" />
    </PageHead>
    <div className="library">
      <aside className="surface folders"><h2>Folders</h2>
        <nav className="folder-links" aria-label="Dashboard folders">
          <SiteLink aria-current={!id ? 'page' : undefined} to="/dashboards">All dashboards <span className="count">{dashboards.length}</span></SiteLink>
          {rows(state.folders).map((item) => <SiteLink key={item.id} aria-current={id === item.id ? 'page' : undefined} to={folderPath(item.id)}>
            {item.title || item.id}<span className="count">{dashboards.filter((dashboard) => dashboard.folderId === item.id).length}</span>
          </SiteLink>)}
        </nav>
      </aside>
      <section aria-label="Dashboard library">
        <div className="toolbar">
          <div className="search"><Field label="Search dashboards"><input type="search" placeholder="Search by title" value={search} onChange={(event) => setSearch(event.target.value)} /></Field></div>
          <Field label="Sort by"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name</option><option value="updated">Recently updated</option></select></Field>
          <label className="check"><input type="checkbox" checked={starred} onChange={(event) => setStarred(event.target.checked)} /> Starred only</label>
        </div>
        {(tagSet(dashboards).length > 0 || filtering) && <div className="filter-line" aria-label="Dashboard tags">
          <span className="muted">Tags</span>
          {tagSet(dashboards).map((tag) => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => setTags(
            (previous) => previous.includes(tag) ? previous.filter((item) => item !== tag) : [...previous, tag],
          )}>{tag}</button>)}
          {filtering && visible.length > 0 && <button type="button" onClick={clear}>Clear filters</button>}
        </div>}
        <div className="list-heading"><h2>{folder?.title || 'All dashboards'}</h2><span className="count">{visible.length}</span></div>
        {visible.length ? <div className="surface table-wrap"><table aria-label="Dashboards">
          <thead><tr><th scope="col">Title</th><th scope="col">Folder</th><th scope="col">Tags</th><th scope="col">Updated</th><th scope="col">Star</th></tr></thead>
          <tbody>{visible.map((dashboard) => <tr key={dashboard.id}>
            <td><SiteLink to={dashboardPath(dashboard.id)}>{dashboard.title || 'Untitled dashboard'}</SiteLink></td>
            <td>{folderName(state.folders, dashboard.folderId)}</td><td><DashboardTags dashboard={dashboard} /></td>
            <td><DateLabel value={dashboard.updatedAt} /></td><td><Star dashboard={dashboard} /></td>
          </tr>)}</tbody>
        </table></div> : <Empty title={filtering ? 'No matching dashboards' : 'No dashboards here yet'}
          detail={filtering ? 'Try a different title or adjust the filters.' : 'Create a dashboard to visualize your service metrics.'}
          action={filtering ? <button onClick={clear}>Clear filters</button> : <SiteLink to={createPath}>Create a dashboard</SiteLink>} />}
      </section>
    </div>
    {newFolder && <NewFolder close={() => setNewFolder(false)} onSave={(folderId) => {
      setNewFolder(false)
      clear()
      navigate(folderPath(folderId))
    }} />}
  </>
}

function DashboardMissing() {
  return <Empty title="Dashboard unavailable" detail="The dashboard could not be found." action={<SiteLink to="/dashboards">Back to dashboards</SiteLink>} />
}

function DashboardLinks({ dashboard }) {
  const { state } = useWorkspace()
  const folder = find(state.folders, dashboard.folderId)
  return <nav className="breadcrumb" aria-label="Breadcrumb"><SiteLink to="/dashboards">Dashboards</SiteLink>
    {folder && <><span aria-hidden="true">/</span><SiteLink to={folderPath(folder.id)}>{folder.title || folder.id}</SiteLink></>}
  </nav>
}

export function DashboardDetail() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const dashboard = find(state.dashboards, id)
  return dashboard ? <DashboardView key={id} dashboard={dashboard} /> : <DashboardMissing />
}

function DashboardView({ dashboard }) {
  const { state, mutate, notify } = useWorkspace()
  const navigate = useSiteNavigate()
  const [range, setRange] = useState(() => initialRange(dashboard))
  const [deleting, setDeleting] = useState(false)
  const [params] = useSearchParams()
  const linkedPanelId = params.get('panel')
  const linkedPanel = useRef(null)
  const dependents = linkedRules(state.alertRules, dashboard.id)
  const savedRange = initialRange(dashboard)
  const customRange = !timeRanges.some(([value]) => value === savedRange.from) || savedRange.to !== 'now'
  const selected = timeRanges.some(([value]) => value === range.from) && range.to === 'now' ? range.from : 'custom'
  const panels = rows(dashboard.panels)
  useEffect(() => {
    linkedPanel.current?.scrollIntoView({ block: 'nearest' })
    linkedPanel.current?.focus({ preventScroll: true })
  }, [linkedPanelId])

  function remove() {
    const saved = mutate((latest, stamp) => {
      const savedDashboard = find(latest.dashboards, dashboard.id)
      if (!savedDashboard || linkedRules(latest.alertRules, dashboard.id).length) return latest
      return {
        ...latest, dashboards: without(latest.dashboards, dashboard.id),
        starredDashboardIds: rows(latest.starredDashboardIds).filter((id) => id !== dashboard.id),
        activity: deletion(latest, 'dashboard', savedDashboard, stamp),
      }
    }, 'Dashboard deleted.')
    if (saved) navigate('/dashboards')
    else notify('The dashboard could not be deleted.', true)
  }
  return <>
    <DashboardLinks dashboard={dashboard} />
    <PageHead title={dashboard.title || 'Untitled dashboard'} subtitle={dashboard.description}
      actions={<>
        <SiteLink className="button primary" to={dashboardPath(dashboard.id) + '/edit'}>Edit dashboard</SiteLink>
        <Star dashboard={dashboard} labeled />
        <SiteLink className="button" to={dashboardPath(dashboard.id) + '/duplicate'}>Duplicate</SiteLink>
        <button onClick={() => setDeleting(true)}>Delete dashboard</button>
      </>} />
    <div className="toolbar">
      <Field label="Time range"><select value={selected} onChange={(event) => setRange(event.target.value === 'custom' ? initialRange(dashboard) : { from: event.target.value, to: 'now' })}>
        {customRange && <option value="custom">{savedRange.from} to {savedRange.to}</option>}
        {timeRanges.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></Field>
      <DashboardTags dashboard={dashboard} />
    </div>
    {panels.length ? <div className="panel-grid">{panels.map((panel) => <section className="surface panel" key={panel.id}
      ref={panel.id === linkedPanelId ? linkedPanel : undefined} tabIndex={panel.id === linkedPanelId ? -1 : undefined}>
      <h3>{panel.title || 'Untitled panel'}</h3><PanelChart panel={panel} range={range} />
    </section>)}</div> : <Empty title="This dashboard has no panels" action={<SiteLink to={dashboardPath(dashboard.id) + '/edit'}>Edit dashboard to add a panel</SiteLink>} />}
    {deleting && (dependents.length ? <Dialog title="Dashboard is linked to alert rules" close={() => setDeleting(false)}>
      <p>Update the dashboard links in these rules before deleting it.</p>
      <ul>{dependents.map((rule) => <li key={rule.id}><SiteLink to={rulePath(rule.id)}>{rule.name || rule.id}</SiteLink></li>)}</ul>
      <div className="actions end"><button onClick={() => setDeleting(false)} autoFocus>Close</button></div>
    </Dialog> : <Confirm title="Delete dashboard?" label="Delete dashboard" close={() => setDeleting(false)} confirm={remove}>
      <p>{dashboard.title || 'This dashboard'} and its panels will be deleted.</p>
    </Confirm>)}
  </>
}

function PanelEditor({ panel, sources, range, close, save }) {
  const [draft, setDraft] = useState(() => ({
    ...panel, title: text(panel?.title), type: panel?.type || 'timeseries',
    dataSourceId: panel?.dataSourceId ?? rows(sources)[0]?.id ?? '', query: text(panel?.query), unit: text(panel?.unit),
  }))
  const [errors, setErrors] = useState({})
  function set(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }
  function submit(event) {
    event.preventDefault()
    const next = {}
    if (!draft.title.trim()) next.title = 'Enter a panel title.'
    if (!find(sources, draft.dataSourceId)) next.dataSourceId = 'Select an available data source.'
    if (!draft.query.trim()) next.query = 'Enter a metric query.'
    if (!visuals.some(([type]) => type === draft.type)) next.type = 'Select a visualization type.'
    if (Object.keys(next).length) return setErrors(next)
    save({ ...draft, id: panel?.id ?? uid('pnl'), title: draft.title.trim(), query: draft.query.trim(), unit: draft.unit.trim() })
  }
  return <Dialog title={panel ? 'Edit panel' : 'Add panel'} close={close}>
    <form className="fields" noValidate onSubmit={submit}>
      <Field label="Panel title" error={errors.title}><input autoFocus value={draft.title} onChange={(event) => set('title', event.target.value)} /></Field>
      <div className="field-row">
        <Field label="Visualization type" error={errors.type}><select value={draft.type} onChange={(event) => set('type', event.target.value)}>
          {!visuals.some(([type]) => type === draft.type) && <option value={draft.type}>Unavailable type</option>}
          {visuals.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
        </select></Field>
        <Field label="Data source" error={errors.dataSourceId}><select value={draft.dataSourceId} onChange={(event) => set('dataSourceId', event.target.value)}>
          {draft.dataSourceId && !find(sources, draft.dataSourceId) && <option value={draft.dataSourceId}>Unavailable source</option>}
          <option value="">Select data source</option><SelectOptions items={sources} label="name" />
        </select></Field>
      </div>
      <Field label="Query" error={errors.query}><textarea className="query" value={draft.query} onChange={(event) => set('query', event.target.value)} /></Field>
      <Field label="Unit"><input value={draft.unit} placeholder="e.g. seconds" onChange={(event) => set('unit', event.target.value)} /></Field>
      <section className="surface panel" aria-label="Panel preview"><h3>Preview</h3>
        {draft.query.trim() && find(sources, draft.dataSourceId) ? <PanelChart panel={draft} range={range} /> : <p>Choose a data source and enter a query to preview sample metrics.</p>}
      </section>
      <SaveBar label="Apply panel" cancel={<button type="button" onClick={close}>Cancel</button>} />
    </form>
  </Dialog>
}

export function DashboardEditor({ edit, duplicate }) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { state } = useWorkspace()
  const source = find(state.dashboards, id)
  if ((edit || duplicate) && !source) return <DashboardMissing />
  return <DashboardForm key={id || 'new'} source={source} duplicate={duplicate} folderId={find(state.folders, searchParams.get('folder'))?.id} />
}

function DashboardForm({ source, duplicate, folderId }) {
  const { state, mutate } = useWorkspace()
  const navigate = useSiteNavigate()
  const before = duplicate ? undefined : source
  const cancelPath = source ? dashboardPath(source.id) : folderId ? folderPath(folderId) : '/dashboards'
  const [draft, setDraft] = useState(() => ({
    title: text(source?.title) + (duplicate ? ' copy' : ''),
    description: text(source?.description),
    folderId: source?.folderId ?? folderId ?? '',
    tags: tagsOf(source || {}).join(', '),
    timeRange: initialRange(source),
    panels: rows(source?.panels).map((item) => duplicate ? { ...item, id: uid('pnl') } : item),
  }))
  const [errors, setErrors] = useState({})
  const [newFolder, setNewFolder] = useState(false)
  const [panel, setPanel] = useState(null)
  const [blocked, setBlocked] = useState([])
  function set(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }
  function removePanel(id) {
    const rules = before ? linkedRules(state.alertRules, before.id, id) : []
    if (rules.length) setBlocked(rules)
    else set('panels', without(draft.panels, id))
  }
  function save(event) {
    event.preventDefault()
    const title = draft.title.trim()
    const location = draft.folderId || null
    const next = {}
    if (!title) next.title = 'Enter a dashboard title.'
    if (location && !find(state.folders, location) && before?.folderId !== location) next.folderId = 'Select an available folder.'
    if (rows(state.dashboards).some((item) => item.id !== before?.id && (item.folderId || null) === location && fold(item.title) === fold(title))) {
      next.title = 'A dashboard in this folder already uses this title.'
    }
    if (Object.keys(next).length) return setErrors(next)
    const id = before?.id ?? uid('db')
    let blockedRules = []
    const saved = mutate((latest, stamp) => {
      const previous = find(latest.dashboards, before?.id)
      if (before && !previous) return latest
      if (previous) {
        blockedRules = linkedRules(latest.alertRules, id).filter((rule) =>
          find(previous.panels, rule.panelId) && !find(draft.panels, rule.panelId))
        if (blockedRules.length) return latest
      }
      const dashboard = {
        ...previous, id, title, folderId: location, description: draft.description.trim(),
        tags: split(draft.tags), timeRange: { ...previous?.timeRange, ...draft.timeRange }, panels: draft.panels, ...revisions(previous, stamp),
      }
      return { ...latest, dashboards: upsert(latest.dashboards, dashboard) }
    }, before ? 'Dashboard updated.' : 'Dashboard created.')
    if (saved) navigate(dashboardPath(id))
    else if (blockedRules.length) setBlocked(blockedRules)
    else setErrors({ form: 'The dashboard could not be saved.' })
  }
  return <>
    {source ? <DashboardLinks dashboard={source} /> : <nav className="breadcrumb" aria-label="Breadcrumb"><SiteLink to="/dashboards">Dashboards</SiteLink></nav>}
    <PageHead title={duplicate ? 'Duplicate dashboard' : before ? 'Edit dashboard' : 'New dashboard'} />
    <form className="editor" onSubmit={save} noValidate>
      <Section title="Dashboard details"><div className="fields">
        <Field label="Title" error={errors.title}><input value={draft.title} onChange={(event) => set('title', event.target.value)} /></Field>
        <Field label="Description"><textarea rows="3" value={draft.description} onChange={(event) => set('description', event.target.value)} /></Field>
        <div className="field-row">
          <Field label="Folder" error={errors.folderId}><select value={draft.folderId} onChange={(event) => set('folderId', event.target.value)}>
            {draft.folderId && !find(state.folders, draft.folderId) && <option value={draft.folderId}>Unavailable folder</option>}
            <option value="">General</option><SelectOptions items={state.folders} />
          </select></Field>
          <div className="actions field-bottom"><button type="button" onClick={() => setNewFolder(true)}>New folder</button></div>
        </div>
        <Field label="Tags" hint="Separate tags with commas."><input value={draft.tags} onChange={(event) => set('tags', event.target.value)} /></Field>
        <Field label="Default time range"><select value={draft.timeRange.to === 'now' && timeRanges.some(([value]) => value === draft.timeRange.from) ? draft.timeRange.from : 'custom'}
          onChange={(event) => set('timeRange', { from: event.target.value, to: 'now' })}>
          {(!timeRanges.some(([value]) => value === draft.timeRange.from) || draft.timeRange.to !== 'now') && <option value="custom">{draft.timeRange.from} to {draft.timeRange.to}</option>}
          {timeRanges.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></Field>
      </div></Section>
      <Section title="Panels">
        {draft.panels.length ? <ul className="editor-list">{draft.panels.map((item) => <li key={item.id}>
          <div><h3>{item.title || 'Untitled panel'}</h3><small className="muted">{visuals.find(([value]) => value === item.type)?.[1] || 'Visualization'}</small></div>
          <div className="actions"><button type="button" aria-label={'Edit panel ' + item.title} onClick={() => setPanel({ item })}>Edit</button>
            <button type="button" aria-label={'Remove panel ' + item.title} onClick={() => removePanel(item.id)}>Remove</button></div>
        </li>)}</ul> : <p>No panels in this draft.</p>}
        <div className="actions"><button type="button" onClick={() => setPanel({})}>+ Add panel</button></div>
      </Section>
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <SaveBar label="Save dashboard" cancel={<SiteLink className="button" to={cancelPath}>Cancel</SiteLink>} />
    </form>
    {newFolder && <NewFolder close={() => setNewFolder(false)} onSave={(id) => { set('folderId', id); setNewFolder(false) }} />}
    {panel && <PanelEditor panel={panel.item} sources={state.dataSources} range={draft.timeRange} close={() => setPanel(null)}
      save={(item) => { set('panels', upsert(draft.panels, item)); setPanel(null) }} />}
    {!!blocked.length && <Dialog title="Panel is linked to alert rules" close={() => setBlocked([])}>
      <p>Update the panel links in these rules before removing it.</p>
      <ul>{blocked.map((rule) => <li key={rule.id}><SiteLink to={rulePath(rule.id)}>{rule.name || rule.id}</SiteLink></li>)}</ul>
      <div className="actions end"><button onClick={() => setBlocked([])} autoFocus>Close</button></div>
    </Dialog>}
  </>
}
