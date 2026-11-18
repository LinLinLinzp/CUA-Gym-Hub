import { useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, CalendarDays, ClipboardList, LayoutGrid, MapPin, RotateCcw, UsersRound } from 'lucide-react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { APP, amount, checkLabel, dateLabel, draftRecords, guestLabel, optionLabel, serviceOptions, timeLabel, today } from './data/model.js'
import { saveState, withSid } from './utils/dataManager.js'
import { Back, Badge, Empty, Header, Ledger, NavLinkTo } from './ui.jsx'
import { Menus } from './pages/Menus.jsx'
import { OrderDetail, Orders } from './pages/Orders.jsx'
import { Labor } from './pages/Labor.jsx'
import { RefundDetail, Refunds } from './pages/Refunds.jsx'

const navigation = [
  ['/', 'Overview', LayoutGrid], ['/menus', 'Menus', BookOpen], ['/orders', 'Orders', ClipboardList],
  ['/labor', 'Labor', UsersRound], ['/refunds', 'Refunds', RotateCcw],
]

export function App({ initialState }) {
  const current = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState('')
  function commit(change, message) {
    const next = change(current.current)
    if (next === current.current) return
    saveState(APP, next)
    current.current = next
    setState(next)
    setNotice({ message })
  }
  const { account } = state
  const props = { state, commit }
  const initials = (account.actor.name || 'Manager').split(/\s+/).slice(0, 2).map(name => name[0]).join('')
  return <div className="workspace">
    <aside className="rail">
      <NavLinkTo className="brand" to="/">Toast<span>.</span></NavLinkTo>
      <div className="rail-location"><MapPin size={16} /> {account.name}</div>
      <nav aria-label="Main navigation">{navigation.map(([path, label, Icon]) =>
        <NavLink key={path} to={withSid(path)} end={path === '/'}><Icon size={19} aria-hidden="true" />{label}</NavLink>)}</nav>
      <div className="profile"><span className="avatar">{initials}</span><div><strong>{account.actor.name}</strong><small>{account.actor.role}</small></div></div>
    </aside>
    <div className="work-area">
      <header className="utility"><span><MapPin size={16} /> {account.name}</span><span><CalendarDays size={16} /> {dateLabel(today(account.timeZone))}</span></header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Overview state={state} />} />
          <Route path="/menus" element={<Menus {...props} />} />
          <Route path="/orders" element={<Orders {...props} />} />
          <Route path="/orders/:orderId" element={<OrderDetail {...props} />} />
          <Route path="/labor" element={<Labor {...props} />} />
          <Route path="/refunds" element={<Refunds {...props} />} />
          <Route path="/refunds/:refundId" element={<RefundDetail state={state} />} />
          <Route path="*" element={<><Back to="/">Overview</Back><Empty title="Page unavailable" /></>} />
        </Routes>
      </main>
    </div>
    <div className={notice ? 'toast' : 'status-only'} role="status" onAnimationEnd={() => setNotice('')}>{notice.message}</div>
  </div>
}

function Overview({ state }) {
  const cards = [
    ['/orders', 'Open checks', state.orders.filter(row => row.status === 'open').length, ClipboardList],
    ['/menus', 'Menu drafts', draftRecords(state).length, BookOpen],
    ['/labor', 'Clocked in', new Set(state.timeEntries.filter(row => row.status === 'open').map(row => row.employeeId)).size, UsersRound],
    ['/refunds', 'Completed refunds', state.refunds.filter(row => row.status === 'completed').length, RotateCcw],
  ]
  const recent = [...state.orders].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))).slice(0, 7)
  return <>
    <section className="hero"><Header title="Operations overview" subtitle={state.account.name} /><div className="hero-pattern" aria-hidden="true" /></section>
    <section className="summaries" aria-label="Operations summaries">
      {cards.map(([path, label, number, Icon]) => <NavLinkTo key={path} to={path} className="summary">
        <div><span className="summary-icon"><Icon size={20} /></span><ArrowUpRight size={17} /></div>
        <strong>{number}</strong><span>{label}</span>
      </NavLinkTo>)}
    </section>
    <section className="recent">
      <div className="section-heading"><h2>Recent checks</h2><NavLinkTo to="/orders">View all orders <ArrowUpRight size={15} /></NavLinkTo></div>
      <Ledger label="Recent checks" emptyTitle="No orders yet" rows={recent} columns={[
        ['Check', row => <NavLinkTo to={'/orders/' + encodeURIComponent(row.id)}>{checkLabel(row)}</NavLinkTo>],
        ['Business date', row => dateLabel(row.businessDate)],
        ['Time', row => timeLabel(row.createdAt, state.account.timeZone)],
        ['Guest', guestLabel], ['Service', row => optionLabel(serviceOptions, row.serviceType)],
        ['Status', row => <Badge value={row.status} />], ['Total', row => amount(row.totalCents)],
      ]} />
    </section>
  </>
}

