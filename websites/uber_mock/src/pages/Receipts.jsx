import { useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { byId, date, matches, money, newest, newId, paymentLabel, records, routeId, tripLabel, useAccount } from '../account.jsx'
import { AccountLink, Confirm, Facts, Field, Filter, Ledger, Missing, PageTitle, Search, Trail } from '../ui.jsx'

function calendarDay(value, timeZone) {
  const parsed = new Date(value)
  if (!value || Number.isNaN(parsed.valueOf())) return ''
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timeZone || 'UTC' }
  try {
    return parsed.toLocaleDateString('en-CA', options)
  } catch {
    return parsed.toLocaleDateString('en-CA', { ...options, timeZone: 'UTC' })
  }
}

function Receipts() {
  const { data } = useAccount()
  const [query, setQuery] = useState('')
  const [profileId, setProfileId] = useState('')
  const [from, setFrom] = useState('')
  const [through, setThrough] = useState('')
  const filtered = Boolean(query.trim() || profileId || from || through)
  const clear = () => { setQuery(''); setProfileId(''); setFrom(''); setThrough('') }
  const rows = newest(data.receipts, 'issuedAt').flatMap((receipt, index) => {
    const trip = byId(data.trips, receipt.tripId)
    const profile = byId(data.expenseProfiles, receipt.billedProfileId)
    const day = calendarDay(receipt.issuedAt, data.rider?.timeZone)
    if ((profileId && receipt.billedProfileId !== profileId) || (from && (!day || day < from)) ||
        (through && (!day || day > through)) || !matches(query, receipt.number, receipt.id, trip?.destination, trip?.pickup, trip?.city, profile?.name)) return []
    const title = receipt.number || receipt.id || 'Receipt'
    return [{ id: receipt.id ?? index, cells: [
      <span className="mono">{date(receipt.issuedAt, data.rider?.timeZone)}</span>,
      tripLabel(trip),
      receipt.id ? <AccountLink className="mono" to={'/receipts/' + routeId(receipt.id)}>{title}</AccountLink> : title,
      profile?.name || '—', <span className="mono">{money(receipt.total, receipt.currency)}</span>,
    ] }]
  })

  return <>
    <PageTitle title="Receipts" description="Find itemized charges and download or resend your trip receipts." />
    <div className="panel filters">
      <Search label="Search receipts" value={query} onChange={setQuery} placeholder="Receipt number or destination" />
      <Filter label="Billed profile" value={profileId} onChange={setProfileId} options={records(data.expenseProfiles).filter((profile) => profile.id).map((profile) => [profile.id, profile.name || profile.id])} />
      <Field label="From date">{(props) => <input {...props} type="date" value={from} max={through || undefined} onChange={(event) => setFrom(event.target.value)} />}</Field>
      <Field label="Through date" error={from && through && through < from ? 'Choose a date on or after the start date.' : undefined}>{(props) =>
        <input {...props} type="date" value={through} min={from || undefined} onChange={(event) => setThrough(event.target.value)} />}</Field>
      {filtered && rows.length > 0 && <button className="button secondary" onClick={clear}>Clear filters</button>}
    </div>
    <Ledger headers={['Date', 'Destination', 'Receipt number', 'Billed profile', 'Total']} rows={rows} empty="No receipts yet" filtered={filtered} clear={clear} caption="Receipt history" />
  </>
}

function ReceiptDetail() {
  const { receiptId } = useParams()
  const { data, commit } = useAccount()
  const [resend, setResend] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const receipt = byId(data.receipts, receiptId)
  if (!receipt) return <Missing title="Receipt unavailable" to="/receipts" back="All receipts" />

  const trip = byId(data.trips, receipt.tripId)
  const profile = byId(data.expenseProfiles, receipt.billedProfileId)
  const email = receipt.receiptEmail || data.rider?.email
  const issued = date(receipt.issuedAt, data.rider?.timeZone)
  const rows = records(receipt.lineItems).map((line, index) => ({
    id: line.id ?? index,
    cells: [line.label || 'Charge', line.quantity ?? '—', <span className="mono">{money(line.amount, receipt.currency)}</span>],
  }))

  function recordAction(action, confirmation, recipientEmail) {
    commit((state, { now, actorId }) => ({
      ...state,
      receiptActions: [...records(state.receiptActions), {
        id: newId('rcpt_action'), receiptId, tripId: receipt.tripId ?? null, actorId, action, createdAt: now,
        status: action === 'downloaded' ? 'completed' : 'queued',
        ...(recipientEmail ? { recipientEmail } : {}),
      }],
    }), confirmation)
  }

  async function download() {
    setDownloading(true)
    setDownloadError('')
    try {
      const { downloadReceipt } = await import('../utils/receiptPdf.js')
      downloadReceipt({ receipt, trip, issued, profile, email })
      recordAction('downloaded', 'Receipt PDF downloaded.')
    } catch {
      setDownloadError('The PDF could not be created. Try downloading it again.')
    } finally {
      setDownloading(false)
    }
  }

  function confirmResend() {
    recordAction('resend_requested', 'Receipt resend queued for ' + email + '.', email)
    setResend(false)
  }

  return <>
    <Trail to="/receipts">All receipts</Trail>
    <PageTitle title="Receipt" description={(receipt.number || receipt.id) + ' · ' + issued} />
    <div className="detail-grid">
      <div>
        <section className="panel detail-panel">
          <h2>{tripLabel(trip)}</h2>
          <Facts items={[
            ['Trip', trip?.id ? <AccountLink to={'/trips/' + routeId(trip.id)}>View trip</AccountLink> : null],
            ['Billed profile', profile?.id ? <AccountLink to={'/expense-profiles/' + routeId(profile.id)}>{profile.name || profile.id}</AccountLink> : null],
            ['Payment method', paymentLabel(receipt.payment)],
            ['Receipt email', email],
          ]} />
        </section>
        <section className="panel detail-panel">
          <h2>Itemized charges</h2>
          <Ledger headers={['Charge', 'Quantity', 'Amount']} rows={rows} empty="No charge lines available" caption="Receipt charges" showCount={false} />
        </section>
      </div>
      <section className="panel detail-panel">
        <h2>Receipt total</h2>
        <p className="mono total">{money(receipt.total, receipt.currency)}</p>
        <div className="button-stack receipt-buttons">
          <button className="button" onClick={download} disabled={downloading}>{downloading ? 'Preparing PDF…' : 'Download PDF'}</button>
          <button className="button secondary" onClick={() => setResend(true)} disabled={!email}>Resend receipt</button>
        </div>
        {!email && <p className="stacked">No receipt email is available for this account.</p>}
        {downloadError && <p className="field-error" role="alert">{downloadError}</p>}
      </section>
    </div>
    {resend && <Confirm title="Resend receipt" action="Confirm resend" onClose={() => setResend(false)} onConfirm={confirmResend}>
      Queue a copy of this receipt for {email}?
    </Confirm>}
  </>
}

export function ReceiptRoutes() {
  return <Routes>
    <Route index element={<Receipts />} />
    <Route path=":receiptId" element={<ReceiptDetail />} />
    <Route path="*" element={<Missing title="Receipt unavailable" to="/receipts" back="All receipts" />} />
  </Routes>
}
