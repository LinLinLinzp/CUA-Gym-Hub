import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink, useAppNavigate } from '../components/Navigation.jsx'
import { choices, Field, PageHeader, Picker, Section } from '../components/Controls.jsx'
import { DraftField, FormHeader, Summary, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import SourceLines from '../components/SourceLines.jsx'
import { documentNo, find, linesOf, nameOf, number, plusDays, round, rows, sum } from '../utils/model.js'
import { eligible } from '../utils/derived.js'
import { conversionDraft, saveMovement, shipmentStage, sourceCode, sourceKey, sourceOption } from '../utils/conversions.js'
import { listPath, recordPath, sourcePath } from '../utils/routes.js'
import TransactionView from './TransactionView.jsx'

export function ChooseSource({ title, code }) {
  const { state } = useWorkspace()
  const navigate = useAppNavigate()
  const candidates = rows(state, sourceKey(code)).filter((source) => eligible(state, code, source))
  return <><PageHeader title={title} before={<AppLink to={listPath(code)}>Back to List</AppLink>} />
    <Section title="Created From"><div className="fields">
      <Picker title={sourceCode(code) === 'salesord' ? 'Sales Order' : 'Purchase Order'}
        entries={candidates.map(sourceOption)} onChange={(id) => { if (id) navigate(sourcePath(code, find(state, sourceKey(code), id))) }} />
      {!candidates.length && <p className="muted">No eligible orders are available.</p>}
    </div></Section></>
}

function MovementForm({ title, code, source }) {
  const { state } = useWorkspace()
  const [draft, change, setDraft] = useDraft(() => conversionDraft(state, code, source))
  const action = useRecordAction(code)
  const shipment = code === 'itemship'
  const bill = code === 'vendbill'
  const sourceUrl = recordPath(sourceCode(code), source)
  const main = { draft, change }
  const total = round(sum(linesOf(draft).filter((line) => line.selected), (line) => number(line.quantity) * number(line.rate)))
  const submit = () => action.run((latest) => saveMovement(latest, code, source.id, draft))
  const withDueDate = (key, value) => setDraft((old) => {
    const next = { ...old, [key]: value }
    return { ...next, dueDate: plusDays(next.tranDate, find(state, 'terms', next.termsId)?.days) }
  })
  return <>
    <FormHeader title={title} code={code} submit={submit} back={sourceUrl} />
    <div className={`record-grid ${shipment ? 'single' : ''}`}>
      <Section title="Primary Information"><div className="fields">
        <Field label="Created From" value={<AppLink to={sourceUrl}>{documentNo(source)}</AppLink>} />
        <Field label={shipment ? 'Customer' : 'Vendor'} value={nameOf(state, shipment ? 'customers' : 'vendors', source.customerId || source.vendorId)} />
        <DraftField {...main} title="Date" name="tranDate" type="date" required reflect={bill ? (value) => withDueDate('tranDate', value) : undefined} />
        <Field label="Location" value={nameOf(state, 'locations', draft.locationId)} />
        {shipment && <>
          <DraftField {...main} title="Ship Status" name="status" options={choices('Picked', 'Packed', 'Shipped')} />
          <DraftField {...main} title="Tracking Numbers" name="trackingNumbers" />
          <DraftField {...main} title="Ship Method" name="shipMethodId" options="shipMethods" />
          <DraftField {...main} title="Shipping Address" name="shipAddress" type="textarea" />
        </>}
        {bill && <>
          <DraftField {...main} title="Reference No." name="tranId" required />
          <DraftField {...main} title="Terms" name="termsId" options="terms" reflect={(value) => withDueDate('termsId', value)} />
          <DraftField {...main} title="Due Date" name="dueDate" type="date" required />
        </>}
        <DraftField {...main} title="Memo" name="memo" type="textarea" />
      </div></Section>
      {!shipment && <Summary values={[[ 'Total', total, true ]]} />}
    </div>
    <Tabs tabs={[[ 'Items', <SourceLines code={code} lines={linesOf(draft)} locationId={draft.locationId} onChange={(value) => change('lines', value)} /> ]]} />
    {action.modal}
  </>
}

function ShipmentView(props) {
  const { record, code } = props
  const action = useRecordAction(code)
  const mark = (status) => action.run((state) => shipmentStage(state, record.id, status), { go: null, message: `Fulfillment marked ${status.toLowerCase()}.` })
  return <><TransactionView {...props}
    actions={<>{record.status === 'Picked' && <button type="button" onClick={() => mark('Packed')}>Mark Packed</button>}
      {['Picked', 'Packed'].includes(record.status) && <button type="button" onClick={() => mark('Shipped')}>Mark Shipped</button>}</>} />
    {action.modal}</>
}

export default function Movement(props) {
  const { state } = useWorkspace()
  const { code, record, sourceId } = props
  const source = find(state, sourceKey(code), sourceId)
  if (record) {
    if (code === 'itemship') return <ShipmentView {...props} />
    const pay = code === 'vendbill' && record.status === 'Open' && number(record.amountRemaining) > 0
    return <TransactionView {...props} actions={pay && <AppLink className="button primary" to={sourcePath('vendpymt', record)}>Pay Bill</AppLink>} />
  }
  if (source) return <MovementForm {...props} source={source} />
  return <ChooseSource {...props} />
}
