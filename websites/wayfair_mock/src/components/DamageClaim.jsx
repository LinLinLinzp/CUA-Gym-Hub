import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAccount } from '../context/Account.jsx'
import { submitClaim } from '../data/actions.js'
import { attachmentTypes, findRecord, issueTypes, itemEligibility, label, maxAttachmentBytes, orderNumber, records, resolutions } from '../data/rules.js'
import { Dialog, DialogButtons, useConfirmation } from './Dialog.jsx'
import { QuantityField, SelectField } from './Fields.jsx'
import { OrderChooser } from './RequestFields.jsx'

function PhotoPreview({ file, onRemove }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return <li className="photo-preview">
    <span className="photo-image">{url && <img src={url} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}</span>
    <span className="wrap-text">{file.name}</span>
    <button type="button" className="icon-button" title="Remove photo" aria-label={'Remove ' + file.name} onClick={onRemove}>
      <X size={18} aria-hidden="true" />
    </button>
  </li>
}

function Photos({ files, setFiles }) {
  const key = useRef(0)
  const [error, setError] = useState('')
  function addPhotos(event) {
    const chosen = Array.from(event.currentTarget.files)
    const valid = chosen.filter((file) => attachmentTypes.includes(file.type) && file.size <= maxAttachmentBytes)
    const room = 3 - files.length
    if (valid.length < chosen.length) setError('Choose JPEG or PNG photos no larger than 5 MB each.')
    else if (valid.length > room) setError('You can add up to three photos.')
    else setError('')
    setFiles([...files, ...valid.slice(0, room).map((file) => ({ file, id: key.current++ }))])
    event.currentTarget.value = ''
  }
  return <div className="section-stack">
    <label className="field">
      <span>Photos (optional)</span>
      <input type="file" multiple accept={attachmentTypes.join(',')} disabled={files.length >= 3} onChange={addPhotos} />
      <small className="muted">Up to three JPEG or PNG files, 5 MB each.</small>
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {files.length > 0 && <ul className="photos-list">
      {files.map(({ file, id }) => <PhotoPreview key={id} file={file} onRemove={() => {
        setFiles(files.filter((entry) => entry.id !== id))
        setError('')
      }} />)}
    </ul>}
  </div>
}

export function DamageClaimDialog({ initialOrderId, initialItemId, onClose, onSuccess }) {
  const { state, transact } = useAccount()
  const [orderId, setOrderId] = useState(initialOrderId)
  const [itemId, setItemId] = useState(initialItemId)
  const [quantity, setQuantity] = useState('1')
  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [requestedResolution, setRequestedResolution] = useState('')
  const [files, setFiles] = useState([])
  const [review, setReview] = useState(false)
  const [descriptionError, setDescriptionError] = useState('')
  const order = findRecord(state.orders, orderId)
  const selected = findRecord(order?.items, itemId)
  const candidates = records(order?.items).filter((item) => item.id).map((item) => ({ item, ...itemEligibility(state, order, item, 'claim') }))
  const eligible = candidates.find(({ item, reason }) => item.id === itemId && !reason)
  const attachments = files.map(({ file: { name, size, type } }) => ({ name, size, type }))
  const { confirm, pending, error, clearError } = useConfirmation(
    () => transact((current, now) => submitClaim(current, now, {
      orderId, orderItemId: itemId, quantity, issueType, description, requestedResolution, attachments,
    })),
    onSuccess,
  )

  function showReview(event) {
    event.preventDefault()
    if (description.trim().length < 10) {
      setDescriptionError('Enter at least 10 characters describing the issue.')
      event.currentTarget.elements.description.focus()
      return
    }
    if (eligible) setReview(true)
  }

  return <Dialog title={review ? 'Review damage claim' : 'Report damage'} onClose={onClose} pending={pending}>
    {review ? <form className="dialog-body" onSubmit={confirm}>
      <div className="review-panel"><h3>{selected?.name || 'Order item'}</h3><p>Order {orderNumber(order)} · Quantity {quantity}</p></div>
      <div><h3>Issue</h3><p>{label(issueType)}</p><p className="preserve-text">{description.trim()}</p></div>
      <div><h3>Preferred resolution</h3><p>{label(requestedResolution)}</p></div>
      {attachments.length > 0 && <div><h3>Photos</h3><ul className="review-items wrap-text">{attachments.map((file, index) => <li key={index}>{file.name}</li>)}</ul></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <DialogButtons onBack={() => { clearError(); setReview(false) }} submitLabel="Submit damage claim" pending={pending} />
    </form> : <form className="dialog-body" onSubmit={showReview}>
      <OrderChooser orders={state.orders} value={orderId} onChange={(value) => { setOrderId(value); setItemId(''); setQuantity('1') }} />
      {order && <>
        <SelectField title="Item" value={eligible ? itemId : ''} required placeholder="Choose an item"
          onChange={(value) => { setItemId(value); setQuantity('1') }}
          options={candidates.map(({ item, reason }) => ({ value: item.id, label: item.name || 'Order item', disabled: Boolean(reason) }))} />
        {candidates.filter(({ reason }) => reason).map(({ item, reason }) => <p className="meta muted" key={item.id}>{item.name || 'Order item'} · {reason}</p>)}
        {!candidates.length && <p className="muted">Item details are unavailable for this order.</p>}
      </>}
      {eligible && <>
        <QuantityField value={quantity} limit={eligible.quantity} onChange={setQuantity} />
        <SelectField title="Issue type" options={issueTypes} value={issueType} onChange={setIssueType} required placeholder="Choose an issue" />
        <label className="field">
          <span>Description</span>
          <textarea required name="description" value={description} maxLength={1000} aria-describedby="claim-description-help"
            aria-invalid={descriptionError ? true : undefined} onChange={(event) => { setDescription(event.currentTarget.value); setDescriptionError('') }} />
          <small className={descriptionError ? 'field-error' : 'muted'} id="claim-description-help" role={descriptionError ? 'alert' : undefined}>
            {descriptionError || 'Use 10–1,000 characters to describe what happened.'}
          </small>
        </label>
        <SelectField title="Preferred resolution" options={resolutions} value={requestedResolution} onChange={setRequestedResolution} required placeholder="Choose a resolution" />
        <Photos files={files} setFiles={setFiles} />
      </>}
      <DialogButtons onBack={onClose} backLabel="Close" submitLabel="Review claim" disabled={!eligible} />
    </form>}
  </Dialog>
}
