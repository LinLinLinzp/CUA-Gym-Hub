import React, { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { isUnread, useAccount } from './account.jsx'
import { accountType, benefitStatus, byNewest, date, mask, money, nameOf, records, show } from './display.js'
import { AccountLink, AccountNavLink, Icon, LetterLink, StatementLink, Unavailable } from './ui.jsx'
import { Statements, StatementDetail } from './pages/Statements.jsx'
import { DirectDeposit } from './pages/DirectDeposit.jsx'
import { Letters, LetterDetail } from './pages/Letters.jsx'
import { Payments } from './pages/Payments.jsx'

const sections = [
  ['/', 'Overview', 'home'],
  ['/statements', 'Benefit statements', 'statement'],
  ['/direct-deposit', 'Direct deposit', 'bank'],
  ['/letters', 'Letters', 'letter'],
  ['/payments', 'Payment history', 'payments'],
]

function Layout() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const unread = records(state.letters).filter(isUnread).length
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return <>
    <a className="skip" href="#main-content">Skip to main content</a>
    <header className="masthead">
      <div className="masthead-inner">
        <AccountLink to="/" className="wordmark"><span>my</span> Social Security</AccountLink>
        <span className="account-name"><Icon name="person" />{nameOf(state.profile) || 'Your account'}</span>
      </div>
    </header>
    <div className="layout">
      <nav className="account-nav" aria-label="Account">
        <div className="nav-label">Your account</div>
        {sections.map(([path, label, icon]) => <AccountNavLink to={path} end={path === '/'} key={path}>
          <Icon name={icon} /><span>{label}</span>
          {path === '/letters' && unread > 0 && <span className="nav-count" aria-label={unread + ' unread'}>{unread}</span>}
        </AccountNavLink>)}
      </nav>
      <main id="main-content" tabIndex="-1" key={pathname}><Outlet /></main>
    </div>
  </>
}

const actions = [
  ['/statements', 'Benefit statements', 'statement'],
  ['/direct-deposit', 'Manage direct deposit', 'bank'],
  ['/letters?verification=1', 'Get benefit verification letter', 'letter'],
]

function Overview() {
  const { state } = useAccount()
  const { profile, directDeposit } = state
  const letters = records(state.letters)
  const unread = letters.filter(isUnread).length
  const recent = [
    ...records(state.statements).map(item => ({ item, id: item.id, date: item.issuedOn, kind: 'statement' })),
    ...letters.map(item => ({ item, id: item.id, date: item.createdAt, kind: 'letter' })),
  ].sort(byNewest).slice(0, 5)
  const active = directDeposit?.status === 'active'

  return <div className="stack">
    <section className="hero">
      <div>
        <p className="eyebrow">Account overview</p>
        <h1>{profile?.firstName ? 'Welcome, ' + profile.firstName : 'Welcome to your account'}</h1>
        <p>Review your benefits, find documents and manage how you receive payments.</p>
      </div>
      <img src="/documents.svg" alt="" width="240" height="150" />
    </section>
    <div className="overview-grid">
      <section className="panel benefit-card">
        <h2>Current benefits</h2>
        <p className="benefit-amount">{profile?.benefitStatus === 'receiving' ? money(profile.monthlyBenefit) : benefitStatus(profile?.benefitStatus)}</p>
        {profile?.benefitStatus === 'receiving' && <p className="muted">{[profile.benefitType, 'Monthly benefit'].filter(Boolean).join(' · ')}</p>}
        <div className="destination"><Icon name="bank" /><div>
          <strong>{active ? show(directDeposit.bankName) : 'Direct deposit'}</strong>
          <span>{active ? accountType(directDeposit.accountType) + ' · ' + mask(directDeposit.accountLast4) : 'No active destination'}</span>
        </div></div>
        <AccountLink to="/payments">View payment history</AccountLink>
      </section>
      <section className="panel quick-actions">
        <h2>Common actions</h2>
        {actions.map(([path, label, icon]) => <AccountLink to={path} key={path}>
          <span className="action-icon"><Icon name={icon} /></span><span>{label}</span><Icon name="arrow" />
        </AccountLink>)}
      </section>
    </div>
    <section className="panel recent">
      <div className="section-heading"><h2>Recent documents</h2>
        <AccountLink to="/letters">{unread} unread {unread === 1 ? 'notice' : 'notices'}</AccountLink>
      </div>
      {recent.length ? <ul className="recent-list">
        {recent.map(({ item, date: issued, kind }, index) => <li key={kind + '-' + (item.id ?? index)}>
          <Icon name={kind} />
          {kind === 'statement'
            ? <StatementLink statement={item}>{item.title || 'Benefit statement'}</StatementLink>
            : <LetterLink letter={item}>{item.title || 'Account letter'}</LetterLink>}
          <span className="muted">{date(issued)}</span>
        </li>)}
      </ul> : <p className="empty">No documents are available.</p>}
    </section>
  </div>
}

export default function App() {
  return <Routes>
    <Route element={<Layout />}>
      <Route index element={<Overview />} />
      <Route path="statements" element={<Statements />} />
      <Route path="statements/:statementId" element={<StatementDetail />} />
      <Route path="direct-deposit" element={<DirectDeposit />} />
      <Route path="letters" element={<Letters />} />
      <Route path="letters/:letterId" element={<LetterDetail />} />
      <Route path="payments" element={<Payments />} />
      <Route path="*" element={<Unavailable title="Page unavailable" to="/" linkText="Return to Overview" />} />
    </Route>
  </Routes>
}
