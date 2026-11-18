import { useState } from 'react'
import {
  cents, compact, creditGroup, currencyOf, dateLabel, dollars, eventRecord, fail, isUnlinked, money,
  normalize, number, rows, sameName, signedIn, tripPath, validMoney,
} from './domain.js'
import { Lookup } from './Lookup.jsx'
import { useStore } from './store.jsx'
import { AccountLink, Badge, Empty, Heading, Icon, Tabs } from './ui.jsx'

const tabs = ['Available', 'Expired', 'Used']
const sources = { cancellation: 'Canceled trip', change: 'Flight change', travel_credit: 'Travel credit' }

export function availableCredits(state) {
  return rows(state.eCredits).filter((credit) => credit.id && signedIn(credit, state.account)
    && creditGroup(credit) === 'Available' && validMoney(credit.remainingAmount))
}

function lookupCredit(state, values, creditId) {
  const reference = compact(values.reference)
  if (!/^\d{13}$/.test(reference) || !normalize(values.firstName) || !normalize(values.lastName)) {
    return fail('Enter a 13-digit eCredit number and both holder names.')
  }
  const record = rows(state.eCredits).find((credit) => credit.id && (!creditId || creditId === credit.id)
    && compact(credit.number) === reference && sameName(credit.holderFirstName, values.firstName)
    && sameName(credit.holderLastName, values.lastName))
  return record ? { record } : fail('No eCredit matches those details. Check the number and the original ticket holder’s name.')
}

function linkCredit(state, values, creditId) {
  const { record, error } = lookupCredit(state, values, creditId)
  if (error) return fail(error)
  if (!state.account?.id || !isUnlinked(record)) return fail('This eCredit is already linked or unavailable.')
  const action = {
    ...eventRecord(state.account.id, 'ecredit-action'), eCreditId: creditId, type: 'linked', status: 'completed',
  }
  return {
    state: {
      ...state,
      eCredits: rows(state.eCredits).map((credit) => credit === record
        ? { ...credit, accountId: action.actorId, linkedAt: action.createdAt } : credit),
      eCreditActions: [...rows(state.eCreditActions), action],
    },
  }
}

function FindCredit({ onClose, onAdded }) {
  const { state, commit } = useStore()
  return <Lookup title="Find an eCredit" referenceLabel="eCredit number" button="Search for eCredit"
    onClose={onClose} findMatch={(values) => lookupCredit(state, values)}
    renderMatch={(credit, values, setError) => <>
      <div aria-live="polite">
        <h3>{money(credit.remainingAmount, currencyOf(credit))} eCredit</h3>
        <p className="muted">{credit.number} · Expires {dateLabel(credit.expiresOn)}</p>
      </div>
      {signedIn(credit, state.account) ? <p>This eCredit is already in your wallet.</p>
        : isUnlinked(credit) ? <button className="button primary" onClick={async () => {
          const result = await commit((latest) => linkCredit(latest, values, credit.id))
          if (result.error) setError(result.error)
          else onAdded(credit)
        }}>Add to wallet</button> : <p>This eCredit is linked to another account.</p>}
    </>} />
}

export function ECredits() {
  const { state } = useStore()
  const [tab, setTab] = useState('Available')
  const [lookup, setLookup] = useState(false)
  const [added, setAdded] = useState(null)
  const credits = rows(state.eCredits).filter((credit) => signedIn(credit, state.account))
  const available = availableCredits(state)
  const totals = new Map()
  for (const credit of available) {
    const currency = currencyOf(credit)
    totals.set(currency, (totals.get(currency) || 0) + cents(credit.remainingAmount))
  }
  const firstExpiry = available.map(({ expiresOn }) => expiresOn).sort()[0]
  const groups = credits.some((credit) => creditGroup(credit) === 'Unavailable') ? [...tabs, 'Unavailable'] : tabs
  const filtered = credits.filter((credit) => creditGroup(credit) === tab)
    .sort((a, b) => String(a.expiresOn ?? '').localeCompare(String(b.expiresOn ?? '')))
  const tripIds = new Set(rows(state.trips).filter((trip) => signedIn(trip, state.account)).map(({ id }) => id))

  return <>
    <Heading title="eCredits" description="Check your travel credits and apply them to a new flight.">
      <button className="button primary" onClick={() => setLookup(true)}><Icon name="search" size={17} />Find an eCredit</button>
    </Heading>
    {added && <p role="status" className="notice">eCredit {added.number} was added to your wallet.</p>}
    <dl className="card metrics">
      <div><dt>Available balance</dt><dd>{totals.size ? [...totals].map(([currency, total]) => money(dollars(total), currency)).join(' · ') : money(0)}</dd></div>
      <div><dt>Available credits</dt><dd>{number(available.length)}</dd></div>
      <div><dt>Next expiration</dt><dd>{firstExpiry ? dateLabel(firstExpiry) : '—'}</dd></div>
    </dl>
    <div className="toolbar">
      <Tabs label="Wallet status" choices={groups} selected={tab} onSelect={setTab} />
      {available.length > 0 && <AccountLink className="button" to="/ecredits/redeem">Redeem an eCredit<Icon name="arrow" size={17} /></AccountLink>}
    </div>
    {filtered.length ? <ul className="card list" aria-label={`${tab} credits`}>
      {filtered.map((credit, index) => <li className="list-row" key={credit.id || index}>
        <div><h3>{money(credit.remainingAmount, currencyOf(credit))}</h3>
          <p>eCredit {credit.number || 'number unavailable'}</p></div>
        <div><strong>{sources[credit.source] || 'Source unavailable'}</strong>
          {credit.sourceTripId && tripIds.has(credit.sourceTripId)
            ? <p><AccountLink to={tripPath(credit.sourceTripId)}>View source trip</AccountLink></p>
            : <p>Issued {dateLabel(credit.createdAt)}</p>}</div>
        <div><strong>{dateLabel(credit.expiresOn)}</strong><p>Expires</p></div>
        <div className="row-end"><Badge>{tab}</Badge>
          {tab === 'Available' && credit.id && validMoney(credit.remainingAmount) &&
            <AccountLink to={`/ecredits/redeem?credit=${encodeURIComponent(credit.id)}`}
              aria-label={`Use eCredit ${credit.number || credit.id}`}>Use credit</AccountLink>}</div>
      </li>)}
    </ul> : <Empty title={`No ${tab.toLowerCase()} credits`}>
      {tab === 'Available' ? 'Use Find an eCredit to look up unused travel value.' : 'Credits with this status will appear here.'}
    </Empty>}
    {lookup && <FindCredit onClose={() => setLookup(false)} onAdded={(credit) => {
      setLookup(false)
      setAdded(credit)
      setTab(creditGroup(credit))
    }} />}
  </>
}
