import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { Cover, Empty, Icon, Missing, PageHeading, Pagination, SectionTitle, Select, StudioLink, Trend, usePagination } from '../components/ui.jsx'
import { accountMetrics, actor, dateKey, dateLabel, formatNumber, items, newId, number, postMetrics } from '../utils/view.js'
import { dateRange, downloadCsv, inRange, isoDay, totalsFor, validDay } from '../utils/reporting.js'

const rangeNames = { latest: 'Latest available', week: 'Last 7 days', month: 'Last 28 days', custom: 'Custom' }
const dateOptions = { timeZone: 'UTC' }
const rangeLabel = ({ startDate, endDate }) => `${dateLabel(startDate, dateOptions)} – ${dateLabel(endDate, dateOptions)}`
const reportPath = (postId) => postId ? `/analytics/posts/${encodeURIComponent(postId)}` : '/analytics'

function MetricStrip({ metrics, metric, setMetric, totals }) {
  return <div className="metric-strip" style={{ '--metric-count': Object.keys(metrics).length }}>
    {Object.entries(metrics).map(([key, label]) => setMetric
      ? <button key={key} type="button" className="metric-tile" aria-pressed={metric === key} onClick={() => setMetric(key)}><span>{label}</span><strong>{formatNumber(totals[key])}</strong></button>
      : <div key={key} className="metric-tile"><span>{label}</span><strong>{formatNumber(totals[key])}</strong></div>)}
  </div>
}

function Ranking({ posts, samples, range, valid }) {
  const byPost = new Map()
  for (const sample of samples) {
    if (!valid || !sample.postId || !inRange(sample, range)) continue
    byPost.set(sample.postId, (byPost.get(sample.postId) || 0) + number(sample.views))
  }
  const ranked = posts.filter((post) => byPost.has(post.id)).sort((left, right) => byPost.get(right.id) - byPost.get(left.id))
  const pagination = usePagination(ranked, range.startDate + range.endDate, 10)
  return <section className="card">
    <SectionTitle title="Top posts by views" />
    {ranked.length ? <ol className="ranking" start={(pagination.page - 1) * pagination.pageSize + 1}>{pagination.rows.map((post) => <li key={post.id}>
      <div className="ranking-content"><Cover className="mini-cover" url={post.coverUrl} /><StudioLink className="row-title" to={`${reportPath(post.id)}?start=${range.startDate}&end=${range.endDate}`}>{post.caption || 'Untitled post'}</StudioLink>
        <strong>{formatNumber(byPost.get(post.id))}<span className="meta"> views</span></strong>
      </div>
    </li>)}</ol> : <Empty title="No ranked posts in this date range" icon="analytics">Published posts with recorded views will appear here.</Empty>}
    <Pagination {...pagination} noun="posts" />
  </section>
}

function SavedReports({ reports }) {
  const records = [...reports].sort((a, b) => dateKey(b.createdAt).localeCompare(dateKey(a.createdAt)))
  const pagination = usePagination(records, 'reports', 8)
  return <section className="card">
    <SectionTitle title="Saved reports" />
    {records.length ? <ul className="saved-reports">{pagination.rows.map((report) => {
      const path = reportPath(report.postId)
      const name = (report.scope === 'post' ? postMetrics : accountMetrics)[report.metric] || 'Analytics'
      return <li key={report.id}>
        <div><strong>{report.scope === 'post' ? 'Post report' : 'Account report'} · {name}</strong><span className="meta">{rangeLabel(report)} · {report.status === 'exported' ? 'CSV export' : 'Snapshot'}</span></div>
        <StudioLink to={`${path}?report=${encodeURIComponent(report.id)}`} className="button">Open report</StudioLink>
      </li>
    })}</ul> : <Empty title="No saved reports" icon="analytics">Save a report or export CSV to keep a record of this selection.</Empty>}
    <Pagination {...pagination} noun="reports" />
  </section>
}

function AnalyticsSelection({ post, isPost, reports, snapshot, defaultRange, defaultMetric }) {
  const { state, commit, notify } = useStudio()
  const [params] = useSearchParams()
  const postId = post?.id ?? snapshot?.postId ?? null
  const metrics = isPost ? postMetrics : accountMetrics
  const keys = Object.keys(metrics)
  const [preset, setPreset] = useState(defaultRange ? 'custom' : 'latest')
  const [custom, setCustom] = useState(defaultRange)
  const [metric, setMetric] = useState(keys.includes(defaultMetric) ? defaultMetric : 'views')
  const samples = items(state.analyticsSamples).filter((sample) => validDay(sample.date))
  const scopeRows = samples.filter((sample) => isPost ? sample.postId === postId : sample.postId == null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const today = isoDay(new Date())
  const latest = scopeRows.at(-1)?.date || today
  const defaultDates = dateRange(preset === 'latest' || preset === 'custom' ? latest : today, preset === 'week' ? 7 : 28)
  const range = preset === 'custom' ? custom || defaultDates : defaultDates
  const rangeValid = validDay(range.startDate) && validDay(range.endDate) && range.startDate <= range.endDate
  const periodRows = rangeValid ? scopeRows.filter((row) => inRange(row, range)) : []
  const totals = totalsFor(periodRows, keys)
  const sameScopeReports = isPost ? reports.filter((report) => report.postId === postId) : reports
  const published = items(state.posts).filter((entry) => entry.status === 'published')

  function recordReport(format) {
    if (!rangeValid || snapshot) return
    const createdAt = new Date().toISOString()
    const csv = format === 'csv'
    if (csv) {
      try {
        downloadCsv(periodRows, metrics, `tiktok-studio-${postId ? 'post' : 'account'}-${range.startDate}-${range.endDate}.csv`)
      } catch {
        notify('CSV could not be downloaded. Try exporting again.')
        return
      }
    }
    commit((current) => {
      const report = {
        id: newId('report'), actorId: actor(current), createdAt, scope: isPost ? 'post' : 'account', postId,
        startDate: range.startDate, endDate: range.endDate, metric, totals, sampleCount: periodRows.length,
        format, status: csv ? 'exported' : 'saved',
      }
      return { ...current, analyticsReports: [...(current.analyticsReports || []), report] }
    })
    notify(csv ? 'CSV exported.' : 'Report saved.')
  }

  const title = snapshot ? 'Saved report' : isPost ? 'Post analytics' : 'Analytics'
  const description = snapshot ? rangeLabel(snapshot) : isPost ? post?.caption || 'Untitled post' : 'See how your videos and account performed over time.'
  const back = snapshot ? { to: reportPath(postId), label: 'Back to analytics' } : isPost ? { to: '/analytics', label: 'Back to Analytics' } : undefined
  return <>
    <PageHeading title={title} description={description} back={back}>
      {snapshot ? (post || !isPost) && <StudioLink className="button primary" to={`${reportPath(postId)}?start=${encodeURIComponent(snapshot.startDate)}&end=${encodeURIComponent(snapshot.endDate)}&metric=${encodeURIComponent(snapshot.metric)}`}>View current chart</StudioLink> : <>
        <button type="button" onClick={() => recordReport('snapshot')} disabled={!rangeValid}>Save report</button>
        <button type="button" className="button primary" onClick={() => recordReport('csv')} disabled={!rangeValid}><Icon name="upload" />Export CSV</button>
      </>}
    </PageHeading>
    {snapshot ? <section className="card snapshot">
      <SectionTitle title={snapshot.status === 'exported' ? 'Exported totals' : 'Saved totals'} />
      <p className="meta">{metrics[snapshot.metric] || 'Metric unavailable'} · {formatNumber(snapshot.sampleCount)} samples · {dateLabel(snapshot.createdAt)}</p>
      <MetricStrip metrics={metrics} totals={snapshot.totals || {}} />
    </section> : <>
      <section className="card range-controls" aria-label="Report date range">
        <div className="toolbar">
          <Select label="Date range" value={preset} onChange={(value) => {
            if (value === 'custom' && !custom) setCustom(range)
            setPreset(value)
          }}>{Object.entries(rangeNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          {preset === 'custom' && <>
            <label className="field compact"><span>Start date</span><input type="date" value={range.startDate} onChange={(event) => setCustom({ ...range, startDate: event.target.value })} /></label>
            <label className="field compact"><span>End date</span><input type="date" value={range.endDate} onChange={(event) => setCustom({ ...range, endDate: event.target.value })} /></label>
          </>}
          {rangeValid && <span className="range-label meta"><Icon name="calendar" size={16} />{rangeLabel(range)}</span>}
        </div>
        {!rangeValid && <p className="error" role="alert">Enter valid dates with the start date on or before the end date.</p>}
      </section>
      <MetricStrip metrics={metrics} metric={metric} setMetric={setMetric} totals={totals} />
      <section className="card analytics-panel"><SectionTitle title={`${metrics[metric]} over time`} />
        {rangeValid ? <Trend rows={periodRows} metric={metric} label={metrics[metric]} /> : <Empty title="Select a valid date range" icon="analytics" />}
      </section>
      {isPost && post && <section className="card analytics-panel"><SectionTitle title="Lifetime metrics" /><MetricStrip metrics={postMetrics} totals={post.metrics || {}} /></section>}
      <div className="analytics-panel">
        {!isPost && <Ranking posts={published} samples={samples} range={range} valid={rangeValid} />}
      </div>
    </>}
    {!snapshot && <div className="analytics-panel"><SavedReports reports={sameScopeReports} /></div>}
    {params.has('report') && !snapshot && <p className="error analytics-panel" role="status">The requested report could not be found.</p>}
  </>
}

export default function Analytics() {
  const { state } = useStudio()
  const { postId } = useParams()
  const [params] = useSearchParams()
  const posts = items(state.posts)
  const post = postId ? posts.find((entry) => entry.id === postId && entry.status === 'published') : null
  const reports = items(state.analyticsReports)
  const reportId = params.get('report')
  const snapshot = reportId && reports.find((report) => report.id === reportId && (postId ? report.scope === 'post' && report.postId === postId : report.scope === 'account'))
  if (postId && !post && !snapshot) return <Missing title="Post analytics unavailable" to="/analytics" link="Back to Analytics" />
  const startDate = params.get('start')
  const endDate = params.get('end')
  const defaultRange = validDay(startDate) && validDay(endDate) ? { startDate, endDate } : null
  return <AnalyticsSelection key={JSON.stringify([postId, reportId, startDate, endDate, params.get('metric')])}
    post={post} isPost={Boolean(postId)} reports={reports} snapshot={snapshot} defaultRange={defaultRange} defaultMetric={params.get('metric')} />
}
