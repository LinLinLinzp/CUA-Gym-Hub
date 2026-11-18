import { Field, Pick, SearchPick } from './ui.jsx'
import { eligibleRetainer } from '../data/periods.js'
import { find, visible } from '../utils/format.js'

export function TimeFields({ state, form, patch, locked, durationHint = 'For example, 1.5, 1h 30m or 1:30.' }) {
  const eligible = eligibleRetainer(state, form)
  const apply = Boolean(eligible && form.applyToRetainer !== false)
  const projects = state.projects.filter(row => row.clientId === form.clientId && (row.status !== 'archived' || row.id === form.projectId))
  return <div className="form-grid time-fields">
    <Field label="Client"><SearchPick rows={state.clients.filter(row => visible(row) || row.id === form.clientId)} value={form.clientId} disabled={locked} onChange={clientId => patch({ clientId, projectId: '', billable: Boolean(clientId), applyToRetainer: null })} /></Field>
    <Field label="Project"><Pick rows={projects} value={form.projectId} disabled={locked || !form.clientId} onChange={id => patch({ projectId: id, billable: id ? find(projects, id)?.billingType === 'hourly' : Boolean(form.clientId), applyToRetainer: null })} empty="No Project" /></Field>
    <Field label="Service"><Pick rows={state.services.filter(row => row.active !== false || row.id === form.serviceId)} value={form.serviceId} disabled={locked} onChange={serviceId => patch({ serviceId })} empty="No Service" /></Field>
    <Field label="Team Member"><Pick rows={state.users} value={form.userId} disabled={locked} onChange={userId => patch({ userId })} empty="Select a team member" /></Field>
    <Field label="Work Date"><input type="date" value={form.workDate} disabled={locked} onChange={e => patch({ workDate: e.target.value })} /></Field>
    <Field label="Duration" hint={durationHint}><input value={form.duration} disabled={locked} onChange={e => patch({ duration: e.target.value })} placeholder="0:00" /></Field>
    <Field label="Notes" className="span-2"><textarea value={form.notes} onChange={e => patch({ notes: e.target.value })} placeholder="What did you work on?" /></Field>
    <div className="span-2 actions">
      <label className="check-label"><input type="checkbox" checked={apply || form.billable} disabled={locked || apply} onChange={e => patch({ billable: e.target.checked })} />Billable</label>
      {(eligible || form.applyToRetainer === true) && <label className="check-label"><input type="checkbox" checked={apply || (!eligible && form.applyToRetainer === true)} disabled={locked} onChange={e => patch({ applyToRetainer: e.target.checked })} />Apply to Retainer</label>}
    </div>
  </div>
}
