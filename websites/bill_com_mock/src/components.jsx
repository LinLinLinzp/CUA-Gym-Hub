import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { activeUser, byId, dateLabel, money, recentFirst, userName, vendorName } from './data/selectors.js'
import { useStore } from './store.jsx'
import { withSid } from './utils/dataManager.js'

const navigation = [
  ['/', 'Overview'], ['/bills', 'Bills'], ['/approvals', 'Approvals'], ['/vendors', 'Vendors'], ['/payments', 'Payments'],
]

export const recordPath = (collection, id) => `/${collection}/${encodeURIComponent(id)}`
export const methodLabel = method => ({ ach: 'ACH', check: 'Check' })[method] || '—'
export const recordNumber = bill => bill?.invoiceNumber || 'Invoice unavailable'
export const paymentNumber = payment => payment?.reference || 'Payment details'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useSiteNavigation() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Workspace() {
  const { state } = useStore()
  const user = activeUser(state)
  const initials = user?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('') || 'AP'
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return <>
    <a href="#workspace" className="skip-link">Skip to content</a>
    <header className="topbar">
      <SiteLink className="brand" to="/" aria-label="BILL home">BILL<span aria-hidden="true">.</span></SiteLink>
      <nav aria-label="Main navigation">
        {navigation.map(([path, label]) => <NavLink key={path} to={withSid(path)} end={path === '/'}>{label}</NavLink>)}
      </nav>
      <div className="identity">
        <span className="monogram" aria-hidden="true">{initials}</span>
        <div><strong>{state.account?.name || 'Accounts Payable'}</strong><span>{user?.name || 'Account user'}</span></div>
      </div>
    </header>
    <main id="workspace" className="workspace" tabIndex="-1"><Notice /><Outlet /></main>
  </>
}

const FeedbackContext = createContext(null)
export function Feedback({ children }) {
  const [notice, setNotice] = useState(null)
  const { pathname } = useLocation()
  useEffect(() => {
    setNotice(previous => previous?.path === pathname ? previous : null)
  }, [pathname])
  return <FeedbackContext.Provider value={{ notice, setNotice }}>{children}</FeedbackContext.Provider>
}
export function useFeedback() {
  const { setNotice } = useContext(FeedbackContext)
  const { pathname } = useLocation()
  return feedback => setNotice({ path: pathname, ...feedback })
}

function Notice() {
  const { notice, setNotice } = useContext(FeedbackContext)
  const { pathname } = useLocation()
  return <div className="notice-region" aria-live="polite">
    {notice?.path === pathname && <div className="notice">
      <span aria-hidden="true" className="notice-check">✓</span>
      <div><strong>{notice.message}</strong>{notice.to && <SiteLink onClick={() => setNotice(null)} to={notice.to}>{notice.label}</SiteLink>}</div>
      <button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
    </div>}
  </div>
}

export function PageTitle({ title, description, back, actions }) {
  return <>
    {back && <SiteLink className="back" to={back.to}><span aria-hidden="true">‹</span> {back.label}</SiteLink>}
    <div className="page-title">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  </>
}

export function ButtonLink({ variant = 'primary', ...props }) {
  return <SiteLink className={`button ${variant}`} {...props} />
}

export function Missing({ title, to, label }) {
  return <><PageTitle title={title} /><section className="panel empty">
    <p>This record may be unavailable in this workspace.</p><ButtonLink variant="secondary" to={to}>{label}</ButtonLink>
  </section></>
}

const statuses = {
  draft: 'Draft', pending: 'Pending approval', approved: 'Approved', denied: 'Denied',
  unpaid: 'Unpaid', scheduled: 'Scheduled', processing: 'Processing', paid: 'Paid', cancelled: 'Cancelled',
}
export const statusLabel = status => Object.hasOwn(statuses, status) ? statuses[status] : 'Unknown status'
export function Status({ value }) {
  const appearance = Object.hasOwn(statuses, value) ? value : 'unknown'
  return <span className={`status ${appearance}`}>{statusLabel(value)}</span>
}

export function Field({ label, error, children, hint }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined })}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small className="error" id={`${id}-error`}>{error}</small>}
  </div>
}

export function SearchField({ label = 'Search', value, onChange, placeholder }) {
  return <Field label={label}>{props => <div className="search-wrap">
    <span aria-hidden="true" className="search-icon" />
    <input {...props} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    {value && <button type="button" className="icon-button clear-search" aria-label="Clear search" onClick={() => {
      document.getElementById(props.id)?.focus()
      onChange('')
    }}>×</button>}
  </div>}</Field>
}

export function Empty({ children }) {
  return <div className="empty"><p>{children}</p></div>
}

export function DataTable({ label, columns, records, render, empty, rowPath, footer }) {
  const navigate = useSiteNavigation()
  return <div className="ledger">
    <div className="table-scroll" role="region" aria-label={label} tabIndex="0">
      <table aria-label={label}>
        <thead><tr>{columns.map(column => <th key={column.key || column.label} scope="col"
          className={column.numeric ? 'numeric' : undefined} aria-sort={column.sortState}>
          {column.content ?? column.label}
        </th>)}</tr></thead>
        <tbody>
          {records.map(record => <tr key={record.id} className={rowPath ? 'linked-row' : undefined}
            onClick={rowPath ? event => {
              if (!event.target.closest('a, button, input, label') && !window.getSelection()?.toString()) navigate(rowPath(record))
            } : undefined}>{render(record)}</tr>)}
          {!records.length && <tr><td colSpan={columns.length}><Empty>{empty}</Empty></td></tr>}
        </tbody>
      </table>
    </div>
    {footer}
  </div>
}

export function DefinitionList({ entries }) {
  return <dl className="definitions">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

const eventLabels = {
  bill_created: 'Bill created', bill_updated: 'Bill updated', approval_submitted: 'Sent for approval',
  approval_approved: 'Bill approved', approval_denied: 'Bill denied', payment_scheduled: 'Payment scheduled',
  payment_cancelled: 'Payment cancelled',
}

export function ActivityTable({ records, overview = false }) {
  const { state } = useStore()
  const columns = [{ label: 'Activity' }, ...(overview ? [{ label: 'Vendor' }, { label: 'Invoice #' }] : []),
    { label: 'By' }, { label: 'Date' }, ...(overview ? [{ label: 'Amount (USD)', numeric: true }] : [])]
  return <DataTable label={overview ? 'Recent activity' : 'Activity'} columns={columns}
    records={[...records].sort(recentFirst)} empty="No activity to show." render={event => {
      const bill = byId(state.bills, event.billId)
      const payment = byId(state.payments, event.paymentId)
      const target = payment ? recordPath('payments', payment.id) : bill && recordPath('bills', bill.id)
      const label = eventLabels[event.type] || 'Account activity'
      return <>
        <td>{overview && target ? <SiteLink to={target} className="table-link">{label}</SiteLink> : <strong>{label}</strong>}</td>
        {overview && <><td>{vendorName(state, event.vendorId)}</td>
          <td>{bill ? <SiteLink to={recordPath('bills', bill.id)}>{recordNumber(bill)}</SiteLink> : '—'}</td></>}
        <td>{userName(state, event.actorId)}</td><td>{dateLabel(event.createdAt)}</td>
        {overview && <td className="numeric">{money(event.amount)}</td>}
      </>
    }} />
}

export function Dialog({ title, onClose, children }) {
  const heading = useId()
  const dialog = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const element = dialog.current
    element.showModal()
    return () => {
      element.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  return <dialog ref={dialog} aria-labelledby={heading} onCancel={event => {
    event.preventDefault()
    onClose()
  }}>
    <div className="dialog-head"><h2 id={heading}>{title}</h2>
      <button type="button" className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}>×</button></div>
    {children}
  </dialog>
}
