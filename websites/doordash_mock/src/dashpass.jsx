import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { byId, ensure, list, newId, ordersNewest, paymentPath, periodEnd, plans, timestamp } from './model.js'
import { Amounts, Back, Confirm, Details, Missing, PageHeading, SessionLink, Status, label, money, when } from './ui.jsx'

const planName = (id) => plans[id]?.label || (id ? label(id) : '—')
const price = (id) => plans[id] ? money(plans[id].amountCents) + (id === 'monthly' ? ' / month' : ' / year') : '—'
const cancelReasons = ['Taking a break', 'I order less often', 'Membership cost', 'Other']
const actions = {
  change: ['Change plan', 'Confirm plan change', 'changed_plan', 'Plan change scheduled.'],
  pause: ['Pause DashPass?', 'Confirm pause', 'paused', 'DashPass paused.'],
  resume: ['Resume DashPass?', 'Confirm resume', 'resumed', 'DashPass resumed.'],
  cancel: ['Cancel DashPass?', 'Confirm cancellation', 'canceled', 'DashPass canceled.'],
  reactivate: ['Reactivate DashPass', 'Confirm reactivation', 'reactivated', 'DashPass reactivated.'],
  enroll: ['Enroll in DashPass', 'Confirm enrollment', 'enrolled', 'DashPass enrollment complete.'],
}

function accessDate(membership) {
  return membership.accessUntil || membership.nextBillingAt
}

function hasPaidAccess(membership, now) {
  return ['active', 'paused', 'canceled'].includes(membership.status) && timestamp(accessDate(membership)) > now
}

function canManage(action, membership, now) {
  const paid = hasPaidAccess(membership, now)
  const active = membership.status === 'active'
  switch (action) {
    case 'change': return active && timestamp(membership.nextBillingAt) > now
    case 'pause': return active && paid
    case 'cancel': return (active || membership.status === 'paused') && paid
    case 'resume': return membership.status === 'paused' && paid
    case 'reactivate': return ['canceled', 'paused', 'active'].includes(membership.status) && (!active || !paid)
    case 'enroll': return !['active', 'paused', 'canceled'].includes(membership.status)
    default: return false
  }
}

export function DashPass() {
  const { state } = useAccount()
  const [action, setAction] = useState(null)
  const membership = state.dashpass || {}
  const now = new Date().getTime()
  const access = accessDate(membership)
  const paid = hasPaidAccess(membership, now)
  const accessLabel = timestamp(access) > 0 && (paid || timestamp(access) <= now) ? when(access) : null
  const status = membership.status === 'active' && access && !paid ? 'inactive' : membership.status || 'inactive'
  const canShow = (name) => state.account?.id && canManage(name, membership, now)
  const payment = membership.paymentLabel || state.account?.paymentLabel
  const payments = ordersNewest(state.dashpassPayments)

  return <>
    <PageHeading title="DashPass" description="Manage membership, plan changes, and payments." />
    <div className="stack">
      <section className="panel panel-pad membership">
        <div>
          <Status value={status} />
          <h2>{membership.planId ? planName(membership.planId) + ' plan' : 'DashPass membership'}</h2>
          {membership.planId && <p className="muted">{price(membership.planId)}</p>}
          <div className="actions section-actions">
            {canShow('change') && <button className="button primary" onClick={() => setAction('change')}>Change plan</button>}
            {canShow('pause') && <button className="button secondary" onClick={() => setAction('pause')}>Pause DashPass</button>}
            {canShow('resume') && <button className="button primary" onClick={() => setAction('resume')}>Resume DashPass</button>}
            {canShow('cancel') && <button className="button secondary" onClick={() => setAction('cancel')}>Cancel DashPass</button>}
            {!canShow('resume') && canShow('reactivate') && <button className="button primary" onClick={() => setAction('reactivate')}>Reactivate DashPass</button>}
            {canShow('enroll') && <button className="button primary" onClick={() => setAction('enroll')}>Enroll in DashPass</button>}
          </div>
        </div>
        <Details rows={[
          ['Payment method', payment || 'Unavailable'],
          ['Next charge', status === 'active' && membership.nextBillingAt ? when(membership.nextBillingAt) : 'No scheduled charge'],
          [paid ? 'Paid access through' : 'Paid access ended', accessLabel],
          ['Next plan', membership.pendingPlanId && planName(membership.pendingPlanId)],
        ]} />
      </section>
      <section className="panel panel-pad">
        <h2>Billing history</h2>
        {payments.length ? <div className="history-wrap"><table className="history">
          <thead><tr><th scope="col">Date</th><th scope="col">Plan</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Charge</th></tr></thead>
          <tbody>
            {payments.map((entry, index) => <tr key={entry.id || index}>
              <td>{when(entry.createdAt)}</td><td>{planName(entry.planId)}</td><td>{money(entry.amountCents)}</td>
              <td><Status value={entry.status} /></td>
              <td>{entry.id ? <SessionLink to={paymentPath(entry.id)}>View charge</SessionLink> : '—'}</td>
            </tr>)}
          </tbody>
        </table></div> : <p className="muted">There are no DashPass payments yet.</p>}
      </section>
    </div>
    {action && <Manage key={action} membership={membership} payment={payment} action={action} close={() => setAction(null)} />}
  </>
}

function Manage({ membership, payment, action, close }) {
  const { commit } = useAccount()
  const [review] = useState(() => JSON.stringify(membership))
  const [paid] = useState(() => hasPaidAccess(membership, new Date().getTime()))
  const priorSelection = membership.pendingPlanId || membership.planId
  const [planId, setPlanId] = useState(Object.hasOwn(plans, priorSelection) ? priorSelection : 'monthly')
  const [reason, setReason] = useState('')
  const [title, submitLabel, type, notice] = actions[action]
  const choosePlan = action === 'change' || action === 'enroll' || (action === 'reactivate' && !paid)
  const charge = action === 'enroll' || (action === 'reactivate' && !paid)
  const access = accessDate(membership)

  function save() {
    return commit((state, createdAt) => {
      const previous = state.dashpass || {}
      const now = timestamp(createdAt)
      ensure(state.account?.id && canManage(action, previous, now), 'This membership action is no longer available.')
      ensure(JSON.stringify(previous) === review && paid === hasPaidAccess(previous, now), 'Membership access changed. Reopen this action to review the latest details.')
      const currentPlan = previous.planId ?? null
      const next = { ...previous, id: previous.id || newId('DP'), accountId: state.account.id, createdAt: previous.createdAt || createdAt, updatedAt: createdAt }
      let effectiveAt = createdAt
      if (choosePlan) ensure(Object.hasOwn(plans, planId), 'Choose a DashPass plan.')
      if (action === 'change') {
        ensure(planId !== (previous.pendingPlanId || currentPlan), 'Choose a different plan.')
        next.pendingPlanId = planId === currentPlan ? null : planId
        effectiveAt = previous.nextBillingAt
      } else if (action === 'pause' || action === 'cancel') {
        next.status = action === 'pause' ? 'paused' : 'canceled'
        next.accessUntil = accessDate(previous)
        next.nextBillingAt = null
        if (action === 'pause') {
          next.pausedAt = createdAt
        } else {
          ensure(cancelReasons.includes(reason), 'Select a reason for cancellation.')
          next.pendingPlanId = null
          next.canceledAt = createdAt
          next.cancelReason = reason
        }
      } else {
        next.status = 'active'
        next.pausedAt = null
        next.canceledAt = null
        next.cancelReason = null
        if (charge) {
          next.planId = planId
          next.pendingPlanId = null
          next.paymentMethodId = previous.paymentMethodId || state.account.paymentMethodId
          next.paymentLabel = previous.paymentLabel || state.account.paymentLabel
          ensure(next.paymentMethodId && next.paymentLabel, 'A payment method is required to enroll.')
          next.accessUntil = periodEnd(createdAt, plans[planId].months)
          next.nextBillingAt = next.accessUntil
        } else {
          next.accessUntil = accessDate(previous)
          next.nextBillingAt = next.accessUntil
        }
      }
      const event = {
        id: newId('DPE'), membershipId: next.id, type, actorId: state.account.id, createdAt, effectiveAt,
        previousStatus: previous.status || 'inactive', nextStatus: next.status,
        previousPlanId: currentPlan, nextPlanId: action === 'change' ? planId : next.planId ?? null,
        ...(action === 'cancel' && { reason }),
      }
      const nextState = { ...state, dashpass: next, dashpassEvents: [...list(state.dashpassEvents), event] }
      if (charge) {
        const entry = {
          id: newId('DPP'), membershipId: next.id, eventId: event.id, planId, status: 'paid',
          amountCents: plans[planId].amountCents, paymentMethodId: next.paymentMethodId, paymentLabel: next.paymentLabel,
          periodStart: createdAt, periodEnd: next.accessUntil, createdAt, actorId: state.account.id,
        }
        nextState.dashpassPayments = [...list(state.dashpassPayments), entry]
      }
      return nextState
    }, notice)
  }

  return <Confirm title={title} submitLabel={submitLabel} onClose={close} onConfirm={save}
    disabled={action === 'change' && planId === (membership.pendingPlanId || membership.planId)}>
    {choosePlan && <fieldset>
      <legend>Choose a plan</legend>
      <div className="fields">
        {Object.keys(plans).map((id) => <label key={id}>
          <input type="radio" name="plan" checked={planId === id} onChange={() => setPlanId(id)} /> {planName(id)} · {price(id)}
        </label>)}
      </div>
    </fieldset>}
    {action === 'change' && <p>Your selected plan applies at your next charge on {when(membership.nextBillingAt)}.</p>}
    {action === 'pause' && <p>Scheduled charges will pause. Your paid access continues through {when(access)}.</p>}
    {action === 'cancel' && <>
      <p>Your paid access continues through {when(access)}. Scheduled charges will stop.</p>
      <label className="field">Cancellation reason
        <select required value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="">Choose a reason</option>
          {cancelReasons.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    </>}
    {charge ? <p>Charge today <strong>{money(plans[planId]?.amountCents)}</strong>{payment ? ' to ' + payment : ''}.</p>
      : ['resume', 'reactivate'].includes(action) && <p>Your paid access continues through {when(access)}. Your next charge is scheduled for that date.</p>}
  </Confirm>
}

export function PaymentDetails() {
  const { paymentId } = useParams()
  const { state } = useAccount()
  const payment = byId(state.dashpassPayments, paymentId)
  if (!payment) return <Missing title="Charge unavailable" to="/dashpass" back="DashPass" />

  return <>
    <Back to="/dashpass">DashPass</Back>
    <PageHeading title="DashPass charge" description={payment.id}><Status value={payment.status} /></PageHeading>
    <div className="detail-grid">
      <section className="panel panel-pad"><h2>Payment details</h2>
        <Details rows={[
          ['Charge date', when(payment.createdAt, true)], ['Plan', planName(payment.planId)],
          ['Payment method', payment.paymentLabel], ['Period start', when(payment.periodStart)],
          ['Period end', when(payment.periodEnd)],
        ]} />
      </section>
      <aside className="panel panel-pad"><h2>Amount</h2><Amounts rows={[]} total={['Total paid', payment.amountCents]} /></aside>
    </div>
  </>
}
