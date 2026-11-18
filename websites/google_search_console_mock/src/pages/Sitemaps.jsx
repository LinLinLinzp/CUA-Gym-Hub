import { useState } from 'react'
import { Link } from 'react-router-dom'
import { countLabel, dateLabel, label, list, propertyBase, removeSitemap, scoped, scopedUrl, submitSitemap } from '../data/records'
import { Confirm, DetailFields, Empty, Icon, Missing, PageHead, sitemapPath, Status, typeLabel } from '../ui'

const statuses = [
  ['', 'All statuses'], ['success', 'Success'], ['pending', 'Pending'],
  ['could_not_fetch', 'Couldn’t fetch'], ['has_errors', 'Has errors'], ['issues', 'All issues'],
]
const columns = [
  ['url', 'Sitemap URL'], ['type', 'Type'], ['lastSubmittedAt', 'Submitted'], ['lastReadAt', 'Last read'],
  ['status', 'Status'], ['discoveredPages', 'Discovered pages'], ['discoveredVideos', 'Discovered videos'],
]
const pageSize = 10

function sorted(rows, key, direction) {
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left == null || right == null) return Number(left == null) - Number(right == null)
    const difference = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))
    return direction === 'asc' ? difference : -difference
  })
}

export function Sitemaps({ state, property, to, go, commit, setNotice, filter }) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'lastSubmittedAt', direction: 'desc' })
  const status = statuses.some(([key]) => key === filter) ? filter : ''
  const maps = scoped(state.sitemaps, property).filter(row => row.status !== 'removed')
  const found = sorted(maps.filter(row => String(row.url || '').toLowerCase().includes(query.trim().toLowerCase())
    && (!status || status === row.status || (status === 'issues' && ['has_errors', 'could_not_fetch'].includes(row.status)))), sort.key, sort.direction)
  const pageCount = Math.max(1, Math.ceil(found.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const changeSort = key => {
    setSort({ key, direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc' })
    setPage(1)
  }
  const submit = event => {
    event.preventDefault()
    const result = scopedUrl(value, property, true)
    if (result.error) { setFeedback(result.error); return }
    commit(current => submitSitemap(current, property, result.url))
    setValue('')
    setFeedback('')
    setPage(1)
    setSort({ key: 'lastSubmittedAt', direction: 'desc' })
    setNotice('Search Console received the sitemap submission.')
  }
  return <>
    <PageHead eyebrow={property ? label(property) : 'Property reports'} title="Sitemaps"
      description="Submit sitemap URLs and review discovery results for this property." />
    {!property ? <section className="card"><Empty title="Choose a verified property" icon="sitemap">Open Properties to add or verify a site.</Empty>
      <div className="empty-actions"><Link className="button" to={to('/properties')}>Open Properties</Link></div></section> : <>
      <section className="card padded">
        <h2>Add a new sitemap</h2>
        <form className="inline-form" onSubmit={submit} noValidate>
          <label className="filter-label">Sitemap URL<input placeholder="sitemap.xml" value={value} onChange={e => { setValue(e.target.value); setFeedback('') }}
            aria-invalid={Boolean(feedback)} aria-describedby={feedback ? 'sitemap-error' : 'sitemap-base'} /></label>
          <button className="primary">Submit</button>
        </form>
        <p className="hint wrap" id="sitemap-base">Relative paths use <span className="mono">{propertyBase(property)}</span></p>
        {feedback && <p className="error" id="sitemap-error" role="alert">{feedback}</p>}
      </section>
      <section className="card report">
        <div className="section-heading"><div><h2>Submitted sitemaps</h2><p>Discovery counts reflect the last completed read.</p></div></div>
        <div className="toolbar">
          <label className="filter-label">Search sitemaps<input type="search" placeholder="Search by URL" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label>
          <label className="filter-label">Status<select value={status} onChange={e => {
            setPage(1)
            go(to('/sitemaps', { property: property.id, status: e.target.value }))
          }}>{statuses.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        </div>
        {found.length ? <div className="table-scroll"><table className="sitemaps-table" aria-label="Submitted sitemaps">
          <thead><tr>{columns.map(([key, title]) => <th key={key} aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
            <button className="sort-button" onClick={() => changeSort(key)}>{title}<span aria-hidden="true">{sort.key === key ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button>
          </th>)}</tr></thead>
          <tbody>{found.slice(start, start + pageSize).map(row => <tr key={row.id}>
            <td>{row.url ? <Link className="table-link mono" title={row.url} to={to(sitemapPath(row), { property: property.id })}>{row.url}</Link>
              : <Link to={to(sitemapPath(row), { property: property.id })}>Sitemap details</Link>}</td>
            <td>{typeLabel(row.type)}</td><td>{dateLabel(row.lastSubmittedAt)}</td><td>{dateLabel(row.lastReadAt)}</td>
            <td><Status value={row.status} /></td><td className="number">{countLabel(row.discoveredPages)}</td><td className="number">{countLabel(row.discoveredVideos)}</td>
          </tr>)}</tbody>
        </table></div> : <Empty title={maps.length ? 'No matching sitemaps' : 'No submitted sitemaps'} icon="sitemap">
          {maps.length ? 'Change the search or status filter.' : 'Submit a sitemap above to see it here.'}</Empty>}
        <div className="table-footer pagination">
          <span>{found.length ? start + 1 : 0}–{Math.min(start + pageSize, found.length)} of {found.length} sitemaps</span>
          <div className="actions"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <span>Page {currentPage} of {pageCount}</span><button disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>
        </div>
      </section>
    </>}
  </>
}

export function SitemapDetail({ map, property, to, go, commit, setNotice }) {
  const [confirmation, setConfirmation] = useState(false)
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')
  const back = to('/sitemaps', { property: property?.id })
  if (!map) return <Missing title="Sitemap unavailable" path={back}>Back to sitemaps</Missing>
  const issues = list(map.issues)
  const title = map.url || 'Sitemap details'
  const retry = () => {
    const result = scopedUrl(map.url, property, true)
    if (result.error) { setError(result.error); return }
    commit(current => submitSitemap(current, property, result.url))
    setNotice('Search Console received the sitemap submission.')
  }
  return <>
    <Link className="back-link" to={back}><Icon name="back" />All sitemaps</Link>
    <PageHead eyebrow="Sitemap details" title={<span className="wrap">{title}</span>} actions={<>
      <button className="primary" onClick={retry}>Resubmit sitemap</button>
      <div className="action-menu" onKeyDown={event => { if (event.key === 'Escape') setMenu(false) }}>
        <button className="icon-button" aria-label="Sitemap actions" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="more" /></button>
        {menu && <div className="popover menu-popover"><button className="text-button destructive" onClick={() => { setMenu(false); setConfirmation(true) }}>Remove sitemap</button></div>}
      </div>
    </>} />
    {error && <p className="error" role="alert">{error}</p>}
    <section className="card padded">
      <h2>Submission summary</h2>
      {map.status === 'pending' && <p className="hint">{map.lastReadAt ? 'Read date, counts and issues reflect the previous completed read.' : 'This sitemap is waiting to be read.'}</p>}
      <DetailFields rows={[
        ['Sitemap URL', <span className="mono wrap">{map.url || '—'}</span>], ['Status', <Status value={map.status} />],
        ['Type', typeLabel(map.type)], ['Last submitted', dateLabel(map.lastSubmittedAt)], ['Last read', dateLabel(map.lastReadAt)],
        ['Discovered pages', countLabel(map.discoveredPages)], ['Discovered videos', countLabel(map.discoveredVideos)],
        ['Submissions', countLabel(map.submissionCount)],
      ]} />
    </section>
    <section className="card padded">
      <h2>{map.status === 'pending' && map.lastReadAt ? 'Issues from the last read' : 'Reported issues'}</h2>
      {issues.length ? <ul className="issue-list">{issues.map((issue, i) => <li key={i}><strong>{issue.message || issue.code || 'Unknown issue'}</strong>{issue.row != null && <span>Row {issue.row}</span>}</li>)}</ul>
        : <p>{map.status === 'pending' && !map.lastReadAt ? 'Issue details are available after the sitemap is read.' : 'No issues reported.'}</p>}
    </section>
    {confirmation && <Confirm title="Remove sitemap" target={title} description="The sitemap will be removed from this property’s list."
      close={() => setConfirmation(false)} onConfirm={() => {
        commit(current => removeSitemap(current, map))
        setConfirmation(false)
        setNotice('Sitemap removed.')
        go(back, { replace: true })
      }} />}
  </>
}
