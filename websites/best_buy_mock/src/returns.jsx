import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { date, find, itemName, items, label, latest, list, matches, money, orderName, returnableQuantity, returnReasons, returnStores } from './model.js'
import { Back, Badge, Dialog, Empty, Facts, Heading, Missing, PrintButton, Search, SiteLink, useSiteNavigate } from './ui.jsx'
import { LineSelection, ReviewLines, SelectField, Workflow } from './forms.jsx'
import { eligibleOrders, usePurchaseFlow } from './purchases.jsx'

const path = '/returns'

function ReturnForm({ state, flow, close }) {
  const capacity = (order, item) => returnableQuantity(state, order, item)
  const orders = eligibleOrders(state, capacity)
  const stores = returnStores(state)
  const purchase = find(orders, flow.orderId)
  const line = find(purchase?.items, flow.itemId)
  if (!orders.length) return <div className="card form-card"><Empty action={<SiteLink to={path}>Back to returns</SiteLink>}>
    No purchase lines are currently available for a return.
  </Empty></div>
  const selection = capacity(purchase, line) ? { [line.id]: { quantity: '1', reason: '' } } : {}
  return <Workflow title="Start a return" reviewTitle="Review return" confirm="Confirm return" inline onClose={close}
    initial={{ type: 'return', orderId: purchase?.id || '', selection, method: '', storeId: '' }}
    review={(summary, draft) => <>
      <ReviewLines order={find(orders, draft.orderId)} lines={summary.lines} />
      <Facts values={[
        ['Return method', label(draft.method)],
        ['Destination', draft.method === 'store' ? find(stores, draft.storeId)?.name || draft.storeId : 'Mail return center'],
        ['Estimated refund before tax', money(summary.refundEstimate)],
      ]} />
    </>}>
    {(draft, update, error) => {
      const order = find(orders, draft.orderId)
      const selected = Object.keys(draft.selection)
      const mail = selected.length > 0 && selected.every((lineId) => find(order?.items, lineId)?.eligibility?.mailReturnable === true)
      const methods = [...(stores.length ? [['store', 'Store']] : []), ...(mail ? [['mail', 'Mail']] : [])]
      function updateSelection(next) {
        update('selection', next)
        if (draft.method === 'mail' && !Object.keys(next).every((lineId) => find(order?.items, lineId)?.eligibility?.mailReturnable === true)) update('method', '')
      }
      return <>
        <SelectField name="Order" field="orderId" value={draft.orderId} error={error('orderId')} placeholder="Choose an order"
          options={orders.map((entry) => [entry.id, orderName(entry) + ' · ' + items(entry).slice(0, 2).map(itemName).join(', ')])}
          update={(_, value) => { update('orderId', value); update('selection', {}); update('method', '') }} />
        {order && <LineSelection lines={items(order).filter((item) => capacity(order, item))} capacity={(item) => capacity(order, item)}
          selection={draft.selection} onChange={updateSelection} reasons={returnReasons} error={error} />}
        {selected.length > 0 && (methods.length ? <SelectField name="Return method" field="method" value={draft.method}
          update={update} error={error('method')} options={methods} placeholder="Choose store or mail" /> : <p className="muted">A return destination is unavailable for these items.</p>)}
        {selected.length > 0 && draft.method === 'store' && <SelectField name="Return store" field="storeId" value={draft.storeId} update={update}
          error={error('storeId')} options={stores.map((store) => [store.id, [store.name || store.id, store.address].filter(Boolean).join(' · ')])} placeholder="Choose a store" />}
      </>
    }}
  </Workflow>
}

export function Returns() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const flow = usePurchaseFlow()
  const go = useSiteNavigate()
  const returns = latest(state.returns).map((record) => {
    const order = find(state.orders, record.orderId)
    const products = list(record.lines).map((line) => find(order?.items, line.orderItemId)?.name || line.orderItemId).filter(Boolean)
    return { record, order, products }
  }).filter(({ record, order, products }) => matches(query, record.id, record.orderId, order?.orderNumber, ...products))
  return <>
    <Heading title="Returns" action={!flow.open && <SiteLink className="button" to={path + '?new=1'}>Start a return</SiteLink>}>
      Return eligible items and check the status of your requests.
    </Heading>
    {flow.open && <ReturnForm key={flow.key} state={state} flow={flow} close={(result) => { if (!result) go(path, { replace: true }) }} />}
    <section className="card" aria-label="Return history">
      <div className="stack"><h2>Return history</h2>
        <Search label="Search returns" value={query} onChange={setQuery} placeholder="Return ID, order or product" />
      </div>
      {returns.length ? <ul className="rows">{returns.map(({ record, order, products }) => <li className="history-row" key={record.id}>
        <div className="row-primary"><SiteLink to={path + '/' + encodeURIComponent(record.id)}>{record.id}</SiteLink>
          <span>{order ? orderName(order) : record.orderId || 'Order unavailable'}{products.length ? ' · ' + products.join(', ') : ''}</span></div>
        <div className="row-meta"><Badge status={record.status} /><span>{label(record.method)} · {date(record.createdAt)}</span></div>
        <strong className="row-amount">{money(record.refundEstimate)}</strong>
      </li>)}</ul> : <Empty>{query ? 'No returns match your search.' : 'You have no returns yet.'}</Empty>}
    </section>
  </>
}

export function ReturnDetail() {
  const { returnId } = useParams()
  const { state } = useAccount()
  const [confirm, setConfirm] = useState(false)
  const [slip, setSlip] = useState(false)
  const record = find(state.returns, returnId)
  if (!record) return <Missing title="Return unavailable" to={path} link="Back to returns" />
  const order = find(state.orders, record.orderId)
  const store = find(state.stores, record.storeId)
  const lines = list(record.lines)
  return <>
    <Back to={path}>Back to returns</Back>
    <Heading title={'Return ' + record.id} action={<Badge status={record.status} />}>Requested {date(record.createdAt)} · {label(record.method)}</Heading>
    <div className="detail-grid">
      <section className="card"><h2>Return items</h2>
        {lines.length ? <ReviewLines order={order} lines={lines} /> : <Empty>Return item information is unavailable.</Empty>}
      </section>
      <div className="stack">
        <section className="card"><h2>Return summary</h2><Facts values={[
          ['Order', order ? <SiteLink to={'/orders/' + encodeURIComponent(order.id)}>{orderName(order)}</SiteLink> : record.orderId],
          ['Estimated refund before tax', money(record.refundEstimate)],
          ...(record.canceledAt ? [['Canceled on', date(record.canceledAt)]] : []),
        ]} />
          {record.status === 'requested' && <div className="actions">
            <button type="button" className="secondary" onClick={() => setConfirm(true)}>Cancel return</button>
          </div>}
        </section>
        {record.method === 'mail' && <section className="card"><h2>Mail return</h2><div className="stack">
          <Facts values={[['Mail reference', record.mailReference]]} />
          {record.status === 'requested' && <p>Pack the listed items securely and include the packing slip with your return reference.</p>}
          {record.status === 'requested' && record.mailReference && <div><button type="button" className="secondary" onClick={() => setSlip(true)}>View packing slip</button></div>}
        </div></section>}
        {record.method === 'store' && <section className="card"><h2>Store return</h2><div className="stack">
          <Facts values={[['Store', store?.name || record.storeId], ['Address', store?.address]]} />
          {record.status === 'requested' && <p>Bring the listed items and your return ID to the selected store.</p>}
        </div></section>}
      </div>
    </div>
    {confirm && <Workflow title="Cancel return" reviewTitle="Review return cancellation" confirm="Confirm return cancellation" danger
      initial={{ type: 'cancel-return', returnId: record.id }} onClose={() => setConfirm(false)}
      review={() => <p>Cancel return {record.id} and release its reserved items?</p>}>
      {() => <p>You can start a new request for eligible items after this return is canceled.</p>}
    </Workflow>}
    {slip && <PackingSlip record={record} order={order} lines={lines} close={() => setSlip(false)} />}
  </>
}

function PackingSlip({ record, order, lines, close }) {
  return <Dialog title="Packing slip" onClose={close}><article className="print-sheet stack">
    <h3>Best Buy · Mail return</h3><Facts values={[['Return ID', record.id], ['Mail reference', record.mailReference], ['Order', order ? orderName(order) : record.orderId]]} />
    <ReviewLines order={order} lines={lines} /><div className="no-print"><PrintButton>Print packing slip</PrintButton></div>
  </article></Dialog>
}

