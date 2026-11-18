import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AttributeList } from '../components/AttributeList.jsx'
import { BackLink, ConfirmDialog, EmailOptions, LocalLink, Missing, PageTitle, Status } from '../components/ui.jsx'
import { useAccount } from '../context/AccountContext.jsx'
import { changeSharedEmail, disconnectService } from '../data/connections.js'
import { dateValue, eligibleEmails, findEmail, findService, formatDate, owned, paths } from '../data/selectors.js'

const eventLabels = {
  connected: 'Service connected',
  reconnected: 'Service reconnected',
  shared_email_changed: 'Shared email changed',
  disconnected: 'Service disconnected',
}

export function Connection() {
  const { state } = useAccount()
  const { connectionId } = useParams()
  const connection = owned(state, 'connections').find(item => item.id === connectionId)
  if (!connection) return <Missing title="Connection unavailable" to={paths.connections} label="Return to connected services" />

  const service = findService(state, connection.serviceId)
  const email = findEmail(state, connection.sharedEmailId)
  const events = owned(state, 'connectionEvents').filter(event => event.connectionId === connection.id)
    .reverse().sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))
  const live = connection.status === 'connected'

  return (
    <section className="narrow">
      <BackLink to={paths.connections}>Back to connected services</BackLink>
      <PageTitle>{service?.name || 'Service unavailable'}</PageTitle>
      {service?.agency && <p className="lead">{service.agency}</p>}
      <div className="stack">
        <section className="panel">
          <div className="status-summary">
            <Status value={connection.status} />
            {connection.updatedAt && <span className="meta">Updated {formatDate(connection.updatedAt, true)}</span>}
          </div>
          <h2>{live ? 'Shared information' : 'Previously shared information'}</h2>
          <dl className="summary">
            <div><dt>Shared email address</dt><dd>{email?.address || 'Email unavailable'}</dd></div>
            <div><dt>Shared fields</dt><dd><AttributeList value={connection.sharedAttributes} /></dd></div>
          </dl>
          {live && service && <ConnectionActions key={connection.id} connection={connection} service={service} />}
          {connection.status === 'disconnected' && service && (
            <div className="actions"><LocalLink className="button" to={paths.consent(service.id)}>Reconnect</LocalLink></div>
          )}
        </section>
        <section aria-labelledby="consent-activity">
          <h2 id="consent-activity">Consent activity</h2>
          {events.length ? (
            <ol className="rows">
              {events.map(event => (
                <li className="row" key={event.id}>
                  <div>
                    <h3>{eventLabels[event.type] || 'Consent activity'}</h3>
                    {event.type === 'shared_email_changed' ? (
                      <p className="meta">{event.before?.sharedEmailAddress || 'Email unavailable'} → {event.after?.sharedEmailAddress || 'Email unavailable'}</p>
                    ) : event.after?.sharedEmailAddress && <p className="meta">{event.after.sharedEmailAddress}</p>}
                  </div>
                  <span className="meta">{formatDate(event.createdAt, true)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="empty">No consent activity is available.</p>}
        </section>
      </div>
    </section>
  )
}

function ConnectionActions({ connection, service }) {
  const { state, commit } = useAccount()
  const [dialog, setDialog] = useState(null)
  const [selection, setSelection] = useState('')
  const options = eligibleEmails(state)
  const alternatives = options.some(email => email.id !== connection.sharedEmailId)
  const validSelection = selection !== connection.sharedEmailId && options.some(email => email.id === selection)
  const name = service.name || 'this service'

  function openEmail() {
    setSelection(connection.sharedEmailId || '')
    setDialog('email')
  }

  async function submitEmail() {
    if (await commit(world => changeSharedEmail(world, connection.id, selection), 'Shared email updated.')) setDialog(null)
  }

  async function disconnect() {
    if (await commit(world => disconnectService(world, connection.id), 'Service disconnected.')) setDialog(null)
  }

  return (
    <>
      <div className="actions">
        <button className="button secondary" onClick={openEmail} disabled={!alternatives}>Change shared email</button>
        <button className="button secondary" onClick={() => setDialog('disconnect')}>Disconnect service</button>
      </div>
      {!alternatives && <p className="meta">A different confirmed email address is required to change sharing.</p>}
      {dialog === 'email' && (
        <ConfirmDialog title="Change shared email" onClose={() => setDialog(null)} onConfirm={submitEmail}
          confirmLabel="Save shared email" confirmDisabled={!validSelection}>
          <p className="dialog-description">Choose the email address to share with {name}.</p>
          <p className="meta">Currently shared · {findEmail(state, connection.sharedEmailId)?.address || 'Email unavailable'}</p>
          <EmailOptions options={options} value={options.some(email => email.id === selection) ? selection : ''} onChange={setSelection} />
        </ConfirmDialog>
      )}
      {dialog === 'disconnect' && (
        <ConfirmDialog title="Disconnect service?" onClose={() => setDialog(null)} onConfirm={disconnect} confirmLabel="Disconnect service" destructive>
          <p className="dialog-description">Disconnect {name} from your Login.gov account? You can reconnect through service consent.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
