import { Printer } from 'lucide-react'
import { array, productTitle } from '../data/model.js'
import { orderNumber, orderPath } from '../data/orders.js'
import { Back, Totals, displayDate, money } from '../components/UI.jsx'
import { Payment } from './Checkout.jsx'

export function ReceiptPage({ record: order }) {
  return <div className="stack receipt">
    <div className="receipt-controls section-heading">
      <Back to={orderPath(order)}>Back to order</Back>
      <button className="button primary" onClick={() => window.print()}><Printer size={17} aria-hidden="true" />Print receipt</button>
    </div>
    <article className="panel stack receipt-paper">
      <h1>Walmart receipt</h1>
      <p>Order <strong>{orderNumber(order)}</strong> · {displayDate(order.createdAt)}</p>
      <table className="receipt-table">
        <thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead>
        <tbody>{array(order.lines).map((line, index) => <tr key={line.id ?? index}>
          <td>{productTitle(line.product)}</td><td>{line.quantity ?? '—'}</td>
          <td>{Number.isFinite(line.unitPrice) ? money(line.unitPrice) : '—'}</td>
          <td>{Number.isFinite(line.lineSubtotal) ? money(line.lineSubtotal) : '—'}</td>
        </tr>)}</tbody>
      </table>
      <Totals totals={order.totals} />
      <Payment summary={order.paymentSummary} />
    </article>
  </div>
}
