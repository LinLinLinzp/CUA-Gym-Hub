import { useState } from 'react'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from '../context/Account.jsx'
import { AccountLink, BackLink, Missing, useAccountNavigate } from '../components/Navigation.jsx'
import { Badge, CopyIdentifier, Empty, PageTitle, ProductImage } from '../components/Details.jsx'
import { SelectField } from '../components/Fields.jsx'
import { DamageClaimDialog } from '../components/DamageClaim.jsx'
import { ReturnDialog, ReturnQuote } from '../components/Returns.jsx'
import { ConfirmDialog } from '../components/Dialog.jsx'
import { useToast } from '../components/Feedback.jsx'
import { cancelReturn } from '../data/actions.js'
import { byRecent, claimStatuses, findRecord, formatDate, label, money, orderNumber, records, returnStatuses, shipmentZone } from '../data/rules.js'
import { orderPath, servicePath, shipmentPath } from './Orders.jsx'

const claimConfig = {
  kind: 'claims', collection: 'damageClaims', heading: 'Damage claims',
  description: 'Report a problem with a delivered item and check the status of your claims.',
  button: 'Report damage', singular: 'Damage claim', empty: 'No damage claims found', search: 'Search claims',
  statuses: claimStatuses, open: ['submitted', 'in_review', 'approved'],
  Form: DamageClaimDialog,
}

const returnConfig = {
  kind: 'returns', collection: 'returns', heading: 'Returns',
  description: 'Start a return, review handoff instructions or check your refund.',
  button: 'Start a return', singular: 'Return', empty: 'No returns found', search: 'Search returns',
  statuses: returnStatuses, open: ['requested', 'in_transit', 'received'],
  Form: ReturnDialog,
}

function RequestList({ config }) {
  const { state } = useAccount()
  const toast = useToast()
  const navigate = useAccountNavigate()
  const [params, setParams] = useSearchParams()
  const [opening, setOpening] = useState(false)
  const fromOrder = params.get('new') === '1'
  const query = params.get('q') || ''
  const term = query.trim().toLowerCase()
  const status = params.get('status') || 'all'
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const hasFilters = Boolean(term) || status !== 'all'
  const list = records(state[config.collection])
    .filter((entry) => entry.id && (status === 'all' || (status === 'open' ? config.open.includes(entry.status) : entry.status === status)))
    .map((entry) => ({ entry, order: findRecord(state.orders, entry.orderId) }))
    .filter(({ entry, order }) => [entry.id, entry.orderId, order?.orderNumber]
      .some((value) => String(value ?? '').toLowerCase().includes(term)))
    .sort(({ entry: a }, { entry: b }) => sort === 'oldest'
      ? byRecent(b.createdAt, a.createdAt) : byRecent(a.createdAt, b.createdAt))
  const Form = config.Form
  const zone = shipmentZone(state)

  function updateFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function resetFilters() {
    const next = new URLSearchParams(params)
    for (const key of ['q', 'status', 'sort']) next.delete(key)
    setParams(next, { replace: true })
  }

  function closeForm() {
    setOpening(false)
    if (fromOrder) {
      const next = new URLSearchParams(params)
      for (const key of ['new', 'order', 'item']) next.delete(key)
      setParams(next, { replace: true })
    }
  }

  return <div className="page-stack">
    <PageTitle title={config.heading} description={config.description}>
      <button className="button primary" type="button" onClick={() => setOpening(true)}><Plus size={17} aria-hidden="true" />{config.button}</button>
    </PageTitle>
    <div className="section-stack">
      <div className="card filters">
        <label className="field search-field">
          <span>{config.search}</span>
          <span className="search-input">
            <Search size={18} aria-hidden="true" />
            <input type="search" placeholder="Order number or reference" value={query}
              onChange={(event) => updateFilter('q', event.currentTarget.value)} />
          </span>
        </label>
        <SelectField title="Status" options={[{ value: 'all', label: 'All statuses' }, { value: 'open', label: 'Open requests' }, ...config.statuses]}
          value={status} onChange={(value) => updateFilter('status', value === 'all' ? '' : value)} />
        <SelectField title="Sort by" options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }]}
          value={sort} onChange={(value) => updateFilter('sort', value === 'newest' ? '' : value)} />
      </div>
      {list.length ? list.map(({ entry, order }) => {
        const lineId = entry.orderItemId || records(entry.items)[0]?.orderItemId
        const item = findRecord(order?.items, lineId)
        return <article className="card delivery-card service-card" key={entry.id}>
          <ProductImage item={item} />
          <div className="delivery-info">
            <div className="actions"><h3>{item?.name || config.singular}</h3><Badge status={entry.status} /></div>
            <p className="meta muted wrap-text">{entry.id} · {order ? orderNumber(order) : entry.orderId || 'Order unavailable'}</p>
            <p className="meta muted">Submitted {formatDate(entry.createdAt, zone)}</p>
          </div>
          <AccountLink className="button" to={servicePath(config.kind, entry.id)} aria-label={'View ' + config.singular.toLowerCase() + ' ' + entry.id}>View details <ArrowRight size={16} aria-hidden="true" /></AccountLink>
        </article>
      }) : <Empty title={config.empty}>
        <p className="muted">{hasFilters ? 'Try clearing the filters or searching for a different reference.' : 'New requests will appear here.'}</p>
        {hasFilters && <button type="button" className="button" onClick={resetFilters}>Clear filters</button>}
      </Empty>}
    </div>
    {(opening || fromOrder) && <Form initialOrderId={params.get('order') || ''} initialItemId={params.get('item') || ''}
      onClose={closeForm} onSuccess={(record) => {
        closeForm()
        toast(config.singular + ' submitted. Reference ' + record.id)
        navigate(servicePath(config.kind, record.id), { state: { confirmed: true } })
      }} />}
  </div>
}

export function ClaimList() {
  return <RequestList config={claimConfig} />
}

export function ClaimDetail() {
  const { state } = useAccount()
  const { claimId } = useParams()
  const { state: navigation } = useLocation()
  const claim = findRecord(state.damageClaims, claimId)
  if (!claim) return <Missing title="Claim unavailable" to="/claims" label="Back to damage claims" />
  const order = findRecord(state.orders, claim.orderId)
  const item = findRecord(order?.items, claim.orderItemId)
  const shipment = findRecord(state.shipments, claim.shipmentId)
  const attachments = records(claim.attachments)
  return <div className="page-stack">
    <div className="detail-heading">
      <BackLink to="/claims">Back to damage claims</BackLink>
      <PageTitle title="Damage claim" description={'Submitted ' + formatDate(claim.createdAt, shipmentZone(state, shipment))} focusOnMount={navigation?.confirmed}>
        <Badge status={claim.status} />
      </PageTitle>
    </div>
    <div className="detail-grid">
      <section className="card section-stack">
        <h2>Claim details</h2>
        <div className="actions">
          <p className="muted meta wrap-text">Reference {claim.id}</p>
          <CopyIdentifier value={claim.id} name="claim reference" />
        </div>
        <div className="delivery-item">
          <ProductImage item={item} size={72} />
          <div><h3>{item?.name || 'Item unavailable'}</h3><p className="muted">Quantity {claim.quantity ?? 'unavailable'}</p></div>
        </div>
        <dl className="detail-facts">
          <div><dt>Issue type</dt><dd>{label(claim.issueType)}</dd></div>
          <div><dt>Preferred resolution</dt><dd>{label(claim.requestedResolution)}</dd></div>
          <div><dt>Description</dt><dd className="preserve-text">{claim.description || 'Description unavailable.'}</dd></div>
        </dl>
        <div>
          <h3>Photos</h3>
          {attachments.length ? <ul className="review-items wrap-text">{attachments.map((file, index) => <li key={index}>{file.name || 'Photo'}</li>)}</ul>
            : <p className="muted">No photos were attached.</p>}
        </div>
      </section>
      <aside className="section-stack">
        <section className="card section-stack">
          <h2>Related order</h2>
          <p className="muted">{order ? orderNumber(order) : 'Order unavailable'}</p>
          {order && <AccountLink className="text-link" to={orderPath(order.id)}>View order <ArrowRight size={16} aria-hidden="true" /></AccountLink>}
          {shipment && shipment.orderId === claim.orderId && <AccountLink className="text-link" to={shipmentPath(shipment.id)}>View delivery <ArrowRight size={16} aria-hidden="true" /></AccountLink>}
        </section>
      </aside>
    </div>
  </div>
}

export function ReturnList() {
  return <RequestList config={returnConfig} />
}

export function ReturnDetail() {
  const { state, transact } = useAccount()
  const toast = useToast()
  const { returnId } = useParams()
  const { state: navigation } = useLocation()
  const [canceling, setCanceling] = useState(false)
  const entry = findRecord(state.returns, returnId)
  if (!entry) return <Missing title="Return unavailable" to="/returns" label="Back to returns" />
  const order = findRecord(state.orders, entry.orderId)
  const lines = records(entry.items)
  const currency = entry.currency || order?.currency
  const active = entry.status === 'requested'
  const instructions = entry.handoffMethod === 'pickup'
    ? 'Pack the items for transport and keep them accessible for the freight team. The carrier will arrange a pickup window.'
    : entry.handoffMethod === 'drop_off'
      ? 'Pack the items securely and bring the parcel and your return reference to a Northline Parcel drop-off counter.'
      : 'Handoff instructions are unavailable.'
  return <div className="page-stack">
    <div className="detail-heading">
      <BackLink to="/returns">Back to returns</BackLink>
      <PageTitle title="Return details" description={'Requested ' + formatDate(entry.createdAt, shipmentZone(state))} focusOnMount={navigation?.confirmed}>
        <Badge status={entry.status} />
      </PageTitle>
    </div>
    <div className="detail-grid">
      <div className="section-stack">
        <section className="card section-stack">
          <h2>Returned items</h2>
          <div className="actions">
            <p className="muted meta wrap-text">Reference {entry.id}</p>
            <CopyIdentifier value={entry.id} name="return reference" />
          </div>
          {lines.length ? lines.map((line, index) => {
            const item = findRecord(order?.items, line.orderItemId)
            return <div className="line-item" key={line.orderItemId || index}>
              <ProductImage item={item} size={72} />
              <div className="line-info">
                <h3>{item?.name || 'Item unavailable'}</h3>
                <p className="muted meta">Quantity {line.quantity ?? 'unavailable'}</p>
                <p className="muted meta">{label(line.reason)}</p>
              </div>
              <div className="line-actions"><strong>{money(line.refundAmount, currency)}</strong></div>
            </div>
          }) : <p className="muted">Item details are unavailable.</p>}
        </section>
        <section className="card section-stack">
          <h2>Return handoff</h2>
          <p><strong>{label(entry.handoffMethod)}</strong></p>
          {active && <p>{instructions}</p>}
          {entry.status === 'canceled' && <p className="muted">This return was canceled.</p>}
          {active && <div className="actions"><button className="button" type="button" onClick={() => setCanceling(true)}>Cancel return</button></div>}
        </section>
      </div>
      <aside className="section-stack">
        <section className="card section-stack">
          <h2>Refund summary</h2>
          <p className="muted">{label(entry.refundMethod)}</p>
          <ReturnQuote details={entry} currency={currency} />
        </section>
        <section className="card section-stack">
          <h2>Related order</h2>
          <p className="muted">{order ? orderNumber(order) : 'Order unavailable'}</p>
          {order && <AccountLink className="text-link" to={orderPath(order.id)}>View order <ArrowRight size={16} aria-hidden="true" /></AccountLink>}
        </section>
      </aside>
    </div>
    {canceling && <ConfirmDialog title="Cancel this return?" description="The selected quantities will become available for a new request."
      submitLabel="Confirm return cancellation" backLabel="Keep return" onClose={() => setCanceling(false)}
      action={() => transact((current, now) => cancelReturn(current, now, returnId))}
      onSuccess={(record) => { toast('Return canceled. Reference ' + record.id); setCanceling(false) }} />}
  </div>
}
