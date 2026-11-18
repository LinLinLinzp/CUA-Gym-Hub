import { useParams } from 'react-router-dom'
import { useStore } from '../context/Store.jsx'
import { find, orderFor } from '../data/model.js'
import { Missing } from './UI.jsx'

const collections = {
  productId: ['catalog', 'Product', '/search', 'Browse products'],
  orderId: ['orders', 'Order', '/account/purchase-history', 'Back to purchase history'],
  returnId: ['returns', 'Return', '/account/purchase-history', 'Back to purchase history'],
  registryId: ['registries', 'Registry', '/registry', 'Back to registries'],
}

export function RecordRoute({ param, component: Component }) {
  const { [param]: id } = useParams()
  const { state } = useStore()
  const [collection, name, to, action] = collections[param]
  const record = param === 'orderId' ? orderFor(state, id) : find(state[collection], id)
  if (!record || (param === 'registryId' && record.status === 'deleted')) return <Missing name={name} to={to} action={action} />
  return <Component key={id} record={record} />
}
