import { useId, useState } from 'react'
import { Star } from 'lucide-react'
import { Dialog, ErrorMessage } from './ui'
import { ratingFields, restaurantName, submitReview } from './data/model'
import { useAccount } from './store'

function Rating({ name, value, onChange }) {
  const id = useId()
  const label = name[0].toUpperCase() + name.slice(1)
  return <fieldset className="rating">
    <legend>{label} {name !== 'overall' && <span className="optional">Optional</span>}</legend>
    <div className="stars">
      {[1, 2, 3, 4, 5].map(score => <label key={score} className={score <= value ? 'filled' : ''} title={label + ': ' + score + ' out of 5'}>
        <input type="radio" name={id} value={score} checked={value === score} aria-label={label + ': ' + score + ' out of 5'} onChange={() => onChange(score)} />
        <Star size={20} />
      </label>)}
    </div>
  </fieldset>
}

export function ReviewForm({ booking, onClose, onSuccess }) {
  const { state, commit, notify } = useAccount()
  const [ratings, setRatings] = useState({})
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const outcome = commit(data => submitReview(data, booking.id, { ...ratings, comment }))
    if (outcome.error) setError(outcome.error)
    else {
      notify('Review submitted.')
      onSuccess()
    }
  }
  return <Dialog title="Write a review" onClose={onClose}>
    <p className="muted review-restaurant">{restaurantName(state, booking.restaurantId)}</p>
    <form className="form" onSubmit={submit}>
      <div className="rating-grid">{ratingFields.map(name => <Rating key={name} name={name} value={ratings[name] || 0} onChange={value => {
        setRatings(old => ({ ...old, [name]: value }))
        if (name === 'overall') setError('')
      }} />)}</div>
      <label>Comment <span className="optional">Optional</span><textarea maxLength={1000} rows="3" value={comment} onChange={event => setComment(event.target.value)} />
        <span className="optional count">{comment.length.toLocaleString('en-US')} / 1,000 characters</span>
      </label>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Discard review</button><button type="submit" className="button primary">Submit review</button></div>
    </form>
  </Dialog>
}
