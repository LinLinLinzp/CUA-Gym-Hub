import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { useAccount } from './store'
import { Icon, SiteLink, Missing } from './ui'
import { Overview } from './pages/Overview'
import { Autoships, AutoshipDetail } from './pages/Autoships'
import { Orders, OrderDetail } from './pages/Orders'
import { Pets, PetDetail } from './pages/Pets'
import { Returns, ReturnDetail, ReturnRequest } from './pages/Returns'

const sections = [
  ['Overview', '/', 'overview'], ['Autoship', '/autoship', 'autoship'], ['Order History', '/orders', 'orders'],
  ['Pet Profiles', '/pets', 'pets'], ['Returns', '/returns', 'returns'],
]

export function App() {
  const { state: { account } } = useAccount()
  const name = [account?.firstName, account?.lastName].filter(Boolean).join(' ') || 'Your account'
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar"><SiteLink to="/" className="wordmark">Chewy</SiteLink>
      <span className="header-divider" /><span className="topbar-label">Your account</span>
      <span className="account-name"><span className="account-icon"><Icon name="user" size={17} /></span>{name}</span>
    </header>
    <div className="workspace">
      <aside className="rail"><nav aria-label="Account navigation">
        {sections.map(([label, to, icon]) => <SiteLink key={to} nav to={to} end={to === '/'}>
          <Icon name={icon} />{label}
        </SiteLink>)}
      </nav></aside>
      <main id="main" className="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/autoship" element={<Autoships />} />
          <Route path="/autoship/:id" element={<AutoshipDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/pets/new" element={<PetDetail create />} />
          <Route path="/pets/:id" element={<PetDetail />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/returns/new/:orderId" element={<ReturnRequest />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
          <Route path="*" element={<Missing to="/" label="Back to Overview" />} />
        </Routes>
      </main>
    </div>
  </>
}

