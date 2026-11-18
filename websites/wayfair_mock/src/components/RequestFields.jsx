import { byRecent, orderNumber, records } from '../data/rules.js'
import { SelectField } from './Fields.jsx'

export function OrderChooser({ orders, value, onChange }) {
  const options = records(orders).filter((entry) => entry.id)
    .sort((a, b) => byRecent(a.placedAt, b.placedAt))
    .map((order) => ({
      value: order.id,
      label: [orderNumber(order), records(order.items)[0]?.name].filter(Boolean).join(' · '),
    }))

  return <SelectField title="Order" options={options} value={value}
    onChange={onChange} required placeholder={options.length ? 'Choose an order' : 'No orders are available'} />
}
