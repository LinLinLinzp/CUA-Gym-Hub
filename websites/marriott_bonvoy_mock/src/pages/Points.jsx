import { useState } from 'react'
import { useAccount } from '../context/AccountContext'
import { daysAgo } from '../model'
import { AccountLink, Badge, Results, Search, Select, Sort, Title, balance, dateText, integer, matches, recordPath, records, signed, sorted } from '../ui'

export function Points() {
  const { data } = useAccount()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [range, setRange] = useState('')
  const [sort, setSort] = useState('newest')
  const stays = new Map(records(data.stays).map(stay => [stay.id, stay]))
  const cutoff = range ? daysAgo(Number(range)) : ''
  const found = sorted(records(data.pointsActivity).filter(row => {
    const stay = stays.get(row.stayId)
    return (!type || type === row.type) && (!cutoff || row.date?.slice?.(0, 10) >= cutoff) &&
      matches(search, row.description, stay?.propertyName, stay?.city)
  }), row => row.date, sort)
  return <>
    <Title title="Points" description="Review the credits, redemptions and adjustments on your account.">
      {data.member?.id && <AccountLink className="button primary" to="/requests/new" query={{ type: 'missing_stay_credit' }}>Request missing stay credit</AccountLink>}
    </Title>
    <section className="panel balance-panel"><h2>Points balance</h2><p>{integer(balance(data))}</p></section>
    <div className="section-heading"><h2>Points activity</h2></div>
    <div className="controls">
      <Search value={search} onChange={setSearch} placeholder="Description or property" />
      <Select label="Activity type" value={type} onChange={setType} options={[
        ['', 'All types'], ['stay', 'Stay credit'], ['bonus', 'Bonus'], ['redemption', 'Redemption'], ['adjustment', 'Adjustment'],
      ]} />
      <Select label="Time range" value={range} onChange={setRange} options={[
        ['', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 365 days'],
      ]} />
      <Sort value={sort} onChange={setSort} />
    </div>
    <Results key={[search, type, range, sort].join('|')} rows={found} empty="No points activity matches these filters." render={(row, index) => {
      const stay = stays.get(row.stayId)
      return <li className="row list-row" key={row.id || index}>
        <div className="row-main"><strong>{row.description || 'Points activity'}</strong>
          {stay?.id && <AccountLink to={recordPath('stays', stay.id)}>View stay<span className="sr-only"> at {stay.propertyName || 'this hotel'}</span></AccountLink>}
        </div>
        <div className="row-field"><span className="meta">Date</span><span>{dateText(row.date)}</span></div>
        <div className="row-field"><Badge value={row.type} /></div>
        <strong className={'row-action points-value ' + (row.points > 0 ? 'earned' : '')}>{signed(row.points)} pts</strong>
      </li>
    }} />
  </>
}
