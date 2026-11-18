import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { byId, dateLabel, forProject, items, makeId, members, money, nameOf, newNumber, replaceRecord, roundCost } from '../domain'
import { recordPath, RouteLink, useRouteNavigate } from '../navigation'
import { useWorkspace } from '../state'
import { Back, Button, Details, Dialog, Field, History, MissingRecord, PageHeader, RecordList, Status, useFields } from '../ui'

const statuses = ['Draft', 'Pending Approval', 'Approved', 'Rejected']
const reasonOptions = ['Design Revision', 'Unforeseen Conditions', 'Owner Request', 'Allowance Adjustment', 'Credit', 'Other']
const eligibleContracts = (state, projectId) => forProject(state.contracts, projectId).filter(({ status }) => ['Approved', 'Complete'].includes(status))
const contractName = (contract) => [contract?.number, contract?.title].filter(Boolean).join(' · ')
const orderLines = (state, id) => items(state.changeOrderLineItems).filter((line) => line.changeOrderId === id)

function validLine(line) {
  return Boolean(line.costCode?.trim() && line.description?.trim()
    && line.quantity != null && String(line.quantity).trim() && Number(line.quantity) > 0
    && line.unitCost != null && String(line.unitCost).trim() && Number.isFinite(Number(line.unitCost))
    && Number.isFinite(roundCost(Number(line.quantity) * Number(line.unitCost))))
}

export function ChangeOrders() {
  const { id } = useParams()
  const { project, path } = useOutletContext()
  const { state } = useWorkspace()
  const base = path + '/change-orders'
  const record = byId(state.changeOrders, id)
  if (id && record?.projectId !== project.id) return <MissingRecord to={base} tool="Change Orders" />
  return record ? <OrderDetail key={record.id} {...{ project, base, record }} /> : <OrderList key={project.id} {...{ project, base }} />
}

function OrderList({ project, base }) {
  const { state } = useWorkspace()
  const [create, setCreate] = useState(false)
  const contracts = forProject(state.contracts, project.id)
  const displayContract = (record) => contractName(byId(contracts, record.contractId)) || (record.contractId ? 'Unavailable' : '—')
  const columns = [
    { key: 'number', label: 'Number', value: (r) => r.number, render: (r) => <RouteLink to={recordPath(base, r.id)}>{r.number || 'View change order'}</RouteLink> },
    { key: 'title', label: 'Title', value: (r) => r.title, render: (r) => <RouteLink to={recordPath(base, r.id)}>{r.title || 'Untitled change order'}</RouteLink> },
    { key: 'contract', label: 'Contract', render: displayContract },
    { key: 'status', label: 'Status', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', value: (r) => r.totalAmount == null ? null : Number(r.totalAmount), render: (r) => money(r.totalAmount) },
    { key: 'impact', label: 'Schedule Impact', align: 'right', render: (r) => scheduleImpact(r.scheduleImpactDays) },
  ]
  const filters = [
    { key: 'status', label: 'Status', options: statuses, match: (r, value) => r.status === value },
    { key: 'contract', label: 'Contract', options: contracts.map((contract) => ({ id: contract.id, name: contractName(contract) })), match: (r, value) => r.contractId === value },
  ]
  return <>
    <RecordList title="Change Orders" singular="Change Order" records={forProject(state.changeOrders, project.id)} columns={columns} filters={filters}
      searchLabel="Search change orders" searchText={(r) => [r.number, r.title, displayContract(r)].join(' ')} onCreate={() => setCreate(true)} />
    {create && <OrderEditor {...{ project, base }} onClose={() => setCreate(false)} />}
  </>
}

function scheduleImpact(value) {
  return value == null ? '—' : (Number(value) > 0 ? '+' : '') + value + (Math.abs(Number(value)) === 1 ? ' day' : ' days')
}

function OrderEditor({ project, base, record, onClose }) {
  const { state, commit } = useWorkspace()
  const navigate = useRouteNavigate()
  const editing = Boolean(record)
  const { values, bind } = useFields(record || { scheduleImpactDays: 0 })
  const [lines, setLines] = useState(() => editing ? orderLines(state, record.id) : [])
  const contracts = eligibleContracts(state, project.id)
  const reasons = record?.reason && !reasonOptions.includes(record.reason) ? [...reasonOptions, record.reason] : reasonOptions

  function addLine() {
    setLines((previous) => [...previous, { id: makeId(), costCode: '', description: '', quantity: '', unitCost: '' }])
  }

  function bindLine(id, name) {
    return {
      name, value: byId(lines, id)?.[name],
      onChange: (event) => {
        const value = event.target.value
        setLines((previous) => previous.map((line) => line.id === id ? { ...line, [name]: value } : line))
      },
    }
  }

  function save() {
    if (!lines.every(validLine)) return 'Complete each cost line with a positive quantity and a valid unit cost.'
    const totalAmount = totalCost(lines)
    if (!Number.isFinite(totalAmount)) return 'Enter cost lines that produce a valid total.'
    const id = record?.id || makeId()
    const saved = commit({ projectId: project.id, entityType: 'changeOrder', action: editing ? 'edit' : 'create',
      message: editing ? 'Change order saved.' : 'Draft change order created.' }, (previous, { created, updated }) => {
      const current = byId(previous.changeOrders, id)
      if ((editing && current?.status !== 'Draft') || !byId(eligibleContracts(previous, project.id), values.contractId)) return
      const fields = {
        contractId: values.contractId, title: values.title.trim(), reason: values.reason,
        description: (values.description || '').trim(), reviewerId: values.reviewerId || null,
        scheduleImpactDays: Number(values.scheduleImpactDays), totalAmount,
      }
      const next = editing ? { ...current, ...fields, ...updated } : {
        id, projectId: project.id, number: newNumber(forProject(previous.changeOrders, project.id), 'CO'), status: 'Draft', ...fields, ...created,
      }
      const existing = orderLines(previous, id)
      const savedLines = lines.map((line) => {
        const old = byId(existing, line.id)
        const data = {
          costCode: line.costCode.trim(), description: line.description.trim(), quantity: Number(line.quantity),
          unitCost: Number(line.unitCost), amount: extension(line),
        }
        if (old && Object.keys(data).every((key) => old[key] === data[key])) return old
        return old ? { ...old, ...data, ...updated } : { id: line.id, changeOrderId: id, ...data, ...created }
      })
      const changeOrders = editing ? replaceRecord(previous.changeOrders, next) : [...items(previous.changeOrders), next]
      const byLineId = new Map(savedLines.map((line) => [line.id, line]))
      const existingIds = new Set(existing.map((line) => line.id))
      const changeOrderLineItems = items(previous.changeOrderLineItems)
        .flatMap((line) => line.changeOrderId !== id ? [line] : byLineId.has(line.id) ? [byLineId.get(line.id)] : [])
        .concat(savedLines.filter((line) => !existingIds.has(line.id)))
      return { entityId: id, patch: { changeOrders, changeOrderLineItems } }
    })
    if (!saved) return 'Select an eligible contract for an editable draft.'
    if (!editing) navigate(recordPath(base, id))
  }

  return <Dialog wide title={editing ? 'Edit Change Order' : 'Create Change Order'} onClose={onClose} onSave={save}
    submitLabel={editing ? 'Save Changes' : 'Save Draft'}>
    <Field label="Prime Contract" options={contracts.map((contract) => ({ id: contract.id, name: contractName(contract) }))} required {...bind('contractId')} />
    {!contracts.length && <p className="muted">No approved or complete prime contracts are available.</p>}
    <Field label="Title" required {...bind('title')} />
    <Field label="Reason" required options={reasons} {...bind('reason')} />
    <Field label="Description" area {...bind('description')} />
    <div className="field-grid">
      <Field label="Requested Reviewer" options={members(state, project)} {...bind('reviewerId')} />
      <Field label="Schedule Impact (days)" type="number" step={1} required {...bind('scheduleImpactDays')} />
    </div>
    <div className="section-heading"><h3>Schedule of Values</h3><Button onClick={addLine}>+ Add Line Item</Button></div>
    {!lines.length && <p className="muted">No cost lines yet.</p>}
    {lines.map((line, index) => <section className="cost-line" aria-label={'Line ' + (index + 1)} key={line.id}>
      <div className="section-heading"><h3>Line {index + 1}</h3>
        <Button aria-label={'Remove line ' + (index + 1)} onClick={() => setLines((previous) => previous.filter(({ id }) => id !== line.id))}>Remove</Button>
      </div>
      <Field label="Cost Code" required {...bindLine(line.id, 'costCode')} />
      <Field label="Line Description" required {...bindLine(line.id, 'description')} />
      <div className="field-grid">
        <Field label="Quantity" type="number" step="any" required validate={(value) => Number(value) > 0 ? '' : 'Enter a quantity greater than zero.'} {...bindLine(line.id, 'quantity')} />
        <Field label="Unit Cost" type="number" step="any" required {...bindLine(line.id, 'unitCost')} />
      </div>
      <p className="right">Line amount <strong>{money(extension(line))}</strong></p>
    </section>)}
    <p className="total">Total {money(totalCost(lines))}</p>
  </Dialog>
}

const extension = (line) => roundCost(Number(line.quantity || 0) * Number(line.unitCost || 0))
const totalCost = (lines) => roundCost(lines.reduce((sum, line) => sum + extension(line), 0))

function OrderDetail({ project, base, record }) {
  const { state, commit } = useWorkspace()
  const [modal, setModal] = useState(null)
  const [comment, setComment] = useState('')
  const close = () => setModal(null)
  const { id, status } = record
  const lines = orderLines(state, id)
  const contract = byId(forProject(state.contracts, project.id), record.contractId)
  const decisionLabel = modal === 'approve' ? 'Approve Change Order' : 'Reject Change Order'

  function transition(action, newStatus, message) {
    const saved = commit({ projectId: project.id, entityType: 'changeOrder', action, message }, (previous, { now, actor, updated }) => {
      const current = byId(previous.changeOrders, id)
      if (!current || current.status !== status) return
      const fields = action === 'submit' ? { submittedAt: now, submittedById: actor }
        : { decisionComment: comment.trim(), decidedAt: now, decidedById: actor }
      const next = { ...current, ...fields, status: newStatus, ...updated }
      return {
        entityId: id, previousStatus: status, newStatus,
        patch: { changeOrders: replaceRecord(previous.changeOrders, next) },
      }
    })
    return saved ? undefined : 'This change order changed. Open the action again.'
  }

  function submit() {
    if (!byId(members(state, project), record.reviewerId) || !lines.length || !lines.every(validLine)) {
      return 'Edit the draft to add a project reviewer and at least one valid cost line.'
    }
    return transition('submit', 'Pending Approval', 'Change order submitted.')
  }

  const decide = (action) => { setComment(''); setModal(action) }

  return <>
    <Back to={base}>Change Orders</Back>
    <PageHeader title={record.title || 'Untitled change order'} kicker={record.number || 'Change Order'} status={status || 'Unspecified'} actions={<>
      {status === 'Draft' && <><Button onClick={() => setModal('edit')}>Edit</Button><Button primary onClick={() => setModal('submit')}>Submit for Approval</Button></>}
      {status === 'Pending Approval' && <><Button onClick={() => decide('reject')}>Reject</Button><Button primary onClick={() => decide('approve')}>Approve</Button></>}
    </>} />
    <div className="detail-grid">
      <div className="stack">
        <section className="panel detail-panel"><h2>Description</h2><p className="prose">{record.description || 'No description provided.'}</p></section>
        <section className="panel detail-panel">
          <h2>Schedule of Values</h2>
          {lines.length ? <div className="table-scroll"><table>
            <thead><tr><th scope="col">Cost Code</th><th scope="col">Description</th><th scope="col" className="right">Quantity</th>
              <th scope="col" className="right">Unit Cost</th><th scope="col" className="right">Amount</th></tr></thead>
            <tbody>{lines.map((line) => <tr key={line.id}><td>{line.costCode || '—'}</td><td>{line.description || '—'}</td>
              <td className="right">{line.quantity ?? '—'}</td><td className="right">{money(line.unitCost)}</td>
              <td className="right">{money(line.amount)}</td></tr>)}</tbody>
          </table></div> : <p className="quiet">No cost lines recorded.</p>}
          <p className="total">Total {money(record.totalAmount ?? totalCost(lines))}</p>
        </section>
        {['Approved', 'Rejected'].includes(status) && <section className="panel detail-panel">
          <h2>Decision</h2><Status value={status} />
          <p className="muted">{nameOf(state.people, record.decidedById, 'Workspace user')} · {dateLabel(record.decidedAt)}</p>
          {record.decisionComment && <p className="prose">{record.decisionComment}</p>}
        </section>}
        <History type="changeOrder" record={record} />
      </div>
      <Details rows={[
        ['Number', record.number], ['Prime Contract', contractName(contract) || '—'], ['Reason', record.reason],
        ['Requested Reviewer', nameOf(state.people, record.reviewerId)], ['Schedule Impact', scheduleImpact(record.scheduleImpactDays)],
        ['Submitted', dateLabel(record.submittedAt)],
      ]} />
    </div>
    {modal === 'edit' && <OrderEditor {...{ project, base, record }} onClose={close} />}
    {modal === 'submit' && <Dialog confirm title="Submit for Approval" submitLabel="Submit for Approval" onClose={close} onSave={submit}>
      <p>Send this change order for approval at {money(record.totalAmount ?? totalCost(lines))}.</p>
    </Dialog>}
    {['approve', 'reject'].includes(modal) && <Dialog title={decisionLabel} submitLabel={decisionLabel} onClose={close}
      onSave={() => transition(modal, modal === 'approve' ? 'Approved' : 'Rejected', modal === 'approve' ? 'Change order approved.' : 'Change order rejected.')}>
      <Field label="Decision Comment" area required={modal === 'reject'} value={comment} onChange={(event) => setComment(event.target.value)} />
    </Dialog>}
  </>
}
