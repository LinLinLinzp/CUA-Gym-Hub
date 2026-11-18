import { useState } from 'react'
import { byId, date, label, matches, newest, routeId, tripLabel, useAccount } from '../account.jsx'
import { AccountLink, Badge, Filter, Ledger, PageTitle, Search } from '../ui.jsx'

export function SupportHistory({ title, description, action, base, entries, statuses, subject, subjectLabel, empty, extra }) {
  const { data } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const clear = () => { setQuery(''); setStatus('') }
  const filtered = Boolean(query.trim() || status)
  const rows = newest(entries, 'createdAt').flatMap((entry, index) => {
    const trip = byId(data.trips, entry.tripId)
    const subjectText = label(entry[subject])
    if ((status && entry.status !== status) ||
        !matches(query, entry.id, trip?.destination, trip?.pickup, trip?.city, entry.tripId, subjectText, entry.description, label(entry.status))) return []
    return [{
      id: entry.id ?? index,
      cells: [
        <span className="mono">{date(entry.createdAt, data.rider?.timeZone)}</span>,
        <>{entry.id ? <AccountLink to={base + '/' + routeId(entry.id)}>{entry.id}</AccountLink> : '—'}
          <span className="stacked">{tripLabel(trip)}</span></>,
        subjectText,
        ...(extra ? [extra.cell(entry)] : []),
        <Badge status={entry.status} />,
      ],
    }]
  })
  return <>
    <PageTitle title={title} description={description} action={<AccountLink className="button" to={base + '/new'}>{action}</AccountLink>} />
    <div className="panel filters">
      <Search label={title === 'Lost items' ? 'Search lost item reports' : 'Search refund requests'} value={query} onChange={setQuery} placeholder="ID, destination or description" />
      <Filter label="Status" value={status} onChange={setStatus} options={statuses.map((value) => [value, label(value)])} />
      {filtered && rows.length > 0 && <button className="button secondary" onClick={clear}>Clear filters</button>}
    </div>
    <Ledger headers={['Opened', 'Request', subjectLabel, ...(extra ? [extra.label] : []), 'Status']}
      rows={rows} empty={empty} filtered={filtered} clear={clear} caption={title + ' history'} />
  </>
}
