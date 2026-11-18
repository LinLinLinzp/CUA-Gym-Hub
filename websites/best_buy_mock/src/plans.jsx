import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { canAddPlan, date, find, issueOptions, latest, list, money, openClaim, orderName, planDates, planName, planStatus } from './model.js'
import { Back, Badge, Empty, Facts, Field, Heading, Missing, Select, SiteLink, useSiteNavigate } from './ui.jsx'
import { InputField, SelectField, Workflow } from './forms.jsx'
import { eligibleOrders, PurchaseFields, usePurchaseFlow } from './purchases.jsx'

const path = '/protection-plans'
const planStatuses = [['active', 'Active'], ['expired', 'Expired'], ['canceled', 'Canceled']]

function CoverageDates({ plan }) {
  return <Facts values={[['Coverage starts', date(plan.coverageStartAt)], ['Coverage ends', date(plan.coverageEndAt)]]} />
}

function Quote({ offer }) {
  return <div className="quote stack"><h3>{offer.name}</h3><CoverageDates plan={offer} />
    <Facts values={[['Term', offer.termMonths + ' months'], ['Amount', money(offer.price)]]} />
    <ul className="review-lines">{offer.coverage.map((term) => <li key={term}>{term}</li>)}</ul>
  </div>
}

function AddPlanForm({ state, flow, close }) {
  const eligible = (order, item) => canAddPlan(state, order, item)
  const orders = eligibleOrders(state, eligible)
  const purchase = find(orders, flow.orderId)
  const line = find(purchase?.items, flow.itemId)
  if (!orders.length) return <div className="card form-card"><Empty action={<SiteLink to={path}>Back to protection plans</SiteLink>}>
    No purchase lines are currently eligible for protection.
  </Empty></div>
  return <Workflow title="Add protection" reviewTitle="Review protection plan" confirm="Confirm protection plan" inline onClose={close}
    initial={{ type: 'add-plan', orderId: purchase?.id || '', itemId: eligible(purchase, line) ? line.id : '' }}
    review={(summary) => <Quote offer={summary} />}>
    {(draft, update, error) => {
      const order = find(orders, draft.orderId)
      const item = find(order?.items, draft.itemId)
      return <>
        <PurchaseFields orders={orders} draft={draft} update={update} error={error} eligible={eligible} />
        {eligible(order, item) && <Quote offer={{ ...item.protectionOffer, ...planDates(order, item.protectionOffer) }} />}
      </>
    }}
  </Workflow>
}

export function Plans() {
  const { state } = useAccount()
  const [status, setStatus] = useState('')
  const flow = usePurchaseFlow()
  const go = useSiteNavigate()
  const plans = latest(state.protectionPlans).filter((plan) => !status || planStatus(plan) === status)
  return <>
    <Heading title="Protection plans" action={!flow.open && <SiteLink className="button" to={path + '?new=1'}>Add protection</SiteLink>}>
      View Geek Squad coverage, service requests, and eligible purchases.
    </Heading>
    {flow.open && <AddPlanForm key={flow.key} state={state} flow={flow} close={(result) => {
      if (!result) go(path, { replace: true })
    }} />}
    <section className="card" aria-label="Plan history">
      <div className="filters"><Field label="Plan status" id="plan-status">{(props) => <Select {...props} options={planStatuses}
        placeholder="All statuses" value={status} onChange={(event) => setStatus(event.target.value)} />}</Field></div>
      {plans.length ? <ul className="rows">{plans.map((plan) => {
        const item = find(find(state.orders, plan.orderId)?.items, plan.orderItemId)
        return <li className="history-row" key={plan.id}>
          <div className="row-primary"><SiteLink to={path + '/' + encodeURIComponent(plan.id)}>{planName(plan)}</SiteLink>
            <span>{item?.name || plan.orderItemId || 'Purchase item'} · {plan.name || 'Protection plan'}</span></div>
          <div className="row-meta"><Badge status={planStatus(plan)} /><span>{date(plan.coverageStartAt)} – {date(plan.coverageEndAt)}</span></div>
          <strong className="row-amount">{money(plan.price)}</strong>
        </li>
      })}</ul> : <Empty>{status ? 'No plans match this status.' : 'You have no protection plans yet.'}</Empty>}
    </section>
  </>
}

function ClaimForm({ plan, close }) {
  return <Workflow title="Request service" reviewTitle="Review service request" confirm="Submit service request" inline onClose={close}
    initial={{ type: 'claim', planId: plan.id, orderId: plan.orderId, itemId: plan.orderItemId, issueType: '', description: '' }}
    review={(summary) => <Facts values={[['Plan', planName(plan)], ['Issue type', summary.issueType], ['Description', summary.description]]} />}>
    {(draft, update, error) => <>
      <SelectField name="Issue type" field="issueType" value={draft.issueType} update={update} error={error('issueType')}
        options={issueOptions(plan)} placeholder="Choose an issue" />
      <Field label="Describe the issue" id="description" error={error('description')}>{(props) =>
        <textarea {...props} name="description" rows={4} value={draft.description} onChange={(event) => update('description', event.target.value)} />
      }</Field>
    </>}
  </Workflow>
}

function CancelPlanForm({ plan, close }) {
  return <Workflow title="Cancel plan" reviewTitle="Review plan cancellation" confirm="Confirm plan cancellation" danger onClose={close}
    initial={{ type: 'cancel-plan', planId: plan.id, orderId: plan.orderId, itemId: plan.orderItemId, reason: '' }}
    review={(summary) => <Facts values={[['Plan', planName(plan)], ['Reason', summary.reason]]} />}>
    {(draft, update, error) => <InputField name="Cancellation reason" field="reason" value={draft.reason} update={update} error={error('reason')} />}
  </Workflow>
}

export function PlanDetail() {
  const { planId } = useParams()
  const { state } = useAccount()
  const [form, setForm] = useState(null)
  const close = () => setForm(null)
  const plan = find(state.protectionPlans, planId)
  if (!plan) return <Missing title="Protection plan unavailable" to={path} link="Back to protection plans" />
  const order = find(state.orders, plan.orderId)
  const item = find(order?.items, plan.orderItemId)
  const status = planStatus(plan)
  const active = status === 'active' && Boolean(item)
  const claims = latest(state.protectionClaims).filter((claim) => claim.planId === plan.id)
  const events = latest(state.protectionPlanEvents).filter((event) => event.planId === plan.id)
  return <>
    <Back to={path}>Back to protection plans</Back>
    <Heading title={planName(plan)} action={<Badge status={status} />}>{plan.name || 'Protection plan'} · {item?.name || plan.orderItemId || 'Purchase item'}</Heading>
    {form === 'claim' && <ClaimForm plan={plan} close={close} />}
    <div className="detail-grid">
      <div className="stack">
        <section className="card"><h2>Coverage</h2><div className="stack">
          <CoverageDates plan={plan} />
          {list(plan.coverage).length ? <ul className="review-lines">{list(plan.coverage).map((term, index) => <li key={index}>{term}</li>)}</ul>
            : <p className="muted">Coverage terms are unavailable.</p>}
        </div></section>
        <section className="card"><h2>Service request history</h2>
          {claims.length ? <ul className="rows">{claims.map((claim) => <li className="history-row" key={claim.id}>
            <div className="row-primary"><strong>{claim.issueType || 'Service request'}</strong><span>{claim.id} · {date(claim.createdAt)}</span><p>{claim.description}</p></div>
            <div className="row-meta"><Badge status={claim.status} /></div>
          </li>)}</ul> : <Empty>No service requests for this plan.</Empty>}
        </section>
      </div>
      <div className="stack">
        <section className="card">
          <h2>Plan summary</h2>
          <Facts values={[
            ['Order', order ? <SiteLink to={'/orders/' + encodeURIComponent(order.id)}>{orderName(order)}</SiteLink> : plan.orderId],
            ['Plan price', money(plan.price)], ['Term', plan.termMonths ? plan.termMonths + ' months' : null],
            ...(plan.canceledAt ? [['Canceled on', date(plan.canceledAt)]] : []),
          ]} />
          {active && <div className="actions">
            {!openClaim(state, plan) && form !== 'claim' && <button type="button" onClick={() => setForm('claim')}>Request service</button>}
            <button type="button" className="secondary" onClick={() => setForm('cancel')}>Cancel plan</button>
          </div>}
        </section>
        {events.length > 0 && <section className="card"><h2>Plan activity</h2><ul className="rows">
          {events.map((event) => <li className="detail-line" key={event.id}>
            <strong>{event.type === 'canceled' ? 'Plan canceled' : 'Plan added'}</strong>
            <p className="muted">{date(event.createdAt)}{event.reason ? ' · ' + event.reason : ''}</p>
          </li>)}
        </ul></section>}
      </div>
    </div>
    {form === 'cancel' && <CancelPlanForm plan={plan} close={close} />}
  </>
}

