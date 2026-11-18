import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { Field, Section } from '../components/Controls.jsx'
import { DraftField, DraftPicker, FormHeader, LineTable, RecordFields, Summary, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import LineEditor from '../components/LineEditor.jsx'
import SourceLines from '../components/SourceLines.jsx'
import { addressText, documentNo, find, formatDate, linesOf, money, nameOf, number, plusDays, round } from '../utils/model.js'
import { totals } from '../utils/derived.js'
import { canChangeInvoice, invoiceDraft, invoiceParty, saveInvoice, voidInvoice } from '../utils/receivables.js'
import { recordPath, sourcePath } from '../utils/routes.js'
import TransactionView from './TransactionView.jsx'
import { Unavailable } from './RouteFrame.jsx'

function InvoiceForm({ code, title, record, source }) {
  const { state } = useWorkspace()
  const [draft, change, setDraft] = useDraft(() => invoiceDraft(state, source, record))
  const action = useRecordAction(code)
  const main = { draft, change }
  const sourceUrl = source && recordPath('salesord', source)
  const lines = linesOf(draft)
  const preview = totals(source ? lines.filter((line) => line.selected).map((line) => ({ ...line, amount: round(number(line.quantity) * number(line.rate)) })) : lines, draft)
  const updateDue = (key, value) => setDraft((old) => {
    const next = { ...old, [key]: value }
    return { ...next, dueDate: plusDays(next.tranDate, find(state, 'terms', next.termsId)?.days) }
  })
  return <>
    <FormHeader title={title} code={code} record={record} back={record ? undefined : sourceUrl}
      submit={() => action.run((latest) => saveInvoice(latest, draft, { id: record?.id, sourceId: source?.id }))} />
    <div className="record-grid">
      <Section title="Primary Information"><div className="fields">
        {source ? <>
          <Field label="Created From" value={<AppLink to={sourceUrl}>{documentNo(source)}</AppLink>} />
          <Field label="Customer" value={nameOf(state, 'customers', source.customerId)} />
        </> : <DraftPicker {...main} title="Customer" name="customerId" entries="customers" required
          onChoose={(id) => setDraft((old) => invoiceParty(state, old, id))} />}
        <DraftField {...main} title="Date" name="tranDate" type="date" required reflect={(value) => updateDue('tranDate', value)} />
        <DraftField {...main} title="Terms" name="termsId" options="terms" reflect={(value) => updateDue('termsId', value)} />
        <DraftField {...main} title="Due Date" name="dueDate" type="date" required />
        {source ? <Field label="Location" value={nameOf(state, 'locations', source.locationId)} />
          : <DraftField {...main} title="Location" name="locationId" options="locations" />}
        <DraftField {...main} title="PO # / Reference No." name="otherRefNum" />
        <DraftField {...main} title="Memo" name="memo" type="textarea" />
      </div></Section>
      <Summary values={[[ 'Subtotal', preview.subtotal ], ['Tax', preview.taxTotal], ['Shipping', draft.shippingCost], ['Total', preview.total, true]]} />
    </div>
    <Tabs tabs={[
      ['Items', source ? <SourceLines code={code} lines={lines} onChange={(value) => change('lines', value)} />
        : <LineEditor lines={lines} onChange={(value) => change('lines', value)} fail={action.error} />],
      ['Billing', <div className="fields">
        <DraftField {...main} title="Billing Address" name="billAddress" type="textarea" />
        <DraftField {...main} title="Tax Item" name="taxItemId" options="taxItems"
          reflect={(value) => setDraft((old) => ({ ...old, taxItemId: value, taxRate: find(state, 'customers', old.customerId)?.taxable === false ? 0 : number(find(state, 'taxItems', value)?.rate) }))} />
      </div>],
      ['Shipping', <div className="fields">
        <DraftField {...main} title="Ship Date" name="shipDate" type="date" />
        <DraftField {...main} title="Ship Method" name="shipMethodId" options="shipMethods" />
        {source ? <Field label="Shipping Cost" value={money(draft.shippingCost)} />
          : <DraftField {...main} title="Shipping Cost" name="shippingCost" type="number" min="0" step="0.01" />}
      </div>],
    ]} />
    {action.modal}
  </>
}

function InvoiceView(props) {
  const { state } = useWorkspace()
  const { code, record } = props
  const action = useRecordAction(code)
  const voidRecord = () => action.confirm({
    title: 'Void Invoice', confirm: 'Void', message: 'Are you sure you want to void this transaction? This cannot be undone.',
    onConfirm: () => action.run((latest) => voidInvoice(latest, record.id), { go: null, message: 'Invoice voided.' }),
  })
  return <><TransactionView {...props}
    actions={<>{canChangeInvoice(record) && <AppLink className="button primary" to={recordPath(code, record, true)}>Edit</AppLink>}
      {record.status === 'Open' && number(record.amountRemaining) > 0 && <AppLink className="button" to={sourcePath('custpymt', record)}>Accept Payment</AppLink>}
      {canChangeInvoice(record) && <details className="action-menu"><summary className="button">Actions ▾</summary><div className="popup">
        <button type="button" onClick={voidRecord}>Void</button>
      </div></details>}</>}
    tabs={[
      ['Items', <LineTable record={record} code={code} />],
      ['Billing', <RecordFields title="Billing" items={[
        ['Billing Address', addressText(record.billAddress)], ['Terms', nameOf(state, 'terms', record.termsId)], ['Due Date', formatDate(record.dueDate)],
      ]} />],
    ]}
    summary={[[ 'Subtotal', record.subtotal ], ['Tax', record.taxTotal], ['Shipping', record.shippingCost],
      ['Total', record.total, true], ['Amount Paid', record.amountPaid], ['Amount Remaining', record.amountRemaining]]} />
    {action.modal}</>
}

export default function Invoice(props) {
  const { state } = useWorkspace()
  const { record, editing, sourceId } = props
  if (record && (!editing || !canChangeInvoice(record))) return <InvoiceView {...props} />
  const id = record?.createdFromId || sourceId
  const source = find(state, 'salesOrders', id)
  if (id && !source) return <Unavailable {...props} />
  return <InvoiceForm {...props} source={source} />
}
