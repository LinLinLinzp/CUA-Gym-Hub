import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { byRecent, cents, contains, date, find, inRange, inputCents, label, masked, metadata, money, nameOf, newId, ref, rows } from '../model.js'
import { useStore } from '../store.jsx'
import { choices, DateFilters, Dialog, Facts, Field, Header, ListCard, Notice, options, Recovery, RouteLink, Search, Select, Status, Table, useFilters, useRoute } from '../ui.jsx'
import { orderPath } from './Orders.jsx'

const payoutPath = (id) => '/payouts/' + encodeURIComponent(id)
const statuses = choices(['pending', 'completed', 'failed'])
export const balanceAt = (state, id) => rows(state.balances).find((balance) => id != null && balance.locationId === id)
const destinationList = (state, id) => rows(state.destinations).filter((destination) => destination.id && destination.locationId === id)
export const canTransferAt = (state, id) => (cents(balanceAt(state, id)?.availableAmount) ?? 0) >= 2550 && destinationList(state, id).length > 0

export function Payouts() {
  const { state } = useStore()
  const [filters, change, reset] = useFilters()
  const [open, setOpen] = useState(false)
  const locations = rows(state.locations)
  const hasDestination = locations.some(({ id }) => canTransferAt(state, id))
  const entries = rows(state.payouts).filter((payout) => {
    const destination = find(state.destinations, payout.destinationId)
    return contains(filters.query || '', payout.id, destination?.name, destination?.last4)
      && (!filters.status || payout.status === filters.status)
      && (!filters.location || payout.locationId === filters.location)
      && inRange(payout.createdAt, filters.from, filters.to)
  }).sort(byRecent)
  return <>
    <Header title="Payouts" subtitle="Review your balances and track transfers to linked accounts." action={<button className="button primary" disabled={!hasDestination} onClick={() => setOpen(true)}>Transfer now</button>} />
    <div className="balance-strip">
      {locations.map((location) => {
        const balance = balanceAt(state, location.id)
        return <section className="card balance-summary" key={location.id}><h2>{location.name || location.id}</h2><p className="metric">{money(balance?.availableAmount, balance?.currency || state.account?.currency)}</p><p className="muted small">Available balance</p></section>
      })}
      {!locations.length && <p className="muted">No locations are available.</p>}
    </div>
    {!hasDestination && <p className="muted transfer-hint">An instant transfer requires a linked destination and enough funds to receive at least $25.</p>}
    <h2 className="subheading">Transfer history</h2>
    <div className="filters">
      <Search title="Search payouts" placeholder="Reference, destination or last four" value={filters.query || ''} change={(value) => change('query', value)} />
      <Select title="Location" value={filters.location} change={(value) => change('location', value)} options={options(locations)} empty="All locations" />
      <Select title="Status" value={filters.status} change={(value) => change('status', value)} options={statuses} empty="All statuses" />
      <DateFilters filters={filters} change={change} />
    </div>
    <ListCard count={entries.length} noun="payout" action={<button className="button secondary" disabled={!entries.length} onClick={() => downloadCsv(state, entries)}>Export CSV</button>}>
      <Table label="Payouts" headings={['Reference', 'Date', 'Location', 'Method', 'Destination', '$Amount', 'Status']} entries={entries} reset={Object.values(filters).some(Boolean) ? reset : null} empty="No payouts found." render={(payout, index) => <tr key={payout.id ?? index}>
        <td>{payout.id ? <RouteLink to={payoutPath(payout.id)}>{payout.id}</RouteLink> : '—'}</td>
        <td>{date(payout.createdAt)}</td><td>{nameOf(state.locations, payout.locationId)}</td><td>{label(payout.method)}</td>
        <td>{masked(find(state.destinations, payout.destinationId))}</td><td className="number">{money(payout.amount, payout.currency)}</td><td><Status value={payout.status} /></td>
      </tr>} />
    </ListCard>
    {open && <TransferDialog initialLocation={filters.location} close={() => setOpen(false)} />}
  </>
}

function downloadCsv(state, entries) {
  const escape = (cell) => {
    let value = String(cell ?? '')
    if (typeof cell === 'string' && /^[\s]*[=+\-@\t\r\n]/.test(cell)) value = "'" + value
    return '"' + value.replaceAll('"', '""') + '"'
  }
  const records = [['Date', 'ID', 'Location', 'Method', 'Status', 'Gross', 'Fee', 'Net', 'Masked destination'], ...entries.map((payout) => [
    payout.createdAt, payout.id, nameOf(state.locations, payout.locationId), label(payout.method), label(payout.status),
    payout.amount, payout.feeAmount, payout.netAmount, masked(find(state.destinations, payout.destinationId)),
  ])]
  const url = URL.createObjectURL(new Blob([records.map((record) => record.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'square-payouts.csv'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function transferQuote(state, draft) {
  const location = find(state.locations, draft.locationId)
  const destination = find(destinationList(state, draft.locationId), draft.destinationId)
  const balance = balanceAt(state, draft.locationId)
  if (!location || !destination || !balance) return { error: 'Choose a location with an available balance and a linked destination.' }
  const available = cents(balance.availableAmount)
  const amount = inputCents(draft.amount)
  if (!amount || amount <= 0) return { error: 'Enter a positive amount with up to two decimals.' }
  if (available === null || amount > available) return { error: 'The transfer exceeds the available balance.' }
  const fee = Math.floor(amount / 2000) * 39 + Math.round((amount % 2000) * 39 / 2000)
  const net = amount - fee
  if (net < 2500) return { error: 'The amount received must be at least $25.00 after the fee.' }
  const currency = balance.currency || state.account?.currency || 'USD'
  return { balance, quote: { locationId: location.id, destinationId: destination.id, location: location.name || location.id, destination: masked(destination), amount, fee, net, currency, available } }
}

function makeTransfer(state, draft, reviewed) {
  const result = transferQuote(state, draft)
  if (result.error) return result
  const { balance, quote } = result
  if (JSON.stringify(reviewed) !== JSON.stringify(quote)) return { error: 'The transfer details changed. Review the current details.' }
  const meta = metadata(state)
  const payout = {
    id: newId('po'), status: 'pending', method: 'instant', amount: quote.amount / 100,
    feeAmount: quote.fee / 100, netAmount: quote.net / 100, currency: quote.currency,
    locationId: quote.locationId, destinationId: quote.destinationId,
    estimatedArrivalAt: new Date(Date.parse(meta.updatedAt) + 600000).toISOString(), createdAt: meta.updatedAt, ...meta,
  }
  const balances = rows(state.balances).map((entry) => entry === balance ? { ...balance, availableAmount: (cents(balance.availableAmount) - quote.amount) / 100, ...meta } : entry)
  return { id: payout.id, message: 'Instant transfer requested.', state: { ...state, balances, payouts: [...rows(state.payouts), payout] } }
}

export function TransferDialog({ initialLocation, close }) {
  const { state, commit } = useStore()
  const route = useRoute()
  const [draft, setDraft] = useState(() => {
    const locations = rows(state.locations)
    const locationId = find(locations, initialLocation)?.id || locations.find(({ id }) => canTransferAt(state, id))?.id || ''
    return { locationId, destinationId: destinationList(state, locationId)[0]?.id || '', amount: '' }
  })
  const [reviewed, review] = useState(null)
  const [error, setError] = useState('')
  const balance = balanceAt(state, draft.locationId)
  const destinations = destinationList(state, draft.locationId)
  const update = (patch) => { setDraft((current) => ({ ...current, ...patch })); setError('') }
  async function submit(event) {
    event.preventDefault()
    const result = reviewed ? await commit((latest) => makeTransfer(latest, draft, reviewed)) : transferQuote(state, draft)
    if (result.error) return setError(result.error)
    setError('')
    if (result.id) {
      close()
      return route(payoutPath(result.id))
    }
    review(result.quote)
  }
  return <Dialog title={reviewed ? 'Review instant transfer' : 'Transfer now'} close={close}>
    <form onSubmit={submit} noValidate>
      {reviewed ? <Facts entries={[
        ['Location', reviewed.location], ['Destination', reviewed.destination], ['Balance debit', money(reviewed.amount / 100, reviewed.currency)],
        ['Instant transfer fee (1.95%)', money(reviewed.fee / 100, reviewed.currency)], ['Amount received', money(reviewed.net / 100, reviewed.currency)],
      ]} /> : <div className="stack">
        <Select title="Location" value={draft.locationId} change={(locationId) => update({ locationId, destinationId: destinationList(state, locationId)[0]?.id || '' })} options={options(rows(state.locations))} empty="Choose a location" />
        <Select title="Destination" value={draft.destinationId} change={(destinationId) => update({ destinationId })} options={destinations.map((destination) => [destination.id, masked(destination)])} empty="Choose a destination" />
        {draft.locationId && !destinations.length && <p className="muted small">No destination is linked to this location.</p>}
        {draft.locationId && !balance && <p className="muted small">No balance is available for this location.</p>}
        <Field label="Transfer amount"><input inputMode="decimal" value={draft.amount} onChange={(event) => update({ amount: event.target.value })} /><small className="muted">Available {money(balance?.availableAmount, balance?.currency)}</small></Field>
        <p className="muted small">Instant transfers have a 1.95% fee. The amount received must be at least $25.00.</p>
      </div>}
      {error && <p className="dialog-error error" role="alert">{error}</p>}
      <div className="actions">
        {reviewed ? <button type="button" className="button secondary" onClick={() => { review(null); setError('') }}>Back to edit</button> : <button type="button" className="button secondary" onClick={close}>Cancel</button>}
        <button className="button primary" type="submit" disabled={!reviewed && (!balance || !destinations.length)}>{reviewed ? 'Confirm transfer' : 'Review transfer'}</button>
      </div>
    </form>
  </Dialog>
}

export function PayoutRoute() {
  const { payoutId } = useParams()
  const { state } = useStore()
  const payout = find(state.payouts, payoutId)
  if (!payout) return <Recovery title="Payout unavailable" message="This payout could not be found." to="/payouts" action="Back to payouts" />
  const entries = rows(state.payoutEntries).filter((entry) => entry.payoutId === payoutId)
  return <>
    <Header title={'Payout ' + payout.id} subtitle={date(payout.createdAt, true)} back={['/payouts', 'Payouts']} action={<Status value={payout.status} />} />
    <Notice id={payoutId} />
    <div className="grid">
      <section className="card">
        <h2>Settlement entries</h2>
        <Table label="Settlement entries" headings={['Entry', '$Gross', '$Fee', '$Net']} entries={entries} empty="No settlement entries recorded for this payout." render={(entry, index) => {
          const payment = find(state.payments, entry.paymentId)
          const order = find(state.orders, payment?.orderId)
          const refund = find(state.refunds, entry.refundId)
          return <tr key={entry.id ?? index}>
            <td>{label(entry.type)}<div className="muted small">{refund ? <RouteLink to={'/refunds/' + encodeURIComponent(refund.id)}>{refund.id}</RouteLink> : order ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : payment ? <RouteLink to={'/refunds?payment=' + encodeURIComponent(payment.id)}>{ref(payment, 'receiptNumber')}</RouteLink> : entry.refundId || entry.paymentId || entry.id}</div></td>
            <td className="number">{money(entry.grossAmount, entry.currency)}</td><td className="number">{money(entry.feeAmount, entry.currency)}</td><td className="number">{money(entry.netAmount, entry.currency)}</td>
          </tr>
        }} />
      </section>
      <section className="card">
        <h2>Transfer summary</h2>
        <Facts entries={[
          ['Location', nameOf(state.locations, payout.locationId)], ['Method', label(payout.method)], ['Destination', masked(find(state.destinations, payout.destinationId))],
          ['Gross amount', money(payout.amount, payout.currency)], ['Fee', money(payout.feeAmount, payout.currency)], ['Net amount', money(payout.netAmount, payout.currency)],
          ['Estimated arrival', date(payout.estimatedArrivalAt, true)],
        ]} />
      </section>
    </div>
  </>
}


