import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useWorkspace } from '../workspace.jsx'
import { EXPENSE, activeId, canDecide, cyclesFor, dateLabel, documentById, documentPath, documentTotal, editable, isAssigned, lineTotal, lines, list, money, paymentTypes, rangeLabel, schemas, userById } from '../model.js'
import { change, needsReceipt, submissionProblems } from '../commands.js'
import { amountColumn, Badge, Confirm, Dialog, Icon, Missing, PageHeader, PageLink, Table, useSidNavigate } from '../ui.jsx'
import { DecisionForm, HeaderForm, LineForm, localReceiptUrl, ReceiptForm, ReceiptPreview, SubmissionForm } from './DocumentForms.jsx'

const value = data => data || '—'
const eventLabels = {
  created: 'Created', header_updated: 'Details updated', deleted: 'Deleted', line_added: 'Line added', line_updated: 'Line updated',
  line_removed: 'Line removed', receipt_attached: 'Receipt attached', receipt_removed: 'Receipt removed',
  submitted: 'Submitted for approval', recalled: 'Recalled', approved: 'Approved', sent_back: 'Sent back',
}
const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/avif', 'image/svg+xml']

function BackLink({ to, children }) {
  return <PageLink className="back-link" to={to}><span aria-hidden="true">←</span> {children}</PageLink>
}
function Info({ items }) {
  return <dl className="info-grid">{items.map(([label, data]) => <div key={label}><dt>{label}</dt><dd>{value(data)}</dd></div>)}</dl>
}
function HeaderDetails({ type, document, onEdit }) {
  const fields = [
    ['Business purpose', document.businessPurpose], ['Cost center', document.costCenter],
    ...(type === EXPENSE ? [['Report date', dateLabel(document.reportDate)]] : [
      ['Origin', document.origin], ['Destination', document.destination], ['Trip dates', rangeLabel(document.startDate, document.endDate)],
    ]),
  ]
  return <section className="panel inset">
    <div className="section-heading"><h2>{schemas[type].noun} details</h2>{onEdit && <button onClick={onEdit}>Edit Details</button>}</div>
    <Info items={fields} />
  </section>
}

function Activity({ state, type, id }) {
  const events = list(state.activity).filter(event => event.subjectType === type && event.subjectId === id)
    .reverse().sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  return <section className="panel inset">
    <h2>Activity</h2>
    {events.length ? <ol className="timeline">{events.map(event => <li key={event.id}>
      <strong>{eventLabels[event.action] || event.action || 'Update'}</strong>
      <small>{userById(state, event.actorId)?.name || event.actorId || 'Unknown user'} · {dateLabel(event.createdAt)}</small>
      {event.comment && <p>{event.comment}</p>}
    </li>)}</ol> : <p className="muted">No activity recorded.</p>}
  </section>
}

function DocumentSummary({ state, type, document, approval }) {
  const schema = schemas[type]
  const amount = approval?.amount ?? (document ? documentTotal(type, document) : undefined)
  const submitterId = approval?.submitterId || document?.ownerId
  const reviewerId = approval?.approverId || document?.approverId
  return <section className="panel inset summary">
    <div className="summary-total"><span>{type === EXPENSE ? 'Report total' : 'Estimated total'}</span><strong>{money(amount)}</strong></div>
    <Info items={[
      ['Employee', approval?.submitterName || userById(state, submitterId)?.name || submitterId],
      ['Reviewer', userById(state, reviewerId)?.name || reviewerId],
      ['Submitted', dateLabel(approval?.createdAt || document?.submittedAt)],
      ...(approval?.decidedAt ? [['Decided', dateLabel(approval.decidedAt)]] : []),
    ]} />
  </section>
}

function ExpenseReceipt({ line, open, editable: canEdit }) {
  const receipt = line.receipt
  const url = localReceiptUrl(receipt)
  const name = receipt?.fileName || 'Receipt'
  const image = imageTypes.includes(receipt?.contentType)
  return <div className="receipt-cell">
    {url ? image ? <button className="text-button" onClick={() => open('preview', line)}>{name}</button> :
      <a href={url} target="_blank" rel="noreferrer">{name}</a> : <small className={needsReceipt(line) ? 'required-receipt' : ''}>{receipt ? 'Receipt unavailable' : needsReceipt(line) ? 'Required' : 'No receipt'}</small>}
    {canEdit && <div className="inline-actions">
      <button className="text-button" onClick={() => open('attach', line)}>{receipt ? 'Replace Receipt' : 'Attach Receipt'}</button>
      {receipt && <button className="text-button" onClick={() => open('remove-receipt', line)}>Remove Receipt</button>}
    </div>}
  </div>
}

function DocumentLines({ type, document, canEdit, open }) {
  const expense = type === EXPENSE
  const schema = schemas[type]
  const entries = lines(type, document)
  const columns = expense ? ['Expense', 'Date', 'Receipt', amountColumn('Amount')] :
    ['Expected expense', amountColumn('Quantity'), amountColumn('Unit amount'), amountColumn('Total')]
  if (canEdit) columns.push('Actions')
  const missingReceipts = expense && entries.filter(needsReceipt).length
  return <section className="stack">
    <div className="section-heading">
      <div><h2>{schema.lineHeading}</h2><p className="muted">{entries.length} {entries.length === 1 ? 'line item' : 'line items'}</p></div>
      {canEdit && <button onClick={() => open('line')}><Icon name="plus" />Add {schema.lineLabel}</button>}
    </div>
    {canEdit && expense && <p className={missingReceipts ? 'notice returned' : 'muted'}>
      {missingReceipts ? missingReceipts + (missingReceipts === 1 ? ' expense requires a receipt. ' : ' expenses require receipts. ') : ''}Receipts are required for expenses of $75.00 or more.
    </p>}
    <Table label={schema.lineHeading} columns={columns} rows={entries}
      empty={expense ? 'No expenses have been added.' : 'No expected expenses have been added.'}
      renderRow={line => <tr key={line.id}>
        <td><strong>{value(line.category)}</strong>
          {expense && <small>{value(line.merchant)} · {paymentTypes[line.paymentType] || value(line.paymentType)}</small>}
          {line.description && <small>{line.description}</small>}
        </td>
        {expense ? <><td>{dateLabel(line.transactionDate)}</td><td><ExpenseReceipt line={line} open={open} editable={canEdit} /></td></> :
          <><td className="numeric">{line.quantity ?? '—'}</td><td className="numeric">{money(line.unitAmount)}</td></>}
        <td className="numeric">{money(lineTotal(type, line))}</td>
        {canEdit && <td><div className="inline-actions">
          <button className="text-button" onClick={() => open('line', line)} aria-label={'Edit ' + schema.lineLabel.toLowerCase() + ' ' + (line.merchant || line.description || line.category || line.id)}>Edit</button>
          <button className="text-button" onClick={() => open('remove-line', line)} aria-label={'Remove ' + schema.lineLabel.toLowerCase() + ' ' + (line.merchant || line.description || line.category || line.id)}>Remove</button>
        </div></td>}
      </tr>}
      footer={<div className="line-total"><span>{expense ? 'Total' : 'Estimated total'}</span><strong>{money(documentTotal(type, document))}</strong></div>}
    />
  </section>
}

export function CreateDocument({ type }) {
  const { state, commit } = useWorkspace()
  const navigate = useSidNavigate()
  const schema = schemas[type]
  function save(fields) {
    let id
    const accepted = commit(current => {
      const next = change(current, type, null, 'created', fields)
      if (next !== current) id = next[schema.key].at(-1).id
      return next
    })
    if (accepted) navigate(documentPath(type, id))
    return accepted
  }
  return <>
    <BackLink to={schema.path}>{schema.plural}</BackLink>
    <PageHeader title={'Create ' + schema.noun} description="Save the details to start a draft." />
    <div className="panel inset create-panel"><HeaderForm key={type} type={type} state={state} cancelTo={schema.path} onSave={save} /></div>
  </>
}

const actionFeedback = {
  header_updated: 'Details saved.', line_added: 'Line added.', line_updated: 'Line updated.',
  line_removed: 'Line removed.', receipt_attached: 'Receipt attached.', receipt_removed: 'Receipt removed.',
  submitted: 'Submitted for approval.', recalled: 'Submission recalled. You can edit the draft.',
  approved: 'Submission approved.', sent_back: 'Submission sent back.',
}

function useDocumentActions(type, id) {
  const { commit } = useWorkspace()
  const [modal, setModal] = useState(null)
  const [message, setMessage] = useState('')
  const close = () => setModal(null)
  return {
    modal, message, close, open: (kind, line) => { setMessage(''); setModal({ kind, line }) },
    apply(action, payload) {
      if (!commit(state => change(state, type, id, action, payload))) return false
      close()
      setMessage(actionFeedback[action] || '')
      return true
    },
    reject() { close(); setMessage('The document is no longer available for this action.') },
  }
}

function OwnerDialog({ type, document, state, controller, onDelete }) {
  const { modal, close, apply, reject } = controller
  if (!modal) return null
  const { kind, line } = modal
  const { noun, lineLabel } = schemas[type]
  if (kind === 'preview') return <ReceiptPreview receipt={line.receipt} onClose={close} />
  if (kind === 'header') return <Dialog title={'Edit ' + noun.toLowerCase() + ' details'} onClose={close}>
    <HeaderForm type={type} state={state} initial={document} onSave={fields => apply('header_updated', fields)} onCancel={close} />
  </Dialog>
  if (kind === 'line') return <LineForm type={type} line={line} onClose={close}
    onSave={fields => apply(line ? 'line_updated' : 'line_added', { fields, lineId: line?.id })} />
  if (kind === 'attach') return <ReceiptForm onClose={close} onSave={payload => apply('receipt_attached', { ...payload, lineId: line.id })} />
  if (kind === 'submit') return <SubmissionForm type={type} document={document} state={state} onClose={close} onSave={payload => apply('submitted', payload)} />
  const confirms = {
    delete: ['Delete ' + noun.toLowerCase(), 'Delete ' + noun, 'This draft and its line items will be deleted.', 'deleted'],
    recall: ['Recall submission', 'Confirm Recall', 'The current review will close and the document will return to Draft.', 'recalled'],
    'remove-line': ['Remove ' + lineLabel.toLowerCase(), 'Remove ' + lineLabel, 'This line will be removed from the document.', 'line_removed'],
    'remove-receipt': ['Remove receipt', 'Remove Receipt', 'This expense will no longer have an attached receipt.', 'receipt_removed'],
  }
  const [title, action, copy, command] = confirms[kind]
  return <Confirm title={title} action={action} onClose={close} danger={kind !== 'recall'} onConfirm={() => {
    if (!apply(command, { lineId: line?.id })) reject()
    else if (kind === 'delete') onDelete()
  }}><p>{copy}</p></Confirm>
}

export function DocumentDetail({ type }) {
  const { id } = useParams()
  return <OwnerDocument key={type + id} type={type} id={id} />
}

function OwnerDocument({ type, id }) {
  const { state } = useWorkspace()
  const navigate = useSidNavigate()
  const controller = useDocumentActions(type, id)
  const { open, message } = controller
  const schema = schemas[type]
  const document = documentById(state, type, id)
  if (!activeId(state) || !document || document.ownerId !== activeId(state)) return <Missing to={schema.path} label={schema.plural.toLowerCase()} />
  const cycles = cyclesFor(state, type, id)
  const canEdit = editable(document)
  const canRecall = document.status === 'pending_approval' && cycles.some(cycle => cycle.status === 'pending' &&
    cycle.submitterId === document.ownerId && (!document.approverId || cycle.approverId === document.approverId))
  const problems = canEdit ? submissionProblems(type, document) : []
  const decision = cycles.find(cycle => cycle.status === document.status)
  return <>
    <BackLink to={schema.path}>{schema.plural}</BackLink>
    <PageHeader eyebrow={<>{schema.label} · {id} <Badge status={document.status} /></>} title={document.title || id}
      actions={canEdit ? <>
        <button className="danger" onClick={() => open('delete')}>Delete {schema.noun}</button>
        <button className="primary" onClick={() => open('submit')} disabled={problems.length > 0}>{document.status === 'sent_back' ? 'Resubmit' : 'Submit'} {schema.noun}</button>
      </> : canRecall && <button onClick={() => open('recall')}>Recall {schema.noun}</button>} />
    {message && <p className="notice" role="status">{message}</p>}
    {document.status === 'sent_back' && <p className="notice returned"><strong>Reviewer feedback</strong> {decision?.comment || 'The reviewer returned this document for correction.'}</p>}
    {document.status === 'approved' && decision?.comment && <p className="notice"><strong>Reviewer note</strong> {decision.comment}</p>}
    {problems.length > 0 && <div className="notice"><strong>Before submitting</strong><ul>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul></div>}
    <div className="detail-grid">
      <div className="detail-main"><HeaderDetails type={type} document={document} onEdit={canEdit ? () => open('header') : undefined} />
        <DocumentLines type={type} document={document} canEdit={canEdit} open={open} /></div>
      <aside className="detail-aside"><DocumentSummary state={state} type={type} document={document} /><Activity state={state} type={type} id={id} /></aside>
    </div>
    <OwnerDialog type={type} document={document} state={state} controller={controller} onDelete={() => navigate(schema.path)} />
  </>
}

export function ApprovalDetail() {
  const { type, id } = useParams()
  const [params] = useSearchParams()
  const approvalId = params.get('approvalId')
  return <ReviewDocument key={type + id + (approvalId || '')} type={type} id={id} approvalId={approvalId} />
}

function ReviewDocument({ type, id, approvalId }) {
  const { state } = useWorkspace()
  const { modal, message, close, open, apply } = useDocumentActions(type, id)
  const schema = schemas[type]
  const cycles = cyclesFor(state, type, id).filter(approval => isAssigned(state, approval))
  const approval = approvalId ? cycles.find(cycle => cycle.id === approvalId) :
    cycles.find(cycle => canDecide(state, cycle)) || cycles.find(cycle => cycle.status === 'pending') || cycles[0]
  if (!schema || !approval) return <Missing title="Approval unavailable" to="/approvals" label="approvals" />
  const document = documentById(state, type, id)
  const actionable = canDecide(state, approval)
  const history = approval.status !== 'pending'
  const title = (history ? approval.subjectTitle || document?.title : document?.title || approval.subjectTitle) || id
  return <>
    <BackLink to={history ? '/approvals?view=history' : '/approvals'}>{history ? 'Approval history' : 'Pending approvals'}</BackLink>
    <PageHeader eyebrow={<>{schema.label} · {id} <Badge status={approval.status} /></>} title={title}
      actions={actionable && <><button className="danger" onClick={() => open('sent_back')}>Send Back</button><button className="primary" onClick={() => open('approved')}>Approve</button></>} />
    {message && <p className="notice" role="status">{message}</p>}
    {approval.comment && <p className={'notice ' + (approval.status === 'sent_back' ? 'returned' : '')}><strong>{approval.status === 'sent_back' ? 'Send-back reason' : 'Approval note'}</strong> {approval.comment}</p>}
    {!actionable && !history && <p className="notice">This submission is currently unavailable for review.</p>}
    <div className="detail-grid">
      <div className="detail-main">{document ? <><HeaderDetails type={type} document={document} />
        <DocumentLines type={type} document={document} open={open} /></> : <section className="panel inset">
          <h2>Submission snapshot</h2><p className="muted">The original document is unavailable.</p>
          <Info items={[[schema.noun, title], ['Document ID', id], ['Approval ID', approval.id]]} />
        </section>}</div>
      <aside className="detail-aside"><DocumentSummary state={state} type={type} document={document} approval={approval} /><Activity state={state} type={type} id={id} /></aside>
    </div>
    {modal?.kind === 'preview' && <ReceiptPreview receipt={modal.line.receipt} onClose={close} />}
    {actionable && ['approved', 'sent_back'].includes(modal?.kind) && <DecisionForm action={modal.kind} approval={approval} onSave={payload => apply(modal.kind, payload)} onClose={close} />}
  </>
}
