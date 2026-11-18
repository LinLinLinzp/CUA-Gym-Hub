import React, { useId, useState } from 'react'
import { deleteReview, saveReview } from './actions.js'
import { authorName, bookName } from './model.js'
import { Confirmation } from './shelves.jsx'
import { useReader } from './store.jsx'
import { bookPath, Cover, DialogActions, Empty, FieldError, Heading, Modal, SiteLink } from './ui.jsx'

export function Stars({ rating }) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
    ? <span className="stars"><span aria-hidden="true">{'★'.repeat(rating)}<span className="unfilled">{'☆'.repeat(5 - rating)}</span></span>
      <span className="sr-only">{rating} out of 5 stars</span></span>
    : <span className="muted">Unrated</span>
}

export function ReviewText({ review, excerpt = false }) {
  const [revealed, setRevealed] = useState(false)
  const body = review.body?.trim()
  if (!body) return null
  if (review.containsSpoilers && !revealed) return <div className="spoiler">
    <span>Contains spoilers</span><button className="text-button" onClick={() => setRevealed(true)}>Reveal spoilers</button>
  </div>
  return <p className={excerpt ? 'review-body excerpt' : 'review-body'}>{body}</p>
}

export function ReviewEditor({ bookId, onClose }) {
  const { bookById, reviews, commit } = useReader()
  const review = reviews.find(row => row.bookId === bookId)
  const [rating, setRating] = useState(review?.rating ?? null)
  const [body, setBody] = useState(review?.body || '')
  const [spoilers, setSpoilers] = useState(Boolean(review?.containsSpoilers))
  const [error, setError] = useState(null)
  return <Modal title={review ? 'Edit review' : 'Write a review'} onClose={onClose}>
    <p className="dialog-context">{bookName(bookById.get(bookId))}</p>
    <form onSubmit={async event => {
      event.preventDefault()
      const problem = await commit(state => saveReview(state, bookId, rating, body, spoilers), 'Review saved.')
      if (problem) setError(problem)
      else onClose()
    }}>
      <fieldset className="rating-field" aria-describedby={error ? 'review-error' : undefined}>
        <legend>Your rating</legend>
        <div className="rating-options">
          {[1, 2, 3, 4, 5].map(value => <label key={value}>
            <input className="sr-only" type="radio" name="rating" value={value} checked={rating === value}
              onChange={() => { setRating(value); setError(null) }} />
            <span aria-hidden="true">{value <= rating ? '★' : '☆'}</span>
            <span className="sr-only">{value} {value === 1 ? 'star' : 'stars'}</span>
          </label>)}
          {rating !== null && <button className="text-button" type="button" onClick={() => setRating(null)}>Clear rating</button>}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="review-text">Review text</label>
        <textarea id="review-text" data-initial-focus rows="5" value={body} onChange={event => { setBody(event.target.value); setError(null) }}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'review-error' : undefined} />
      </div>
      <label className="check-option"><input type="checkbox" checked={spoilers} onChange={event => setSpoilers(event.target.checked)} /> Contains spoilers</label>
      <FieldError id="review-error">{error}</FieldError>
      <DialogActions onClose={onClose} submit="Save review" />
    </form>
  </Modal>
}

export function ReviewDeletion({ review, onClose }) {
  const { commit } = useReader()
  return <Confirmation title="Delete your review?" onClose={onClose} submit="Delete review"
    onConfirm={() => commit(state => deleteReview(state, review.id), 'Review deleted.')}>
    This deletes the rating and review text. The book’s shelf and dates read stay in your library.
  </Confirmation>
}

export function ReviewIndex({ onReview, onDeleteReview }) {
  const { reviews, bookById } = useReader()
  const sorted = [...reviews].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  return <>
    <Heading title="My Reviews" description="Your ratings and notes on the books you’ve read." />
    {sorted.length ? <ul className="record-list">{sorted.map(review => {
      const book = bookById.get(review.bookId)
      return <li className="review-row panel" key={review.id}>
        <Cover book={book} className="thumbnail" />
        <div className="record-copy">
          <h3><SiteLink to={bookPath(review.bookId)}>{bookName(book)}</SiteLink></h3>
          <p className="muted">{authorName(book)}</p>
          <Stars rating={review.rating} />
          <ReviewText key={review.updatedAt} review={review} excerpt />
        </div>
        <div className="inline-actions">
          <button className="button secondary" aria-label={`Edit review for ${bookName(book)}`} onClick={() => onReview(review.bookId)}>Edit</button>
          <button className="text-button destructive" aria-label={`Delete review for ${bookName(book)}`} onClick={() => onDeleteReview(review)}>Delete</button>
        </div>
      </li>
    })}</ul> : <Empty title="No reviews yet"><p>Open a book to leave a rating or write a review.</p><SiteLink className="button secondary" to="/my-books">Browse My Books</SiteLink></Empty>}
  </>
}

export function BookReviews({ bookId, onReview, onDeleteReview }) {
  const { reviews, communityReviews, users } = useReader()
  const review = reviews.find(row => row.bookId === bookId)
  const community = communityReviews.filter(row => row.bookId === bookId)
  const id = useId()
  return <>
    <section className="panel detail-panel" aria-labelledby={id}>
      <div className="section-heading">
        <h2 id={id}>Your review</h2>
        <div className="inline-actions">
          <button className="button secondary" onClick={() => onReview(bookId)}>{review ? 'Edit review' : 'Write a review'}</button>
          {review && <button className="text-button destructive" onClick={() => onDeleteReview(review)}>Delete review</button>}
        </div>
      </div>
      {review ? <div><Stars rating={review.rating} /><ReviewText key={review.updatedAt} review={review} /></div>
        : <p className="muted">You haven’t rated or reviewed this book yet.</p>}
    </section>
    <section className="panel detail-panel">
      <h2>Community reviews</h2>
      {community.length ? <ul className="record-list community-list">{community.map(row =>
        <li key={row.id}><strong>{users.get(row.userId)?.displayName || 'Goodreads reader'}</strong>
          <Stars rating={row.rating} /><ReviewText review={row} />
        </li>)}</ul> : <p className="muted">No community reviews yet.</p>}
    </section>
  </>
}

