import { useState } from 'react'
import { activity, append, change, update, useStore } from '../store.jsx'
import { Button, Dialog, Facts, Field, FormFooter, Heading, Panel, Select, Table, useForm } from '../ui.jsx'
import { actor, byText, cents, find, fmtDate, label, list, money, personName, uid } from '../utils/format.js'

const expenseKind = 'expense_requirements'
const routeKinds = ['spend_request_approvals', 'bill_approvals']
const expenseModes = [['always', 'Always'], ['threshold', 'At or above an amount'], ['never', 'Never']]
const scopes = {
  expense_requirements: 'Company expense documentation',
  spend_request_approvals: 'New employee spend requests',
  bill_approvals: 'New and resubmitted vendor bills',
  guidance: 'Workspace guidance',
}
const requirement = rule => rule?.mode === 'threshold' ? 'At or above ' + money(rule.thresholdAmount) : label(rule?.mode)

function RuleSummary({ kind, rules, state }) {
  if (kind === expenseKind) return <Facts rows={[[ 'Receipt', requirement(rules?.receipt) ], ['Memo', requirement(rules?.memo)]]} />
  if (routeKinds.includes(kind)) return <Facts rows={[[ 'First reviewer', personName(state, rules?.firstReviewerId) ],
    ['Second reviewer', rules?.secondReviewerId ? personName(state, rules.secondReviewerId) + ' at or above ' + money(rules.thresholdAmount) : 'None']]}/>
  return <p>{rules?.description || 'No guidance available.'}</p>
}

export function Policy() {
  const { state } = useStore()
  const [editing, setEditing] = useState(null)
  const policies = list(state.policies)
  const editable = policies.filter(policy => policy.kind === expenseKind || routeKinds.includes(policy.kind))
  const guidance = policies.filter(policy => !editable.includes(policy))
  return <>
    <Heading title="Policy" subtitle="Manage expense requirements and who reviews new requests." />
    {!actor(state) && <p className="muted">A signed-in administrator is required to publish policy changes.</p>}
    {!policies.length && <div className="empty">No published policies are available in this workspace.</div>}
    {editable.map(policy => {
      const revisions = list(state.policyRevisions).filter(record => record.policyId === policy.id).sort((a, b) =>
        (Number(b.version) || 0) - (Number(a.version) || 0) || byText(b.createdAt, a.createdAt))
      return <Panel key={policy.id} className="policy-panel">
        <div className="panel-header"><div><h2>{policy.name || label(policy.kind)}</h2><p className="muted">{scopes[policy.kind]}</p></div>
          <Button disabled={!actor(state)} onClick={() => setEditing(policy.id)}>Edit {policy.name || label(policy.kind)}</Button>
        </div>
        <div className="policy-grid"><RuleSummary kind={policy.kind} rules={policy.rules} state={state} />
          <Facts rows={[[ 'Published version', policy.version ], ['Last updated', fmtDate(policy.updatedAt)], ['Published by', personName(state, policy.updatedBy)]]} />
        </div>
        <details><summary>Revision history ({revisions.length})</summary>
          <Table columns={[[ 'Revision' ], ['Published'], ['Published by'], ['Rules']]} empty="No revisions recorded."
            rows={revisions.map((record, i) => [record.id || i, [record.version ?? '—', fmtDate(record.createdAt), personName(state, record.createdBy),
              <RuleSummary kind={policy.kind} rules={record.rules} state={state} />]])} />
        </details>
      </Panel>
    })}
    {guidance.length > 0 && <Panel title="Workspace guidance">
      <div className="policy-guidance">{guidance.map(policy => <section key={policy.id}><h3>{policy.name || label(policy.kind)}</h3>
        <RuleSummary kind={policy.kind} rules={policy.rules} state={state} /></section>)}</div>
    </Panel>}
    {editing && find(state.policies, editing) && <PolicyForm policy={find(state.policies, editing)} onClose={() => setEditing(null)} />}
  </>
}

function PolicyForm({ policy, onClose }) {
  const { state, commit } = useStore()
  const expense = policy.kind === expenseKind
  const form = useForm(() => {
    const rules = policy.rules
    return { receipt: rules?.receipt?.mode || 'always', receiptThreshold: rules?.receipt?.thresholdAmount ?? '',
      memo: rules?.memo?.mode || 'always', memoThreshold: rules?.memo?.thresholdAmount ?? '',
      firstReviewerId: rules?.firstReviewerId || '', secondReviewerId: rules?.secondReviewerId || '', thresholdAmount: rules?.thresholdAmount ?? '' }
  })
  const { values } = form
  const people = list(state.people).map(person => [person.id, person.name || person.id])
  function submit(event) {
    const problems = {}
    if (expense) {
      for (const key of ['receipt', 'memo']) {
        if (!expenseModes.some(([mode]) => mode === values[key])) problems[key] = 'Select a requirement mode.'
        if (values[key] === 'threshold' && !cents(values[key + 'Threshold'])) problems[key + 'Threshold'] = 'Enter a positive USD threshold with up to two decimals.'
      }
    } else {
      if (!find(state.people, values.firstReviewerId)) problems.firstReviewerId = 'Select a first reviewer.'
      if (values.secondReviewerId) {
        if (values.secondReviewerId === values.firstReviewerId || !find(state.people, values.secondReviewerId)) problems.secondReviewerId = 'Select a different, valid reviewer.'
        if (!cents(values.thresholdAmount)) problems.thresholdAmount = 'Enter a positive USD threshold with up to two decimals.'
      }
    }
    form.submit(event, problems, () => {
      commit((current, context) => {
        const before = find(current.policies, policy.id)
        if (!before || before.kind !== policy.kind || before.version !== policy.version) throw new Error('This policy changed. Reopen its editor to try again.')
        const prior = before.rules || {}
        const rules = expense ? { ...prior, ...Object.fromEntries(['receipt', 'memo'].map(key => [key, {
          ...prior[key], mode: values[key], thresholdAmount: values[key] === 'threshold' ? cents(values[key + 'Threshold']) / 100 : null,
        }])) } : { ...prior, firstReviewerId: values.firstReviewerId, secondReviewerId: values.secondReviewerId || null,
          thresholdAmount: values.secondReviewerId ? cents(values.thresholdAmount) / 100 : null }
        const version = (Number(before.version) || 0) + 1
        const next = { ...before, rules, version, updatedAt: context.now, updatedBy: context.actorId }
        const revision = { id: uid('revision'), policyId: before.id, version, rules, createdAt: context.now, createdBy: context.actorId }
        return activity({ ...current, policies: update(current.policies, before.id, next), policyRevisions: append(current.policyRevisions, revision) },
          context, 'policy.published', 'policy', before.id, { policyRevisionId: revision.id }, change(before, next, ['rules', 'version']))
      }, 'Policy changes published.')
      onClose()
    })
  }
  return <Dialog title={'Edit ' + (policy.name || label(policy.kind))} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <p className="muted">{scopes[policy.kind]}</p>
      {expense ? <>
        <Select label="Receipt requirement" options={expenseModes} {...form.bind('receipt')} />
        {values.receipt === 'threshold' && <Field label="Receipt threshold (USD)" inputMode="decimal" {...form.bind('receiptThreshold')} />}
        <Select label="Memo requirement" options={expenseModes} {...form.bind('memo')} />
        {values.memo === 'threshold' && <Field label="Memo threshold (USD)" inputMode="decimal" {...form.bind('memoThreshold')} />}
      </> : <>
        <Select label="First reviewer" options={[[ '', 'Select a reviewer' ], ...people]} {...form.bind('firstReviewerId')} />
        <Select label="Second reviewer" options={[[ '', 'No second reviewer' ], ...people]} {...form.bind('secondReviewerId')} />
        {values.secondReviewerId && <Field label="Second review threshold (USD)" inputMode="decimal" {...form.bind('thresholdAmount')} />}
      </>}
      <FormFooter onClose={onClose} submit="Publish changes" error={form.errors.form} />
    </form>
  </Dialog>
}
