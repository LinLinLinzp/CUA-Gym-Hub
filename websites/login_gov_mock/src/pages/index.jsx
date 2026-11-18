import { LocalLink, PageTitle, Status } from '../components/ui.jsx'
import { useAccount } from '../context/AccountContext.jsx'
import { activeAttempt, findEmail, formatDate, isVerified, owned, paths } from '../data/selectors.js'

export function Overview() {
  const { state } = useAccount()
  const name = state.account?.displayName
  const email = findEmail(state, state.account?.primaryEmailId)
  const attempt = activeAttempt(state)
  const verified = isVerified(state)
  const count = owned(state, 'connections').filter(connection => connection.status === 'connected').length

  return (
    <>
      <section className="welcome">
        <div className="welcome-copy">
          <PageTitle>{name ? `Welcome, ${name}` : 'Your account'}</PageTitle>
          <p>Manage your identity and the agency services connected to your Login.gov account.</p>
          {email?.address && <p className="account-email">{email.address}</p>}
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="art-arc arc-one" /><span className="art-arc arc-two" />
          <span className="art-card art-back" />
          <span className="art-card art-front"><i /><b /><b /><b /></span>
          <span className="art-accent">✓</span>
        </div>
      </section>
      <h2 className="workspace-heading">Manage your account</h2>
      <div className="overview-grid">
        <section className="panel overview-card">
          <div className="card-heading"><span className="tile-icon identity-icon" aria-hidden="true" /><h3>Identity verification</h3></div>
          <div className="overview-info">
            <Status value={verified ? 'verified' : attempt?.status || 'unverified'} />
            <p>{verified && state.identity.verifiedAt ? `Last verified ${formatDate(state.identity.verifiedAt)}` : 'Some agency services require a verified identity.'}</p>
          </div>
          <LocalLink to={paths.identity} className="card-link">Manage identity <span aria-hidden="true">→</span></LocalLink>
        </section>
        <section className="panel overview-card">
          <div className="card-heading"><span className="tile-icon services-icon" aria-hidden="true" /><h3>Connected services</h3></div>
          <div className="overview-info">
            <p className="connection-count">{count} active {count === 1 ? 'connection' : 'connections'}</p>
            <p>Review access and the email address shared with each service.</p>
          </div>
          <LocalLink to={paths.connections} className="card-link">Manage connected services <span aria-hidden="true">→</span></LocalLink>
        </section>
      </div>
    </>
  )
}

export { Identity } from './Identity.jsx'
export { Verify } from './Verify.jsx'
export { Connections, Catalog } from './Connections.jsx'
export { Consent } from './Consent.jsx'
export { Connection } from './Connection.jsx'
