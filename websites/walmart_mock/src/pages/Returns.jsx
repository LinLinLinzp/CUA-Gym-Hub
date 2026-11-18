import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { amount, array, cents, find, orderFor, productTitle } from '../data/model.js'
import { orderNumber, orderPath } from '../data/orders.js'
import {
  methodInstructions, methodNames, reasonNames, refundFor, returnAppointments, returnEligibility, returnStatuses, returnTimezone, sharedMethods, submitReturn,
} from '../data/returns.js'
import { windowLabel } from '../data/pickup.js'
import { Address, Back, Badge, ButtonLink, Empty, Feedback, Field, Photo, displayDate, encoded, label, money } from '../components/UI.jsx'
import { useSiteNavigate } from '../utils/navigation.jsx'

const stepNames = ['Items', 'Details', 'Method', 'Review']

export function StartReturn({ record: order }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState({})
  const [method, setMethod] = useState('')
  const [appointment, setAppointment] = useState('')
  const [error, setError] = useState('')
  const now = new Date()
  const choices = array(order.lines).map(line => ({ line, eligibility: returnEligibility(state, order, line, now) }))
  const selected = choices.filter(({ line }) => Object.hasOwn(selections, line.id)).map(option => ({ ...option, ...selections[option.line.id] }))
  const modes = sharedMethods(selected.map(item => item.eligibility))
  const appointments = returnAppointments(order, now)
  const timezone = returnTimezone(order)
  const estimate = amount(selected.reduce((sum, { line, quantity, eligibility, resolution }) => sum + cents(refundFor(line, Number(quantity), eligibility.prior, resolution).refundAmount), 0))
  const moveTo = target => { setStep(target); setError('') }
  const patch = (id, value) => setSelections(current => ({ ...current, [id]: { ...current[id], ...value } }))

  function next(event) {
    event.preventDefault()
    setError('')
    if (step === 0 && !selected.length) return setError('Choose at least one item to return.')
    if (step === 0 && selected.some(item => !item.eligibility.available || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) > item.eligibility.remaining || Number(item.quantity) < 1)) {
      return setError('Review each selected quantity before continuing.')
    }
    if (step === 1 && selected.some(item => !item.eligibility.resolutions.includes(item.resolution) || !Object.hasOwn(reasonNames, item.reason))) return setError('Choose a reason and a resolution for each item.')
    if (step === 2 && !modes.includes(method)) return setError('Choose a method available for every selected item.')
    if (step < 3) return moveTo(step + 1)
    const result = commit(submitReturn, {
      orderId: order.id, selections: selected.map(({ line, quantity, reason, resolution, comment }) => ({ id: line.id, quantity: Number(quantity), reason, resolution, comment })), method, appointment,
    })
    if (result.record) navigate(`/returns/${encoded(result.record.id)}`, { replace: true })
    else {
      if (result.step !== undefined) setStep(result.step)
      setError(result.error)
    }
  }

  return <div className="stack return-form">
    <Back to={orderPath(order)}>Back to order</Back>
    <h1>Start a return</h1>
    <p className="muted">Order {orderNumber(order)}</p>
    {!returnStatuses.includes(order.status) || !choices.length ? <Empty title="This order has no items available for return" to={orderPath(order)} action="Back to order" /> : <>
      <ol className="steps" aria-label="Return steps">{stepNames.map((name, index) => <li key={name} aria-current={index === step ? 'step' : undefined}>
        {index < step ? <button type="button" className="text-button" onClick={() => moveTo(index)}>{name}</button> : name}
      </li>)}</ol>
      <form className="panel stack" onSubmit={next}>
        <h2>{['Choose items', 'Tell us about each item', 'Choose a return method', 'Review your return'][step]}</h2>
        {step === 0 && <div className="line-list">{choices.map(({ line, eligibility }, index) => {
          const checked = Object.hasOwn(selections, line.id)
          const title = productTitle(line.product)
          return <div className="return-choice" key={line.id ?? index}>
            <Photo path={line.product?.imagePath} />
            <div className="stack small-gap">
              <label className="check-field"><input type="checkbox" checked={checked} disabled={!eligibility.available} onChange={event => {
                if (event.target.checked) patch(line.id, { quantity: 1, reason: '', resolution: '', comment: '' })
                else setSelections(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== line.id)))
              }} /> <strong>{title}</strong></label>
              <p className="small muted">{eligibility.available ? `${eligibility.remaining} eligible through ${displayDate(eligibility.expiry)}` : eligibility.reason}</p>
              {checked && <Field label={`Return quantity for ${title}`} className="narrow-field"><input type="number" required min="1" max={eligibility.remaining} value={selections[line.id].quantity} onChange={event => patch(line.id, { quantity: event.target.value })} /></Field>}
            </div>
          </div>
        })}</div>}
        {step === 1 && <div className="line-list">{selected.map(({ line, eligibility, reason, resolution, comment, quantity }) => <section className="stack return-detail-fields" key={line.id}>
          <h3>{productTitle(line.product)} <span className="small muted">· Quantity {quantity}</span></h3>
          <div className="field-row">
            <Field label="Reason"><select required value={reason} onChange={event => patch(line.id, { reason: event.target.value })}>
              <option value="">Choose a reason</option>{Object.entries(reasonNames).map(([value, text]) => <option value={value} key={value}>{text}</option>)}
            </select></Field>
            <Field label="Resolution"><select required value={resolution} onChange={event => patch(line.id, { resolution: event.target.value })}>
              <option value="">Choose a resolution</option>{eligibility.resolutions.map(value => <option value={value} key={value}>{label(value)}</option>)}
            </select></Field>
          </div>
          <Field label="Notes (optional)"><textarea maxLength={500} value={comment} onChange={event => patch(line.id, { comment: event.target.value })} /></Field>
        </section>)}</div>}
        {step === 2 && <>
          {modes.length ? <div className="slot-grid">{modes.map(value => <label key={value} className="slot-option">
            <input type="radio" name="return-method" required checked={method === value} onChange={() => {
              setMethod(value); setAppointment(''); setError('')
            }} />{methodNames[value]}
          </label>)}</div> : <Feedback>These items have no return method in common. Go back to Items and split them into separate returns.</Feedback>}
          {method === 'scheduled_pickup' && modes.includes(method) && <section className="pickup-panel stack">
            <h3>Pickup address</h3><Address address={order.shippingAddress} />
            <Field label="Pickup window"><select required value={appointment} onChange={event => setAppointment(event.target.value)}>
              <option value="">Choose a window</option>{appointments.map(window => <option value={window.startAt} key={window.startAt}>{windowLabel(window, timezone)}</option>)}
            </select></Field>
          </section>}
        </>}
        {step === 3 && <>
          <div className="line-list">{selected.map(({ line, quantity, eligibility, resolution, reason, comment }) => <article className="order-line" key={line.id}>
            <Photo path={line.product?.imagePath} />
            <div><h3>{productTitle(line.product)}</h3><p className="small muted">Quantity {quantity} · {reasonNames[reason]} · {label(resolution)}</p>{comment && <p className="small">{comment}</p>}</div>
            <strong>{money(refundFor(line, Number(quantity), eligibility.prior, resolution).refundAmount)}</strong>
          </article>)}</div>
          <div className="pickup-panel stack small-gap"><h3>{methodNames[method]}</h3>
            {method === 'scheduled_pickup' && <><p>{windowLabel(appointments.find(window => window.startAt === appointment), timezone)}</p><Address address={order.shippingAddress} /></>}
          </div>
          <div className="section-heading return-estimate"><strong>Estimated refund</strong><strong>{money(estimate)}</strong></div>
        </>}
        <Feedback>{error}</Feedback>
        <div className="actions">
          {step > 0 && <button type="button" className="button secondary" onClick={() => moveTo(step - 1)}>Back</button>}
          <button className="button primary" disabled={step === 2 && !modes.length}>{step === 3 ? 'Submit return' : 'Continue'}</button>
        </div>
      </form>
    </>}
  </div>
}

export function ReturnDetails({ record }) {
  const { state } = useStore()
  const order = orderFor(state, record.orderId)
  const back = order ? orderPath(order) : '/account/purchase-history'
  const appointment = record.pickupAppointment
  return <div className="stack return-form">
    <Back to={back}>{order ? 'Back to order' : 'Purchase history'}</Back>
    <section className="panel stack">
      <div className="section-heading"><h1 className="with-icon"><CheckCircle2 size={26} aria-hidden="true" />Return {record.returnNumber || record.id}</h1><Badge status={record.status} /></div>
      <p className="muted">{order && `Order ${orderNumber(order)} · `}{displayDate(record.createdAt)}</p>
      <div className="pickup-panel stack small-gap">
        <h2>{methodNames[record.method] || 'Return method'}</h2>
        {record.instructionsCode && <p>Return code <strong>{record.instructionsCode}</strong></p>}
        {methodInstructions[record.method] && <p>{methodInstructions[record.method]}</p>}
        {appointment && <><p>{windowLabel(appointment, returnTimezone(order || { shippingAddress: appointment.address }))}</p><Address address={appointment.address} /></>}
      </div>
      <h2>Return items</h2>
      {array(record.lines).length ? <div className="line-list">{array(record.lines).map((line, index) => {
        const item = find(order?.lines, line.orderLineId)
        return <article className="order-line" key={line.id ?? index}>
          <Photo path={item?.product?.imagePath} />
          <div><h3>{productTitle(item?.product)}</h3><p className="small muted">Quantity {line.quantity ?? '—'} · {reasonNames[line.reason] || label(line.reason)} · {label(line.resolution)}</p>{line.comment && <p className="small">{line.comment}</p>}</div>
          <strong>{money(line.refundAmount)}</strong>
        </article>
      })}</div> : <p className="muted">No return items available.</p>}
      <div className="section-heading return-estimate"><strong>Estimated refund</strong><strong>{money(record.refundEstimate)}</strong></div>
      {order && <div><ButtonLink kind="secondary" to={back}>View order details</ButtonLink></div>}
    </section>
  </div>
}
