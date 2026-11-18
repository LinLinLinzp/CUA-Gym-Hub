import { useSearchParams } from 'react-router-dom'
import { find, itemName, items, latest, money, orderName } from './model.js'
import { SelectField } from './forms.jsx'

export function usePurchaseFlow() {
  const [params] = useSearchParams()
  return {
    open: params.has('new') || params.has('order'), orderId: params.get('order') || '',
    itemId: params.get('item') || '', key: params.toString(),
  }
}

export function eligibleOrders(state, eligible) {
  return latest(state.orders).filter((order) => items(order).some((item) => eligible(order, item)))
}

export function PurchaseFields({ orders, draft, update, error, eligible }) {
  const order = find(orders, draft.orderId)
  return <>
    <SelectField name="Order" field="orderId" value={draft.orderId} error={error('orderId')} placeholder="Choose an order"
      options={orders.map((record) => [record.id, orderName(record) + ' · ' + items(record).slice(0, 2).map(itemName).join(', ')])}
      update={(_, value) => { update('orderId', value); update('itemId', '') }} />
    {order && <SelectField name="Item" field="itemId" value={draft.itemId} error={error('itemId')} placeholder="Choose an item"
      options={items(order).filter((item) => eligible(order, item)).map((item) => [item.id, itemName(item) + ' · ' + money(item.unitPrice)])}
      update={update} />}
  </>
}

