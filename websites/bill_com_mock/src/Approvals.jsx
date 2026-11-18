import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, Dialog, Field, PageTitle, SiteLink, Status, recordNumber, recordPath, useFeedback } from './components.jsx'
import { actionable, byId, dateLabel, money, recentFirst, rows, userName, vendorName } from './data/selectors.js'
import { decideApproval } from './data/transactions.js'
import { useStore } from './store.jsx'

export function Approvals() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const history = params.get('view') === 'history'
  const approvals = rows(state.approvals).filter(approval => history
    ? ['approved', 'denied'].includes(approval.status)
    : actionable(state, approval))
  approvals.sort(history
    ? (a, b) => String(b.decidedAt || b.createdAt || '').localeCompare(String(a.decidedAt || a.createdAt || ''))
    : recentFirst)
  const destination = approval => `${recordPath('bills', approval.billId)}?from=${history ? 'decision-history' : 'approvals'}`

  return <>
    <PageTitle title="Approvals" description="Review bills assigned to you and look up past decisions." />
    <nav className="tabs" aria-label="Approval views">
      <SiteLink to="/approvals" aria-current={!history ? 'page' : undefined}>Assigned to me</SiteLink>
      <SiteLink to="/approvals?view=history" aria-current={history ? 'page' : undefined}>Decision history</SiteLink>
    </nav>
    <DataTable label={history ? 'Decision history' : 'Assigned approvals'} records={approvals}
      columns={[{ label: 'Vendor' }, { label: 'Invoice #' }, { label: 'Due date' }, { label: 'Approver' },
        { label: history ? 'Decided' : 'Submitted' }, { label: 'Status' }, { label: 'Amount (USD)', numeric: true }]}
      empty={history ? 'No approval decisions to show.' : 'No bills are waiting for your approval.'}
      render={approval => {
        const bill = byId(state.bills, approval.billId)
        return <>
          <td>{bill ? vendorName(state, bill.vendorId) : 'Unknown vendor'}</td>
          <td>{bill ? <SiteLink className="table-link" to={destination(approval)}>{recordNumber(bill)}</SiteLink> : 'Invoice unavailable'}</td>
          <td>{dateLabel(bill?.dueDate)}</td><td>{userName(state, approval.approverId)}</td>
          <td>{dateLabel(history ? approval.decidedAt : approval.createdAt)}</td><td><Status value={approval.status} /></td>
          <td className="numeric"><strong>{money(bill?.amount)}</strong></td>
        </>
      }} />
  </>
}

export function DecisionDialog({ approval, bill, decision, onClose }) {
  const { transact } = useStore()
  const notify = useFeedback()
  const [note, setNote] = useState('')
  const [result, setResult] = useState({})
  const deny = decision === 'denied'

  return <Dialog title={deny ? 'Deny bill' : 'Approve bill'} onClose={onClose}>
    <form noValidate onSubmit={async event => {
      event.preventDefault()
      const response = await transact(decideApproval, approval?.id, decision, note)
      if (!response.state) {
        setResult(response)
        return
      }
      notify({ message: deny ? 'Bill denied' : 'Bill approved' })
      onClose()
    }}>
      <p className="review"><strong>{recordNumber(bill)}</strong> · {money(bill.amount)} USD</p>
      <Field label={deny ? 'Reason for denial' : 'Note (optional)'} error={result.errors?.note}>
        {props => <textarea {...props} autoFocus required={deny} value={note} onChange={event => setNote(event.target.value)} />}
      </Field>
      {result.error && <p role="alert" className="error">{result.error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className={`button ${deny ? 'danger' : 'primary'}`}>{deny ? 'Deny bill' : 'Approve bill'}</button>
      </div>
    </form>
  </Dialog>
}
