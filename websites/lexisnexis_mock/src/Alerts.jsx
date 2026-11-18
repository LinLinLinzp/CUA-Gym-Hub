import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  alertPath, alertStatus, array, byId, docPath, filterLabel, filterSnapshot, frequencies, includes,
  jurisdictionOptions, nameOf, newest, patchRows, reportable, researchPath, sourceText, treatments, types,
} from './model.js'
import { useWorkspace } from './store.jsx'
import { Badge, Confirm, Icon, List, Missing, Modal, Moment, PageHead, Panel, Select, SiteLink } from './ui.jsx'

const variants = { search: 'Search', shepards: 'Shepard’s' }
const statuses = { active: 'Active', paused: 'Paused', expired: 'Expired' }
const channels = { online: 'Online only', online_and_email: 'Online and email' }
const monitorAll = { search: Object.keys(types), shepards: Object.keys(treatments) }
const cadenceOrder = new Map(['as_available', 'daily', 'business_daily', 'weekly', 'monthly'].map((cadence, index) => [cadence, index]))
const cadenceRank = ({ delivery }) => delivery?.channel === 'online_and_email'
  ? cadenceOrder.get(delivery.frequency) ?? cadenceOrder.size
  : cadenceOrder.size
const deliveryLabel = (alert) => frequencies[alert?.delivery?.frequency] || channels[alert?.delivery?.channel] || 'Delivery unavailable'
const readCounts = (results) => results.reduce((counts, row) => {
  if (row.status === 'unread') counts.set(row.alertId, (counts.get(row.alertId) || 0) + 1)
  return counts
}, new Map())

function CheckGroup({ title, options, values, onChange, allLabel }) {
  const keys = Object.keys(options)
  const all = keys.every((key) => values.includes(key))
  return <fieldset><legend>{title}</legend><div className="checks">
    {allLabel && <label className="check"><input type="checkbox" checked={all} onChange={() => onChange(all ? [] : keys)} />{allLabel}</label>}
    {Object.entries(options).map(([key, label]) => <label className="check" key={key}>
      <input type="checkbox" checked={values.includes(key)} onChange={() => onChange(values.includes(key) ? values.filter((value) => value !== key) : [...values, key])} />{label}
    </label>)}
  </div></fieldset>
}

export function AlertEditor({ type: initialType = 'search', source, alert, onClose }) {
  const { state, commit } = useWorkspace()
  const [type, setType] = useState(alert?.type || initialType)
  const watched = alert?.source || source
  const fixed = !!alert || !!source
  const [query, setQuery] = useState(watched?.query || '')
  const [contentType, setContentType] = useState(watched?.filters?.contentType || '')
  const [jurisdiction, setJurisdiction] = useState(watched?.filters?.jurisdiction || '')
  const [authority, setAuthority] = useState(watched?.documentId || '')
  const [title, setTitle] = useState(alert?.title || '')
  const [description, setDescription] = useState(alert?.description || '')
  const [client, setClient] = useState(alert?.client || '')
  const [expiry, setExpiry] = useState(alert?.expiresOn || '')
  const [channel, setChannel] = useState(alert?.delivery?.channel || 'online')
  const [frequency, setFrequency] = useState(alert?.delivery?.frequency || 'weekly')
  const [content, setContent] = useState(Array.isArray(alert?.monitor?.contentTypes) ? array(alert.monitor.contentTypes)
    : types[watched?.filters?.contentType] ? [watched.filters.contentType] : monitorAll.search)
  const [scope, setScope] = useState(Array.isArray(alert?.monitor?.treatments) ? array(alert.monitor.treatments) : monitorAll.shepards)
  const [error, setError] = useState('')
  const authorities = Object.fromEntries(state.documents.filter((doc) => reportable(doc, state.citingReferences))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map((doc) => [doc.id, nameOf(doc)]))
  const authorityTitle = byId(state.documents, authority)?.title || 'Unavailable authority'
  const selectContent = (value) => {
    setContentType(value)
    setContent(value ? [value] : monitorAll.search)
  }

  function submit(event) {
    event.preventDefault()
    const cleaned = title.trim()
    const search = type === 'search'
    if (!cleaned) { setError('Enter an alert title.'); return }
    if (search && !alert && !query.trim()) { setError('Enter a search query.'); return }
    if (!search && !alert && !authority) { setError('Choose an authority to monitor.'); return }
    if (search && !content.length) { setError('Select at least one monitored content type.'); return }
    if (!search && !scope.length) { setError('Select at least one treatment to monitor.'); return }
    if (!Object.hasOwn(channels, channel) || (channel === 'online_and_email' && !Object.hasOwn(frequencies, frequency))) {
      setError('Choose a delivery method and an available cadence for email.'); return
    }
    const fields = {
      title: cleaned, description: description.trim(), client: client.trim(), expiresOn: expiry,
      monitor: search ? { contentTypes: content } : { treatments: scope },
      delivery: { channel, ...(channel === 'online_and_email' ? { frequency } : {}) },
    }
    const issue = commit((current, meta) => {
      if (alert) {
        const row = byId(current.alerts, alert.id)
        if (!row || row.status === 'deleted') return 'This alert is unavailable.'
        return { alerts: patchRows(current.alerts, new Map([[row.id, { ...row, ...fields, ...meta.update }]])) }
      }
      if (!search && !reportable(byId(current.documents, authority), current.citingReferences)) return 'Choose an available authority.'
      const filters = fixed ? filterSnapshot(source?.filters) : filterSnapshot({ contentType, jurisdiction })
      const watched = search ? { query: query.trim(), filters } : { documentId: authority }
      return { alerts: [...current.alerts, { id: meta.id('alert'), type, status: 'active', source: watched, ...fields, ...meta.create }] }
    }, alert ? 'Alert updated.' : 'Alert created.')
    if (issue) setError(issue)
    else onClose()
  }

  return <Modal title={alert ? 'Edit alert' : type === 'shepards' && fixed ? 'Create Shepard’s alert' : source ? 'Create search alert' : 'New alert'} onClose={onClose}>
    <form className="compact-stack" onSubmit={submit}>
      {!fixed && <Select label="Alert type" options={variants} value={type} onChange={(value) => { setType(value); setError('') }} />}
      <label className="field"><span>Alert title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <fieldset><legend>Watched source</legend><div className="compact-stack">
        {fixed ? <div><strong>{type === 'search' ? query || 'Search query unavailable' : authorityTitle}</strong>
          {type === 'search' && <p className="meta">{filterLabel(watched?.filters) || 'All content types and jurisdictions'}</p>}</div>
          : type === 'search' ? <>
            <label className="field"><span>Search query</span><input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="filters">
              <Select label="Search content type" options={types} empty="All content types" value={contentType} onChange={selectContent} />
              <Select label="Search jurisdiction" options={jurisdictionOptions(state.documents, jurisdiction)} empty="All jurisdictions" value={jurisdiction} onChange={setJurisdiction} />
            </div>
          </> : <Select label="Authority" options={authorities} empty="Choose an authority" value={authority} onChange={setAuthority} />}
      </div></fieldset>
      {type === 'search'
        ? <CheckGroup title="Monitored content types" options={types} values={content} onChange={setContent} />
        : <CheckGroup title="Monitored treatments" options={treatments} values={scope} onChange={setScope} allLabel="All changes" />}
      <div className="filters">
        <Select label="Delivery" options={channels} value={channel} onChange={setChannel} />
        {channel === 'online_and_email' && <Select label="Email cadence" options={frequencies} value={frequency} onChange={setFrequency} />}
      </div>
      <div className="filters">
        <label className="field"><span>Client (optional)</span><input value={client} onChange={(event) => setClient(event.target.value)} /></label>
        <label className="field"><span>Expiration date (optional)</span><input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></label>
      </div>
      <label className="field"><span>Description (optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">{alert ? 'Save changes' : 'Create alert'}</button></div>
    </form>
  </Modal>
}

export function Alerts() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const [editing, setEditing] = useState(false)
  const counts = readCounts(state.alertResults)
  const alerts = state.alerts.filter((alert) => alert.status !== 'deleted'
    && (!type || alert.type === type) && (!status || alertStatus(alert) === status)
    && includes([alert.title, sourceText(alert, state.documents)].join(' '), query))
    .sort((a, b) => sort === 'title' ? nameOf(a).localeCompare(nameOf(b)) : sort === 'frequency'
      ? cadenceRank(a) - cadenceRank(b) || nameOf(a).localeCompare(nameOf(b)) : newest(a, b))
  return <>
    <PageHead title="Alerts" description="Monitor searches and changes in the treatment of an authority."
      actions={<button className="primary" onClick={() => setEditing(true)}><Icon name="plus" />New alert</button>} />
    <Panel>
      <div className="toolbar filters">
        <label className="field search-field"><span>Search alerts</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, query or authority" /></label>
        <Select label="Alert type" options={variants} empty="All types" value={type} onChange={setType} />
        <Select label="Status" options={statuses} empty="All statuses" value={status} onChange={setStatus} />
        <Select label="Sort by" options={{ recent: 'Recently updated', title: 'Title', frequency: 'Frequency' }} value={sort} onChange={setSort} />
        {(query || type || status) && <button onClick={() => { setQuery(''); setType(''); setStatus('') }}>Clear filters</button>}
      </div>
      <List count={alerts.length} label="alert" empty={query || type || status ? 'No alerts match these filters.' : 'Create an alert to start monitoring research.'}>
        {alerts.map((alert) => <li className="row" key={alert.id}><div className="row-main"><span className="row-icon"><Icon name="bell" /></span>
          <div className="row-copy"><SiteLink to={alertPath(alert.id)}>{nameOf(alert)}</SiteLink>
            <p className="meta">{[variants[alert.type], sourceText(alert, state.documents)].filter(Boolean).join(' · ')}</p></div>
        </div><div className="row-data"><span>{counts.get(alert.id) || 0} unread</span><span>{deliveryLabel(alert)}</span>
          <Badge value={alertStatus(alert)} /><Moment value={alert.updatedAt || alert.createdAt} /></div></li>)}
      </List>
    </Panel>
    {editing && <AlertEditor onClose={() => setEditing(false)} />}
  </>
}

export function AlertDetail() {
  const { alertId } = useParams()
  return <AlertView key={alertId} alertId={alertId} />
}

function AlertView({ alertId }) {
  const { state, commit, announce } = useWorkspace()
  const [modal, setModal] = useState('')
  const alert = byId(state.alerts, alertId)
  if (!alert || alert.status === 'deleted') return <Missing title="Alert unavailable" description="This alert may have been deleted or is no longer in your workspace." to="/alerts" label="Back to alerts" />
  const authority = byId(state.documents, alert.source?.documentId)
  const query = alert.source?.query
  const results = state.alertResults.filter((row) => row.alertId === alertId)
    .sort((a, b) => String(b.matchedAt || '').localeCompare(String(a.matchedAt || '')))
  const scope = alert.type === 'search' ? array(alert.monitor?.contentTypes).map((key) => types[key] || key)
    : array(alert.monitor?.treatments).map((key) => treatments[key] || key)
  const paused = alert.status === 'paused'

  function changeStatus(status) {
    return commit((current, meta) => {
      const row = byId(current.alerts, alertId)
      if (!row || row.status === 'deleted' || row.status === status) return 'This alert has already changed.'
      return { alerts: patchRows(current.alerts, new Map([[alertId, { ...row, status, ...meta.update }]])) }
    }, status === 'active' ? 'Alert resumed.' : status === 'paused' ? 'Alert paused.' : 'Alert deleted.')
  }

  function mark(result, status) {
    const issue = commit((current, meta) => {
      const row = byId(current.alertResults, result.id)
      const monitor = byId(current.alerts, alertId)
      if (!monitor || monitor.status === 'deleted' || row?.alertId !== alertId || row.status === status) return 'This result has already changed or is unavailable.'
      const changes = { ...row, status, readAt: status === 'read' ? meta.update.updatedAt : null, ...meta.update }
      return { alertResults: patchRows(current.alertResults, new Map([[row.id, changes]])) }
    }, status === 'read' ? 'Result marked as read.' : 'Result marked as unread.')
    if (issue) announce(issue)
  }

  return <>
    <PageHead title={nameOf(alert)} description={alert.description} actions={<>
      <button className="primary" onClick={() => setModal('edit')}>Edit alert</button>
      <button onClick={() => { const issue = changeStatus(paused ? 'active' : 'paused'); if (issue) announce(issue) }}>{paused ? 'Resume alert' : 'Pause alert'}</button>
      <button onClick={() => setModal('delete')}>Delete alert</button>
    </>}><nav className="crumbs" aria-label="Breadcrumb"><SiteLink to="/alerts">Alerts</SiteLink><Icon name="chevron" size={13} /><span>{variants[alert.type] || 'Alert'} alert</span></nav></PageHead>
    <div className="stack">
      <Panel title="Configuration">
        <dl className="data-grid">
          <div><dt>Status</dt><dd><Badge value={alertStatus(alert)} /></dd></div>
          <div><dt>Watched source</dt><dd>{alert.type === 'shepards'
            ? (authority ? <SiteLink to={docPath(authority.id)}>{nameOf(authority)}</SiteLink> : 'Unavailable authority')
            : (query ? <SiteLink to={researchPath(query, alert.source?.filters)}>{query}</SiteLink> : 'Search query unavailable')}
            {alert.type === 'search' && <p className="meta">{filterLabel(alert.source?.filters)}</p>}</dd></div>
          <div><dt>Monitoring scope</dt><dd>{scope.join(', ') || 'Unspecified'}</dd></div>
          <div><dt>Delivery</dt><dd>{[channels[alert.delivery?.channel], frequencies[alert.delivery?.frequency]].filter(Boolean).join(' · ') || 'Unspecified'}</dd></div>
          <div><dt>Client</dt><dd>{alert.client || 'None'}</dd></div>
          <div><dt>Expires</dt><dd>{alert.expiresOn ? <Moment value={alert.expiresOn} /> : 'No expiration'}</dd></div>
        </dl>
      </Panel>
      <Panel title="Alert results">
        <List count={results.length} label="result" empty="This alert has no results yet.">
          {results.map((result) => {
            const doc = byId(state.documents, result.documentId)
            const read = result.status === 'read'
            return <li className="row" key={result.id}><div className="row-main"><span className="row-icon"><Icon name="file" /></span>
              <div className="row-copy">{doc ? <SiteLink to={docPath(doc.id)}>{nameOf(doc)}</SiteLink> : <strong>Document unavailable</strong>}
                {doc?.citation && <p className="meta">{doc.citation}</p>}{result.summary && <p className="result-excerpt">{result.summary}</p>}</div>
            </div><div className="row-data"><Moment value={result.matchedAt} /><Badge value={read ? 'read' : 'unread'} /></div>
              <button onClick={() => mark(result, read ? 'unread' : 'read')}>{read ? 'Mark unread' : 'Mark read'}</button></li>
          })}
        </List>
      </Panel>
    </div>
    {modal === 'edit' && <AlertEditor alert={alert} onClose={() => setModal('')} />}
    {modal === 'delete' && <Confirm title="Delete alert" description={`Delete “${nameOf(alert)}”? This removes it from your list of monitors.`}
      action="Delete alert" onClose={() => setModal('')} onConfirm={() => changeStatus('deleted')} />}
  </>
}
