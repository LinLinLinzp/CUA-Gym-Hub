import { useState } from 'react'
import { useAccount } from './store.jsx'
import { date, find, itemName, latest, matchCapacity, matches, money, offerChannels, orderName } from './model.js'
import { Badge, Empty, Facts, Heading, Search, SiteLink, useSiteNavigate } from './ui.jsx'
import { InputField, SelectField, Workflow } from './forms.jsx'
import { eligibleOrders, PurchaseFields, usePurchaseFlow } from './purchases.jsx'

const path = '/price-match'

function MatchForm({ state, flow, close }) {
  const capacity = (order, item) => matchCapacity(state, order, item)
  const orders = eligibleOrders(state, capacity)
  const purchase = find(orders, flow.orderId)
  const line = find(purchase?.items, flow.itemId)
  if (!orders.length) return <div className="card form-card"><Empty action={<SiteLink to={path}>Back to price match</SiteLink>}>
    No purchase lines are currently eligible for a price match.
  </Empty></div>
  return <Workflow title="New price match request" reviewTitle="Review price match request" confirm="Submit request" inline onClose={close}
    initial={{ type: 'match', orderId: purchase?.id || '', itemId: capacity(purchase, line) ? line.id : '', quantity: '1', offerChannel: '', price: '', offerUrl: '' }}
    review={(summary, draft) => <Facts values={[
      ['Order', orderName(find(orders, draft.orderId))],
      ['Item', itemName(find(find(orders, draft.orderId)?.items, draft.itemId))],
      ['Offer channel', offerChannels[draft.offerChannel]],
      ['Original unit price', money(summary.originalUnitPrice)], ['Offer unit price', money(summary.offerUnitPrice)],
      ['Quantity', summary.quantity], ['Requested difference before tax', money(summary.requestedAmount)],
      ...(draft.offerUrl ? [['Offer URL', draft.offerUrl.trim()]] : []),
    ]} />}>
    {(draft, update, error) => {
      const order = find(orders, draft.orderId)
      const item = find(order?.items, draft.itemId)
      const available = capacity(order, item)
      return <>
        <PurchaseFields orders={orders} draft={draft} update={update} error={error} eligible={capacity} />
        {available > 0 && <>
          <p className="muted">Original unit price {money(item.unitPrice)} · {available} units available</p>
          <SelectField name="Offer channel" field="offerChannel" value={draft.offerChannel} update={update}
            error={error('offerChannel')} options={Object.entries(offerChannels)} placeholder="Choose an offer channel" />
          <InputField name="Lower unit price before tax" field="price" value={draft.price} update={update} error={error('price')} inputMode="decimal" />
          <InputField name="Quantity" field="quantity" value={draft.quantity} update={update} error={error('quantity')} type="number" min="1" max={available} />
          <InputField name="Offer URL (optional)" field="offerUrl" value={draft.offerUrl} update={update} error={error('offerUrl')} type="url" />
        </>}
      </>
    }}
  </Workflow>
}

export function PriceMatch() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState(null)
  const flow = usePurchaseFlow()
  const go = useSiteNavigate()
  const requests = latest(state.priceMatchRequests).map((request) => {
    const order = find(state.orders, request.orderId)
    return { request, order, item: find(order?.items, request.orderItemId) }
  }).filter(({ request, order, item }) => matches(query, request.id, orderName(order), request.orderId, item?.name, request.status))
  return <>
    <Heading title="Price match" action={!flow.open && <SiteLink className="button" to={path + '?new=1'}>New request</SiteLink>}>
      Request a price adjustment for a lower Best Buy offer and check past requests.
    </Heading>
    {flow.open && <MatchForm key={flow.key} state={state} flow={flow} close={(result) => {
      if (result?.anchor) { setQuery(''); setRecent(result.anchor) }
      go(path, { replace: true })
    }} />}
    <section className="card" aria-label="Price match history">
      <div className="stack"><h2>Request history</h2>
        <Search label="Search requests" value={query} onChange={setQuery} placeholder="Request ID, order or product" />
      </div>
      {requests.length ? <ul className="rows">{requests.map(({ request, order, item }) => <li key={request.id} className="detail-line">
        <details open={recent === request.id ? true : undefined}>
          <summary className="history-row">
            <span className="row-primary"><strong>{item?.name || request.orderItemId || 'Purchase item'}</strong><span>{request.id} · {order ? orderName(order) : request.orderId || 'Order unavailable'}</span></span>
            <span className="row-meta"><Badge status={request.status} /><span>{date(request.createdAt)}</span></span>
            <strong className="row-amount">{money(request.requestedAmount)}</strong>
          </summary>
          <Facts values={[
            ['Original unit price', money(request.originalUnitPrice)], ['Offer unit price', money(request.offerUnitPrice)],
            ['Quantity', request.quantity], ['Offer channel', offerChannels[request.offerChannel]],
            ...(request.offerUrl ? [['Offer URL', request.offerUrl]] : []),
            ...(order ? [['Order', <SiteLink to={'/orders/' + encodeURIComponent(order.id)}>{orderName(order)}</SiteLink>]] : []),
          ]} />
        </details>
      </li>)}</ul> : <Empty>{query ? 'No requests match your search.' : 'You have no price match requests yet.'}</Empty>}
    </section>
  </>
}

