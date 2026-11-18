import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AttributeList } from '../components/AttributeList.jsx'
import { BackLink, EmailOptions, LocalLink, Missing, PageTitle, useLocalNavigate } from '../components/ui.jsx'
import { useAccount } from '../context/AccountContext.jsx'
import { connectService, serviceConnection } from '../data/connections.js'
import { eligibleEmails, findService, isVerified, paths } from '../data/selectors.js'

export function Consent() {
  const { state } = useAccount()
  const { serviceId } = useParams()
  const service = findService(state, serviceId)
  if (!service) return <Missing title="Service unavailable" to={paths.catalog} label="Return to service catalog" />
  return <ConsentForm key={service.id} service={service} />
}

function ConsentForm({ service }) {
  const { state, commit } = useAccount()
  const navigate = useLocalNavigate()
  const connection = serviceConnection(state, service.id)
  const options = eligibleEmails(state)
  const [selected, setSelected] = useState(connection?.sharedEmailId || '')
  const eligible = options.some(email => email.id === selected)
  const needsVerification = service.requiresVerifiedIdentity && !isVerified(state)
  const connected = connection?.status === 'connected'
  const backTo = connection ? paths.connection(connection.id) : paths.catalog

  function submit(event) {
    event.preventDefault()
    let connectionId
    const saved = commit(world => {
      const next = connectService(world, service.id, selected)
      connectionId = next && serviceConnection(next, service.id).id
      return next
    }, connection ? 'Service reconnected.' : 'Service connected.')
    if (saved) navigate(paths.connection(connectionId))
  }

  return (
    <section className="narrow">
      <BackLink to={backTo}>{connection ? 'Back to connection' : 'Back to service catalog'}</BackLink>
      <PageTitle>Service consent</PageTitle>
      <p className="lead">{[service.name || 'Unnamed service', service.agency].filter(Boolean).join(' · ')}</p>
      <div className="panel section-gap">
        <h2>{connected ? 'Already connected' : 'Requested information'}</h2>
        {connected ? (
          <LocalLink className="button" to={backTo}>View connection</LocalLink>
        ) : (
          <>
            <p>Review the information this service is requesting from your account.</p>
            <AttributeList value={service.requestedAttributes} />
            {needsVerification ? (
              <>
                <p className="alert">This service requires a verified identity before you can connect.</p>
                <div className="actions">
                  <LocalLink className="button" to={paths.verifyFor(service.id)}>Verify identity</LocalLink>
                  <LocalLink className="button secondary" to={backTo}>Cancel</LocalLink>
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                {options.length > 0
                  ? <EmailOptions options={options} value={eligible ? selected : ''} onChange={setSelected} />
                  : <p className="alert">A confirmed email address is required to connect this service.</p>}
                <div className="actions">
                  <button className="button" disabled={!eligible || !state.account?.id}>Agree and connect</button>
                  <LocalLink className="button secondary" to={backTo}>Cancel</LocalLink>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  )
}
