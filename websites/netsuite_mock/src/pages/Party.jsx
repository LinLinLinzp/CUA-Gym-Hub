import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { choices, Field, PageHeader, Section } from '../components/Controls.jsx'
import { Audit, DraftField, FormHeader, RecordFields, Summary, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import { addressText, documentNo, label, nameOf, money, rows, sum } from '../utils/model.js'
import { balanceOf, overdue, purchaseOpen } from '../utils/derived.js'
import { blankAddress, partyDraft, saveParty } from '../utils/masters.js'
import { listPath, recordPath } from '../utils/routes.js'
import { RelatedRecords } from './TransactionView.jsx'

function AddressFields({ value, onChange }) {
  if (typeof value === 'string') return <div className="fields"><Field label="Address" type="textarea" value={value} onChange={onChange} /></div>
  const address = value || blankAddress
  return <div className="fields">{[
    ['Addressee', 'addressee'], ['Attention', 'attention'], ['Address Line 1', 'addr1'], ['Address Line 2', 'addr2'],
    ['City', 'city'], ['State', 'state'], ['ZIP / Postal Code', 'zip'], ['Country', 'country'],
  ].map(([title, key]) => <Field key={key} label={title} value={address[key]} onChange={(next) => onChange({ ...address, [key]: next })} />)}</div>
}

function PartyForm({ title, code, record }) {
  const { state } = useWorkspace()
  const [draft, change] = useDraft(() => partyDraft(state, code, record))
  const action = useRecordAction(code)
  const customer = code === 'custjob'
  const main = { draft, change }
  return <>
    <FormHeader title={title} code={code} record={record} submit={() => action.run((state) => saveParty(state, code, draft, record?.id), { message: `${title} successfully saved.` })} />
    <div className="record-grid single"><Section title="Primary Information"><div className="fields">
      <DraftField {...main} title="Company Name" name="companyName" required />
      {!customer && <DraftField {...main} title="Legal Name" name="legalName" />}
      <DraftField {...main} title="Category" name="category" />
      <DraftField {...main} title="Primary Contact" name="primaryContact" />
      <DraftField {...main} title="Email" name="email" type="email" />
      <DraftField {...main} title="Phone" name="phone" type="tel" />
      <DraftField {...main} title="Fax" name="fax" type="tel" />
      <DraftField {...main} title="Web Address" name="url" type="url" />
      <DraftField {...main} title="Comments" name="comments" type="textarea" />
      <DraftField {...main} title="Inactive" name="inactive" type="checkbox" />
    </div></Section></div>
    <Tabs tabs={[
      ['Financial', <div className="fields">
        <DraftField {...main} title="Terms" name="termsId" options="terms" />
        {customer ? <>
          <DraftField {...main} title="Sales Rep" name="salesRepId" options="employees" />
          <DraftField {...main} title="Credit Limit" name="creditLimit" type="number" min="0" step="0.01" />
          <DraftField {...main} title="Credit Hold" name="creditHold" options={choices('Auto', 'On', 'Off')} />
          <DraftField {...main} title="Taxable" name="taxable" type="checkbox" />
          <DraftField {...main} title="Tax Item" name="taxItemId" options="taxItems" />
          <DraftField {...main} title="Price Level" name="priceLevel" />
          <DraftField {...main} title="Default Location" name="defaultLocationId" options="locations" />
          <DraftField {...main} title="Shipping Method" name="shipMethodId" options="shipMethods" />
        </> : <>
          <DraftField {...main} title="Account Number" name="accountNumber" />
          <DraftField {...main} title="Tax ID" name="taxId" />
          <DraftField {...main} title="1099 Eligible" name="is1099Eligible" type="checkbox" />
          <DraftField {...main} title="Currency" name="currency" />
          <DraftField {...main} title="Default Expense Account" name="defaultExpenseAccountId" options="accounts" />
        </>}
      </div>],
      ...(customer ? [['Billing Address', <AddressFields value={draft.billAddress} onChange={(value) => change('billAddress', value)} />],
        ['Shipping Address', <AddressFields value={draft.shipAddress} onChange={(value) => change('shipAddress', value)} />]]
        : [['Address', <AddressFields value={draft.address} onChange={(value) => change('address', value)} />]]),
    ]} />
    {action.modal}
  </>
}

export default function Party(props) {
  const { state } = useWorkspace()
  const { title, code, config, record, editing } = props
  if (!record || editing) return <PartyForm {...props} />
  const customer = code === 'custjob'
  const key = customer ? 'invoices' : 'vendorBills'
  return <>
    <PageHeader title={title} before={<AppLink to={listPath(code)}>{config.plural}</AppLink>}
      identity={`${documentNo(record)} · ${label(record)}`} status={record.inactive ? 'Inactive' : 'Active'}>
      <AppLink className="button primary" to={recordPath(code, record, true)}>Edit</AppLink><AppLink className="button" to={listPath(code)}>Back</AppLink>
      <button type="button" onClick={() => window.print()}>Print</button>
    </PageHeader>
    <div className="record-grid"><RecordFields items={[
      ['Company Name', record.companyName], ['Category', record.category], ['Primary Contact', record.primaryContact], ['Email', record.email],
      ['Phone', record.phone], ['Terms', nameOf(state, 'terms', record.termsId)], ['Comments', record.comments],
      ...(customer ? [['Credit Limit', record.creditLimit == null ? '—' : money(record.creditLimit)], ['Credit Hold', record.creditHold],
        ['Default Location', nameOf(state, 'locations', record.defaultLocationId)], ['Ship Method', nameOf(state, 'shipMethods', record.shipMethodId)]] : []),
    ]} />
    <Summary values={[[ 'Balance', balanceOf(state, key, record.id), true ], ...(customer
      ? [['Overdue Balance', sum(rows(state, key).filter((invoice) => invoice.customerId === record.id && overdue(invoice)), (invoice) => invoice.amountRemaining)]]
      : [['Open PO Value', sum(rows(state, 'purchaseOrders').filter((order) => order.vendorId === record.id && purchaseOpen.includes(order.status)), (order) => order.total)]])]} /></div>
    <Tabs tabs={[
      ['Addresses', <RecordFields title="Addresses" items={customer
        ? [['Billing Address', addressText(record.billAddress)], ['Shipping Address', addressText(record.shipAddress)]]
        : [['Address', addressText(record.address)]]} />],
      ['Related Records', <RelatedRecords record={record} />],
      ['System Information', <Audit record={record} type={config.type} />],
    ]} />
  </>
}
