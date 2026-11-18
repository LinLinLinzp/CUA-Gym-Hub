import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { DataTable, Field, Section } from '../components/Controls.jsx'
import { DraftField, DraftPicker, FormHeader, Summary, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import { documentNo, find, formatDate, money, nameOf, number, round, rows, sum } from '../utils/model.js'
import { outstanding, paymentConfig, paymentDraft, savePayment } from '../utils/payments.js'
import { recordPath } from '../utils/routes.js'
import { Unavailable } from './RouteFrame.jsx'
import TransactionView from './TransactionView.jsx'

function PaymentForm({ code, title, source }) {
  const { state } = useWorkspace()
  const { party, partyKey, partyTitle, target, targetTitle, code: targetCode } = paymentConfig[code]
  const [draft, change, setDraft] = useDraft(() => ({ ...paymentDraft(state, code, source), originalPartyId: source?.[party] }))
  const action = useRecordAction(code)
  const customer = code === 'custpymt'
  const records = draft[party] ? outstanding(state, code, draft[party]) : []
  const applied = rows(draft, 'applied')
  const current = (id) => applied.find((line) => line[target] === id)
  const total = round(sum(applied, (line) => line.amount))
  const payment = customer ? number(draft.payment) : total
  const main = { draft, change }
  const apply = (id, amount) => change('applied', [...applied.filter((line) => line[target] !== id), ...(amount == null ? [] : [{ [target]: id, amount }])])
  const submit = () => action.run((latest) => savePayment(latest, code, { ...draft, payment }), { message: 'Payment successfully saved.' })
  return <>
    <FormHeader title={title} code={code} submit={submit} back={source && recordPath(targetCode, source)} />
    <div className="record-grid">
      <Section title="Primary Information"><div className="fields">
        <DraftPicker {...main} title={partyTitle} name={party} entries={partyKey} required onChoose={(id) => setDraft((old) => ({ ...old, [party]: id, applied: [] }))} />
        <DraftField {...main} title="Date" name="tranDate" type="date" required />
        {customer ? <DraftField {...main} title="Payment Amount" name="payment" type="number" min="0" step="0.01" required />
          : <Field label="Payment Amount" value={money(payment)} />}
        <DraftField {...main} title="Payment Method" name="paymentMethodId" options="paymentMethods" required />
        <DraftField {...main} title="Check #" name="checkNum" />
        {customer && <DraftField {...main} title="Undep. Funds" name="undepFunds" type="checkbox" />}
        {customer && draft.undepFunds ? <Field label="Account" value={nameOf(state, 'accounts', 'acct_1050')} />
          : <DraftField {...main} title="Account" name="accountId" options="accounts" required />}
        <DraftField {...main} title="Memo" name="memo" type="textarea" />
      </div></Section>
      <Summary values={[[ 'Payment', payment, true ], ['Applied Total', total], ...(customer ? [['Unapplied', round(payment - total)]] : [])]} />
    </div>
    <Tabs tabs={[[ 'Apply', <DataTable records={records} empty={draft[party] ? `No open ${targetTitle.toLowerCase()}s.` : `Select a ${partyTitle.toLowerCase()} to see open ${targetTitle.toLowerCase()}s.`}
      columns={[
        { key: 'apply', title: 'Apply', render: (row) => <input type="checkbox" aria-label={`Apply ${documentNo(row)}`} checked={!!current(row.id)}
          onChange={(event) => {
            const available = customer && number(draft.payment) > 0 ? Math.max(0, round(payment - total)) : number(row.amountRemaining)
            apply(row.id, event.target.checked ? Math.min(available, number(row.amountRemaining)) : null)
          }} /> },
        { key: 'invoice', title: targetTitle, render: (row) => <AppLink to={recordPath(targetCode, row)}>{documentNo(row)}</AppLink> },
        { key: 'date', title: 'Date', render: (row) => formatDate(row.tranDate) },
        { key: 'due', title: 'Due Date', render: (row) => formatDate(row.dueDate) },
        { key: 'balance', title: 'Amount Remaining', numeric: true, render: (row) => money(row.amountRemaining) },
        { key: 'amount', title: 'Applied Amount', numeric: true, render: (row) => <input className="table-input" aria-label={`Applied amount for ${documentNo(row)}`}
          type="number" min="0" step="0.01" value={current(row.id)?.amount ?? ''} disabled={!current(row.id)} onChange={(event) => apply(row.id, event.target.value)} /> },
      ]} /> ]]} />
    {action.modal}
  </>
}

export default function Payment(props) {
  const { state } = useWorkspace()
  const { code, record, sourceId } = props
  const config = paymentConfig[code]
  if (record) return <TransactionView {...props}
    extraFields={[
      ['Payment Method', nameOf(state, 'paymentMethods', record.paymentMethodId)], ['Account', nameOf(state, 'accounts', record.accountId)],
      ['Check #', record.checkNum], ...(code === 'custpymt' ? [['Undep. Funds', record.undepFunds ? 'Yes' : 'No']] : []),
    ]}
    summary={code === 'custpymt' ? [[ 'Payment', record.payment, true ], ['Applied Total', record.appliedTotal], ['Unapplied', record.unapplied]] : undefined}
    tabs={[[ 'Applied Transactions', <DataTable records={rows(record, 'applied')} rowKey={(row) => row[config.target]}
      columns={[
        { key: 'target', title: config.targetTitle, render: (row) => {
          const target = find(state, config.key, row[config.target])
          return target ? <AppLink to={recordPath(config.code, target)}>{documentNo(target)}</AppLink> : row[config.target]
        } },
        { key: 'amount', title: 'Amount Applied', numeric: true, render: (row) => money(row.amount) },
      ]} /> ]]} />
  const source = find(state, config.key, sourceId)
  if (sourceId && !source) return <Unavailable {...props} />
  return <PaymentForm {...props} source={source} />
}
