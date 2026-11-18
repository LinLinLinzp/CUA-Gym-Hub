import { useState } from 'react'
import { CircleDollarSign, Plus, Trash2 } from './icons.jsx'
import { useNavigate, useParams } from 'react-router-dom'
import { Dialog, Field, Fields, Heading, Missing, Panel, Pill, RouteLink, Table, Toolbar, latest, options, peopleOptions, useDestination, useForm, useList } from './components.jsx'
import { activePeople, actorId, byId, cents, date, isDate, label, money, newId, payrollFields, person, rows, stamp, today, totalsFor } from './data/format.js'
import { useWorkspace } from './workspace.jsx'

const back = ['/payroll', 'Payroll']
const types = ['regular', 'off_cycle']
const moneyInputs = [['baseGross', 'Base gross'], ['bonus', 'Bonus'], ['taxes', 'Taxes'], ['deductions', 'Deductions']]
const metaFields = [['name', 'Run name'], ['type', 'Run type'], ['periodStart', 'Period start'], ['periodEnd', 'Period end'], ['payDate', 'Pay date']]
const emptyLine = () => ({ id: newId('pl'), employeeId: '', baseGross: '', bonus: '', taxes: '0', deductions: '0' })
const lineKey = (line, key) => `${line.id}-${key}`

function validateLine(line, errors) {
  const values = {}
  for (const [key, title] of moneyInputs) {
    const input = String(line[key] ?? '').trim()
    if (key === 'bonus' && !input) { values[key] = 0; continue }
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(input) || !Number.isSafeInteger(cents(input))) {
      errors[lineKey(line, key)] = `Enter a valid nonnegative amount for ${title.toLowerCase()}.`
    } else values[key] = cents(input)
  }
  const gross = values.baseGross + values.bonus
  const net = gross - values.taxes - values.deductions
  if (Number.isFinite(gross) && !Number.isSafeInteger(gross)) errors[lineKey(line, 'baseGross')] = 'Gross pay is too large.'
  if (net < 0) errors[lineKey(line, 'deductions')] = 'Taxes and deductions cannot exceed gross pay.'
  return { ...line, ...Object.fromEntries(Object.entries({ ...values, gross, net }).map(([key, amount]) => [key, amount / 100])) }
}

function payAction(state, mode, id, values, draftLines) {
  const runs = rows(state.payrollRuns)
  const old = byId(runs, id)
  if (mode !== 'create' && old?.status !== 'draft') return { errors: { form: 'Only an existing draft can be changed.' } }
  const errors = {}
  let metadata = {}
  if (mode === 'create') {
    metadata = { ...values, name: values.name?.trim() || '' }
    if (!metadata.name) errors.name = 'Enter a run name.'
    if (!types.includes(values.type)) errors.type = 'Select a run type.'
    if (!isDate(values.periodStart)) errors.periodStart = 'Enter a valid period start.'
    if (!isDate(values.periodEnd) || values.periodEnd < values.periodStart) errors.periodEnd = 'Enter a valid date on or after the period start.'
    if (!isDate(values.payDate) || values.payDate < values.periodEnd) errors.payDate = 'Enter a valid date on or after the period end.'
  } else if (mode === 'approve') {
    const reason = approvalIssue(old)
    if (reason) return { errors: { form: reason } }
  }
  let lineItems = rows(old?.lineItems)
  if (mode !== 'approve') {
    const seen = new Set()
    const available = new Set(activePeople(state).map(({ id }) => id))
    const existing = new Set(lineItems.map(({ employeeId }) => employeeId))
    lineItems = draftLines.map((line) => {
      if (!line.employeeId || (!available.has(line.employeeId) && !existing.has(line.employeeId))) errors[lineKey(line, 'employeeId')] = 'Select an active employee.'
      else if (seen.has(line.employeeId)) errors[lineKey(line, 'employeeId')] = 'This employee already has a line.'
      seen.add(line.employeeId)
      return validateLine(line, errors)
    })
    if (!lineItems.length) errors.form = 'Add at least one employee to the run.'
  }
  if (Object.keys(errors).length) return { errors }

  const totals = mode === 'approve' ? Object.fromEntries(payrollFields.map((key) => [key, old.totals[key]])) : totalsFor(lineItems)
  if (payrollFields.some((key) => !Number.isSafeInteger(cents(totals[key])))) return { errors: { form: 'Combined payroll amounts are too large.' } }
  let affected = lineItems.map(({ employeeId }) => employeeId)
  if (mode === 'edit') {
    const previous = rows(old.lineItems)
    const fields = [...moneyInputs.map(([key]) => key), 'gross', 'net']
    const changed = lineItems.filter((line) => {
      const prior = byId(previous, line.id)
      return !prior || prior.employeeId !== line.employeeId || fields.some((key) => (prior[key] ?? (key === 'bonus' ? 0 : undefined)) !== line[key])
    })
    const displaced = previous.filter((line) => {
      const next = byId(lineItems, line.id)
      return !next || next.employeeId !== line.employeeId
    })
    if (changed.length || displaced.length) {
      affected = [...new Set([...changed, ...displaced].map(({ employeeId }) => employeeId).filter(Boolean))]
    } else if (payrollFields.every((key) => old.totals?.[key] === totals[key])) {
      return {}
    }
  }

  const createdAt = new Date().toISOString()
  const actor = actorId(state)
  const runId = id || newId('pay')
  const status = mode === 'approve' ? 'approved' : 'draft'
  const record = mode === 'create'
    ? { id: runId, ...metadata, currency: 'USD', status, lineItems, totals, actorId: actor, createdAt, updatedAt: null, approvedBy: null, approvedAt: null }
    : mode === 'approve'
      ? { ...old, status, approvedBy: actor, approvedAt: createdAt, updatedAt: createdAt }
      : { ...old, lineItems, totals: { ...old.totals, ...totals }, updatedAt: createdAt }
  const action = { create: 'created', edit: 'edited', approve: 'approved' }[mode]
  return {
    id: runId,
    message: { create: 'Payroll draft created.', edit: 'Payroll draft updated.', approve: 'Payroll approved.' }[mode],
    next: {
      ...state,
      payrollRuns: old ? runs.map((run) => run.id === id ? record : run) : [...runs, record],
      payrollActions: [...rows(state.payrollActions), {
        id: newId('pya'), runId, action, status, employeeIds: affected, totals: { ...totals }, actorId: actor, createdAt,
      }],
    },
  }
}

function approvalIssue(run) {
  if (!isDate(run.periodStart) || !isDate(run.periodEnd) || !isDate(run.payDate) || run.periodStart > run.periodEnd || run.payDate < run.periodEnd) {
    return 'Valid payroll period dates and pay date are required for approval.'
  }
  const lines = rows(run.lineItems)
  if (!lines.length) return 'Add at least one payroll line before approving.'
  const seen = new Set()
  const invalid = lines.some((line) => {
    if (!line.employeeId || seen.has(line.employeeId)) return true
    seen.add(line.employeeId)
    const errors = {}
    const calculated = validateLine(line, errors)
    return Object.keys(errors).length || payrollFields.some((key) => line[key] !== calculated[key])
  })
  if (invalid) return 'Each payroll line needs a unique employee and valid, reconciled amounts.'
  const calculated = totalsFor(lines)
  if (payrollFields.some((key) => run.totals?.[key] !== calculated[key])) return 'Payroll totals must match the line items before approval.'
  return ''
}

function Totals({ totals }) {
  return <dl className="totals">{payrollFields.map((key) => <div key={key}><dt>{label(key)}</dt><dd>{money(totals?.[key])}</dd></div>)}</dl>
}

function PayrollForm({ run, onClose, afterSave }) {
  const { state, commit } = useWorkspace()
  const [lines, setLines] = useState(() => run
    ? rows(run.lineItems).map((line) => ({ ...line, id: line.id || newId('pl') }))
    : [emptyLine()])
  const [lineErrors, setLineErrors] = useState({})
  const form = useForm({ type: 'regular', periodStart: today(), periodEnd: today(), payDate: today() }, onClose, afterSave)
  const active = peopleOptions(activePeople(state))
  const existing = new Set(rows(run?.lineItems).map(({ employeeId }) => employeeId))
  function submit() {
    const result = commit((snapshot) => payAction(snapshot, run ? 'edit' : 'create', run?.id, form.values, lines))
    setLineErrors(result.errors || {})
    form.finish(result)
  }
  return <Dialog title={run ? 'Edit payroll draft' : 'Create payroll draft'} onClose={onClose} wide
    submitText={run ? 'Save draft' : 'Create draft'} error={form.errors.form} onSubmit={submit}>
    {run ? <p className="subtle">{run.name || run.id}</p> : <div className="form-grid pay-meta">
      {metaFields.map(([key, title]) => <Field key={key} title={title} required {...form.field(key)}
        type={key.startsWith('period') || key === 'payDate' ? 'date' : undefined} choices={key === 'type' ? types : undefined} />)}
    </div>}
    <div className="line-heading"><h3>Payroll lines</h3>
      <button type="button" className="button" disabled={!active.length} onClick={() => setLines((old) => [...old, emptyLine()])}><Plus size={16} />Add employee line</button>
    </div>
    {!active.length && <p className="subtle">An active employee is required to add a line.</p>}
    {lines.map((line, index) => {
      const change = (name, value) => {
        const key = name.slice(line.id.length + 1)
        setLines((old) => old.map((row) => row.id === line.id ? { ...row, [key]: value } : row))
        setLineErrors((old) => ({ ...old, [name]: undefined, [lineKey(line, 'deductions')]: undefined }))
      }
      const field = (key) => ({ name: lineKey(line, key), value: line[key], change, error: lineErrors[lineKey(line, key)] })
      const choices = line.employeeId && existing.has(line.employeeId) && !active.some(([id]) => id === line.employeeId)
        ? [[line.employeeId, person(state, line.employeeId)], ...active] : active
      return <fieldset className="pay-line" key={line.id}>
        <legend>Employee line {index + 1}</legend>
        <div className="pay-line-top">
          <Field title="Employee" choices={choices} required {...field('employeeId')} />
          <button className="icon-button" type="button" aria-label={`Remove employee line ${index + 1}`}
            onClick={() => setLines((old) => old.filter((row) => row.id !== line.id))}><Trash2 size={16} /></button>
        </div>
        <div className="pay-amounts">{moneyInputs.map(([key, title]) => <Field key={key} title={key === 'bonus' ? 'Bonus (optional)' : title}
          type="text" inputMode="decimal" placeholder="0.00" required={key !== 'bonus'} {...field(key)} />)}</div>
      </fieldset>
    })}
  </Dialog>
}

export function Payroll() {
  const { state } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const destination = useDestination()
  const runs = rows(state.payrollRuns)
  const canCreate = activePeople(state).length > 0
  const list = useList('payDate', 'desc')
  const records = list.apply(runs, (record) => [record.name, record.id])
  const columns = [
    ['name', 'Run name', (run) => <RouteLink to={`/payroll/${run.id}`}>{run.name || run.id}</RouteLink>, true],
    ['type', 'Type', (run) => label(run.type)], ['periodStart', 'Pay period', (run) => `${date(run.periodStart)} – ${date(run.periodEnd)}`],
    ['payDate', 'Pay date', (run) => date(run.payDate), true], ['headcount', 'Employees', (run) => rows(run.lineItems).length],
    ['gross', 'Gross', (run) => money(run.totals?.gross)], ['status', 'Status', (run) => <Pill value={run.status} />],
  ]
  const add = () => setAdding(true)
  return <>
    <Heading title="Payroll" description="Create drafts, review payroll totals, and approve pay runs." icon={CircleDollarSign}
      actions={<button className="button primary" disabled={!canCreate} aria-describedby={!canCreate ? 'payroll-reason' : undefined} onClick={add}><Plus size={17} />Create payroll draft</button>} />
    {!canCreate && <p className="inline-note" id="payroll-reason">Add an active employee before creating a pay run.</p>}
    <Toolbar list={list} placeholder="Search payroll runs" filters={[
      ['status', 'Statuses', options(runs, 'status')], ['type', 'Types', options(runs, 'type')],
    ]} />
    <Table columns={columns} records={records} list={list} noun="pay runs"
      emptyAction={canCreate && <button className="button" onClick={add}>Create payroll draft</button>} />
    {adding && <PayrollForm onClose={() => setAdding(false)} afterSave={(id) => navigate(destination(`/payroll/${id}`))} />}
  </>
}

function Review({ run, onClose }) {
  const { commit } = useWorkspace()
  const form = useForm({}, onClose)
  const [confirm, setConfirm] = useState(false)
  return <Dialog title={confirm ? 'Confirm payroll approval' : 'Review payroll'} description={run.name || run.id} onClose={onClose} wide
    submitText={confirm ? 'Confirm approval' : 'Approve payroll'} error={form.errors.form}
    onSubmit={() => confirm ? form.finish(commit((state) => payAction(state, 'approve', run.id))) : setConfirm(true)}>
    <Totals totals={run.totals} />
    <p className="subtle">{confirm ? 'Approval makes this pay run read-only.' : `${rows(run.lineItems).length} employees · Pay date ${date(run.payDate)}`}</p>
  </Dialog>
}

export function PayrollDetail() {
  const { state } = useWorkspace()
  const { runId } = useParams()
  const [mode, setMode] = useState(null)
  const list = useList()
  const run = byId(state.payrollRuns, runId)
  if (!run) return <Missing back={back} entity="Payroll run" />
  const history = latest(state.payrollActions).filter((event) => event.runId === runId)
  const lines = rows(run.lineItems)
  const draft = run.status === 'draft'
  const issue = draft ? approvalIssue(run) : ''
  const columns = [
    ['employeeId', 'Employee', (line) => byId(state.employees, line.employeeId)
      ? <RouteLink to={`/employees/${line.employeeId}`}>{person(state, line.employeeId)}</RouteLink> : person(state, line.employeeId)],
    ...[['baseGross', 'Base gross'], ['bonus', 'Bonus'], ...payrollFields.map((key) => [key, label(key)])]
      .map(([key, title]) => [key, title, (line) => money(line[key])]),
  ]
  return <>
    <Heading title={run.name || runId} description={label(run.type)} icon={CircleDollarSign} back={back} status={run.status}
      actions={draft && <><button className="button" onClick={() => setMode('edit')}>Edit draft</button>
        <button className="button primary" onClick={() => setMode('review')} disabled={Boolean(issue)} aria-describedby={issue ? 'review-reason' : undefined}>Review payroll</button></>} />
    {issue && <p className="inline-note" id="review-reason">{issue}</p>}
    <div className="detail-grid payroll-summary">
      <Panel title="Payroll totals"><Totals totals={run.totals} /></Panel>
      <Panel title="Run information"><Fields values={[
        ['Period start', date(run.periodStart)], ['Period end', date(run.periodEnd)], ['Pay date', date(run.payDate)], ['Employees', lines.length],
        ...(run.approvedAt ? [['Approved on', stamp(run.approvedAt)], ['Approved by', run.approvedBy === state.actor?.id ? state.actor?.name || run.approvedBy : run.approvedBy]] : []),
      ]} /></Panel>
    </div>
    <h2 className="section-heading">Employee earnings</h2>
    <Table columns={columns} records={lines} list={list} noun="payroll lines" />
    <div className="pay-history"><Panel title="Payroll history" count={history.length}>
      {history.length ? <ul className="history">{history.map((event) => <li key={event.id}><span><strong>{label(event.action)}</strong><small>{rows(event.employeeIds).length} employees affected</small></span><time>{stamp(event.createdAt)}</time></li>)}</ul>
        : <p className="subtle">No payroll changes recorded.</p>}
    </Panel></div>
    {mode === 'edit' && <PayrollForm run={run} onClose={() => setMode(null)} />}
    {mode === 'review' && <Review run={run} onClose={() => setMode(null)} />}
  </>
}
