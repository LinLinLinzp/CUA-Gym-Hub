import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { active, rows, useStore } from '../store.jsx'
import { feedMethods, feedStatuses, feedTypes, frequencies, maxFileSize, ownedProducts, removeFeed, runFeed, saveFeed, timezones } from '../data/feeds.js'
import { currencies, languages, sampleUrl } from '../data/seed.js'
import {
  AppLink, DateText, Dialog, Empty, Facts, Field, Filter, Missing, PageHeader, Pagination, Search, Status,
  feedPath, issuePath, label, matchesText, newest, productPath, useFilters, usePage, sidPath,
} from '../ui.jsx'

const listPath = '/data-sources'
const sourceFilters = ['q', 'type', 'status', 'method']
const sourceName = (item) => item.name || 'Unnamed source'

export function FeedList() {
  const { state } = useStore()
  const { filters, change, clear, filtered } = useFilters(sourceFilters)
  const sources = active(state.feeds)
  const results = sources.filter((item) => matchesText(filters.q, item.name) && sourceFilters.slice(1).every((key) => !filters[key] || item[key] === filters[key]))
    .sort((a, b) => sourceName(a).localeCompare(sourceName(b), 'en', { sensitivity: 'base' }))
  const page = usePage(results, JSON.stringify(filters))
  return <>
    <PageHeader title="Data sources" description="Configure product inputs and inspect the results of your latest updates."
      actions={<AppLink className="button primary" to={listPath + '/new'}>Add data source</AppLink>} />
    <section className="panel" aria-label="Data sources">
      <div className="filters">
        <Search title="Search sources" placeholder="Source name" value={filters.q} onChange={change('q')} name="q" />
        <Filter title="Type" value={filters.type} options={feedTypes} onChange={change('type')} />
        <Filter title="Status" value={filters.status} options={feedStatuses} onChange={change('status')} />
        <Filter title="Input method" value={filters.method} options={feedMethods} onChange={change('method')} />
        {filtered && <button type="button" onClick={clear}>Clear filters</button>}
      </div>
      {!page.total ? filtered
        ? <Empty title="No matching sources" description="Try another search or clear the filters." />
        : <Empty title="No data sources yet" description="Add a file upload or scheduled fetch source."><AppLink className="button" to={listPath + '/new'}>Add data source</AppLink></Empty>
        : <div className="table-body" tabIndex={0} aria-label="Source results"><table aria-label="Data sources">
          <thead><tr><th scope="col">Source</th><th scope="col">Input method</th><th scope="col">Type</th><th scope="col">Market</th><th scope="col">Language</th><th scope="col">Last update</th><th scope="col">Status</th></tr></thead>
          <tbody>{page.items.map((item) => <tr key={item.id}>
            <td><AppLink to={feedPath(item.id)}>{sourceName(item)}</AppLink></td><td>{label(item.method)}</td><td>{label(item.type)}</td>
            <td>{label(item.country)}</td><td>{label(item.language)}</td><td><DateText value={item.lastRunAt} /></td><td><Status value={item.status} /></td>
          </tr>)}</tbody>
        </table></div>}
      <Pagination page={page} />
    </section>
  </>
}

function runInput(run) {
  return run?.input?.fileName || run?.input?.sourceUrl || '—'
}

function RunHistory({ runs, latest }) {
  if (!runs.length) return <Empty title="No updates yet" description="Submitted runs appear here." />
  return <div className="run-list">{runs.map((run) => {
    const errors = rows(run.errors)
    return <details key={run.id} open={run.id === latest?.id ? true : undefined}>
      <summary><span>{label(run.trigger)}</span><Status value={run.status} /> <DateText value={run.createdAt} /></summary>
      <Facts entries={[
        [run.trigger === 'upload' ? 'Filename' : 'File link', runInput(run)], ['Rows received', run.receivedCount], ['Accepted', run.acceptedCount], ['Rejected', run.rejectedCount],
      ]} />
      {errors.length > 0 && <div className="run-errors"><h3>Processing errors</h3><ul>{errors.map((error, i) => <li key={i}>
        {error.row != null && <strong>Row {error.row}{error.offerId ? ' · ' + error.offerId : ''} · </strong>}{error.message || label(error.code)}
      </li>)}</ul></div>}
    </details>
  })}</div>
}

function FeedRelations({ feed, runs, state }) {
  const products = ownedProducts(state, feed)
  const runIds = new Set(runs.map((run) => run.id))
  const activeProducts = new Map(active(state.products).map((item) => [item.id, item]))
  const touched = [...new Set(rows(state.productChanges).filter((item) => runIds.has(item.feedRunId)).map((item) => item.productId))].reverse()
  const supplemental = feed.type === 'supplemental'
  const otherTouched = touched.filter((id) => activeProducts.get(id)?.feedId !== feed.id)
  const linkedIssues = rows(state.issues).filter((issue) => issue.feedId === feed.id)
  const catalog = '/products?feedId=' + encodeURIComponent(feed.id)
  return <div className="stack">
    {(!supplemental || products.length > 0) && <section className="panel">
      <div className="panel-heading"><div><h2>Owned products</h2><p>{products.length} active {products.length === 1 ? 'product' : 'products'}</p></div>
        {products.length > 0 && <AppLink className="text-link" to={catalog}>View catalog</AppLink>}</div>
      {products.length > 0 ? <ul className="compact-list">{products.slice(0, 5).map((product) => <li key={product.id}>
        <AppLink to={productPath(product.id)}>{product.title || product.offerId || 'Untitled product'}</AppLink>
      </li>)}</ul> : <Empty title="No active linked products" />}
      {!supplemental && otherTouched.length > 0 && <div className="content detail-copy">
        Some past updates reference products that have moved or are unavailable.
      </div>}
    </section>}
    {supplemental && <section className="panel">
      <div className="panel-heading"><div><h2>Updated products</h2><p>{otherTouched.length} {otherTouched.length === 1 ? 'product' : 'products'} in update records</p></div></div>
      {otherTouched.length > 0 ? <ul className="compact-list">{otherTouched.map((id) => {
        const product = activeProducts.get(id)
        return <li key={id}>{product
          ? <AppLink to={productPath(id)}>{product.title || product.offerId || 'Untitled product'}</AppLink>
          : <span>Unavailable product <small>{id}</small></span>}</li>
      })}</ul> : <Empty title="No additional products in update records" />}
    </section>}
    <section className="panel">
      <div className="panel-heading"><h2>Linked issues</h2></div>
      {linkedIssues.length ? <ul className="compact-list">{linkedIssues.map((issue) => <li key={issue.id}><AppLink to={issuePath(issue.id)}>{issue.title || label(issue.code)}</AppLink><Status value={issue.status} /></li>)}</ul>
        : <Empty title="No linked issues" />}
    </section>
  </div>
}

export function FeedDetail() {
  const { id } = useParams()
  const { search } = useLocation()
  const { state, commit, setNotice } = useStore()
  const [tab, setTab] = useState(() => new URLSearchParams(search).get('tab') === 'history' ? 'history' : 'setup')
  const [dialog, setDialog] = useState(null)
  const [pickedFile, setPickedFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [running, setRunning] = useState(false)
  const inFlight = useRef(false)
  const feed = rows(state.feeds).find((item) => item.id === id)
  if (!feed) return <Missing title="Data source not found" to={listPath} action="Back to data sources" />
  const runs = rows(state.feedRuns).filter((run) => run.feedId === id).sort(newest)
  const latest = runs.find((run) => run.id === feed.lastRunId) || runs[0]
  const archived = Boolean(feed.deletedAt)
  const scheduled = feed.method === 'scheduled_fetch'
  const canRun = scheduled || feed.method === 'file_upload'
  const count = ownedProducts(state, feed).length

  function openDialog(kind) {
    setPickedFile(null)
    setFileError('')
    setDialog(kind)
  }

  async function submitRun() {
    if (inFlight.current) return
    if (!scheduled && !pickedFile) {
      setFileError('Choose a CSV or TSV file.')
      document.getElementById('source-file')?.focus()
      return
    }
    inFlight.current = true
    setRunning(true)
    try {
      const request = { trigger: scheduled ? 'manual_update' : 'upload' }
      if (!scheduled) {
        request.filename = pickedFile.name
        request.sizeBytes = pickedFile.size
        if (request.sizeBytes <= maxFileSize && /\.(csv|tsv)$/i.test(request.filename)) {
          try { request.content = new TextDecoder('utf-8', { fatal: true }).decode(await pickedFile.arrayBuffer()) }
          catch { request.readError = true }
        }
      }
      const result = commit((current, meta) => runFeed(current, meta, id, request))
      if (result.error) setNotice(result.error)
      else {
        setTab('history')
        setNotice('Update ' + label(result.run.status).toLowerCase() + ' · ' + result.run.acceptedCount + ' accepted, ' + result.run.rejectedCount + ' rejected.')
      }
      setDialog(null)
    } finally {
      setRunning(false)
      inFlight.current = false
    }
  }

  return <>
    <PageHeader title={sourceName(feed)} description={archived ? 'Data source removed. Past update results remain available.' : label(feed.method) + ' · ' + label(feed.country)}
      breadcrumbs={[[ 'Data sources', listPath ], [sourceName(feed)]]}
      actions={!archived && <>
        <AppLink className="button" to={feedPath(id) + '/edit'}>Edit setup</AppLink>
        {canRun && <button type="button" className="primary" onClick={() => openDialog('run')}>{scheduled ? 'Update now' : 'Upload file'}</button>}
      </>} />
    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Source details</h2><p>{latest ? 'Last update ' : 'No recorded update'}{latest && <DateText value={latest.createdAt} />}</p></div><Status value={feed.status} /></div>
        {!archived && <div className="tabs" aria-label="Source view">
          <button type="button" aria-pressed={tab === 'setup'} onClick={() => setTab('setup')}>Setup</button>
          <button type="button" aria-pressed={tab === 'history'} onClick={() => setTab('history')}>Update history</button>
        </div>}
        {tab === 'history' || archived ? <RunHistory runs={runs} latest={latest} /> : <div className="content">
          <Facts entries={[
            ['Source type', label(feed.type)], ['Input method', label(feed.method)], ['Market', label(feed.country)], ['Language', label(feed.language)],
            ...(scheduled ? [['File link', feed.sourceUrl || '—'], ['Frequency', label(feed.schedule?.frequency)], ['Local time', feed.schedule?.time], ['Timezone', feed.schedule?.timezone]] : []),
            ...(latest ? [[scheduled ? 'Last file link' : 'Last filename', runInput(latest)], ['Latest result', label(latest.status)],
              ['Accepted rows', latest.acceptedCount], ['Rejected rows', latest.rejectedCount]] : []),
          ]} />
          <div className="review-options"><button type="button" onClick={() => openDialog('remove')}>Remove data source</button></div>
        </div>}
      </section>
      <FeedRelations feed={feed} runs={runs} state={state} />
    </div>
    {dialog === 'run' && <Dialog title={scheduled ? 'Update data source now?' : 'Upload a product file'} onCancel={() => setDialog(null)}
      onConfirm={submitRun} confirm={running ? 'Processing…' : scheduled ? 'Run update' : 'Upload and process'} disabled={running}>
      {scheduled ? <p>Process the saved file link for {sourceName(feed)}.</p> : <Field name="source-file" title="Product file" error={fileError} hint="UTF-8 CSV or TSV, up to 1 MB." required>
        {(props) => <input {...props} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => {
          setPickedFile(event.target.files[0] ?? null)
          setFileError('')
        }} />}
      </Field>}
    </Dialog>}
    {dialog === 'remove' && <Dialog title="Remove data source?" confirm="Remove data source" danger onCancel={() => setDialog(null)}
      onConfirm={() => {
        const result = commit((current, meta) => removeFeed(current, meta, id))
        setDialog(null)
        setNotice(result.error || 'Data source removed.')
      }}><p>This removes {sourceName(feed)} and {count} active {count === 1 ? 'product' : 'products'} owned by it. Past updates remain in history.</p></Dialog>}
  </>
}

const sourceFields = [
  ['name', 'Source name'], ['method', 'Input method', feedMethods], ['type', 'Type', feedTypes],
  ['country', 'Market', Object.keys(currencies)], ['language', 'Language', languages],
]
const scheduleFields = [['frequency', 'Frequency', frequencies], ['time', 'Local time'], ['timezone', 'Timezone', timezones]]

function FeedForm({ feed, account }) {
  const { commit, setNotice } = useStore()
  const navigate = useNavigate()
  const id = feed?.id
  const returnPath = id ? feedPath(id) : listPath
  const defaults = { frequency: 'daily', time: '06:30', timezone: 'America/New_York' }
  const [draft, setDraft] = useState(() => feed
    ? { ...feed, schedule: feed.schedule ?? defaults }
    : { type: 'primary', method: 'file_upload', country: account?.defaultCountry || 'US', language: 'en', schedule: defaults })
  const [errors, setErrors] = useState({})

  function update(name, value, schedule = false) {
    setDraft((current) => schedule ? { ...current, schedule: { ...current.schedule, [name]: value } } : { ...current, [name]: value })
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function field([name, title, choices], schedule = false) {
    const value = (schedule ? draft.schedule[name] : draft[name]) ?? ''
    const options = choices && [...new Set([...choices, ...(value ? [value] : [])])]
    const onChange = (event) => update(name, event.target.value, schedule)
    return <div key={name} className={['name', 'sourceUrl'].includes(name) ? 'wide' : undefined}>
      <Field name={name} title={title} required error={errors[name]}>
        {(props) => options ? <select {...props} value={value} onChange={onChange}>
          <option value="">Choose {title.toLowerCase()}</option>{options.map((option) => <option value={option} key={option}>{name === 'timezone' ? option : label(option)}</option>)}
        </select> : <input {...props} value={value} onChange={onChange} type={name === 'time' ? 'time' : 'text'} />}
      </Field>
    </div>
  }

  function submit(event) {
    event.preventDefault()
    const result = commit((current, meta) => saveFeed(current, meta, id, draft))
    if (result.errors) {
      setErrors(result.errors)
      document.getElementById(Object.keys(result.errors)[0])?.focus()
      return
    }
    if (result.error) { setNotice(result.error); return }
    if (result.state) setNotice(id ? 'Data source saved.' : 'Data source added.')
    navigate(sidPath(feedPath(result.id)))
  }

  return <>
    <PageHeader title={id ? 'Edit data source' : 'Add data source'} breadcrumbs={[[ 'Data sources', listPath ], ...(id ? [[sourceName(feed), returnPath]] : []), [id ? 'Edit setup' : 'New source']]} />
    <form className="panel editor" noValidate onSubmit={submit}>
      <section className="editor-section"><h2>Source setup</h2><div className="form-grid">{sourceFields.map((definition) => field(definition))}</div></section>
      {draft.method === 'scheduled_fetch' && <section className="editor-section">
        <h2>Fetch schedule</h2>
        <div className="form-grid">
          {field(['sourceUrl', 'File link'])}
          <div className="wide"><button type="button" className="row-action" onClick={() => update('sourceUrl', sampleUrl)}>Use sample file link</button></div>
          {scheduleFields.map((definition) => field(definition, true))}
        </div>
      </section>}
      <div className="form-footer"><AppLink to={returnPath} className="button">Cancel</AppLink><button type="submit" className="primary">Save data source</button></div>
    </form>
  </>
}

export function FeedEditor() {
  const { state } = useStore()
  const { id } = useParams()
  const feed = id ? active(state.feeds).find((item) => item.id === id) : null
  if (id && !feed) return <Missing title="Data source unavailable" to={listPath} action="Back to data sources" />
  return <FeedForm feed={feed} account={state.account} />
}

