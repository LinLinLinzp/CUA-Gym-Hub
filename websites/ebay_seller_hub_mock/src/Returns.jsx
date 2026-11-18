import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { append, byNumber, byText, date, event, find, match, money, recordPath, replace, returnStatuses, rows, timestamp } from './model.js'
import { issuedFor, makeRefund, readMoney, totalIssued } from './refunds.js'
import { useStore } from './store.jsx'
import { Back, Dialog, ErrorMessage, Field, History, LinkTo, Missing, PageTitle, Queue, Status, useBrowse } from './ui.jsx'

const sorts = [['newest', 'Newest requests'], ['oldest', 'Oldest requests'], ['amount', 'Highest amount']]

function related(caseItem, orders) {
  const order = orders.get(caseItem.orderId)
  const orderLines = new Map(rows(order?.lines).map(line => [line.id, line]))
  return {
    order,
    lines: rows(caseItem.lines).map(line => ({ ...line, original: orderLines.get(line.orderLineId) })),
  }
}

export function Returns() {
  const { state } = useStore()
  const browse = useBrowse('newest')
  const returns = rows(state.returns)
  const orderIndex = new Map(rows(state.orders).map(order => [order.id, order]))
  const filtered = returns.filter(item => {
    if (browse.status && item.status !== browse.status) return false
    const { order, lines } = related(item, orderIndex)
    return match(browse.query, item.id, item.orderId, order?.orderNumber, order?.buyer?.name, order?.buyer?.username,
      ...lines.flatMap(line => [line.original?.title, line.title, line.listingId]))
  }).sort((a, b) => {
    if (browse.sort === 'oldest') return byText(a.createdAt, b.createdAt)
    if (browse.sort === 'amount') return byNumber(b.requestedAmount, a.requestedAmount)
    return byText(b.createdAt, a.createdAt)
  })
  return <>
    <PageTitle title="Returns">Review buyer requests, receive items, and resolve refunds.</PageTitle>
    <Queue label="Returns" browse={browse} records={returns} filtered={filtered} statuses={returnStatuses}
      searchLabel="Search return, order, buyer, or item" sorts={sorts}
      columns={[{ label: 'Return' }, { label: 'Order / Buyer' }, { label: 'Reason' }, { label: 'Requested' }, { label: 'Amount', numeric: true }, { label: 'Status' }]}
      renderRow={(item, index) => {
        const { order, lines } = related(item, orderIndex)
        const first = lines[0]
        return <tr key={item.id || index}>
          <td>{item.id ? <LinkTo to={recordPath('returns', item.id)}>{item.id}</LinkTo> : 'Return'}<small>{first?.original?.title || first?.title || first?.listingId}</small></td>
          <td>{order?.orderNumber || item.orderId || '—'}<small>{order?.buyer?.name}</small></td>
          <td>{item.reason || '—'}</td><td>{date(item.createdAt)}</td><td className="numeric">{money(item.requestedAmount)}</td>
          <td><Status value={item.status === 'refunded' ? 'closed' : item.status} /></td>
        </tr>
      }} />
  </>
}

function refundPlan(state, item) {
  const order = find(state.orders, item.orderId)
  if (!order || order.paymentStatus !== 'paid') throw new Error('A linked paid order is required to issue a refund or send an offer.')
  const prior = issuedFor(state, order.id)
  if (prior.some(refund => refund.returnId === item.id) || item.refundId) throw new Error('A refund has already been issued for this return.')
  const paid = readMoney(order.total)
  const priorTotal = totalIssued(prior)
  const shipping = readMoney(item.shippingAmount ?? 0)
  const tax = readMoney(item.taxAmount ?? 0)
  const lines = rows(item.lines).map(line => {
    const original = find(order.lines, line.orderLineId)
    const listingId = original?.listingId
    const quantity = line.quantity
    if (!original || !listingId || (line.listingId && line.listingId !== listingId) ||
      !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(original.quantity) || original.quantity <= 0) {
      throw new Error('The requested items must match valid lines on the order.')
    }
    const refunded = prior.flatMap(refund => rows(refund.lines)).filter(refundLine => refundLine.orderLineId === original.id)
    // An issued adjustment can consume line value without representing a separate returned unit.
    const refundedQty = refunded.reduce((sum, refundLine) => sum + (refundLine.quantity || 0), 0)
    const amount = readMoney(line.amount)
    const originalAmount = readMoney(original.lineTotal)
    const unitCap = Math.ceil(originalAmount * quantity / original.quantity)
    if (quantity + refundedQty > original.quantity || amount > unitCap ||
      amount + refunded.reduce((sum, refundLine) => sum + readMoney(refundLine.amount), 0) > originalAmount) {
      throw new Error('The request exceeds the remaining refundable quantity or line amount.')
    }
    return { orderLineId: original.id, listingId, quantity, amount }
  })
  const requested = readMoney(item.requestedAmount)
  const total = lines.reduce((sum, line) => sum + line.amount, shipping + tax)
  if (!lines.length || new Set(lines.map(line => line.orderLineId)).size !== lines.length || !total || requested !== total) {
    throw new Error('The requested amount must match the return lines, shipping, and tax.')
  }
  if (!Number.isFinite(priorTotal) || total + priorTotal > paid ||
      shipping + prior.reduce((sum, refund) => sum + readMoney(refund.shippingAmount ?? 0), 0) > readMoney(order.shipping ?? 0) ||
      tax + prior.reduce((sum, refund) => sum + readMoney(refund.taxAmount ?? 0), 0) > readMoney(order.tax ?? 0)) {
    throw new Error('The request exceeds the remaining paid amount, shipping, or tax.')
  }
  return { order, lines, shipping, tax, total, paid, priorTotal }
}

const modes = {
  accept: { title: 'Accept return', type: 'return_accepted', status: 'accepted', done: 'Return accepted.' },
  receive: { title: 'Mark received', type: 'return_received', status: 'received', done: 'Return marked received.' },
  refund: { title: 'Issue full refund', type: 'return_refunded', status: 'refunded', done: 'Full refund issued.' },
  offer: { title: 'Offer partial refund', type: 'return_partial_offered', status: 'offer_sent', done: 'Partial refund offer sent.' },
}

function updateReturn(state, id, mode, form) {
  const item = find(state.returns, id)
  const eligible = { accept: ['requested'], receive: ['accepted'], refund: ['requested', 'received'], offer: ['requested'] }[mode]
  if (!item || !eligible.includes(item.status)) throw new Error('This return is no longer eligible for that action.')
  const { status, type } = modes[mode]
  const now = timestamp()
  const updated = { ...item, status, updatedAt: now }
  const details = { previousStatus: item.status, status, orderId: item.orderId }
  let refund
  let orderPatch = {}
  if (mode === 'accept') {
    const payer = form.get('payer')
    if (payer !== 'seller' && payer !== 'buyer') throw new Error('Select who pays for return shipping.')
    const authorization = String(form.get('authorization') || '').trim()
    Object.assign(updated, { acceptedAt: now, returnShippingPayer: payer, ...(authorization && { authorizationNumber: authorization }) })
  } else if (mode === 'receive') {
    updated.receivedAt = now
  } else {
    const plan = refundPlan(state, item)
    const isPartial = mode === 'offer'
    let { lines, shipping, tax, total } = plan
    if (isPartial) {
      if (item.partialOfferId || rows(state.refunds).some(record => record.returnId === id && record.kind === 'return_partial')) {
        throw new Error('A partial refund has already been offered.')
      }
      total = readMoney(String(form.get('amount') || '').trim())
      if (total <= 0 || total >= plan.total) throw new Error('Enter an amount greater than zero and below the full refund.')
      let remaining = total
      lines = lines.map(line => {
        const amount = Math.min(remaining, line.amount)
        remaining -= amount
        return { ...line, amount }
      }).filter(line => line.amount > 0)
      shipping = Math.min(remaining, shipping)
      tax = remaining - shipping
    }
    const note = String(form.get('note') || '').trim()
    refund = makeRefund(state, { orderId: item.orderId, returnId: id, kind: isPartial ? 'return_partial' : 'return_full',
      status: isPartial ? 'offered' : 'issued', lines, shipping, tax, now, note })
    Object.assign(updated, isPartial ? { partialOfferId: refund.id, offeredAt: now } : { refundId: refund.id, resolvedAt: now })
    Object.assign(details, { refundId: refund.id, amount: refund.totalAmount })
    if (!isPartial && plan.priorTotal + total === plan.paid) {
      orderPatch = { orders: replace(state.orders, { ...plan.order, paymentStatus: 'refunded', updatedAt: now }) }
    }
  }
  return { ...state, ...orderPatch, returns: replace(state.returns, updated),
    activity: append(state, 'activity', event(state, type, 'return', id, now, details)),
    ...(refund && { refunds: append(state, 'refunds', refund) }),
  }
}

export function ReturnDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [mode, setMode] = useState(null)
  const item = find(state.returns, id)
  if (!item) return <Missing name="Return" to="/returns" label="Back to Returns" />
  const order = find(state.orders, item.orderId)
  const { lines } = related(item, new Map([[item.orderId, order]]))
  const refund = find(state.refunds, item.refundId || item.partialOfferId)
  const canRefund = ['requested', 'received'].includes(item.status)
  const canOffer = item.status === 'requested' && !item.partialOfferId && !rows(state.refunds).some(record => record.returnId === id && record.kind === 'return_partial')
  let unavailable
  if (canRefund) {
    try { refundPlan(state, item) } catch (error) { unavailable = error.message }
  }
  const close = () => setMode(null)
  return <>
    <Back to="/returns">Back to Returns</Back>
    <PageTitle title={'Return ' + id} action={<Status value={item.status} />}>{[order?.buyer?.name, date(item.createdAt)].filter(Boolean).join(' · ')}</PageTitle>
    <div className="detail-grid">
      <div className="stack">
        <section className="panel padded"><h2>Return request</h2>
          <dl className="facts"><div><dt>Reason</dt><dd>{item.reason || '—'}</dd></div>
            {item.buyerNote && <div><dt>Buyer note</dt><dd>{item.buyerNote}</dd></div>}
            {item.returnShippingPayer && <div><dt>Return shipping</dt><dd>{item.returnShippingPayer === 'seller' ? 'Seller pays' : 'Buyer pays'}</dd></div>}
            {item.authorizationNumber && <div><dt>Authorization number</dt><dd>{item.authorizationNumber}</dd></div>}</dl>
          {lines.length ? <div className="table-scroll compact" role="region" aria-label="Returned items" tabIndex={0}><table><thead><tr><th>Item</th><th className="numeric">Quantity</th><th className="numeric">Amount</th></tr></thead><tbody>
            {lines.map((line, index) => {
              const listingId = line.listingId || line.original?.listingId
              const title = line.original?.title || line.title || listingId || line.orderLineId || 'Item'
              return <tr key={line.orderLineId || index}><td>{find(state.listings, listingId) ? <LinkTo to={recordPath('listings', listingId)}>{title}</LinkTo> : title}</td>
                <td className="numeric">{line.quantity ?? '—'}</td><td className="numeric">{money(line.amount)}</td></tr>
            })}
          </tbody></table></div> : <p className="muted">No return lines are available.</p>}
          <dl className="totals"><div><dt>Requested amount</dt><dd>{money(item.requestedAmount)}</dd></div></dl>
        </section>
        <section className="panel padded"><h2>Resolution</h2>
          {refund && <dl className="facts"><div><dt>{refund.status === 'issued' ? 'Refund issued' : 'Partial refund offered'}</dt><dd>{money(refund.totalAmount)}</dd></div></dl>}
          <ErrorMessage>{unavailable}</ErrorMessage>
          <div className="inline-actions">
            {item.status === 'requested' && <button className="button primary" onClick={() => setMode('accept')}>Accept return</button>}
            {item.status === 'accepted' && <button className="button primary" onClick={() => setMode('receive')}>Mark received</button>}
            {canRefund && <button className="button" disabled={!!unavailable} onClick={() => setMode('refund')}>Issue full refund</button>}
            {canOffer && <button className="button" disabled={!!unavailable} onClick={() => setMode('offer')}>Offer partial refund</button>}
          </div>
        </section>
      </div>
      <aside className="stack">
        <section className="panel padded"><h2>Related order</h2>
          {order ? <LinkTo to={recordPath('orders', order.id)}>{order.orderNumber || order.id}</LinkTo> : <p className="muted">{item.orderId || 'No linked order'}</p>}
          {order && <dl className="facts"><div><dt>Payment</dt><dd><Status value={order.paymentStatus} /></dd></div></dl>}
        </section>
        <History kind="return" id={id} />
      </aside>
    </div>
    {mode && <Dialog title={modes[mode].title} confirm={mode === 'offer' ? 'Send offer' : modes[mode].title} danger={mode === 'refund'} onClose={close}
      onConfirm={form => commit(current => updateReturn(current, id, mode, form), modes[mode].done)}>
      {mode === 'accept' && <>
        <Field label="Who pays for return shipping?"><select name="payer" defaultValue="seller"><option value="seller">Seller pays</option><option value="buyer">Buyer pays</option></select></Field>
        <Field label="Authorization number (optional)"><input name="authorization" maxLength={60} /></Field>
      </>}
      {mode === 'receive' && <p>Confirm that the returned items have arrived.</p>}
      {mode === 'refund' && <p>Confirm a refund of <strong>{money(item.requestedAmount)}</strong> for this return.</p>}
      {mode === 'offer' && <>
        <p>Review the offer before sending. The full requested amount is <strong>{money(item.requestedAmount)}</strong>.</p>
        <Field label="Offer amount (USD)"><input type="number" name="amount" min="0.01" step="0.01" required /></Field>
        <Field label="Note to buyer (optional)"><textarea name="note" rows="3" /></Field>
      </>}
    </Dialog>}
  </>
}
