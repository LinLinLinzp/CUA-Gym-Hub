import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store.jsx'
import { AppLink, Missing } from './ui.jsx'
import { Overview } from './pages/Overview.jsx'
import { ProductList, ProductDetail, ProductEditor } from './pages/Products.jsx'
import { FeedList, FeedDetail, FeedEditor } from './pages/Feeds.jsx'
import { IssueList, IssueDetail } from './pages/Issues.jsx'

const links = [['Overview', '/'], ['Products', '/products'], ['Data sources', '/data-sources'], ['Needs attention', '/issues']]

export function App() {
  const { state } = useStore()
  const location = useLocation()
  const name = state.account?.name || 'Northline Supply Co.'
  const operator = state.account?.actorName || 'Maya Chen'
  const initials = String(operator).trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
  return <>
    <a href="#workspace" className="skip">Skip to content</a>
    <header className="masthead">
      <div className="frame masthead-inner">
        <AppLink to="/" className="brand">Google Merchant Center</AppLink>
        <nav className="main-nav" aria-label="Workspace">
          {links.map(([title, path]) => <AppLink key={path} to={path} nav end={path === '/'}>{title}</AppLink>)}
        </nav>
        <div className="operator"><span className="avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong><small>{operator}</small></div></div>
      </div>
    </header>
    <main id="workspace" tabIndex={-1} className="frame main">
      <Routes location={location} key={location.pathname + location.search}>
        <Route path="/" element={<Overview />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductEditor />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/products/:id/edit" element={<ProductEditor />} />
        <Route path="/data-sources" element={<FeedList />} />
        <Route path="/data-sources/new" element={<FeedEditor />} />
        <Route path="/data-sources/:id" element={<FeedDetail />} />
        <Route path="/data-sources/:id/edit" element={<FeedEditor />} />
        <Route path="/issues" element={<IssueList />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
  </>
}

