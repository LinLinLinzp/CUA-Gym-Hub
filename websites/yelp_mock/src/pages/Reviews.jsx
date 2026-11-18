import React, { useState } from 'react'
import { actor, append, businessName, compareCreated, displayDate, find, newId, published, records, stamp, update } from '../model.js'
import { useWorld } from '../store.jsx'
import { BusinessLink, Dialog, Empty, Field, Heading, Row, Status } from '../ui.jsx'

export function ReviewEditor({ business, review, close }) {
  const { world, mutate } = useWorld()
  const [businessId, setBusiness] = useState(business?.id || '')
  const existing = review || published(world).find(item => item.businessId === businessId)
  return <Dialog title={existing ? 'Edit review' : 'Write a review'} close={close}>
    {business ? <p>{businessName(business)}</p> :
      <Field label="Business" name="review-business"><select value={businessId} onChange={event => setBusiness(event.target.value)}>
        <option value="">Choose a business</option>
        {records(world, 'businesses').map(item => <option value={item.id} key={item.id}>{businessName(item)}</option>)}
      </select></Field>}
    {businessId && <ReviewFields key={businessId} businessId={businessId} review={existing} mutate={mutate} close={close} />}
  </Dialog>
}

function ReviewFields({ businessId, review, mutate, close }) {
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [text, setText] = useState(review?.text ?? '')
  const [submitted, setSubmitted] = useState(false)
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5
  const length = text.trim().length

  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
    if (!validRating || length < 85) return
    const saved = mutate(world => {
      if (!actor(world) || !find(world, 'businesses', businessId)) return
      const ownReviews = published(world)
      if (review) {
        const existing = ownReviews.find(item => item.id === review.id && item.businessId === businessId)
        if (!existing || (existing.rating === rating && existing.text === text.trim())) return
        return update(world, 'reviews', review.id, { rating, text: text.trim(), updatedAt: stamp() })
      }
      if (ownReviews.some(item => item.businessId === businessId)) return
      return append(world, 'reviews', {
        id: newId('rev'), userId: world.currentUserId, businessId, rating, text: text.trim(), status: 'published', createdAt: stamp(),
      })
    }, review ? 'Review updated.' : 'Review published.')
    if (saved || (review?.rating === rating && review?.text === text.trim())) close()
  }

  return <form className="stack review-fields" onSubmit={submit} noValidate>
    <fieldset aria-describedby={submitted && !validRating ? 'rating-error' : undefined}>
      <legend>Rating</legend>
      <div className="choices">{[1, 2, 3, 4, 5].map(value =>
        <label className="choice" key={value}><input type="radio" name="rating" aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
          value={value} checked={rating === value} onChange={() => setRating(value)} /><span aria-hidden="true">{value} ★</span></label>
      )}</div>
      {submitted && !validRating && <p id="rating-error" className="field-error">Choose a rating.</p>}
    </fieldset>
    <Field label="Your review" name="review-text" error={submitted && length < 85 ? 'Enter at least 85 characters.' : undefined}>
      <textarea value={text} onChange={event => setText(event.target.value)} />
    </Field>
    <p className="metadata">{length} characters · 85 minimum</p>
    <div className="form-actions"><button type="button" onClick={close}>Cancel</button>
      <button type="submit" className="primary">{review ? 'Save changes' : 'Post review'}</button></div>
  </form>
}

function RemoveReview({ review, close }) {
  const { mutate } = useWorld()
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
    if (!reason.trim()) return
    if (mutate(world => {
      if (!actor(world) || !published(world).some(item => item.id === review.id)) return
      const time = stamp()
      return update(world, 'reviews', review.id, { status: 'removed', removalReason: reason.trim(), removedAt: time, updatedAt: time })
    }, 'Review removed.')) close()
  }

  return <Dialog title="Remove review?" close={close}>
    <p>This review will be removed from your account and from the business page.</p>
    <form className="stack" onSubmit={submit} noValidate>
      <Field label="Reason for removal" name="removal-reason" error={submitted && !reason.trim() ? 'Enter a reason.' : undefined}>
        <textarea value={reason} onChange={event => setReason(event.target.value)} />
      </Field>
      <div className="form-actions"><button type="button" onClick={close}>Keep review</button>
        <button type="submit" className="primary">Confirm removal</button></div>
    </form>
  </Dialog>
}

export function Reviews() {
  const { world } = useWorld()
  const [editor, setEditor] = useState(null)
  const [removal, setRemoval] = useState(null)
  const [sort, setSort] = useState('newest')
  const user = actor(world)
  const reviews = published(world).sort((a, b) => compareCreated(a, b, sort === 'oldest'))
  const canWrite = user && records(world, 'businesses').length > 0
  return <>
    <Heading title="My reviews" actions={canWrite && <button type="button" className="primary" onClick={() => setEditor({})}>Write a review</button>}>
      See and manage what you’ve shared about local businesses.
    </Heading>
    {reviews.length > 0 && <div className="list-toolbar"><Field label="Sort reviews" name="review-sort">
      <select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="newest">Newest</option><option value="oldest">Oldest</option>
      </select>
    </Field></div>}
    {reviews.length ? <div className="record-list">{reviews.map(review => {
      const business = find(world, 'businesses', review.businessId)
      return <Row key={review.id} business={business} title={<BusinessLink business={business} />}
        actions={user && <>
          {business && <button type="button" onClick={() => setEditor({ business, review })}>Edit review</button>}
          <button type="button" className="danger" onClick={() => setRemoval(review)}>Remove review</button>
        </>}>
        <p className="metadata">{Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 && `★ ${review.rating} / 5 · `}{displayDate(review.createdAt)}</p>
        <div><Status value="published" /></div><p className="review-text">{review.text || 'Review text unavailable'}</p>
      </Row>
    })}</div> : <Empty title="No published reviews" to="/discover" label="Discover businesses">Reviews you publish will appear here.</Empty>}
    {editor && <ReviewEditor {...editor} close={() => setEditor(null)} />}
    {removal && <RemoveReview review={removal} close={() => setRemoval(null)} />}
  </>
}
