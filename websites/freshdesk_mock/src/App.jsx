import { ArrowLeft, Clock3, MessageSquare, Plus, Settings2, Ticket } from 'lucide-react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppLink, PageHeading } from './components.jsx'
import { agentName, initials } from './data/model.js'
import { useAccount } from './store.jsx'
import { Queue } from './pages/Queue.jsx'
import { NewTicket, TicketDetail } from './pages/Ticket.jsx'
import { Policies } from './pages/Policies.jsx'
import { CannedResponses } from './pages/CannedResponses.jsx'

function Admin() {
  return <>
    <PageHeading title="Admin" description="Configure the tools your support team uses every day." />
    <div className="admin-grid">
      <AppLink className="panel admin-card" to="/admin/sla-policies"><span className="card-icon"><Clock3 size={22} /></span>
        <h2>SLA policies</h2><p>Set response and resolution targets and control which policies apply first.</p></AppLink>
      <AppLink className="panel admin-card" to="/admin/canned-responses"><span className="card-icon"><MessageSquare size={22} /></span>
        <h2>Canned responses</h2><p>Organize reusable replies and control who can use them.</p></AppLink>
    </div>
  </>
}

function Missing() {
  return <section className="panel empty"><h1>Page unavailable</h1>
    <p>This address does not match a workspace page.</p>
    <AppLink to="/tickets" className="button"><ArrowLeft size={16} /> Back to tickets</AppLink>
  </section>
}

export function App() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const name = agentName(state, state.account?.currentAgentId)
  const admin = pathname.startsWith('/admin')
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="masthead">
      <div className="masthead-inner">
        <AppLink to="/" className="wordmark">Freshdesk</AppLink>
        <nav aria-label="Main navigation">
          <AppLink to="/tickets" aria-current={!admin ? 'page' : undefined}><Ticket size={17} /> Tickets</AppLink>
          <AppLink to="/admin" aria-current={admin ? 'page' : undefined}><Settings2 size={17} /> Admin</AppLink>
        </nav>
        <div className="account-actions">
          {pathname !== '/tickets/new' && <AppLink to="/tickets/new" className="button header-action"><Plus size={17} /> New ticket</AppLink>}
          <div className="identity"><span className="avatar" aria-hidden="true">{initials(name)}</span><span>{name}</span></div>
        </div>
      </div>
    </header>
    <main className="frame" id="main">
      <Routes>
        <Route path="/" element={<Queue />} />
        <Route path="/tickets" element={<Queue />} />
        <Route path="/tickets/new" element={<NewTicket />} />
        <Route path="/tickets/:ticketId" element={<TicketDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/sla-policies" element={<Policies />} />
        <Route path="/admin/canned-responses" element={<CannedResponses />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
  </>
}
