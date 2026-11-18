import { useEffect, useRef, useState } from 'react'
import { formIssue } from './data/actions.js'
import { find, free, priceInCents, reasons, refundItems, refundTotals, rows } from './data/model.js'
import { Dialog, human, money, paymentLabel, Receipt, seatLabel, SeatSummary, ticketCount } from './ui.jsx'

const titles = { transfer: 'Transfer tickets', listing: 'Sell tickets', refund: 'Request refund' }
const confirmLabels = { transfer: 'Send transfer', listing: 'Create listing', refund: 'Submit refund request' }
const success = { transfer: 'Transfer sent. You can track it in Transfers.', listing: 'Your listing is active. You can manage it in My Listings.', refund: 'Refund requested. You can track it in Refunds.' }

export function OrderAction({ kind, order, seats, world, commit, pending, onClose, onSuccess }) {
  const [ticketIds, setTicketIds] = useState([])
  const [fields, setFields] = useState({ name: '', email: '', price: '', payout: '', reason: '' })
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const reviewHeading = useRef(null)
  const isRefund = kind === 'refund'
  const payoutMethods = rows(world, 'payoutMethods').filter((method) => method.id && method.label && method.last4)
  const totals = isRefund ? refundTotals(refundItems(seats)) : null
  const payment = paymentLabel(find(world, 'paymentMethods', order.paymentMethodId))
  useEffect(() => { if (review) reviewHeading.current?.focus() }, [review])

  function change(e) {
    setFields({ ...fields, [e.target.name]: e.target.value })
    setError('')
  }

  function toggle(id) {
    setTicketIds((selected) => selected.includes(id) ? selected.filter((seat) => seat !== id) : [...selected, id])
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (pending) return
    if (review) {
      const problem = await commit(review.action)
      if (problem) setError(problem)
      else onSuccess(success[kind])
      return
    }
    const ids = isRefund ? seats.map((seat) => seat.id) : ticketIds
    if (!ids.length) return setError('Select at least one available seat.')
    const action = {
      type: kind, orderId: order.id, ticketIds: ids, ...fields,
      ...(isRefund && { reviewedTotal: totals.totalCents, reviewedAmounts: totals, reviewedPayment: order.paymentMethodId }),
    }
    const problem = formIssue(world, { ...action, quantity: ids.length })
    if (problem) return setError(problem)
    setError('')
    setReview({ action, totals, destination: isRefund ? payment : paymentLabel(find(world, 'payoutMethods', fields.payout)) })
  }

  return <Dialog title={titles[kind]} onClose={onClose} pending={pending}>
    <form onSubmit={submit} noValidate>
      {review ? <>
        <h3 className="review-heading" tabIndex={-1} ref={reviewHeading}>{kind === 'transfer' ? 'Review transfer' : kind === 'listing' ? 'Review listing' : 'Review refund request'}</h3>
        <p className="muted">{ticketCount(review.action.ticketIds.length)}</p>
        <SeatSummary world={world} ticketIds={review.action.ticketIds} />
        {kind === 'transfer' && <dl className="summary-meta"><div><dt>Recipient</dt><dd>{review.action.name.trim()}</dd></div><div><dt>Email</dt><dd>{review.action.email.trim()}</dd></div></dl>}
        {kind === 'listing' && <dl className="summary-meta">
          <div><dt>Price per ticket</dt><dd>{money(priceInCents(review.action.price, review.action.ticketIds.length))}</dd></div>
          <div><dt>Listing total</dt><dd>{money(priceInCents(review.action.price, review.action.ticketIds.length) * review.action.ticketIds.length)}</dd></div>
          <div><dt>Payout method</dt><dd>{review.destination}</dd></div>
        </dl>}
        {isRefund && <><dl className="summary-meta">
          <div><dt>Original payment</dt><dd>{review.destination}</dd></div>
          <div><dt>Reason</dt><dd>{reasons[review.action.reason]}</dd></div>
        </dl><Receipt totals={review.totals} finalLabel="Refund amount" /></>}
      </> : <>
        {isRefund ? <>
          <p>This request covers all {ticketCount(seats.length)} on the order. The refund goes to the original payment method.</p>
          <SeatSummary world={world} ticketIds={seats.map((seat) => seat.id)} />
          <dl className="summary-meta"><div><dt>Original payment</dt><dd>{payment}</dd></div></dl>
          <Receipt totals={totals} finalLabel="Refund amount" />
          <label className="field">Refund reason<select name="reason" value={fields.reason} onChange={change}>
            <option value="">Select a reason</option>
            {Object.entries(reasons).filter(([id]) => id !== 'event_canceled').map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
        </> : <>
          <fieldset className="seat-options">
            <legend>Select seats</legend>
            {seats.map((seat, index) => <label key={seat.id || index}>
              <input type="checkbox" disabled={!seat.id || !free(seat)} checked={ticketIds.includes(seat.id)} onChange={() => toggle(seat.id)} />
              <span>{seatLabel(seat)}</span>{(!seat.id || !free(seat)) && <small>{seat.holdId && seat.status === 'available' ? 'On hold' : seat.status === 'available' ? 'Unavailable' : human(seat.status)}</small>}
            </label>)}
          </fieldset>
          {kind === 'transfer' ? <>
            <label className="field">Recipient name<input autoComplete="off" name="name" value={fields.name} onChange={change} /></label>
            <label className="field">Recipient email<input autoComplete="off" type="email" name="email" value={fields.email} onChange={change} /></label>
          </> : <>
            <label className="field">Price per ticket (USD)<input name="price" inputMode="decimal" value={fields.price} onChange={change} placeholder="0.00" /></label>
            <label className="field">Payout method<select name="payout" value={fields.payout} onChange={change}>
              <option value="">Select a payout method</option>
              {payoutMethods.map((method) => <option value={method.id} key={method.id}>{paymentLabel(method)}</option>)}
            </select></label>
          </>}
        </>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {review && <button type="button" className="button secondary edit-review" disabled={pending} onClick={() => { setReview(null); setError('') }}>Back to edit</button>}
        <button type="button" className="button secondary" disabled={pending} onClick={onClose}>Cancel</button>
        <button type="submit" className="button primary" disabled={pending}>{review ? confirmLabels[kind] : 'Review'}</button>
      </div>
    </form>
  </Dialog>
}
