import React, { useRef, useState } from 'react'
import { ChevronRight, PackageOpen } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AccountLink, detailPath, Empty, ErrorText, Page, PriceSummary, Status, useAccountNavigate } from '../components.jsx'
import { requestReturn, returnConditions, returnMethods, returnQuantity, returnReasons, reviewReturn } from '../data/mutations.js'
import { useAccount } from '../store.jsx'
import { byId, dateText, list, money, newest, orderLabel, statusLabel } from '../utils/account.js'

export function Returns() {
  const { state } = useAccount()
  const entries = newest(state.returns)
  return <Page title="Returns" description="Start a return or follow an existing request."
    action={<AccountLink className="button primary" to="/returns/new">Start a return</AccountLink>}>
    <section>
      <div className="section-heading"><h2>Return history</h2><span className="muted">{entries.length}</span></div>
      {entries.length ? <div className="card rows">{entries.map((entry) => {
        const order = byId(state.orders, entry.orderId)
        return <div className="return-row" key={entry.id}>
          <span className="tile-icon"><PackageOpen size={21} aria-hidden="true" /></span>
          <div className="record-name">
            <AccountLink to={detailPath('returns', entry.id)}><strong>{entry.reference || entry.id}</strong></AccountLink>
            <small>{dateText(entry.createdAt)}{order && <> · <AccountLink to={detailPath('orders', order.id)}>Order {orderLabel(order)}</AccountLink></>}</small>
          </div>
          <Status value={entry.status} /><strong className="row-amount">{money(entry.refundAmount)}</strong>
          <AccountLink className="row-chevron" aria-label={'View return ' + (entry.reference || entry.id)} to={detailPath('returns', entry.id)}>
            <ChevronRight size={18} aria-hidden="true" />
          </AccountLink>
        </div>
      })}</div> : <Empty title="No return requests yet">New requests and refund estimates will appear here.</Empty>}
    </section>
  </Page>
}

export function ReturnForm() {
  const { state } = useAccount()
  const navigate = useAccountNavigate()
  const [params] = useSearchParams()
  const orderId = params.get('order') || ''
  const orders = newest(state.orders).filter((order) =>
    list(order.lines).some((line) => returnQuantity(state, order, line) > 0))
  const order = byId(orders, orderId)
  return <Page title="Start a return" description="Choose the purchase and items you’d like to return." back={['/returns', 'Back to returns']}>
    {!orders.length ? <Empty title="No purchases eligible for return" action={<AccountLink to="/orders">View purchases</AccountLink>} />
      : <section className="card panel">
        <label className="field">Purchase<select value={order?.id || ''}
          onChange={(event) => navigate(event.target.value ? '/returns/new?order=' + encodeURIComponent(event.target.value) : '/returns/new', { replace: true })}>
          <option value="">Select a delivered or collected order</option>
          {orders.map((entry) => <option value={entry.id} key={entry.id}>Order {orderLabel(entry)} · {dateText(entry.createdAt)}</option>)}
        </select></label>
        {orderId && !order && <ErrorText error="This purchase has no returnable items. Choose another order." />}
      </section>}
    {order && <ReturnItems key={order.id} order={order} />}
  </Page>
}

const blank = { selected: false, quantity: '1', reason: '', condition: '' }
const returnItemName = (line) => line.name || line.productId || 'Order item'

function ReturnItems({ order }) {
  const { state, commit, announce } = useAccount()
  const navigate = useAccountNavigate()
  const submitted = useRef(false)
  const [selections, setSelections] = useState({})
  const [method, setMethod] = useState('in_store')
  const [error, setError] = useState('')
  const orderLines = list(order.lines)
  const lines = orderLines.filter((line) => returnQuantity(state, order, line) > 0)
  const nameCounts = new Map()
  for (const line of orderLines) {
    const name = returnItemName(line)
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
  }
  const selected = lines.filter((line) => selections[line.id]?.selected)
  const parcel = selected.length > 0 && selected.every((line) => line.parcelEligible === true)
  const currentMethod = parcel ? method : 'in_store'
  const estimate = reviewReturn(state, order, selections, currentMethod)

  function update(id, next) {
    setSelections((value) => ({ ...value, [id]: { ...blank, ...value[id], ...next } }))
    setError('')
  }
  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const result = commit((current) => requestReturn(current, order.id, selections, currentMethod))
    setError(result.error || '')
    if (result.entry) {
      submitted.current = true
      announce('Return requested.')
      navigate(detailPath('returns', result.entry.id), { replace: true })
    }
  }

  return <form className="split" onSubmit={submit} noValidate>
    <div className="stack">
      <section className="card panel"><h2>Items to return</h2>
        <div className="choice-lines">{lines.map((line) => {
          const choice = selections[line.id] || blank
          const available = returnQuantity(state, order, line, choice.condition || 'unopened')
          const itemName = returnItemName(line)
          const name = nameCounts.get(itemName) > 1
            ? [itemName, line.variant, line.articleNumber, 'Line ' + (orderLines.indexOf(line) + 1)].filter(Boolean).join(' · ')
            : itemName
          return <div className="return-choice" key={line.id}>
            <label className="check"><input type="checkbox" checked={choice.selected}
              onChange={(event) => update(line.id, { selected: event.target.checked })} />
              <span><strong>{name}</strong><small>{money(line.unitPrice)} each · {available} returnable</small></span>
            </label>
            {choice.selected && <div className="return-fields">
              <label className="field">Quantity<input type="number" min="1" max={available} step="1" value={choice.quantity}
                aria-label={'Return quantity for ' + name} onChange={(event) => update(line.id, { quantity: event.target.value })} /></label>
              <label className="field">Reason<select value={choice.reason} aria-label={'Reason for ' + name}
                onChange={(event) => update(line.id, { reason: event.target.value })}>
                <option value="">Select reason</option>{Object.entries(returnReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select></label>
              <label className="field">Condition<select value={choice.condition} aria-label={'Condition for ' + name}
                onChange={(event) => update(line.id, { condition: event.target.value })}>
                <option value="">Select condition</option>{Object.entries(returnConditions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select></label>
            </div>}
          </div>
        })}</div>
      </section>
      <section className="card panel"><fieldset><legend>Return method</legend>
        <label className="check"><input type="radio" name="method" checked={currentMethod === 'in_store'} onChange={() => setMethod('in_store')} />In store</label>
        {parcel && <label className="check"><input type="radio" name="method" checked={currentMethod === 'parcel'} onChange={() => setMethod('parcel')} />By parcel</label>}
        {!parcel && <p className="muted">{selected.length ? 'At least one selected item is eligible for in-store return only.' : 'Select items to see available methods.'}</p>}
      </fieldset></section>
    </div>
    <PriceSummary entries={[['Merchandise', estimate.merchandiseAmount], ['Return fee', estimate.feeAmount]]}
      totalLabel="Estimated refund" total={estimate.refundAmount}>
      {estimate.error && <p className="muted">Complete the item details to see your estimate.</p>}
      <ErrorText error={error} />
      <button className="button primary full" type="submit">Confirm return</button>
    </PriceSummary>
  </form>
}

export function ReturnDetail() {
  const { state } = useAccount()
  const { returnId } = useParams()
  const entry = byId(state.returns, returnId)
  if (!entry) return <Page title="Return unavailable" back={['/returns', 'Back to returns']}>
    <Empty title="We couldn’t find that return" action={<AccountLink to="/returns">View returns</AccountLink>} />
  </Page>
  const order = byId(state.orders, entry.orderId)
  const items = list(entry.items)
  return <Page title={'Return ' + (entry.reference || entry.id)} description={dateText(entry.createdAt)}
    back={['/returns', 'Back to returns']} action={<Status value={entry.status} />}>
    <div className="split">
      <div className="stack">
        <section className="card panel"><h2>Return details</h2>
          <dl className="facts"><div><dt>Order</dt><dd>{order
            ? <AccountLink to={detailPath('orders', order.id)}>{orderLabel(order)}</AccountLink> : entry.orderId || 'Order unavailable'}</dd></div>
          <div><dt>Method</dt><dd>{returnMethods[entry.method] || 'Method unavailable'}</dd></div></dl>
        </section>
        <section className="card panel"><h2>Items in this return</h2>
          {items.length ? <ul className="detail-items">{items.map((item, index) => <li key={item.orderLineId || index}>
            <span className="record-name"><strong>{byId(order?.lines, item.orderLineId)?.name || item.productId || 'Order item'}</strong>
              <small>{[returnReasons[item.reason], returnConditions[item.condition]].filter(Boolean).join(' · ')}</small></span>
            <span>Qty {item.quantity ?? '—'}</span><strong>{money(item.refundAmount)}</strong>
          </li>)}</ul> : <p className="muted">Item details are unavailable.</p>}
        </section>
        <section className="card panel"><h2>Return activity</h2><ol className="timeline">
          {entry.createdAt && <li><strong>Return requested</strong><small>{dateText(entry.createdAt)}</small></li>}
          {(entry.status !== 'requested' || !entry.createdAt) && <li><strong>{statusLabel(entry.status)}</strong>
            <small>{dateText(entry.updatedAt || entry.createdAt)}</small></li>}
        </ol></section>
      </div>
      <PriceSummary entries={[['Merchandise', entry.merchandiseAmount], ['Return fee', entry.feeAmount]]}
        totalLabel={entry.status === 'refunded' ? 'Refund total' : 'Estimated refund'} total={entry.refundAmount} />
    </div>
  </Page>
}
