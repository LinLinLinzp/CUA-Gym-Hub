import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { changesFor, createStamp, editStamp, event, find, label, list, put, uid, useStore, withEvents } from './store.jsx'
import { ActionLink, Confirm, Empty, Field, FormError, GoLink, Heading, Missing, Move, Options, Search, Target, move, useGo } from './ui.jsx'

const base = '/escalation-policies'
const pathFor = id => base + '/' + encodeURIComponent(id)
const linkedServices = (state, id) => list(state.services).filter(service => service.escalationPolicyId === id)
const byName = (a, b) => (a.name || '').localeCompare(b.name || '')
function TargetList({ items }) {
  return <div className="targets">{list(items).length ? list(items).map((target, index) => <Target key={index} target={target} />) : <span className="muted">No targets</span>}</div>
}
export function Policies() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('')
  const term = query.trim().toLowerCase()
  const items = list(state.escalationPolicies)
  const shown = items.filter(item => (!team || item.teamId === team) && (!term || item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term))).sort(byName)
  return <><Heading title="Escalation Policies" description="Manage the order in which responders are contacted for a service." actions={<ActionLink to={base + '/new'} primary add>New Escalation Policy</ActionLink>} />
    <section className="surface"><div className="toolbar"><Search label="Search escalation policies" value={query} onChange={setQuery} /><select aria-label="Filter by team" value={team} onChange={e => setTeam(e.target.value)}><Options items={state.teams} placeholder="All teams" /></select></div>
    {shown.length ? <div className="table-wrap"><table className="table responsive"><thead><tr><th>Policy</th><th>Team</th><th>Levels</th><th>Linked services</th><th>First-level targets</th></tr></thead><tbody>{shown.map(item => {
      const services = linkedServices(state, item.id)
      return <tr key={item.id}><td><GoLink to={pathFor(item.id)}>{item.name || 'Unnamed policy'}</GoLink></td><td data-label="Team">{label(state.teams, item.teamId)}</td><td data-label="Levels">{list(item.rules).length}</td><td data-label="Services">{services.map(service => service.name || 'Unnamed service').join(', ') || '—'}</td><td data-label="First level"><TargetList items={list(item.rules)[0]?.targets} /></td></tr>
    })}</tbody></table></div> : <Empty title={items.length ? 'No matching policies' : 'No escalation policies yet'} description={items.length ? 'Adjust the search or team filter.' : 'Create a policy to route service incidents.'}>{items.length ? <button onClick={() => { setTeam(''); setQuery('') }}>Reset filters</button> : <ActionLink to={base + '/new'}>New Escalation Policy</ActionLink>}</Empty>}
    </section></>
}
function DeletePolicy({ policy, close }) {
  const { state, commit } = useStore()
  const go = useGo()
  const services = linkedServices(state, policy.id)
  function remove() {
    const result = commit((current, actor, now) => {
      const latest = find(current.escalationPolicies, policy.id)
      if (!latest) return 'This policy is no longer available.'
      if (linkedServices(current, policy.id).length) return 'This policy is still assigned to a service.'
      const escalationPolicies = list(current.escalationPolicies).filter(item => item.id !== latest.id)
      return withEvents({ ...current, escalationPolicies }, [event('policy.deleted', 'escalation_policy', latest.id, actor, now, { name: latest.name || 'Unnamed policy' })])
    }, 'Escalation policy deleted')
    if (!result) go(base)
    return result
  }
  return <Confirm title="Delete escalation policy" action="Delete policy" onClose={close} onConfirm={remove} danger disabled={Boolean(services.length)}>
    {services.length ? <><p>Reassign these services before deleting the policy.</p><ul>{services.map(service => <li key={service.id}>{service.name || 'Unnamed service'}</li>)}</ul><div><ActionLink to={pathFor(policy.id) + '/edit'}>Edit service assignments</ActionLink></div></> : <p>Delete {policy.name || 'this policy'}? Existing incident routing snapshots remain in incident details.</p>}
  </Confirm>
}
export function PolicyDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const [deleting, setDeleting] = useState(false)
  const policy = find(state.escalationPolicies, id)
  if (!policy) return <Missing to={base} title="Escalation policy unavailable" />
  const rules = list(policy.rules)
  const services = linkedServices(state, id)
  return <><Heading title={policy.name || 'Unnamed policy'} description={policy.description}
    actions={<><button onClick={() => setDeleting(true)}>Delete policy</button><ActionLink to={pathFor(id) + '/edit'} primary>Edit policy</ActionLink></>} />
    <div className="columns">
      <section className="surface panel"><h2>Escalation levels</h2>{rules.length ? <ol className="policy-chain">{rules.map((rule, index) => <li key={rule.id || index}><span className="level-dot">{index + 1}</span><div><h3>Level {index + 1}</h3><TargetList items={rule.targets} /><small>{rule.delayMinutes == null ? 'Timeout unavailable' : 'Timeout after ' + rule.delayMinutes + ' min'}</small></div></li>)}</ol> : <p className="muted">No escalation levels configured.</p>}</section>
      <div className="stack">
        <section className="surface panel"><h2>Policy settings</h2><dl className="metadata compact"><div><dt>Team</dt><dd>{label(state.teams, policy.teamId)}</dd></div><div><dt>Repeat count</dt><dd>{policy.repeatCount ?? '—'}</dd></div></dl></section>
        <section className="surface panel"><h2>Linked services</h2>{services.length ? <ul className="record-list">{services.map(service => <li key={service.id}><strong>{service.name || 'Unnamed service'}</strong>{service.description && <p className="muted">{service.description}</p>}</li>)}</ul> : <p className="muted">No services are assigned to this policy.</p>}</section>
      </div>
    </div>
    {deleting && <DeletePolicy policy={policy} close={() => setDeleting(false)} />}
  </>
}
const blankTarget = () => ({ type: 'user', id: '' })
const blankRule = () => ({ id: uid(), delayMinutes: '15', targets: [blankTarget()] })
function ruleDraft(rule) {
  return { ...rule, delayMinutes: String(rule.delayMinutes ?? ''), targets: list(rule.targets).length ? rule.targets : [blankTarget()] }
}
const targetItems = (state, type) => type === 'schedule' ? state.schedules : state.users
function validate(draft, state) {
  const errors = {}
  if (!draft.name.trim()) errors.name = 'Enter a policy name.'
  if (draft.teamId && !find(state.teams, draft.teamId)) errors.team = 'Choose an available team or leave the policy without a team.'
  const repeatCount = Number(draft.repeatCount)
  if (!draft.repeatCount.trim() || !Number.isInteger(repeatCount) || repeatCount < 0 || repeatCount > 9) errors.repeat = 'Enter a whole number from 0 to 9.'
  if (!draft.rules.length) errors.rules = 'Add at least one escalation level.'
  const rules = draft.rules.map((rule, index) => {
    const minimum = rule.targets.length > 1 ? 3 : 1
    const delayMinutes = Number(rule.delayMinutes)
    if (!Number.isSafeInteger(delayMinutes) || delayMinutes < minimum) errors[index + '.delay'] = 'Enter at least ' + minimum + (minimum === 1 ? ' minute.' : ' minutes.')
    const unique = new Set(rule.targets.map(item => item.type + ':' + item.id))
    if (!rule.targets.length || unique.size !== rule.targets.length || rule.targets.some(target => !['user', 'schedule'].includes(target.type) || !find(targetItems(state, target.type), target.id))) errors[index + '.targets'] = 'Choose at least one available target and remove duplicates.'
    return { ...rule, delayMinutes }
  })
  return { errors, values: { name: draft.name.trim(), description: draft.description.trim(), teamId: draft.teamId || null, repeatCount, rules } }
}
function RuleEditor({ state, rule, index, total, edit, reorder, remove, errors }) {
  const changeTarget = (position, target) => edit({ ...rule, targets: rule.targets.map((item, i) => i === position ? target : item) })
  return <fieldset className="editor-block">
    <legend>Level {index + 1}</legend>
    <div className="editor-head"><Move index={index} total={total} onMove={reorder} label={'level ' + (index + 1)} /><button type="button" onClick={remove}>Remove level</button></div>
    <div className="form-row"><Field label="Timeout (minutes)" error={errors[index + '.delay']}><input type="number" min={rule.targets.length > 1 ? 3 : 1} value={rule.delayMinutes} onChange={e => edit({ ...rule, delayMinutes: e.target.value })} /></Field></div>
    {rule.targets.map((target, position) => {
      const items = targetItems(state, target.type)
      return <div key={position} className="editor-row">
        <Field label={'Target ' + (position + 1) + ' type'}><select value={target.type} onChange={e => changeTarget(position, { ...target, type: e.target.value, id: '' })}><option value="user">User</option><option value="schedule">Schedule</option></select></Field>
        <Field label={target.type === 'schedule' ? 'Schedule target' : 'User target'}><select value={target.id} onChange={e => changeTarget(position, { ...target, id: e.target.value })}>{target.id && !find(items, target.id) && <option value={target.id}>Unavailable target</option>}<Options items={items} /></select></Field>
        <Move index={position} total={rule.targets.length} onMove={(i, offset) => edit({ ...rule, targets: move(rule.targets, i, offset) })} label={'target ' + (position + 1)} />
        <button type="button" onClick={() => edit({ ...rule, targets: rule.targets.filter((item, i) => i !== position) })}>Remove target</button>
      </div>
    })}
    {errors[index + '.targets'] && <small className="error">{errors[index + '.targets']}</small>}
    <div><button type="button" onClick={() => edit({ ...rule, targets: [...rule.targets, blankTarget()] })}>Add target</button></div>
  </fieldset>
}
function ServiceAssignments({ state, policyId, selected, replacements, setSelected, setReplacements, errors }) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const items = list(state.services).filter(service => !term || service.name?.toLowerCase().includes(term)).sort(byName)
  const policies = list(state.escalationPolicies).filter(policy => policy.id !== policyId)
  return <section className="assignment-editor form"><h2>Service assignments</h2><Search label="Find a service" value={query} onChange={setQuery} />
    <div className="service-options">{items.length ? items.map(service => {
      const checked = selected.includes(service.id)
      const removed = policyId && service.escalationPolicyId === policyId && !checked
      const pendingMove = checked && service.escalationPolicyId && service.escalationPolicyId !== policyId
      return <div className="service-option" key={service.id}>
        <label className="check"><input type="checkbox" checked={checked} onChange={e => {
          setSelected(e.target.checked ? [...selected, service.id] : selected.filter(id => id !== service.id))
        }} />{service.name || 'Unnamed service'}</label>
        <small>{service.escalationPolicyId ? 'Current policy: ' + label(state.escalationPolicies, service.escalationPolicyId, 'Unavailable policy') : 'Unassigned'}{pendingMove && ' · Move pending'}</small>
        {removed && <Field label={'Replacement for ' + (service.name || 'service')} error={Boolean(errors[service.id]) && 'Select a replacement or explicitly leave it unassigned.'}>
          <select value={replacements[service.id] ?? ''} onChange={e => setReplacements({ ...replacements, [service.id]: e.target.value })}>
            <option value="">Choose what happens next</option><option value="unassigned">Leave unassigned</option>{policies.map(policy => <option key={policy.id} value={'policy:' + policy.id}>{policy.name || 'Unnamed policy'}</option>)}
          </select>
        </Field>}
      </div>
    }) : <p className="muted">No matching services.</p>}</div>
  </section>
}
function servicePlan(state, id, selected, replacements) {
  const assignments = []
  const errors = {}
  for (const service of list(state.services)) {
    if (selected.includes(service.id)) {
      if (!id || service.escalationPolicyId !== id) assignments.push({ service, destination: 'this' })
    } else if (id && service.escalationPolicyId === id) {
      const choice = replacements[service.id]
      const replacement = choice?.startsWith('policy:') ? choice.substring(7) : null
      if (choice !== 'unassigned' && (!replacement || replacement === id || !find(state.escalationPolicies, replacement))) errors[service.id] = true
      else assignments.push({ service, destination: 'replacement', replacement })
    }
  }
  return { assignments, errors }
}
export function PolicyEditor({ editing = false }) {
  const { id } = useParams()
  const { state, commit } = useStore()
  const go = useGo()
  const existing = editing && find(state.escalationPolicies, id)
  const [draft, setDraft] = useState(() => ({
    name: existing?.name || '', description: existing?.description || '', teamId: existing?.teamId || '',
    repeatCount: String(existing?.repeatCount ?? 0), rules: existing ? list(existing.rules).map(ruleDraft) : [blankRule()],
  }))
  const [selected, setSelected] = useState(() => existing ? linkedServices(state, id).map(service => service.id) : [])
  const [replacements, setReplacements] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  if (editing && !existing) return <Missing to={base} title="Escalation policy unavailable" />
  const set = key => e => setDraft({ ...draft, [key]: e.target.value })
  const errors = submitted ? validate(draft, state).errors : {}
  const plan = servicePlan(state, id, selected, replacements)
  const transfers = plan.assignments.filter(({ service }) => service.escalationPolicyId)
  function save() {
    let savedId = id
    const result = commit((current, actor, now) => {
      const { errors, values } = validate(draft, current)
      const { assignments, errors: serviceErrors } = servicePlan(current, id, selected, replacements)
      if (Object.keys(errors).length || Object.keys(serviceErrors).length) return 'Review the policy and service assignments.'
      const before = editing && find(current.escalationPolicies, id)
      if (editing && !before) return 'This policy is no longer available.'
      if (before && !assignments.length && !Object.keys(changesFor(before, values)).length) return 'No changes to save.'
      savedId = before ? before.id : uid()
      const item = { ...before, ...values, id: savedId, ...(before ? editStamp(actor, now) : createStamp(actor, now)) }
      const next = { ...current, escalationPolicies: put(current.escalationPolicies, item) }
      if (assignments.length) {
        const mapped = new Map(assignments.map(({ service, destination, replacement }) => [service.id, destination === 'this' ? savedId : replacement]))
        next.services = list(current.services).map(service => mapped.has(service.id) ? { ...service, escalationPolicyId: mapped.get(service.id) } : service)
      }
      return withEvents(next, [event(before ? 'policy.updated' : 'policy.created', 'escalation_policy', savedId, actor, now, {
        ruleIds: item.rules.map(rule => rule.id), affectedServiceIds: assignments.map(({ service }) => service.id),
      })])
    }, editing ? 'Escalation policy updated' : 'Escalation policy created')
    if (!result) go(pathFor(savedId))
    return result
  }
  function submit(e) {
    e.preventDefault()
    setSubmitted(true)
    setError('')
    if (Object.keys(validate(draft, state).errors).length || Object.keys(plan.errors).length) return
    if (transfers.length) setConfirming(true)
    else setError(save())
  }
  return <><Heading title={editing ? 'Edit escalation policy' : 'New Escalation Policy'} description={editing ? existing.name : 'Order responders and assign the policy to services.'} />
  <form onSubmit={submit} noValidate className="form">
    <section className="surface panel form"><div className="form-row">
      <Field label="Policy name" error={errors.name}><input value={draft.name} onChange={set('name')} /></Field>
      <Field label="Team" error={errors.team}><select value={draft.teamId} onChange={set('teamId')}>{draft.teamId && !find(state.teams, draft.teamId) && <option value={draft.teamId}>Unavailable team</option>}<Options items={state.teams} placeholder="No team" /></select></Field>
      <Field label="Repeat count" error={errors.repeat}><input type="number" min="0" max="9" value={draft.repeatCount} onChange={set('repeatCount')} /></Field>
    </div><Field label="Description"><textarea value={draft.description} onChange={set('description')} /></Field></section>
    <section className="surface panel form"><h2>Escalation levels</h2>
      {draft.rules.map((rule, index) => <RuleEditor key={rule.id || index} state={state} rule={rule} index={index} total={draft.rules.length} errors={errors}
        edit={next => setDraft({ ...draft, rules: draft.rules.map((item, i) => i === index ? next : item) })}
        reorder={(position, offset) => setDraft({ ...draft, rules: move(draft.rules, position, offset) })}
        remove={() => setDraft({ ...draft, rules: draft.rules.filter((item, i) => i !== index) })} />)}
      {errors.rules && <small className="error">{errors.rules}</small>}<div><button type="button" onClick={() => setDraft({ ...draft, rules: [...draft.rules, blankRule()] })}>Add level</button></div>
    </section>
    <div className="surface panel"><ServiceAssignments state={state} policyId={id} selected={selected} replacements={replacements} setSelected={setSelected} setReplacements={setReplacements} errors={submitted ? plan.errors : {}} /></div>
    {submitted && Object.keys(plan.errors).length > 0 && <FormError>Choose what happens to each removed service. Clear the service search to find hidden assignments.</FormError>}
    <FormError>{error}</FormError><div className="form-actions"><button className="primary" type="submit">{editing ? 'Save changes' : 'Create escalation policy'}</button><ActionLink to={editing ? pathFor(id) : base}>Cancel</ActionLink></div>
  </form>
  {confirming && <Confirm title="Confirm service assignment changes" action="Confirm and save" onClose={() => setConfirming(false)} onConfirm={save}>
    <ul className="record-list">{transfers.map(({ service, destination, replacement }) => <li key={service.id}><strong>{service.name || 'Unnamed service'}</strong><small>{label(state.escalationPolicies, service.escalationPolicyId, 'Unavailable policy')} → {destination === 'this' ? draft.name.trim() : replacement ? label(state.escalationPolicies, replacement, 'Unavailable policy') : 'Unassigned'}</small></li>)}</ul>
  </Confirm>}
  </>
}
