import { RelatedRecords } from './TransactionView.jsx'
import Order from './Order.jsx'
import Inventory from './Inventory.jsx'
import StockMovement from './StockMovement.jsx'
import Invoice from './Invoice.jsx'
import Payment from './Payment.jsx'
import Party from './Party.jsx'
import Movement from './Movement.jsx'
import { Unavailable } from './RouteFrame.jsx'

export default function Record(props) {
  const { code, record } = props
  if (['salesord', 'purchord'].includes(code)) return <Order {...props} related={record && <RelatedRecords record={record} />} />
  if (['itemship', 'itemrcpt', 'vendbill'].includes(code)) return <Movement {...props} />
  if (code === 'item') return <Inventory {...props} />
  if (['invadjst', 'invtrnfr'].includes(code)) return <StockMovement {...props} />
  if (code === 'custinvc') return <Invoice {...props} />
  if (['custpymt', 'vendpymt'].includes(code)) return <Payment {...props} />
  if (['custjob', 'vendor'].includes(code)) return <Party {...props} />
  return <Unavailable {...props} />
}
