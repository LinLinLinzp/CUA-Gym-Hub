import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { latest } from './model.js'
import { accountLinks, Empty, Heading, Icon, OrderRow, SiteLink } from './ui.jsx'
import { Orders, OrderDetail } from './orders.jsx'
import { PriceMatch } from './price-match.jsx'
import { Plans, PlanDetail } from './plans.jsx'
import { Returns, ReturnDetail } from './returns.jsx'

const services = [
  ['Price match', '/price-match', 'match', 'Request an adjustment on an eligible purchase.'],
  ['Protection plans', '/protection-plans', 'protection', 'View coverage and request service.'],
  ['Returns', '/returns', 'returns', 'Start a return or check its status.'],
]

function Overview() {
  const { state } = useAccount()
  const name = state.account?.name?.trim().split(/\s+/)[0]
  const recent = latest(state.orders).slice(0, 5)
  return <>
    <section className="hero">
      <div className="hero-copy"><span className="membership">{state.account?.membership || 'Your account'}</span>
        <h1>{name ? 'Welcome, ' + name : 'Welcome'}</h1>
        <p>Track purchases and manage returns, price matches, and protection plans in one place.</p>
      </div>
      <img src="/account-still-life.svg" alt="" />
    </section>
    <div className="overview-grid">
      <section className="card overview-orders"><div className="section-heading"><h2>Recent orders</h2><SiteLink to="/orders">View all orders <Icon name="arrow" /></SiteLink></div>
        {recent.length ? <ul className="rows">{recent.map((order) => <OrderRow key={order.id} order={order} />)}</ul> : <Empty>You have no orders yet.</Empty>}
      </section>
      <section aria-labelledby="services" className="services"><h2 id="services">Purchase support</h2>
        {services.map(([title, path, icon, copy]) => <SiteLink key={path} to={path} className="service-link">
          <span className="service-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{copy}</small></span><Icon name="arrow" />
        </SiteLink>)}
      </section>
    </div>
  </>
}

export default function App() {
  const { state, message, dismissMessage } = useAccount()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const name = state.account?.name
  return <>
    <a className="skip-link" href="#workspace">Skip to content</a>
    <header className="masthead"><div className="masthead-inner">
      <SiteLink className="wordmark" to="/">Best Buy</SiteLink>
      <span className="masthead-label">Account center</span>
      {name && <div className="account-name"><span aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span>{name}</div>}
    </div></header>
    <div className="shell">
      <aside className="rail"><nav aria-label="Account">{accountLinks.map(([title, path, icon]) =>
        <SiteLink key={path} nav end={path === '/'} to={path}><Icon name={icon} />{title}</SiteLink>)}
      </nav></aside>
      <main id="workspace" className="workspace">
        <div role="status" className={message ? 'notice' : 'visually-hidden'}>{message && <><Icon name="check" /><span>{message}</span><button type="button" aria-label="Dismiss notification" className="icon-button" onClick={dismissMessage}><Icon name="close" /></button></>}</div>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderId" element={<OrderDetail key={pathname} />} />
          <Route path="/price-match" element={<PriceMatch />} />
          <Route path="/protection-plans" element={<Plans />} />
          <Route path="/protection-plans/:planId" element={<PlanDetail key={pathname} />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/returns/:returnId" element={<ReturnDetail key={pathname} />} />
          <Route path="*" element={<><Heading title="Page unavailable" /><SiteLink to="/">Back to overview</SiteLink></>} />
        </Routes>
      </main>
    </div>
  </>
}

