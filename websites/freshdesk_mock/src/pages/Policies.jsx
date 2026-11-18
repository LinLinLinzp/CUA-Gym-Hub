import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { AppLink, Confirm, Dialog, Empty, Field, PageHeading, Pill, Select } from '../components.jsx'
import { createPolicy, movePolicy, saveAdminRecord } from '../data/actions.js'
import { find, label, orderedPolicies, PRIORITIES, records, SOURCES, TARGET_FIELDS, TYPES, uid } from '../data/model.js'
import { useAccount } from '../store.jsx'

const conditionFields = [{ id: 'groupId', name: 'Group' }, { id: 'source', name: 'Source' }, { id: 'type', name: 'Type' }]
const conditionOptions = (state, field) => ({ groupId: records(state.groups), source: SOURCES, type: TYPES })[field] ?? []
const conditionLabel = (state, condition) => condition.field === 'groupId'
  ? find(state.groups, condition.value)?.name || 'Unavailable group' : label(condition.value)

function PolicyEditor({ policy, onClose, onSaved }) {
  const { state, commit } = useAccount()
  const [hours, setHours] = useState(policy?.hoursMode ?? 'calendar')
  const [scheduleId, setScheduleId] = useState(policy?.scheduleId ?? '')
  const [conditions, setConditions] = useState(() => records(policy?.conditions)
    .map(condition => ({ key: uid('condition'), condition })))
  const [error, setError] = useState('')
  const isDefault = Boolean(policy?.isDefault)
  const schedules = records(state.businessSchedules)
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const description = String(form.get('description')).trim()
    const selected = conditions.map(row => row.condition)
    if (!name) return setError('Enter a policy name.')
    if (!isDefault && (!selected.length || selected.some(condition => !conditionFields.some(field => field.id === condition.field) ||
        !conditionOptions(state, condition.field).some(option => (typeof option === 'string' ? option : option.id) === condition.value)))) {
      return setError('Add at least one condition and choose an available value for each condition.')
    }
    if (hours === 'business' && !find(schedules, scheduleId)) return setError('Choose a business schedule.')
    const targets = { ...policy?.targets }
    for (const priority of PRIORITIES) {
      targets[priority] = { ...policy?.targets?.[priority] }
      for (const [key, title] of Object.entries(TARGET_FIELDS)) {
        const minutes = Number(form.get(`${priority}-${key}`))
        if (!Number.isSafeInteger(minutes) || minutes <= 0) return setError(`${label(priority)} · ${title} must be a positive whole number of minutes.`)
        targets[priority][key] = minutes
      }
    }
    const fields = {
      name, description, hoursMode: hours, scheduleId: hours === 'business' ? scheduleId : null, targets,
      enabled: isDefault || form.get('enabled') === 'on', matchMode: isDefault ? policy.matchMode ?? 'all' : form.get('matchMode'),
      conditions: isDefault ? policy.conditions ?? [] : selected,
    }
    const saved = commit(current => policy
      ? saveAdminRecord(current, 'sla_policy', policy.id, fields)
      : createPolicy(current, fields))
    onSaved(saved ? 'SLA policy saved.' : 'No policy changes to save.')
  }

  return <Dialog title={policy ? 'Edit SLA policy' : 'Add SLA policy'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit} noValidate>
      <Field label="Policy name"><input name="name" defaultValue={policy?.name ?? ''} required /></Field>
      <Field label="Description"><textarea name="description" rows={2} defaultValue={policy?.description ?? ''} /></Field>
      {isDefault ? <p className="muted">The default policy stays active at the end of the list.</p> :
        <label className="check-label"><input type="checkbox" name="enabled" defaultChecked={policy ? Boolean(policy.enabled) : true} /> Active</label>}
      {!isDefault && <fieldset>
        <legend>Matching conditions</legend>
        <Field label="Match"><select name="matchMode" defaultValue={policy?.matchMode ?? 'all'}>
          <option value="all">All conditions</option><option value="any">Any condition</option>
        </select></Field>
        {conditions.map(({ key, condition }, index) => <div className="condition-row" key={key}>
          <Select aria-label={`Condition ${index + 1} field`} options={conditionFields} value={condition.field} onChange={event => {
            setConditions(conditions.map(row => row.key === key ? { key, condition: { ...condition, field: event.target.value, value: '' } } : row))
          }} />
          <Select aria-label={`Condition ${index + 1} value`} options={conditionOptions(state, condition.field)} empty="Choose a value"
            value={condition.value} onChange={event => setConditions(conditions.map(row =>
              row.key === key ? { key, condition: { ...condition, value: event.target.value } } : row))} />
          <button type="button" className="icon-button" aria-label={`Remove condition ${index + 1}`}
            onClick={() => setConditions(conditions.filter(row => row.key !== key))}><Trash2 size={17} /></button>
        </div>)}
        <button type="button" className="button" onClick={() =>
          setConditions([...conditions, { key: uid('condition'), condition: { field: records(state.groups).length ? 'groupId' : 'source', value: '' } }])}>
          <Plus size={16} /> Add condition
        </button>
      </fieldset>}
      <div className="form-grid">
        <Field label="Coverage hours"><select value={hours} onChange={event => setHours(event.target.value)}>
          <option value="calendar">Calendar hours</option><option value="business">Business hours</option>
        </select></Field>
        {hours === 'business' && <Field label="Business schedule"><Select options={schedules} empty="Choose a schedule"
          value={scheduleId} onChange={event => setScheduleId(event.target.value)} /></Field>}
      </div>
      <fieldset>
        <legend>SLA targets in minutes</legend>
        <div className="scroll-table"><table className="matrix">
          <thead><tr><th scope="col">Priority</th>{Object.values(TARGET_FIELDS).map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
          <tbody>{[...PRIORITIES].reverse().map(priority => <tr key={priority}>
            <th scope="row"><Pill value={priority} /></th>
            {Object.entries(TARGET_FIELDS).map(([key, title]) => <td key={key}><input type="number" min="1" step="1" required
              name={`${priority}-${key}`} aria-label={`${label(priority)} ${title.toLowerCase()} minutes`}
              defaultValue={policy?.targets?.[priority]?.[key] ?? ''} /></td>)}
          </tr>)}</tbody>
        </table></div>
      </fieldset>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button>
        <button className="button primary">Save policy</button></div>
    </form>
  </Dialog>
}

export function Policies() {
  const { state, commit } = useAccount()
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState('')
  const policies = orderedPolicies(state)
  const custom = policies.filter(policy => !policy.isDefault)

  return <>
    <AppLink to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</AppLink>
    <PageHeading title="SLA policies" description="Active policies apply in order. The default covers tickets without a match.">
      <button className="button primary" onClick={() => setEditor({ policy: null })}><Plus size={18} /> Add policy</button>
    </PageHeading>
    {notice && <p className="notice page-notice" role="status">{notice}</p>}
    <section className="panel">
      <div className="section-heading"><h2>Policy order</h2><span className="muted">{policies.length} policies</span></div>
      {policies.length ? <ol className="policy-list">{policies.map(policy => {
        const index = custom.findIndex(item => item.id === policy.id)
        const name = policy.name || 'Unnamed policy'
        const conditions = records(policy.conditions)
        return <li key={policy.id} className="policy-row">
          <span className="policy-rank" aria-label={policy.isDefault ? 'Fallback' : `Precedence ${index + 1}`}>{policy.isDefault ? '↳' : index + 1}</span>
          <div className="policy-info"><h3>{name}</h3>
            {policy.description && <p>{policy.description}</p>}
            <div className="metadata">{policy.hoursMode === 'business' ? 'Business hours' : 'Calendar hours'}
              <span>{policy.isDefault ? 'Default fallback' : conditions.map(condition => conditionLabel(state, condition)).join(policy.matchMode === 'any' ? ' or ' : ' + ') || 'No conditions'}</span>
            </div>
          </div>
          <div className="item-actions">
            <Pill value={policy.enabled ? 'active' : 'inactive'} />
            {!policy.isDefault && <>
              <button className="icon-button" aria-label={`Move ${name} up`} disabled={index <= 0}
                onClick={() => { if (commit(current => movePolicy(current, policy.id, -1))) setNotice('Policy order updated.') }}><ArrowUp size={17} /></button>
              <button className="icon-button" aria-label={`Move ${name} down`} disabled={index >= custom.length - 1}
                onClick={() => { if (commit(current => movePolicy(current, policy.id, 1))) setNotice('Policy order updated.') }}><ArrowDown size={17} /></button>
              <button className="button" aria-label={`${policy.enabled ? 'Deactivate' : 'Activate'} ${name}`} onClick={() => {
                const enabled = !policy.enabled
                if (commit(current => saveAdminRecord(current, 'sla_policy', policy.id, { enabled }, enabled ? 'activated' : 'deactivated'))) {
                  setNotice(enabled ? 'Policy activated.' : 'Policy deactivated.')
                }
              }}>{policy.enabled ? 'Deactivate' : 'Activate'}</button>
            </>}
            <button className="button" aria-label={`Edit ${name}`} onClick={() => setEditor({ policy })}>Edit</button>
            {!policy.isDefault && <button className="icon-button" aria-label={`Delete ${name}`} onClick={() => setDeleting(policy)}><Trash2 size={16} /></button>}
          </div>
        </li>
      })}</ol> : <Empty title="No SLA policies"><p>Add a policy to define ticket deadlines.</p></Empty>}
    </section>
    {editor && <PolicyEditor policy={editor.policy} onClose={() => setEditor(null)} onSaved={message => { setNotice(message); setEditor(null) }} />}
    {deleting && <Confirm title={`Delete ${deleting.name || 'policy'}?`} message="Existing ticket deadlines will stay in effect. The policy will be removed from future matching."
      onClose={() => setDeleting(null)} onConfirm={() => {
        if (commit(current => saveAdminRecord(current, 'sla_policy', deleting.id, {}, 'deleted'))) setNotice('Policy deleted.')
        setDeleting(null)
      }} />}
  </>
}
