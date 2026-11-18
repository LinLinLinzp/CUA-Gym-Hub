import { useRef, useState } from 'react'
import { useToast, useWorkspace } from '../context/Workspace.jsx'
import { AppLink, useAppNavigate } from './Navigation.jsx'
import { DataTable, Dialog, Field, optionsFor, PageHeader, Picker, pickerEntries, Section } from './Controls.jsx'
import { ConfirmationRequired, ValidationError } from '../utils/ledger.js'
import { documentNo, formatDate, linesOf, money, nameOf, quantity, rows } from '../utils/model.js'
import { listPath, recordPath } from '../utils/routes.js'

export function useRecordAction(code) {
  const { commit, state } = useWorkspace()
  const toast = useToast()
  const navigate = useAppNavigate()
  const [dialog, setDialog] = useState(null)
  const busy = useRef(false)
  const finished = useRef(false)
  const close = () => setDialog(null)

  function run(operation, { go = 'record', message = 'Transaction successfully saved.', confirmed = false } = {}) {
    if (busy.current || finished.current) return
    busy.current = true
    try {
      const result = commit((latest) => operation(latest, confirmed))
      if (!result || result.record === null) return
      if (go) finished.current = true
      close()
      if (state.preferences?.showConfirmationBanners !== false) toast(message)
      if (go === 'list') navigate(listPath(code))
      else if (go === 'record') navigate(recordPath(code, result.record), { replace: true })
    } catch (error) {
      if (error instanceof ConfirmationRequired) {
        setDialog({ message: error.message, onConfirm: () => run(operation, { go, message, confirmed: true }) })
      } else if (error instanceof ValidationError) setDialog({ message: error.message })
      else {
        console.error(error)
        setDialog({ message: 'The record could not be saved. Try again.' })
      }
    } finally {
      busy.current = false
    }
  }
  return {
    run,
    confirm: setDialog,
    error: (message) => setDialog({ message }),
    modal: dialog && <Dialog key={dialog.message} {...dialog} onClose={close} />,
  }
}

export function useDraft(initial) {
  const [draft, setDraft] = useState(initial)
  return [draft, (key, value) => setDraft((old) => ({ ...old, [key]: value })), setDraft]
}

export function DraftField({ draft, change, name, title, options, reflect, ...props }) {
  const { state } = useWorkspace()
  const entries = typeof options === 'string' ? optionsFor(state, options, draft[name]) : options
  return <Field label={title} value={draft[name]} onChange={reflect || ((value) => change(name, value))} options={entries} {...props} />
}

export function DraftPicker({ draft, change, name, title, entries, onChoose, ...props }) {
  const { state } = useWorkspace()
  return <Picker title={title} value={draft[name]} onChange={onChoose || ((value) => change(name, value))}
    entries={typeof entries === 'string' ? pickerEntries(state, entries, draft[name]) : entries} {...props} />
}

export function Summary({ values, title = 'Summary' }) {
  return <aside className="panel">
    <h2 className="panel-heading">{title}</h2>
    <dl className="summary-values">{values.map(([name, amount, total]) => <div key={name} className={total ? 'total' : ''}><dt>{name}</dt><dd>{money(amount)}</dd></div>)}</dl>
  </aside>
}

export function Tabs({ tabs, initial = tabs[0]?.[0] }) {
  const [selection, setSelection] = useState(initial)
  const active = tabs.find(([title]) => title === selection) || tabs[0]
  return <section className="panel record-tabs">
    <div className="tabs" role="tablist" aria-label="Record details">{tabs.map(([title]) => <button key={title} type="button" role="tab"
      aria-selected={title === active?.[0]} onClick={() => setSelection(title)}>{title}</button>)}</div>
    <div role="tabpanel" aria-label={active?.[0]}>{active?.[1]}</div>
  </section>
}

export function FormHeader({ title, code, record, submit, back, children }) {
  const cancel = back || (record ? recordPath(code, record) : listPath(code))
  return <PageHeader title={title} before={<AppLink to={cancel}>Back to {record ? documentNo(record) : 'List'}</AppLink>}
    identity={record ? documentNo(record) : 'To Be Generated'} status={record?.status}>
    <button className="primary" type="button" onClick={submit}>Save</button>
    <AppLink className="button" to={cancel}>Cancel</AppLink>{children}
  </PageHeader>
}

export function RecordFields({ items, title = 'Primary Information' }) {
  return <Section title={title}><div className="fields">{items.map(([field, value]) => <Field key={field} label={field} value={value} />)}</div></Section>
}

export function Audit({ record, type }) {
  const { state } = useWorkspace()
  const notes = rows(state, 'systemNotes').filter((note) => note.recordId === record.id && note.recordType === type).reverse()
  const value = (entry) => entry && typeof entry === 'object' ? JSON.stringify(entry) : entry == null ? '—' : String(entry)
  return <DataTable records={notes} columns={[
    { title: 'Date', key: 'date', render: (row) => formatDate(row.date || row.createdAt) },
    { title: 'Set By', key: 'actor', render: (row) => nameOf(state, 'employees', row.setById) },
    { title: 'Context', key: 'context' }, { title: 'Type', key: 'type' }, { title: 'Field', key: 'field' },
    { title: 'Old Value', key: 'oldValue', render: (row) => value(row.oldValue) },
    { title: 'New Value', key: 'newValue', render: (row) => value(row.newValue) },
  ]} />
}

export function itemCell(state, line) {
  const item = rows(state, 'items').find((entry) => entry.id === line.itemId)
  return item ? <AppLink to={recordPath('item', item)}>{item.itemId || item.displayName || item.id}</AppLink> : line.itemId || '—'
}

const qtyCol = (title, key) => ({ title, key, numeric: true, render: (line) => quantity(line[key]) })
const moneyCol = (title, key) => ({ title, key, numeric: true, render: (line) => money(line[key]) })

export function LineTable({ record, code }) {
  const { state } = useWorkspace()
  const columns = [{ key: 'item', title: 'Item', render: (line) => itemCell(state, line) }]
  if (!['invadjst', 'invtrnfr'].includes(code)) columns.push({ key: 'description', title: 'Description' })
  if (code === 'invadjst') columns.push(qtyCol('Quantity On Hand', 'quantityOnHandBefore'), qtyCol('Adjust Qty. By', 'adjustQtyBy'),
    qtyCol('New Quantity', 'newQuantity'), moneyCol('Unit Cost', 'unitCost'))
  else {
    if (code === 'invtrnfr') columns.push(qtyCol('Quantity On Hand (From)', 'quantityOnHandFrom'))
    columns.push(qtyCol('Quantity', 'quantity'))
  }
  if (['salesord', 'purchord', 'itemrcpt', 'vendbill', 'custinvc'].includes(code)) columns.push(moneyCol('Rate', 'rate'), moneyCol('Amount', 'amount'))
  if (['salesord', 'purchord'].includes(code)) columns.push(code === 'salesord' ? qtyCol('Fulfilled', 'quantityFulfilled') : qtyCol('Received', 'quantityReceived'),
    qtyCol('Billed', 'quantityBilled'), { key: 'closed', title: 'Closed', render: (line) => line.isClosed ? 'Yes' : 'No' })
  if (code === 'purchord') columns.push({ key: 'expected', title: 'Expected Receipt Date', render: (line) => formatDate(line.expectedReceiptDate) })
  return <DataTable columns={columns} records={linesOf(record)} rowKey={(line) => line.lineId} />
}
