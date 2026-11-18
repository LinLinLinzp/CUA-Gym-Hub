import { useState } from 'react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, Dialog, Empty, Field, Ledger, Menu, Missing, PageHead, Status, Tabs, useFilters } from '../components/ui.jsx'
import { Confirm } from '../components/InvoiceActions.jsx'
import { canBillExcess, canIssue, changeRetainerVisibility, excessTerms, issueNextInvoice } from '../data/retainer.js'
import { periodRow, periodStats, windowAt, windowFor } from '../data/periods.js'
import { dateLabel, find, hours, money, nameOf, today, visible } from '../utils/format.js'
import { cadence, retainerRoot } from './Retainers.jsx'
import { TimeCells, timeColumns } from './TimeTracking.jsx'
import { InvoiceLedger } from './Workspace.jsx'

const formatPeriod = period => dateLabel(period.startDate) + ' – ' + dateLabel(period.endDate)

export function RetainerDetail() {
  const { state } = useApp()
  const { id } = useParams()
  const retainer = find(state.retainers, id)
  if (!retainer) return <Missing title="Retainer unavailable" to={retainerRoot} label="Back to Retainers" />
  return <RetainerOverview key={id} retainer={retainer} />
}

function RetainerOverview({ retainer }) {
  const { state, commit } = useApp()
  const [params, filter] = useFilters()
  const [tab, setTab] = useState('invoices')
  const [issueDate, setIssueDate] = useState(null)
  const [visibility, setVisibility] = useState(null)
  const [report, setReport] = useState(false)
  const { id } = retainer
  const projected = windowFor(retainer, today()) || windowAt(retainer, 0)
  const records = state.retainerPeriods.filter(row => row.retainerId === id && row.startDate)
  const periods = (records.some(row => row.startDate === projected.startDate) || !projected.startDate ? records
    : [...records, periodRow(state, retainer, projected)]).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  const period = periods.find(row => row.startDate === params.get('period')) || periods.find(row => row.startDate === projected.startDate) || periods[0]
  const stats = period ? periodStats(state, period) : null
  const invoices = state.invoices.filter(row => row.retainerId === id && !visible(row, 'deleted'))
  const projects = state.projects.filter(row => row.retainerId === id)
  const client = find(state.clients, retainer.clientId)
  const excess = canBillExcess(retainer, period, stats) ? excessTerms(state, id, period.startDate) : null
  const excessAmount = excess?.lines.reduce((sum, line) => sum + line.sources[0].amount, 0)
  const action = { archived: 'Archive', deleted: 'Delete', active: 'Restore' }[visibility]
  return <>
    <PageHead title={`Retainer for ${client?.name || 'Unavailable client'}`} back={{ to: retainerRoot, label: 'Retainers' }}>
      <Menu label="More Actions">
        {period && <button type="button" onClick={() => setReport(true)}>Retainer Summary</button>}
        {visible(retainer) && <button type="button" onClick={() => setVisibility('archived')}>Archive</button>}
        {!visible(retainer, 'deleted') && <button type="button" className="text-danger" onClick={() => setVisibility('deleted')}>Delete</button>}
        {!visible(retainer) && <button type="button" onClick={() => setVisibility('active')}>Restore</button>}
      </Menu>
      <Status value={visible(retainer) ? retainer.status : retainer.visibility} />
      {canIssue(retainer) && <button type="button" className="button positive" onClick={() => setIssueDate(retainer.nextIssueDate)}>Issue Next Invoice</button>}
      {!visible(retainer, 'deleted') && <AppLink className="button primary" to={`${retainerRoot}/${id}/edit`}>Edit Terms</AppLink>}
    </PageHead>
    <div className="retainer-grid">
      <section className="card"><h2>Terms</h2><dl className="details">
        <div><dt>Client</dt><dd>{client ? <AppLink to={`/clients/${client.id}`}>{client.name}</AppLink> : 'Unavailable client'}</dd></div>
        <div><dt>Cadence</dt><dd>{cadence(retainer)}</dd></div>
        <div><dt>Fee per period</dt><dd>{money(retainer.feePerPeriod, retainer.currency)}</dd></div>
        <div><dt>Hours per period</dt><dd>{hours(retainer.includedMinutes)}</dd></div>
        <div><dt>Excess hourly rate</dt><dd>{money(retainer.excessHourlyRate, retainer.currency)}</dd></div>
        <div><dt>Next billing date</dt><dd>{dateLabel(retainer.nextIssueDate)}</dd></div>
        <div><dt>Invoices remaining</dt><dd>{retainer.invoicesRemaining ?? 'Infinite'}</dd></div>
      </dl></section>
      <section className="card retainer-period form-stack">
        <div className="section-heading"><h2><CalendarDays size={19} /> Hours Logged</h2>
          {period && <Field label="Service Period"><select value={period.startDate} onChange={e => filter('period', e.target.value)}>
            {periods.map(row => <option value={row.startDate} key={row.id}>{formatPeriod(row)}</option>)}
          </select></Field>}
        </div>
        {stats ? <>
          <div className="metric-total">{hours(stats.logged)}</div>
          <div className="metric-bar" aria-label={`${hours(stats.logged)} logged out of ${hours(stats.included)} included`}>
            <div className="logged-bar" style={{ width: `${stats.included ? 100 * Math.min(stats.logged / stats.included, 1) : stats.logged ? 100 : 0}%` }} />
          </div>
          <div className="period-metrics">
            <div><small>Included Hours</small><strong>{hours(stats.included)}</strong></div><div><small>Remaining Budget</small><strong>{hours(stats.remaining)}</strong></div>
            <div><small>Excess Hours</small><strong>{hours(stats.excess)}</strong></div><div><small>Excess Already Billed</small><strong>{hours(stats.billed)}</strong></div>
          </div>
        </> : <Empty title="No service periods available" />}
      </section>
    </div>
    {excess && <section className="excess-banner">
      <div><h3>Unbilled Excess Time</h3><p>{hours(stats.openExcess)} available to bill for {money(excessAmount, period.currency)}.</p></div>
      <AppLink className="button primary" to={`/invoices/new?excess=${encodeURIComponent(id)}&period=${period.startDate}`}>Generate an Invoice</AppLink>
    </section>}
    <section className="card ledger">
      <div className="ledger-tabs"><Tabs values={['invoices', 'time entries', 'projects']} value={tab} change={setTab} /></div>
      {tab === 'invoices' && <InvoiceLedger rows={invoices} state={state} empty={<Empty title="No retainer invoices" />} />}
      {tab === 'time entries' && <Ledger rows={stats?.entries || []} columns={timeColumns} render={row => <TimeCells row={row} state={state} />} empty={<Empty title="No hours logged for this period" />} />}
      {tab === 'projects' && <Ledger rows={projects} columns={[{ label: 'Project' }, { label: 'Client' }]} render={row => <>
        <td><AppLink className="row-link" to={`/projects/${row.id}`}>{row.name || 'Project'} <ArrowRight size={13} /></AppLink></td><td>{nameOf(state.clients, row.clientId)}</td>
      </>} empty={<Empty title="No linked projects" />} />}
    </section>
    {report && period && <Dialog title="Retainer Summary" onClose={() => setReport(false)} wide>
      <div className="form-stack">
        <p><strong>{client?.name || 'Unavailable client'}</strong><br />{formatPeriod(period)}</p>
        <dl className="details">
          <div><dt>Included Minutes</dt><dd>{stats.included} min</dd></div>
          <div><dt>Worked Minutes</dt><dd>{stats.logged} min</dd></div>
          <div><dt>Excess Minutes</dt><dd>{stats.excess} min</dd></div>
          <div><dt>Excess Already Billed</dt><dd>{stats.billed} min</dd></div>
        </dl>
        <Ledger rows={stats.entries} columns={[{ label: 'Date / Team Member' }, { label: 'Notes' }, { label: 'Minutes', number: true }]} render={row => <>
          <td>{dateLabel(row.workDate)}<small>{nameOf(state.users, row.userId)}</small></td><td>{row.notes || '—'}</td><td className="number">{row.durationMinutes} min</td>
        </>} empty={<Empty title="No time entries for this period" />} />
        <div className="form-actions"><button className="button" type="button" onClick={() => setReport(false)}>Close</button></div>
      </div>
    </Dialog>}
    {visibility && <Confirm title={action + ' Retainer'} label={action} detail={visibility === 'deleted'
      ? 'Delete this retainer? Existing invoices and linked time will remain in its history.' : `${action} this retainer?`}
      danger={visibility === 'deleted'} onClose={() => setVisibility(null)} onConfirm={() => {
        commit(current => changeRetainerVisibility(current, id, visibility), visibility === 'active' ? 'Retainer restored' : `Retainer ${visibility}`)
        setVisibility(null)
      }} />}
    {issueDate && <Confirm title="Issue Next Invoice" label="Issue Next Invoice" detail={`Issue the scheduled fee invoice for ${dateLabel(issueDate)}?`}
      onClose={() => setIssueDate(null)} onConfirm={() => {
        commit(current => issueNextInvoice(current, id, issueDate), 'Retainer invoice issued')
        setIssueDate(null)
      }} />}
  </>
}
