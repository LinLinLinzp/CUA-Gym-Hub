import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Gift, Sparkles, Star } from 'lucide-react'
import { AccountLink, Dialog, Empty, ErrorMessage, Heading, Photo, Tabs } from './ui'
import { BookingMeta } from './Reservations'
import { ReviewForm } from './ReviewForm'
import { useAccount } from './store'
import { prettyTimestamp } from './data/dates'
import { balance, canReview, latest, manageable, money, number, owned, points, posted, redeem, reservation, restaurantName, rewardAvailable, rows, start, venue } from './data/model'

const reviewTabs = ['To review', 'My reviews']

export function Reviews() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('view') === 'submitted' ? reviewTabs[1] : reviewTabs[0])
  const [editing, setEditing] = useState(null)
  const eligible = owned(state, 'reservations').filter(booking => canReview(state, booking))
    .sort((a, b) => start(state, b) - start(state, a) || latest(a, b))
  const submitted = owned(state, 'reviews').slice().sort(latest)
  const list = tab === reviewTabs[0] ? eligible : submitted

  return <>
    <Heading title="Reviews" />
    <div className="list-controls"><Tabs label="Review status" options={reviewTabs} value={tab} onChange={setTab} /></div>
    {list.length ? <section className="section">
      <div className="section-heading"><h2>{tab === reviewTabs[0] ? 'Visits to review' : 'Submitted reviews'}</h2><span>{list.length} {list.length === 1 ? 'visit' : 'visits'}</span></div>
      <div className="surface row-list">{list.map((item, index) => {
        const restaurant = venue(state, item.restaurantId)
        return <article className="booking-row review-row" key={item.id || index}>
          <Photo restaurant={restaurant} className="thumbnail" />
          <div className="row-body">
            <h3>{restaurant?.name || 'Restaurant unavailable'}</h3>
            {tab === reviewTabs[0] ? <BookingMeta booking={item} /> : <>
              <div className="review-meta">{item.overall != null && <strong><Star size={15} />{item.overall} / 5</strong>}
                <span>{prettyTimestamp(item.createdAt)}</span><span className="status completed">Submitted</span>
              </div>
              {item.comment && <p>{item.comment}</p>}
              <div className="review-breakdown">{['food', 'service', 'ambience', 'value'].filter(field => item[field] != null).map(field => <span key={field}>{field} {item[field]}/5</span>)}</div>
            </>}
          </div>
          {tab === reviewTabs[0] && item.id && <button type="button" className="button" onClick={() => setEditing(item)}>Write a review</button>}
          {tab === reviewTabs[1] && reservation(state, item.reservationId) && <AccountLink className="row-link" to={'/reservations/' + encodeURIComponent(item.reservationId)}>View visit <ArrowUpRight size={15} /></AccountLink>}
        </article>
      })}</div>
    </section> : <Empty title={tab === reviewTabs[0] ? 'You’re all caught up' : 'No submitted reviews'}>{tab === reviewTabs[0] ? 'Completed visits that are ready to review will appear here.' : 'Your reviews will appear here once you submit them.'}</Empty>}
    {editing && <ReviewForm booking={editing} onClose={() => setEditing(null)} onSuccess={() => { setEditing(null); setTab(reviewTabs[1]) }} />}
  </>
}

const activityTabs = ['All', 'Earned', 'Redeemed']
const creditName = credit => money(credit.amount, credit.currency || 'USD') + ' dining credit'

export function Points() {
  const { state, commit, notify } = useAccount()
  const [tab, setTab] = useState(activityTabs[0])
  const [reward, setReward] = useState(null)
  const redeeming = useRef(null)
  const [issued, setIssued] = useState(null)
  const [error, setError] = useState('')
  const now = new Date()
  const pending = owned(state, 'reservations').reduce((total, item) => manageable(state, item, now) ? total + points(item.potentialPoints) : total, 0)
  const options = rows(state.rewardOptions)
  const credits = owned(state, 'pointRedemptions').filter(item => item.status === 'issued').sort(latest)
  const activity = posted(state).filter(item => tab === 'All' || item.type === tab.toLowerCase()).sort(latest)
  const spendable = balance(state)

  function closeReward() {
    redeeming.current = null
    setReward(null)
    setError('')
  }
  function confirmReward() {
    if (redeeming.current !== reward.id) return
    const outcome = commit(data => redeem(data, reward.id))
    if (outcome.error) setError(outcome.error)
    else {
      closeReward()
      setIssued(outcome.result)
      notify('Dining credit issued.')
    }
  }

  return <>
    <Heading title="Dining Points" />
    <div className="points-overview">
      <section className="surface balance-panel"><div><h2>Available balance</h2><p>Use your points for dining credit.</p></div><strong>{number(spendable)} <span>pts</span></strong></section>
      <section className="surface balance-panel pending-panel"><div><h2>Pending points</h2><p>From upcoming confirmed reservations.</p></div><strong>{number(pending)} <span>pts</span></strong></section>
    </div>
    <section className="section">
      <div className="section-heading"><h2>Redeem points</h2></div>
      {issued && <div className="success-banner"><CheckCircle2 size={20} /><span><strong>{creditName(issued)} issued.</strong> {number(issued.pointsSpent)} points used.</span></div>}
      {options.length ? <div className="reward-grid">{options.map((item, index) => {
        const available = rewardAvailable(state, item)
        const name = item.name || creditName(item)
        return <article className="surface panel reward-card" key={item.id || index}>
          <div className="reward-icon"><Gift size={22} /></div><h3>{name}</h3>
          <p>{number(item.pointsCost)} points · {money(item.amount, item.currency || 'USD')} {item.currency || 'USD'}</p>
          {!available && <p className="pending-text">{points(item.pointsCost) > spendable ? 'Insufficient balance' : 'Reward unavailable'}</p>}
          <button type="button" className={'button ' + (available ? 'primary' : '')} disabled={!available} onClick={() => { redeeming.current = item.id; setReward(item) }} aria-label={'Redeem ' + name}>Redeem credit</button>
        </article>
      })}</div> : <Empty title="No dining credits available" />}
    </section>
    {credits.length > 0 && <section className="section">
      <div className="section-heading"><h2>Issued dining credits</h2><span>{credits.length} {credits.length === 1 ? 'credit' : 'credits'}</span></div>
      <div className="surface activity-list">{credits.map((item, index) => <article className="activity-row" key={item.id || index} id={item.id ? 'credit-' + item.id : undefined}>
        <div className="activity-icon"><Gift size={19} /></div><div><h3>{creditName(item)}</h3><span>{prettyTimestamp(item.createdAt)} · {number(item.pointsSpent)} points used</span></div><span className="status completed">Issued</span>
      </article>)}</div>
    </section>}
    <section className="section">
      <div className="section-heading"><h2>Points activity</h2></div>
      <Tabs label="Points activity type" options={activityTabs} value={tab} onChange={setTab} />
      {activity.length ? <div className="surface activity-list">{activity.map((item, index) => {
        const booking = reservation(state, item.reservationId)
        const credit = credits.find(row => row.id === item.redemptionId)
        const amount = points(item.points)
        return <article className="activity-row" key={item.id || index}>
          <div className="activity-icon">{item.type === 'earned' ? <Sparkles size={18} /> : <Gift size={18} />}</div>
          <div><h3>{item.type === 'earned' ? 'Points earned' : item.type === 'redeemed' ? 'Points redeemed' : 'Points activity'}</h3>
            <div className="activity-meta"><span>{prettyTimestamp(item.createdAt)}</span>
              {booking && <AccountLink to={'/reservations/' + encodeURIComponent(booking.id)}>{restaurantName(state, booking.restaurantId)}</AccountLink>}
              {credit && <a href={'#credit-' + encodeURIComponent(credit.id)}>{creditName(credit)}</a>}
            </div>
          </div>
          <strong className={amount > 0 ? 'earned-amount' : ''}>{amount > 0 ? '+' : ''}{number(amount)} pts</strong>
        </article>
      })}</div> : <Empty title="No points activity" />}
    </section>
    {reward && <Dialog title="Redeem dining credit?" onClose={closeReward}>
      <p><strong>{reward.name || creditName(reward)}</strong></p>
      <p>Use {number(reward.pointsCost)} points for {money(reward.amount, reward.currency || 'USD')} {reward.currency || 'USD'} in dining credit.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="form-actions"><button type="button" className="button" onClick={closeReward}>Keep points</button><button type="button" className="button primary" onClick={confirmReward}>Confirm redemption</button></div>
    </Dialog>}
  </>
}
