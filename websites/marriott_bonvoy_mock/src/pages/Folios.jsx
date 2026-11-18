import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../context/AccountContext'
import { actionId, findRecord, rowsWith } from '../model'
import { chargeLines, downloadBlob, folioPdf } from '../utils/folioPdf'
import { AccountLink, Badge, Facts, Missing, Results, Search, Select, Sort, Title, dateText, matches, money, recordPath, records, sorted } from '../ui'

export function Folios() {
  const { data } = useAccount()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const stays = new Map(records(data.stays).filter(stay => stay.id).map(stay => [stay.id, stay]))
  const found = sorted(records(data.folios).filter(folio => {
    const stay = stays.get(folio.stayId)
    return (!status || folio.status === status) && matches(search, stay?.propertyName, stay?.confirmationNumber, folio.number)
  }), folio => stays.get(folio.stayId)?.checkOut || folio.issuedAt, sort)
  return <>
    <Title title="Folios" description="Find an itemized hotel bill or request a copy." />
    <div className="controls">
      <Search value={search} onChange={setSearch} placeholder="Hotel, confirmation or folio number" />
      <Select label="Availability" value={status} onChange={setStatus} options={[['', 'All folios'], ['available', 'Available'], ['unavailable', 'Unavailable']]} />
      <Sort value={sort} onChange={setSort} />
    </div>
    <Results key={[search, status, sort].join('|')} rows={found} empty="No folios match these filters." render={(folio, index) => {
      const stay = stays.get(folio.stayId)
      return <li className="row list-row" key={folio.id || index}>
        <div className="row-main">
          {folio.id ? <AccountLink className="row-title" to={recordPath('folios', folio.id)}>{stay?.propertyName || folio.number || 'Hotel folio'}</AccountLink>
            : <strong>{stay?.propertyName || 'Hotel folio'}</strong>}
          <span className="meta">{folio.number || 'Folio number unavailable'}{stay?.confirmationNumber && ' · ' + stay.confirmationNumber}</span>
        </div>
        <div className="row-field"><span className="meta">Checkout</span><span>{dateText(stay?.checkOut || folio.issuedAt)}</span></div>
        <div className="row-field"><span className="meta">Total</span><span>{money(folio.total, folio.currency)}</span></div>
        <div className="row-action"><Badge value={folio.status} /></div>
      </li>
    }} />
  </>
}

function billTotal(folio) {
  return folio.total ?? Math.round(records(folio.lineItems).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100) / 100
}

export function FolioDetail() {
  const { id } = useParams()
  const { data, commit } = useAccount()
  const folio = findRecord(data.folios, id)
  return folio ? <Bill key={id} folio={folio} data={data} commit={commit} /> : <Missing collection="Folios" name="Folio" />
}

function Bill({ folio, data, commit }) {
  const [notice, setNotice] = useState('')
  const stay = findRecord(data.stays, folio.stayId)
  const items = records(folio.lineItems)
  const currency = folio.currency || 'USD'
  const total = money(billTotal(folio), currency)
  const actionable = stay && data.member?.id

  function download() {
    const filename = 'folio-' + String(folio.number || folio.id).replace(/[^a-z0-9_.-]/gi, '_') + '.pdf'
    const document = folioPdf({
      title: 'Hotel folio ' + (folio.number || folio.id),
      summary: [stay.propertyName || 'Hotel stay', 'Confirmation ' + (stay.confirmationNumber || '—'),
        'Checkout ' + dateText(stay.checkOut), 'Currency ' + currency],
      lines: items.flatMap(chargeLines),
      total: 'Total ' + total,
    })
    downloadBlob(document, filename)
    const saved = commit(current => {
      const bill = findRecord(current.folios, folio.id)
      if (bill?.status !== 'available' || !findRecord(current.stays, bill.stayId) || !current.member?.id) return null
      const entry = { id: actionId('folio-action'), action: 'download', status: 'initiated', folioId: bill.id, stayId: bill.stayId,
        actorId: current.member.id, createdAt: new Date().toISOString(), total: Number(billTotal(bill)), currency, filename }
      return { ...current, folioActions: rowsWith(current.folioActions, entry) }
    })
    if (saved) setNotice('Folio download started.')
  }

  return <>
    <Title title={folio.number || 'Hotel folio'} description={stay?.propertyName} back={['/folios', 'Back to folios']}><Badge value={folio.status} /></Title>
    <div className="notice" role="status">{notice}</div>
    <div className="detail-stack">
      <section className="panel">
        <h2>Bill summary</h2>
        <Facts entries={[
          ['Hotel', stay?.propertyName], ['Confirmation', stay?.confirmationNumber], ['Checkout', dateText(stay?.checkOut)],
          ['Currency', folio.currency], ['Total', folio.status === 'available' ? total : money(folio.total, folio.currency)],
        ]} />
        <div className="actions detail-actions">
          {actionable && folio.status === 'available' && <button className="primary" onClick={download}>Download folio</button>}
          {actionable && folio.status === 'unavailable' && <AccountLink className="button primary" to="/requests/new" query={{ type: 'folio_copy', stay: stay.id, folio: folio.id }}>Request a copy</AccountLink>}
          {stay && <AccountLink className="button" to={recordPath('stays', stay.id)}>View stay</AccountLink>}
        </div>
      </section>
      {folio.status === 'available' && <section className="panel">
        <h2>Itemized charges</h2>
        {items.length ? <><p className="table-hint meta">Scroll to see all charges.</p><div className="table-scroll" role="region" aria-label="Folio charges" tabIndex={0}><table>
          <thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col" className="num">Quantity</th>
            <th scope="col" className="num">Unit amount</th><th scope="col" className="num">Amount</th></tr></thead>
          <tbody>{items.map((item, index) => <tr key={item.id || index}><td>{dateText(item.date)}</td><td>{item.description || 'Charge'}</td>
            <td className="num">{item.quantity ?? '—'}</td><td className="num">{money(item.unitAmount, currency)}</td><td className="num">{money(item.amount, currency)}</td></tr>)}</tbody>
          <tfoot><tr><th colSpan="4" scope="row" className="num">Total</th><td className="num">{total}</td></tr></tfoot>
        </table></div></> : <p>No itemized charges are listed.</p>}
      </section>}
      {folio.status === 'unavailable' && <section className="panel"><h2>Folio unavailable online</h2><p>{actionable ? 'Request a copy for the email address on your case.' : 'This folio has no linked reservation in your account.'}</p></section>}
    </div>
  </>
}
