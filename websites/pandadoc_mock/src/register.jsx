import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { createDocument, currencyOf, id, statuses } from './model.js'
import { items } from './pricing.js'
import { LocalLink, NewDocumentButton, Notice, PageHead, Pagination, Search, Status, Empty, capitalize, editPath, includesText, money, shortDate, titleOf, useLocalNavigate } from './ui.jsx'

const dateNumber = value => Date.parse(value) || 0
const byRecent = (first, second) => dateNumber(second.updatedAt) - dateNumber(first.updatedAt)

function RowActions({ document, onDuplicate, pending }) {
  const menu = useRef(null)
  const trigger = useRef(null)
  const action = useRef(null)

  return <details className="popover row-menu" ref={menu}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) menu.current.open = false }}
    onKeyDown={event => {
      if (event.key === 'Escape') { menu.current.open = false; trigger.current.focus() }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        menu.current.open = true
        action.current.focus()
      }
    }}>
    <summary title="Document actions" aria-label={'Actions for ' + titleOf(document)} ref={trigger}>···</summary>
    <div className="popover-body"><button ref={action} disabled={pending} onClick={() => {
      trigger.current.focus()
      menu.current.open = false
      onDuplicate(document)
    }}>Duplicate</button></div>
  </details>
}

function Register({ documents, emptyText, footer }) {
  const { state, commit } = useWorkspace()
  const navigate = useLocalNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function duplicate(document) {
    if (pending) return
    setPending(true)
    setError('')
    const documentId = id('doc')
    try {
      await commit(current => createDocument(current, {
        documentId, sourceDocumentId: document.id, title: titleOf(document) + ' (copy)', company: document.company,
      }))
      navigate('/documents/' + documentId)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  return <div className="surface register">
    <Notice error={error} />
    {documents.length ? <div className="table-scroll"><table>
      <thead><tr><th scope="col">Document</th><th scope="col">Client</th><th scope="col">Status</th>
        <th scope="col" className="amount">Value</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th>
      </tr></thead>
      <tbody>{documents.map(document => <tr key={document.id}>
        <td><LocalLink to={editPath(document)} className="document-link"><span className="file-icon" aria-hidden="true" />{titleOf(document)}</LocalLink></td>
        <td>{document.company || '—'}</td><td><Status value={document.status} /></td>
        <td className="amount">{money(document.value, currencyOf(document, state.workspace))}</td>
        <td className="muted">{shortDate(document.updatedAt)}</td>
        <td><RowActions document={document} onDuplicate={duplicate} pending={pending} /></td>
      </tr>)}</tbody>
    </table></div> : <Empty title={emptyText}>Proposals will appear here when they match this view.</Empty>}
    {footer}
  </div>
}

export function Overview() {
  const { state } = useWorkspace()
  const documents = items(state.documents)
  const counts = statuses.slice(0, 4).map(status => ({
    status, count: documents.filter(document => document.status === status).length,
  }))
  return <main className="page">
    <PageHead title={state.workspace?.name || 'Workspace'} action={<NewDocumentButton />}>Create and track your client proposals.</PageHead>
    <div className="metrics" aria-label="Proposal status totals">
      {counts.map(({ status, count }) => <LocalLink className="metric" key={status} to={'/documents?status=' + status}>
        <Status value={status} /><span className="metric-value">{count}</span><span className="metric-arrow" aria-hidden="true">↗</span>
      </LocalLink>)}
    </div>
    <section aria-labelledby="recent">
      <div className="section-head"><h2 id="recent">Recent proposals</h2><LocalLink to="/documents">All documents <span aria-hidden="true">→</span></LocalLink></div>
      <Register documents={[...documents].sort(byRecent).slice(0, 7)} emptyText="No proposals yet" />
    </section>
  </main>
}

const SIZE = 10

export function Documents() {
  const { state } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('')
  const [after, setAfter] = useState('')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState(() => searchParams.getAll('status').filter(status => statuses.includes(status)))
  useEffect(() => {
    setSelected(searchParams.getAll('status').filter(status => statuses.includes(status)))
  }, [searchParams])
  function setStatuses(values) {
    setSelected(values)
    const next = new URLSearchParams(searchParams)
    next.delete('status')
    values.forEach(status => next.append('status', status))
    setSearchParams(next)
    setPage(1)
  }
  const contacts = new Map(items(state.contacts).map(contact => [contact.id, contact.name]))
  const filtered = items(state.documents).filter(document => (
    (!selected.length || selected.includes(document.status))
    && (!owner || document.ownerId === owner)
    && (!after || dateNumber(document.updatedAt) >= dateNumber(after))
    && includesText(query, document.title, document.company, ...items(document.recipients).map(recipient => recipient.name || contacts.get(recipient.contactId)))
  ))
  filtered.sort({
    updated: byRecent,
    title: (first, second) => titleOf(first).localeCompare(titleOf(second)),
    value: (first, second) => Number(second.value || 0) - Number(first.value || 0),
  }[sort])
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / SIZE)))

  return <main className="page">
    <PageHead title="Documents" action={<NewDocumentButton />}>Browse and manage your proposals.</PageHead>
    <div className="filters">
      <Search label="Search documents" placeholder="Search title, client or recipient" value={query} onChange={value => { setQuery(value); setPage(1) }} />
      <div className="filter-actions">
        <details className="popover">
          <summary>Status{selected.length ? ' (' + selected.length + ')' : ''}</summary>
          <div className="popover-body">
            {statuses.map(status => <label className="check" key={status}>
              <input type="checkbox" checked={selected.includes(status)} onChange={event =>
                setStatuses(event.target.checked ? [...selected, status] : selected.filter(value => value !== status))} />
              {capitalize(status)}
            </label>)}
          </div>
        </details>
        <details className="popover">
          <summary>More filters</summary>
          <div className="popover-body stacked">
            <label>Owner<select value={owner} onChange={event => { setOwner(event.target.value); setPage(1) }}>
              <option value="">All owners</option>{items(state.users).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select></label>
            <label>Updated on or after<input type="date" value={after} onChange={event => { setAfter(event.target.value); setPage(1) }} /></label>
          </div>
        </details>
        <label><span className="sr-only">Sort documents</span><select value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}>
          <option value="updated">Recently updated</option><option value="title">Title A–Z</option><option value="value">Highest value</option>
        </select></label>
        {(query || selected.length || owner || after) ? <button onClick={() => {
          setQuery(''); setOwner(''); setAfter(''); setStatuses([])
        }}>Clear filters</button> : null}
      </div>
    </div>
    <Register documents={filtered.slice((visiblePage - 1) * SIZE, visiblePage * SIZE)}
      emptyText={items(state.documents).length ? 'No matching documents' : 'No documents yet'}
      footer={<Pagination total={filtered.length} page={visiblePage} size={SIZE} onPage={setPage} />} />
  </main>
}
