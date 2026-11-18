import { useState } from 'react'
import {
  alertStatus, cadences, createRecord, dateRange, find, label, matches, money, normalize,
  readFields, records, replace, travelTypes, validateDates,
} from './model'
import { useAccount } from './store'
import { Badge, Confirm, Empty, Filter, FormDialog, PageHeader, Primary, Results, Search } from './ui'

const statuses = [['', 'All statuses'], ['Active', 'Active'], ['Paused', 'Paused'], ['Expired', 'Expired']]
const dateModes = [['fixed', 'Fixed dates'], ['flexible', 'Flexible dates']]
const visibleAlerts = (world) => records(world.priceAlerts).filter((alert) => alert.status !== 'deleted')

function alertTitle(alert) {
  if (alert.type === 'flight' && alert.origin && alert.destination) return `${alert.origin} → ${alert.destination}`
  return alert.destination || alert.origin || 'Untitled price alert'
}

export function Alerts() {
  const { world, commit } = useAccount()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState(null)
  const alerts = visibleAlerts(world).filter((alert) => matches(query, alert.origin, alert.destination, alertTitle(alert))
    && (!type || alert.type === type) && (!status || alertStatus(alert) === status))
  const reset = query || type || status ? () => { setQuery(''); setType(''); setStatus('') } : undefined
  const open = () => setDialog({ kind: 'new' })
  const close = () => setDialog(null)

  function toggle(alert) {
    const next = alert.status === 'paused' ? 'active' : 'paused'
    commit((previous, update) => {
      const current = find(visibleAlerts(previous), alert.id)
      if (!current || current.status === next || alertStatus(current) === 'Expired') return previous
      return { ...previous, priceAlerts: replace(previous.priceAlerts, alert.id, { status: next, ...update }) }
    }, next === 'paused' ? 'Price alert paused.' : 'Price alert resumed.')
  }

  return <>
    <PageHeader title="Price alerts" description="Track prices for flights, stays and rental cars."
      actions={<Primary onClick={open}>New alert</Primary>} />
    <div className="toolbar">
      <Search label="Search alerts" placeholder="Airport code or location" value={query} onChange={setQuery} />
      <Filter label="Alert type" value={type} onChange={setType} options={[[ '', 'All types'], ...travelTypes]} />
      <Filter label="Alert status" value={status} onChange={setStatus} options={statuses} />
    </div>
    <div className="listing">
      <Results count={alerts.length} singular="alert" onReset={reset} />
      {alerts.length ? <div className="ruled">
        {alerts.map((alert, index) => {
          const displayStatus = alertStatus(alert)
          const price = money(alert.latestPrice, alert.currency)
          return <article className="row alert-row" key={alert.id ?? index}>
            <div className="row-heading">
              <div className="caption">{label(travelTypes, alert.type, 'Price alert')}</div>
              <h3>{alertTitle(alert)}</h3>
              <div className="caption">{alert.dateMode === 'flexible' ? 'Flexible dates' : dateRange(alert.startDate, alert.endDate)}</div>
            </div>
            <div className="row-meta">
              <div className="number">{price ? <strong>{price}</strong> : <span className="muted">Price pending</span>}</div>
              <div className="caption">{label(cadences, alert.cadence, 'Cadence unspecified')}</div>
            </div>
            <div className="row-end">
              <Badge>{displayStatus}</Badge>
              {alert.id && <div className="row-controls">
                <button className="text-button" onClick={() => setDialog({ kind: 'edit', alert })}>Edit</button>
                {displayStatus !== 'Expired' && <button className="text-button" onClick={() => toggle(alert)}>
                  {displayStatus === 'Paused' ? 'Resume' : 'Pause'}
                </button>}
                <button className="text-button danger" onClick={() => setDialog({ kind: 'delete', alert })}>Delete</button>
              </div>}
            </div>
          </article>
        })}
      </div> : <Empty title="No price alerts to show" action={<Primary onClick={open}>New alert</Primary>}>
        {reset ? 'Try a different search or clear the filters.' : 'Create a price alert for a route or destination.'}
      </Empty>}
    </div>
    {['new', 'edit'].includes(dialog?.kind) && <AlertForm alert={dialog.alert} onClose={close} />}
    {dialog?.kind === 'delete' && <Confirm action="Delete alert" name={alertTitle(dialog.alert)} onClose={close}
      onConfirm={() => {
        commit((previous, update) => {
          if (!find(visibleAlerts(previous), dialog.alert.id)) return previous
          const deletion = { status: 'deleted', deletedAt: update.updatedAt, deletedBy: update.updatedBy, ...update }
          return { ...previous, priceAlerts: replace(previous.priceAlerts, dialog.alert.id, deletion) }
        }, 'Price alert deleted.')
        close()
      }} />}
  </>
}

function AlertForm({ alert, onClose }) {
  const { world, commit } = useAccount()
  const initial = { type: 'flight', dateMode: 'fixed', cadence: 'daily', ...alert }
  return <FormDialog title={alert ? 'Edit price alert' : 'New price alert'} initial={initial} onClose={onClose}
    submit={alert ? 'Save changes' : 'Create alert'} onSave={(values) => {
      const fields = readFields(values, ['type', 'origin', 'destination', 'dateMode', 'startDate', 'endDate', 'cadence'])
      const flight = fields.type === 'flight'
      const errors = {}
      if (!label(travelTypes, fields.type, '')) errors.type = 'Choose an alert type.'
      if (!label(cadences, fields.cadence, '')) errors.cadence = 'Choose an update cadence.'
      if (flight && !fields.origin) errors.origin = 'Enter an origin.'
      if (!fields.destination) errors.destination = flight ? 'Enter a destination.' : 'Enter a location.'
      if (flight && fields.origin && normalize(fields.origin) === normalize(fields.destination)) {
        errors.destination = 'Origin and destination must be different.'
      }
      fields.origin = flight ? fields.origin : null
      fields.dateMode = flight && fields.dateMode === 'flexible' ? 'flexible' : 'fixed'
      if (fields.dateMode === 'fixed') validateDates(fields, errors, true)
      if (Object.keys(errors).length) return errors
      if (fields.dateMode === 'flexible') {
        fields.startDate = null
        fields.endDate = null
      }
      commit((previous, update) => {
        if (alert) {
          const current = find(visibleAlerts(previous), alert.id)
          if (!current) return previous
          const criteria = ['type', 'origin', 'destination', 'dateMode', 'startDate', 'endDate']
          const changed = criteria.some((key) => normalize(current[key]) !== normalize(fields[key]))
          const trackedPrice = changed ? { latestPrice: null } : {}
          return { ...previous, priceAlerts: replace(previous.priceAlerts, alert.id, { ...fields, ...trackedPrice, ...update }) }
        }
        const next = createRecord('alert', {
          ...fields, status: 'active', currency: world.user?.currency || 'USD', latestPrice: null,
        }, update)
        return { ...previous, priceAlerts: [...(Array.isArray(previous.priceAlerts) ? previous.priceAlerts : []), next] }
      }, alert ? 'Price alert updated.' : 'Price alert created.')
      onClose()
    }}>
    {(field, values) => {
      const flight = values.type === 'flight'
      const fixed = !flight || values.dateMode !== 'flexible'
      return <>
        {field('type', 'Alert type', { choices: travelTypes, wide: true })}
        {flight && field('origin', 'Origin', { placeholder: 'e.g. BOS' })}
        {field('destination', flight ? 'Destination' : 'Location', { wide: !flight, placeholder: flight ? 'e.g. LIS' : 'e.g. Lisbon' })}
        {flight && field('dateMode', 'Travel dates', { choices: dateModes, wide: true })}
        {fixed && field('startDate', 'Start date', { type: 'date' })}
        {fixed && field('endDate', 'End date', { type: 'date' })}
        {field('cadence', 'Update cadence', { choices: cadences, wide: true })}
      </>
    }}
  </FormDialog>
}
