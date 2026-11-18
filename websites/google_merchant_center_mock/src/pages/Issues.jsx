import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { rows, useStore } from '../store.jsx'
import { fixField } from '../data/records.js'
import { reviewReasons, submitReview } from '../data/issues.js'
import {
  AppLink, DateText, Dialog, Empty, Facts, Field, Filter, Missing, PageHeader, Pagination, Search, Status,
  feedPath, filterOptions, issuePath, label, matchesText, newest, productPath, useFilters, usePage,
} from '../ui.jsx'

const listPath = '/issues'
const issueFilters = ['q', 'severity', 'status', 'country', 'code']
const knownStatuses = ['open', 'under_review', 'resolved']
const impactOptions = ['error', 'warning']
const issueLabel = (issue) => issue.title || (issue.code ? label(issue.code) : 'Untitled issue')

function related(issue, products, feeds) {
  const product = products.get(issue.productId)
  const feed = feeds.get(issue.feedId)
  if (product) return { title: product.title || product.offerId || 'Untitled product', path: productPath(product.id), caption: product.offerId }
  if (issue.productId) return { title: 'Unavailable product', caption: issue.productId }
  if (feed) return { title: feed.name || 'Unnamed source', path: feedPath(feed.id) }
  if (issue.feedId) return { title: 'Unavailable source', caption: issue.feedId }
  return { title: issue.scope === 'account' ? 'Account' : '—' }
}

function csvCell(value) {
  let escaped = String(value ?? '')
  if (/^(?:\s*[=+\-@＝＋－＠]|[\t\r\n])/.test(escaped)) escaped = "'" + escaped
  return '"' + escaped.replaceAll('"', '""') + '"'
}

function exportIssues(issues, products) {
  const lines = [['Issue code', 'Impact', 'Status', 'Market', 'Offer ID', 'Source ID'],
    ...issues.map((issue) => [issue.code, issue.severity, issue.status, issue.country, products.get(issue.productId)?.offerId, issue.feedId])]
  const url = URL.createObjectURL(new Blob([lines.map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'merchant-issues.csv'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function IssueList() {
  const { state } = useStore()
  const { filters, change, clear, filtered } = useFilters(issueFilters)
  const issues = rows(state.issues)
  const products = new Map(rows(state.products).map((item) => [item.id, item]))
  const feeds = new Map(rows(state.feeds).map((item) => [item.id, item]))
  const results = issues.filter((issue) => {
    const record = related(issue, products, feeds)
    return matchesText(filters.q, issue.title, issue.code, issue.description, record.title, record.caption)
      && issueFilters.slice(1).every((key) => !filters[key] || issue[key] === filters[key])
  }).sort((a, b) => knownStatuses.indexOf(a.status) - knownStatuses.indexOf(b.status) || newest(a, b))
  const page = usePage(results, JSON.stringify(filters))
  const overview = [['Open issues', 'status', 'open'], ['Errors', 'severity', 'error'], ['Warnings', 'severity', 'warning']]
  return <>
    <PageHeader title="Needs attention" description="Diagnose listing and source problems, correct catalog data, and track review requests."
      actions={<button type="button" disabled={!results.length} onClick={() => exportIssues(results, products)}>Export CSV</button>} />
    <div className="metrics">
      {overview.map(([name, key, value]) => <button key={value} type="button" className="panel metric" aria-pressed={filters[key] === value} onClick={() => change(key)(filters[key] === value ? '' : value)}>
        <span>{name}</span><strong>{issues.filter((issue) => issue[key] === value).length}</strong>
      </button>)}
    </div>
    <section className="panel" aria-label="Issue records">
      <div className="filters">
        <Search title="Search issues" placeholder="Issue, product, or source" name="q" value={filters.q} onChange={change('q')} />
        <Filter title="Impact" value={filters.severity} options={impactOptions} onChange={change('severity')} />
        <Filter title="Status" value={filters.status} options={knownStatuses} onChange={change('status')} />
        <Filter title="Market" value={filters.country} options={filterOptions(issues, 'country')} onChange={change('country')} />
        <Filter title="Issue type" value={filters.code} options={filterOptions(issues, 'code')} onChange={change('code')} />
        {filtered && <button type="button" onClick={clear}>Clear filters</button>}
      </div>
      {page.total > 0 ? <div className="table-body" tabIndex={0} aria-label="Issue results">
        <table aria-label="Issues">
          <thead><tr><th scope="col">Issue</th><th scope="col">Impact</th><th scope="col">Status</th><th scope="col">Market</th><th scope="col">Affected record</th></tr></thead>
          <tbody>{page.items.map((issue) => {
            const record = related(issue, products, feeds)
            return <tr key={issue.id}>
              <td><AppLink to={issuePath(issue.id)}>{issueLabel(issue)}</AppLink></td>
              <td><Status value={issue.severity} /></td><td><Status value={issue.status} /></td><td>{label(issue.country)}</td>
              <td>{record.path ? <AppLink to={record.path}>{record.title}</AppLink> : record.title}
                {record.caption && <small className="subline identifier">{record.caption}</small>}</td>
            </tr>
          })}</tbody>
        </table>
      </div> : filtered ? <Empty title="No matching issues" description="Try another search or clear the filters." /> : <Empty title="No issues to display" />}
      <Pagination page={page} />
    </section>
  </>
}

const fieldNames = { gtin: 'GTIN', imageLink: 'Image URL', price: 'Price', availability: 'Availability' }

function ReviewDialog({ issue, reason, close }) {
  const { commit, setNotice } = useStore()
  const [acknowledged, setAcknowledged] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState(null)
  const disagree = reason === 'disagree'
  function submit() {
    const result = commit((state, meta) => submitReview(state, meta, issue.id, { reason, acknowledged, explanation }))
    if (result.error) {
      setError(result)
      document.getElementById(result.field)?.focus()
      return
    }
    close()
    setNotice('Review request submitted.')
  }
  return <Dialog title={label(reason)} onCancel={close} onConfirm={submit} confirm="Submit request">
    <p>{issueLabel(issue)}</p>
    {disagree ? <Field name="explanation" title="Why do you disagree?" error={error?.error} required>
      {(props) => <textarea {...props} value={explanation} onChange={(event) => { setExplanation(event.target.value); setError(null) }} />}
    </Field> : <>
      <label className="checkline" htmlFor="acknowledged"><input id="acknowledged" type="checkbox" checked={acknowledged}
        aria-invalid={error ? true : undefined} aria-describedby={error ? 'ack-error' : undefined}
        onChange={(event) => { setAcknowledged(event.target.checked); setError(null) }} />I confirm that I’ve addressed the reported issue.</label>
      {error && <span className="field-error" id="ack-error">{error.error}</span>}
    </>}
  </Dialog>
}

export function IssueDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const [reason, setReason] = useState(null)
  const issue = rows(state.issues).find((item) => item.id === id)
  if (!issue) return <Missing title="Issue not found" to={listPath} action="Back to needs attention" />
  const product = rows(state.products).find((item) => item.id === issue.productId)
  const feed = rows(state.feeds).find((item) => item.id === issue.feedId)
  const review = rows(state.issueReviews).find((item) => item.id === issue.latestReviewId && item.issueId === id)
  const field = fixField(issue.code)
  const options = issue.status === 'open' && Array.isArray(issue.reviewOptions) ? reviewReasons.filter((item) => issue.reviewOptions.includes(item)) : []
  const name = issueLabel(issue)
  const observed = issue.observedValue === '' ? 'Blank' : issue.observedValue
  return <>
    <PageHeader title={name} description={label(issue.country) + ' · ' + label(issue.scope)} breadcrumbs={[[ 'Needs attention', listPath ], [name]]}
      actions={issue.status === 'open' && field && product && !product.deletedAt
        ? <AppLink to={productPath(product.id) + '/edit?field=' + field} className="button primary">Fix in product editor</AppLink> : undefined} />
    <div className="workspace-grid">
      <div className="stack">
        <section className="panel">
          <div className="panel-heading"><h2>Issue details</h2><Status value={issue.status} /></div>
          <div className="content detail-section">
            <p className="detail-copy">{issue.description || 'No additional description is available.'}</p>
            <h3>How to address this issue</h3>
            <p className="detail-copy">{issue.remediation || 'Inspect the affected listing or source details.'}</p>
            <div className="review-options">
              {options.map((option) => <button key={option} type="button" onClick={() => setReason(option)}>{label(option)}</button>)}
            </div>
          </div>
        </section>
        {(issue.status === 'under_review' || review) && <section className="panel">
          <div className="panel-heading"><h2>Review request</h2><Status value={review?.status || issue.status} /></div>
          <div className="content">
            {review ? <Facts entries={[
              ['Request', label(review.reason)], ['Submitted', <DateText value={review.createdAt} />],
              ...(review.explanation ? [['Explanation', review.explanation]] : []),
            ]} /> : <p className="detail-copy">This issue is under review.</p>}
          </div>
        </section>}
      </div>
      <section className="panel">
        <div className="panel-heading"><h2>Affected records</h2><Status value={issue.severity} /></div>
        <div className="content"><Facts entries={[
          ['Market', label(issue.country)],
          ['Product', product ? <AppLink to={productPath(product.id)}>{product.title || product.offerId || 'Untitled product'}</AppLink> : issue.productId ? 'Unavailable product' : '—'],
          ['Data source', feed ? <AppLink to={feedPath(feed.id)}>{feed.name || 'Unnamed source'}</AppLink> : issue.feedId ? 'Unavailable source' : '—'],
          ...(issue.field ? [['Field', fieldNames[issue.field] || label(issue.field)]] : []),
          ...(observed != null ? [['Observed value', String(observed)]] : []),
          ...(issue.resolution ? [['Resolution', label(issue.resolution)], ['Resolved on', <DateText value={issue.resolvedAt} />]] : []),
        ]} /></div>
      </section>
    </div>
    {reason && <ReviewDialog issue={issue} reason={reason} close={() => setReason(null)} />}
  </>
}

