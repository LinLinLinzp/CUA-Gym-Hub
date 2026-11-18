import { useState } from 'react'
import { useAccount } from '../store.jsx'
import { currentForms, date, draft, idPath, latest, list, money, totals, yearLabel } from '../domain.js'
import { A, Badge, Empty, Field, Glyph, Heading, Options, Table, usePageFocus } from '../ui.jsx'

const activityTypes = [
  ['fafsa', 'FAFSA'], ['acknowledgment', 'Loan acknowledgment'], ['request', 'Repayment request'],
]

function activities(state) {
  return [
    ...list(state.fafsaForms).map(item => ({
      ...item, kind: 'fafsa', title: yearLabel(item.awardYear) + ' FAFSA',
      detail: item.revision == null ? '' : 'Edition ' + item.revision,
      path: idPath('/fafsa', item.id), resumable: draft(item),
    })),
    ...list(state.loanAcknowledgments).map(item => ({
      ...item, kind: 'acknowledgment', title: 'Annual Student Loan Acknowledgment',
      detail: yearLabel(item.awardYear), path: idPath('/loan-acknowledgment', item.id),
      updatedAt: item.signedAt || item.createdAt,
    })),
    ...list(state.repaymentRequests).map(item => ({
      ...item, kind: 'request', title: 'Income-driven repayment request',
      detail: item.id, path: idPath('/idr', item.id), resumable: item.status === 'draft',
    })),
  ].sort(latest)
}
function ActivityTable({ records }) {
  return <Table label="Account activity" columns={['Activity', 'Status', 'Last updated']} rows={records.map(item => [
    item.kind + ':' + item.id,
    <div><A to={item.path}>{item.title}</A><small>{[item.detail, item.resumable && 'Resume draft'].filter(Boolean).join(' · ')}</small></div>,
    <Badge status={item.status} />, date(item.updatedAt || item.createdAt),
  ])} />
}

export function Dashboard() {
  const { state } = useAccount()
  usePageFocus()
  const form = currentForms(list(state.fafsaForms))[0]
  const loans = list(state.loans)
  const activity = activities(state).slice(0, 5)
  return <>
    <header className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Account overview</span>
        <h1 id="page-heading" tabIndex={-1}>{state.profile?.firstName ? 'Welcome, ' + state.profile.firstName : 'Welcome to your account'}</h1>
        <p>Manage your federal student aid, from your FAFSA to repayment.</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-paper" /><div className="hero-paper"><i /><i /><i /><span /><span /><span /></div>
      </div>
    </header>
    <div className="grid three">
      <section className="panel summary">
        <span className="tile-icon"><Glyph name="forms" /></span>
        <h2>FAFSA</h2>
        {form ? <><p>{yearLabel(form.awardYear)} <Badge status={form.status} /></p>
          <A to={idPath('/fafsa', form.id)}>{draft(form) ? 'Resume FAFSA' : 'View FAFSA'}</A>
        </> : <><p className="muted">You have no forms on file.</p><A to="/fafsa">Explore FAFSA</A></>}
      </section>
      <section className="panel summary">
        <span className="tile-icon"><Glyph name="loans" /></span>
        <h2>My Loans</h2>
        <p><strong className="total">{money(totals(loans).totalBalance)}</strong><br /><small>Total federal loan balance</small></p>
        <A to="/my-loans">View loan details</A>
      </section>
      <section className="panel summary">
        <span className="tile-icon"><Glyph name="repayment" /></span>
        <h2>Repayment</h2>
        <p className="muted">Estimate monthly payments and compare loan terms.</p>
        <A to="/repayment">Compare plans</A>
      </section>
    </div>
    <section>
      <div className="section-heading"><h2>Recent activity</h2><A to="/my-activity">View all activity →</A></div>
      {activity.length ? <ActivityTable records={activity} /> : <Empty title="You have no activity yet." />}
    </section>
  </>
}

export function Activity() {
  const { state } = useAccount()
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const all = activities(state)
  const statuses = [...new Set(all.map(item => item.status).filter(Boolean))].sort()
  const visible = all.filter(item => (!kind || item.kind === kind) && (!status || item.status === status))
  return <>
    <Heading title="My Activity" description="Track FAFSA editions, loan acknowledgments, and repayment requests." />
    <section aria-label="Activity history">
      <div className="panel filters">
        <Field label="Activity type"><select value={kind} onChange={event => setKind(event.target.value)}><option value="">All activity</option><Options values={activityTypes} /></select></Field>
        <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><Options values={statuses} /></select></Field>
        {(kind || status) && <button onClick={() => { setKind(''); setStatus('') }}>Clear filters</button>}
      </div>
      <p className="count">{visible.length} {visible.length === 1 ? 'result' : 'results'} · Latest update first</p>
      {visible.length ? <ActivityTable records={visible} /> : <Empty title={all.length ? 'No activity matches your filters.' : 'You have no activity yet.'} />}
    </section>
  </>
}
