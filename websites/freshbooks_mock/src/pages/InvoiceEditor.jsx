import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, Empty, ErrorNote, Field, Menu, Missing, PageHead, Pick, SearchPick, useGo } from '../components/ui.jsx'
import { calculateInvoice, invoiceSources, manualLine, newInvoice, paidAmount, saveInvoice } from '../data/invoice.js'
import { excessTerms } from '../data/retainer.js'
import { currencies, find, money, visible } from '../utils/format.js'
import { ImportDialog } from '../components/ImportDialog.jsx'
import { SendDialog } from '../components/InvoiceActions.jsx'
import { InvoiceTotals } from './Invoices.jsx'

export function InvoiceEditor() {
  const { state } = useApp()
  const { id } = useParams()
  const [params] = useSearchParams()
  const original = find(state.invoices, id)
  const duplicate = find(state.invoices, params.get('duplicate'))
  if (id && (!original || visible(original, 'deleted'))) return <Missing title="Invoice unavailable for editing" to="/invoices" label="Back to Invoices" />
  if (params.get('duplicate') && !duplicate) return <Missing title="Invoice to duplicate is unavailable" to="/invoices" label="Back to Invoices" />
  const excess = params.get('excess')
  const preset = !id && excess ? excessTerms(state, excess, params.get('period')) : null
  if (!id && excess && !preset) return <Missing title="No eligible excess time" to={`/invoices/retainers/${excess}`} label="Back to Retainer" />
  return <InvoiceForm key={id || params.toString()} original={original} duplicate={duplicate} preset={preset} clientId={params.get('client')} autoImport={params.get('import') === '1'} />
}

function InvoiceForm({ original, duplicate, preset, clientId, autoImport }) {
  const { state, commit } = useApp()
  const go = useGo()
  const [draft, setDraft] = useState(() => original ? {
    ...original, kind: original.kind || 'standard', lines: (original.lines || []).map(line => ({
      kind: 'manual', quantity: 1, rate: 0, taxPercent: 0, ...line,
    })), discountPercent: original.discountPercent || 0, currency: original.currency || 'USD',
  } : newInvoice(state, { clientId, duplicate, preset }))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [importing, setImporting] = useState(autoImport && !original)
  const back = original ? `/invoices/${original.id}` : preset ? `/invoices/retainers/${preset.retainerId}?period=${preset.retainerPeriodStart}` : '/invoices'
  const retainerInvoice = Boolean(draft.retainerId)
  const linked = draft.lines.some(line => line.sources?.length) || draft.retainerId || Number(original?.amountPaid) > 0
  const totals = calculateInvoice(draft.lines, draft.discountPercent, original ? paidAmount(state, original) : 0)
  const patch = fields => setDraft(old => ({ ...old, ...fields }))
  const input = (key, attributes = {}) => <input {...attributes} value={draft[key] ?? ''} onChange={e => patch({ [key]: e.target.value })} />
  const updateLine = (id, fields) => patch({ lines: draft.lines.map(line => line.id === id ? { ...line, ...fields } : line) })
  function move(index, offset) {
    const lines = [...draft.lines]
    ;[lines[index + offset], lines[index]] = [lines[index], lines[index + offset]]
    patch({ lines })
  }
  function addLine(service) {
    patch({ lines: [...draft.lines, manualLine(service ? { serviceId: service.id, name: service.name, description: service.description || '', rate: service.defaultRate || 0, taxPercent: service.defaultTaxPercent || 0 } : {})] })
  }
  function save(delivery) {
    const next = commit(current => saveInvoice(current, draft, { id: original?.id, duplicate: duplicate?.id, delivery }), delivery ? 'Invoice sent' : original ? 'Invoice updated' : 'Invoice saved')
    go(`/invoices/${original?.id || next.invoices.at(-1).id}`)
  }
  function finish(e) {
    e.preventDefault()
    try { save() } catch (failure) { setError(failure.message) }
  }
  return <><form className="form-stack" id="invoice-editor" onSubmit={finish} noValidate>
    <PageHead title={original ? 'Edit Invoice' : duplicate ? 'Duplicate Invoice' : preset ? 'Invoice Retainer Excess' : 'New Invoice'} back={{ to: back, label: original?.invoiceNumber || (preset ? 'Retainer' : 'Invoices') }}>
      <AppLink className="button" to={back}>Cancel</AppLink><button className="button positive" type="submit">Save</button><button className="button" type="button" onClick={() => setSending(true)}>Send To</button>
    </PageHead>
    <ErrorNote>{error}</ErrorNote>
    <div className="document-grid">
      <section className="card document form-stack">
        <div className="section-heading"><div><h2>Invoice</h2><p>{state.business?.name || 'Your business'}</p></div><div className="document-amount"><small>Amount Due</small><strong>{money(totals.amountDue, draft.currency)}</strong></div></div>
        <div className="form-grid document-metadata">
          <Field label="Bill To"><SearchPick label="Bill To" rows={state.clients.filter(row => visible(row) || row.id === draft.clientId)} value={draft.clientId} disabled={Boolean(linked)}
            onChange={client => patch({ clientId: client, projectId: '', currency: find(state.clients, client)?.currency || draft.currency })} /></Field>
          <Field label="Invoice Number">{input('invoiceNumber')}</Field>
          <Field label="Issue Date">{input('issueDate', { type: 'date' })}</Field>
          <Field label="Due Date">{input('dueDate', { type: 'date' })}</Field>
          <Field label="Reference">{input('reference')}</Field>
          <Field label="Project"><Pick rows={state.projects.filter(row => row.clientId === draft.clientId)} value={draft.projectId} onChange={projectId => patch({ projectId })} empty="No Project" /></Field>
        </div>
        <div className="table-scroll editor-lines"><table><thead><tr><th>Item / Description</th><th className="number">Rate</th><th className="number">Qty</th><th className="number">Tax %</th><th className="number">Total</th><th>Actions</th></tr></thead>
          <tbody>{draft.lines.map((line, index) => {
            const locked = line.sources?.length > 0 || line.kind === 'retainer_fee'
            const lineInput = (key, label, attrs = {}) => <input {...attrs} aria-label={`${label}, line ${index + 1}`} value={line[key] ?? ''} onChange={e => updateLine(line.id, { [key]: e.target.value })} />
            return <tr key={line.id}>
              <td>{lineInput('name', 'Item', { placeholder: 'Item name', readOnly: Boolean(locked) })}
                {lineInput('description', 'Description', { placeholder: 'Description' })}
                {line.sources?.length > 0 && <small>{line.sources.length} linked {line.sources.length === 1 ? 'record' : 'records'}</small>}</td>
              <td className="number">{lineInput('rate', 'Rate', { type: 'number', min: 0, step: '.01', readOnly: Boolean(locked) })}</td>
              <td className="number">{lineInput('quantity', 'Quantity', { type: 'number', min: '.01', step: 'any', readOnly: Boolean(locked) })}</td>
              <td className="number">{lineInput('taxPercent', 'Tax', { type: 'number', min: 0, max: 100, step: 'any', readOnly: retainerInvoice })}</td>
              <td className="number">{money(totals.lines[index].lineSubtotal, draft.currency)}</td>
              <td><div className="line-actions">
                <button type="button" className="icon-button" aria-label={`Move line ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" className="icon-button" aria-label={`Move line ${index + 1} down`} disabled={index === draft.lines.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" className="icon-button text-danger" aria-label={`Remove line ${index + 1}`} disabled={retainerInvoice} onClick={() => patch({ lines: draft.lines.filter(item => item.id !== line.id) })}><Trash2 size={14} /></button>
              </div></td>
            </tr>
          })}</tbody>
        </table></div>
        {!draft.lines.length && <Empty title="No line items added" />}
        {!retainerInvoice && <div><Menu label="Add a Line" icon={<Plus size={15} />}>
          {draft.kind === 'standard' && <button type="button" onClick={() => setImporting(true)}>Import Unbilled Time and Expenses</button>}
          <button type="button" onClick={() => addLine()}>Custom line</button>
          {state.services.filter(row => row.active !== false).map(row => <button type="button" key={row.id} onClick={() => addLine(row)}>{row.name}</button>)}
        </Menu></div>}
        <InvoiceTotals invoice={{ ...totals, currency: draft.currency }} />
        <div className="form-grid">
          {['notes', 'terms'].map(key => <Field key={key} label={key === 'notes' ? 'Notes' : 'Terms'}>
            <textarea value={draft[key] || ''} onChange={e => patch({ [key]: e.target.value })} />
          </Field>)}
        </div>
      </section>
      <aside className="card settings form-stack"><h2>Invoice Settings</h2>
        <Field label="Currency"><select value={draft.currency} disabled={Boolean(linked)} onChange={e => patch({ currency: e.target.value })}>{currencies.map(code => <option key={code}>{code}</option>)}</select></Field>
        <Field label="Discount (%)">{input('discountPercent', { type: 'number', min: 0, max: 100, step: 'any', readOnly: retainerInvoice })}</Field>
      </aside>
    </div>
  </form>
    {importing && <ImportDialog clientId={draft.clientId} currency={draft.currency} excluded={invoiceSources(draft)} locked={Boolean(linked || draft.clientId && draft.lines.length)}
      onClose={() => setImporting(false)} onImport={(scope, lines) => {
        patch({ clientId: scope.clientId, currency: scope.currency, projectId: draft.clientId === scope.clientId ? draft.projectId : '', lines: [...draft.lines, ...lines] })
        setImporting(false)
      }} />}
    {sending && <SendDialog client={find(state.clients, draft.clientId)} invoiceNumber={draft.invoiceNumber} onClose={() => setSending(false)} onSend={save} />}
  </>
}
