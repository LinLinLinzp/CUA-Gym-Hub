import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { bookingFor, credits, creditStatus, eligibleCredit, list, normalize } from '../data/account.js'
import { AppLink, Empty, Field, Heading, Status, Tabs, creditType, dateOnly, dateTime, money, tripPath } from '../ui.jsx'

const creditTabs = [['available', 'Available'], ['expired', 'Expired'], ['used', 'Used']]

export function CreditsPage() {
  const { creditId } = useParams()
  return creditId ? <CreditDetail creditId={creditId} /> : <CreditWallet />
}

function CreditWallet() {
  const { world } = useStore()
  const [tab, setTab] = useState('available')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('soonest')
  const wallet = credits(world)
  const visible = wallet.filter(credit => creditStatus(credit) === tab &&
    normalize([credit.code, credit.id, credit.ownerName].join(' ')).includes(normalize(query))).sort((a, b) => {
    if (!a.expiresOn) return b.expiresOn ? 1 : 0
    if (!b.expiresOn) return -1
    return sort === 'soonest' ? String(a.expiresOn).localeCompare(b.expiresOn) : String(b.expiresOn).localeCompare(a.expiresOn)
  })
  const available = wallet.filter(credit => eligibleCredit(world, credit))
  const balance = available.reduce((total, item) => total + Math.round(item.remainingAmount * 100), 0) / 100
  return <>
    <Heading title="Travel credits">Track your credit balances, expiration dates and recent use.</Heading>
    <section className="panel credit-balance"><div><h2>Eligible credit balance</h2><div className="metric">{money(balance)}</div></div>
      <span className="meta">{available.length} {available.length === 1 ? 'credit' : 'credits'} available for booking</span>
    </section>
    <section className="panel section-gap">
      <h2>Credit wallet</h2>
      <Tabs label="Credit status" options={creditTabs} selected={tab} onChange={setTab} />
      <div className="filters">
        <Field label="Search credits"><input type="search" placeholder="Credit code or owner" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Expiration date"><select value={sort} onChange={event => setSort(event.target.value)}><option value="soonest">Earliest first</option><option value="latest">Latest first</option></select></Field>
      </div>
      {visible.length ? <ul className="record-list credit-list" aria-label="Matching credits">{visible.map((credit, i) => <li key={credit.id || i}>
        <div className="record-main"><strong>{creditType(credit.type)}</strong><span>{credit.code || credit.id || 'Identifier unavailable'} · {credit.ownerName || 'Owner unavailable'}</span>
          <span>Expires {dateOnly(credit.expiresOn)}</span></div>
        <div className="credit-amount"><strong>{money(credit.remainingAmount)}</strong><span className="meta">Original {money(credit.originalAmount)}</span></div>
        <div className="record-actions"><Status value={creditStatus(credit)} />
          {credit.id && <AppLink to={'/credits/' + encodeURIComponent(credit.id)} aria-label={'View credit ' + (credit.code || credit.id)}>View credit <span aria-hidden="true">→</span></AppLink>}</div>
      </li>)}</ul> : <Empty title="No matching travel credits">{query ? 'Try a different search.' : 'Credits with this status will appear here.'}</Empty>}
    </section>
  </>
}

function CreditDetail({ creditId }) {
  const { world } = useStore()
  const credit = credits(world).find(item => item.id === creditId)
  if (!credit) return <><Heading title="Credit unavailable" /><Empty title="We could not find this credit."><AppLink to="/credits">Back to travel credits</AppLink></Empty></>
  const source = bookingFor(world, credit.sourceBookingId)
  const history = list(world.creditRedemptions).filter(item => item.creditId === creditId)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  return <>
    <AppLink to="/credits" className="back">← Travel credits</AppLink>
    <Heading title={creditType(credit.type)} actions={<Status value={creditStatus(credit)} />}>
      {credit.code || credit.id}{credit.ownerName && ' · ' + credit.ownerName}
    </Heading>
    <div className="content-split">
      <section className="panel">
        <h2>Credit details</h2>
        <dl className="payment">
          <div><dt>Original amount</dt><dd>{money(credit.originalAmount)}</dd></div>
          <div><dt>Expiration date</dt><dd>{dateOnly(credit.expiresOn)}</dd></div>
          <div className="payment-total"><dt>Remaining balance</dt><dd>{money(credit.remainingAmount)}</dd></div>
        </dl>
        <div className="actions">
          {eligibleCredit(world, credit) && <AppLink to={'/book?credit=' + encodeURIComponent(credit.id)} className="button primary">Use credit</AppLink>}
          {source?.id && <AppLink to={tripPath(source)} className="button secondary">View source trip</AppLink>}
        </div>
      </section>
      <section className="panel sidebar-panel">
        <h2>Usage history</h2>
        {history.length ? <ul className="record-list" aria-label="Credit usage">{history.map((item, index) => {
          const booking = bookingFor(world, item.bookingId)
          return <li key={item.id || index}>
            <div className="record-main"><strong>{money(item.amount)} applied</strong><span>{dateTime(item.createdAt)}</span>
              <span>Balance after use {money(item.remainingBalance)}</span>
              {booking?.id && <AppLink to={tripPath(booking)}>{booking.confirmationCode || 'View trip'}</AppLink>}
            </div>
          </li>
        })}</ul> : <Empty title="No usage recorded">Redemptions will appear here after the credit is applied.</Empty>}
      </section>
    </div>
  </>
}
