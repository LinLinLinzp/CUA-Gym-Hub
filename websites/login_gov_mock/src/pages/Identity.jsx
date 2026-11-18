import { LocalLink, PageTitle, Status, useFilters, useLocalNavigate } from '../components/ui.jsx'
import { useAccount } from '../context/AccountContext.jsx'
import { activeAttempt, dateValue, findService, formatDate, isVerified, owned, paths, searchMatches, statuses } from '../data/selectors.js'
import { methodNames, startAttempt } from '../data/verification.js'

const defaults = { search: '', status: 'all', method: 'all' }

export function Identity() {
  const { state, commit } = useAccount()
  const navigate = useLocalNavigate()
  const [filters, set, clear] = useFilters(defaults)
  const verified = isVerified(state)
  const active = activeAttempt(state)
  const attempts = owned(state, 'verificationAttempts')
  const results = attempts.filter(attempt => {
    const service = findService(state, attempt.serviceId)
    return (filters.status === 'all' || attempt.status === filters.status)
      && (filters.method === 'all' || attempt.method === filters.method)
      && searchMatches(filters.search, service?.name, service?.agency)
  }).sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt))
  const filtered = Object.keys(defaults).some(key => filters[key] !== defaults[key])

  return (
    <>
      <PageTitle>Identity</PageTitle>
      <p className="lead">Review your verification status and past attempts.</p>
      <section className="panel narrow section-gap">
        <h2>Identity verification</h2>
        <div className="status-summary">
          <Status value={verified ? 'verified' : 'unverified'} />
          <span>{state.account?.displayName || 'Your account'}</span>
        </div>
        {verified && state.identity.verifiedAt && <p className="meta">Last verified {formatDate(state.identity.verifiedAt)}</p>}
        {!verified && active && <p>Your verification is {active.status === 'pending_in_person' ? 'waiting for a sample visit.' : 'in progress.'}</p>}
        {!verified && !active && <p>Verify your identity to access agency services that require it.</p>}
        {!verified && state.account?.id && (
          <div className="actions">
            {active
              ? <LocalLink className="button" to={paths.verify}>Resume verification</LocalLink>
              : <button className="button" onClick={async () => { if (await commit(startAttempt)) navigate(paths.verify) }}>Verify identity</button>}
          </div>
        )}
      </section>
      <section className="section-gap" aria-labelledby="history-heading">
        <h2 id="history-heading">Verification history</h2>
        <div className="filters">
          <label className="field grow">Search by agency or service
            <input type="search" value={filters.search} onChange={event => set('search', event.target.value)} />
          </label>
          <div className="field">
            <label htmlFor="history-outcome">Outcome</label>
            <select id="history-outcome" value={filters.status} onChange={event => set('status', event.target.value)}>
              <option value="all">All outcomes</option>
              {['verified', 'in_progress', 'pending_in_person', 'canceled'].map(value => <option key={value} value={value}>{statuses[value]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="history-method">Method</label>
            <select id="history-method" value={filters.method} onChange={event => set('method', event.target.value)}>
              <option value="all">All methods</option>
              {Object.entries(methodNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <button className="button secondary" onClick={clear} disabled={!filtered}>Clear filters</button>
        </div>
        <p className="meta filter-count" aria-live="polite">{results.length} {results.length === 1 ? 'attempt' : 'attempts'}</p>
        {results.length ? (
          <ul className="rows">
            {results.map(attempt => {
              const service = findService(state, attempt.serviceId)
              return (
                <li className="row" key={attempt.id}>
                  <div>
                    <h3>{service?.name || (attempt.serviceId ? 'Service unavailable' : 'Account verification')}</h3>
                    <p className="meta">{[service?.agency, methodNames[attempt.method] || 'Method unavailable'].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="row-end">
                    <Status value={attempt.status} />
                    <span className="meta">{formatDate(attempt.updatedAt || attempt.createdAt)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <p className="empty">{filtered ? 'No attempts match these filters.' : 'You haven’t made any verification attempts yet.'}</p>}
      </section>
    </>
  )
}
