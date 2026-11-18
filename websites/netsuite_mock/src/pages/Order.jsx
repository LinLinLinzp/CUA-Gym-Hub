import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { choices, PageHeader, Section } from '../components/Controls.jsx'
import LineEditor from '../components/LineEditor.jsx'
import { Audit, DraftField, DraftPicker, FormHeader, LineTable, RecordFields, Summary, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import { documentNo, find, formatDate, linesOf, nameOf, number, partyOf } from '../utils/model.js'
import { eligible, purchaseOpen, salesOpen, totals } from '../utils/derived.js'
import { hasChildren } from '../utils/ledger.js'
import { defaultsForParty, isSales, orderAction, orderDraft, orderTerminal, saveOrder } from '../utils/orders.js'
import { listPath, recordPath, sourcePath } from '../utils/routes.js'

function OrderForm({ title, code, record }) {
  const { state } = useWorkspace()
  const [draft, change, setDraft] = useDraft(() => orderDraft(state, code, record))
  const action = useRecordAction(code)
  const sales = isSales(code)
  const linked = !!record && hasChildren(state, record.id)
  const restricted = orderTerminal(code, record)
  const main = { draft, change }
  const partyField = sales ? 'customerId' : 'vendorId'
  const summary = totals(linesOf(draft), draft)
  const submit = () => action.run((state, confirmed) => saveOrder(state, code, draft, record?.id, confirmed))
  const select = (partyId) => setDraft((old) => ({ ...old, ...defaultsForParty(state, code, partyId), [partyField]: partyId }))
  return <>
    <FormHeader title={title} code={code} record={record} submit={submit} />
    <div className="record-grid">
      <Section title="Primary Information"><div className="fields">
        {!restricted && <>
          <DraftPicker {...main} title={sales ? 'Customer' : 'Vendor'} name={partyField} entries={sales ? 'customers' : 'vendors'} onChoose={select} required disabled={linked} />
          <DraftField {...main} title="Date" name="tranDate" type="date" required />
          <DraftField {...main} title="Location" name="locationId" options="locations" required disabled={linked} />
          {sales ? <DraftField {...main} title="Sales Rep" name="salesRepId" options="employees" /> : <DraftField {...main} title="Employee" name="employeeId" options="employees" />}
          {sales && !record && <DraftField {...main} title="Status" name="status" options={choices('Pending Approval', 'Pending Fulfillment')} />}
          {!sales && <DraftField {...main} title="Receive By" name="dueDate" type="date" />}
          {!sales && !record && <DraftField {...main} title="Supervisor Approval" name="supervisorApproval" type="checkbox" />}
          <DraftField {...main} title="Department" name="departmentId" options="departments" />
          <DraftField {...main} title="Class" name="classId" options="classes" />
        </>}
        <DraftField {...main} title={sales ? 'PO # / Reference No.' : 'Vendor Reference'} name="otherRefNum" />
        <DraftField {...main} title="Memo" name="memo" type="textarea" />
      </div></Section>
      <Summary values={[['Subtotal', summary.subtotal], ['Tax', summary.taxTotal], ...(sales ? [['Shipping', draft.shippingCost]] : []), ['Total', summary.total, true]]} />
    </div>
    {!restricted && <Tabs tabs={[
      ['Items', <LineEditor lines={linesOf(draft)} purchase={!sales} onChange={(value) => change('lines', value)} fail={action.error} />],
      ['Shipping', <div className="fields">
        <DraftField {...main} title="Ship Method" name="shipMethodId" options="shipMethods" />
        {sales && <><DraftField {...main} title="Ship Date" name="shipDate" type="date" />
          <DraftField {...main} title="Shipping Cost" name="shippingCost" type="number" min="0" step="0.01" />
          <DraftField {...main} title="Shipping Address" name="shipAddress" type="textarea" /></>}
      </div>],
      ['Billing', <div className="fields"><DraftField {...main} title="Terms" name="termsId" options="terms" />
        {sales && <><DraftField {...main} title="Tax Item" name="taxItemId" options="taxItems"
          reflect={(value) => setDraft((old) => ({ ...old, taxItemId: value, taxRate: find(state, 'customers', old.customerId)?.taxable === false ? 0 : number(find(state, 'taxItems', value)?.rate) }))} />
          <DraftField {...main} title="Billing Address" name="billAddress" type="textarea" /></>}
      </div>],
    ]} />}
    {action.modal}
  </>
}

export function OrderView({ title, code, record, related }) {
  const { state } = useWorkspace()
  const action = useRecordAction(code)
  const sales = isSales(code)
  const pending = sales ? 'Pending Approval' : 'Pending Supervisor Approval'
  const open = sales ? salesOpen : purchaseOpen
  const movement = sales ? 'itemship' : 'itemrcpt'
  const bill = sales ? 'custinvc' : 'vendbill'
  const perform = (verb, options = {}) => action.run((state, confirmed) => orderAction(state, code, record.id, verb, { confirmed, reason: options.reason }),
    { go: verb === 'Delete' ? 'list' : null, message: `${title} ${{ Approve: 'approved', Reject: 'rejected', Close: 'closed', Cancel: 'cancelled', Delete: 'deleted' }[verb]}.` })
  const confirm = (verb, message, reason = false) => action.confirm({ title: `${verb} ${title}`, message, reason, onConfirm: (value) => perform(verb, { reason: value }) })
  const partyKey = sales ? 'customers' : 'vendors'
  const party = find(state, partyKey, record.customerId || record.vendorId)
  const allowsDelete = !orderTerminal(code, record) && !hasChildren(state, record.id)
  return <>
    <PageHeader title={title} before={<AppLink to={listPath(code)}>{sales ? 'Sales Orders' : 'Purchase Orders'}</AppLink>}
      identity={`${documentNo(record)} · ${partyOf(state, record)}`} status={record.status}>
      {record.status !== 'Cancelled' && <AppLink className="button primary" to={recordPath(code, record, true)}>Edit</AppLink>}
      <AppLink className="button" to={listPath(code)}>Back</AppLink>
      {record.status === pending && <button type="button" onClick={() => perform('Approve')}>Approve</button>}
      {!sales && record.status === pending && <button type="button" onClick={() => confirm('Reject', 'Enter the reason for rejecting this purchase order.', true)}>Reject</button>}
      {eligible(state, movement, record) && <AppLink className="button" to={sourcePath(movement, record)}>{sales ? 'Fulfill' : 'Receive'}</AppLink>}
      {eligible(state, bill, record) && <AppLink className="button" to={sourcePath(bill, record)}>Bill</AppLink>}
      {sales && record.status === pending && <button type="button" onClick={() => confirm('Cancel', 'Cancel this sales order?')}>Cancel Order</button>}
      {(open.includes(record.status) || (!sales && [pending, 'Rejected by Supervisor'].includes(record.status))) &&
        <button type="button" onClick={() => confirm('Close', 'Close this order and its remaining lines?')}>Close Order</button>}
      <button type="button" onClick={() => window.print()}>Print</button>
      {allowsDelete && <button type="button" onClick={() => confirm('Delete', 'Are you sure you want to delete this record?')}>Delete</button>}
    </PageHeader>
    <div className="record-grid">
      <RecordFields items={[
        [sales ? 'Customer' : 'Vendor', party ? <AppLink to={recordPath(sales ? 'custjob' : 'vendor', party)}>{partyOf(state, record)}</AppLink> : '—'],
        ['Date', formatDate(record.tranDate)], ['Posting Period', record.postingPeriod],
        ['Location', nameOf(state, 'locations', record.shipToLocationId || record.locationId)],
        [sales ? 'Sales Rep' : 'Employee', nameOf(state, 'employees', record.salesRepId || record.employeeId)],
        [sales ? 'Ship Date' : 'Receive By', formatDate(record.shipDate || record.dueDate)],
        [sales ? 'PO #' : 'Vendor Reference', record.otherRefNum], ['Memo', record.memo],
        ...(!sales && record.rejectionReason ? [['Rejection Reason', record.rejectionReason]] : []),
      ]} />
      <Summary values={[['Subtotal', record.subtotal], ['Tax', record.taxTotal], ...(sales ? [['Shipping', record.shippingCost]] : []), ['Total', record.total, true]]} />
    </div>
    <Tabs tabs={[
      ['Items', <LineTable record={record} code={code} />],
      ['Shipping', <RecordFields title="Shipping" items={[[ 'Ship Method', nameOf(state, 'shipMethods', record.shipMethodId) ], ['Shipping Address', record.shipAddress]]} />],
      ['Billing', <RecordFields title="Billing" items={[[ 'Terms', nameOf(state, 'terms', record.termsId) ], ['Billing Address', record.billAddress]]} />],
      ...(related ? [['Related Records', related]] : []),
      ['System Information', <Audit record={record} type={sales ? 'salesOrder' : 'purchaseOrder'} />],
    ]} />
    {action.modal}
  </>
}

export default function Order(props) {
  return !props.record || props.editing ? <OrderForm {...props} /> : <OrderView {...props} />
}
