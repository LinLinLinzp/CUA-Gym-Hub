import React, { useState } from 'react'
import { ArrowLeft, CircleCheck, Filter, Plus, Zap } from 'lucide-react'
import { useOutletContext, useParams } from 'react-router-dom'
import CellInput from '../components/CellInput.jsx'
import { Unavailable } from '../components/Resource.jsx'
import { AppLink, Button, Empty, Problem, Status, useAppNavigate } from '../components/ui.jsx'
import { responseColumn, saveWorkflow, toggleWorkflow } from '../data/approvals.js'
import { byId, columnsOf, idFor, rowsOf, sheetPath } from '../data/sheets.js'
import { useStore } from '../store.jsx'

export function WorkflowList() {
  const { sheet } = useOutletContext()
  const { state, commit } = useStore()
  const [error, setError] = useState('')
  const base = sheetPath(sheet) + '/automation'
  const workflows = (state.approvalWorkflows ?? []).filter(item => item.sheetId === sheet.id)
  return <section className="page sheet-subpage">
    <div className="section-heading"><div><h2>Manage Workflows</h2><p className="muted">Send approval requests when rows are added or edited.</p></div>
      <AppLink className="button primary" to={base + '/new'}><Plus size={16} /> Create Workflow</AppLink></div>
    <Problem message={error} />
    <div className="panel">{workflows.length ? <div className="table-scroll"><table className="records-table">
      <thead><tr><th>Workflow</th><th>Trigger</th><th>Approver</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{workflows.map(rule => <tr key={rule.id}>
        <td><AppLink className="item-link" to={base + '/' + encodeURIComponent(rule.id) + '/edit'}><span className="item-icon"><Zap size={16} /></span>{rule.name || 'Untitled workflow'}</AppLink></td>
        <td>{rule.trigger?.event === 'rowChanged' ? 'Row changed' : 'Row added'}</td>
        <td>{byId(state.users, rule.approverId)?.name ?? rule.approverId ?? '—'}</td>
        <td><Status value={rule.status} /></td>
        <td><div className="actions"><Button onClick={() => { try { commit(current => toggleWorkflow(current, sheet.id, rule.id)); setError('') } catch (failure) { setError(failure.message) } }}>{rule.status === 'paused' ? 'Reactivate' : 'Pause'}</Button></div></td>
      </tr>)}</tbody>
    </table></div> : <Empty title="No workflows yet" icon={Zap} />}</div>
  </section>
}

export function WorkflowBuilder() {
  const { sheet } = useOutletContext()
  const { state } = useStore()
  const { workflowId } = useParams()
  const rule = byId(state.approvalWorkflows, workflowId)
  if (workflowId && rule?.sheetId !== sheet.id) return <Unavailable title="Workflow unavailable" to={sheetPath(sheet) + '/automation'} link="Manage workflows" />
  return <WorkflowEditor key={workflowId || 'new'} sheet={sheet} rule={rule} />
}

function WorkflowEditor({ sheet, rule }) {
  const { state, commit } = useStore()
  const navigate = useAppNavigate()
  const base = sheetPath(sheet) + '/automation'
  const columns = columnsOf(sheet)
  const responses = columns.filter(responseColumn)
  const [draft, setDraft] = useState({
    name: rule?.name ?? '', status: rule?.status ?? 'active', event: rule?.trigger?.event ?? 'rowAdded',
    watchColumnId: rule?.trigger?.columnId ?? '', conditionColumnId: rule?.condition?.columnId ?? '', conditionValue: rule?.condition?.value ?? null,
    approverId: rule?.approverId ?? '', responseColumnId: rule?.responseColumnId ?? (responses.length ? '' : '$new'),
    subject: rule?.subject ?? '', message: rule?.message ?? '',
  })
  const [error, setError] = useState('')
  function patch(values) { setDraft({ ...draft, ...values }); setError('') }
  const condition = byId(columns, draft.conditionColumnId)
  const approver = byId(state.users, draft.approverId)
  return <section className="page workflow-editor">
    <div className="section-heading"><div><AppLink className="back-link" to={base}><ArrowLeft size={14} /> Manage Workflows</AppLink><h2>{rule ? 'Edit approval workflow' : 'Create approval workflow'}</h2></div></div>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      try { commit(current => saveWorkflow(current, sheet.id, rule?.id ?? idFor('aw'), draft)); navigate(base) } catch (failure) { setError(failure.message) }
    }}>
      <div className="panel workflow-section form-columns">
        <label className="field">Workflow name<input autoFocus required value={draft.name} onChange={event => patch({ name: event.target.value })} /></label>
        <label className="field">Status<select value={draft.status} onChange={event => patch({ status: event.target.value })}><option value="active">Active</option><option value="paused">Paused</option></select></label>
      </div>
      <section className="panel workflow-section stack">
        <h3><Zap size={17} /> Trigger</h3>
        <label className="field">When<select value={draft.event} onChange={event => patch({ event: event.target.value })}><option value="rowAdded">Row added</option><option value="rowChanged">Row changed</option></select></label>
        {draft.event === 'rowChanged' && <label className="field">Watched column<select required value={draft.watchColumnId} onChange={event => patch({ watchColumnId: event.target.value })}>
          <option value="">Choose a column</option>{columns.map(column => <option key={column.id} value={column.id} disabled={column.id === draft.responseColumnId}>{column.title}</option>)}
        </select></label>}
      </section>
      <section className="panel workflow-section stack">
        <h3><Filter size={17} /> Condition</h3>
        <label className="field">Condition column<select value={draft.conditionColumnId} onChange={event => patch({ conditionColumnId: event.target.value, conditionValue: null })}>
          <option value="">No condition</option>{columns.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
        </select></label>
        {condition && <label className="field">Equals<CellInput column={condition} value={draft.conditionValue} users={state.users} rows={rowsOf(state, sheet.id)} booleanSelect onChange={conditionValue => patch({ conditionValue })} /></label>}
      </section>
      <section className="panel workflow-section stack">
        <h3><CircleCheck size={17} /> Request approval</h3>
        <div className="form-columns">
          <label className="field">Approver<select required value={draft.approverId} onChange={event => patch({ approverId: event.target.value })}>
            <option value="">Select a contact</option>{(state.users ?? []).map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
          </select></label>
          <label className="field">Response column<select required value={draft.responseColumnId} onChange={event => patch({ responseColumnId: event.target.value })}>
            <option value="">Choose a response column</option>{responses.map(item => <option key={item.id} value={item.id} disabled={draft.event === 'rowChanged' && item.id === draft.watchColumnId}>{item.title}</option>)}
            <option value="$new">Create Approval Status column</option>
          </select></label>
        </div>
        <label className="field">Subject<input value={draft.subject} placeholder={draft.name || 'Workflow name'} onChange={event => patch({ subject: event.target.value })} /></label>
        <label className="field">Message<textarea rows="3" value={draft.message} onChange={event => patch({ message: event.target.value })} /></label>
      </section>
      <p className="workflow-summary">When a row is {draft.event === 'rowAdded' ? 'added' : 'changed'}{condition ? ' and the condition matches' : ''}, request approval from {approver?.name || 'the selected contact'}.</p>
      <Problem message={error} />
      <div className="actions"><AppLink className="button secondary" to={base}>Cancel</AppLink><Button variant="primary" type="submit">Save workflow</Button></div>
    </form>
  </section>
}
