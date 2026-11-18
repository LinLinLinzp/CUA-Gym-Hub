import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { estimateReturn, returnableLines, submitReturn } from './actions.js'
import { reasonCodes } from './data/seed.js'
import {
  AccountLink, Back, Badge, Dialog, Empty, Heading, ProductArt, SectionHeading, SelectFilter, Timeline,
  date, human, list, money, newest, orderNumber, paths, paymentLabel, returnNumber,
} from './ui.jsx'

const statuses = ['submitted', 'in_transit', 'completed', 'cancelled']

export function Returns() {
  const { state } = useAccount()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [picker, setPicker] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState('')
  const orders = list(state.orders)
  const orderMap = new Map(orders.map((order) => [order.id, order]))
  const requests = list(state.returns)
  const availableStatuses = [...new Set([...statuses, ...requests.map((entry) => entry.status).filter(Boolean)])]
  const phrase = search.trim().toLowerCase()
  const matches = newest(requests.filter((entry) => {
    if (status && entry.status !== status) return false
    const order = orderMap.get(entry.orderId)
    return !phrase || [returnNumber(entry), entry.id, entry.orderId, order?.orderNumber]
      .some((value) => String(value ?? '').toLowerCase().includes(phrase))
  }), 'createdAt')
  const eligible = picker ? newest(orders.filter((order) => returnableLines(state, order).length), 'placedAt') : []
  const clear = () => { setSearch(''); setStatus('') }

  return <>
    <Heading title="Returns" description="Start a mail return or check a request you’ve already sent.">
      <button type="button" className="button" onClick={() => { setSelectedOrder(''); setPicker(true) }}>Start a return</button>
    </Heading>
    <div className="filters">
      <label className="search-control">Search returns<input type="search" placeholder="Return or order number" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <SelectFilter label="Return status" value={status} onChange={setStatus} options={[[ '', 'All statuses'], ...availableStatuses.map((key) => [key, human(key)])]} />
      <button className="button secondary" type="button" onClick={clear}>Clear filters</button>
    </div>
    <p className="results" role="status">{matches.length} {matches.length === 1 ? 'return' : 'returns'}</p>
    {matches.length ? <div className="history card"><ul className="rows">{matches.map((entry, index) => {
      const order = orderMap.get(entry.orderId)
      return <li className="history-row" key={entry.id ?? index}>
        <div>{entry.id ? <AccountLink className="row-id" to={paths.request(entry.id)}>{returnNumber(entry)}</AccountLink> : <strong>{returnNumber(entry)}</strong>}
          <span className="metadata">Requested {date(entry.createdAt)}</span></div>
        <div className="item-preview">{order?.id ? <AccountLink to={paths.order(order.id)}>Order {orderNumber(order)}</AccountLink> : entry.orderId || 'Order unavailable'}</div>
        <Badge status={entry.status} />
        <strong>{money(entry.refundedAmount ?? entry.estimatedRefund, entry.currency)}</strong>
      </li>
    })}</ul></div> : <Empty title={requests.length ? 'No matching returns' : 'No returns yet'}>
      <p className="muted">{requests.length ? 'Try a different search or clear your filters.' : 'Your submitted return requests will appear here.'}</p>
      {requests.length > 0 && <button className="button secondary" type="button" onClick={clear}>Show all returns</button>}
    </Empty>}
    {picker && <Dialog title="Choose an order" close={() => setPicker(false)}>
      {eligible.length ? <>
        <SelectFilter label="Eligible order" value={selectedOrder} onChange={setSelectedOrder}
          options={[[ '', 'Select an order'], ...eligible.map((order) => [order.id, orderNumber(order) + ' · ' + date(order.placedAt)])]} />
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={() => setPicker(false)}>Close</button>
          {selectedOrder ? <AccountLink className="button" to={paths.newReturn(selectedOrder)}>Continue</AccountLink>
            : <button type="button" className="button" disabled>Continue</button>}
        </div>
      </> : <>
        <p className="muted">There are no delivered orders with items available to return.</p>
        <div className="dialog-actions"><AccountLink className="button secondary" to={paths.orders}>View orders</AccountLink></div>
      </>}
    </Dialog>}
  </>
}

export function NewReturn() {
  const { orderId } = useParams()
  return <ReturnForm key={orderId} orderId={orderId} />
}

function ReturnForm({ orderId }) {
  const { state, commit } = useAccount()
  const [selected, setSelected] = useState({})
  const [review, setReview] = useState(null)
  const submitted = useRef(false)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const order = list(state.orders).find((entry) => entry.id === orderId)
  if (!order) return <><Back to={paths.returns}>Returns</Back><Empty title="Order unavailable"><p>Choose an order from your account to start a return.</p><AccountLink to={paths.returns}>View returns</AccountLink></Empty></>
  if (receipt) return <>
    <Back to={paths.returns}>Returns</Back>
    <Heading title="Return submitted" description={'Your request for order ' + orderNumber(order) + ' is ready to mail.'} />
    <section className="card stack">
      <SectionHeading title={returnNumber(receipt)} />
      <p>Estimated refund <strong>{money(receipt.estimatedRefund, receipt.currency)}</strong> to your original payment method.</p>
      <AccountLink className="button" to={paths.request(receipt.id)}>View return and mail instructions</AccountLink>
    </section>
  </>

  const available = returnableLines(state, order)

  function toggle(id, checked) {
    setSelected((previous) => {
      if (checked) return { ...previous, [id]: { quantity: 1, reasonCode: '' } }
      const next = { ...previous }
      delete next[id]
      return next
    })
    setError('')
  }

  function update(id, fields) {
    setSelected((previous) => ({ ...previous, [id]: { ...previous[id], ...fields } }))
    setError('')
  }

  function showReview(event) {
    event.preventDefault()
    const estimate = estimateReturn(state, orderId, selected)
    if (estimate.error) {
      setError(estimate.error)
      return
    }
    setSubmitError('')
    setReview(estimate)
  }

  function submit() {
    if (submitted.current) return
    const result = commit((current) => submitReturn(current, orderId, selected))
    if (result.error) {
      setSubmitError(result.error)
      return
    }
    submitted.current = true
    setReview(null)
    setReceipt(result.record)
  }

  return <>
    <Back to={paths.order(orderId)}>Order {orderNumber(order)}</Back>
    <Heading title="Start a return" description="Choose the items you want to send back by mail." />
    {available.length ? <form className="detail-grid" onSubmit={showReview}>
      <section className="card">
        <SectionHeading title="Returnable items" />
        <ul className="rows">
          {available.map(({ line, remaining }, index) => {
            const draft = Object.hasOwn(selected, line.id) ? selected[line.id] : null
            return <li className="return-choice" key={line.id}>
              <label className="choose-line">
                <input type="checkbox" checked={Boolean(draft)} onChange={(event) => toggle(line.id, event.target.checked)} />
                <ProductArt category={line.category} />
                <span><strong>{line.name || line.id}</strong><span className="metadata">{remaining} available · {money(line.refundableUnitAmount, order.currency)} refundable each</span></span>
              </label>
              {draft && <div className="line-fields">
                <label htmlFor={'quantity-' + index}>Quantity
                  <input type="number" id={'quantity-' + index} min="1" max={remaining} required value={draft.quantity || ''}
                    onChange={(event) => update(line.id, { quantity: Number(event.target.value) })} />
                </label>
                <label htmlFor={'reason-' + index}>Reason
                  <select id={'reason-' + index} required value={draft.reasonCode} onChange={(event) => update(line.id, { reasonCode: event.target.value })}>
                    <option value="">Select a reason</option>
                    {Object.entries(reasonCodes).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </select>
                </label>
              </div>}
            </li>
          })}
        </ul>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </section>
      <section className="card stack">
        <div><SectionHeading title="Refund method" /><p>Original payment</p><p className="metadata">{paymentLabel(order.payment)}</p></div>
        <button className="button" type="submit">Review return</button>
      </section>
    </form> : <Empty title="No items available to return"><p>Check your order history for another eligible purchase.</p><AccountLink to={paths.returns}>View returns</AccountLink></Empty>}
    {review && <Dialog title="Review your mail return" close={() => setReview(null)}>
      <ul className="rows review-lines">
        {review.items.map((item) => {
          const line = list(order.items).find((entry) => entry.id === item.orderLineId)
          return <li key={item.orderLineId}>
            <div><strong>{line?.name || item.orderLineId}</strong><span className="metadata">Quantity {item.quantity} · {reasonCodes[item.reasonCode]}</span></div>
            <strong>{money(item.estimatedRefund, order.currency)}</strong>
          </li>
        })}
      </ul>
      <dl className="amounts"><div className="total"><dt>Estimated refund</dt><dd>{money(review.estimatedRefund, order.currency)}</dd></div></dl>
      <p className="metadata">Original payment · {paymentLabel(order.payment)}</p>
      {submitError && <p className="inline-error" role="alert">{submitError}</p>}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={() => setReview(null)}>Edit items</button>
        <button type="button" className="button" onClick={submit}>Submit return</button>
      </div>
    </Dialog>}
  </>
}

export function ReturnDetails() {
  const { returnId } = useParams()
  const { state } = useAccount()
  const request = list(state.returns).find((entry) => entry.id === returnId)
  if (!request) return <><Back to={paths.returns}>Returns</Back><Empty title="Return unavailable"><p>This return could not be found in your account.</p><AccountLink to={paths.returns}>View returns</AccountLink></Empty></>
  const order = list(state.orders).find((entry) => entry.id === request.orderId)
  const originalLines = list(order?.items)
  const items = list(request.items)
  const refunded = request.status === 'completed' && request.refundedAmount != null
  return <>
    <Back to={paths.returns}>Returns</Back>
    <Heading title={<span className="detail-header">Return {returnNumber(request)} <Badge status={request.status} /></span>} description={'Requested ' + date(request.createdAt)} />
    <div className="detail-grid">
      <div className="stack">
        <section className="card">
          <SectionHeading title="Requested items" />
          {items.length ? <ul className="rows">{items.map((item, index) => {
            const line = originalLines.find((entry) => entry.id === item.orderLineId)
            return <li className="line-item" key={item.orderLineId ?? index}>
              <ProductArt category={line?.category} />
              <div><strong>{line?.name || item.orderLineId || 'Product'}</strong>
                <span className="metadata">Quantity {item.quantity ?? '—'}{item.reasonCode && ' · ' + (reasonCodes[item.reasonCode] || human(item.reasonCode))}</span></div>
              <strong>{money(refunded ? item.refundedAmount ?? item.estimatedRefund : item.estimatedRefund, request.currency)}</strong>
            </li>
          })}</ul> : <p className="muted">Return item details are unavailable.</p>}
        </section>
        <section className="card">
          <SectionHeading title="Return timeline" />
          <Timeline events={request.timeline} />
        </section>
        {request.status === 'submitted' && request.method === 'mail' && <section className="card">
          <SectionHeading title="Mail-back instructions" />
          <ol className="mail-steps">
            <li>Pack the selected items securely and include your return number {returnNumber(request)} inside.</li>
            <li>Attach the prepaid label from your order materials and remove any older labels.</li>
            <li>Drop off the parcel with the carrier shown on the label and keep the receipt until your refund is processed.</li>
          </ol>
        </section>}
      </div>
      <section className="card">
        <SectionHeading title="Refund summary" />
        <dl className="amounts">
          {request.refundMethod && <div><dt>Method</dt><dd>{human(request.refundMethod)}</dd></div>}
          {request.completedAt && <div><dt>Completed</dt><dd>{date(request.completedAt)}</dd></div>}
          <div className="total"><dt>{refunded ? 'Refunded amount' : 'Estimated refund'}</dt><dd>{money(refunded ? request.refundedAmount : request.estimatedRefund, request.currency)}</dd></div>
        </dl>
        <p className="metadata">{paymentLabel(order?.payment)}</p>
        {order && <AccountLink className="related-order" to={paths.order(order.id)}>View order {orderNumber(order)}</AccountLink>}
      </section>
    </div>
  </>
}
