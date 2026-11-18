import { addressCity, addressLine, money, paymentLabel } from '../data/format'

const totalRows = [
  ['subtotal', 'Subtotal'], ['deliveryFee', 'Delivery fee'], ['serviceFee', 'Service fee'],
  ['tax', 'Tax'], ['tip', 'Tip'], ['total', 'Total'],
]

export function Totals({ totals, children, title = 'Order total' }) {
  return (
    <aside className="card totals">
      <h2>{title}</h2>
      <dl className="amount-list">
        {totalRows.map(([key, label]) => (
          <div key={key} className={key === 'total' ? 'total-line' : ''}><dt>{label}</dt><dd>{money(totals?.[key])}</dd></div>
        ))}
      </dl>
      {children}
    </aside>
  )
}

export function Address({ address }) {
  return address?.street ? (
    <div><p>{addressLine(address)}</p><p>{addressCity(address)}</p>{address.instructions && <p className="meta">{address.instructions}</p>}</div>
  ) : <p className="meta">Address unavailable</p>
}

export function Tender({ payment }) {
  return <p>{paymentLabel(payment)}</p>
}
