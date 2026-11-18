
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AppLink, date, Empty, ErrorMessage, Field, find, Heading, label, latest, methodLabels,
  Metric, Missing, money, newId, orderName, records, ResultCount, roundMoney, route,
  SelectOptions, stamp, Status, storeName, useAccount, useAccountNavigate, whole,
} from '../shared.jsx'
import { returnableLines, returnReasons } from '../eligibility.js'

const returnPath = '/returns'

export function Returns() {
  const { state } = useAccount()
  const navigate = useAccountNavigate()
  const [orderId, setOrderId] = useState('')
  const [error, setError] = useState('')
  const eligible = latest(state.orders).filter((order) => returnableLines(state, order).length)
  const history = latest(state.returns)

  function start(event) {
    event.preventDefault()
    if (!find(eligible, orderId)) { setError('Choose an eligible order.'); return }
    navigate(route('/returns/new', orderId))
  }

  return <div className="flow">
    <Heading title="Returns" intro="Request a return for eligible purchases and check the status of past requests." />
    <section className="panel pad return-picker"><h2>Start a return</h2>
      {eligible.length ? <form noValidate onSubmit={start}>
        <div className="picker-controls">
          <Field label="Eligible order"><select required value={orderId} onChange={(e) => { setOrderId(e.target.value); setError('') }}>
            <option value="">Choose an order</option>{eligible.map((order) => <option key={order.id} value={order.id}>{orderName(order)} · {date(order.createdAt)}</option>)}
          </select></Field>
          <button className="primary" type="submit">Start a return</button>
        </div><ErrorMessage>{error}</ErrorMessage>
      </form> : <p>No orders currently have items available to return. <AppLink to="/orders">View orders</AppLink></p>}
    </section>
    <div className="heading-row"><h2>Return history</h2><ResultCount count={history.length} singular="return" /></div>
    {history.length ? <ul className="panel rows">{history.map((entry) => <li className="record-row order-row" key={entry.id}>
      <div><AppLink to={route(returnPath, entry.id)}>{entry.id}</AppLink><small>{date(entry.createdAt)}</small></div>
      <div><small>Order</small>{orderName(find(state.orders, entry.orderId))}</div>
      <div><small>Method</small>{methodLabels[entry.method] || 'Unavailable'}</div>
      <div><small>Estimated refund</small>{money(entry.refundAmount)}</div>
      <Status value={entry.status} />
    </li>)}</ul> : <Empty title="No return requests yet"><p>Submitted returns will appear here.</p></Empty>}
  </div>
}

export function NewReturn() {
  const { orderId } = useParams()
  const { state, mutate } = useAccount()
  const navigate = useAccountNavigate()
  const [draft, setDraft] = useState({})
  const [method, setMethod] = useState('')
  const [storeId, setStoreId] = useState('')
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const order = find(state.orders, orderId)
  if (!order) return <Missing title="Order unavailable" to={returnPath} link="Back to Returns" />
  const lines = returnableLines(state, order)
  const selected = lines.filter((line) => draft[line.id]?.selected)
  const methods = Object.keys(methodLabels).filter((value) => selected.length && selected.every((line) => line.methods.includes(value)))
  const stores = records(state.stores)
  const savedStore = find(stores, storeId)

  function update(id, fields) {
    setDraft((previous) => ({ ...previous, [id]: { quantity: '1', reason: '', ...previous[id], ...fields } }))
    setError('')
  }

  function prepare(current) {
    const original = find(current.orders, orderId)
    const available = returnableLines(current, original)
    const entries = Object.entries(draft).filter(([, entry]) => entry.selected)
    if (!entries.length) return 'Select at least one item to return.'
    const items = []
    for (const [id, entry] of entries) {
      const line = find(available, id)
      if (!line || !whole(entry.quantity) || Number(entry.quantity) > line.available) {
        return 'Enter a whole quantity within the available limit for each selected item.'
      }
      if (!Object.hasOwn(returnReasons, entry.reason)) return 'Choose a reason for each selected item.'
      if (!line.methods.includes(method)) return 'Choose a method supported by all selected items.'
      const quantity = Number(entry.quantity)
      items.push({
        orderItemId: line.id, productId: line.productId ?? null, quantity, reason: entry.reason,
        unitPrice: line.unitPrice, amount: roundMoney(line.unitPrice * quantity),
      })
    }
    if (method === 'in_store' && storeId && !find(current.stores, storeId)) return 'Choose an available drop-off store.'
    return {
      orderId: original.id, method, ...(method === 'in_store' && storeId && { storeId }), items,
      refundAmount: roundMoney(items.reduce((sum, item) => sum + item.amount, 0)),
    }
  }

  function edit() {
    setDraft((previous) => Object.fromEntries(lines.filter((line) => previous[line.id])
      .map((line) => [line.id, previous[line.id]])))
    setReview(null)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!review) {
      const result = prepare(state)
      setError(typeof result === 'string' ? result : '')
      if (typeof result !== 'string') setReview(result)
      return
    }
    const id = newId('return')
    const problem = await mutate((current) => {
      const result = prepare(current)
      if (typeof result === 'string') return result
      if (JSON.stringify(result) !== JSON.stringify(review)) return 'Return details changed. Edit your selections and review the updated estimate.'
      return { ...current, returns: [...(current.returns ?? []), { id, ...result, status: 'requested', ...stamp(current) }] }
    })
    setError(problem)
    if (!problem) navigate(route(returnPath, id), { replace: true })
  }

  const estimate = selected.reduce((sum, line) => {
    const qty = draft[line.id]?.quantity
    return whole(qty) && Number(qty) <= line.available ? sum + roundMoney(Number(qty) * line.unitPrice) : sum
  }, 0)

  return <div className="flow">
    <Heading title={review ? 'Review return' : 'Start a return'} intro={orderName(order)}
      back={{ to: route('/orders', orderId), label: 'Order details' }} />
    {!(lines.length || review) ? <Empty title="No items available to return"><AppLink to={returnPath}>Back to Returns</AppLink></Empty> :
      <form className="detail-grid" onSubmit={submit} noValidate>
        <div className="flow">
          <section className="panel pad"><h2>{review ? 'Selected items' : 'Choose items'}</h2>
            {review ? <ul className="rows">{review.items.map((item) => <li className="record-row review-line" key={item.orderItemId}>
              <div><strong>{find(lines, item.orderItemId)?.name || find(order.items, item.orderItemId)?.name || find(state.products, item.productId)?.name || 'Order item'}</strong>
                <small>{returnReasons[item.reason]} · Quantity {item.quantity}</small></div><strong>{money(item.amount)}</strong>
            </li>)}</ul> : <div className="return-items">{lines.map((line) => {
              const entry = draft[line.id]
              return <fieldset className="return-line" key={line.id}>
                <legend>{line.name}</legend>
                <label className="choice"><input type="checkbox" checked={entry?.selected || false}
                  onChange={(e) => update(line.id, { selected: e.target.checked })} aria-label={'Return ' + line.name} />
                  <span>Return this item<small>{line.available} available · {money(line.unitPrice)} each</small></span></label>
                {entry?.selected && <div className="form-columns">
                  <Field label="Quantity"><input type="number" min="1" max={line.available} step="1" value={entry.quantity}
                    onChange={(e) => update(line.id, { quantity: e.target.value })} /></Field>
                  <Field label="Reason"><select value={entry.reason} onChange={(e) => update(line.id, { reason: e.target.value })}>
                    <option value="">Choose a reason</option><SelectOptions options={returnReasons} />
                  </select></Field>
                </div>}
              </fieldset>
            })}</div>}
          </section>
          <section className="panel pad"><h2>Return method</h2>
            {review ? <dl className="metrics"><Metric title="Method">{methodLabels[review.method]}</Metric>
              {review.storeId && <Metric title="Drop-off store">{savedStore?.name || 'Store details unavailable'}</Metric>}</dl>
            : <div className="form-flow">
              <Field label="Method"><select value={methods.includes(method) ? method : ''} disabled={!methods.length}
                onChange={(e) => { setMethod(e.target.value); setError('') }}>
                <option value="">Choose a return method</option>
                <SelectOptions options={Object.fromEntries(methods.map((value) => [value, methodLabels[value]]))} />
              </select></Field>
              {selected.length === 0 && <small>Select an item to see available methods.</small>}
              {selected.length > 0 && !methods.length && <small>The selected items need separate return requests.</small>}
              {method === 'in_store' && methods.includes(method) && stores.length > 0 && <Field label="Drop-off store (optional)">
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)}><option value="">Choose a store later</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name || store.id}</option>)}</select>
              </Field>}
            </div>}
          </section>
        </div>
        <section className="panel pad"><h2>Refund estimate</h2>
          <dl className="metrics"><Metric title="Estimated merchandise refund">{money(review?.refundAmount ?? roundMoney(estimate))}</Metric></dl>
          <ErrorMessage>{error}</ErrorMessage>
          <div className="form-flow">
            <button className="primary" type="submit">{review ? 'Submit return' : 'Review return'}</button>
            {review && <button type="button" className="secondary" onClick={edit}>Edit return</button>}
          </div>
        </section>
      </form>}
  </div>
}

export function ReturnDetail() {
  const { returnId } = useParams()
  const { state } = useAccount()
  const entry = find(state.returns, returnId)
  if (!entry) return <Missing title="Return unavailable" to={returnPath} link="Back to Returns" />
  const order = find(state.orders, entry.orderId)
  const items = records(entry.items)
  const store = find(state.stores, entry.storeId)

  return <div className="flow">
    <Heading title="Return details" intro={entry.id} back={{ to: returnPath, label: 'Returns' }} action={<Status value={entry.status} />} />
    <div className="detail-grid">
      <div className="flow">
        <section className="panel pad"><h2>{entry.status === 'requested' ? 'Next steps' : 'Return status'}</h2>
          {entry.status === 'requested'
            ? <p>{entry.method === 'in_store' ? 'Bring the listed items and this return reference to the returns desk.'
              : entry.method === 'mail' ? 'Pack the listed items securely and keep this return reference with the package.' : 'Return instructions are unavailable.'}</p>
            : <p>{label(entry.status)} · Requested {date(entry.createdAt)}</p>}
          {store && <p>{store.name}{store.address && <><br />{store.address}</>}</p>}
        </section>
        <section className="panel"><div className="panel-heading"><h2>Returned items</h2></div>
          {items.length ? <ul className="rows">{items.map((item, index) => {
            const source = find(order?.items, item.orderItemId)
            const product = find(state.products, item.productId)
            return <li className="record-row line-row" key={item.orderItemId ?? index}>
              <div><strong>{source?.name || product?.name || 'Order item'}</strong><small>{returnReasons[item.reason] || label(item.reason)}</small></div>
              <div><small>Quantity</small>{item.quantity ?? '—'}</div><div><small>Amount</small>{money(item.amount)}</div>
            </li>
          })}</ul> : <p className="panel-body">Item details are unavailable.</p>}
        </section>
      </div>
      <section className="panel pad"><h2>Return summary</h2><dl className="metrics">
        <Metric title="Order">{order ? <AppLink to={route('/orders', order.id)}>{orderName(order)}</AppLink> : 'Unavailable'}</Metric>
        <Metric title="Method">{methodLabels[entry.method] || 'Unavailable'}</Metric>
        <Metric title="Requested">{date(entry.createdAt)}</Metric><Metric title="Estimated refund">{money(entry.refundAmount)}</Metric>
      </dl></section>
    </div>
  </div>
}
