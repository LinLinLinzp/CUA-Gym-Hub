import { useState } from 'react'
import { applicationOptions, applicationPlan, claimPlan, find, formatDate, formatTime, hasActiveApplication, lotteryWindow, matches, money, owns, rows } from './data/domain'
import { useRoute, useStore } from './store'
import { Charges, Empty, ErrorText, Facts, Field, Heading, Missing, OptionField, Pill, recordPath, RouteLink, Rules, SearchField, Terms } from './ui'

const MY_LOTTERIES = '/account/lotteries'
const LOTTERIES = '/lotteries'
const statuses = ['submitted', 'selected', 'unsuccessful', 'claimed']
const titleOf = (lottery) => lottery?.title || 'Lottery application'
const place = (facility) => [facility?.name, facility?.state].filter(Boolean).join(' · ')

export function Lotteries() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const [window, setWindow] = useState('')
  const catalog = rows(state.lotteries).map((lottery) => ({
    lottery, facility: find(state.facilities, lottery.facilityId), window: lotteryWindow(lottery),
  }))
  const states = [...new Set(catalog.map(({ facility }) => facility?.state).filter(Boolean))].sort()
  const results = catalog.filter(({ lottery, facility, window: status }) => (!region || region === facility?.state) &&
    (!window || status === window) && matches(query, lottery.title, facility?.name, facility?.locality, facility?.area))
  return <>
    <Heading title="Find a lottery">Browse opportunities for backcountry permits and check application windows.</Heading>
    <div className="filter-bar">
      <SearchField label="Search lotteries" value={query} onChange={setQuery} placeholder="Lottery or destination" />
      <OptionField label="State" value={region} onChange={setRegion} options={[[ '', 'All states'], ...states]} />
      <OptionField label="Application window" value={window} onChange={setWindow} options={[[ '', 'All windows'], 'Open', 'Upcoming', 'Closed']} />
    </div>
    <p className="result-count" role="status">{results.length} {results.length === 1 ? 'opportunity' : 'opportunities'}</p>
    {results.length ? <ul className="panel records">{results.map(({ lottery, facility, window: status }) => <li className="record-row" key={lottery.id}>
      <div><RouteLink className="record-title" to={recordPath(LOTTERIES, lottery.id)}>{titleOf(lottery)}</RouteLink>
        <p>{place(facility) || 'Destination unavailable'}</p></div>
      <div className="record-meta"><span>{status === 'Upcoming' ? 'Opens ' + formatTime(lottery.opensAt) : 'Closes ' + formatTime(lottery.closesAt)}</span><Pill value={status} /></div>
    </li>)}</ul> : <Empty title="No lotteries found">Change the search or application window to see more opportunities.</Empty>}
  </>
}

export function Lottery({ id }) {
  const { state, commit } = useStore()
  const { go } = useRoute()
  const [party, setParty] = useState('1')
  const [preferences, setPreferences] = useState([])
  const [review, setReview] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const lottery = find(state.lotteries, id)
  if (!lottery) return <Missing title="Lottery not found" to={LOTTERIES} action="Find a lottery" />
  const facility = find(state.facilities, lottery.facilityId)
  const status = lotteryWindow(lottery)
  const active = hasActiveApplication(state, id)
  const { dates, partyLimit, preferenceLimit, error: unavailable } = applicationOptions(state, lottery)
  const draft = { partySize: Number(party), preferences }
  function prepare(event) {
    event.preventDefault()
    const plan = applicationPlan(state, lottery, draft)
    if (plan.error) return setError(plan.error)
    setError('')
    setReview(true)
  }
  function submit(event) {
    event.preventDefault()
    if (!accepted) return setError('Agree to the lottery terms before submitting.')
    const result = commit({ type: 'apply', lotteryId: id, draft }, 'Lottery application submitted.')
    if (result.error) return setError(result.error)
    go(recordPath(MY_LOTTERIES, result.record.id))
  }
  return <>
    <Heading title={review ? 'Review lottery application' : titleOf(lottery)} back={{ to: LOTTERIES, label: 'Find a lottery' }}>
      {review ? titleOf(lottery) : place(facility)}
    </Heading>
    <div className="details-grid">
      <section className="panel detail-panel">
        <div className="title-row"><h2>{review ? 'Application details' : 'Application window'}</h2><Pill value={status} /></div>
        {!review && <Facts className="trip-facts" items={[
          ['Opens', formatTime(lottery.opensAt)], ['Closes', formatTime(lottery.closesAt)],
          ['Results', formatTime(lottery.resultsAt)], ['Claim deadline', formatTime(lottery.claimDeadlineAt)],
        ]} />}
        {(!unavailable || review) && <form onSubmit={review ? submit : prepare} className="lottery-form">
          {review ? <>
            <Facts className="trip-facts" items={[[ 'Party size', draft.partySize], ...preferences.filter(Boolean).map((date, index) => [`Preference ${index + 1}`, formatDate(date)])]} />
            <Rules items={lottery.rules} />
            <Terms checked={accepted} onChange={setAccepted}>I agree to the lottery terms and application fee.</Terms>
          </> : <>
            <Field label="Party size"><input type="number" min="1" max={partyLimit} step="1" required value={party} onChange={(event) => { setParty(event.target.value); setError('') }} /></Field>
            <fieldset className="ranks"><legend>Rank entry dates</legend>
              {Array.from({ length: preferenceLimit }, (_, index) => <OptionField key={index} label={`Preference ${index + 1}`}
                value={preferences[index] || ''} onChange={(value) => {
                  setPreferences((previous) => Array.from({ length: preferenceLimit }, (_, i) => i === index ? value : previous[i] || ''))
                  setError('')
                }}
                options={[[ '', index === 0 ? 'Choose a date' : 'No preference'], ...dates.map((date) => [date, formatDate(date)])]} />)}
            </fieldset>
            <Rules items={lottery.rules} />
          </>}
          <ErrorText error={error} />
          <div className="action-row">
            {review && <button className="button secondary" type="button" onClick={() => { setReview(false); setAccepted(false); setError('') }}>Edit application</button>}
            <button className="button primary" type="submit">{review ? 'Submit application' : 'Review application'}</button>
          </div>
        </form>}
        {unavailable && !review && <><Rules items={lottery.rules} /><p className="muted">{unavailable}</p>
          {active && <RouteLink to={MY_LOTTERIES}>View my lotteries</RouteLink>}</>}
      </section>
      <aside className="panel detail-panel summary">
        <h2>Lottery fees and limits</h2>
        <Facts className="costs" items={[
          ['Maximum party size', lottery.maxPartySize],
          ['Maximum preferences', lottery.maxPreferences],
          ['Application fee', money(lottery.applicationFee)],
        ]} />
      </aside>
    </div>
  </>
}

export function Applications() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const applications = rows(state.lotteryApplications).filter((app) => owns(state, app)).map((app) => {
    const lottery = find(state.lotteries, app.lotteryId)
    return { app, lottery, facility: find(state.facilities, lottery?.facilityId) }
  }).filter(({ app, lottery, facility }) => (!status || app.status === status) &&
    matches(query, lottery?.title, facility?.name, app.confirmationCode))
    .sort((a, b) => String(b.app.updatedAt || b.app.createdAt || '').localeCompare(String(a.app.updatedAt || a.app.createdAt || '')))
  return <>
    <div className="heading-action"><Heading title="My lotteries">Track applications, review results, and claim selected permits.</Heading>
      <RouteLink className="button primary" to={LOTTERIES}>Find a lottery</RouteLink></div>
    <div className="filter-bar">
      <SearchField label="Search applications" value={query} onChange={setQuery} placeholder="Lottery or application number" />
      <OptionField label="Application status" value={status} onChange={setStatus}
        options={[[ '', 'All statuses'], ...statuses.map((name) => [name, name[0].toUpperCase() + name.slice(1)])]} />
    </div>
    <p className="result-count" role="status">{applications.length} {applications.length === 1 ? 'application' : 'applications'}</p>
    {applications.length ? <ul className="records panel">{applications.map(({ app, lottery, facility }) => <li key={app.id} className="record-row">
      <div><RouteLink className="record-title" to={recordPath(MY_LOTTERIES, app.id)}>{titleOf(lottery)}</RouteLink>
        <p>{[app.confirmationCode, place(facility)].filter(Boolean).join(' · ')}</p></div>
      <div className="record-meta"><span>{app.awardedDate ? 'Entry ' + formatDate(app.awardedDate) : app.createdAt ? 'Applied ' + formatTime(app.createdAt) : 'Date unavailable'}</span><Pill value={app.status} /></div>
    </li>)}</ul> : <Empty title="No applications found" to={LOTTERIES} action="Browse lotteries">Your lottery applications will appear here.</Empty>}
  </>
}

export function Application({ id }) {
  const { state, commit } = useStore()
  const { go } = useRoute()
  const [review, setReview] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const app = find(state.lotteryApplications, id)
  if (!owns(state, app)) return <Missing title="Application not found" to={MY_LOTTERIES} action="My lotteries" />
  const lottery = find(state.lotteries, app.lotteryId)
  const facility = find(state.facilities, lottery?.facilityId)
  const selected = app.status === 'selected'
  const claim = selected ? claimPlan(state, app) : null
  const preferences = rows(app.preferences).sort((a, b) => (a.rank || 0) - (b.rank || 0))
  const receipt = find(state.reservations, app.reservationId)
  function confirm(event) {
    event.preventDefault()
    if (!accepted) return setError('Agree to the permit terms before claiming.')
    const result = commit({ type: 'claim', id }, 'Permit claimed.')
    if (result.error) return setError(result.error)
    go(recordPath('/account/reservations', result.record.id))
  }
  return <>
    <Heading title={review ? 'Review permit claim' : titleOf(lottery)} back={{ to: MY_LOTTERIES, label: 'My lotteries' }}>
      {app.confirmationCode ? `Application ${app.confirmationCode}` : 'Application details'}
    </Heading>
    <div className="details-grid">
      <section className="panel detail-panel">
        <div className="title-row"><h2>{review ? 'Permit details' : 'Application result'}</h2><Pill value={app.status} /></div>
        {app.status === 'submitted' && <p className="muted">Results pending.</p>}
        {app.status === 'unsuccessful' && <p className="muted">This application was not selected.</p>}
        <Facts className="trip-facts" items={[
          ['Destination', facility?.name],
          ['Party size', app.partySize],
          ...(app.awardedDate || selected ? [['Assigned entry date', formatDate(app.awardedDate)]] : []),
          ...(selected ? [['Claim deadline', formatTime(app.claimDeadlineAt || lottery?.claimDeadlineAt)]] : []),
          ...(review ? [['Entry point', claim?.unit?.name]] : preferences.map((preference, i) => [`Preference ${preference.rank || i + 1}`, formatDate(preference.entryDate)])),
        ]} />
        {review && selected ? <form onSubmit={confirm}>
          <Rules items={facility?.rules} />
          <Terms checked={accepted} onChange={setAccepted}>I agree to the permit rules and booking terms.</Terms>
          <ErrorText error={error || claim?.error} />
          <div className="action-row">
            <button type="button" onClick={() => { setReview(false); setAccepted(false); setError('') }} className="button secondary">Back to result</button>
            <button type="submit" disabled={Boolean(claim?.error)} className="button primary">Confirm permit claim</button>
          </div>
        </form> : <>
          {selected && (claim.error ? <p className="muted">{claim.error}</p>
            : <button className="button primary" onClick={() => setReview(true)}>Claim permit</button>)}
          {app.status === 'claimed' && (owns(state, receipt) ? <RouteLink className="button secondary" to={recordPath('/account/reservations', receipt.id)}>View permit reservation</RouteLink>
            : <p className="muted">The linked reservation is unavailable.</p>)}
          {lottery && <p><RouteLink to={recordPath(LOTTERIES, lottery.id)}>View lottery opportunity</RouteLink></p>}
        </>}
      </section>
      <aside className="panel detail-panel summary">
        <h2>{review ? 'Permit charges' : 'Application fee'}</h2>
        {review && claim?.quote && <Charges quote={claim.quote} camp={false} />}
        <p className={review ? 'fine-print' : 'fee-value'}>{review ? 'Original application fee paid separately: ' : ''}{money(app.feeAmount, app.currency)}</p>
      </aside>
    </div>
  </>
}
