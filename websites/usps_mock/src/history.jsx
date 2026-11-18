import { useState } from 'react'
import { services, SiteLink, StampArt, Icon } from './navigation.jsx'
import { useStore } from './store.jsx'
import { Field, Status } from './ui.jsx'
import { array, byId, clean, dateRange, label, newest, records, showAddress, showDate } from './model.js'

function listing(state, service, record) {
  switch (service.key) {
    case 'changeOfAddressRequests':
      return [record.moverName || service.name, showAddress(record.newAddress), [showAddress(record.oldAddress), record.contactEmail]]
    case 'holdMailRequests':
      return [record.address?.line1 || service.name, dateRange(record.startDate, record.endDate), [showAddress(record.address)]]
    case 'packageClaims':
      return [record.trackingNumber || service.name, label(record.reason), array(record.items).map(item => item.description)]
    case 'poBoxes': {
      const office = byId(state, 'postOffices', record.officeId)
      return [record.boxNumber ? 'PO Box ' + record.boxNumber : office?.name || 'PO Box reservation',
        office?.name || 'Office unavailable', [record.officeId, showAddress(office?.address), record.applicantName]]
    }
  }
}

export function Home() {
  const { state } = useStore()
  const recent = services.flatMap(service => records(state, service.key).filter(record => record.id).map(record => ({ ...record, service })))
    .sort(newest).slice(0, 4)
  return <>
    <div className="home-grid">
      <section className="feature">
        <p className="eyebrow">USPS ACCOUNT</p>
        <h1>Your mail, managed.</h1>
        <p>Forward mail, schedule a hold, file a claim, or manage a PO Box from your account.</p>
        <a href="#mail-services" className="feature-link">Explore mail services <Icon name="arrow" /></a>
        <StampArt />
      </section>
      <section className="activity card"><h2>Recent requests</h2>
        {recent.length ? <ul className="recent-list">{recent.map(record => <li key={record.service.key + record.id}>
          <div><SiteLink to={record.service.path + '/' + encodeURIComponent(record.id)}>{record.service.name}</SiteLink>
            <span className="muted meta">{record.confirmationCode || record.id} · {record.createdAt ? showDate(record.createdAt) : 'Date unavailable'}</span></div>
          <Status value={record.status} />
        </li>)}</ul> : <p>Your recent requests will appear here.</p>}
      </section>
    </div>
    <section id="mail-services" aria-labelledby="service-title">
      <h2 id="service-title">Mail services</h2>
      <div className="services-grid">
        {services.map(service => <article className="card service-card" key={service.key}>
          <span className={'service-icon ' + service.tone}><Icon name={service.icon} /></span>
          <div><h3><SiteLink to={service.path}>{service.name}</SiteLink></h3><p>{service.summary}</p>
            <SiteLink to={service.path + '/new'} className="action-link">{service.action} <Icon name="arrow" /></SiteLink></div>
        </article>)}
      </div>
    </section>
  </>
}

export function History({ service }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const data = records(state, service.key)
  const statuses = [...new Set(data.map(record => record.status).filter(Boolean))].sort()
  const needle = clean(query).toLowerCase()
  const shown = [...data].sort(newest).map(record => {
    const [title, subtitle, fields] = listing(state, service, record)
    return { record, title, subtitle, searchable: [record.id, record.confirmationCode, title, subtitle, ...fields].join(' ').toLowerCase() }
  }).filter(({ record, searchable }) => (!status || status === record.status) && searchable.includes(needle))
  return <section>
    <div className="page-heading"><div><SiteLink className="back-link" to="/">← Account home</SiteLink><h1>{service.name}</h1><p>{service.summary}</p></div>
      <SiteLink className="button primary" to={service.path + '/new'}>{service.action}</SiteLink>
    </div>
    <div className="card history">
      <div className="history-top"><h2>Request history</h2>
        <div className="filters">
          <Field title="Search requests"><input type="search" value={query} placeholder="Confirmation or keyword" onChange={event => setQuery(event.target.value)} /></Field>
          <Field title="Filter by status"><select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}
          </select></Field>
        </div>
        <p className="meta" role="status">{shown.length} {shown.length === 1 ? 'record' : 'records'}{shown.length !== data.length && ' of ' + data.length}</p>
      </div>
      {shown.length ? <table className="history-table">
        <thead><tr><th scope="col">Request</th><th scope="col">Reference</th><th scope="col">Created</th><th scope="col">Status</th></tr></thead>
        <tbody>{shown.map(({ record, title, subtitle }, index) => <tr key={record.id || index}>
          <td data-label="Request">{record.id ? <SiteLink to={service.path + '/' + encodeURIComponent(record.id)}>{title}</SiteLink> : title}<small>{subtitle}</small></td>
          <td data-label="Reference">{record.confirmationCode || record.id || 'Unavailable'}</td>
          <td data-label="Created">{showDate(record.createdAt)}</td>
          <td data-label="Status"><Status value={record.status} /></td>
        </tr>)}</tbody>
      </table> : <p className="empty" role="status">{data.length ? 'No requests match these filters.' : 'There are no requests in this service yet.'}</p>}
    </div>
  </section>
}
