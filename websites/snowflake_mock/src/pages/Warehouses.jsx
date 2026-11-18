import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, Confirm, Details, Dialog, Field, Missing, PageTitle, Pill, SiteLink, Table } from '../components/ui.jsx'
import { activity, byId, byName, byRecent, changesBetween, filterText, formatDate, identifier, label, list, sizeNames, transactionInfo, uid, updateRecord, validIdentifier } from '../model.js'
import { useAccount } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'
import { dropWarehouse, warehouseLifecycle } from '../warehouses.js'

const path = '/warehouses'
const detailLink = id => path + '/' + encodeURIComponent(id)
const defaults = { name: '', size: 'XSMALL', autoSuspendSeconds: 300, autoResume: true, startSuspended: true, minClusters: 1, maxClusters: 1, comment: '' }
const formValues = warehouse => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, warehouse?.[key] ?? value]))

export function Warehouses() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [size, setSize] = useState('')
  const [sort, setSort] = useState('name')
  const [creating, setCreating] = useState(false)
  const warehouses = list(state.warehouses)
  const matches = warehouses.filter(item => filterText(query, item.name, item.comment) &&
    (!status || status === item.status) && (!size || size === item.size)).sort(sort === 'name' ? byName : byRecent)
  return <>
    <PageTitle title="Warehouses" description="Manage compute resources and workload settings."
      actions={<button className="primary" onClick={() => setCreating(true)}>Create warehouse</button>} />
    <div className="toolbar">
      <div className="search"><Field label="Search warehouses"><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or comment" /></Field></div>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="STARTED">Started</option><option value="SUSPENDED">Suspended</option>
      </select></Field>
      <Field label="Size"><select value={size} onChange={event => setSize(event.target.value)}>
        <option value="">All sizes</option>{Object.entries(sizeNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}
      </select></Field>
      <Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="name">Name</option><option value="recent">Last updated</option>
      </select></Field>
    </div>
    <Table caption="Warehouses" columns={['Name', 'Status', 'Size', 'Clusters', 'Running', 'Queued', 'Owner']}
      empty={!matches.length && (warehouses.length ? 'No warehouses match your filters.' : 'No warehouses yet.')}>
      {matches.map(item => <tr key={item.id}>
        <td>{item.id ? <SiteLink className="mono" to={detailLink(item.id)}>{item.name ?? 'Unnamed warehouse'}</SiteLink> : item.name ?? '—'}</td>
        <td><Pill value={item.status} /></td><td>{sizeNames[item.size] ?? '—'}</td>
        <td className="number">{item.activeClusters ?? '—'} / {item.maxClusters ?? '—'}</td>
        <td className="number">{item.running ?? '—'}</td><td className="number">{item.queued ?? '—'}</td>
        <td className="mono">{label(state.roles, item.ownerRoleId)}</td>
      </tr>)}
    </Table>
    <div className="list-summary">{matches.length} of {warehouses.length} warehouses</div>
    {creating && <WarehouseForm onClose={() => setCreating(false)} />}
  </>
}

export function WarehouseDetail() {
  const { id } = useParams()
  const { state, commit } = useAccount()
  const navigate = useNavigate()
  const [action, setAction] = useState(null)
  const warehouse = byId(state.warehouses, id)
  if (!warehouse) return <Missing area="Warehouses" />
  const name = warehouse.name ?? 'Unnamed warehouse'
  const operation = { STARTED: 'Suspend', SUSPENDED: 'Resume' }[warehouse.status]
  const recent = list(state.activity).filter(event => event.entityType === 'warehouse' && event.entityId === id).sort(byRecent).slice(0, 15)
  function submit() {
    commit(current => {
      const target = byId(current.warehouses, id)
      if (!target) return current
      const tx = transactionInfo(current)
      return action === 'Drop' ? dropWarehouse(current, tx, target) :
        warehouseLifecycle(current, tx, target, action === 'Resume' ? 'STARTED' : 'SUSPENDED')
    })
    setAction(null)
    if (action === 'Drop') navigate(withSid(path))
  }
  return <>
    <PageTitle title={name} description={warehouse.comment || 'Warehouse details'} back={{ to: path, label: 'Warehouses' }}
      actions={<>
        {operation && <button onClick={() => setAction(operation)}>{operation}</button>}
        <button className="primary" onClick={() => setAction('Edit')}>Edit warehouse</button>
        <button className="destructive" onClick={() => setAction('Drop')}>Drop warehouse</button>
      </>} />
    <div className="detail-grid">
      <div className="stack">
        <section className="panel"><h2>Compute settings</h2><Details items={[
          ['Status', <Pill value={warehouse.status} />], ['Size', sizeNames[warehouse.size]],
          ['Auto suspend', warehouse.autoSuspendSeconds === 0 ? 'Disabled' : warehouse.autoSuspendSeconds == null ? '—' : warehouse.autoSuspendSeconds + ' seconds'],
          ['Auto resume', warehouse.autoResume == null ? '—' : warehouse.autoResume ? 'Enabled' : 'Disabled'],
          ['Min clusters', warehouse.minClusters], ['Max clusters', warehouse.maxClusters],
          ['Owner', label(state.roles, warehouse.ownerRoleId)], ['Last updated', formatDate(warehouse.updatedAt)],
        ]} /></section>
        <section className="panel"><h2>Recent activity</h2><Activity items={recent} users={list(state.users)} /></section>
      </div>
      <aside className="panel"><h2>Current workload</h2><Details items={[
        ['Active clusters', warehouse.activeClusters], ['Running queries', warehouse.running], ['Queued queries', warehouse.queued],
      ]} /></aside>
    </div>
    {action === 'Edit' && <WarehouseForm warehouse={warehouse} onClose={() => setAction(null)} />}
    {action && action !== 'Edit' && <Confirm title={action + ' warehouse'} action={action}
      description={action === 'Drop' ? 'Drop ' + name + '? Worksheet references will be cleared and active warehouse privileges revoked.' : action + ' ' + name + '?'}
      submit={submit} onClose={() => setAction(null)} danger={action === 'Drop'} />}
  </>
}

function WarehouseForm({ warehouse, onClose }) {
  const { state, commit } = useAccount()
  const navigate = useNavigate()
  const [initial] = useState(() => formValues(warehouse))
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    const name = identifier(form.name)
    const autoSuspendSeconds = Number(form.autoSuspendSeconds)
    const minClusters = Number(form.minClusters)
    const maxClusters = Number(form.maxClusters)
    const validation = {}
    if (!warehouse && !validIdentifier(name)) validation.name = 'Start with a letter or underscore. Use letters, numbers, underscores or dollar signs.'
    else if (!warehouse && list(state.warehouses).some(item => identifier(item.name ?? '') === name)) validation.name = 'A warehouse with this name already exists.'
    if (!sizeNames[form.size]) validation.size = 'Choose a warehouse size.'
    if (String(form.autoSuspendSeconds).trim() === '' || !Number.isSafeInteger(autoSuspendSeconds) || autoSuspendSeconds < 0) validation.autoSuspendSeconds = 'Enter a whole number of seconds, zero or greater.'
    if (!Number.isInteger(minClusters) || minClusters < 1 || minClusters > 10) validation.minClusters = 'Enter a whole number from 1 to 10.'
    if (!Number.isInteger(maxClusters) || maxClusters < 1 || maxClusters > 10 || maxClusters < minClusters) validation.maxClusters = 'Enter a whole number from the minimum to 10.'
    setErrors(validation)
    if (Object.keys(validation).length) return
    const fields = { size: form.size, autoSuspendSeconds, autoResume: form.autoResume, minClusters, maxClusters, comment: form.comment }
    const id = warehouse?.id ?? uid('wh')
    commit(current => {
      const tx = transactionInfo(current)
      if (warehouse) {
        const target = byId(current.warehouses, id)
        if (!target) return current
        const next = Object.fromEntries(Object.entries(fields).filter(([key, value]) => value !== initial[key]))
        if (target.status === 'STARTED' && ('minClusters' in next || 'maxClusters' in next)) {
          const minimum = next.minClusters ?? target.minClusters ?? defaults.minClusters
          const maximum = next.maxClusters ?? target.maxClusters ?? defaults.maxClusters
          next.activeClusters = Math.max(minimum, Math.min(maximum, target.activeClusters ?? minimum))
        }
        const changes = changesBetween(target, next)
        if (!Object.keys(changes).length) return current
        return activity(updateRecord(current, 'warehouses', id, { ...next, updatedAt: tx.createdAt }), tx, 'warehouse.updated', target, changes)
      }
      const item = {
        id, name, ...fields, status: form.startSuspended ? 'SUSPENDED' : 'STARTED',
        activeClusters: form.startSuspended ? 0 : minClusters, running: 0, queued: 0,
        ownerRoleId: tx.actorRoleId, createdByUserId: tx.actorUserId, createdAt: tx.createdAt, updatedAt: tx.createdAt,
      }
      return activity({ ...current, warehouses: [...list(current.warehouses), item] }, tx, 'warehouse.created', item)
    })
    onClose()
    if (!warehouse) navigate(withSid(detailLink(id)))
  }
  return <Dialog title={warehouse ? 'Edit warehouse' : 'Create warehouse'} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <div className="form-fields">
        {!warehouse && <Field label="Name" error={errors.name}><input autoFocus value={form.name} onChange={event => set('name', event.target.value)} placeholder="TEAM_WH" /></Field>}
        <div className="form-row">
          <Field label="Size" error={errors.size}><select value={form.size} onChange={event => set('size', event.target.value)}>
            {Object.entries(sizeNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}
          </select></Field>
          <Field label="Auto suspend (seconds)" error={errors.autoSuspendSeconds} hint="0 disables auto suspend">
            <input type="number" min="0" step="1" value={form.autoSuspendSeconds} onChange={event => set('autoSuspendSeconds', event.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Min clusters" error={errors.minClusters}><input type="number" min="1" max="10" value={form.minClusters} onChange={event => set('minClusters', event.target.value)} /></Field>
          <Field label="Max clusters" error={errors.maxClusters}><input type="number" min="1" max="10" value={form.maxClusters} onChange={event => set('maxClusters', event.target.value)} /></Field>
        </div>
        <div className="form-row">
          <label className="check"><input type="checkbox" checked={form.autoResume} onChange={event => set('autoResume', event.target.checked)} /> Auto resume</label>
          {!warehouse && <label className="check"><input type="checkbox" checked={form.startSuspended} onChange={event => set('startSuspended', event.target.checked)} /> Start suspended</label>}
        </div>
        <Field label="Comment"><textarea value={form.comment} onChange={event => set('comment', event.target.value)} rows={2} /></Field>
      </div>
      <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">{warehouse ? 'Save changes' : 'Create warehouse'}</button></div>
    </form>
  </Dialog>
}
