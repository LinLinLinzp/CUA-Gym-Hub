import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { activity, append, change, update, useStore } from '../store.jsx'
import { BackLink, Button, Dialog, Facts, Field, FormFooter, Heading, Panel, RouteLink, RowLink, Select, Status, Table, useFilters, useForm } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import { actor, byText, cents, find, fmtDate, label, list, matches, money, personName, uid } from '../utils/format.js'
import { newApproval, routingFor } from '../routing.js'
import { RoutingPreview } from '../RoutingPreview.jsx'

const columns = [['Request'], ['Requester'], ['Submitted'], ['Amount', true], ['Status']]
const subjectKey = { bill: 'bills', spend_request: 'spendRequests' }
const completed = ['approved', 'rejected']
const chain = approval => Array.isArray(approval.reviewerIds) ? approval.reviewerIds : []

export function Approvals() {
  const { state } = useStore()
  const filter = useFilters()
  const [requesting, setRequesting] = useState(false)
  const search = filter.get('q')
  const status = filter.get('status', 'pending')
  const type = filter.get('type')
  const sort = filter.get('sort', 'recent')
  const rows = list(state.approvals).filter(record => (status === 'all' || (status === 'completed' ? completed.includes(record.status) : record.status === status))
    && (!type || record.subjectType === type) && matches(search, record.title, personName(state, record.requesterId)))
    .sort((a, b) => sort === 'amount' ? (Number(b.amount) || 0) - (Number(a.amount) || 0) : byText(b.createdAt, a.createdAt))
  const blocked = !actor(state)
  return <>
    <Heading title="Approvals" subtitle="Review company spend requests and vendor invoices.">
      <Button variant="primary" disabled={blocked} onClick={() => setRequesting(true)}>Request spend</Button>
    </Heading>
    {blocked && <p className="muted">A signed-in administrator is required to submit or review requests.</p>}
    <Panel className="registry">
      <div className="toolbar">
        <Field label="Search approvals" type="search" placeholder="Title or requester" value={search} onChange={event => filter.set('q', event.target.value)} />
        <Select label="Status" value={status} onChange={event => filter.set('status', event.target.value)} options={[[ 'pending', 'Pending' ], ['completed', 'Completed'], ['all', 'All statuses']]} />
        <Select label="Type" value={type} onChange={event => filter.set('type', event.target.value)} options={[[ '', 'All types' ], ['bill', 'Bill'], ['spend_request', 'Spend request']]} />
        <Select label="Sort by" value={sort} onChange={event => filter.set('sort', event.target.value)} options={[[ 'recent', 'Most recently submitted' ], ['amount', 'Highest amount']]} />
      </div>
      <Table columns={columns} rows={rows.map(record => [record.id, [
        <RowLink to={'/approvals/' + encodeURIComponent(record.id)}>{record.title || 'Untitled approval'}<small>{label(record.subjectType)}</small></RowLink>,
        personName(state, record.requesterId), fmtDate(record.createdAt), money(record.amount, record.currency), <Status value={record.status} />,
      ]])} />
    </Panel>
    {requesting && <SpendForm onClose={() => setRequesting(false)} />}
  </>
}

function SpendForm({ onClose }) {
  const { state, commit } = useStore()
  const navigate = useNavigate()
  const form = useForm({ requesterId: '', title: '', purpose: '', amount: '' })
  const { values } = form
  const employee = find(state.people, values.requesterId)
  const amount = cents(values.amount)
  const route = routingFor(state, 'spend_request', amount / 100)
  function submit(event) {
    const problems = {}
    if (!employee) problems.requesterId = 'Select an employee.'
    if (!values.title.trim()) problems.title = 'Enter a title.'
    if (!values.purpose.trim()) problems.purpose = 'Describe the purpose.'
    if (!amount) problems.amount = 'Enter a positive USD amount with up to two decimal places.'
    if (!route.reviewerIds.length) problems.form = 'Add a valid reviewer before submitting.'
    form.submit(event, problems, () => {
      let approvalId
      commit((current, context) => {
        const requester = find(current.people, values.requesterId)
        if (!requester) throw new Error('This employee is unavailable.')
        const request = {
          id: uid('request'), title: values.title.trim(), purpose: values.purpose.trim(), requesterId: requester.id,
          department: requester.department ?? null, amount: amount / 100, currency: 'USD', status: 'pending_approval',
          createdBy: context.actorId, createdAt: context.now, updatedAt: context.now,
        }
        const approval = newApproval(current, context, { ...request, subjectId: request.id, subjectType: 'spend_request' })
        approvalId = approval.id
        request.approvalId = approval.id
        return activity({ ...current, spendRequests: append(current.spendRequests, request), approvals: append(current.approvals, approval) },
          context, 'spend_request.submitted', 'spend_request', request.id, { approvalId })
      }, 'Spend request submitted.')
      onClose()
      navigate(withSid('/approvals/' + encodeURIComponent(approvalId)))
    })
  }
  return <Dialog title="Request spend" onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <Select label="Employee" {...form.bind('requesterId')} options={[[ '', 'Select an employee' ], ...list(state.people).map(person => [person.id, person.name || person.id])]} />
      {employee?.department && <p className="muted">Department · {employee.department}</p>}
      <Field label="Title" {...form.bind('title')} />
      <Field label="Purpose" as="textarea" rows={3} {...form.bind('purpose')} />
      <Field label="Amount (USD)" inputMode="decimal" {...form.bind('amount')} />
      <RoutingPreview state={state} route={route} />
      <FormFooter onClose={onClose} submit="Submit request" error={form.errors.form} disabled={!route.reviewerIds.length} />
    </form>
  </Dialog>
}

function decisionContext(state, approval) {
  const key = subjectKey[approval.subjectType]
  const subject = key ? find(state[key], approval.subjectId) : null
  const index = approval.stepIndex ?? 0
  const reviewerId = Number.isInteger(index) && index >= 0 ? chain(approval)[index] : null
  const current = subject?.approvalId === approval.id && subject.status === 'pending_approval'
  return { key, subject, index, reviewerId, current }
}

function DecisionForm({ approval, decision, onClose }) {
  const { commit } = useStore()
  const form = useForm({ note: '' })
  const rejecting = decision === 'reject'
  const title = rejecting ? 'Reject request' : 'Approve request'
  return <Dialog title={title} onClose={onClose}>
    <form noValidate onSubmit={event => {
      const note = form.values.note.trim()
      form.submit(event, rejecting && !note ? { note: 'Enter a rejection reason.' } : {}, () => {
        commit((state, context) => {
          const before = find(state.approvals, approval.id)
          if (before?.status !== 'pending') throw new Error('This approval is no longer pending.')
          const { key, subject, index, reviewerId, current } = decisionContext(state, before)
          if (!current || !reviewerId || !find(state.people, reviewerId) || index !== (approval.stepIndex ?? 0)) {
            throw new Error('This record has no current approval step to decide.')
          }
          const stepIndex = rejecting ? index : index + 1
          const status = rejecting ? 'rejected' : stepIndex >= chain(before).length ? 'approved' : 'pending'
          const decisions = append(before.decisions, { id: uid('decision'), stepIndex: index, reviewerId, actorId: context.actorId,
            decision, note, createdAt: context.now })
          const next = { ...before, stepIndex, status, decisions, updatedAt: context.now }
          const records = { ...state, approvals: update(state.approvals, before.id, next) }
          if (status !== 'pending') records[key] = update(state[key], subject.id, { ...subject, status, updatedAt: context.now })
          return activity(records, context, rejecting ? 'approval.rejected' : 'approval.approved', 'approval', before.id,
            { approvalId: before.id, [key === 'bills' ? 'billId' : 'spendRequestId']: subject.id },
            { ...change(before, next, ['stepIndex', 'status']), ...(status !== 'pending' ? { subjectStatus: { from: subject.status, to: status } } : {}) })
        }, rejecting ? 'Request rejected.' : 'Approval recorded.')
        onClose()
      })
    }}>
      <Field label={rejecting ? 'Rejection reason' : 'Note (optional)'} as="textarea" rows={4} {...form.bind('note')} />
      <FormFooter onClose={onClose} submit={rejecting ? 'Reject' : 'Approve'} error={form.errors.form} danger={rejecting} />
    </form>
  </Dialog>
}

export function ApprovalDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const [decision, setDecision] = useState(null)
  const approval = find(state.approvals, id)
  if (!approval) return <><BackLink base="/approvals">Approvals</BackLink><Heading title="Approval unavailable" /></>
  const { subject, reviewerId, current } = decisionContext(state, approval)
  const bill = approval.subjectType === 'bill' ? subject : null
  const request = approval.subjectType === 'spend_request' ? subject : null
  const pending = approval.status === 'pending'
  const reviewer = find(state.people, reviewerId)
  const allowed = pending && current && reviewer && actor(state)
  const decisions = list(approval.decisions)
  return <>
    <BackLink base="/approvals">Approvals</BackLink>
    <Heading title={approval.title || 'Untitled approval'} subtitle={label(approval.subjectType)}>
      {allowed && <>
        <Button variant="primary" onClick={() => setDecision('approve')}>Approve</Button>
        <Button variant="danger" onClick={() => setDecision('reject')}>Reject</Button>
      </>}
    </Heading>
    {pending && !allowed && <p className="muted">{!current ? 'This approval is missing its current source record.' :
      !reviewer ? 'Assign a valid reviewer before deciding this step.' : 'A signed-in administrator is required to record a decision.'}</p>}
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Request details">
          {request && <p>{request.purpose || 'No purpose provided.'}</p>}
          {request?.department && <p className="muted">{request.department}</p>}
          {bill && <><p>{bill.memo || 'No memo provided.'}</p><RouteLink to={'/bills/' + encodeURIComponent(bill.id)}>View source bill</RouteLink></>}
          {!subject && <p className="muted">The linked source record is unavailable.</p>}
        </Panel>
        <Panel title="Review history">
          <Table columns={[[ 'Reviewer' ], ['Decision'], ['Date'], ['Note']]} empty="No decisions recorded yet."
            rows={decisions.map((record, i) => [record.id || i, [personName(state, record.reviewerId), label(record.decision),
              fmtDate(record.createdAt), record.note || '—']])} />
        </Panel>
      </div>
      <Panel title="Approval summary">
        <Facts rows={[[ 'Status', <Status value={approval.status} /> ], ['Amount', money(approval.amount, approval.currency)],
          ['Requester', personName(state, approval.requesterId)], ['Assigned reviewer', pending ? personName(state, reviewerId) : '—'],
          ['Submitted', fmtDate(approval.createdAt)], ['Policy revision', approval.routing?.version ?? '—']]} />
        <h3>Reviewer chain</h3>
        {chain(approval).length ? <ol className="review-chain">{chain(approval).map((reviewer, i) => <li key={i}>{personName(state, reviewer)}</li>)}</ol>
          : <p className="muted">No reviewers recorded.</p>}
      </Panel>
    </div>
    {decision && <DecisionForm approval={approval} decision={decision} onClose={() => setDecision(null)} />}
  </>
}
