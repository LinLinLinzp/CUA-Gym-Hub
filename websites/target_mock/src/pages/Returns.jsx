import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Store, Truck } from 'lucide-react'
import { useStore } from '../store.jsx'
import { byId, money } from '../utils/read.js'
import { commonMethods, methods, prepareReturn, reasons, returnOptions, submitReturn } from '../domain/returns.js'
import { Empty, PageHeading, ShopLink, useShopNavigate } from '../components/ui.jsx'
import { ReturnInstructions, returnLabel } from '../components/ReturnInstructions.jsx'
import { MaskedPayment } from '../components/OrderFields.jsx'

const orderPath = (id) => `/orders/${encodeURIComponent(id)}`

function ReturnReview({ order, quote, method }) {
  return <aside className="panel review-summary stack">
    <h2>Refund estimate</h2>
    <dl className="money-list">
      <div><dt>Paid merchandise</dt><dd>{quote.error ? '—' : money(quote.merchandiseCents)}</dd></div>
      <div><dt>Tax</dt><dd>{quote.error ? '—' : money(quote.taxCents)}</dd></div>
      <div className="money-total"><dt>Estimated refund</dt><dd>{quote.error ? '—' : money(quote.amountCents)}</dd></div>
    </dl>
    {method && <p>{returnLabel(method)}</p>}
    <MaskedPayment payment={order.payment} />
  </aside>
}

function ReturnForm({ order }) {
  const { state, transact } = useStore()
  const navigate = useShopNavigate()
  const [picked, setPicked] = useState(new Map())
  const [method, setMethod] = useState('')
  const [review, setReview] = useState(false)
  const [failure, setFailure] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const options = returnOptions(state, order)
  const selection = [...picked.values()]
  const availableMethods = commonMethods(options.filter((option) => picked.has(option.item.id)))
  const chosenMethod = availableMethods.includes(method) ? method : ''
  const quote = prepareReturn(state, order, selection, chosenMethod)

  function update(id, change) {
    const next = new Map(picked)
    if (change) next.set(id, { ...(next.get(id) || { id, reason: '', quantity: 1 }), ...change })
    else next.delete(id)
    setPicked(next); setFailure('')
  }

  function submit(event) {
    event.preventDefault()
    if (submitting) return
    if (quote.error) { setFailure(quote.error); return }
    if (!review) { setReview(true); setFailure(''); return }
    setSubmitting(true)
    const result = transact((world) => submitReturn(world, { orderId: order.id, selection, method: chosenMethod }))
    if (result.error) { setFailure(result.error); setSubmitting(false); return }
    navigate(`${orderPath(order.id)}/return?request=${encodeURIComponent(result.request.id)}`, { replace: true })
  }

  return <form className="review-layout" onSubmit={submit} noValidate>
    <div className="stack">
      <section className="panel stack">
        <h2>{review ? 'Review items' : 'Select items to return'}</h2>
        {review ? <ul className="return-review-list">
          {quote.lines?.map((line) => <li key={line.orderLineId}>
            <div><h3>{options.find(({ item }) => item.id === line.orderLineId)?.item.title || 'Unavailable item'}</h3>
              <p className="small muted">Quantity {line.quantity} · {reasons[line.reason]}</p></div>
            <strong>{money(line.amountCents)}</strong>
          </li>)}
        </ul> : <div className="return-items">
          {options.map(({ item, remaining, issue }) => {
            const selected = picked.get(item.id)
            return <article className="return-item" key={item.id}>
              <label className="check-label"><input type="checkbox" checked={Boolean(selected)} disabled={Boolean(issue)}
                onChange={(event) => update(item.id, event.target.checked ? {} : null)} /><strong>{item.title || 'Unavailable item'}</strong></label>
              <p className={`small ${issue ? 'muted' : 'in-stock'}`}>{issue || `${remaining} available to return of ${item.quantity} purchased`}</p>
              {selected && <div className="return-fields">
                <label className="field">Quantity<input type="number" min="1" max={remaining} value={selected.quantity || ''}
                  onChange={(event) => update(item.id, { quantity: Number(event.target.value) })} /></label>
                <label className="field">Reason<select value={selected.reason} onChange={(event) => update(item.id, { reason: event.target.value })}>
                  <option value="">Choose a reason</option>
                  {Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
              </div>}
            </article>
          })}
          {!options.length && <p className="muted">Order item details are unavailable.</p>}
        </div>}
      </section>
      {!review && <section className="panel stack">
        <h2>How would you like to return?</h2>
        {!selection.length && <p className="muted">Select items to see the available return methods.</p>}
        {selection.length > 0 && !availableMethods.length && <p className="error">The selected items have no return method in common.</p>}
        <div className="fulfillment-options">
          {Object.entries(methods).map(([value, label]) => {
            const Icon = value === 'store' ? Store : Truck
            return <label className={`choice ${chosenMethod === value ? 'selected' : ''}`} key={value}>
              <input type="radio" name="return-method" value={value} checked={chosenMethod === value} disabled={!availableMethods.includes(value)}
                onChange={() => { setMethod(value); setFailure('') }} />
              <Icon size={19} /><span><strong>{label}</strong><small>{value === 'store' ? 'Show a barcode at Guest Services.' : 'Print a prepaid label.'}</small></span>
            </label>
          })}
        </div>
      </section>}
      {failure && <p className="error" role="alert">{failure}</p>}
      <div className="cluster">
        <button className="button primary" type="submit" disabled={submitting || !options.some((option) => !option.issue)}>{submitting ? 'Submitting…' : review ? 'Submit return' : 'Review return'} <ArrowRight size={16} /></button>
        {review && <button className="button secondary" type="button" onClick={() => { setReview(false); setFailure('') }}>Back to items</button>}
      </div>
    </div>
    <ReturnReview order={order} quote={quote} method={chosenMethod} />
  </form>
}

export function Returns() {
  const { state } = useStore()
  const { orderId } = useParams()
  const { search } = useLocation()
  const requestId = new URLSearchParams(search).get('request')
  const order = byId(state.orders, orderId)
  const request = requestId && byId(state.returns, requestId)
  if (!order) return <Empty title="Order unavailable" to="/orders" action="View purchases">We couldn’t find this order.</Empty>
  if (requestId) {
    if (!request || request.orderId !== order.id) return <Empty title="Return unavailable" to={orderPath(order.id)} action="Order details">We couldn’t find this return.</Empty>
    return <div className="orders-page stack">
      <ShopLink to={orderPath(order.id)}>Back to order details</ShopLink>
      <section className="panel confirmation"><CheckCircle2 size={24} /><div><h1>Return submitted</h1><p>Return #{request.returnNumber || request.id}</p></div></section>
      <section className="panel stack"><h2>{returnLabel(request.method)}</h2>
        <p>Estimated refund <strong>{money(request.estimatedRefundCents)}</strong></p>
        <ReturnInstructions request={request} />
      </section>
    </div>
  }
  return <>
    <ShopLink className="breadcrumb" to={orderPath(order.id)}>Back to order details</ShopLink>
    <PageHeading title="Start a return"><p className="muted">Order #{order.orderNumber || order.id}</p></PageHeading>
    <ReturnForm key={order.id} order={order} />
  </>
}
