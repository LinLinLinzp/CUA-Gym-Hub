import { useRef, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { active, AppLink, Badge, display, Empty, formatDate, Icon, label, Missing, Page, RailLink, routeId, rows, statuses, Table, useRouteFocus } from './ui.jsx'
import { useWorkspace } from './store.jsx'
import { ActiveNumbers, BuyNumber, NumberDetail } from './pages/Numbers.jsx'
import { SendSms, ServiceDetail, Services } from './pages/Messaging.jsx'
import { LogDetail, Logs } from './pages/Logs.jsx'

const groups = [
  ['Phone Numbers', [['Active Numbers', '/numbers', 'numbers', true], ['Buy a Number', '/numbers/buy', 'buy', true]]],
  ['Messaging', [['Messaging Services', '/messaging/services', 'services'], ['Send an SMS', '/messaging/send', 'send', true]]],
  ['Monitor', [['Messaging Logs', '/logs/messaging', 'logs']]],
]

function Rail({ close }) {
  return <nav aria-label="Workspace" className="rail-nav">
    <RailLink to="/" end onClick={close}><Icon name="overview" />Overview</RailLink>
    {groups.map(([title, links]) => <div className="nav-group" key={title}>
      <h2>{title}</h2>
      {links.map(([name, path, icon, end]) => <RailLink key={path} to={path} end={end} onClick={close}><Icon name={icon} />{name}</RailLink>)}
    </div>)}
  </nav>
}

function Shell({ account, children }) {
  const [menu, setMenu] = useState(false)
  const main = useRef(null)
  const menuButton = useRef(null)
  useRouteFocus(main)
  const initials = (account?.operator?.name?.trim() || 'Operator').split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase()
  function closeOnEscape(event) {
    if (event.key !== 'Escape' || !menu || event.defaultPrevented) return
    setMenu(false)
    menuButton.current?.focus()
  }
  return <>
    <button className="skip" type="button" onClick={() => main.current?.focus()}>Skip to content</button>
    <header className="header" onKeyDown={closeOnEscape}>
      <div className="brand">
        <button ref={menuButton} type="button" className="icon-button mobile-menu" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-controls="workspace-rail" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="menu" /></button>
        <AppLink to="/" className="wordmark" onClick={() => setMenu(false)}>Twilio</AppLink><span className="brand-divider" /><span className="brand-product">Console</span>
      </div>
      <div className="account"><span>{account?.name || 'Account'}</span><span className="avatar" title={account?.operator?.name || 'Operator'}>{initials}</span></div>
    </header>
    <div className="workspace" onKeyDown={closeOnEscape}>
      <aside id="workspace-rail" className={menu ? 'rail open' : 'rail'}><Rail close={() => setMenu(false)} /></aside>
      <main id="content" ref={main} tabIndex={-1}><div className="content">{children}</div></main>
    </div>
  </>
}

function Overview({ state }) {
  const messages = rows(state.messages)
  const recent = [...messages].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, 6)
  const metrics = [
    ['Active numbers', rows(state.phoneNumbers).filter(active).length, '/numbers', 'numbers'],
    ['Messaging services', rows(state.messagingServices).length, '/messaging/services', 'services'],
    ['Messages in logs', messages.length, '/logs/messaging', 'logs'],
  ]
  const counts = [...new Set([...statuses, ...messages.map((message) => message.status).filter(Boolean)])]
    .map((status) => [status, messages.filter((message) => message.status === status).length])
  const peak = Math.max(1, ...counts.map(([, count]) => count))
  return <Page title="Overview" description={state.account?.name || 'Account workspace'} action={<AppLink className="button primary" to="/messaging/send"><Icon name="send" size={17} />Send an SMS</AppLink>}>
    <section className="metrics" aria-label="Account totals">
      {metrics.map(([item, count, to, icon]) => <AppLink className="panel metric" key={item} to={to}>
        <span className="metric-label"><span className="metric-icon"><Icon name={icon} /></span>{item}</span>
        <strong>{count}</strong><Icon name="arrow" size={17} />
      </AppLink>)}
    </section>
    <div className="overview-grid">
      <section className="panel">
        <div className="panel-head"><h2>Recent messages</h2><AppLink className="inline-link" to="/logs/messaging">View logs <Icon name="arrow" size={15} /></AppLink></div>
        {recent.length ? <Table headers={['From', 'To', 'Status', 'Time (UTC)']}>
          {recent.map((message) => <tr key={message.id}><td><AppLink className="inline-link" to={'/logs/messaging/' + routeId(message.id)} aria-label={'View message ' + message.id}>{display(message.from)}</AppLink></td><td>{display(message.to)}</td><td><Badge value={message.status} /></td><td className="muted">{formatDate(message.createdAt)}</td></tr>)}
        </Table> : <Empty title="No messages yet" action={<AppLink to="/messaging/send" className="button secondary">Send an SMS</AppLink>} />}
      </section>
      <section className="panel">
        <div className="panel-head chart-head"><h2>Delivery status</h2><p>All recorded messages</p></div>
        <ul className="chart">{counts.map(([status, count]) => <li key={status}>
          <span>{label(status)}</span><span className="chart-track" aria-hidden="true"><span className={'chart-bar ' + status} style={{ width: (count / peak) * 100 + '%' }} /></span><strong>{count}</strong>
        </li>)}</ul>
      </section>
    </div>
  </Page>
}

export function WorkspaceRoutes() {
  const { state } = useWorkspace()
  return <Shell account={state.account}>
    <Routes>
      <Route path="/" element={<Overview state={state} />} />
      <Route path="/numbers" element={<ActiveNumbers />} />
      <Route path="/numbers/buy" element={<BuyNumber />} />
      <Route path="/numbers/:id" element={<NumberDetail />} />
      <Route path="/messaging/services" element={<Services />} />
      <Route path="/messaging/services/:id" element={<ServiceDetail />} />
      <Route path="/messaging/send" element={<SendSms />} />
      <Route path="/logs/messaging" element={<Logs />} />
      <Route path="/logs/messaging/:id" element={<LogDetail />} />
      <Route path="*" element={<Missing title="Page unavailable" to="/" back="Return to Overview" />} />
    </Routes>
  </Shell>
}

export function App() {
  return <BrowserRouter><WorkspaceRoutes /></BrowserRouter>
}
