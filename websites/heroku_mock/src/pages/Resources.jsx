import { useEffect, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { Badge, DialogActions, Empty, FormError, Modal, Panel, Table, money, titleCase } from '../components/ui.jsx'
import { catalog, dynoSizes } from '../data/catalog.js'
import { appAddOns, appFormations, isRunning, useStore } from '../data/store.jsx'
import { TypedConfirmation } from './AppDetails.jsx'

export function Resources() {
  const app = useOutletContext()
  const { state } = useStore()
  const { hash } = useLocation()
  const [dialog, setDialog] = useState(null)
  const formations = appFormations(state, app.id)
  const running = formations.filter(isRunning)
  const addOns = appAddOns(state, app.id)
  const close = () => setDialog(null)

  useEffect(() => {
    if (hash === '#add-ons') document.getElementById('add-ons')?.scrollIntoView({ block: 'start' })
  }, [hash])

  return <div className="sections">
    <Panel title="Dynos" caption="Manage your process types and compute capacity."
      action={<button className="button" disabled={!running.length} onClick={() => setDialog({ kind: 'restart' })}>Restart all dynos</button>}>
      {formations.length ? <Table label="Dynos" columns={['Process', 'Size', 'Quantity', 'Status', 'Actions']}>
        {formations.map((formation) => <tr key={formation.id}>
          <th scope="row"><strong>{formation.processType ?? 'Process'}</strong>
            {formation.command && <code className="row-detail">{formation.command}</code>}
          </th>
          <td>{dynoSizes[formation.size]?.label ?? titleCase(formation.size)}</td>
          <td>{formation.quantity ?? '—'}</td>
          <td><Badge status={formation.status ?? (formation.quantity > 0 ? 'running' : 'stopped')} /></td>
          <td><button className="button compact" aria-label={'Edit formation for ' + (formation.processType ?? 'process')}
            onClick={() => setDialog({ kind: 'formation', formation })}>Edit formation</button></td>
        </tr>)}
      </Table> : <Empty title="No dyno formations">Process types will appear here when they are available for this app.</Empty>}
    </Panel>
    <div id="add-ons">
      <Panel title="Add-ons" caption="Manage services and their monthly plans."
        action={<button className="button primary" onClick={() => setDialog({ kind: 'provision' })}>Find add-ons</button>}>
        {addOns.length ? <Table label="Add-ons" columns={['Service', 'Plan', 'Status', 'Monthly cost', 'Actions']}>
          {addOns.map((instance) => {
            const service = catalog.find((row) => row.key === instance.serviceKey)
            const plan = service?.plans.find((row) => row.key === instance.planKey)
            const name = instance.name ?? instance.id
            return <tr key={instance.id}>
              <th scope="row"><strong>{instance.serviceName ?? service?.name ?? 'Add-on'}</strong><code className="row-detail">{name}</code></th>
              <td>{plan?.label ?? titleCase(instance.planKey)}</td>
              <td><Badge status={instance.status} /></td>
              <td>{money(instance.monthlyPrice)}</td>
              <td><div className="row-actions">
                <button className="button compact" disabled={!service?.plans.some((row) => row.key !== instance.planKey)}
                  aria-label={'Change plan for ' + name} onClick={() => setDialog({ kind: 'plan', instance, service })}>Change plan</button>
                <button className="button compact danger-outline" aria-label={'Remove ' + name}
                  onClick={() => setDialog({ kind: 'remove', instance })}>Remove</button>
              </div></td>
            </tr>
          })}
        </Table> : <Empty title="No add-ons installed">Find an add-on to connect a service to this app.</Empty>}
      </Panel>
    </div>
    {dialog?.kind === 'formation' && <EditFormation app={app} formation={dialog.formation} onClose={close} />}
    {dialog?.kind === 'restart' && <Restart app={app} running={running} onClose={close} />}
    {dialog?.kind === 'provision' && <AddOnPlan app={app} onClose={close} />}
    {dialog?.kind === 'plan' && <AddOnPlan app={app} instance={dialog.instance} currentService={dialog.service} onClose={close} />}
    {dialog?.kind === 'remove' && <RemoveAddOn app={app} instance={dialog.instance} onClose={close} />}
  </div>
}

function EditFormation({ app, formation, onClose }) {
  const { commit } = useStore()
  const [size, setSize] = useState(() => Object.hasOwn(dynoSizes, formation.size) ? formation.size : 'standard-1x')
  const [quantity, setQuantity] = useState(String(formation.quantity ?? 0))
  const [error, setError] = useState('')
  const max = dynoSizes[size].max
  function submit(event) {
    event.preventDefault()
    const count = /^\d+$/.test(quantity) ? Number(quantity) : NaN
    const result = commit({ type: 'edit_dyno', appId: app.id, formationId: formation.id, size, quantity: count }, 'Saved dyno formation.')
    if (result.error) setError(result.error)
    else onClose()
  }
  return <Modal title="Edit formation" description={'Adjust the ' + (formation.processType ?? 'selected') + ' process for ' + (app.name ?? app.id) + '.'} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="formation-size">Dyno size</label>
        <select id="formation-size" value={size} onChange={(event) => { setSize(event.target.value); setError('') }}>
          {Object.entries(dynoSizes).map(([key, config]) => <option value={key} key={key}>{config.label}</option>)}
        </select>
      </div>
      <label className="field">Quantity
        <input type="number" min={0} max={max} step={1} value={quantity} aria-invalid={Boolean(error)}
          aria-describedby={error ? 'quantity-hint quantity-error' : 'quantity-hint'}
          onChange={(event) => { setQuantity(event.target.value); setError('') }} />
      </label>
      <p className="field-hint" id="quantity-hint">Choose 0–{max} dynos. Set quantity to 0 to stop the process.</p>
      <FormError error={error} id="quantity-error" />
      <DialogActions onClose={onClose} submit="Save formation" />
    </form>
  </Modal>
}

function Restart({ app, running, onClose }) {
  const { commit } = useStore()
  const [error, setError] = useState('')
  const quantity = running.reduce((sum, row) => sum + row.quantity, 0)
  return <Modal title="Restart all dynos" onClose={onClose}
    description={'Restart ' + quantity + ' running ' + (quantity === 1 ? 'dyno' : 'dynos') + ' in ' + (app.name ?? app.id) + '.'}>
    <form onSubmit={(event) => {
      event.preventDefault()
      const result = commit({ type: 'restart', appId: app.id }, 'Restarted all running dynos.')
      if (result.error) setError(result.error)
      else onClose()
    }}>
      <ul className="confirm-list">{running.map((row) => <li key={row.id}><strong>{row.processType ?? 'Process'}</strong><span>{row.quantity}</span></li>)}</ul>
      <FormError error={error} />
      <DialogActions onClose={onClose} submit="Restart dynos" />
    </form>
  </Modal>
}

function AddOnPlan({ app, instance, currentService, onClose }) {
  const { commit } = useStore()
  const [query, setQuery] = useState('')
  const [service, setService] = useState(currentService ?? null)
  const [planKey, setPlanKey] = useState('')
  const [error, setError] = useState('')
  const term = query.trim().toLowerCase()
  const matches = catalog.filter((row) => [row.name, row.key, row.category, row.description].some((value) => value.toLowerCase().includes(term)))
  const plans = service?.plans.filter((row) => row.key !== instance?.planKey) ?? []
  const plan = plans.find((row) => row.key === planKey)
  function submit(event) {
    event.preventDefault()
    if (!plan) return
    const result = commit({
      type: instance ? 'change_plan' : 'provision', appId: app.id,
      addOnId: instance?.id, serviceKey: service.key, planKey,
    }, instance ? 'Changed add-on plan.' : 'Provisioned ' + service.name + '.')
    if (result.error) setError(result.error)
    else onClose()
  }
  return <Modal title={instance ? 'Change plan' : 'Find add-ons'} onClose={onClose}
    description={instance ? 'Choose a new plan for ' + (instance.name ?? instance.id) + '.'
      : 'Choose a service to provision for ' + (app.name ?? app.id) + '.'}>
    <form onSubmit={submit}>
      {!instance && <>
        <label className="field">Search add-ons
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="catalog-list">
          {matches.map((row) => <button className="catalog-item" type="button" key={row.key}
            aria-pressed={service?.key === row.key} onClick={() => { setService(row); setPlanKey(''); setError('') }}>
            <span><strong>{row.name}</strong><small>{row.category}</small></span>
            <span>{row.description}</span>
          </button>)}
          {!matches.length && <p className="muted">No matching services.</p>}
        </div>
      </>}
      {service && <div className="field"><label htmlFor="addon-plan">Plan</label>
        <select id="addon-plan" value={planKey} onChange={(event) => { setPlanKey(event.target.value); setError('') }}>
          <option value="">Select a plan</option>
          {plans.map((row) => <option key={row.key} value={row.key}>{row.label} · {money(row.monthlyPrice)}/mo</option>)}
        </select>
      </div>}
      {plan && <div className="plan-review"><span>Monthly cost</span><strong>{money(plan.monthlyPrice)}/mo</strong></div>}
      <FormError error={error} />
      <DialogActions onClose={onClose} submit={instance ? 'Save plan' : 'Provision add-on'} disabled={!plan} />
    </form>
  </Modal>
}

function RemoveAddOn({ app, instance, onClose }) {
  const { commit } = useStore()
  const name = instance.name ?? instance.id
  return <TypedConfirmation title="Remove add-on" description={'Remove ' + name + ' from ' + (app.name ?? app.id) + '.'}
    name={name} fieldName="Instance name" submit="Remove add-on" onClose={onClose} onConfirm={(confirmation) => {
      const result = commit({ type: 'remove', appId: app.id, addOnId: instance.id, confirmation }, 'Removed ' + name + '.')
      if (!result.error) onClose()
      return result
    }} />
}
