import { useRef, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, Dialog, Empty, ErrorNote, Field, Ledger, Menu, Missing, PageHead, Pick, SearchBox, SearchPick, Status, Tabs, sortRows, useFilters, useGo } from '../components/ui.jsx'
import { ReceiptPicker, ReceiptPreview, receiptType, uploadReceipt } from '../components/Receipt.jsx'
import { Confirm } from '../components/InvoiceActions.jsx'
import { changeExpenses, expenseForm, saveExpense, uncategorized, validateExpense } from '../data/expense.js'
import { linkedInvoice } from '../data/time.js'
import { currencies, dateLabel, find, inRange, matches, money, nameOf, titleCase, visible } from '../utils/format.js'

const root = '/expenses'
const columns = [
  { key: 'merchant', label: 'Merchant / Category' }, { key: 'expenseDate', label: 'Date / Source' },
  { label: 'Client / Project / Description' }, { key: 'total', label: 'Amount / Tax', number: true },
  { label: 'Billing Status' }, { label: 'Actions' },
]
export const categories = state => [state.expenseCategories.find(row => row.id === uncategorized) || { id: uncategorized, name: 'Uncategorized Expenses' }, ...state.expenseCategories.filter(row => row.id !== uncategorized && row.active !== false)]
const statusOf = row => row.status || (row.billable ? 'unbilled' : 'non_billable')
const taxesOf = row => (row.taxes || []).reduce((sum, tax) => sum + (Number(tax.amount) || 0), 0)
const categoryOf = (state, id) => nameOf(state.expenseCategories, id, id === uncategorized ? 'Uncategorized Expenses' : 'Unavailable category')

export function Expenses() {
  const { state, commit } = useApp()
  const [params, filter] = useFilters()
  const [selection, setSelection] = useState([])
  const [quick, setQuick] = useState(false)
  const [category, setCategory] = useState(false)
  const [sort, setSort] = useState({ key: 'expenseDate', desc: true })
  const visibility = params.get('visibility') || 'active'
  const rows = sortRows(state.expenses.filter(row => visible(row, visibility) &&
    (!params.get('client') || params.get('client') === row.clientId) &&
    (!params.get('category') || params.get('category') === row.categoryId) &&
    (!params.get('status') || params.get('status') === statusOf(row)) &&
    (!params.get('currency') || params.get('currency') === row.currency) &&
    inRange(row.expenseDate || '', params.get('from'), params.get('to')) &&
    matches(params.get('q'), row.merchant, row.description, nameOf(state.clients, row.clientId), nameOf(state.projects, row.projectId), categoryOf(state, row.categoryId))), sort)
  const selected = selection.filter(id => rows.some(row => row.id === id))
  return <>
    <PageHead title="Expenses"><AppLink to="/expenses/new" className="button primary"><Plus size={16} />New Expense</AppLink></PageHead>
    <section className="card ledger">
      <div className="ledger-bar"><h2>{visibility === 'active' ? 'All Expenses' : titleCase(visibility) + ' Expenses'}</h2><SearchBox value={params.get('q')} onChange={q => filter('q', q)} placeholder="Search expenses" /></div>
      <div className="ledger-tabs"><Tabs values={['active', 'archived', 'deleted']} value={visibility} change={value => { filter('visibility', value === 'active' ? '' : value); setSelection([]); setQuick(false) }} /></div>
      <div className="filter-bar">
        <Field label="Category"><Pick rows={categories(state)} value={params.get('category')} onChange={v => filter('category', v)} empty="All categories" /></Field>
        <Field label="Client"><Pick rows={state.clients} value={params.get('client')} onChange={v => filter('client', v)} empty="All clients" /></Field>
        <Field label="Billing status"><select value={params.get('status') || ''} onChange={e => filter('status', e.target.value)}><option value="">All statuses</option>
          {['unbilled', 'billed', 'non_billable'].map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
        <Field label="Currency"><select value={params.get('currency') || ''} onChange={e => filter('currency', e.target.value)}><option value="">All currencies</option>
          {currencies.map(code => <option key={code}>{code}</option>)}</select></Field>
        <Field label="From"><input type="date" value={params.get('from') || ''} onChange={e => filter('from', e.target.value)} /></Field>
        <Field label="Through"><input type="date" value={params.get('to') || ''} onChange={e => filter('to', e.target.value)} /></Field>
      </div>
      {selected.length > 0 && visibility !== 'deleted' && <div className="selection-bar"><strong>{selected.length} selected</strong><Menu label="Bulk Actions"><button type="button" onClick={() => setCategory(true)}>Change Category</button></Menu></div>}
      {visibility === 'active' && (quick ? <ExpenseForm compact onClose={() => setQuick(false)} /> : <div className="inline-add">
        <button type="button" className="button" onClick={() => setQuick(true)}><Plus size={16} />New Expense</button>
      </div>)}
      <Ledger rows={rows} columns={columns} sort={sort} setSort={setSort} selected={selected} onSelect={setSelection}
        empty={<Empty title={state.expenses.length ? 'No matching expenses' : 'No expenses yet'} />} render={row => <>
          <td><AppLink to={`/expenses/${row.id}`} className="row-link">{row.merchant || 'Unnamed merchant'}</AppLink><small>{categoryOf(state, row.categoryId)}</small></td>
          <td>{dateLabel(row.expenseDate)}<small>{titleCase(row.source || 'manual')}</small></td>
          <td>{nameOf(state.clients, row.clientId)}<small>{row.projectId ? nameOf(state.projects, row.projectId) : ''}{row.description && (row.projectId ? ' · ' : '') + row.description}</small></td>
          <td className="number">{money(row.total, row.currency)}<small>{taxesOf(row) ? money(taxesOf(row), row.currency) + ' tax' : '—'}</small></td>
          <td><Status value={statusOf(row)} /></td><td className="row-actions"><ExpenseMenu row={row} compact /></td>
        </>} />
    </section>
    {category && <CategoryDialog onClose={() => setCategory(false)} onSave={value => {
      commit(current => changeExpenses(current, selected, 'category', value), 'Expense categories updated'); setCategory(false); setSelection([])
    }} />}
  </>
}
function CategoryDialog({ onClose, onSave }) {
  const { state } = useApp()
  const [value, setValue] = useState(uncategorized)
  const [error, setError] = useState('')
  return <Dialog title="Change Category" onClose={onClose}><form className="form-stack" onSubmit={e => {
    e.preventDefault()
    try { onSave(value) } catch (failure) { setError(failure.message) }
  }}>
    <Field label="Category"><Pick rows={categories(state)} value={value} onChange={setValue} empty={null} /></Field>
    <ErrorNote>{error}</ErrorNote>
    <div className="form-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button positive" type="submit">Change Category</button></div>
  </form></Dialog>
}
function ExpenseMenu({ row, compact }) {
  const { state, commit } = useApp()
  const [action, setAction] = useState(null)
  const deleted = visible(row, 'deleted')
  const linked = linkedInvoice(state, row.invoiceId)
  const label = { archived: 'Archive', deleted: 'Delete', active: 'Restore' }[action]
  return <>
    <Menu label={compact ? 'Expense actions' : 'More Actions'} icon={compact && <MoreHorizontal size={18} />} className={compact ? 'icon-menu' : ''} buttonClass={compact ? 'icon-button' : 'button'}>
      {compact && <AppLink to={`/expenses/${row.id}`}>View Expense</AppLink>}
      {compact && !deleted && <AppLink to={`/expenses/${row.id}/edit`}>Edit</AppLink>}
      <AppLink to={`/expenses/new?duplicate=${encodeURIComponent(row.id)}`}>Duplicate</AppLink>
      {visible(row) && !linked && <button type="button" onClick={() => setAction('archived')}>Archive</button>}
      {!deleted && !linked && <button className="text-danger" type="button" onClick={() => setAction('deleted')}>Delete</button>}
      {!visible(row) && <button type="button" onClick={() => setAction('active')}>Restore</button>}
    </Menu>
    {action && <Confirm title={label + ' Expense'} label={label} detail={`${label} this expense?`} onClose={() => setAction(null)} danger={action === 'deleted'}
      onConfirm={() => { commit(current => changeExpenses(current, [row.id], 'visibility', action), action === 'active' ? 'Expense restored' : `Expense ${action}`); setAction(null) }} />}
  </>
}
export function ExpenseDetail() {
  const { state } = useApp()
  const { id } = useParams()
  const row = find(state.expenses, id)
  if (!row) return <Missing title="Expense unavailable" to={root} label="Back to Expenses" />
  return <>
    <PageHead title={row.merchant || 'Expense'} back={{ to: root, label: 'Expenses' }}>
      <ExpenseMenu row={row} />{!visible(row, 'deleted') && <AppLink to={`/expenses/${id}/edit`} className="button primary">Edit</AppLink>}
    </PageHead>
    <div className="document-grid">
      <section className="card document form-stack"><div className="section-heading"><h2>Expense Details</h2><Status value={statusOf(row)} /></div>
        <p>{row.description || categoryOf(state, row.categoryId)}</p>
        <ReceiptPreview receipt={row.receipt} />
        <dl className="details">
          <div><dt>Date</dt><dd>{dateLabel(row.expenseDate)}</dd></div><div><dt>Category</dt><dd>{categoryOf(state, row.categoryId)}</dd></div>
          <div><dt>Source</dt><dd>{titleCase(row.source || 'manual')}</dd></div><div><dt>Tax included</dt><dd>{money(taxesOf(row), row.currency)}</dd></div>
          <div><dt>Gross Total</dt><dd>{money(row.total, row.currency)}</dd></div>
        </dl>
      </section>
      <section className="card settings"><h2>Expense Settings</h2><dl className="details">
        <div><dt>Client</dt><dd>{nameOf(state.clients, row.clientId)}</dd></div><div><dt>Project</dt><dd>{nameOf(state.projects, row.projectId)}</dd></div>
        <div><dt>Visibility</dt><dd>{titleCase(row.visibility || 'active')}</dd></div>
        {row.billable && <div><dt>Markup</dt><dd>{row.markupPercent || 0}%</dd></div>}
        {row.invoiceId && <div><dt>Invoice</dt><dd><AppLink to={`/invoices/${row.invoiceId}`}>View invoice</AppLink></dd></div>}
      </dl></section>
    </div>
  </>
}

export function ExpenseEditor() {
  const { state } = useApp()
  const { id } = useParams()
  const [params] = useSearchParams()
  const original = find(state.expenses, id)
  const duplicate = find(state.expenses, params.get('duplicate'))
  if (id && (!original || visible(original, 'deleted'))) return <Missing title="Expense unavailable for editing" to={root} label="Back to Expenses" />
  if (params.get('duplicate') && !duplicate) return <Missing title="Expense to duplicate is unavailable" to={root} label="Back to Expenses" />
  return <ExpenseForm key={id || params.toString()} original={original} duplicate={duplicate} />
}
function ExpenseForm({ original, duplicate, compact, onClose }) {
  const { state, commit } = useApp()
  const go = useGo()
  const [form, setForm] = useState(() => expenseForm(state, original || duplicate, Boolean(duplicate)))
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [receiptError, setReceiptError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const back = original ? `/expenses/${original.id}` : root
  const patch = fields => setForm(old => ({ ...old, ...fields }))
  const input = (key, attrs = {}) => <input {...attrs} value={form[key]} onChange={e => patch({ [key]: e.target.value })} />
  const locked = Boolean(linkedInvoice(state, original?.invoiceId))
  const main = <>
    <Field label="Merchant">{input('merchant', { placeholder: 'Add merchant' })}</Field>
    <Field label="Category"><Pick value={form.categoryId} rows={categories(state)} empty={null} onChange={categoryId => patch({ categoryId })} /></Field>
    <Field label="Expense Date">{input('expenseDate', { type: 'date' })}</Field>
    <Field label="Gross Total">{input('total', { type: 'number', min: '.01', step: '.01', placeholder: '0.00' })}</Field>
  </>
  async function submit(e) {
    e.preventDefault()
    if (saving.current) return
    setError('')
    saving.current = true
    setBusy(true)
    try {
      validateExpense(state, form, original?.id)
      const receipt = file ? await uploadReceipt(file) : form.receipt
      const next = commit(current => saveExpense(current, { ...form, receipt }, { id: original?.id, duplicate: duplicate?.id }), original ? 'Expense updated' : 'Expense saved')
      if (compact) onClose()
      else go(`/expenses/${original?.id || next.expenses.at(-1).id}`)
    } catch (failure) { setError(failure.message) }
    finally { saving.current = false; setBusy(false) }
  }
  return <form className={compact ? 'inline-editor form-stack' : 'form-stack'} onSubmit={submit} noValidate>
    {!compact && <PageHead title={original ? 'Edit Expense' : duplicate ? 'Duplicate Expense' : 'New Expense'} back={{ to: back, label: original?.merchant || 'Expenses' }}>
      {busy ? <button className="button" type="button" disabled>Cancel</button> : <AppLink className="button" to={back}>Cancel</AppLink>}
      <button type="submit" className="button positive" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </PageHead>}
    <ErrorNote>{error}</ErrorNote>
    {compact ? <><div className="form-grid">{main}</div><div className="form-actions">
      <AppLink className="button" to="/expenses/new">Open full editor</AppLink><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button positive" type="submit">Save Expense</button>
    </div></> : <div className="document-grid">
      <section className="card document form-stack"><h2>Expense Details</h2>
        <ReceiptPicker receipt={form.receipt} file={file} busy={busy} error={receiptError} onChoose={candidate => {
          if (!receiptType(candidate) || !candidate.size) { setReceiptError('Choose a nonempty JPEG, PNG or PDF file.'); return }
          setReceiptError(''); setFile(candidate)
        }} onRemove={() => { setFile(null); patch({ receipt: null }); setReceiptError('') }} />
        <div className="form-grid">
        {main}
        <Field label="Description" className="span-2"><textarea value={form.description} onChange={e => patch({ description: e.target.value })} placeholder="Add description" /></Field>
      </div>
        <h3>Taxes included in gross total</h3>
        {form.taxes.map((tax, index) => <div className="tax-row" key={index}>
          <Field label="Tax Name"><input value={tax.name} onChange={e => patch({ taxes: form.taxes.map((row, i) => i === index ? { ...row, name: e.target.value } : row) })} /></Field>
          <Field label="Tax Amount"><input type="number" min="0" step=".01" value={tax.amount} onChange={e => patch({ taxes: form.taxes.map((row, i) => i === index ? { ...row, amount: e.target.value } : row) })} /></Field>
          <button className="button danger" type="button" onClick={() => patch({ taxes: form.taxes.filter((_, i) => i !== index) })}>Remove</button>
        </div>)}
        <div><button className="button" type="button" onClick={() => patch({ taxes: [...form.taxes, { name: 'Sales Tax', percent: null, amount: '' }] })}><Plus size={15} />Add Taxes</button></div>
        <div className="document-amount"><small>Gross Total</small><strong>{money(form.total, form.currency)}</strong></div>
      </section>
      <aside className="card settings form-stack"><h2>Expense Settings</h2>
        <Field label="Currency"><select disabled={locked || busy} value={form.currency} onChange={e => patch({ currency: e.target.value })}>{currencies.map(code => <option key={code}>{code}</option>)}</select></Field>
        <h3>Assign to Client/Project</h3>
        {locked && <small>Billing assignment is linked to an invoice.</small>}
        <Field label="Client"><SearchPick rows={state.clients.filter(row => visible(row) || row.id === form.clientId)} value={form.clientId} disabled={locked || busy}
          onChange={clientId => patch({ clientId, projectId: '', ...(clientId ? {} : { billable: false, markupPercent: 0, includeReceiptOnInvoice: false }) })} /></Field>
        <Field label="Project"><Pick rows={state.projects.filter(row => row.status !== 'archived' && (!form.clientId || row.clientId === form.clientId) || row.id === form.projectId)}
          value={form.projectId} disabled={locked || busy} empty="No Project" onChange={projectId => {
            const selected = find(state.projects, projectId)
            patch({ projectId, clientId: selected?.clientId || form.clientId, markupPercent: selected?.expenseMarkupPercent ?? form.markupPercent })
          }} /></Field>
        <label className="check-label"><input type="checkbox" checked={form.billable} disabled={locked || busy || !form.clientId} onChange={e => patch(e.target.checked
          ? { billable: true, markupPercent: find(state.projects, form.projectId)?.expenseMarkupPercent ?? form.markupPercent }
          : { billable: false, markupPercent: 0, includeReceiptOnInvoice: false })} />Mark as billable</label>
        {form.billable && <>
          <Field label="Markup (%)">{input('markupPercent', { type: 'number', min: 0, step: 'any', disabled: busy })}</Field>
          <label className="check-label"><input type="checkbox" disabled={busy} checked={form.includeReceiptOnInvoice} onChange={e => patch({ includeReceiptOnInvoice: e.target.checked })} />Include receipt image on invoice</label>
        </>}
      </aside>
    </div>}
  </form>
}
