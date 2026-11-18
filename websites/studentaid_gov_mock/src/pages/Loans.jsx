import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store.jsx'
import { balance, createRecordId, date, find, idPath, list, loanName, matches, money, supportedYears, totals, yearLabel } from '../domain.js'
import { A, Badge, Check, Empty, Facts, Field, Heading, Missing, Options, Table, useGo } from '../ui.jsx'

const loanPath = id => idPath('/my-loans', id)
const ackPath = id => idPath('/loan-acknowledgment', id)
const schoolName = (state, loan) => find(state.schools, loan.schoolId)?.name || 'School unavailable'
const servicerName = (state, loan) => find(state.servicers, loan.servicerId)?.name || 'Servicer unavailable'

function BalanceCards({ value }) {
  return <div className="grid three">
    {[['Total balance', value.totalBalance], ['Outstanding principal', value.principalBalance], ['Accrued interest', value.accruedInterest]].map(([label, amount]) =>
      <div className="panel summary" key={label}><h3>{label}</h3><div className="total">{money(amount)}</div></div>
    )}
  </div>
}

export function Loans() {
  const { state } = useAccount()
  const all = list(state.loans)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [servicer, setServicer] = useState('')
  const [sort, setSort] = useState('balance')
  const statuses = [...new Set(all.map(item => item.status).filter(Boolean))].sort()
  const servicers = [...new Set(all.map(item => item.servicerId || ''))].map(id => [id || 'missing', servicerName(state, { servicerId: id })])
  const filtered = all.filter(loan => (!status || status === loan.status) &&
    (!servicer || servicer === (loan.servicerId || 'missing')) &&
    matches(query, loan.id, loan.type, loanName(loan), schoolName(state, loan)))
  const loans = filtered.sort((a, b) => sort === 'balance' ? balance(b) - balance(a) : String(b.disbursedOn || '').localeCompare(String(a.disbursedOn || '')))
  return <>
    <Heading title="My Loans" description="Review your federal loan balances, terms, and servicers." actions={<A className="button" to="/loan-acknowledgment">Annual Student Loan Acknowledgment</A>} />
    <BalanceCards value={totals(all)} />
    <section aria-label="Loan portfolio">
      <div className="panel filters">
        <div className="search"><Field label="Search loans"><input type="search" placeholder="School, loan type, or ID" value={query} onChange={event => setQuery(event.target.value)} /></Field></div>
        <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><Options values={statuses} /></select></Field>
        <Field label="Servicer"><select value={servicer} onChange={event => setServicer(event.target.value)}><option value="">All servicers</option><Options values={servicers} /></select></Field>
        <Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}><option value="balance">Highest balance</option><option value="disbursement">Newest disbursement</option></select></Field>
        {(query || status || servicer || sort !== 'balance') && <button onClick={() => { setQuery(''); setStatus(''); setServicer(''); setSort('balance') }}>Clear filters</button>}
      </div>
      <p className="count">{loans.length} {loans.length === 1 ? 'loan' : 'loans'}</p>
      {loans.length ? <Table label="My loans" columns={['Loan', 'Servicer', 'Status', 'Disbursed', 'Balance']} rows={loans.map(loan => [
        loan.id, <div><A to={loanPath(loan.id)}>{loanName(loan)}</A><small>{schoolName(state, loan)} · {loan.id}</small></div>,
        servicerName(state, loan), <Badge status={loan.status} />, date(loan.disbursedOn),
        Number.isFinite(loan.principalBalance) || Number.isFinite(loan.accruedInterest) ? money(balance(loan)) : 'Unavailable',
      ])} /> : <Empty title={all.length ? 'No loans match your filters.' : 'You have no loan records.'} />}
    </section>
  </>
}

export function LoanDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const loan = find(state.loans, id)
  if (!loan) return <Missing title="Loan unavailable" to="/my-loans" label="Return to My Loans" />
  const servicer = find(state.servicers, loan.servicerId)
  const plan = find(state.repaymentPlans, loan.planId)
  return <>
    <Heading title={loanName(loan)} description={loan.id} back="/my-loans" backLabel="All loans" actions={<Badge status={loan.status} />} />
    <div className="grid two">
      <section className="panel"><h2>Balance breakdown</h2><Facts entries={[
        ['Outstanding principal', money(loan.principalBalance)], ['Accrued interest', money(loan.accruedInterest)],
        ['Total balance', Number.isFinite(loan.principalBalance) || Number.isFinite(loan.accruedInterest) ? money(balance(loan)) : 'Unavailable'],
        ['Original amount', money(loan.originalAmount)],
      ]} /></section>
      <section className="panel"><h2>Loan details</h2><Facts entries={[
        ['School', schoolName(state, loan)], ['Loan type', loanName(loan)], ['Disbursed', date(loan.disbursedOn)],
        ['Interest rate', Number.isFinite(loan.interestRate) ? loan.interestRate + '%' : 'Unavailable'], ['Current repayment plan', plan?.name || 'Plan unavailable'],
        ...(loan.nextPaymentDueOn ? [['Next payment due', date(loan.nextPaymentDueOn)]] : []),
        ...(loan.nextPaymentAmount != null ? [['Next payment amount', money(loan.nextPaymentAmount)]] : []),
        ...(loan.recertificationDueOn ? [['Recertification due', date(loan.recertificationDueOn)]] : []),
      ]} /><A className="button" to="/repayment">Compare repayment plans</A></section>
      <section className="panel"><h2>Loan servicer</h2><Facts entries={[
        ['Servicer', servicer?.name || 'Servicer unavailable'],
        ...(servicer?.phone ? [['Sample phone', servicer.phone]] : []),
        ...(servicer?.mailingAddress ? [['Sample mailing address', servicer.mailingAddress]] : []),
      ]} /></section>
    </div>
  </>
}

export function Acknowledgment() {
  const { id } = useParams()
  const { state, commit } = useAccount()
  const go = useGo()
  const [year, setYear] = useState(supportedYears[0])
  const [confirmed, setConfirmed] = useState(false)
  const [signed, setSigned] = useState(false)
  const records = list(state.loanAcknowledgments)
  const loans = list(state.loans).filter(loan => balance(loan) > 0)
  const amounts = totals(loans)
  const existing = records.find(item => item.awardYear === year && item.status === 'completed')
  const receipt = find(records, id)
  if (id && !receipt) return <Missing title="Acknowledgment unavailable" to="/loan-acknowledgment" label="Return to loan acknowledgment" />

  function sign(event) {
    event.preventDefault()
    if (existing) return go(ackPath(existing.id))
    if (!confirmed || !signed || !loans.length) return
    const now = new Date().toISOString()
    const record = {
      id: createRecordId('ack'), awardYear: year, status: 'completed', loanIds: loans.map(loan => loan.id),
      loanCount: loans.length, ...amounts, actorId: state.profile?.id ?? null, signedAt: now, createdAt: now,
    }
    commit(previous => ({ ...previous, loanAcknowledgments: [...list(previous.loanAcknowledgments), record] }))
    go(ackPath(record.id))
  }

  return <>
    <Heading title="Annual Student Loan Acknowledgment" back="/my-loans" backLabel="My Loans"
      description={receipt ? yearLabel(receipt.awardYear) + ' receipt' : 'Review your current federal student loan balances for the award year.'} />
    {receipt ? <>
      <div className="notice success"><Badge status={receipt.status} /><p>Signed on {date(receipt.signedAt)}. <A to="/my-activity">View in My Activity</A></p></div>
      <BalanceCards value={receipt} />
      <section className="panel"><h2>Acknowledged loans</h2><p>{receipt.loanCount ?? list(receipt.loanIds).length} included in the signed balance snapshot.</p>
        {list(receipt.loanIds).length > 0 && <ul>{receipt.loanIds.map(loanId => <li key={loanId}>{find(state.loans, loanId)
          ? <A to={loanPath(loanId)}>{loanName(find(state.loans, loanId))} · {loanId}</A> : 'Loan unavailable · ' + loanId}</li>)}</ul>}
        <A to="/loan-acknowledgment">Review a different award year</A>
      </section>
    </> : <>
      <form className="panel inline-start" onSubmit={sign} id="acknowledgment-form">
        <Field label="Award year"><select value={year} onChange={event => { setYear(event.target.value); setConfirmed(false); setSigned(false) }}>
          {[...new Set([...supportedYears, ...records.map(item => item.awardYear).filter(Boolean)])].sort().reverse().map(item => <option value={item} key={item}>{yearLabel(item)}</option>)}
        </select></Field>
        {existing && <><p>Your acknowledgment for this award year is complete.</p><A className="button primary" to={ackPath(existing.id)}>View receipt</A></>}
      </form>
      {!existing && (loans.length ? <>
        <BalanceCards value={amounts} />
        <Table label="Loans included in acknowledgment" columns={['Loan', 'Current balance']} rows={loans.map(loan => [
          loan.id, <A to={loanPath(loan.id)}>{loanName(loan)} · {loan.id}</A>, money(balance(loan)),
        ])} />
        <section className="panel">
          <h2>Confirm and sign</h2>
          <Check checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>I reviewed the loans and balances above.</Check>
          <Check checked={signed} onChange={event => setSigned(event.target.checked)}>I sign this acknowledgment.</Check>
          <button type="submit" form="acknowledgment-form" className="primary" disabled={!confirmed || !signed}>Sign acknowledgment</button>
        </section>
      </> : <Empty title="There are no loans with a positive balance to acknowledge." />)}
    </>}
  </>
}
