import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useConfirm } from '../components/Confirm.jsx'
import { Empty, Missing } from '../components/Empty.jsx'
import { orderPath, SiteLink } from '../components/links.jsx'
import { TitleIdentity } from '../components/TitleIdentity.jsx'
import { BackLink, dateLabel, Filters, Heading, moneyLabel, recentFirst, SelectField, TitleButton } from '../components/ui.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { DAY, orderById, returnBlock, rows, titleById, titleLabel } from '../state/selectors.js'
import { getSessionId } from '../utils/dataManager.js'

const views = [['orders', 'Orders'], ['refunds', 'Refunds']]
const ranges = [['all', 'All dates'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 365 days'], ['custom', 'Custom range']]

function payment(order) {
  if (order?.paymentMethod === 'credit') return 'Audible credit'
  if (order?.paymentMethod === 'cash') return `Cash · ${moneyLabel(order.amountUsd)}`
  return 'Payment method unavailable'
}

function ReturnControl({ order, title, reason }) {
  const confirm = useConfirm()
  if (reason || !order?.id) return <span className="action-reason">{reason || 'This order is unavailable.'}</span>
  const label = titleLabel(title)
  return (
    <TitleButton title={label} className="button secondary"
      onClick={() => confirm(label, { type: 'return', purchaseId: order.id })}>
      Return this title
    </TitleButton>
  )
}

function DateRange({ start, end, setStart, setEnd }) {
  return (
    <>
      <div className="field">
        <label htmlFor="purchase-start">Start date</label>
        <input id="purchase-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="purchase-end">End date</label>
        <input id="purchase-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
      </div>
    </>
  )
}

export function Purchases() {
  const { state } = useAccount()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'refunds' ? 'refunds' : 'orders'
  const [range, setRange] = useState('all')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const now = new Date()
  const refundView = view === 'refunds'
  const orders = rows(state, 'purchases')
  const orderMap = new Map(orders.map((order) => [order.id, order]))
  const titles = new Map(rows(state, 'titles').map((title) => [title.id, title]))
  const items = refundView ? rows(state, 'returns') : orders
  const invalidRange = range === 'custom' && start && end && start > end
  const results = items.filter((entry) => {
    if (range === 'all') return true
    const timestamp = Date.parse(entry.createdAt)
    if (!Number.isFinite(timestamp) || invalidRange) return false
    if (range === 'custom') {
      return (!start || timestamp >= Date.parse(start)) && (!end || timestamp < Date.parse(end) + DAY)
    }
    return timestamp >= now.getTime() - Number(range) * DAY && timestamp <= now.getTime()
  }).sort(recentFirst)

  function changeView(next) {
    if (next === view) return
    const query = new URLSearchParams(params)
    const sid = getSessionId()
    if (sid) query.set('sid', sid)
    if (next === 'refunds') query.set('view', 'refunds')
    else query.delete('view')
    setParams(query)
  }

  return (
    <section>
      <Heading title="Purchase history">Review your orders and credit refunds.</Heading>
      <div className="shelf-controls">
        <Filters label="Purchase history view" options={views} value={view} onChange={changeView} />
        <div className="toolbar">
          <SelectField id="purchase-range" label="Date range" value={range} onChange={setRange} options={ranges} />
          {range === 'custom' && <DateRange start={start} end={end} setStart={setStart} setEnd={setEnd} />}
        </div>
      </div>
      {invalidRange && <p role="alert" className="action-reason">Choose an end date on or after the start date.</p>}
      <h2 className="list-caption" aria-live="polite">{results.length} {refundView
        ? (results.length === 1 ? 'refund' : 'refunds') : (results.length === 1 ? 'order' : 'orders')}</h2>
      {results.length ? (
        <ul className="shelf-list">
          {results.map((entry, index) => {
            const order = refundView ? orderMap.get(entry.purchaseId) : entry
            const title = titles.get(order?.titleId || entry.items?.[0]?.titleId)
            const returned = refundView || order?.status === 'returned'
            const status = refundView ? 'Refunded' : returned ? 'Returned' : order?.status === 'completed' ? 'Completed' : 'Unavailable'
            return (
              <li className="shelf-row order-row" key={entry.id ?? index}>
                <TitleIdentity title={title} eager={index < 5}>
                  <div className="metadata">
                    {entry.createdAt && <span>{dateLabel(entry.createdAt)}</span>}
                    <span>{refundView ? `${entry.amountCredits ?? 0} credit refunded` : payment(order)}</span>
                  </div>
                </TitleIdentity>
                <div><span className={`pill ${returned ? 'positive' : ''}`}>{status}</span></div>
                <div className="row-actions">
                  {order?.id && <SiteLink className="button quiet" to={orderPath(order.id)}
                    aria-label={`Order details — ${titleLabel(title)}`}>Order details</SiteLink>}
                  {!refundView && <ReturnControl order={order} title={title} reason={returnBlock(state, order, now)} />}
                </div>
              </li>
            )
          })}
        </ul>
      ) : items.length ? (
        <Empty title={refundView ? 'No refunds in this date range' : 'No orders in this date range'}
          action={<button className="button secondary" onClick={() => setRange('all')}>Show all dates</button>} />
      ) : (
        <Empty title={refundView ? 'No refunds yet' : 'No orders yet'} action={refundView
          ? <button className="button secondary" onClick={() => changeView('orders')}>View orders</button>
          : <SiteLink className="button" to="/browse">Browse audiobooks</SiteLink>} />
      )}
    </section>
  )
}

function ReceiptFacts({ fields }) {
  return (
    <dl className="receipt-facts">
      {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  )
}

export function OrderDetails() {
  const { state } = useAccount()
  const { purchaseId } = useParams()
  const order = orderById(state, purchaseId)
  if (!order) return <Missing title="Order not found" to="/account/purchases" label="Back to Purchase history" />

  const title = titleById(state, order.titleId)
  const refund = rows(state, 'returns').find((entry) => entry.purchaseId === order.id)
  const returned = order.status === 'returned' || Boolean(refund)
  const reason = returnBlock(state, order, new Date())
  const quantity = Number.isFinite(order.quantity) ? order.quantity : '—'
  const total = order.paymentMethod === 'credit'
    ? (Number.isFinite(order.amountCredits) ? `${order.amountCredits} credit` : '—')
    : moneyLabel(order.amountUsd)

  return (
    <section>
      <BackLink to="/account/purchases">Back to Purchase history</BackLink>
      <Heading title="Order details">{order.id}</Heading>
      <article className="receipt">
        <div className="receipt-head">
          <TitleIdentity title={title} eager />
          <span className={`pill ${returned ? 'positive' : ''}`}>
            {returned ? 'Returned' : order.status === 'completed' ? 'Completed' : 'Unavailable'}
          </span>
        </div>
        <ReceiptFacts fields={[
          ['Purchase date', dateLabel(order.createdAt)], ['Payment method', payment(order)],
          ['Quantity', quantity], ['Order total', total],
        ]} />
        <div className="receipt-actions"><ReturnControl order={order} title={title} reason={reason} /></div>
      </article>
      {refund && <section className="account-section">
        <h2>Credit refund</h2>
        <article className="receipt">
          <ReceiptFacts fields={[
            ['Refund reference', refund.id || '—'], ['Refund date', dateLabel(refund.createdAt)],
            ['Credit refund', `${refund.amountCredits ?? 0} credit`], ['Cash refund', moneyLabel(refund.amountUsd)],
          ]} />
          <div className="receipt-actions"><SiteLink to="/account/credits">View credit summary</SiteLink></div>
        </article>
      </section>}
    </section>
  )
}
