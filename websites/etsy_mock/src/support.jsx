import React, { useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, MessageCircle, Shield } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LocalLink, pathFor, useAction, useLocalNavigate, useStore } from './store.jsx'
import { byId, caseEligibility, chronological, date, human, list, money, newest, openCase, owned, PREFERENCES, REASONS, requestHelp, RESOLUTIONS, returnPolicy, updateCase } from './model.js'
import { Art, ButtonLink, Choose, Empty, ErrorNote, Field, Heading, LineItems, Missing, Status, TextLink, Totals, artist, matches } from './ui.jsx'
import { ConversationLink } from './messages.jsx'

const orderLabel = (order) => order.orderNumber || order.id || 'Order'
const helpPath = (id) => pathFor('purchases', id) + '/help'

export function Purchases() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const all = newest(owned(state.orders, state.buyer))
  const statuses = Object.fromEntries([...new Set(all.map((row) => row.status).filter(Boolean))].sort().map((key) => [key, human(key)]))
  const orders = all.filter((row) => (!status || row.status === status) &&
    matches(query, row.orderNumber, row.id, row.shopName || artist(state, row.shopId), ...list(row.items).map((item) => item.title)))
  return <>
    <Heading title="Purchases">Receipts, delivery details, and help with your orders.</Heading>
    <div className="panel filter-bar purchase-filters">
      <Field label="Search purchases"><input type="search" placeholder="Order number, item, or shop" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
      <Field label="Status"><Choose value={status} options={statuses} placeholder="All statuses" onChange={(event) => setStatus(event.target.value)} /></Field>
    </div>
    {orders.length ? <div className="stack">{orders.map((order) => <article className="panel order-card" key={order.id}>
      <div className="order-header"><div><small>{date(order.createdAt)} · {orderLabel(order)}</small><h2>{order.shopName || artist(state, order.shopId)}</h2></div>
        <div><Status value={order.status} /> <strong>{money(order.total, order.currency)}</strong></div></div>
      <LineItems compact items={order.items} currency={order.currency} />
      <div className="actions order-actions"><TextLink to={pathFor('purchases', order.id)}>View receipt</TextLink><ButtonLink secondary to={helpPath(order.id)}>Help with order</ButtonLink></div>
    </article>)}</div> : <Empty title={all.length ? 'No matching purchases' : 'No purchases yet'} />}
  </>
}

export function Purchase() {
  const { orderId } = useParams()
  const { state } = useStore()
  const order = byId(owned(state.orders, state.buyer), orderId)
  if (!order) return <Missing title="Order unavailable" to="/purchases" label="Back to purchases" />
  const address = order.shippingAddress
  const payment = order.paymentMethod
  const cases = owned(state.cases, state.buyer).filter((row) => row.orderId === orderId)
  return <>
    <LocalLink className="back-link" to="/purchases"><ArrowLeft size={17} /> Back to purchases</LocalLink>
    <Heading title={'Order ' + orderLabel(order)} action={<ButtonLink to={helpPath(orderId)}>Help with order</ButtonLink>}>{order.shopName || artist(state, order.shopId)} · {date(order.createdAt)}</Heading>
    <div className="split checkout-grid"><div className="stack">
      <section className="panel stack"><div className="order-header"><h2>Order details</h2><Status value={order.status} /></div>
        <LineItems items={order.items} currency={order.currency} />
        {order.estimatedDeliveryEndAt && <p>Estimated delivery {order.estimatedDeliveryStartAt ? date(order.estimatedDeliveryStartAt) + ' – ' : 'by '}{date(order.estimatedDeliveryEndAt)}</p>}
        {order.deliveredAt && <p>Delivered {date(order.deliveredAt)}</p>}
      </section>
      <section className="panel receipt-address"><div><h2>Shipped to</h2>{address ? <p>{address.name}<br />{[address.line1, address.line2].filter(Boolean).join(', ')}<br />{[address.city, address.region, address.postalCode, address.country].filter(Boolean).join(', ')}</p> : <p>Address unavailable</p>}</div>
        <div><h2>Payment</h2><p>{payment ? (payment.brand || 'Card') + ' ending in ' + (payment.last4 || '••••') : 'Payment details unavailable'}</p></div></section>
      {cases.length > 0 && <section className="panel stack"><h2>Cases for this order</h2>
        {cases.map((entry) => <TextLink key={entry.id} to={pathFor('cases', entry.id)}>{human(entry.status)} case · {REASONS[entry.reason] || human(entry.reason)}</TextLink>)}
      </section>}
    </div><aside className="panel summary"><h2>Receipt total</h2><Totals {...order} /></aside></div>
  </>
}

function AffectedItems({ items, quantities, setQuantities }) {
  return <fieldset className="affected"><legend>Affected items</legend>
    {!list(items).length && <p>No item details are available for this order.</p>}
    {list(items).map((item) => {
      const limit = Math.max(0, Math.floor(Number(item.quantity) || 0))
      const change = (event) => setQuantities({ ...quantities, [item.id]: Number(event.target.value) })
      return <Field key={item.id} label={item.title || 'Order item'} hint={limit > 100 ? 'Enter 0 to leave this item unselected.' : undefined}>
        {limit > 100 ? <input type="number" min="0" max={limit} value={quantities[item.id] ?? 0} onChange={change} />
          : <Choose placeholder="" value={quantities[item.id] ?? 0}
            options={Object.fromEntries([[0, 'Not selected'], ...Array.from({ length: limit }, (_, i) => [i + 1, 'Quantity ' + (i + 1)])])}
            onChange={change} />}
      </Field>
    })}
  </fieldset>
}

function SupportForm({ order, escalation }) {
  const { commit, notify } = useStore()
  const navigate = useLocalNavigate()
  const { run, error } = useAction()
  const [reason, setReason] = useState('')
  const [resolution, setResolution] = useState('')
  const [quantities, setQuantities] = useState({})
  const [body, setBody] = useState('')
  return <form className="panel stack support-form" noValidate onSubmit={(event) => {
    event.preventDefault()
    run(() => {
      const base = { orderId: order.id, reason, quantities }
      if (escalation) {
        const result = commit((state, at) => openCase(state, { ...base, refundPreference: resolution, details: body }, at))
        notify('Case opened.')
        navigate(pathFor('cases', result.caseId), { replace: true })
      } else {
        const result = commit((state, at) => requestHelp(state, { ...base, desiredResolution: resolution, body }, at))
        notify('Help request sent to the shop.')
        setBody('')
        setQuantities({})
        setReason('')
        setResolution('')
        navigate(helpPath(order.id) + '?request=' + encodeURIComponent(result.helpId), { replace: true })
      }
    })
  }}>
    <h2>{escalation ? 'Case details' : 'Send a help request'}</h2>
    <Field label={escalation ? 'Case reason' : 'Issue reason'}>
      <Choose value={reason} onChange={(event) => setReason(event.target.value)} required options={escalation ? REASONS : { ...REASONS, other: 'Other order issue' }} />
    </Field>
    <Field label={escalation ? 'Refund preference' : 'Desired resolution'}>
      <Choose value={resolution} onChange={(event) => setResolution(event.target.value)} required options={escalation ? PREFERENCES : RESOLUTIONS} />
    </Field>
    <AffectedItems items={order.items} quantities={quantities} setQuantities={setQuantities} />
    <Field label={escalation ? 'Supporting details' : 'Message to shop'}><textarea value={body} maxLength="4000" rows="5" required onChange={(event) => setBody(event.target.value)} /></Field>
    <ErrorNote>{error}</ErrorNote>
    <div><button className="button" disabled={!list(order.items).length}>{escalation ? 'Submit to Etsy' : 'Send help request'}</button></div>
  </form>
}

export function Help() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const { state } = useStore()
  const order = byId(owned(state.orders, state.buyer), orderId)
  if (!order) return <Missing title="Order unavailable" to="/purchases" label="Back to purchases" />
  const escalation = params.get('mode') === 'case'
  const eligibility = caseEligibility(state, order)
  const request = byId(owned(state.helpRequests, state.buyer), params.get('request'))
  const mostRecent = newest(owned(state.helpRequests, state.buyer).filter((row) => row.orderId === orderId))[0]
  const sent = request?.orderId === orderId ? request : mostRecent
  const ret = sent && list(state.returnRequests).find((row) => row.helpRequestId === sent.id)
  return <>
    <LocalLink className="back-link" to={escalation ? helpPath(order.id) : pathFor('purchases', order.id)}><ArrowLeft size={17} /> {escalation ? 'Back to order help' : 'Back to receipt'}</LocalLink>
    <Heading title={escalation ? 'Open a case' : 'Help with order'}>{orderLabel(order)} · {order.shopName || artist(state, order.shopId)}</Heading>
    <div className="stack readable">
      {sent && !escalation && <section className="panel stack"><h2>Help request sent</h2><p>{sent.body}</p>
        {ret && <p>{human(ret.resolution)} requested · {money(ret.requestedAmount, ret.currency)} · <Status value={ret.status} /></p>}
        {sent.threadId && <ConversationLink className="text-link" id={sent.threadId}>View conversation <ArrowRight size={16} aria-hidden="true" /></ConversationLink>}</section>}
      <section className="panel stack"><h2><Shield size={20} /> Case eligibility</h2>
        {eligibility.active ? <TextLink to={pathFor('cases', eligibility.active.id)}>View open case</TextLink>
          : eligibility.help ? <p>This order is eligible for a case.</p> : <p>{eligibility.note}</p>}
        {!escalation && eligibility.help && <div><ButtonLink secondary to={helpPath(order.id) + '?mode=case'}>Open a case</ButtonLink></div>}
      </section>
      {(!escalation || eligibility.help) && <SupportForm key={orderId + ':' + escalation} order={order} escalation={escalation} />}
      {!escalation && <section className="panel stack"><h2>Shop return policy</h2>
        {list(order.items).map((item) => <div key={item.id}><strong>{item.title || 'Order item'}</strong><p>{returnPolicy(item.returnPolicy || byId(state.listings, item.listingId)?.returnPolicy)}</p></div>)}
        <TextLink to="/messages"><MessageCircle size={16} /> Go to Messages</TextLink></section>}
    </div>
  </>
}

export function Cases() {
  const { state } = useStore()
  const cases = newest(owned(state.cases, state.buyer), 'updatedAt')
  return <>
    <Heading title="Cases">View escalated orders and follow up on case activity.</Heading>
    {cases.length ? <div className="stack">{cases.map((entry) => {
      const order = byId(state.orders, entry.orderId)
      return <article className="panel order-card" key={entry.id}><div className="order-header"><div>
        <small>{order ? orderLabel(order) : entry.orderId} · {date(entry.updatedAt || entry.createdAt)}</small>
        <h2>{REASONS[entry.reason] || human(entry.reason)}</h2><p>{order?.shopName || artist(state, entry.shopId)}</p></div><Status value={entry.status} /></div>
        <TextLink to={pathFor('cases', entry.id)}>View case</TextLink></article>
    })}</div> : <Empty title="No cases yet"><ButtonLink secondary to="/purchases">View purchases</ButtonLink></Empty>}
  </>
}

function CaseActions({ id }) {
  const { commit, notify } = useStore()
  const [body, setBody] = useState('')
  const { run, error } = useAction()
  const dialog = useRef(null)
  const dialogTitle = useId()
  const change = (close) => run(() => {
    commit((state, at) => updateCase(state, { id, body, close }, at))
    setBody('')
    notify(close ? 'Case closed.' : 'Comment added.')
    if (close) dialog.current?.close()
  })
  return <section className="panel stack">
    <form className="stack" onSubmit={(event) => { event.preventDefault(); change(false) }}>
      <Field label="Case comment"><textarea value={body} onChange={(event) => setBody(event.target.value)} rows="3" maxLength="4000" required /></Field>
      <ErrorNote>{error}</ErrorNote>
      <div className="actions"><button className="button">Add comment</button><button type="button" className="button secondary" onClick={() => dialog.current.showModal()}>Close case</button></div>
    </form>
    <dialog ref={dialog} aria-labelledby={dialogTitle}><h2 id={dialogTitle}>Close this case?</h2><p>Any further questions can go to the shop through Messages.</p>
      <ErrorNote>{error}</ErrorNote>
      <div className="actions"><button className="button secondary" autoFocus onClick={() => dialog.current.close()}>Cancel</button><button className="button" onClick={() => change(true)}>Confirm close case</button></div></dialog>
  </section>
}

export function Case() {
  const { caseId } = useParams()
  const { state } = useStore()
  const entry = byId(owned(state.cases, state.buyer), caseId)
  if (!entry) return <Missing title="Case unavailable" to="/cases" label="Back to cases" />
  const order = byId(state.orders, entry.orderId)
  return <>
    <LocalLink className="back-link" to="/cases"><ArrowLeft size={17} /> Back to cases</LocalLink>
    <Heading title={REASONS[entry.reason] || 'Case details'} action={<Status value={entry.status} />}>{artist(state, entry.shopId)} · Opened {date(entry.createdAt)}</Heading>
    <div className="stack readable">
      <section className="panel stack"><h2>Resolution requested</h2>
        <p>{money(entry.requestedAmount, entry.currency)} · {PREFERENCES[entry.refundPreference] || human(entry.refundPreference)}</p>
        {list(entry.lines).map((line, i) => <div key={line.orderItemId || i} className="case-line"><Art src={byId(order?.items, line.orderItemId)?.image} />
          <span>{byId(order?.items, line.orderItemId)?.title || byId(state.listings, line.listingId)?.title || 'Order item'} · Qty {line.quantity}</span><strong>{money(line.amount, entry.currency)}</strong></div>)}
        {order && <TextLink to={pathFor('purchases', order.id)}>View order {orderLabel(order)}</TextLink>}
      </section>
      <section className="panel stack"><h2>Case activity</h2>
        {list(entry.log).length ? <ol className="case-log">{chronological(list(entry.log)).map((log, i) => <li key={log.id || i}>
          <strong>{human(log.action)} · {log.actorType === 'buyer' ? 'You' : human(log.actorType)}</strong>
          <small>{date(log.createdAt, true)}</small>{log.body && <p>{log.body}</p>}</li>)}</ol> : <p>No case activity recorded.</p>}
      </section>
      {entry.status === 'open' && <CaseActions key={caseId} id={caseId} />}
    </div>
  </>
}
