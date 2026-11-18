import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, Empty, ErrorNote, Field, Ledger, Missing, PageHead, SearchBox, SearchPick, Status, Tabs, useFilters, useGo } from '../components/ui.jsx'
import { activeForClient, deliveryModes, linkedRecords, periodUnits, retainerForm, saveRetainer, validateRetainer } from '../data/retainer.js'
import { currencies, dateLabel, find, hours, matches, money, nameOf, titleCase, today, visible } from '../utils/format.js'

export const retainerRoot = '/invoices/retainers'
export const cadence = row => row.periodUnit === 'custom' ? `Every ${row.customPeriodDays || '—'} days` : titleCase(row.periodUnit || 'monthly')
const deliveryNames = { create_draft: 'Create draft invoices', send_automatically: 'Send invoices automatically' }
export function Retainers() {
  const { state } = useApp()
  const [params, filter] = useFilters()
  const visibility = params.get('visibility') || 'active'
  const status = params.get('status') || ''
  const rows = state.retainers.filter(row => visible(row, visibility) && (!status || status === row.status) && matches(params.get('q'), nameOf(state.clients, row.clientId)))
  return <>
    <PageHead title="Retainers" back={{ to: '/invoices', label: 'Invoices' }}>
      <AppLink className="button primary" to={retainerRoot + '/new'}><Plus size={16} />New Retainer</AppLink>
    </PageHead>
    <section className="card ledger"><div className="ledger-bar">
      <h2>{visibility === 'active' ? 'All Retainers' : titleCase(visibility) + ' Retainers'}</h2>
      <SearchBox value={params.get('q')} onChange={q => filter('q', q)} placeholder="Search by client" />
    </div>
      <div className="ledger-tabs"><Tabs values={['active', 'archived', 'deleted']} value={visibility} change={v => filter('visibility', v === 'active' ? '' : v)} /></div>
      <div className="filter-bar"><Field label="Status"><select value={status} onChange={e => filter('status', e.target.value)}>
        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select></Field></div>
      <Ledger rows={rows} columns={[{ label: 'Client' }, { label: 'Cadence' }, { label: 'Fee per Period', number: true }, { label: 'Included Hours', number: true }, { label: 'Next Issue Date' }, { label: 'State' }]} render={row => <>
        <td><AppLink to={`${retainerRoot}/${row.id}`} className="row-link">{nameOf(state.clients, row.clientId, 'Unavailable client')}</AppLink></td>
        <td>{cadence(row)}</td><td className="number">{money(row.feePerPeriod, row.currency)}</td><td className="number">{hours(row.includedMinutes)}</td>
        <td>{dateLabel(row.nextIssueDate)}</td><td><Status value={row.status} /></td>
      </>} empty={<Empty title={state.retainers.length ? 'No matching retainers' : 'No retainers yet'} />} />
    </section>
  </>
}

export function RetainerEditor() {
  const { state } = useApp()
  const { id } = useParams()
  const [params] = useSearchParams()
  const original = find(state.retainers, id)
  if (id && (!original || visible(original, 'deleted'))) return <Missing title="Retainer unavailable for editing" to={retainerRoot} label="Back to Retainers" />
  return <RetainerForm key={id || params.toString()} original={original} clientId={params.get('client')} />
}
function RetainerForm({ original, clientId }) {
  const { state, commit } = useApp()
  const go = useGo()
  const [form, setForm] = useState(() => retainerForm(state, original, clientId))
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const linked = linkedRecords(state, original)
  const back = original ? `${retainerRoot}/${original.id}` : retainerRoot
  const patch = changes => setForm(old => ({ ...old, ...changes }))
  const input = (key, attrs = {}) => <input {...attrs} value={form[key]} onChange={e => patch({ [key]: e.target.value })} />
  function next(e) {
    e.preventDefault(); setError('')
    try {
      validateRetainer(state, form, original?.id)
      if (!preview) return setPreview(true)
      const data = commit(current => saveRetainer(current, form, original?.id), original ? 'Retainer updated' : 'Retainer saved')
      go(`${retainerRoot}/${original?.id || data.retainers.at(-1).id}`)
    } catch (failure) { setError(failure.message) }
  }
  return <form className="form-stack" onSubmit={next} noValidate>
    <PageHead title={preview ? 'Review Retainer Invoice' : original ? 'Edit Terms' : 'Set Up Your Retainer'} back={{ to: back, label: 'Retainers' }}>
      <AppLink to={back} className="button">Cancel</AppLink>
      {preview && <button type="button" className="button" onClick={() => { setPreview(false); setError('') }}>Back to Terms</button>}
      <button className="button positive" type="submit">{preview ? 'Save' : 'Set and Continue'}</button>
    </PageHead>
    <ErrorNote>{error}</ErrorNote>
    <div className="document-grid">
      {!preview ? <section className="card document form-stack">
        <h2>Retainer Terms</h2>
        <div className="form-grid">
          <Field label="Client" hint={activeForClient(state, form.clientId, original?.id) ? 'This client already has an active retainer.' : undefined}><SearchPick rows={state.clients.filter(row => visible(row) || row.id === form.clientId)} value={form.clientId} disabled={linked}
            onChange={client => patch({ clientId: client, currency: find(state.clients, client)?.currency || form.currency })} /></Field>
          <Field label="Start Date"><input type="date" value={form.startDate} disabled={linked} onChange={e => patch({
            startDate: e.target.value, ...(!original && form.startDate === form.nextIssueDate ? { nextIssueDate: e.target.value } : {}),
          })} /></Field>
          <Field label="Retainer Period"><select value={form.periodUnit} disabled={linked} onChange={e => patch({ periodUnit: e.target.value })}>{periodUnits.map(unit => <option key={unit} value={unit}>{titleCase(unit)}</option>)}</select></Field>
          {form.periodUnit === 'custom' && <Field label="Custom Period (days)">{input('customPeriodDays', { type: 'number', min: 1, max: 3650, disabled: linked })}</Field>}
          <Field label="Fee per Period">{input('feePerPeriod', { type: 'number', min: '.01', step: '.01' })}</Field>
          <Field label="Included Hours">{input('includedHours', { type: 'number', min: 0, step: 'any' })}</Field>
          <Field label="Excess Hourly Rate">{input('excessHourlyRate', { type: 'number', min: 0, step: '.01' })}</Field>
          <Field label="Currency"><select value={form.currency} disabled={linked} onChange={e => patch({ currency: e.target.value })}>{currencies.map(code => <option key={code}>{code}</option>)}</select></Field>
        </div>
        <h2>Invoice Schedule</h2>
        <div className="form-grid">
          <Field label="Next Issue Date"><input type="date" value={form.nextIssueDate} onChange={e => patch({ nextIssueDate: e.target.value })} disabled={!form.infinite && Number(form.invoicesRemaining) === 0} /></Field>
          <Field label="Number of Invoices"><select value={form.infinite ? 'infinite' : 'specific'} onChange={e => patch({ infinite: e.target.value === 'infinite' })}><option value="infinite">Infinite</option><option value="specific">A specific number</option></select></Field>
          {!form.infinite && <Field label="Invoices Remaining">{input('invoicesRemaining', { type: 'number', min: original ? 0 : 1, step: 1 })}</Field>}
          <Field label="Invoice Delivery"><select value={form.deliveryMode} onChange={e => patch({ deliveryMode: e.target.value })}>{deliveryModes.map(mode => <option key={mode} value={mode}>{deliveryNames[mode]}</option>)}</select></Field>
        </div>
      </section> : <section className="card document form-stack">
        <div className="section-heading"><div><h2>Retainer Invoice</h2><p>{state.business?.name}</p></div><div className="document-amount"><small>Fee per Period</small><strong>{money(form.feePerPeriod, form.currency)}</strong></div></div>
        <div className="form-grid document-metadata">
          <div><small>Bill To</small><p>{nameOf(state.clients, form.clientId)}</p></div>
          <div><small>Next Issue Date</small><p>{dateLabel(form.nextIssueDate)}</p></div>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Description</th><th className="number">Quantity</th><th className="number">Amount</th></tr></thead>
          <tbody><tr><td>{titleCase(form.periodUnit)} Retainer Fee</td><td className="number">1</td><td className="number">{money(form.feePerPeriod, form.currency)}</td></tr></tbody>
        </table></div>
        <div className="form-grid">{['invoiceNotes', 'invoiceTerms'].map(key => <Field label={key === 'invoiceNotes' ? 'Invoice Notes' : 'Invoice Terms'} key={key}>
          <textarea value={form[key]} onChange={e => patch({ [key]: e.target.value })} />
        </Field>)}</div>
      </section>}
      <aside className="card settings"><h2>Billing Terms</h2><dl className="details">
        <div><dt>Period</dt><dd>{cadence(form)}</dd></div>
        <div><dt>Fee</dt><dd>{money(form.feePerPeriod, form.currency)}</dd></div>
        <div><dt>Included</dt><dd>{hours(Math.max(0, Math.round((Number(form.includedHours) || 0) * 60)))}</dd></div>
        <div><dt>Excess Rate</dt><dd>{money(form.excessHourlyRate, form.currency)} / hr</dd></div>
      </dl></aside>
    </div>
  </form>
}
