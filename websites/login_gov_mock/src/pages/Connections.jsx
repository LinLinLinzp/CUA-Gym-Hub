import { useState } from 'react'
import { BackLink, LocalLink, PageTitle, Status, useFilters } from '../components/ui.jsx'
import { useAccount } from '../context/AccountContext.jsx'
import { dateValue, findEmail, findService, formatDate, owned, paths, records, searchMatches, statuses } from '../data/selectors.js'

const defaults = { search: '', status: 'connected', sort: 'latest' }

export function Connections() {
  const { state } = useAccount()
  const [filters, set, clear] = useFilters(defaults)
  const all = owned(state, 'connections')
  const results = all.map(connection => ({
    connection, service: findService(state, connection.serviceId), email: findEmail(state, connection.sharedEmailId),
  })).filter(({ connection, service, email }) => (
    (filters.status === 'all' || connection.status === filters.status)
    && searchMatches(filters.search, service?.name, service?.agency, email?.address)
  )).sort((a, b) => filters.sort === 'name'
    ? (a.service?.name || 'Service unavailable').localeCompare(b.service?.name || 'Service unavailable')
    : dateValue(b.connection.updatedAt) - dateValue(a.connection.updatedAt))
  const filtered = Object.keys(defaults).some(key => filters[key] !== defaults[key])

  return (
    <>
      <div className="page-top">
        <div><PageTitle>Your connected services</PageTitle><p className="lead">Review access to your account and manage what you share with each agency service.</p></div>
        <LocalLink to={paths.catalog} className="button">Connect a service</LocalLink>
      </div>
      <div className="tabs" aria-label="Connection status" role="group">
        {['connected', 'disconnected', 'all'].map(value => (
          <button key={value} aria-pressed={filters.status === value} onClick={() => set('status', value)}>{statuses[value] || 'All'}</button>
        ))}
      </div>
      <div className="filters">
        <label className="field grow">Search by service, agency, or shared email
          <input type="search" value={filters.search} onChange={event => set('search', event.target.value)} />
        </label>
        <div className="field">
          <label htmlFor="connection-sort">Sort by</label>
          <select id="connection-sort" value={filters.sort} onChange={event => set('sort', event.target.value)}>
            <option value="latest">Latest update</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <button className="button secondary" onClick={clear} disabled={!filtered}>Clear filters</button>
      </div>
      <p className="meta filter-count" aria-live="polite">{results.length} {results.length === 1 ? 'service' : 'services'}</p>
      {results.length ? (
        <ul className="rows">
          {results.map(({ connection, service, email }) => (
            <li className="row" key={connection.id}>
              <div>
                <h3><LocalLink to={paths.connection(connection.id)}>{service?.name || 'Service unavailable'}</LocalLink></h3>
                {service?.agency && <p className="meta">{service.agency}</p>}
                <p className="meta">{connection.status === 'disconnected' ? 'Previously shared' : 'Shared email'} · {email?.address || 'Email unavailable'}</p>
              </div>
              <div className="row-end">
                <Status value={connection.status} />
                <span className="meta">Updated {connection.updatedAt ? formatDate(connection.updatedAt) : 'date unavailable'}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="empty">{all.length ? 'No services match these filters.' : 'You haven’t connected any services yet.'}</p>}
    </>
  )
}

export function Catalog() {
  const [search, setSearch] = useState('')
  const { state } = useAccount()
  const all = records(state.services)
  const connections = new Map(owned(state, 'connections').map(connection => [connection.serviceId, connection]))
  const results = all.filter(service => searchMatches(search, service.name, service.agency, service.category))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return (
    <>
      <BackLink to={paths.connections}>Back to connected services</BackLink>
      <PageTitle>Service catalog</PageTitle>
      <p className="lead">Choose an agency service to review the information it requests.</p>
      <div className="filters section-gap">
        <label className="field grow">Search services
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <button className="button secondary" onClick={() => setSearch('')} disabled={!search}>Clear search</button>
      </div>
      <p className="meta filter-count" aria-live="polite">{results.length} {results.length === 1 ? 'service' : 'services'}</p>
      {results.length ? (
        <ul className="rows">
          {results.map(service => {
            const connection = connections.get(service.id)
            const active = connection?.status === 'connected'
            const name = service.name || 'Unnamed service'
            return (
              <li className="row" key={service.id}>
                <div>
                  <h3>{name}</h3>
                  <p className="meta">{[service.agency, service.category].filter(Boolean).join(' · ')}</p>
                  {service.description && <p>{service.description}</p>}
                  {service.requiresVerifiedIdentity && <p className="meta">Verified identity required</p>}
                </div>
                <div className="row-end">
                  <LocalLink className="button secondary" to={active ? paths.connection(connection.id) : paths.consent(service.id)}
                    aria-label={`${active ? 'View connection for' : 'Review consent for'} ${name}`}>
                    {active ? 'View connection' : 'Review consent'}
                  </LocalLink>
                </div>
              </li>
            )
          })}
        </ul>
      ) : <p className="empty">{all.length ? 'No services match your search.' : 'No agency services are available.'}</p>}
    </>
  )
}
