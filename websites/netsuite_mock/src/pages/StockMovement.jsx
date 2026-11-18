import { useWorkspace } from '../context/Workspace.jsx'
import { Field, Section } from '../components/Controls.jsx'
import { DraftField, FormHeader, Summary, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import LineEditor from '../components/LineEditor.jsx'
import { find, linesOf, money, nameOf, number, quantity, sum } from '../utils/model.js'
import { onHand } from '../utils/derived.js'
import { saveStockMovement, stockDraft, stockPreview } from '../utils/inventoryActions.js'
import TransactionView from './TransactionView.jsx'

function StockForm({ title, code }) {
  const { state } = useWorkspace()
  const [draft, change] = useDraft(() => stockDraft(state, code))
  const action = useRecordAction(code)
  const adjustment = code === 'invadjst'
  const locationField = adjustment ? 'adjustmentLocationId' : 'fromLocationId'
  const main = { draft, change }
  const entries = stockPreview(state, linesOf(draft), draft[locationField], adjustment)
  const stock = {
    signed: adjustment,
    columns: [
      { key: 'before', title: adjustment ? 'Quantity On Hand' : 'Quantity On Hand (From)', numeric: true, render: (line) => quantity(line.before) },
      ...(adjustment ? [{ key: 'after', title: 'New Quantity', numeric: true, render: (line) => quantity(line.after) },
        { key: 'estimated', title: 'Estimated Value', numeric: true, render: (line) => money(line.estimated) }] : []),
    ],
    entry: (line, location) => {
      const prior = onHand(state, line.itemId, location)
      const item = find(state, 'items', line.itemId)
      return <><Field label="Quantity On Hand" value={item ? quantity(prior) : '—'} />
        {adjustment && <><Field label="New Quantity" value={item ? quantity(prior + number(line.quantity)) : '—'} />
          <Field label="Unit Cost" value={item ? money(item.averageCost) : '—'} /></>}</>
    },
  }
  return <>
    <FormHeader title={title} code={code} submit={() => action.run((state) => saveStockMovement(state, code, draft))} />
    <div className={`record-grid ${adjustment ? '' : 'single'}`}>
      <Section title="Primary Information"><div className="fields">
        <DraftField {...main} title="Date" name="tranDate" type="date" required />
        <DraftField {...main} title={adjustment ? 'Location' : 'From Location'} name={locationField} options="locations" required />
        {adjustment ? <DraftField {...main} title="Adjustment Account" name="accountId" options="accounts" required />
          : <DraftField {...main} title="To Location" name="toLocationId" options="locations" required />}
        <DraftField {...main} title="Memo" name="memo" type="textarea" />
      </div></Section>
      {adjustment && <Summary values={[[ 'Estimated Total Value', sum(entries, (row) => row.estimated), true ]]} />}
    </div>
    <Tabs tabs={[[ 'Items', <LineEditor lines={entries} onChange={(lines) => change('lines', lines)} fail={action.error}
      stock={stock} locationId={draft[locationField]} /> ]]} />
    {action.modal}
  </>
}

export default function StockMovement(props) {
  const { state } = useWorkspace()
  const { record, code } = props
  if (!record) return <StockForm {...props} />
  const adjustment = code === 'invadjst'
  const extraFields = adjustment ? [['Adjustment Account', nameOf(state, 'accounts', record.accountId)]]
    : [['To Location', nameOf(state, 'locations', record.toLocationId)]]
  return <TransactionView {...props} extraFields={extraFields} summary={adjustment ? [['Estimated Total Value', record.estimatedTotalValue, true]] : undefined} />
}
