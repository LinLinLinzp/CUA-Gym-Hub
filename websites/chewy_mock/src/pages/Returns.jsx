import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store'
import { calculateReturn, date, eventId, find, list, matches, money, orderLabel, reasons, refundMethods, remaining } from '../model'
import { Back, Badge, ButtonLink, Empty, ErrorText, Filter, Labelled, Missing, PageHeader, ProductLine, Search, SiteLink, Totals, routeId, useSiteNavigate } from '../ui'

const returnStatuses = { '': 'All statuses', requested: 'Requested', in_transit: 'In transit', refunded: 'Refunded' }
const label = (entry) => entry.returnNumber || entry.id || 'Return'

export function Returns() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [starting, setStarting] = useState(false)
  const [orderId, setOrderId] = useState('')
  const orders = list(state.orders)
  const orderMap = new Map(orders.map(order => [order.id, order]))
  const returns = list(state.returns)
  const entries = returns.filter(entry => (!status || entry.status === status) && matches(query, label(entry), entry.orderId, orderLabel(orderMap.get(entry.orderId))))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  const eligible = starting ? orders.filter(order => remaining(order, returns).some(line => line.available > 0)) : []
  return <>
    <PageHeader title="Returns" description="Request a return or check the status of an existing request.">
      <button className="primary" aria-expanded={starting} onClick={() => setStarting(!starting)}>{starting ? 'Close order selection' : 'Start a return'}</button>
    </PageHeader>
    {starting && <section className="card">
      <h2>Choose an order</h2>
      {eligible.length ? <>
        <Filter label="Eligible order" options={Object.fromEntries([['', 'Choose an order'], ...eligible.map(order => [
          order.id, orderLabel(order) + ' · ' + date(order.createdAt) + (list(order.items)[0]?.name ? ' · ' + list(order.items)[0].name : ''),
        ])])} value={orderId} onChange={setOrderId} />
        <div className="actions">{orderId && <ButtonLink primary to={'/returns/new/' + routeId(orderId)}>Continue to items</ButtonLink>}</div>
      </> : <Empty title="No eligible orders"><SiteLink to="/orders">View Order History</SiteLink></Empty>}
    </section>}
    <section aria-label="Return history">
      <div className="toolbar">
        <Search label="Search return or order numbers" value={query} onChange={setQuery} />
        <Filter label="Return status" options={returnStatuses} value={status} onChange={setStatus} />
      </div>
      {!entries.length && <Empty title={query || status ? 'No matching returns' : 'No returns yet'} />}
      <div className="collection">{entries.map(entry => <article key={entry.id} className="card list-card">
        <div><h3>{label(entry)}</h3><small>{orderLabel(orderMap.get(entry.orderId))} · {date(entry.createdAt)}</small></div>
        <div className="actions"><Badge status={entry.status} /><strong className="amount">{money(entry.refundAmount)}</strong><ButtonLink to={'/returns/' + routeId(entry.id)}>View return</ButtonLink></div>
      </article>)}</div>
    </section>
  </>
}

const RefundTotals = ({ entry }) => <Totals rows={[
  ['Items', entry.itemsAmount], ['Shipping refund', entry.shippingRefund], ['Tax refund', entry.taxRefund],
]} total={entry.refundAmount} label="Refund total" />

export function ReturnDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const entry = find(state.returns, id)
  if (!entry) return <Missing to="/returns" label="Back to Returns" title="Return not found" />
  const order = find(state.orders, entry.orderId)
  const items = list(entry.items)
  return <>
    <Back to="/returns">Returns</Back>
    <PageHeader title={label(entry)} description={'Requested ' + date(entry.createdAt)}><Badge status={entry.status} /></PageHeader>
    <div className="detail-grid">
      <section className="card"><h2>Return items</h2>
        {!items.length && <Empty title="No item details available" />}
        {items.map((item, index) => <ProductLine key={item.orderItemId || index} item={item} price={item.amount}>
          {item.reason && <small>Reason · {reasons[item.reason] || item.reason}</small>}
        </ProductLine>)}
        {order && <div className="actions"><ButtonLink to={'/orders/' + routeId(order.id)}>View order {orderLabel(order)}</ButtonLink></div>}
      </section>
      <section className="card"><h2>Refund details</h2>
        <p>{refundMethods[entry.refundMethod] || 'Refund destination unavailable'}</p>
        <RefundTotals entry={entry} />
        {entry.refundedAt && <p className="meta">Refunded {date(entry.refundedAt)}</p>}
        {entry.instructions && <p>{entry.instructions}</p>}
      </section>
    </div>
  </>
}

export function ReturnRequest() {
  const { orderId } = useParams()
  const { state } = useAccount()
  const order = find(state.orders, orderId)
  if (!order) return <Missing to="/returns" label="Back to Returns" title="Order not found" />
  return <Request key={orderId} order={order} />
}

function Request({ order }) {
  const { state, commit } = useAccount()
  const navigate = useSiteNavigate()
  const [choices, setChoices] = useState({})
  const [method, setMethod] = useState('original_payment')
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const lines = remaining(order, state.returns)
  const available = lines.some(line => line.available > 0)

  function toggle(itemId, checked) {
    const next = checked ? { ...choices, [itemId]: { quantity: 1, reason: '' } } : { ...choices }
    if (!checked) delete next[itemId]
    setChoices(next)
  }

  function change(id, field, value) {
    setChoices(current => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  function reviewRequest(event) {
    event.preventDefault()
    try {
      setReview(calculateReturn(order, state.returns, choices, method))
      setError('')
    } catch (err) { setError(err.message) }
  }

  function submit() {
    const id = eventId('ret')
    try {
      commit((current, metadata) => {
        const purchase = find(current.orders, order.id)
        if (!purchase) throw Error('This order is unavailable.')
        const returns = list(current.returns)
        const refund = calculateReturn(purchase, returns, choices, method)
        const entry = { id, returnNumber: 'RET-' + id.slice(4).toUpperCase(), orderId: order.id, status: 'requested', ...metadata, ...refund }
        return { ...current, returns: [entry, ...returns] }
      }, 'Return requested.')
      navigate('/returns/' + routeId(id), { replace: true })
    } catch (err) { setError(err.message) }
  }

  return <>
    <Back to={'/orders/' + routeId(order.id)}>Order {orderLabel(order)}</Back>
    <PageHeader title={review ? 'Review your return' : 'Request a return'} description={'Order ' + orderLabel(order)} />
    {review ? <div className="detail-grid">
      <section className="card">
        <h2>Selected items</h2>
        {review.items.map(item => <ProductLine key={item.orderItemId} item={item} price={item.amount}><small>Reason · {reasons[item.reason]}</small></ProductLine>)}
        <ErrorText>{error}</ErrorText>
        <div className="actions"><button onClick={() => { setReview(null); setError('') }}>Edit selection</button><button className="primary" onClick={submit}>Submit return request</button></div>
      </section>
      <section className="card"><h2>Refund destination</h2><p>{refundMethods[method]}</p><RefundTotals entry={review} /></section>
    </div> : <form onSubmit={reviewRequest} className="detail-grid" noValidate>
      <section className="card"><h2>Choose items</h2>
        {!available && <Empty title="No items are available to return"><SiteLink to="/returns">View return history</SiteLink></Empty>}
        {lines.map(({ item, available: quantity }, index) => {
          const selected = Object.hasOwn(choices, item.id) ? choices[item.id] : null
          const name = item.name || 'Item'
          return <div className="return-line" key={item.id || index}>
            {quantity > 0 && <label className="check-row"><input type="checkbox" checked={Boolean(selected)} onChange={event => toggle(item.id, event.target.checked)} />Select {name}</label>}
            <ProductLine item={item}><small>{quantity > 0 ? quantity + ' available to return' : 'Unavailable to return'}</small></ProductLine>
            {selected && quantity > 0 && <div className="form-fields">
              <Labelled label="Quantity"><input aria-label={'Quantity for ' + name} type="number" min="1" max={quantity} step="1" value={selected.quantity} onChange={e => change(item.id, 'quantity', e.target.value)} /></Labelled>
              <Filter label="Reason" options={{ '': 'Choose a reason', ...reasons }} value={selected.reason} onChange={value => change(item.id, 'reason', value)} />
            </div>}
          </div>
        })}
      </section>
      <section className="card">
        <h2>Refund destination</h2>
        <Filter label="Send refund to" options={refundMethods} value={method} onChange={setMethod} />
        {method === 'original_payment' && order.paymentLabel && <p className="meta">{order.paymentLabel}</p>}
        <ErrorText>{error}</ErrorText>
        <div className="actions"><button className="primary" type="submit" disabled={!available}>Review return</button></div>
      </section>
    </form>}
  </>
}

