import React, { useState } from 'react'
import { ArrowLeft, ChartNoAxesGantt, ChevronDown, Ellipsis, FileText, Filter, Grid2X2, Pencil, Table2, Trash2, Zap } from 'lucide-react'
import { Outlet, useMatch, useOutletContext, useParams } from 'react-router-dom'
import { byId, deleteSheet, renameSheet, sheetPath } from '../data/sheets.js'
import { Favorite } from '../pages/Directory.jsx'
import { useStore } from '../store.jsx'
import { AppLink, AppTab, Button, Dialog, Menu, MenuLabel, Problem, useAppNavigate } from './ui.jsx'

export function SheetFrame() {
  const sheet = useOutletContext()
  return <SheetLayout key={sheet.id} sheet={sheet} />
}

function SheetLayout({ sheet }) {
  const { state, commit } = useStore()
  const navigate = useAppNavigate()
  const { formId, workflowId } = useParams()
  const gridRoute = useMatch('/sheets/:sheetId')
  const ganttRoute = useMatch('/sheets/:sheetId/gantt')
  const [mode, setMode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const root = sheetPath(sheet)
  const workspace = byId(state.workspaces, sheet.workspaceId)
  function open(next) {
    setName(sheet.name ?? '')
    setError('')
    setMode(next)
  }
  function submit(event) {
    event.preventDefault()
    try {
      if (mode === 'delete') {
        commit(current => deleteSheet(current, sheet.id))
        navigate(workspace ? '/workspaces/' + encodeURIComponent(workspace.id) : '/browse')
      } else {
        commit(current => renameSheet(current, sheet.id, name))
        setMode('')
      }
    } catch (failure) { setError(failure.message) }
  }
  return <main className="sheet-page">
    <div className="sheet-titlebar">
      <AppLink to={workspace ? '/workspaces/' + encodeURIComponent(workspace.id) : '/browse'} className="sheet-back" title="Back to workspace"><ArrowLeft size={17} /><span>{workspace?.name || 'Browse'}</span></AppLink>
      <span className="sheet-divider" />
      <span className="item-icon"><Table2 size={16} /></span>
      <h1>{sheet.name || 'Untitled sheet'}</h1>
      <Favorite sheet={sheet} />
      <Menu title="Sheet menu" label={<Ellipsis size={17} />}>
        <button onClick={() => open('rename')}><Pencil size={14} /> Rename</button>
        <button onClick={() => open('delete')}><Trash2 size={14} /> Delete sheet</button>
      </Menu>
    </div>
    <div className="sheet-toolbar">
      <div className="tabs" aria-label="Sheet views">
        <AppTab end to={root}><Grid2X2 size={16} /> Grid</AppTab>
        <AppTab to={root + '/gantt'}><ChartNoAxesGantt size={17} /> Gantt</AppTab>
      </div>
      <div className="toolbar-actions">
        {(gridRoute || ganttRoute) && <Button className={filter ? 'filter-active' : ''} onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}><Filter size={15} /> Filter{filter && <span className="active-dot" />}<ChevronDown size={12} /></Button>}
        <AppLink className="button secondary" aria-current={formId ? 'location' : undefined} to={root + '/forms'}><FileText size={15} /> Forms</AppLink>
        <Menu title="Automation" label={<MenuLabel><Zap size={15} /> Automation</MenuLabel>}>
          <AppLink aria-current={workflowId ? 'location' : undefined} to={root + '/automation'}>Manage Workflows</AppLink>
          <AppLink to={root + '/automation/new'}>Create Workflow</AppLink>
        </Menu>
      </div>
    </div>
    <Outlet context={{ sheet, filter, setFilter, filterOpen, setFilterOpen }} />
    {mode && <Dialog title={mode === 'delete' ? 'Delete sheet?' : 'Rename sheet'} onClose={() => setMode('')}>
      <form className="stack" onSubmit={submit}>
        {mode === 'delete' ? <p>Delete <strong>{sheet.name}</strong> and cancel its pending approval requests?</p> : <label className="field">Sheet name<input autoFocus value={name} required onChange={event => setName(event.target.value)} /></label>}
        <Problem message={error} />
        <div className="actions"><Button onClick={() => setMode('')}>Cancel</Button><Button type="submit" variant={mode === 'delete' ? 'danger' : 'primary'}>{mode === 'delete' ? 'Delete sheet' : 'Save'}</Button></div>
      </form>
    </Dialog>}
  </main>
}
