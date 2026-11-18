import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Download, Gift, Plus, Search, SlidersHorizontal, UserMinus, X } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppLink, Avatar } from '../components/Shell.jsx'
import { ActionMenu, Badge, Empty, Missing, Tabs } from '../components/UI.jsx'
import { AddSubscribersDialog, CompSubscribersDialog, EndCompDialog, ExportSubscribersDialog, RemoveSubscribersDialog } from './SubscriberDialogs.jsx'
import { accessFor, grantStatus, relevantGrant } from '../state/access.js'
import { useStore, nameOf } from '../state/Store.jsx'
import { getSessionId } from '../utils/dataManager.js'
import { accessLabels, articlePath, array, count, date, money, plural, sortTime, stamp, subscriberPath } from '../utils/format.js'

const subscribersUrl = '/publish/subscribers'
const pageSize = 50
const day = 86400000
const columns = {
  subscriber: 'Subscriber', type: 'Type', joinedAt: 'Start date', activityScore: 'Activity', totalRevenue: 'Revenue',
}
const baseColumns = Object.keys(columns)
const exportColumns = baseColumns.flatMap(column => column === 'subscriber' ? ['name', 'email'] : [column])
const extraColumnLabels = { country: 'Country', emailOpens30d: 'Email opens', commentCount: 'Comments', source: 'Acquisition' }
const additionalColumns = Object.keys(extraColumnLabels)
const columnLabels = { ...columns, ...extraColumnLabels }

function loadDisplay(key) {
  try {
    return array(JSON.parse(sessionStorage.getItem(key))).filter(column => additionalColumns.includes(column))
  } catch {
    return []
  }
}
const displayName = subscriber => subscriber.name || subscriber.email || 'Unknown subscriber'
const titleCase = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'

export default function Subscribers() {
  const { state } = useStore()
  const { id } = useParams()
  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const [type, setType] = useState(() => params.get('access') || '')
  const [joined, setJoined] = useState('')
  const [activity, setActivity] = useState('')
  const [sort, setSort] = useState({ column: 'joinedAt', direction: -1 })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [exporting, setExporting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [endingComp, setEndingComp] = useState(null)
  const [comping, setComping] = useState(null)
  const [removing, setRemoving] = useState(null)
  const displayKey = `substack:display:${getSessionId() || '_default'}`
  const [shown, setShown] = useState(() => loadDisplay(displayKey))
  const visibleColumns = [...baseColumns, ...additionalColumns.filter(column => shown.includes(column))]
  const displayedExportColumns = [...exportColumns, ...visibleColumns.slice(baseColumns.length)]
  const commentCounts = new Map()
  for (const comment of state.comments) {
    commentCounts.set(comment.authorId, (commentCounts.get(comment.authorId) || 0) + 1)
  }
  function toggleColumn(column) {
    const next = shown.includes(column) ? shown.filter(item => item !== column) : [...shown, column]
    setShown(next)
    sessionStorage.setItem(displayKey, JSON.stringify(next))
    if (!next.includes(column) && sort.column === column) setSort({ column: 'joinedAt', direction: -1 })
  }
  const currency = state.publication.currency || 'USD'
  const now = new Date()
  const active = state.subscribers.filter(row => row.status === 'active')
  const access = new Map(active.map(row => [row.id, accessFor(row, relevantGrant(state.compSubscriptions, row.id, now), now)]))
  const term = search.trim().toLowerCase()
  const filtered = active.filter(row => {
    if (term && ![row.name, row.email].some(text => String(text || '').toLowerCase().includes(term))) return false
    const membership = access.get(row.id)
    if (type === 'access' && !membership.paid) return false
    if (type === 'paid' && !['paid', 'founding'].includes(membership.type)) return false
    if (['free', 'founding', 'comp', 'trial'].includes(type) && membership.type !== type) return false
    if (joined && !(stamp(row.joinedAt) >= +now - Number(joined) * day)) return false
    const knownActivity = Number.isFinite(row.activityScore)
    if (activity === 'high' && !(knownActivity && row.activityScore >= 4)) return false
    if (activity === 'low' && !(knownActivity && row.activityScore >= 0 && row.activityScore < 4)) return false
    if (activity === 'unknown' && knownActivity) return false
    return true
  })
  function readSort(row) {
    if (sort.column === 'subscriber') return displayName(row)
    if (sort.column === 'type') return accessLabels[access.get(row.id).type]
    if (sort.column === 'joinedAt') return stamp(row.joinedAt) || 0
    if (['country', 'source'].includes(sort.column)) return row[sort.column] || ''
    const value = readExport(row, sort.column)
    return value == null ? -1 : Number(value)
  }
  function compare(a, b) {
    const left = readSort(a)
    const right = readSort(b)
    const order = typeof left === 'string' ? left.localeCompare(right, 'en', { sensitivity: 'base' }) : left - right
    return order * sort.direction || String(a.id).localeCompare(String(b.id))
  }
  function readExport(row, column) {
    if (column === 'type') return accessLabels[access.get(row.id).type]
    if (column === 'commentCount') return row.userId ? (commentCounts.get(row.userId) || 0) : 0
    return row[column]
  }
  filtered.sort(compare)
  const numPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageIndex = Math.min(page, numPages - 1)
  const pageRows = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  const selectedIds = filtered.filter(row => selected.has(row.id)).map(row => row.id)
  const pageSelected = pageRows.filter(row => selected.has(row.id)).length
  const selectPage = useRef(null)
  useEffect(() => {
    if (selectPage.current) selectPage.current.indeterminate = pageSelected > 0 && pageSelected < pageRows.length
  }, [pageSelected, pageRows.length])
  function resetSelection() { setSelected(new Set()); setPage(0) }
  function changeScope(setter, value) { setter(value); resetSelection() }
  function toggleRows(rows, checked) {
    setSelected(current => {
      const next = new Set(current)
      for (const row of rows) {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      }
      return next
    })
  }
  function changeSort(column) {
    setSort({ column, direction: column === sort.column ? -sort.direction : ['subscriber', 'type', 'country', 'source'].includes(column) ? 1 : -1 })
    setPage(0)
  }
  const detail = id && state.subscribers.find(row => row.id === id)
  const detailGrant = detail && relevantGrant(state.compSubscriptions, detail.id, now)
  if (id && !detail) return <Missing title="Subscriber not found" to={subscribersUrl} action="Back to Subscribers" />
  const sources = [
    ['Active subscribers', active.length],
    ['Paid access', [...access.values()].filter(value => value.paid).length],
    ['Complimentary', [...access.values()].filter(value => value.type === 'comp').length],
  ]
  return <div className={`page subscriber-page ${detail ? 'has-inspector' : ''}`}>
    <div className="subscriber-list-pane">
      <div className="page-heading"><h1>Subscribers</h1><button type="button" className="button primary" onClick={() => setAdding(true)}><Plus size={16} /> Add subscribers</button></div>
      <section className="stats-band subscriber-stats" aria-label="Subscriber summary">
        {sources.map(([label, value]) => <div className="stat" key={label}><span className="stat-top">{label}</span><strong>{count(value)}</strong></div>)}
      </section>
      <div className="toolbar subscriber-toolbar">
        <label className="search-field"><Search size={17} /><input aria-label="Search subscribers" type="search" placeholder="Search by name or email" value={search} onChange={event => changeScope(setSearch, event.target.value)} /></label>
        <select aria-label="Filter by subscription type" value={type} onChange={event => changeScope(setType, event.target.value)}>
          <option value="">All types</option>
          <option value="free">Free</option><option value="paid">Paid</option><option value="founding">Founding</option><option value="trial">Trial</option><option value="comp">Comp</option><option value="access">Paid access</option>
        </select>
        <select aria-label="Filter by start date" value={joined} onChange={event => changeScope(setJoined, event.target.value)}>
          <option value="">Any start date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option>
        </select>
        <select aria-label="Filter by activity" value={activity} onChange={event => changeScope(setActivity, event.target.value)}>
          <option value="">Any activity</option><option value="high">High activity</option><option value="low">Low activity</option><option value="unknown">Unknown activity</option>
        </select>
        <ActionMenu trigger={<><SlidersHorizontal size={15} /> Display</>}>
          {additionalColumns.map(column => <label className="display-option" key={column}>
            <input type="checkbox" checked={shown.includes(column)} onChange={() => toggleColumn(column)} />{columnLabels[column]}
          </label>)}
        </ActionMenu>
        <button type="button" className="button" onClick={() => setExporting(true)}><Download size={15} /> Export</button>
      </div>
      {selectedIds.length > 0 && <div className="selection-bar">
        <strong>{plural(selectedIds.length, 'subscriber')} selected</strong>
        {selectedIds.length < filtered.length && <button className="text-button" onClick={() => setSelected(new Set(filtered.map(row => row.id)))}>Select all {count(filtered.length)} matching</button>}
        <button className="text-button" onClick={() => setSelected(new Set())}>Clear selection</button>
        <ActionMenu trigger={<>Actions <ChevronDown size={14} /></>}>
          <button onClick={() => setComping(selectedIds)}><Gift size={15} /> Comp subscription</button>
          <hr /><button className="destructive" onClick={() => setRemoving(selectedIds)}><UserMinus size={15} /> Remove subscribers</button></ActionMenu>
      </div>}
      {pageRows.length ? <>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Subscriber table">
          <table className="subscribers-table">
            <thead><tr>
              <th scope="col"><input ref={selectPage} type="checkbox" aria-label="Select subscribers on this page" checked={pageRows.length === pageSelected} onChange={event => toggleRows(pageRows, event.target.checked)} /></th>
              {visibleColumns.map(column => {
                const Arrow = sort.direction === 1 ? ArrowUp : ArrowDown
                return <th scope="col" key={column} className={column} aria-sort={sort.column === column ? sort.direction === 1 ? 'ascending' : 'descending' : undefined}>
                  <button type="button" onClick={() => changeSort(column)}>{columnLabels[column]}{sort.column === column && <Arrow size={12} />}</button>
                </th>
              })}
              <th scope="col"><span className="visually-hidden">Actions</span></th>
            </tr></thead>
            <tbody>{pageRows.map(row => <tr key={row.id} data-selected={selected.has(row.id)}>
              <td><input type="checkbox" aria-label={`Select ${displayName(row)}`} checked={selected.has(row.id)} onChange={event => toggleRows([row], event.target.checked)} /></td>
              {visibleColumns.map(column => <td className={column} key={column}><SubscriberCell column={column} row={row} type={access.get(row.id).type} currency={currency} value={readExport(row, column)} /></td>)}
              <td><ActionMenu label={`Actions for ${displayName(row)}`}>
                <AppLink to={subscriberPath(row)}>View subscriber</AppLink>
                <button onClick={() => setComping([row.id])}><Gift size={15} /> Comp subscription</button>
                <hr /><button className="destructive" onClick={() => setRemoving([row.id])}><UserMinus size={15} /> Remove subscriber</button>
              </ActionMenu></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="pagination">
          <small>{count(pageIndex * pageSize + 1)}–{count(pageIndex * pageSize + pageRows.length)} of {count(filtered.length)}</small>
          <div className="toolbar">
            <button className="icon-button" aria-label="Previous page" disabled={!pageIndex} onClick={() => setPage(pageIndex - 1)}><ArrowLeft size={16} /></button>
            <button className="icon-button" aria-label="Next page" disabled={pageIndex + 1 >= numPages} onClick={() => setPage(pageIndex + 1)}><ArrowRight size={16} /></button>
          </div>
        </div>
      </> : <Empty title={active.length ? 'No subscribers match your filters' : 'No subscribers yet'} action={active.length ? 'Clear filters' : 'Add subscribers'}
        onAction={active.length ? () => { setSearch(''); setType(''); setJoined(''); setActivity(''); resetSelection() } : () => setAdding(true)} />}
    </div>
    {exporting && <ExportSubscribersDialog all={active.sort(compare)} filtered={filtered} displayed={displayedExportColumns}
      supported={[...exportColumns, ...additionalColumns]} read={readExport} onClose={() => setExporting(false)} />}
    {adding && <AddSubscribersDialog onClose={() => setAdding(false)} />}
    {endingComp && <EndCompDialog grantId={endingComp} onClose={() => setEndingComp(null)} />}
    {comping && <CompSubscribersDialog ids={comping} onClose={() => setComping(null)} />}
    {removing && <RemoveSubscribersDialog ids={removing} onClose={() => setRemoving(null)} onRemoved={() => {
      setSelected(current => new Set([...current].filter(id => !removing.includes(id))))
      setRemoving(null)
    }} />}
    {detail && <SubscriberDetail key={detail.id} row={detail} grant={detailGrant} actions={detail.status === 'active' && <ActionMenu label={`Actions for ${displayName(detail)}`}>
      <button onClick={() => setComping([detail.id])}><Gift size={15} /> Comp subscription</button>
      {detailGrant && <button onClick={() => setEndingComp(detailGrant.id)}>End comp</button>}
      <hr /><button className="destructive" onClick={() => setRemoving([detail.id])}><UserMinus size={15} /> Remove subscriber</button>
    </ActionMenu>} />}
  </div>
}

function SubscriberCell({ column, row, type, currency, value }) {
  if (column === 'subscriber') return <AppLink className="subscriber-name" to={subscriberPath(row)}>
    <Avatar name={displayName(row)} /><span><strong>{displayName(row)}</strong>{row.name && row.email && <small>{row.email}</small>}</span>
  </AppLink>
  if (column === 'type') return <Badge tone={type}>{accessLabels[type]}</Badge>
  if (column === 'joinedAt') return date(row.joinedAt)
  if (column === 'activityScore') return <Activity score={row.activityScore} />
  if (column === 'totalRevenue') return money(row.totalRevenue, currency)
  if (column === 'commentCount' || column === 'emailOpens30d') return count(value)
  if (column === 'source') return titleCase(value)
  return value || '—'
}

function Activity({ score }) {
  if (!Number.isFinite(score)) return '—'
  const stars = Math.max(0, Math.min(5, Math.round(score)))
  return <span className="activity-stars" aria-label={`${stars} out of 5`} title={`${stars} out of 5`}><span>{'★'.repeat(stars)}</span><span>{'☆'.repeat(5 - stars)}</span></span>
}

function SubscriberDetail({ row, grant, actions }) {
  const { state } = useStore()
  const [tab, setTab] = useState('details')
  const access = accessFor(row, grant)
  const comments = row.userId ? state.comments.filter(comment => comment.authorId === row.userId).sort(sortTime('createdAt')) : []
  const history = state.events.filter(event => event.details?.subscriberId === row.id || event.details?.subscriberIds?.includes(row.id) ||
    comments.some(comment => comment.id === event.details?.commentId)).sort(sortTime('createdAt'))
  const identity = displayName(row)
  const values = [
    ['Subscription type', accessLabels[access.type]], ['Base subscription', accessLabels[row.baseType] || '—'],
    ['Start date', date(row.joinedAt)], ['Source', titleCase(row.source)], ['Country', row.country || '—'],
    ['Activity', <Activity score={row.activityScore} />], ['Email opens in 30 days', count(row.emailOpens30d)],
    ['Revenue', money(row.totalRevenue, state.publication.currency)], ...(row.paidThroughAt ? [['Paid through', date(row.paidThroughAt, true)]] : []),
    ...(row.trialEndsAt ? [['Trial ends', date(row.trialEndsAt, true)]] : []), ...(row.removedAt ? [['Removed', date(row.removedAt, true)]] : []),
  ]
  return <aside className="subscriber-inspector" aria-label="Subscriber details">
    <div className="inspector-top"><AppLink to={subscribersUrl} className="button inspector-back"><ArrowLeft size={16} /> Subscribers</AppLink>
      <AppLink to={subscribersUrl} aria-label="Close subscriber details" className="icon-button close-inspector"><X size={17} /></AppLink></div>
    <div className="inspector-identity"><Avatar name={identity} /><div><h2>{identity}</h2>{row.name && <p className="muted">{row.email}</p>}</div>{actions}</div>
    <div className="inspector-status"><Badge tone={row.status}>{titleCase(row.status)}</Badge>{row.status !== access.type && <Badge tone={access.type}>{accessLabels[access.type]}</Badge>}</div>
    <Tabs label="Subscriber details tabs" items={[['details', 'Details'], ['comments', 'Comments', comments.length], ['events', 'Events', history.length]]} value={tab} onChange={setTab} />
    {tab === 'details' && grant && row.status === 'active' && <section className="comp-detail">
      <h3>Comp subscription</h3>
      <Badge tone={grantStatus(grant)}>{titleCase(grantStatus(grant))}</Badge>
      <p>{grant.tier === 'founding' ? 'Founding' : 'Paid'} · {date(grant.startsAt)} to {grant.endsAt ? date(grant.endsAt) : 'forever'}</p>
    </section>}
    {tab === 'details' && <dl className="detail-fields">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {tab === 'comments' && <ul className="inspector-list">{comments.length ? comments.map(comment => {
      const post = state.posts.find(item => item.id === comment.postId)
      return <li key={comment.id}>
        {post?.status === 'published' && post.slug ? <AppLink to={articlePath(post) + '#comments'}>{post.title || 'Untitled'}</AppLink> : <strong>{post?.title || 'Unavailable post'}</strong>}
        <p>{comment.status === 'visible' ? comment.body : `Comment ${comment.status || 'unavailable'}`}</p><small>{date(comment.createdAt)}</small>
      </li>
    }) : <li className="muted">No comments yet.</li>}</ul>}
    {tab === 'events' && <ul className="inspector-list">{history.length ? history.map(event => <li key={event.id}>
      <strong>{eventNames[event.type] || event.type}</strong><p><small>{nameOf(state, event.actorId)} · {date(event.createdAt, true)}</small></p>
    </li>) : <li className="muted">No recorded events.</li>}</ul>}
  </aside>
}

const eventNames = {
  'subscriber.added': 'Subscriber added', 'subscriber.removed': 'Subscriber removed', 'subscriber.exported': 'Included in export',
  'comp.granted': 'Comp granted', 'comp.extended': 'Comp extended', 'comp.revoked': 'Comp ended',
  'comment.created': 'Comment posted', 'comment.pinned': 'Comment pinned', 'comment.unpinned': 'Comment unpinned',
  'comment.removed': 'Comment removed', 'comment.approved': 'Comment approved', 'comment.unhidden': 'Comment restored',
}
