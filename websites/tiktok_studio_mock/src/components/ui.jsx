import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from '../utils/dataManager.js'
import { dateLabel, localUrl } from '../utils/view.js'

function sessionPath(to, search) {
  const params = new URLSearchParams(search)
  const sid = params.get('sid') || getSessionId()
  if (!sid) return to
  return `${to}${to.includes('?') ? '&' : '?'}sid=${encodeURIComponent(sid)}`
}

export function StudioLink({ to, nav, ...props }) {
  const { search } = useLocation()
  const Component = nav ? NavLink : Link
  return <Component to={sessionPath(to, search)} {...props} />
}

export function useStudioNavigate() {
  const navigate = useNavigate()
  const { search } = useLocation()
  return (to, options) => navigate(sessionPath(to, search), options)
}

const paths = {
  overview: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3Z',
  posts: 'M5 3h14v18H5z M10 8l5 4-5 4z',
  drafts: 'M5 21h14V8l-5-5H5z M14 3v5h5 M8 12h8 M8 16h6',
  comments: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l1.8-3.2A8.5 8.5 0 1 1 21 11.5Z M8 11h8 M8 14h5',
  analytics: 'M4 4v16h17 M8 15l4-5 4 2 5-6',
  plus: 'M12 5v14 M5 12h14',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  back: 'M20 12H5m6 6-6-6 6-6',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM16 16l4 4',
  heart: 'M12 20.5 4.6 13a4.7 4.7 0 0 1 6.7-6.6l.7.8.7-.8a4.7 4.7 0 0 1 6.7 6.6Z',
  upload: 'M12 15V4 M8 8l4-4 4 4 M4 14v6h16v-6',
  more: 'M4 12h.01 M12 12h.01 M20 12h.01',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 4v4 M16 4v4',
}

export function Icon({ name, size = 18, filled = false }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
}

export function PageHeading({ title, description, children, back }) {
  return <div className="page-heading">
    <div>{back && <StudioLink to={back.to} className="back-link"><Icon name="back" size={16} />{back.label}</StudioLink>}
      <h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="heading-actions">{children}</div>}
  </div>
}

export function SectionTitle({ title, to, link }) {
  return <div className="section-title"><h2>{title}</h2>{to && <StudioLink to={to} className="text-link">{link}<Icon name="arrow" size={16} /></StudioLink>}</div>
}

export function Empty({ title, children, icon = 'posts' }) {
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={22} /></span><strong>{title}</strong>{children && <p>{children}</p>}</div>
}

export function Cover({ url, className = '' }) {
  const src = localUrl(url)
  const [broken, setBroken] = useState(null)
  return <span className={`cover ${className}`}>
    {src && broken !== src ? <img src={src} alt="" loading="lazy" onError={() => setBroken(src)} /> : <Icon name="posts" size={20} />}
  </span>
}

export function Status({ status }) {
  const names = { published: 'Published', scheduled: 'Scheduled', draft: 'Draft' }
  return <span className={`status status-${names[status] ? status : 'default'}`}><i />{names[status] || 'Unknown'}</span>
}

export function Search({ label, value, onChange, placeholder }) {
  return <label className="search"><span className="sr-only">{label}</span><Icon name="search" /><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>
}

export function Select({ label, value, onChange, disabled, children }) {
  const labelId = useId()
  return <label className="field compact"><span id={labelId}>{label}</span><select aria-labelledby={labelId} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{children}</select></label>
}

export function usePagination(records, identity, pageSize = 12) {
  const [cursor, setCursor] = useState({ identity, page: 1 })
  const pages = Math.max(1, Math.ceil(records.length / pageSize))
  const page = Math.min(pages, cursor.identity === identity ? cursor.page : 1)
  return {
    rows: records.slice((page - 1) * pageSize, page * pageSize), page, pages,
    setPage: (next) => setCursor({ identity, page: next }), pageSize, count: records.length,
  }
}

export function Pagination({ page, pages, setPage, pageSize, count, noun }) {
  if (!count) return null
  return <div className="pagination"><span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} of {count} {noun}</span>
    {pages > 1 && <div><button type="button" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button><span>Page {page} of {pages}</span><button type="button" onClick={() => setPage(page + 1)} disabled={page === pages}>Next</button></div>}
  </div>
}

export function ConfirmDialog({ title, children, action, close, confirm }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close() }} aria-labelledby="confirmation-title">
    <h2 id="confirmation-title">{title}</h2><p>{children}</p>
    <div className="dialog-actions"><button type="button" autoFocus onClick={close}>Cancel</button><button type="button" className="button destructive" onClick={confirm}>{action}</button></div>
  </dialog>
}

export function Missing({ title = 'Page unavailable', to = '/', link = 'Back to Overview' }) {
  return <><PageHeading title={title} /><div className="card"><Empty title="This item could not be opened."><StudioLink className="text-link" to={to}>{link}<Icon name="arrow" size={16} /></StudioLink></Empty></div></>
}

export function Trend({ rows, metric, label, compact = false }) {
  const aggregates = new Map()
  for (const { date, ...metrics } of rows) {
    const value = Number(metrics[metric]) || 0
    aggregates.set(date, (aggregates.get(date) || 0) + value)
  }
  const points = Array.from(aggregates).sort(([left], [right]) => left.localeCompare(right))
  const [activeDate, setActiveDate] = useState(null)
  if (!points.length || points.every(([, value]) => value === 0)) return <Empty title={points.length ? `No ${label.toLowerCase()} recorded` : 'No data in this date range'} icon="analytics">Try another metric or choose a different period.</Empty>
  const high = Math.max(1, ...points.map(([, value]) => value))
  const low = Math.min(0, ...points.map(([, value]) => value))
  const plot = { width: 720, height: compact ? 160 : 230, left: 53, right: 702, top: 12, bottom: compact ? 130 : 199 }
  const firstDay = Date.parse(points[0][0])
  const elapsed = Date.parse(points.at(-1)[0]) - firstDay
  const x = (date) => elapsed ? plot.left + (Date.parse(date) - firstDay) / elapsed * (plot.right - plot.left) : (plot.left + plot.right) / 2
  const y = (value) => plot.top + (high - value) / (high - low) * (plot.bottom - plot.top)
  const line = points.map(([date, value]) => `${x(date)},${y(value)}`).join(' ')
  const selected = points.find(([date]) => date === activeDate) || points.at(-1)
  const ticks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  return <div className="trend">
    <svg viewBox={`0 0 ${plot.width} ${plot.height}`} role="img" aria-label={`${label} trend. Data values follow the chart.`}>
      {[0, 1, 2, 3].map((index) => {
        const value = high - (high - low) * index / 3
        return <g key={index}><line className="chart-grid" x1={plot.left} x2={plot.right} y1={y(value)} y2={y(value)} /><text x={plot.left - 9} y={y(value) + 4} textAnchor="end">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(value))}</text></g>
      })}
      {points.length > 1 && <polygon className="chart-fill" points={`${x(points[0][0])},${y(0)} ${line} ${x(points.at(-1)[0])},${y(0)}`} />}
      <polyline className="chart-line" points={line} />
      {points.map(([date, value]) => <circle key={date} cx={x(date)} cy={y(value)} r={date === selected[0] ? 5 : 2.5} className={date === selected[0] ? 'chart-selected' : 'chart-dot'} />)}
      {points.map(([date], index) => <circle key={date} cx={x(date)} cy={y(points[index][1])} r="12" fill="transparent" onPointerEnter={() => setActiveDate(date)} />)}
      {ticks.map((index) => <text key={index} x={x(points[index][0])} y={plot.bottom + 22} textAnchor={index === 0 && points.length > 1 ? 'start' : index === points.length - 1 && points.length > 1 ? 'end' : 'middle'}>{dateLabel(points[index][0], { year: undefined, timeZone: 'UTC' })}</text>)}
    </svg>
    {!compact && <div className="chart-footer"><span aria-live="polite">{dateLabel(selected[0], { timeZone: 'UTC' })} · <strong>{selected[1].toLocaleString('en-US')}</strong> {label.toLowerCase()}</span>
      <details><summary>View chart data</summary><table><thead><tr><th>Date</th><th>{label}</th></tr></thead><tbody>{points.map(([date, value]) => <tr key={date}><td>{date}</td><td>{value.toLocaleString('en-US')}</td></tr>)}</tbody></table></details></div>}
    {compact && <details className="overview-chart-data"><summary>View chart data</summary><table><thead><tr><th>Date</th><th>{label}</th></tr></thead><tbody>{points.map(([date, value]) => <tr key={date}><td>{date}</td><td>{value.toLocaleString('en-US')}</td></tr>)}</tbody></table></details>}
  </div>
}
