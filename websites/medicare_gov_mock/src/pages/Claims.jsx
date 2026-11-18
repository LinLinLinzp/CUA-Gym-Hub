import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount, records, activity } from '../store.jsx'
import { AccountLink, PageTitle, Missing, Status, Field, DataTable, dateLabel, money } from '../ui.jsx'

export function memberClaims(state) {
  if (!state.account?.id) return []
  return records(state.claims).filter((claim) => claim.memberId === state.account.id)
    .sort((a, b) => String(b.serviceDate ?? '').localeCompare(String(a.serviceDate ?? '')))
}

function reviewedBy(state, claimId) {
  return records(state.claimReviews).find((review) =>
    review.claimId === claimId && review.actorId === state.account?.id && review.status === 'reviewed',
  )
}

export function Claims() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [part, setPart] = useState('')
  const [from, setFrom] = useState('')
  const [through, setThrough] = useState('')
  const claims = memberClaims(state)
  const search = query.trim().toLowerCase()
  const invalidRange = from && through && from > through
  const reviews = new Set(records(state.claimReviews)
    .filter((review) => review.actorId === state.account?.id && review.status === 'reviewed')
    .map((review) => review.claimId))
  const results = invalidRange ? [] : claims.filter((claim) =>
    (!status || claim.status === status) && (!part || claim.part === part) &&
    (!from || (claim.serviceDate && claim.serviceDate >= from)) &&
    (!through || (claim.serviceDate && claim.serviceDate <= through)) &&
    (!search || [claim.providerName, claim.claimNumber, ...records(claim.serviceLines).map((line) => line.description)]
      .some((value) => String(value ?? '').toLowerCase().includes(search))),
  )
  return <>
    <PageTitle title="Claims" description="Review your Original Medicare Part A and Part B claims and see what Medicare paid." />
    <div className="stack">
      <section className="panel stack" aria-label="Claim filters">
        <div className="form-row">
          <Field label="Search claims" id="claim-search"><input id="claim-search" type="search" placeholder="Provider, service or claim reference" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
          <Field label="Processing status" id="claim-status"><select id="claim-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="processed">Processed</option><option value="pending">Pending</option><option value="denied">Denied</option></select></Field>
          <Field label="Medicare part" id="claim-part"><select id="claim-part" value={part} onChange={(event) => setPart(event.target.value)}><option value="">All parts</option><option value="A">Part A</option><option value="B">Part B</option></select></Field>
          <Field label="Service date from" id="claims-from"><input type="date" id="claims-from" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="Service date through" id="claims-through" error={invalidRange ? 'Choose an end date on or after the start date.' : ''}>
            <input type="date" id="claims-through" value={through} onChange={(event) => setThrough(event.target.value)} aria-invalid={!!invalidRange} aria-describedby={invalidRange ? 'claims-through-error' : undefined} />
          </Field>
        </div>
      </section>
      <section className="panel stack">
        <h2 aria-live="polite">{results.length} {results.length === 1 ? 'claim' : 'claims'}</h2>
        {results.length ? <DataTable label="Original Medicare claims" headers={['Provider and reference', 'Service date', 'Part', 'Processing status', 'Maximum you may owe', 'Review']}>
          {results.map((claim) => <tr key={claim.id}>
            <td><AccountLink to={'/claims/' + encodeURIComponent(claim.id)}>{claim.providerName || 'Provider unavailable'}</AccountLink><small>{claim.claimNumber || claim.id}</small></td>
            <td>{dateLabel(claim.serviceDate)}</td><td>{claim.part ? 'Part ' + claim.part : 'Unavailable'}</td>
            <td><Status value={claim.status} /></td><td>{money(claim.memberResponsibility)}</td>
            <td>{reviews.has(claim.id) ? <Status value="reviewed" /> : 'Unreviewed'}</td>
          </tr>)}
        </DataTable> : <p>{claims.length ? 'No claims match your filters.' : 'No claims are available for this member.'}</p>}
      </section>
    </div>
  </>
}

const amounts = [
  ['Provider billed', 'billedAmount'],
  ['Medicare approved', 'approvedAmount'],
  ['Medicare paid', 'medicarePaid'],
  ['Maximum you may owe', 'memberResponsibility'],
]

export function ClaimDetails() {
  const { claimId } = useParams()
  return <ClaimRecord key={claimId} claimId={claimId} />
}

function ClaimRecord({ claimId }) {
  const { state, append } = useAccount()
  const [note, setNote] = useState('')
  const claim = memberClaims(state).find((item) => item.id === claimId)
  const review = reviewedBy(state, claimId)
  if (!claim) return <Missing title="Claim unavailable" to="/claims" link="Back to claims" />
  const lines = records(claim.serviceLines)
  const reference = claim.claimNumber || claim.id

  function markReviewed(event) {
    event.preventDefault()
    append('claimReviews', (current) => {
      if (!current.account?.id || reviewedBy(current, claimId)) return null
      const cleanNote = note.trim()
      return { ...activity('review', current.account.id), claimId, status: 'reviewed', ...(cleanNote ? { note: cleanNote } : {}) }
    })
  }

  return <>
    <AccountLink className="back-link" to="/claims">Back to claims</AccountLink>
    <PageTitle title={claim.providerName || 'Claim details'} description={'Claim ' + reference + (claim.part ? ' · Part ' + claim.part : '')}>
      <Status value={claim.status} />
    </PageTitle>
    <div className="stack">
      <section className="panel stack">
        <h2>Claim summary</h2>
        <dl>
          <div><dt>Service date</dt><dd>{dateLabel(claim.serviceDate)}</dd></div>
          <div><dt>Processed date</dt><dd>{dateLabel(claim.processedDate)}</dd></div>
          {amounts.map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{money(claim[key])}</dd></div>)}
        </dl>
        {claim.notes && <p className="notice">{claim.notes}</p>}
      </section>
      <section className="panel stack">
        <h2>Services on this claim</h2>
        {lines.length ? <DataTable label="Claim service lines" headers={['Service', 'Quantity', ...amounts.map(([label]) => label)]}>
          {lines.map((line, index) => <tr key={line.id ?? index}>
            <td>{line.description || 'Service unavailable'}</td><td>{line.quantity ?? 'Unavailable'}</td>
            {amounts.map(([, key]) => <td key={key}>{money(line[key])}</td>)}
          </tr>)}
        </DataTable> : <p>Service line details are unavailable for this claim.</p>}
      </section>
      <section className="panel narrow stack">
        <div className="section-head"><h2>Your review</h2>{review ? <Status value={review.status} /> : <span>Unreviewed</span>}</div>
        {review ? <div role="status"><p>Reviewed on {dateLabel(review.createdAt)}.</p>{review.note && <p className="review-note">{review.note}</p>}</div> :
          <form className="stack" onSubmit={markReviewed}>
            <Field label="Review note (optional)" id="review-note"><textarea id="review-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
            <div><button type="submit">Mark as reviewed</button></div>
          </form>}
      </section>
    </div>
  </>
}
