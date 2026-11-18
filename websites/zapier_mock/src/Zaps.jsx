import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AppLine, Badge, Dialog, Empty, Filter, Icon, Missing, PageTitle, Pagination, RowMenu, Search, SiteLink, usePage, useSiteNavigate,
} from './ui'
import { useWorkspace } from './store'
import {
  actor, appName, byId, createMeta, dateLabel, editMeta, idFor, includesText, isPublished, items, labels,
  newest, person, relevantSteps, replace, statusOf,
} from './utils/model'
import { blankStep, connectionIssue } from './utils/workflow'
import ZapEditor from './ZapEditor'

const ROOT = '__root'
const statusOptions = ['on', 'off', 'draft'].map((value) => [value, labels[value]])

function duplicate(zap, state) {
  const original = relevantSteps(zap)
  const draftStepIds = original.map(() => idFor('stp'))
  const stepIds = new Map(original.flatMap((step, index) => step.id ? [[step.id, draftStepIds[index]]] : []))
  const draftSteps = original.map((step, index) => ({
    ...step,
    id: draftStepIds[index],
    lastTest: null,
    fields: Object.fromEntries(Object.entries(step.fields || {}).map(([key, setting]) => [
      key,
      setting?.type === 'mapping' && stepIds.has(setting.stepId) ? { ...setting, stepId: stepIds.get(setting.stepId) } : setting,
    ])),
  }))
  return {
    ...zap, ...createMeta(state), id: idFor('zap'), name: (zap.name || 'Untitled Zap') + ' (copy)', ownerId: actor(state),
    status: 'draft', enabled: false, version: 0, publishedAt: null, publishedSteps: [], draftSteps,
  }
}

function ZapDialog({ edit, close }) {
  const { state, dispatch } = useWorkspace()
  const { zap, mode } = edit
  const [value, setValue] = useState(mode === 'rename' ? zap.name || '' : zap.folderId || '')
  const [alert, setAlert] = useState('')
  const actions = { rename: ['Rename Zap', 'Save name'], move: ['Move to folder', 'Move Zap'], delete: ['Delete Zap?', 'Delete Zap'] }
  const [title, action] = actions[mode]
  function submit() {
    const name = value.trim()
    if (mode === 'rename' && !name) return setAlert('Enter a Zap name.')
    dispatch((current) => {
      const live = byId(current.zaps, zap.id)
      if (!live) return current
      if (mode === 'delete') return { ...current, zaps: items(current.zaps).filter((entry) => entry.id !== zap.id) }
      const update = mode === 'rename' ? { name } : { folderId: value || null }
      return { ...current, zaps: replace(current.zaps, { ...live, ...update, ...editMeta(current) }) }
    }, { rename: 'Zap renamed.', move: 'Zap moved.', delete: 'Zap deleted.' }[mode])
    close()
  }
  return <Dialog title={title} action={action} onSubmit={submit} onClose={close} danger={mode === 'delete'} alert={alert}>
    {mode === 'rename' && <label className="form-field"><span>Zap name</span><input autoFocus value={value} maxLength={120} onChange={(event) => setValue(event.target.value)} /></label>}
    {mode === 'move' && <label className="form-field"><span>Destination folder</span><select autoFocus value={value} onChange={(event) => setValue(event.target.value)}><option value="">Workspace root</option>{items(state.folders).map((folder) => <option key={folder.id} value={folder.id}>{folder.name || 'Unnamed folder'}</option>)}</select></label>}
    {mode === 'delete' && <p><strong>{zap.name || 'Untitled Zap'}</strong> will be removed from the workspace. Its run history will remain available.</p>}
  </Dialog>
}

export function Zaps() {
  const { state, dispatch } = useWorkspace()
  const navigate = useSiteNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [folder, setFolder] = useState('')
  const [sort, setSort] = useState('updated')
  const [edit, setEdit] = useState(null)
  const all = items(state.zaps)
  const results = all.filter((zap) => {
    const matchedText = !query.trim() || includesText(query, zap.name, ...relevantSteps(zap).map((step) => appName(state, step.appId)))
    return matchedText && (!status || statusOf(zap) === status) && (!folder || (zap.folderId || ROOT) === folder)
  })
  const sorted = sort === 'name'
    ? results.sort((a, b) => (a.name || 'Untitled Zap').localeCompare(b.name || 'Untitled Zap'))
    : newest(results, 'updatedAt')
  const page = usePage(sorted)
  const change = (setter) => (value) => { setter(value); page.setPage(1) }

  function create() {
    const id = idFor('zap')
    dispatch((current) => ({ ...current, zaps: [...items(current.zaps), {
      id, name: 'Untitled Zap', ownerId: actor(current), folderId: null, status: 'draft', enabled: false, version: 0,
      draftSteps: [blankStep('trigger')],
      publishedSteps: [], publishedAt: null, ...createMeta(current),
    }] }), 'Draft created.')
    navigate('/zaps/' + encodeURIComponent(id))
  }

  return <>
    <PageTitle title="Zaps" description="Manage automations across your workspace.">
      <button className="primary" onClick={create}><Icon name="plus" />Create Zap</button>
    </PageTitle>
    <div className="toolbar">
      <Search label="Search Zaps" placeholder="Search by Zap or app" value={query} onChange={change(setQuery)} />
      <Filter label="Zap status" first="All statuses" options={statusOptions} value={status} onChange={change(setStatus)} />
      <Filter label="Folder" first="All folders" options={[[ROOT, 'Workspace root'], ...items(state.folders).map((entry) => [entry.id, entry.name || 'Unnamed folder'])]} value={folder} onChange={change(setFolder)} />
      {(query || status || folder) && <button onClick={() => { setQuery(''); setStatus(''); setFolder(''); page.setPage(1) }}>Clear filters</button>}
      <div className="toolbar-end"><Filter label="Sort Zaps" options={ [['updated', 'Recently updated'], ['name', 'Name A–Z']] } value={sort} onChange={change(setSort)} /></div>
    </div>
    <section className="panel" aria-label="Zap inventory">
      {page.rows.length ? <div className="table-frame zap-table"><table>
        <thead><tr><th scope="col">Zap name</th><th scope="col">Folder</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Last updated</th><th scope="col" aria-label="Actions" /></tr></thead>
        <tbody>{page.rows.map((zap) => {
          const name = zap.name || 'Untitled Zap'
          const location = zap.folderId ? byId(state.folders, zap.folderId)?.name || 'Unavailable folder' : 'Workspace root'
          return <tr key={zap.id}>
            <td><SiteLink className="record-link" to={'/zaps/' + encodeURIComponent(zap.id)}>{name}</SiteLink><div className="row-subtitle"><AppLine state={state} steps={relevantSteps(zap)} /></div></td>
            <td><span className="folder-label"><Icon name="folder" size={15} />{location}</span></td>
            <td>{person(state, zap.ownerId)}</td>
            <td><div className="inline-status"><Badge status={statusOf(zap)} />{isPublished(zap) && <ZapSwitch zap={zap} />}</div></td>
            <td className="table-date">{dateLabel(zap.updatedAt, true)}</td>
            <td className="table-actions"><RowMenu label={'Actions for ' + name} actions={[
              ['Rename', () => setEdit({ zap, mode: 'rename' })],
              ['Duplicate', () => dispatch((current) => {
                const live = byId(current.zaps, zap.id)
                return live ? { ...current, zaps: [...items(current.zaps), duplicate(live, current)] } : current
              }, 'Draft copy created.')],
              ['Move to folder', () => setEdit({ zap, mode: 'move' })],
              ['Delete', () => setEdit({ zap, mode: 'delete' }), true],
            ]} /></td>
          </tr>
        })}</tbody>
      </table></div> : <Empty title={all.length ? 'No matching Zaps' : 'No Zaps yet'}>{all.length ? 'Try a different search or clear your filters.' : 'Create a Zap to start automating work.'}</Empty>}
      <Pagination page={page} label="Zaps" />
    </section>
    {edit && <ZapDialog edit={edit} close={() => setEdit(null)} />}
  </>
}

export function ZapSwitch({ zap, onIssue }) {
  const { dispatch, setNotice } = useWorkspace()
  const enabled = zap.enabled ?? zap.status === 'on'
  return <button type="button" className="switch" role="switch" aria-checked={enabled} aria-label={'Toggle ' + (zap.name || 'Untitled Zap')} onClick={() => {
    const next = !enabled
    let issue
    dispatch((current) => {
      const live = byId(current.zaps, zap.id)
      if (!live || !isPublished(live)) return current
      if (next) {
        issue = items(live.publishedSteps).map((step) => connectionIssue(current, step)).find(Boolean)
        if (issue) return current
      }
      const updated = { ...live, enabled: next, status: next ? 'on' : 'off', ...editMeta(current) }
      return { ...current, zaps: replace(current.zaps, updated) }
    }, next ? 'Zap turned on.' : 'Zap turned off.')
    if (onIssue) onIssue(issue || '')
    else if (issue) setNotice(issue)
  }}><span aria-hidden="true" /></button>
}

export function ZapRoute() {
  const { zapId } = useParams()
  const { state } = useWorkspace()
  const zap = byId(state.zaps, zapId)
  return zap ? <ZapEditor key={zapId} zap={zap} Switch={ZapSwitch} /> : <Missing type="Zap" to="/zaps" back="Back to Zaps" />
}
