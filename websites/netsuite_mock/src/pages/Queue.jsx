import Payment from './Payment.jsx'
import RecordList from './RecordList.jsx'
import TransactionSearch from './TransactionSearch.jsx'
import Reorder from './Reorder.jsx'

export default function Queue(props) {
  if (props.queue === 'search') return <TransactionSearch {...props} />
  if (props.queue === 'orderItems') return <Reorder {...props} />
  if (props.queue === 'payBills') return <Payment {...props} />
  return <RecordList {...props} />
}
