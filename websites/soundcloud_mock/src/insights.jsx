import { useState } from 'react'
import { Activity, BarChart3, Table2 } from 'lucide-react'
import { formatDate, newId, newest, now, records, titleOf, useFeedback, useStore } from './store'
import { Empty, ErrorMessage, Field, PageHeading, SiteLink } from './ui'

const metrics = { plays: 'Plays', likes: 'Likes', comments: 'Comments', reposts: 'Reposts', downloads: 'Downloads' }
const metricKeys = Object.keys(metrics)
const dayMs = 86400000
const dayString = (timestamp) => new Date(timestamp).toISOString().slice(0, 10)
const daysBefore = (date, days) => dayString(Date.parse(date + 'T00:00:00Z') - days * dayMs)
const validDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) && dayString(Date.parse(date)) === date
const validBounds = (start, end) => validDate(start) && validDate(end) && start <= end
const formatCount = (count) => new Intl.NumberFormat('en-US').format(count)
const metricValue = (row, metric) => Number.isFinite(row[metric]) ? row[metric] : 0

function summarize(rows, metric) {
  const totals = Object.fromEntries(metricKeys.map((key) => [key, 0]))
  const byDate = new Map()
  const byTrack = new Map()
  for (const row of rows) {
    for (const key of metricKeys) totals[key] += metricValue(row, key)
    const value = metricValue(row, metric)
    byDate.set(row.date, (byDate.get(row.date) || 0) + value)
    byTrack.set(row.trackId, (byTrack.get(row.trackId) || 0) + value)
  }
  return { totals, byDate, ranking: [...byTrack].sort((a, b) => b[1] - a[1]) }
}

function pointsFor(byDate, start, end) {
  if ((Date.parse(end) - Date.parse(start)) / dayMs >= 90) {
    return [...byDate].sort(([a], [b]) => a.localeCompare(b))
  }
  return Array.from({ length: (Date.parse(end) - Date.parse(start)) / dayMs + 1 }, (_, index) => {
    const date = daysBefore(start, -index)
    return [date, byDate.get(date) || 0]
  })
}

function ActivityChart({ points, metric }) {
  const [focused, setFocused] = useState(null)
  const max = points.reduce((largest, [, value]) => Math.max(largest, value), 1)
  const selected = points.find(([date]) => date === focused)
  return <div className="chart">
    <div className="chart-readout">{selected ? formatDate(selected[0]) + ' · ' + formatCount(selected[1]) + ' ' + metrics[metric].toLowerCase() : metrics[metric] + ' by day'}</div>
    <div className="chart-scale"><span>{formatCount(max)}</span><span>0</span></div>
    <div className="chart-viewport">
      <div className="chart-scroll">
        {points.map(([date, value]) => <button key={date} type="button"
          className="chart-point" onMouseEnter={() => setFocused(date)} onMouseLeave={() => setFocused(null)}
          onFocus={() => setFocused(date)} onBlur={() => setFocused(null)} onClick={() => setFocused(date)}
          title={formatDate(date) + ': ' + formatCount(value)} aria-label={formatDate(date) + ': ' + formatCount(value) + ' ' + metrics[metric].toLowerCase()}>
          <span style={{ height: Math.max(1, 95 * value / max) + '%' }} />
        </button>)}
      </div>
    </div>
    <div className="chart-dates"><span>{formatDate(points[0][0])}</span><span>{formatDate(points.at(-1)[0])}</span></div>
  </div>
}

export function Insights() {
  const { state, ownedTracks, userId, commit } = useStore()
  const feedback = useFeedback()
  const owned = new Map(ownedTracks.map((track) => [track.id, track]))
  const data = records(state.dailyStats).filter((row) => owned.has(row.trackId) && validDate(row.date))
  const latestDay = data.reduce((latest, row) => row.date > latest ? row.date : latest, '') || now().slice(0, 10)
  const defaults = { trackId: null, metric: 'plays', startDate: daysBefore(latestDay, 29), endDate: latestDay }
  const previous = records(state.insightViews).filter((view) =>
    view.actorId === userId && metricKeys.includes(view.metric) &&
    (view.trackId === null || owned.has(view.trackId)) && validBounds(view.startDate, view.endDate)).sort(newest)[0]
  const [applied, setApplied] = useState(previous || defaults)
  const [draft, setDraft] = useState(() => {
    const value = previous || defaults
    const period = value.endDate === latestDay && value.startDate === daysBefore(latestDay, 29) ? '30' :
      value.endDate === latestDay && value.startDate === daysBefore(latestDay, 6) ? '7' : 'custom'
    return { ...value, period }
  })
  const [mode, setMode] = useState('chart')
  const [error, setError] = useState('')
  const matches = (selection) => data.filter((row) =>
    (!selection.trackId || row.trackId === selection.trackId) && row.date >= selection.startDate && row.date <= selection.endDate)
  const rows = matches(applied)
  const { totals, byDate, ranking } = summarize(rows, applied.metric)
  const points = rows.length ? pointsFor(byDate, applied.startDate, applied.endDate) : []

  function changePeriod(period) {
    setDraft({
      ...draft, period,
      ...(period === 'custom' ? {} : { startDate: daysBefore(latestDay, Number(period) - 1), endDate: latestDay }),
    })
  }

  function apply(event) {
    event.preventDefault()
    const { trackId, metric, startDate, endDate } = draft
    if (!validBounds(startDate, endDate)) return setError('Enter valid UTC dates with the start date on or before the end date.')
    if ((trackId !== null && !owned.has(trackId)) || !metricKeys.includes(metric)) return setError('Choose a track and metric from the available options.')
    const selection = { trackId, metric, startDate, endDate }
    const result = matches(selection)
    const view = {
      id: newId('iv'), actorId: userId, ...selection, resultCount: result.length,
      metricTotal: result.reduce((total, row) => total + metricValue(row, metric), 0), createdAt: now(),
    }
    commit((current) => ({ ...current, insightViews: [...records(current.insightViews), view] }))
    setApplied(selection)
    setError('')
    feedback('Insights filters applied.')
  }

  return <>
    <PageHeading title="Insights" description="See how listeners are finding and engaging with your tracks." />
    <form className="panel insights-filters" onSubmit={apply} noValidate>
      <div className="filter-bar">
        <Field name="Track"><select value={draft.trackId || ''} onChange={(event) => setDraft({ ...draft, trackId: event.target.value || null })}>
          <option value="">All tracks</option>{ownedTracks.map((track) => <option key={track.id} value={track.id}>{titleOf(track)}</option>)}
        </select></Field>
        <Field name="Reporting period"><select value={draft.period} onChange={(event) => changePeriod(event.target.value)}>
          <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom range</option>
        </select></Field>
        <Field name="Metric"><select value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })}>
          {metricKeys.map((key) => <option key={key} value={key}>{metrics[key]}</option>)}
        </select></Field>
        <button className="button primary">Apply</button>
      </div>
      {draft.period === 'custom' && <div className="filter-bar date-inputs">
        <Field name="Start date (UTC)"><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field>
        <Field name="End date (UTC)"><input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></Field>
      </div>}
      <div className="insights-preview">
        {validBounds(draft.startDate, draft.endDate) && <span>Selected dates · {formatDate(draft.startDate)} – {formatDate(draft.endDate)} UTC</span>}
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    </form>
    <div className="applied-heading"><h2>{applied.trackId ? titleOf(owned.get(applied.trackId)) : 'All tracks'}</h2>
      <p>{formatDate(applied.startDate)} – {formatDate(applied.endDate)} UTC</p></div>
    <div className="metrics-grid">
      {metricKeys.map((metric) => <div className={'panel metric-card ' + (applied.metric === metric ? 'metric-selected' : '')} key={metric}>
        <span>{metrics[metric]}</span><strong>{formatCount(totals[metric])}</strong>
      </div>)}
    </div>
    <section className="panel padded insight-section">
      <div className="section-heading"><h2><Activity size={20} /> Recent activity</h2>
        <div className="segmented" aria-label="Activity display">
          <button className="button small" type="button" aria-pressed={mode === 'chart'} onClick={() => setMode('chart')}><BarChart3 size={16} /> Chart</button>
          <button className="button small" type="button" aria-pressed={mode === 'table'} onClick={() => setMode('table')}><Table2 size={16} /> Table</button>
        </div>
      </div>
      {points.length ? mode === 'chart' ? <ActivityChart points={points} metric={applied.metric} /> :
        <div className="table-wrap activity-table"><table><thead><tr><th>Date (UTC)</th><th>{metrics[applied.metric]}</th></tr></thead>
          <tbody>{points.map(([date, value]) => <tr key={date}><td>{date}</td><td>{formatCount(value)}</td></tr>)}</tbody>
        </table></div> : <Empty>No activity for these filters.</Empty>}
    </section>
    <section className="panel padded insight-section">
      <h2>Top tracks by {metrics[applied.metric].toLowerCase()}</h2>
      {ranking.length ? <div className="table-wrap"><table><thead><tr><th>Track</th><th>{metrics[applied.metric]}</th></tr></thead>
        <tbody>{ranking.map(([id, value]) => <tr key={id}>
          <td><SiteLink to={'/tracks/' + encodeURIComponent(id)}>{titleOf(owned.get(id))}</SiteLink></td><td>{formatCount(value)}</td>
        </tr>)}</tbody></table></div> : <Empty>No tracks to rank for this period.</Empty>}
    </section>
  </>
}
