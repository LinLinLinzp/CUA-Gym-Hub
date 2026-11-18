import { DataTable, SiteLink, Status, methodLabel, paymentNumber, recordNumber, recordPath } from './components.jsx'
import { byId, dateLabel, money, vendorName } from './data/selectors.js'
import { useStore } from './store.jsx'

const columns = [
  { label: 'Vendor' }, { label: 'Invoice #' }, { label: 'Reference' }, { label: 'Process date' },
  { label: 'Method' }, { label: 'Status' }, { label: 'Amount (USD)', numeric: true },
]

export function PaymentTable({ records, empty = 'No payments found.' }) {
  const { state } = useStore()
  return <DataTable label="Payments ledger" columns={columns} records={records} empty={empty}
    rowPath={payment => recordPath('payments', payment.id)} render={payment => <>
      <td>{vendorName(state, payment.vendorId)}</td>
      <td>{recordNumber(byId(state.bills, payment.billId))}</td>
      <td><SiteLink className="table-link" to={recordPath('payments', payment.id)}>{paymentNumber(payment)}</SiteLink></td>
      <td>{dateLabel(payment.processDate)}</td><td>{methodLabel(payment.method)}</td><td><Status value={payment.status} /></td>
      <td className="numeric"><strong>{money(payment.amount)}</strong></td>
    </>} />
}
