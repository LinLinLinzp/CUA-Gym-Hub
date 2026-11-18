import React, { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Icon, AccountLink, AccountNavLink, Missing, Overview } from './ui.jsx'
import { AccountProvider, useAccount } from './account.jsx'
import { Cases, CaseDetail } from './cases.jsx'
import { Forms, Draft } from './forms.jsx'
import { AddressChange, AddressDetail } from './address.jsx'

const menu = [
  ['/', 'Overview', 'home'],
  ['/cases', 'Case status', 'case'],
  ['/forms', 'Forms', 'form'],
  ['/address-change', 'Address change', 'pin'],
]

function AccountLayout() {
  const { state } = useAccount()
  const { pathname, hash } = useLocation()
  const person = state.profile?.displayName || 'Account holder'
  const initials = person.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return <>
    <a className="skip" href="#main">Skip to main content</a>
    <header className="topbar">
      <AccountLink className="wordmark" to="/">my<span>USCIS</span></AccountLink>
      <div className="identity"><span className="avatar" aria-hidden="true">{initials}</span><span>{person}</span></div>
    </header>
    <div className="layout">
      <aside className="rail">
        <nav aria-label="Account navigation">
          {menu.map(([path, label, icon]) => <AccountNavLink key={path} to={path} end={path === '/'}>
            <Icon name={icon} />{label}
          </AccountNavLink>)}
        </nav>
      </aside>
      <main id="main" className="content" tabIndex={-1}><div className="content-inner"><Outlet /></div></main>
    </div>
  </>
}

export default function App() {
  return <BrowserRouter><AccountProvider><Routes>
    <Route element={<AccountLayout />}>
      <Route index element={<Overview />} />
      <Route path="cases" element={<Cases />} />
      <Route path="cases/:caseId" element={<CaseDetail />} />
      <Route path="forms" element={<Forms />} />
      <Route path="forms/drafts/:draftId" element={<Draft />} />
      <Route path="address-change" element={<AddressChange />} />
      <Route path="address-change/:requestId" element={<AddressDetail />} />
      <Route path="*" element={<Missing title="Page unavailable" to="/" label="Return to overview" />} />
    </Route>
  </Routes></AccountProvider></BrowserRouter>
}
