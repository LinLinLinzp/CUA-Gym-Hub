import React, { useState } from 'react'
import { Bell, ChevronRight, ClipboardCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppLink, Button, Empty, Problem, Status, formatUpdate } from '../components/ui.jsx'
import { canRespond, markRead, respondToRequest } from '../data/approvals.js'
import { displayCell } from '../data/cells.js'
import { byId, columnsOf, isActive, rowsOf, sheetPath } from '../data/sheets.js'
import { useStore } from '../store.jsx'

const requestPath = id => '/notifications/approvals/' + encodeURIComponent(id)

export default function Notifications() {
  const { state, commit } = useStore()
  const { requestId } = useParams()
  const requests = (state.approvalRequests ?? []).filter(request => request.approverId === state.currentUserId)
    .sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')))
  const request = requests.find(item => item.id === requestId)
  const [error, setError] = useState('')
  function read(id) {
    try { commit(current => markRead(current, id)); setError('') } catch (failure) { setError(failure.message) }
  }
  return <main className="page inbox-page">
    <div className="page-heading"><h1>Notifications</h1></div>
    <Problem message={error} />
    <div className="inbox-layout panel">
      <aside className="inbox-list" aria-label="Approval requests">
        <div className="tabs"><AppLink className="active" to="/notifications"><ClipboardCheck size={16} /> Requests</AppLink></div>
        {!requests.length && <Empty title="No approval requests" icon={Bell} />}
        {requests.map(item => {
          const unread = !item.readAt && item.status !== 'canceled'
          return <AppLink to={requestPath(item.id)} className={'inbox-item ' + (item.id === requestId ? 'current' : '')} key={item.id}
            aria-current={item.id === requestId ? 'page' : undefined} onClick={event => {
              if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) read(item.id)
            }}>
            <div className="inbox-item-content">
              <strong>{unread && <><span className="active-dot" /><span className="sr-only">Unread: </span></>}{item.subject || 'Approval request'}</strong>
              <small>{byId(state.sheets, item.sheetId)?.name || 'Sheet unavailable'} · {formatUpdate(item.createdAt)}</small>
              <Status value={item.status} />
            </div><ChevronRight size={16} />
          </AppLink>
        })}
      </aside>
      <section className="inbox-detail">
        {request ? <RequestDetail key={request.id} request={request} read={() => read(request.id)} /> :
          <Empty icon={requestId ? ClipboardCheck : Bell} title={requestId ? 'Approval request unavailable' : 'Select a request'}>{requestId && <AppLink to="/notifications">Back to requests</AppLink>}</Empty>}
      </section>
    </div>
  </main>
}

function RequestDetail({ request, read }) {
  const { state, commit } = useStore()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const row = byId(state.rows, request.rowId)
  const sheet = byId(state.sheets, request.sheetId)
  const requester = byId(state.users, request.requestedBy)
  const eligible = canRespond(state, request)
  const rows = sheet ? rowsOf(state, sheet.id) : []
  return <div className="request-detail stack">
    <div className="section-heading compact"><h2>{request.subject || 'Approval request'}</h2><Status value={request.status} /></div>
    <div className="request-meta muted"><p>Requested by {requester?.name || request.requestedBy || 'Unknown contact'} · {formatUpdate(request.createdAt)}</p>
      <p>Sheet {isActive(sheet) ? <AppLink to={sheetPath(sheet)}>{sheet.name || 'Open sheet'}</AppLink> : sheet?.name || 'unavailable'}</p></div>
    {request.message && <p className="request-message">{request.message}</p>}
    {row && sheet && <dl className="row-context">
      {columnsOf(sheet).map(column => {
        const value = displayCell(column, row.cells?.[column.id], state.users, rows)
        return value ? <div key={column.id}><dt>{column.title}</dt><dd>{value}</dd></div> : null
      })}
    </dl>}
    {request.respondedAt && <div className="response-decision">
      <p>{request.status === 'approved' ? 'Approved' : 'Declined'} by {byId(state.users, request.respondedBy)?.name || request.respondedBy || 'Unknown contact'} · {formatUpdate(request.respondedAt)}</p>
      {request.responseNote && <p className="request-message">{request.responseNote}</p>}
    </div>}
    {eligible && <>
      <label className="field">Response note (optional)<textarea rows="3" value={note} onChange={event => setNote(event.target.value)} /></label>
      <div className="actions">
        <Button variant="danger" onClick={() => respond('declined')}>Decline</Button><Button variant="primary" onClick={() => respond('approved')}>Approve</Button>
      </div>
    </>}
    {!request.readAt && request.status !== 'canceled' && <div><Button variant="subtle" onClick={read}>Mark as read</Button></div>}
    {request.status === 'pending' && !eligible && <p className="muted">The linked row or response column is unavailable.</p>}
    <Problem message={error} />
  </div>

  function respond(decision) {
    try { commit(current => respondToRequest(current, request.id, decision, note)); setError('') } catch (failure) { setError(failure.message) }
  }
}
