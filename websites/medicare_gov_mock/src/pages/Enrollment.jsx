import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount, records, activity } from '../store.jsx'
import { AccountLink, useAccountNavigate, PageTitle, Missing, Status, DataTable, Field, dateLabel, money } from '../ui.jsx'

const reasons = { join_plan: 'Join a plan', change_coverage: 'Change my coverage' }
const fullName = (account) => [account?.firstName, account?.lastName].filter(Boolean).join(' ') || 'Unavailable'
const calendarDate = /^\d{4}-\d{2}-\d{2}$/
const eligibleOn = (startDate, effectiveDate) => calendarDate.test(startDate ?? '') && startDate <= effectiveDate

function eligibility(account, plan) {
  const window = account?.enrollmentWindow
  if (!account?.id) return 'Member details are unavailable.'
  if (plan.status !== 'available') return 'This plan is unavailable for enrollment.'
  if (window?.status === 'closed') return 'The enrollment window is closed.'
  if (window?.status !== 'open' || !window.code || !calendarDate.test(window.effectiveDate ?? '')) return 'An enrollment window is required to submit a request.'
  if (!records(plan.zipCodes).includes(account.zipCode)) return 'Your home ZIP code is outside this plan’s service area.'
  if (String(plan.planYear) !== window.effectiveDate.slice(0, 4) || plan.planYear !== account.shoppingPlanYear) return 'The plan year must match the enrollment window and your shopping year.'
  const partA = eligibleOn(account.coverage?.partAStartDate, window.effectiveDate)
  const partB = eligibleOn(account.coverage?.partBStartDate, window.effectiveDate)
  if (plan.type === 'advantage' && !(partA && partB)) return 'This plan requires Part A and Part B by the effective date.'
  if (plan.type === 'drug' && !(partA || partB)) return 'This plan requires Part A or Part B by the effective date.'
  if (plan.type !== 'advantage' && plan.type !== 'drug') return 'This plan’s eligibility requirements are unavailable.'
  return ''
}

function pendingRequest(state, planId) {
  const account = state.account
  return records(state.enrollments).find((entry) => entry.status === 'submitted' &&
    entry.memberId === account?.id && entry.planId === planId && entry.effectiveDate === account?.enrollmentWindow?.effectiveDate,
  )
}

export function Enrollment() {
  const { state } = useAccount()
  const [filter, setFilter] = useState('')
  const [year, setYear] = useState('')
  const { coverage, enrollmentWindow, id } = state.account ?? {}
  const rows = id ? records(state.enrollments).filter((entry) => entry.memberId === id)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))) : []
  const years = [...new Set(rows.map((row) => row.planYear).filter(Number.isInteger))].sort((a, b) => b - a)
  const results = rows.filter((row) => (!filter || row.status === filter) && (!year || String(row.planYear) === year))
  return <>
    <PageTitle title="Enrollment" description="Check your enrollment window and track your plan requests.">
      <AccountLink className="button" to="/plans">Find a plan</AccountLink>
    </PageTitle>
    <div className="stack">
      <section className="panel stack">
        <div className="section-head"><h2>{enrollmentWindow?.label || 'Enrollment window'}</h2><Status value={enrollmentWindow?.status} /></div>
        <dl>
          <div><dt>Current coverage</dt><dd>{coverage?.type || 'Unavailable'}</dd></div>
          <div><dt>Request dates</dt><dd>{enrollmentWindow?.opensOn && enrollmentWindow?.closesOn ? dateLabel(enrollmentWindow.opensOn) + ' – ' + dateLabel(enrollmentWindow.closesOn) : 'Unavailable'}</dd></div>
          <div><dt>Coverage effective date</dt><dd>{dateLabel(enrollmentWindow?.effectiveDate)}</dd></div>
        </dl>
      </section>
      <section className="panel stack">
        <h2>Request history</h2>
        <div className="form-row">
          <Field label="Request status" id="enrollment-status"><select id="enrollment-status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option><option value="submitted">Submitted</option><option value="closed">Closed</option><option value="withdrawn">Withdrawn</option></select></Field>
          <Field label="Coverage year" id="enrollment-year"><select id="enrollment-year" value={year} onChange={(event) => setYear(event.target.value)}><option value="">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select></Field>
        </div>
        <p aria-live="polite">{results.length} {results.length === 1 ? 'request' : 'requests'}</p>
        {results.length ? <DataTable label="Enrollment request history" headers={['Plan and confirmation', 'Effective date', 'Request date', 'Status']}>
          {results.map((row) => <tr key={row.id}>
            <td><AccountLink to={'/enrollment/' + encodeURIComponent(row.id)}>{row.planName || 'Enrollment request'}</AccountLink><small>{row.confirmationNumber || 'Confirmation unavailable'}</small></td>
            <td>{dateLabel(row.effectiveDate)}</td><td>{dateLabel(row.createdAt)}</td><td><Status value={row.status} /></td>
          </tr>)}
        </DataTable> : <p>{rows.length ? 'No requests match your filters.' : 'No enrollment requests are available for this member.'}</p>}
      </section>
    </div>
  </>
}

export function Apply() {
  const { planId } = useParams()
  const { state } = useAccount()
  const plan = records(state.plans).find((item) => item.id === planId)
  if (!plan) return <Missing title="Plan unavailable" to="/plans" link="Back to plans" />
  return <Application key={planId} plan={plan} />
}

function Application({ plan }) {
  const { state, append } = useAccount()
  const account = state.account
  const window = account?.enrollmentWindow
  const navigate = useAccountNavigate()
  const [form, setForm] = useState(() => ({ email: account?.email ?? '', phone: account?.phone ?? '', reason: '', attestationAccepted: false }))
  const [reviewing, setReviewing] = useState(false)
  const [errors, setErrors] = useState({})
  const error = eligibility(account, plan)
  const duplicate = pendingRequest(state, plan.id)
  const planPath = '/plans/' + encodeURIComponent(plan.id)

  function edit(event) {
    const { name, type, checked, value } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function review(event) {
    event.preventDefault()
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!Object.hasOwn(reasons, form.reason)) next.reason = 'Select an enrollment reason.'
    if (!form.attestationAccepted) next.attestationAccepted = 'Acknowledge the enrollment request to continue.'
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      event.currentTarget.elements.namedItem(first)?.focus()
      return
    }
    setReviewing(true)
  }

  function submit() {
    const request = append('enrollments', (current) => {
      const member = current.account
      if (!reviewing || eligibility(member, plan) || pendingRequest(current, plan.id)) return null
      const fields = activity('enrollment', member.id)
      return {
        ...fields, planId: plan.id, memberId: member.id, planName: plan.name || 'Plan name unavailable',
        planYear: plan.planYear, zipCode: member.zipCode, enrollmentPeriodCode: member.enrollmentWindow.code,
        reason: form.reason, effectiveDate: member.enrollmentWindow.effectiveDate,
        contact: { email: form.email.trim(), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) },
        attestationAccepted: true, status: 'submitted',
        confirmationNumber: 'ENR-' + fields.id.slice('enrollment-'.length).replaceAll('-', '').slice(0, 12).toUpperCase(),
      }
    })
    if (request) navigate('/enrollment/' + encodeURIComponent(request.id), { replace: true })
  }

  return <>
    <AccountLink className="back-link" to={planPath}>Back to plan details</AccountLink>
    <PageTitle title={reviewing ? 'Review your enrollment request' : 'Request enrollment'} description={plan.name || 'Plan details'} />
    <div className="narrow stack">
      <section className="panel stack">
        <h2>Plan and member details</h2>
        <dl>
          <div><dt>Member</dt><dd>{fullName(account)}</dd></div>
          <div><dt>Home ZIP code</dt><dd>{account?.zipCode || 'Unavailable'}</dd></div>
          <div><dt>Monthly premium</dt><dd>{money(plan.monthlyPremium)}</dd></div>
          <div><dt>Enrollment period</dt><dd>{window?.label || 'Unavailable'}</dd></div>
          <div><dt>Effective date</dt><dd>{dateLabel(window?.effectiveDate)}</dd></div>
        </dl>
      </section>
      {error || duplicate ? <section className="panel stack">
        <h2>{duplicate ? 'Request already submitted' : 'Enrollment unavailable'}</h2>
        <p>{duplicate ? 'A request for this member, plan and effective date is already pending.' : error}</p>
        {duplicate && <AccountLink to={'/enrollment/' + encodeURIComponent(duplicate.id)}>View existing request</AccountLink>}
        <AccountLink to="/enrollment">Back to enrollment</AccountLink>
      </section> : reviewing ? <section className="panel stack" aria-label="Review and submit">
        <small>Step 2 of 2</small><h2>Review and submit</h2>
        <dl>
          <div><dt>Email address</dt><dd>{form.email.trim()}</dd></div>
          <div><dt>Phone</dt><dd>{form.phone.trim() || 'Not provided'}</dd></div>
          <div><dt>Enrollment reason</dt><dd>{reasons[form.reason]}</dd></div>
          <div><dt>Acknowledgment</dt><dd>Accepted</dd></div>
        </dl>
        <div className="actions"><button type="button" onClick={submit}>Submit enrollment request</button>
          <button type="button" className="secondary" onClick={() => setReviewing(false)}>Back to edit</button>
          <AccountLink to="/enrollment">Cancel</AccountLink>
        </div>
      </section> : <form className="panel stack" noValidate onSubmit={review}>
        <small>Step 1 of 2</small><h2>Contact and enrollment details</h2>
        <Field id="email" label="Email address" error={errors.email}><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={edit} required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} /></Field>
        <Field id="phone" label="Phone (optional)"><input id="phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={edit} /></Field>
        <Field id="reason" label="Enrollment reason" error={errors.reason}><select id="reason" name="reason" value={form.reason} onChange={edit} required aria-invalid={!!errors.reason} aria-describedby={errors.reason ? 'reason-error' : undefined}>
          <option value="">Select a reason</option>{Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></Field>
        <fieldset className="field"><legend>Acknowledgment</legend>
          <label className="check-label"><input type="checkbox" name="attestationAccepted" checked={form.attestationAccepted} onChange={edit} required aria-invalid={!!errors.attestationAccepted} aria-describedby={errors.attestationAccepted ? 'attestation-error' : undefined} />
            <span>I confirm the information above and want to request enrollment in this plan.</span></label>
          {errors.attestationAccepted && <p className="field-error" id="attestation-error">{errors.attestationAccepted}</p>}
        </fieldset>
        <div className="actions"><button type="submit">Review enrollment request</button><AccountLink to="/enrollment">Cancel</AccountLink></div>
      </form>}
    </div>
  </>
}

export function RequestDetails() {
  const { state } = useAccount()
  const { enrollmentId } = useParams()
  const entry = records(state.enrollments).find((row) => row.id === enrollmentId && row.memberId === state.account?.id)
  if (!entry) return <Missing title="Enrollment request unavailable" to="/enrollment" link="Back to enrollment" />
  return <>
    <AccountLink className="back-link" to="/enrollment">Back to enrollment</AccountLink>
    <PageTitle title={entry.status === 'submitted' ? 'Enrollment request submitted' : 'Enrollment request'} description={entry.planName || 'Plan name unavailable'}><Status value={entry.status} /></PageTitle>
    <section className="panel narrow stack" aria-live="polite">
      <h2>Request confirmation</h2>
      <dl>
        <div><dt>Confirmation number</dt><dd><strong>{entry.confirmationNumber || 'Unavailable'}</strong></dd></div>
        <div><dt>Effective date</dt><dd>{dateLabel(entry.effectiveDate)}</dd></div>
        <div><dt>Member</dt><dd>{fullName(state.account)}</dd></div>
        <div><dt>Enrollment reason</dt><dd>{reasons[entry.reason] || 'Unavailable'}</dd></div>
        <div><dt>Email address</dt><dd>{entry.contact?.email || 'Unavailable'}</dd></div>
      </dl>
      <div className="actions"><AccountLink className="button secondary" to="/enrollment">View request history</AccountLink></div>
    </section>
  </>
}
