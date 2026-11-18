import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { byRecent, contains, date, find, label, money, nameOf, paymentMethod, ref, rows } from '../model.js'
import { issueRefund, refundContext, refundQuote } from '../refundModel.js'
import { useStore } from '../store.jsx'
import { Dialog, Facts, Field, Header, ListCard, Notice, Recovery, RouteLink, Search, Status, Table, useFilters, useRoute } from '../ui.jsx'
import { orderPath } from './Orders.jsx'

const paymentPath = (id) => '/refunds?payment=' + encodeURIComponent(id)
const refundPath = (id) => '/refunds/' + encodeURIComponent(id)
const historyPath = '/refunds?tab=history'

export function Refunds() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const paymentId = params.get('payment')
  if (paymentId) {
    const payment = find(state.payments, paymentId)
    if (!payment) return <Recovery title="Payment unavailable" message="This payment could not be found." to="/refunds" action="Back to transactions" />
    return <PaymentDetail key={paymentId} payment={payment} />
  }
  const history = params.get('tab') === 'history'
  return <>
    <Header title="Refunds" subtitle="Find a transaction, issue a refund or review its history." />
    <nav aria-label="Refunds workspace" className="tabs">
      <RouteLink to="/refunds" aria-current={!history ? 'page' : undefined}>Transactions</RouteLink>
      <RouteLink to={historyPath} aria-current={history ? 'page' : undefined}>Refund history</RouteLink>
    </nav>
    {history ? <HistoryTable entries={rows(state.refunds).sort(byRecent)} /> : <Transactions />}
  </>
}

function Transactions() {
  const { state } = useStore()
  const [filters, change, reset] = useFilters()
  const query = filters.query || ''
  const orders = new Map(rows(state.orders).map((order) => [order.id, order]))
  const entries = rows(state.payments).filter((payment) => {
    const order = orders.get(payment.orderId)
    return contains(query, payment.receiptNumber, payment.id, payment.orderId, payment.cardLast4, order?.orderNumber, order?.customerName)
  }).sort(byRecent)
  return <>
    <div className="filters"><Search title="Search transactions" placeholder="Receipt, order, customer or last four" value={query} change={(value) => change('query', value)} /></div>
    <ListCard count={entries.length} noun="transaction">
      <Table label="Transactions" headings={['Receipt', 'Order', 'Customer', 'Payment method', '$Paid amount', '$Refundable', 'Date', 'Status']} entries={entries} reset={query ? reset : null} empty="No transactions found." render={(payment, index) => {
        const order = orders.get(payment.orderId)
        const context = refundContext(state, payment)
        return <tr key={payment.id ?? index}>
          <td>{payment.id ? <RouteLink to={paymentPath(payment.id)}>{ref(payment, 'receiptNumber')}</RouteLink> : ref(payment, 'receiptNumber')}</td>
          <td>{order ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : payment.orderId || '—'}</td><td>{order?.customerName || '—'}</td><td>{paymentMethod(payment)}</td>
          <td className="number">{money(payment.amount, payment.currency)}</td><td className="number">{payment.status === 'paid' ? money(context.remaining / 100, payment.currency) : '—'}</td>
          <td>{date(payment.createdAt)}</td><td><Status value={payment.refundStatus === 'full' ? 'full' : payment.status} text={payment.refundStatus === 'full' ? 'Fully refunded' : undefined} /></td>
        </tr>
      }} />
    </ListCard>
  </>
}

function HistoryTable({ entries, nested = false }) {
  const { state } = useStore()
  const orders = new Map(rows(state.orders).map((order) => [order.id, order]))
  const table = <Table label="Refund history" headings={['Refund', 'Order', 'Mode', '$Amount', 'Date', 'Status']} entries={entries} empty="No refunds recorded." render={(refund, index) => {
    const order = orders.get(refund.orderId)
    return <tr key={refund.id ?? index}>
      <td>{refund.id ? <RouteLink to={refundPath(refund.id)}>{refund.id}</RouteLink> : '—'}</td>
      <td>{order ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : refund.orderId || '—'}</td>
      <td>{label(refund.mode)}</td><td className="number">{money(refund.amount, refund.currency)}</td><td>{date(refund.createdAt)}</td><td><Status value={refund.status} /></td>
    </tr>
  }} />
  return nested ? table : <ListCard count={entries.length} noun="refund">{table}</ListCard>
}

function PaymentDetail({ payment }) {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const { order, history, remaining, refunded, eligible, lines } = refundContext(state, payment)
  const linesById = new Map(lines.map((entry) => [entry.line.id, entry]))
  return <>
    <Header title={'Transaction ' + ref(payment, 'receiptNumber')} subtitle={date(payment.createdAt, true)} back={['/refunds', 'Transactions']} action={<Status value={payment.status} />} />
    <div className="grid">
      <div className="stack">
        <section className="card">
          <h2>Purchased items</h2>
          <Table label="Purchased items" headings={['Item', '$Sold', '$Remaining', '$Total']} entries={rows(order?.lineItems)} empty="No linked order lines available." render={(line, index) => <tr key={line.id ?? index}>
            <td>{line.name || 'Order item'}{line.variationName && <div className="muted small">{line.variationName}</div>}</td><td className="number">{line.quantity ?? '—'}</td>
            <td className="number">{linesById.get(line.id)?.available ?? '—'}</td><td className="number">{money(line.totalAmount, payment.currency)}</td>
          </tr>} />
        </section>
        <section className="card"><h2>Prior refunds</h2><HistoryTable entries={history.sort(byRecent)} nested /></section>
      </div>
      <section className="card">
        <h2>Payment summary</h2>
        <Facts entries={[
          ['Order', order ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : payment.orderId],
          ['Customer', order?.customerName], ['Paid amount', money(payment.amount, payment.currency)], ['Refunded', money(refunded / 100, payment.currency)],
          ['Refundable amount', money((payment.status === 'paid' ? remaining : 0) / 100, payment.currency)], ['Payment method', paymentMethod(payment)],
        ]} />
        <div className="side-actions"><button className="button primary" disabled={!eligible} onClick={() => setOpen(true)}>Issue refund</button></div>
        {!eligible && <p className="muted small">{payment.status === 'paid' ? 'This payment has no refundable balance.' : 'Refunds require a paid transaction.'}</p>}
      </section>
    </div>
    {open && <RefundDialog payment={payment} close={() => setOpen(false)} />}
  </>
}

function RefundDialog({ payment, close }) {
  const { state, commit } = useStore()
  const route = useRoute()
  const [draft, setDraft] = useState({ mode: 'full', reason: '', amount: '', quantities: {} })
  const [reviewed, review] = useState(null)
  const [error, setError] = useState('')
  const context = refundContext(state, payment)
  const lines = context.lines.filter((entry) => entry.available > 0)
  const update = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setError('') }
  async function submit(event) {
    event.preventDefault()
    const result = reviewed ? await commit((latest) => issueRefund(latest, payment.id, draft, reviewed)) : refundQuote(state, payment.id, draft)
    if (result.error) return setError(result.error)
    setError('')
    if (result.id) return route(refundPath(result.id))
    review(result.quote)
  }
  return <Dialog title={reviewed ? 'Review refund' : 'Issue refund'} close={close}>
    <form onSubmit={submit} noValidate>
      {reviewed ? <>
        <Facts entries={[['Receipt', ref(payment, 'receiptNumber')], ['Refund destination', paymentMethod(reviewed)], ['Mode', label(reviewed.mode)], ['Reason', reviewed.reason], ['Refund total', money(reviewed.amount / 100, reviewed.currency)]]} />
        {reviewed.lineItems.length > 0 && <ul className="review-lines">{reviewed.lineItems.map((line) => <li key={line.orderLineId}>{line.name} × {line.quantity} <strong>{money(line.amount, reviewed.currency)}</strong></li>)}</ul>}
      </> : <div className="stack">
        <p className="muted">Remaining refundable amount <strong>{money(context.remaining / 100, payment.currency)}</strong></p>
        <fieldset className="radio-box"><legend>Refund method</legend>
          {[['full', 'Full remaining amount'], ['custom', 'Custom amount'], ['itemized', 'Itemized refund']].map(([value, title]) => <label key={value}><input type="radio" name="mode" checked={draft.mode === value} disabled={value === 'itemized' && !lines.length} onChange={() => update('mode', value)} />{title}</label>)}
          {!lines.length && <p className="muted small">Itemization requires eligible order lines linked to this payment.</p>}
        </fieldset>
        {draft.mode === 'custom' && <Field label="Refund amount"><input inputMode="decimal" value={draft.amount} onChange={(event) => update('amount', event.target.value)} /></Field>}
        {draft.mode === 'itemized' && <div className="stack quantity-fields">{lines.map(({ line, available }) => <Field key={line.id} label={(line.name || 'Order item') + ' quantity'}>
          <input type="number" min="0" max={available} step="1" value={draft.quantities[line.id] ?? ''} onChange={(event) => update('quantities', { ...draft.quantities, [line.id]: event.target.value })} />
          <small className="muted">{available} available{line.variationName ? ' · ' + line.variationName : ''}</small>
        </Field>)}</div>}
        <Field label="Reason"><textarea value={draft.reason} onChange={(event) => update('reason', event.target.value)} placeholder="For example, customer return" /></Field>
      </div>}
      {error && <p className="dialog-error error" role="alert">{error}</p>}
      <div className="actions">
        {reviewed ? <button type="button" className="button secondary" onClick={() => { review(null); setError('') }}>Back to edit</button> : <button type="button" className="button secondary" onClick={close}>Cancel</button>}
        <button className="button primary" type="submit">{reviewed ? 'Confirm refund' : 'Review refund'}</button>
      </div>
    </form>
  </Dialog>
}

export function RefundRoute() {
  const { refundId } = useParams()
  const { state } = useStore()
  const refund = find(state.refunds, refundId)
  if (!refund) return <Recovery title="Refund unavailable" message="This refund could not be found." to={historyPath} action="Back to refund history" />
  const order = find(state.orders, refund.orderId)
  const payment = find(state.payments, refund.paymentId)
  return <>
    <Header title={'Refund ' + refund.id} subtitle={date(refund.createdAt, true)} back={[historyPath, 'Refund history']} action={<Status value={refund.status} />} />
    <Notice id={refund.id} />
    <div className="grid">
      <section className="card">
        <h2>Refund details</h2>
        <Facts entries={[['Refund total', money(refund.amount, refund.currency)], ['Mode', label(refund.mode)], ['Reason', refund.reason], ['Processed by', refund.actorId === state.account?.actorId ? state.account.actorName || refund.actorId : refund.actorId]]} />
        <h3 className="subheading">Refunded items</h3>
        <Table label="Refunded items" headings={['Item', '$Quantity', '$Refunded']} entries={rows(refund.lineItems)} empty="No item quantities recorded for this refund." render={(line, index) => <tr key={line.orderLineId ?? index}>
          <td>{line.name || 'Order item'}</td><td className="number">{line.quantity ?? '—'}</td><td className="number">{money(line.amount, refund.currency)}</td>
        </tr>} />
      </section>
      <section className="card"><h2>Related records</h2>
        <Facts entries={[
          ['Order', order ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : refund.orderId],
          ['Payment', payment ? <RouteLink to={paymentPath(payment.id)}>{ref(payment, 'receiptNumber')}</RouteLink> : refund.paymentId],
          ['Destination', payment ? paymentMethod(payment) : 'Unavailable'],
          ['Location', nameOf(state.locations, refund.locationId)],
        ]} />
      </section>
    </div>
  </>
}

