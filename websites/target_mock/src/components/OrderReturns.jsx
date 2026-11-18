import { useStore } from '../store.jsx'
import { byId, dateText, list, money } from '../utils/read.js'
import { returnOptions } from '../domain/returns.js'
import { ReturnInstructions, returnLabel } from './ReturnInstructions.jsx'
import { ShopLink, Status, useFeedback } from './ui.jsx'

const requestLabels = { submitted: 'Submitted', in_transit: 'In transit', completed: 'Completed', cancelled: 'Canceled' }
const refundLabels = { pending: 'Refund pending', issued: 'Refund issued', cancelled: 'Refund canceled' }

export default function OrderReturns({ order, orderPath }) {
  const { state } = useStore()
  const { open } = useFeedback()
  const options = returnOptions(state, order)
  const canReturn = Boolean(order.payment?.last4) && options.some((option) => !option.issue)
  const requests = list(state.returns).filter((request) => request.orderId === order.id)
    .sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || '')) ||
      Number(second.status === 'submitted') - Number(first.status === 'submitted'))
  const outstanding = options.reduce((sum, option) => sum + option.remaining, 0)
  if (!canReturn && !requests.length) return null
  return <section className="panel stack">
    <div className="section-heading"><h2>Returns</h2>
      {canReturn && <ShopLink className="button primary" to={`${orderPath}/return`}>Start a return</ShopLink>}</div>
    {canReturn && <p className="muted">{outstanding} {outstanding === 1 ? 'unit available' : 'units available'} to return.</p>}
    {requests.map((request) => {
      const linked = byId(state.refunds, request.refundId)
      const refund = linked?.returnId === request.id && linked.orderId === order.id ? linked : undefined
      const label = Object.hasOwn(requestLabels, request.status) ? requestLabels[request.status] : 'Status unavailable'
      const amount = refund?.amountCents ?? request.estimatedRefundCents
      const instructions = request.method === 'store' ? request.instructions?.barcode : request.instructions?.labelNumber
      return <article className="return-history-row stack" key={request.id}>
        <div className="section-heading"><div><h3>Return #{request.returnNumber || request.id}</h3>
          <p className="small muted">{returnLabel(request.method)} · {dateText(request.createdAt)}</p></div>
          <Status tone={request.status === 'completed' ? 'success' : 'neutral'}>{label}</Status></div>
        {list(request.lines).length > 0 && <ul>{list(request.lines).map((line) =>
          <li key={line.orderLineId}>{byId(order.items, line.orderLineId)?.title || 'Unavailable item'} × {line.quantity ?? '—'}</li>)}</ul>}
        <div className="cluster">
          {Number.isInteger(amount) && <strong>{money(amount)}</strong>}
          <Status tone={refund?.status === 'issued' ? 'success' : 'neutral'}>{Object.hasOwn(refundLabels, refund?.status) ? refundLabels[refund.status] : 'Refund status unavailable'}</Status>
        </div>
        {instructions && <button className="button secondary self-start" onClick={() => open({
          title: request.method === 'store' ? 'Return barcode' : 'Mail return instructions',
          content: <ReturnInstructions request={request} />,
        })}>{request.method === 'store' ? 'View return barcode' : 'View mail label'}</button>}
      </article>
    })}
  </section>
}
