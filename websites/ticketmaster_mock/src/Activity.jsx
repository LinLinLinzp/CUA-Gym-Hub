import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canAccept, find, priceInCents, reasons, rows } from './data/model.js'
import { formIssue } from './data/actions.js'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { Confirmation, dateLabel, Dialog, Empty, EventArt, EventInfo, Filters, money, OrderLink, PageHeading, Pager, paymentLabel, Receipt, SeatSummary, Status, ticketCount, useDialog } from './ui.jsx'

const pageSize = 12
const views = {
  transfers: {
    title: 'Transfers', description: 'Track tickets you’ve sent and accept tickets shared with you.',
    options: [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['canceled', 'Canceled']],
    singular: 'transfer',
  },
  listings: {
    title: 'My Listings', description: 'Review resale prices, payout destinations and listing history.',
    options: [['all', 'All'], ['active', 'Active'], ['sold', 'Sold'], ['removed', 'Removed']],
    singular: 'listing',
  },
  refunds: {
    title: 'Refunds', description: 'Track refund requests and check where your payment will be returned.',
    options: [['all', 'All'], ['requested', 'Requested'], ['processing', 'Processing'], ['completed', 'Completed']],
    singular: 'refund',
  },
}
const transitions = {
  cancelTransfer: {
    title: 'Cancel transfer?', description: 'The recipient won’t be able to accept this transfer. Seats still held by this invitation will return to your order.',
    label: 'Cancel transfer', success: 'Transfer canceled.',
  },
  acceptTransfer: {
    title: 'Accept transfer?', description: 'These seats will become available in the linked order.',
    label: 'Accept transfer', success: 'Transfer accepted. Your tickets are available in Orders.',
  },
  removeListing: {
    title: 'Remove listing?', description: 'This listing will close and any seats it still holds will return to your order.',
    label: 'Remove listing', success: 'Listing removed.',
  },
}

export function Activity({ kind }) {
  const { world, commit, pending } = useAccount()
  const [filter, setFilter] = useState('all')
  const [selectedPage, setPage] = useState(0)
  const ui = useDialog()
  const config = views[kind]
  const entries = rows(world, kind).filter((record) => filter === 'all' || record.status === filter).sort((a, b) =>
    (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || String(a.id ?? '').localeCompare(String(b.id ?? '')),
  )
  const page = Math.min(selectedPage, Math.max(0, Math.ceil(entries.length / pageSize) - 1))
  const record = ui.dialog ? find(world, kind, ui.dialog.id) || ui.dialog.record : null
  const type = ui.dialog?.type
  const transition = transitions[type]

  async function confirm() {
    const error = await commit({ type, id: record.id })
    if (error) return error
    ui.success(transition.success)
    return ''
  }

  return <>
    <PageHeading title={config.title} description={config.description} />
    <div className="ledger-controls"><Filters options={config.options} value={filter} label={`${config.title} status`} onChange={(value) => { setFilter(value); setPage(0) }} /></div>
    {ui.notice && <p className="notice success" role="status">{ui.notice}</p>}
    <div className="ledger-heading"><h2>{filter === 'all' ? 'Activity' : config.options.find(([id]) => id === filter)[1]}</h2>
      <span role="status">{entries.length} {config.singular}{entries.length === 1 ? '' : 's'}</span>
    </div>
    {entries.length ? <ul className="ledger">{entries.slice(page * pageSize, (page + 1) * pageSize).map((entry, index) =>
      <ActivityRow key={entry.id || index} kind={kind} entry={entry} world={world} open={(action) => ui.open({ type: action, id: entry.id, record: entry })} />,
    )}</ul> : <Empty title={`No ${filter === 'all' ? '' : `${filter} `}${config.singular}s`} description={filter === 'all' && kind !== 'refunds' ? 'Start from an eligible order or check another view.' : 'Updates will appear here.'}>
      {filter === 'all' && <Link className="text-link" to={withSid('/orders')}>Go to Orders</Link>}
    </Empty>}
    <Pager page={page} total={entries.length} size={pageSize} label={`${config.title} pages`} onChange={setPage} />
    {transition && record && <Confirmation {...transition} pending={pending} onClose={ui.close} onConfirm={confirm}>
      <SeatSummary world={world} ticketIds={record.ticketIds} />
    </Confirmation>}
    {type === 'editListing' && record &&
      <EditListing world={world} listing={ui.dialog.record} commit={commit} pending={pending} onClose={ui.close} onSuccess={ui.success} />}
  </>
}

function ActivityRow({ kind, entry, world, open }) {
  const order = find(world, 'orders', entry.orderId)
  const event = find(world, 'events', order?.eventId)
  const owned = !!entry.id && !!world.account?.id && entry.actorId === world.account.id
  const transfer = kind === 'transfers'
  const listing = kind === 'listings'
  const incoming = entry.direction === 'incoming'
  const cancel = transfer && owned && entry.direction === 'outgoing' && entry.status === 'pending'
  const accept = transfer && !!entry.id && canAccept(world, entry)
  const manage = listing && owned && entry.status === 'active'
  const edit = manage && Number.isSafeInteger(entry.quantity) && entry.quantity > 0
  const method = find(world, listing ? 'payoutMethods' : 'paymentMethods', listing ? entry.payoutMethodId : entry.paymentMethodId)
  return <li className="ledger-row activity-row">
    <EventArt event={event} />
    <EventInfo event={event} fallback={entry.orderId ? `Event unavailable · ${entry.orderId}` : 'Event details unavailable'} as="h3" />
    <div className="row-meta">
      <span className="meta-label">{transfer ? (incoming ? 'Incoming transfer' : entry.direction === 'outgoing' ? 'Outgoing transfer' : 'Transfer') : listing ? 'Listing price' : 'Refund amount'}</span>
      {transfer ? <strong>{incoming ? entry.senderName || 'Sender unavailable' : entry.recipientName || 'Recipient unavailable'}</strong> :
        <strong>{listing ? `${money(entry.pricePerTicketCents)} per ticket` : money(entry.totalCents)}</strong>}
      <span>{ticketCount(entry.quantity)}{listing && ` · ${money(entry.totalCents)} total`}</span>
      <span>{transfer ? dateLabel(entry.createdAt) : paymentLabel(method)}</span>
    </div>
    <Status value={entry.status} />
    <div className="row-links">
      <OrderLink order={order} />
      {cancel && <button type="button" className="text-link" onClick={() => open('cancelTransfer')}>Cancel transfer</button>}
      {accept && <button type="button" className="text-link" onClick={() => open('acceptTransfer')}>Accept transfer</button>}
      {edit && <button type="button" className="text-link" onClick={() => open('editListing')}>Edit price</button>}
      {manage && <button type="button" className="text-link" onClick={() => open('removeListing')}>Remove listing</button>}
    </div>
    <details className="activity-details">
      <summary>{kind === 'refunds' ? 'Refund details' : 'Seat and activity details'}</summary>
      <SeatSummary world={world} ticketIds={entry.ticketIds} />
      <dl className="summary-meta">
        <div><dt>{transfer ? 'Transfer date' : listing ? 'Listed' : 'Refund date'}</dt><dd>{dateLabel(entry.createdAt)}</dd></div>
        {transfer && entry.recipientEmail && <div><dt>Recipient email</dt><dd>{entry.recipientEmail}</dd></div>}
        {kind === 'refunds' && <div><dt>Reason</dt><dd>{reasons[entry.reason] || 'Reason unavailable'}</dd></div>}
      </dl>
      {kind === 'refunds' && <Receipt totals={entry} finalLabel="Refund amount" />}
    </details>
  </li>
}

function EditListing({ world, listing, commit, pending, onClose, onSuccess }) {
  const [price, setPrice] = useState(Number.isSafeInteger(listing.pricePerTicketCents) ? (listing.pricePerTicketCents / 100).toFixed(2) : '')
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const parsed = priceInCents(price, listing.quantity)

  async function submit(e) {
    e.preventDefault()
    if (pending) return
    const action = { type: 'editListing', id: listing.id, quantity: listing.quantity, price }
    if (review) {
      const issue = await commit(action)
      if (issue) setError(issue)
      else onSuccess('Listing price updated.')
      return
    }
    const issue = formIssue(world, action)
    if (issue) return setError(issue)
    if (parsed === listing.pricePerTicketCents) return setError('Enter a different price to update this listing.')
    setError('')
    setReview(true)
  }

  return <Dialog title="Edit listing price" onClose={onClose} pending={pending}>
    <form onSubmit={submit} noValidate>
      <SeatSummary world={world} ticketIds={listing.ticketIds} />
      {review ? <dl className="summary-meta"><div><dt>New price per ticket</dt><dd>{money(parsed)}</dd></div>
        <div><dt>New listing total</dt><dd>{money(parsed * listing.quantity)}</dd></div>
      </dl> : <label className="field">Price per ticket (USD)<input inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setError('') }} /></label>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {review && <button type="button" className="button secondary edit-review" disabled={pending} onClick={() => { setReview(false); setError('') }}>Back to edit</button>}
        <button type="button" className="button secondary" disabled={pending} onClick={onClose}>Cancel</button>
        <button type="submit" className="button primary" disabled={pending}>{review ? 'Save price' : 'Review'}</button>
      </div>
    </form>
  </Dialog>
}
