import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAccount } from '../context/AccountContext'
import { findRecord, replaceRecord, rowsWith } from '../model'
import { AccountLink, Badge, Confirm, Facts, Missing, Results, Search, Select, Sort, Title, dateText, integer, label, matches, recordPath, records, sorted } from '../ui'

export function Requests() {
  const { data } = useAccount()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const stays = new Map(records(data.stays).filter(stay => stay.id).map(stay => [stay.id, stay]))
  const found = sorted(records(data.requests).filter(row =>
    (!type || type === row.type) && (!status || status === row.status) &&
    matches(search, row.id, stays.get(row.stayId)?.propertyName)), row => row.createdAt, sort)
  return <>
    <Title title="Requests" description="Follow hotel service, folio copy and missing credit cases.">
      {data.member?.id && <AccountLink className="button primary" to="/requests/new" query={{ type: 'hotel_service' }}>New service request</AccountLink>}
    </Title>
    <div className="controls">
      <Search value={search} onChange={setSearch} placeholder="Case ID or property" />
      <Select label="Request type" value={type} onChange={setType} options={[
        ['', 'All types'], ...['hotel_service', 'folio_copy', 'missing_stay_credit'].map(key => [key, label(key)]),
      ]} />
      <Select label="Status" value={status} onChange={setStatus} options={[
        ['', 'All statuses'], ...['submitted', 'in_review', 'resolved', 'cancelled'].map(key => [key, label(key)]),
      ]} />
      <Sort value={sort} onChange={setSort} />
    </div>
    <Results key={[search, type, status, sort].join('|')} rows={found} empty="No requests match these filters." render={(row, index) => {
      const stay = stays.get(row.stayId)
      return <li className="row list-row" key={row.id || index}>
        <div className="row-main">
          {row.id ? <AccountLink className="row-title" to={recordPath('requests', row.id)}>{row.id}</AccountLink> : <strong>Request</strong>}
          <span className="meta">{stay?.propertyName || 'Stay unavailable'}</span>
        </div>
        <div className="row-field"><span className="meta">Request type</span><span>{label(row.type)}</span></div>
        <div className="row-field"><span className="meta">Opened</span><span>{dateText(row.createdAt)}</span></div>
        <div className="row-action"><Badge value={row.status} /></div>
      </li>
    }} />
  </>
}

export function RequestDetail() {
  const { data, commit } = useAccount()
  const { id } = useParams()
  const { state } = useLocation()
  const request = findRecord(data.requests, id)
  return request ? <Case key={id} data={data} commit={commit} request={request} submitted={state?.submitted} />
    : <Missing collection="Requests" name="Request" />
}

function Case({ data, commit, request, submitted }) {
  const [confirming, setConfirming] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)
  const stay = findRecord(data.stays, request.stayId)
  const folio = findRecord(data.folios, request.folioId)
  const history = sorted(records(request.history), row => row.createdAt, 'oldest')
  const entries = [
    ['Opened', dateText(request.createdAt)],
    ['Stay', stay ? <AccountLink to={recordPath('stays', stay.id)}>{stay.propertyName || stay.id}</AccountLink> : request.stayId],
  ]
  if (request.folioId) entries.push(['Folio', folio ? <AccountLink to={recordPath('folios', folio.id)}>{folio.number || folio.id}</AccountLink> : request.folioId])
  if (request.type === 'hotel_service') {
    entries.push(['Service', label(request.service)])
    if (request.service === 'housekeeping') entries.push(['Requested date', dateText(request.requestedDate)], ['Requested time', request.requestedTime])
    else entries.push(['Quantity', request.quantity])
  }
  if (request.type === 'missing_stay_credit' && request.estimatedPoints != null) entries.push(['Estimated points', integer(request.estimatedPoints)])
  if (request.type === 'folio_copy') entries.push(['Contact email', request.contactEmail])
  if (request.notes) entries.push(['Notes', request.notes])

  function withdraw() {
    const saved = commit(current => {
      const row = findRecord(current.requests, request.id)
      if (row?.status !== 'submitted' || !current.member?.id) return null
      const now = new Date().toISOString()
      const next = { ...row, status: 'cancelled', updatedAt: now, cancelledAt: now,
        history: rowsWith(row.history, { status: 'cancelled', actorId: current.member.id, createdAt: now }) }
      return { ...current, requests: replaceRecord(current.requests, row, next) }
    })
    setConfirming(false)
    if (saved) setWithdrawn(true)
  }

  return <>
    <Title title={request.id} description={label(request.type)} back={['/requests', 'Back to requests']}><Badge value={request.status} /></Title>
    <div className="notice" role="status">{withdrawn ? 'Request withdrawn.' : submitted && request.status === 'submitted' ? 'Request submitted. Your case ID is ' + request.id + '.' : ''}</div>
    <div className="detail-stack">
      <section className="panel">
        <h2>Request details</h2><Facts entries={entries} />
        {request.status === 'submitted' && data.member?.id && <div className="actions detail-actions"><button onClick={() => setConfirming(true)}>Withdraw request</button></div>}
      </section>
      <section className="panel">
        <h2>Status history</h2>
        {history.length ? <ol className="results">{history.map((item, index) => <li className="row compact-row" key={index}><Badge value={item.status} />
          <time dateTime={item.createdAt}>{dateText(item.createdAt)}</time></li>)}</ol> : <p>No status history is available.</p>}
      </section>
    </div>
    {confirming && <Confirm title="Withdraw this request?" action="Confirm withdrawal" danger onClose={() => setConfirming(false)} onConfirm={withdraw}>
      <p>The case will move to Cancelled and the hotel will no longer review it.</p>
    </Confirm>}
  </>
}
