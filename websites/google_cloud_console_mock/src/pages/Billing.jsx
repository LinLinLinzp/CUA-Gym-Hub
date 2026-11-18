import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Confirm, Dialog, Empty, Field, Filter, Heading, Missing, Pill, RowActions, Search, Select, Table } from '../components.jsx'
import { active, atMonth, byId, cents, contains, dateKey, dateLabel, distinct, money, RouteLink, rows, sum, uid, useWorkspace } from '../workspace.jsx'

const base = '/billing'
const tabs = [[base, 'Overview'], [base + '/reports', 'Reports'], [base + '/budgets', 'Budgets & alerts']]
const basisNames = { actual: 'Actual', forecast: 'Forecasted' }
const isOpen = account => account && account.status !== 'closed'
const nameOf = (record, fallback) => record?.name || record?.id || fallback
const dates = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const todayCosts = records => {
  const today = dateKey()
  return records.filter(r => atMonth(r.date) && r.date <= today)
}

function monthRange(period) {
  const [year, month] = period.split('-').map(Number)
  return { from: period + '-01', to: dateKey(new Date(Date.UTC(year, month, 0))) }
}

function groupedCosts(records) {
  const groups = new Map()
  for (const record of records) {
    const service = record.service || 'Unclassified'
    groups.set(service, (groups.get(service) || 0) + cents(record.amount))
  }
  return [...groups].map(([service, total]) => ({ id: service, service, amount: total / 100 })).sort((a, b) => b.amount - a.amount || a.service.localeCompare(b.service))
}

function CostChart({ groups, currency }) {
  if (!groups.length) return <Empty>No usage matches this selection.</Empty>
  const ceiling = Math.max(1, ...groups.map(r => Math.abs(r.amount)))
  return <div className="cost-chart" aria-hidden="true">
    <div className="chart-axis"><span>{money(0, currency)}</span><span>{money(ceiling / 2, currency)}</span><span>{money(ceiling, currency)}</span></div>
    {groups.map(({ service, amount }, i) => <div className="chart-row" key={service}>
      <span>{service}</span>
      <div className="chart-track"><i className={'series-' + (i % 4)} style={{ '--fill': (Math.abs(amount) / ceiling * 100) + '%' }} /></div>
      <strong>{money(amount, currency)}</strong>
    </div>)}
  </div>
}

function Reports({ account, costs, reportProject, reportThrough }) {
  const { state } = useWorkspace()
  const latest = costs.map(r => r.date).filter(dates).sort().at(-1) || dateKey()
  const [range, setRange] = useState(() => dates(reportThrough)
    ? { from: reportThrough.slice(0, 7) + '-01', to: reportThrough }
    : monthRange(latest.slice(0, 7)))
  const [project, setProject] = useState(reportProject || '')
  const [service, setService] = useState('')
  const valid = range.from && range.to && range.from <= range.to
  const projectOptions = distinct([reportProject, ...costs.map(r => r.projectId)]).map(id => [id, nameOf(byId(state.projects, id), id)])
  const matching = valid ? costs.filter(r => dates(r.date) && r.date >= range.from && r.date <= range.to &&
    (!project || r.projectId === project) && (!service || (r.service || 'Unclassified') === service)) : []
  const groups = groupedCosts(matching)
  return <>
    <section className="card detail-card report">
      <div className="filters report-filters">
        <Field label="Start date" type="date" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} />
        <Field label="End date" type="date" value={range.to} error={!valid ? 'Select a valid date range.' : ''} onChange={e => setRange({ ...range, to: e.target.value })} />
        <Filter label="Project filter" value={project} onChange={setProject} options={projectOptions} placeholder="All projects" />
        <Filter label="Service" value={service} onChange={setService} options={distinct(costs.map(r => r.service || 'Unclassified'))} placeholder="All services" />
      </div>
      <div className="split report-total"><div><h2>Cost by service</h2><p className="muted">{valid ? dateLabel(range.from) + ' – ' + dateLabel(range.to) : 'Select a date range'}</p></div>
        <div className="total"><span>Total cost</span><strong>{money(sum(matching), account.record.currency)}</strong></div></div>
      <CostChart groups={groups} currency={account.record.currency} />
    </section>
    <Table label="Service cost values" data={groups} empty="No cost records for this selection." filterKey={JSON.stringify([range, project, service])}
      columns={[
        { key: 'service', label: 'Service', sort: r => r.service },
        { key: 'amount', label: 'Cost', align: 'numeric', sort: r => r.amount, cell: r => money(r.amount, account.record.currency) },
      ]} />
  </>
}

function ProjectBilling({ account, project, onClose }) {
  const { state, transact } = useWorkspace()
  const accounts = rows(state.billingAccounts).filter(a => a.id && isOpen(a))
  const previous = project.billingAccountId || null
  const linked = !!previous
  const defaultId = account.id !== previous && accounts.some(a => a.id === account.id) ? account.id : accounts.find(a => a.id !== previous)?.id || ''
  const [destination, setDestination] = useState(defaultId)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const clearing = destination === '__disable__'
  const destinationId = clearing ? null : destination
  const label = clearing ? 'Disable billing' : linked ? 'Change billing account' : 'Enable billing'
  function save() {
    if (destinationId === '' || (!linked && clearing)) { setError('Select a billing account.'); return }
    if (!confirm) { setConfirm(true); return }
    const changed = transact((current, { update, event }) => {
      const record = byId(current.projects, project.id)
      if (!record || (record.billingAccountId || null) === destinationId) return
      if (destinationId && !isOpen(byId(current.billingAccounts, destinationId))) {
        setError('Select an active billing account.')
        setConfirm(false)
        return
      }
      event('project.billing_change', record.id, { projectId: record.id, billingAccountId: destinationId || record.billingAccountId },
        { previousBillingAccountId: record.billingAccountId || null, billingAccountId: destinationId })
      return { ...current, projects: rows(current.projects).map(r => r.id === record.id ? { ...r, billingAccountId: destinationId, ...update } : r) }
    }, clearing ? 'Project billing disabled.' : 'Project billing updated.')
    if (changed) onClose()
  }
  return <Dialog title={confirm ? label : linked ? 'Change billing account' : 'Enable billing'} mode={confirm ? 'confirm' : 'panel'}
    onClose={onClose} submit={save} submitLabel={confirm ? label : 'Continue'} danger={confirm && clearing}>
    <p><strong>{nameOf(project)}</strong></p>
    {confirm ? <><p>{clearing ? 'Disable billing for this project?' :
      'Link this project to ' + nameOf(byId(accounts, destinationId), destinationId) + '?'}</p>
      <Button onClick={() => setConfirm(false)}>Back</Button></> : <>
      <p className="muted">Current billing account · {previous ? nameOf(byId(state.billingAccounts, previous), previous) : 'Billing disabled'}</p>
      <Field label="New billing account" error={error}><Select placeholder="Select an account" options={[
        ...accounts.filter(a => a.id !== previous).map(a => [a.id, nameOf(a)]),
        ...(linked ? [['__disable__', 'Disable billing']] : []),
      ]} value={destination} onChange={e => { setDestination(e.target.value); setError('') }} /></Field>
    </>}
  </Dialog>
}

function BillingOverview({ account, costs }) {
  const { state } = useWorkspace()
  const [edit, setEdit] = useState(null)
  const projects = rows(state.projects)
  const linked = projects.filter(r => r.billingAccountId === account.id)
  const current = todayCosts(costs)
  const currency = account.record.currency
  return <>
    <div className="billing-summary">
      <article className="card metric-card"><h2>Month-to-date cost</h2><div className="metric">{money(sum(current), currency)}</div><p className="muted">{dateLabel(dateKey())}</p></article>
      <article className="card metric-card"><h2>Linked projects</h2><div className="metric">{linked.length}</div><p className="muted">{account.record.name || account.id}</p></article>
    </div>
    <section aria-labelledby="service-total"><h2 className="section-title" id="service-total">Month-to-date service totals</h2>
      <Table label="Month-to-date service totals" data={groupedCosts(current)} empty="No costs recorded for this month."
        columns={[
          { key: 'service', label: 'Service', sort: r => r.service },
          { key: 'amount', label: 'Cost', align: 'numeric', sort: r => r.amount, cell: r => money(r.amount, currency) },
        ]} /></section>
    <section aria-labelledby="project-billing"><div className="section-head"><h2 className="section-title" id="project-billing">Project billing</h2>
      <p className="muted">View current account links and manage billing for each project.</p></div>
      <Table label="Project billing" data={[...linked, ...projects.filter(r => r.billingAccountId !== account.id)]} empty="No projects are available."
        columns={[
          { key: 'name', label: 'Project', sort: r => nameOf(r), cell: r => <>{nameOf(r)} <small className="subtext">{r.id}</small></> },
          { key: 'billingAccountId', label: 'Billing account', sort: r => nameOf(byId(state.billingAccounts, r.billingAccountId), r.billingAccountId),
            cell: r => r.billingAccountId ? <>{nameOf(byId(state.billingAccounts, r.billingAccountId), r.billingAccountId)} {r.billingAccountId === account.id && <Pill tone="success">Selected account</Pill>}</> : <Pill>Billing disabled</Pill> },
          { key: 'actions', label: 'Actions', align: 'actions-cell', cell: r => r.id && <Button onClick={() => setEdit(r)}>{r.billingAccountId ? 'Change billing account' : 'Enable billing'}</Button> },
        ]} />
    </section>
    {edit && <ProjectBilling account={account} project={edit} onClose={() => setEdit(null)} />}
  </>
}

function BudgetForm({ account, budget, onClose }) {
  const { state, transact } = useWorkspace()
  const [name, setName] = useState(budget?.name || '')
  const [amount, setAmount] = useState(budget?.amount ?? '')
  const savedProjects = Array.isArray(budget?.projectIds) ? budget.projectIds : []
  const [projects, setProjects] = useState(savedProjects)
  const [scope, setScope] = useState(projects.length ? 'selected' : 'all')
  const [thresholds, setThresholds] = useState(() => {
    const configured = rows(budget?.thresholds)
    return (configured.length ? configured : [{ percent: 50, basis: 'actual' }]).map((r, id) => ({ ...r, id }))
  })
  const [errors, setErrors] = useState({})
  const linkedIds = rows(state.projects).filter(r => r.billingAccountId === account.id).map(r => r.id)
  const projectOptions = [...new Set([...linkedIds, ...savedProjects])].filter(Boolean)
  const currency = budget?.currency || account.record.currency || 'USD'
  function save() {
    const title = name.trim()
    const parsedAmount = Number(amount)
    const targetCents = cents(parsedAmount)
    const clean = thresholds.map(r => ({ percent: Number(r.percent), basis: r.basis }))
    const error = {}
    if (!title || title.length > 100) error.name = 'Enter a budget name of 1–100 characters.'
    if (!Number.isSafeInteger(targetCents) || targetCents <= 0) error.amount = 'Enter a positive amount that rounds to at least 0.01.'
    if (scope === 'selected' && !projects.length) error.scope = 'Select at least one project.'
    if (!clean.length || clean.some(r => !Number.isFinite(r.percent) || r.percent <= 0 || !Object.hasOwn(basisNames, r.basis))) {
      error.thresholds = 'Enter at least one positive percentage and a spend basis.'
    } else if (new Set(clean.map(r => JSON.stringify([r.percent, r.basis]))).size !== clean.length) {
      error.thresholds = 'Use each percentage only once per spend basis.'
    }
    setErrors(error)
    if (Object.keys(error).length) return
    const projectIds = scope === 'all' ? [] : [...projects]
    const fields = { name: title, amount: targetCents / 100, projectIds, thresholds: clean }
    const id = budget?.id || uid('budget')
    const changed = transact((current, { creation, update, event }) => {
      const budgets = rows(current.budgets)
      const kind = budget ? 'budget.update' : 'budget.create'
      event(kind, id, { billingAccountId: account.id, ...(projectIds.length === 1 ? { projectId: projectIds[0] } : {}) },
        { name: title, amount: fields.amount, currency, status: 'active' })
      return { ...current, budgets: budget
        ? budgets.map(r => r.id === id ? { ...r, ...fields, ...update } : r)
        : [...budgets, { id, billingAccountId: account.id, period: 'monthly', currency, status: 'active', ...fields, ...creation }] }
    }, budget ? 'Budget updated.' : 'Budget created.')
    if (changed) onClose()
  }
  const setThreshold = (id, changes) => setThresholds(current => current.map(r => r.id === id ? { ...r, ...changes } : r))
  return <Dialog title={budget ? 'Edit budget' : 'Create budget'} mode="panel wide" onClose={onClose} submit={save} submitLabel={budget ? 'Save changes' : 'Create budget'}>
    <p className="muted">Monthly budget · {account.record.name || account.id}</p>
    <Field label="Budget name" value={name} error={errors.name} onChange={e => setName(e.target.value)} />
    <Field label="Project scope" error={errors.scope}><Select options={{ all: 'All projects', selected: 'Selected projects' }} value={scope} onChange={e => setScope(e.target.value)} /></Field>
    {scope === 'selected' && <fieldset className="role-picker"><legend>Projects</legend>
      {projectOptions.map(id => <label key={id} className="check-option"><input type="checkbox" checked={projects.includes(id)} onChange={e =>
        setProjects(e.target.checked ? [...projects, id] : projects.filter(value => value !== id))} />{nameOf(byId(state.projects, id), id)}</label>)}
      {!projectOptions.length && <p className="muted">No projects are available for this account.</p>}
    </fieldset>}
    <Field label={'Monthly amount (' + currency + ')'} type="number" step="any" min="0.01" value={amount} error={errors.amount} onChange={e => setAmount(e.target.value)} />
    <fieldset className="role-picker"><legend>Alert thresholds</legend>
      {thresholds.map((r, i) => <div className="threshold-row" key={r.id}>
        <Field label={'Percentage ' + (i + 1)} type="number" min="0" step="any" value={r.percent ?? ''} onChange={e => setThreshold(r.id, { percent: e.target.value })} />
        <Field label={'Spend basis ' + (i + 1)}><Select options={basisNames} value={r.basis || ''} onChange={e => setThreshold(r.id, { basis: e.target.value })} /></Field>
        <Button aria-label={'Remove threshold ' + (i + 1)} onClick={() => setThresholds(current => current.filter(t => t.id !== r.id))}>Remove</Button>
      </div>)}
      <Button onClick={() => setThresholds(current => [...current, { id: uid('threshold'), percent: '', basis: 'actual' }])}>Add threshold</Button>
      {errors.thresholds && <p className="error" role="alert">{errors.thresholds}</p>}
    </fieldset>
  </Dialog>
}

function ThresholdProgress({ budget, spent }) {
  const now = new Date()
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  const percent = Number(budget.amount) > 0 ? spent / Number(budget.amount) * 100 : 0
  const forecast = percent / now.getUTCDate() * days
  const thresholds = rows(budget.thresholds)
  return <div className="progress-wrap">
    <div className="progress-label">{percent.toFixed(0)}% of target</div>
    <progress aria-label={'Spend progress for ' + budget.name} max="100" value={Math.min(100, Math.max(0, percent))} />
    <div className="chips">{thresholds.map((r, i) => <Pill key={i} tone={(r.basis === 'forecast' ? forecast : percent) >= r.percent ? 'warning' : ''}>
      {r.percent ?? '—'}% {basisNames[r.basis] || r.basis || '—'}</Pill>)}</div>
  </div>
}

function Budgets({ account, costs }) {
  const { state, transact } = useWorkspace()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('')
  const [dialog, setDialog] = useState(null)
  const close = () => setDialog(null)
  const scoped = rows(state.budgets).filter(r => r.billingAccountId === account.id && active(r))
  const current = todayCosts(costs)
  const projects = r => Array.isArray(r.projectIds) ? r.projectIds : []
  const scopeName = r => projects(r).length ? projects(r).map(id => nameOf(byId(state.projects, id), id)).join(', ') : 'All projects'
  const spent = r => sum(current.filter(cost => !projects(r).length || projects(r).includes(cost.projectId)))
  const writable = isOpen(account.record)
  const visible = scoped.filter(r => (contains(r.name, query) || contains(scopeName(r), query)) &&
    (!scope || (scope === 'selected') === !!projects(r).length))
  function remove(budget) {
    transact((current, { update, event }) => {
      const budgets = rows(current.budgets)
      if (!budgets.some(r => r.id === budget.id && active(r))) return
      const ids = projects(budget)
      event('budget.delete', budget.id, { billingAccountId: account.id, ...(ids.length === 1 ? { projectId: ids[0] } : {}) },
        { name: budget.name, status: 'deleted' })
      return { ...current, budgets: budgets.map(r => r.id === budget.id ? { ...r, status: 'deleted', ...update } : r) }
    }, 'Budget deleted.')
    close()
  }
  return <>
    <Table label="Budgets" data={visible} filterKey={JSON.stringify([query, scope])} filtered={!!(query.trim() || scope) && scoped.length > 0}
      empty="No budgets for this account." filters={<><Search label="Search budgets" value={query} onChange={setQuery} />
        <Filter label="Budget scope" options={{ all: 'All-project budgets', selected: 'Selected-project budgets' }} value={scope} onChange={setScope} />
        <Button variant="primary" className="push" disabled={!writable} onClick={() => setDialog({})}>Create budget</Button></>}
      columns={[
        { key: 'name', label: 'Budget', sort: r => r.name, cell: r => writable ? <button type="button" className="text-link" onClick={() => setDialog({ budget: r })}>{r.name || r.id}</button> : r.name || r.id },
        { key: 'scope', label: 'Project scope', sort: scopeName, cell: scopeName },
        { key: 'target', label: 'Monthly target', align: 'numeric', sort: r => Number(r.amount) || 0, cell: r => r.amount == null ? '—' : money(r.amount, r.currency || account.record.currency) },
        { key: 'spent', label: 'Spent', align: 'numeric', sort: spent, cell: r => money(spent(r), r.currency || account.record.currency) },
        { key: 'progress', label: 'Threshold progress', cell: r => <ThresholdProgress budget={r} spent={spent(r)} /> },
        { key: 'actions', label: 'Actions', align: 'actions-cell', cell: r => writable && <RowActions label={'Actions for ' + (r.name || r.id)} actions={[
          ['Edit budget', () => setDialog({ budget: r })], ['Delete budget', () => setDialog({ delete: r }), true],
        ]} /> },
      ]} />
    {dialog?.delete && <Confirm title="Delete budget" onClose={close} submit={() => remove(dialog.delete)} submitLabel="Delete budget" danger>
      <p>Delete <strong>{dialog.delete.name || dialog.delete.id}</strong> and its alert thresholds?</p>
    </Confirm>}
    {dialog && !dialog.delete && <BudgetForm account={account} budget={dialog.budget} onClose={close} />}
  </>
}

export function Billing({ account }) {
  const { state } = useWorkspace()
  const { pathname, search } = useLocation()
  const path = pathname.replace(/\/$/, '')
  const params = new URLSearchParams(search)
  const reportProject = params.get('reportProject')
  const reportThrough = params.get('reportThrough')
  const tab = tabs.find(([route]) => route === path)
  if (!tab) return <Missing message="Billing page unavailable"><RouteLink to={base}>Back to Billing</RouteLink></Missing>
  const costs = rows(state.billingCosts).filter(r => account.id && r.billingAccountId === account.id)
  return <>
    <Heading title={path === base ? 'Billing' : tab[1]} description={account.record ? nameOf(account.record) : 'Select a billing account to continue.'} />
    <nav className="tabs" aria-label="Billing sections">{tabs.map(([route, label]) =>
      <RouteLink key={route} to={route} scope={{ account: account.id }} aria-current={path === route ? 'page' : undefined}>{label}</RouteLink>)}</nav>
    {!account.record ? <Empty>No billing account is available for this selection.</Empty>
      : path === base ? <BillingOverview account={account} costs={costs} />
        : path === base + '/reports' ? <Reports key={search} account={account} costs={costs} reportProject={reportProject} reportThrough={reportThrough} />
          : <Budgets account={account} costs={costs} />}
  </>
}
