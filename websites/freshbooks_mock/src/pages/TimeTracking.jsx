import { useState } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, Play, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, Empty, ErrorNote, Field, Ledger, Menu, PageHead, Pick, SearchBox, Status, Tabs, sortRows, useFilters } from '../components/ui.jsx'
import { Confirm } from '../components/InvoiceActions.jsx'
import { moveMonth, TimeCalendar, WeekGrid } from '../components/TimeCalendar.jsx'
import { TimeFields } from '../components/TimeFields.jsx'
import { changeTime, changeTimer, saveTime, timeForm, timeLocked } from '../data/time.js'
import { addDays, dateLabel, hours, inRange, matches, nameOf, titleCase, today, validDate, visible } from '../utils/format.js'

const root = '/time-tracking'
export const timeColumns = [{ key: 'workDate', label: 'Date / Team Member' }, { label: 'Client / Project / Service' }, { label: 'Notes' }, { key: 'durationMinutes', label: 'Duration', number: true }, { label: 'Billing Status' }]
export function TimeCells({ row, state }) {
  return <>
    <td><strong>{dateLabel(row.workDate)}</strong><small>{nameOf(state.users, row.userId)}</small></td>
    <td>{row.clientId ? <AppLink to={`/clients/${row.clientId}`}>{nameOf(state.clients, row.clientId)}</AppLink> : 'No client'}
      <small>{[row.projectId && nameOf(state.projects, row.projectId), row.serviceId && nameOf(state.services, row.serviceId)].filter(Boolean).join(' · ')}</small></td>
    <td className="description-cell">{row.notes || '—'}</td><td className="number">{hours(row.durationMinutes)}</td>
    <td><Status value={row.status || (row.billable ? 'unbilled' : 'non_billable')} />{row.retainerId && <small><AppLink to={`/invoices/retainers/${row.retainerId}`}>Retainer</AppLink></small>}{row.invoiceId && <small><AppLink to={`/invoices/${row.invoiceId}`}>Invoice</AppLink></small>}</td>
  </>
}
export const totalMinutes = rows => rows.reduce((sum, row) => sum + (Number(row.durationMinutes) || 0), 0)
export function TimeTracking() {
  const { state, commit, notify } = useApp()
  const [params, filter] = useFilters()
  const [edit, setEdit] = useState(null)
  const [selected, setSelected] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [sort, setSort] = useState({ key: 'workDate', desc: true })
  const views = ['day', 'week', 'month', 'all']
  const view = views.includes(params.get('view')) ? params.get('view') : 'day'
  const singleDay = view === 'day' || view === 'month'
  const date = validDate(params.get('date')) ? params.get('date') : today()
  const userId = params.get('member') || (view === 'all' ? '' : state.currentUserId)
  const active = state.timeEntries.filter(row => visible(row) && (!userId || row.userId === userId))
  const rows = sortRows(active.filter(row => singleDay ? row.workDate === date :
    (!params.get('client') || row.clientId === params.get('client')) &&
    (!params.get('status') || (row.status || (row.billable ? 'unbilled' : 'non_billable')) === params.get('status')) &&
    inRange(row.workDate || '', params.get('from'), params.get('to')) &&
    matches(params.get('q'), row.notes, nameOf(state.clients, row.clientId), nameOf(state.projects, row.projectId), nameOf(state.services, row.serviceId), nameOf(state.users, row.userId))
  ), sort)
  const selection = selected.filter(id => rows.some(row => row.id === id))
  function mutate(ids, status) {
    try { commit(current => changeTime(current, ids, status), status === 'deleted' ? 'Time entries deleted' : 'Billing status updated'); setSelected([]); setDeleting(null) }
    catch (error) { if (status === 'deleted') throw error; notify(error.message) }
  }
  const monday = addDays(date, -((new Date(date).getUTCDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const stepDate = direction => filter('date', view === 'month' ? moveMonth(date, direction) : addDays(date, direction * (view === 'week' ? 7 : 1)))
  const changeDate = value => { filter('date', value); setEdit(null) }
  return <>
    <PageHead title="Time Tracking">
      <AppLink to="/invoices/new?import=1" className="button primary">Generate Invoice</AppLink>
    </PageHead>
    <section className="card time-controls">
      <Tabs values={views} value={view} change={value => { filter('view', value); setSelected([]); setEdit(null) }} />
      <div className="section-heading">
        {view !== 'all' ? <div className="actions">
          <button className="icon-button" type="button" aria-label={`Previous ${view}`} onClick={() => { stepDate(-1); setEdit(null) }}><ChevronLeft size={18} /></button>
          <input aria-label="Selected date" type="date" value={date} onChange={e => changeDate(e.target.value)} />
          <button className="icon-button" type="button" aria-label={`Next ${view}`} onClick={() => { stepDate(1); setEdit(null) }}><ChevronRight size={18} /></button>
          <button className="button" type="button" onClick={() => changeDate('')}>Today</button>
        </div> : <h2>Filter Time Entries</h2>}
        <Field label="Hours logged by"><Pick rows={state.users} value={userId} onChange={value => { filter('member', value); setEdit(null) }} empty={view === 'all' ? 'All team members' : null} /></Field>
      </div>
      {view === 'day' && <div className="day-strip">{days.map(day => <button type="button" key={day} className={day === date ? 'selected' : ''} aria-pressed={day === date} onClick={() => changeDate(day)}>
        <small>{dateLabel(day, { weekday: 'short', day: 'numeric' })}</small><strong>{hours(totalMinutes(active.filter(row => row.workDate === day)))}</strong>
      </button>)}</div>}
      {view === 'month' && <TimeCalendar date={date} entries={active} onSelect={changeDate} />}
    </section>
    {view === 'week' ? <WeekGrid key={monday + userId} days={days} entries={active} userId={userId} /> : <section className="card ledger">
      <div className="ledger-bar"><h2>{view === 'all' ? 'All Time Entries' : 'Time Entries'} {singleDay && <small>· Daily Total {hours(totalMinutes(rows))}</small>}</h2>
        <div className="actions">
          {view === 'all' && <SearchBox value={params.get('q')} onChange={q => filter('q', q)} placeholder="Search time entries" />}
          <button type="button" className="button" onClick={() => setEdit({})}><Plus size={16} />New Entry</button>
          <button type="button" className="button" disabled={Boolean(state.activeTimer)} onClick={() => commit(current => changeTimer(current, 'started'), 'Timer started')}><Play size={15} />{state.activeTimer ? 'Timer Active' : 'Start Timer'}</button>
        </div>
      </div>
      {view === 'all' && <div className="filter-bar">
        <Field label="Client"><Pick rows={state.clients} value={params.get('client')} onChange={v => filter('client', v)} empty="All clients" /></Field>
        <Field label="Billing status"><select value={params.get('status') || ''} onChange={e => filter('status', e.target.value)}><option value="">All statuses</option>
          {['unbilled', 'billed', 'non_billable'].map(value => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select></Field>
        <Field label="From"><input type="date" value={params.get('from') || ''} onChange={e => filter('from', e.target.value)} /></Field>
        <Field label="Through"><input type="date" value={params.get('to') || ''} onChange={e => filter('to', e.target.value)} /></Field>
      </div>}
      {selection.length > 0 && <div className="selection-bar"><strong>{selection.length} selected</strong><Menu label="Bulk Actions">
        <button type="button" onClick={() => mutate(selection, 'billed')}>Mark as Billed</button><button type="button" onClick={() => mutate(selection, 'unbilled')}>Mark as Unbilled</button>
        <button type="button" className="text-danger" onClick={() => setDeleting(selection)}>Delete</button>
      </Menu></div>}
      {edit && <TimeEditor key={edit.id || date + userId} entry={edit.id ? edit : null} day={date} user={userId} onClose={() => setEdit(null)} />}
      <Ledger rows={rows} columns={[...timeColumns, { label: 'Actions' }]} sort={sort} setSort={setSort} selected={view === 'all' ? selection : undefined} onSelect={view === 'all' ? setSelected : undefined}
        render={row => <><TimeCells row={row} state={state} /><td className="row-actions"><Menu label="Time entry actions" icon={<MoreHorizontal size={18} />} className="icon-menu" buttonClass="icon-button">
          <button type="button" onClick={() => setEdit(row)}>Edit</button>
          {!timeLocked(state, row) && <button type="button" className="text-danger" onClick={() => setDeleting([row.id])}>Delete</button>}
        </Menu></td></>}
        empty={<Empty title={view === 'all' ? 'No matching time entries' : 'No time logged on this day'} />} />
    </section>}
    {deleting && <Confirm title="Delete Time Entries" detail="Delete the eligible selected time entries?" label="Delete" danger onClose={() => setDeleting(null)} onConfirm={() => mutate(deleting, 'deleted')} />}
  </>
}
export function TimeEditor({ entry, day, user, onClose }) {
  const { state, commit } = useApp()
  const [form, setForm] = useState(() => timeForm(state, entry, day, user))
  const [error, setError] = useState('')
  const locked = Boolean(timeLocked(state, entry))
  return <form className="inline-editor form-stack" onSubmit={e => {
    e.preventDefault()
    try { commit(current => saveTime(current, form, entry?.id), entry ? 'Time entry updated' : 'Time logged'); onClose() }
    catch (failure) { setError(failure.message) }
  }} noValidate>
    <h3>{entry ? 'Edit Time Entry' : 'New Time Entry'}</h3>
    {locked && <p>Time is linked to an invoice. You can edit its notes.</p>}
    <TimeFields state={state} form={form} patch={values => setForm(old => ({ ...old, ...values }))} locked={locked} />
    <ErrorNote>{error}</ErrorNote>
    <div className="form-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button positive" type="submit">{entry ? 'Save' : 'Log Time'}</button></div>
  </form>
}
