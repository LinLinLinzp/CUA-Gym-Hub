import { useState } from 'react'
import { useAccount } from '../context/Account.jsx'
import { cancelItems } from '../data/actions.js'
import { cancelReasons, findRecord, itemEligibility, label, records, unitCents } from '../data/rules.js'
import { Quote } from './Details.jsx'
import { Dialog, DialogButtons, useConfirmation } from './Dialog.jsx'
import { QuantityField, SelectField } from './Fields.jsx'
import { useToast } from './Feedback.jsx'

export function CancelItemsDialog({ order, onClose }) {
  const { state, transact } = useAccount()
  const toast = useToast()
  const [selected, setSelected] = useState({})
  const [reason, setReason] = useState('')
  const [review, setReview] = useState(false)
  const [selectionError, setSelectionError] = useState('')
  const candidates = records(order.items).map((item) => ({ item, ...itemEligibility(state, order, item, 'cancel') }))
  const selections = Object.entries(selected).map(([orderItemId, quantity]) => ({ orderItemId, quantity }))
  const credit = selections.reduce((sum, line) => {
    const item = findRecord(order.items, line.orderItemId)
    return sum + (item ? unitCents(item) * Number(line.quantity) : 0)
  }, 0) / 100

  const { confirm, pending, error, clearError } = useConfirmation(
    () => transact((current, now) => cancelItems(current, now, { orderId: order.id, selections, reason })),
    (record) => { toast('Items canceled. Reference ' + record.id); onClose() },
  )

  function toggle(id, checked) {
    setSelectionError('')
    setSelected((previous) => {
      const next = { ...previous }
      if (checked) next[id] = '1'
      else delete next[id]
      return next
    })
  }

  function showReview(event) {
    event.preventDefault()
    if (!selections.length) { setSelectionError('Select at least one item to continue.'); return }
    setReview(true)
  }

  return <Dialog title={review ? 'Review cancellation' : 'Cancel items'} onClose={onClose} pending={pending}>
    {review ? <form className="dialog-body" onSubmit={confirm}>
      <ul className="review-items">
        {selections.map(({ orderItemId, quantity }) => <li key={orderItemId}>
          {findRecord(order.items, orderItemId)?.name || 'Item'} · Quantity {quantity}
        </li>)}
      </ul>
      <p><strong>Reason</strong> · {label(reason)}</p>
      <Quote rows={[[ 'Estimated credit', credit, true ]]} currency={order.currency} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <DialogButtons onBack={() => { clearError(); setReview(false) }} submitLabel="Confirm cancellation" pending={pending} danger />
    </form> : <form className="dialog-body" onSubmit={showReview}>
      <p className="muted">Select items still being prepared and the quantity you want to cancel.</p>
      <fieldset className="choices">
        <legend>Order items</legend>
        {candidates.map(({ item, quantity, reason: restriction }) => <div className="item-choice" key={item.id}>
          <label className="check-label">
            <input type="checkbox" checked={Object.hasOwn(selected, item.id)} disabled={!quantity}
              onChange={(event) => toggle(item.id, event.currentTarget.checked)} />
            <span>{item.name || 'Order item'}</span>
          </label>
          {restriction && <p className="muted meta">{restriction}</p>}
          {quantity > 0 && Object.hasOwn(selected, item.id) && <QuantityField value={selected[item.id]} limit={quantity} itemName={item.name}
            onChange={(value) => setSelected((current) => ({ ...current, [item.id]: value }))} />}
        </div>)}
      </fieldset>
      {selectionError && <p className="form-error" role="alert">{selectionError}</p>}
      <SelectField title="Cancellation reason" options={cancelReasons} value={reason} onChange={setReason} required
        placeholder="Choose a reason" />
      <DialogButtons onBack={onClose} backLabel="Keep items" submitLabel="Review cancellation" />
    </form>}
  </Dialog>
}
