import React, { useRef, useState } from 'react'
import { useAccount } from './account.jsx'
import { redeemReward, rewardBlock } from './actions.js'
import {
  AccountLink, Badge, Dialog, Empty, Heading, ProductArt, SectionHeading, SelectFilter,
  date, human, list, newest, orderNumber, paths, points, returnNumber,
} from './ui.jsx'

const types = {
  opening_balance: 'Opening balance', earn: 'Purchase earnings', bonus: 'Bonus points',
  redeem: 'Redemptions', return_adjustment: 'Return adjustments',
}
const rewardArt = ['skincare', 'makeup', 'skincare', 'fragrance', 'skincare', 'hair', 'makeup', 'body']

export function BeautyInsider() {
  const { state, commit } = useAccount()
  const [activity, setActivity] = useState('')
  const confirmed = useRef(false)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const member = state.beautyInsider
  const rewards = list(state.rewards)
  const ledger = newest(list(state.pointsTransactions), 'createdAt')
  const orders = new Map(list(state.orders).map((order) => [order.id, order]))
  const returns = new Map(list(state.returns).map((request) => [request.id, request]))
  const matches = ledger.filter((entry) => !activity || entry.type === activity)
  const availableTypes = [...new Set([...Object.keys(types), ...ledger.map((entry) => entry.type).filter(Boolean)])]
  const reward = rewards.find((entry) => entry.id === selected)

  async function confirm() {
    if (!reward || confirmed.current) return
    const result = await commit((current) => redeemReward(current, reward.id))
    if (result.error) {
      setError(result.error)
      return
    }
    confirmed.current = true
    setSelected(null)
    setNotice(result.record.rewardName + ' redeemed. Your balance is ' + points(result.state.beautyInsider.pointsBalance) + ' points.')
  }

  return <>
    <Heading title="Beauty Insider" description="Check your Beauty Bank and redeem points for rewards." />
    <section className="member-banner card">
      <div>
        <SectionHeading title="Beauty Bank" />
        {member?.tier && <span className="badge tier">{member.tier}</span>}
        {member?.memberSince && <p className="metadata">Member since {date(member.memberSince)}</p>}
      </div>
      <p className="balance"><strong>{points(member?.pointsBalance)}</strong> points</p>
    </section>
    <section className="spaced-section" aria-label="Rewards catalog">
      <SectionHeading title="Rewards catalog" />
      {notice && <p className="notice" role="status">{notice}</p>}
      {rewards.length ? <ul className="reward-grid">{rewards.map((offer, index) => {
        const blocked = rewardBlock(state, offer)
        return <li className="card reward" key={offer.id ?? index}>
          <ProductArt category={rewardArt[index % rewardArt.length]} />
          <h3>{offer.name || offer.id || 'Reward'}</h3>
          {offer.description && <p className="muted">{offer.description}</p>}
          <p className="reward-cost">{points(offer.pointsCost)} points</p>
          <button type="button" className="button secondary" disabled={Boolean(blocked)}
            aria-label={blocked ? undefined : 'Redeem ' + (offer.name || offer.id)}
            onClick={() => { confirmed.current = false; setError(''); setSelected(offer.id) }}>{blocked || 'Redeem'}</button>
        </li>
      })}</ul> : <Empty title="No rewards available"><p className="muted">Available rewards will appear here.</p></Empty>}
    </section>
    <section className="spaced-section" aria-label="Points activity">
      <SectionHeading title="Points activity">
        <SelectFilter label="Activity type" value={activity} onChange={setActivity}
          options={[[ '', 'All activity'], ...availableTypes.map((key) => [key, types[key] || human(key)])]} />
      </SectionHeading>
      {matches.length ? <div className="history card"><ul className="rows">{matches.map((entry, index) => {
        const order = entry.orderId && orders.get(entry.orderId)
        const request = entry.returnId && returns.get(entry.returnId)
        const delta = entry.pointsDelta
        return <li className="ledger-row" key={entry.id ?? index}>
          <div><strong>{entry.description || types[entry.type] || human(entry.type)}</strong>
            <span className="metadata">{date(entry.createdAt)} · {types[entry.type] || human(entry.type)}</span>
            <div className="ledger-links">
              {order && <AccountLink to={paths.order(order.id)}>{orderNumber(order)}</AccountLink>}
              {request && <AccountLink to={paths.request(request.id)}>{returnNumber(request)}</AccountLink>}
            </div>
          </div>
          <div className="ledger-amount">
            <strong className={delta >= 0 ? 'positive' : ''}>{Number.isInteger(delta) ? (delta > 0 ? '+' : delta < 0 ? '−' : '') + points(Math.abs(delta)) : '—'} pts</strong>
            {Number.isInteger(entry.balanceAfter) && <span className="metadata">Balance {points(entry.balanceAfter)}</span>}
          </div>
        </li>
      })}</ul></div> : <Empty title={activity ? 'No matching activity' : 'No points activity yet'}>
        {activity && <button type="button" className="button secondary" onClick={() => setActivity('')}>Show all activity</button>}
      </Empty>}
    </section>
    {reward && <Dialog title="Confirm redemption" close={() => setSelected(null)}>
      <p>Redeem <strong>{reward.name || reward.id}</strong> for <strong>{points(reward.pointsCost)} points</strong>?</p>
      <p className="metadata">Remaining balance after redemption {points(member?.pointsBalance - reward.pointsCost)} points</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="button secondary" onClick={() => setSelected(null)}>Keep my points</button>
        <button className="button" onClick={confirm}>Confirm redemption</button>
      </div>
    </Dialog>}
  </>
}
