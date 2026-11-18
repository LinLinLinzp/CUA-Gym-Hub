import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Inbox, SlidersHorizontal, UserRound, UsersRound } from 'lucide-react'
import { AppLink, Empty, Field, PageHeading, Pill, Rail, SearchBox, Select, useAppNavigate } from '../components.jsx'
import { editTickets } from '../data/actions.js'
import {
  actor, agentName, dateLabel, dateValue, eligibleAgents, find, nextDeadline,
  overdue, PRIORITIES, records, SOURCES, STATUSES, text, ticketNumber,
} from '../data/model.js'
import { useAccount } from '../store.jsx'

const PAGE_SIZE = 12
const VIEWS = [
  { id: 'all', name: 'All tickets', icon: Inbox, match: () => true },
  { id: 'mine', name: 'My open tickets', icon: UserRound, match: (row, current) =>
    row.ticket.status === 'open' && Boolean(current) && row.ticket.assigneeId === current },
  { id: 'unassigned', name: 'Unassigned', icon: UsersRound, match: row => !row.ticket.assigneeId },
  { id: 'overdue', name: 'Overdue', icon: Clock3, match: row => row.overdue },
]

export function Queue() {
  const { state, commit } = useAccount()
  const navigate = useAppNavigate()
  const [view, setView] = useState('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAgent, setBulkAgent] = useState('')
  const [notice, setNotice] = useState('')
  const filterAnchor = useRef(null)
  const filterTrigger = useRef(null)
  useEffect(() => {
    if (!filtersOpen) return
    function onPointer(event) {
      if (!filterAnchor.current?.contains(event.target)) setFiltersOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        setFiltersOpen(false)
        filterTrigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [filtersOpen])
  const now = new Date()
  const active = VIEWS.find(item => item.id === view)
  const rows = records(state.tickets).map(ticket => {
    const deadline = nextDeadline(ticket)
    return { ticket, deadline, overdue: overdue(deadline, now), requester: find(state.contacts, ticket.requesterId) }
  })
  const searched = rows.filter(row => active.match(row, actor(state)) &&
    [ticketNumber(row.ticket), row.ticket.id, row.ticket.subject, row.requester?.name, row.requester?.email]
      .some(value => text(value).includes(text(query).trim().replace(/^#/, ''))) &&
    Object.entries(filters).every(([key, value]) => !value || (value === '__none' ? !row.ticket[key] : row.ticket[key] === value)))
  searched.sort((a, b) => {
    const createdA = dateValue(a.ticket.createdAt) || 0
    const createdB = dateValue(b.ticket.createdAt) || 0
    if (sort === 'oldest') return createdA - createdB
    if (sort === 'due') return (dateValue(a.deadline) || Infinity) - (dateValue(b.deadline) || Infinity) || createdB - createdA
    return createdB - createdA
  })
  const pageCount = Math.max(1, Math.ceil(searched.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount - 1)
  const pageRows = searched.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE)
  const selectedRows = rows.filter(row => selected.has(row.ticket.id))
  const bulkAgents = records(state.agents).filter(agent => selectedRows.every(({ ticket }) =>
    eligibleAgents(state, ticket.groupId).some(eligible => eligible.id === agent.id)))
  const allChecked = pageRows.length > 0 && pageRows.every(row => selected.has(row.ticket.id))
  const filterCount = Object.values(filters).filter(Boolean).length
  const groupOptions = [{ id: '__none', name: 'No group' }, ...records(state.groups)]
  const agentOptions = [{ id: '__none', name: 'Unassigned' }, ...records(state.agents)]

  function resetSelection() {
    setSelected(new Set())
    setBulkStatus('')
    setBulkAgent('')
    setNotice('')
  }
  function changeList(update) {
    update()
    setPage(0)
    resetSelection()
  }
  function selectRows(ids, checked) {
    const next = new Set(selected)
    for (const id of ids) checked ? next.add(id) : next.delete(id)
    setSelected(next)
    setBulkAgent('')
    setNotice('')
  }
  function applyBulk(properties) {
    const changed = commit(current => editTickets(current, selected, properties))
    resetSelection()
    setNotice(changed ? 'Selected tickets updated.' : 'No ticket changes to save.')
  }
  function clearFilters() {
    changeList(() => { setFilters({}); setQuery('') })
  }

  return <>
    <PageHeading title="Tickets" eyebrow="Support workspace" description="Find requests, manage assignments, and keep deadlines in view." />
    <div className="workspace-grid">
      <Rail title="Queue views">
        {VIEWS.map(({ id, name, icon: Icon, match }) => <button key={id} type="button" className="rail-item"
          aria-pressed={view === id} onClick={() => changeList(() => setView(id))}>
          <Icon size={17} aria-hidden="true" /><span>{name}</span>
          <span className="count">{rows.filter(row => match(row, actor(state))).length}</span>
        </button>)}
      </Rail>
      <section className="panel queue">
        <div className="section-heading"><h2>{active.name}</h2><span className="muted">{searched.length} {searched.length === 1 ? 'ticket' : 'tickets'}</span></div>
        <div className="toolbar">
          <SearchBox name="Search tickets" value={query} onChange={value => changeList(() => setQuery(value))} placeholder="Search subject, ticket ID, or requester" />
          <div className="filter-anchor" ref={filterAnchor}>
            <button type="button" className="button" ref={filterTrigger} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
              <SlidersHorizontal size={15} /> Filters{filterCount ? ` (${filterCount})` : ''}
            </button>
            {filtersOpen && <div className="panel filters">
              {[
                ['Status', 'status', STATUSES], ['Priority', 'priority', PRIORITIES], ['Group', 'groupId', groupOptions],
                ['Source', 'source', SOURCES], ['Assignee', 'assigneeId', agentOptions],
              ].map(([name, key, options]) => <Field label={name} key={key}><Select options={options} empty={`Any ${name.toLowerCase()}`}
                value={filters[key]} onChange={event => changeList(() => setFilters({ ...filters, [key]: event.target.value }))} /></Field>)}
              <div className="form-actions">
                <button type="button" className="button" onClick={clearFilters}>Clear filters</button>
                <button type="button" className="button primary" onClick={() => { setFiltersOpen(false); filterTrigger.current?.focus() }}>Done</button>
              </div>
            </div>}
          </div>
          <select aria-label="Sort tickets" className="sort" value={sort} onChange={event => changeList(() => setSort(event.target.value))}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="due">Next due</option>
          </select>
        </div>
        {selected.size > 0 && <div className="bulk toolbar">
          <strong>{selected.size} selected</strong>
          <Select aria-label="Bulk status" empty="Set status" options={STATUSES} value={bulkStatus} onChange={event => setBulkStatus(event.target.value)} />
          <button type="button" className="button" disabled={!bulkStatus} onClick={() => applyBulk({ status: bulkStatus })}>Apply status</button>
          <Select aria-label="Bulk assignee" empty="Assign to" options={[{ id: '__none', name: 'Unassigned' }, ...bulkAgents]} value={bulkAgent}
            onChange={event => setBulkAgent(event.target.value)} />
          <button type="button" className="button" disabled={!bulkAgent} onClick={() => applyBulk({ assigneeId: bulkAgent === '__none' ? null : bulkAgent })}>Apply assignment</button>
          <button type="button" className="text-button" onClick={resetSelection}>Clear selection</button>
        </div>}
        {notice && <p className="notice inset" role="status">{notice}</p>}
        {pageRows.length ? <>
          <div className="scroll-table"><table className="tickets-table">
            <thead><tr><th scope="col"><input type="checkbox" aria-label="Select tickets on this page" checked={allChecked}
              onChange={event => selectRows(pageRows.map(row => row.ticket.id), event.target.checked)} /></th>
              <th scope="col">Ticket / Requester</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Assignee</th><th scope="col">Next due</th></tr></thead>
            <tbody>{pageRows.map(({ ticket, requester, deadline, overdue: late }) => <tr key={ticket.id} onClick={event => {
              if (!event.target.closest('a, input') && !window.getSelection()?.toString()) {
                navigate(`/tickets/${encodeURIComponent(ticket.id)}`)
              }
            }}>
              <td><input type="checkbox" aria-label={`Select ticket ${ticketNumber(ticket)}`} checked={selected.has(ticket.id)}
                onChange={event => selectRows([ticket.id], event.target.checked)} /></td>
              <td className="subject-cell">
                <div><AppLink to={`/tickets/${encodeURIComponent(ticket.id)}`}>{ticket.subject || 'Untitled ticket'}</AppLink></div>
                <div className="metadata"><span className="ticket-number">#{ticketNumber(ticket)}</span><span>{requester?.name || requester?.email || 'Unknown requester'}</span></div>
              </td>
              <td><Pill value={ticket.status} /></td><td><Pill value={ticket.priority} /></td>
              <td>{ticket.assigneeId ? agentName(state, ticket.assigneeId) : <span className="muted">Unassigned</span>}</td>
              <td><span className={late ? 'late' : 'muted'}>{dateLabel(deadline)}</span>{late && <div className="metadata late">Overdue</div>}</td>
            </tr>)}</tbody>
          </table></div>
          <footer className="pagination"><span className="muted">{visiblePage * PAGE_SIZE + 1}–{Math.min((visiblePage + 1) * PAGE_SIZE, searched.length)} of {searched.length}</span>
            <div><button className="icon-button" aria-label="Previous page" disabled={!visiblePage} onClick={() => setPage(visiblePage - 1)}><ChevronLeft size={18} /></button>
              <span>Page {visiblePage + 1} of {pageCount}</span>
              <button className="icon-button" aria-label="Next page" disabled={visiblePage + 1 === pageCount} onClick={() => setPage(visiblePage + 1)}><ChevronRight size={18} /></button></div>
          </footer>
        </> : <Empty title={`No tickets in ${active.name.toLowerCase()}`}>
          {query || filterCount ? <button className="button" onClick={clearFilters}>Clear search and filters</button> :
            view === 'all' ? <AppLink className="button" to="/tickets/new">Create a ticket</AppLink> :
              <button className="button" onClick={() => changeList(() => setView('all'))}>View all tickets</button>}
        </Empty>}
      </section>
    </div>
  </>
}
