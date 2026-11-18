import React, { useState } from 'react'
import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useReader } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { Icon, SiteLink } from './ui.jsx'
import { BookDetail, NotFound } from './pages.jsx'
import { Catalog, Library } from './library.jsx'
import { ReviewDeletion, ReviewEditor, ReviewIndex } from './reviews.jsx'
import { Challenge, DateDeletion, DateEditor, DateManager } from './challenge.jsx'

function Masthead() {
  const { user } = useReader()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const active = pathname === '/' ? '/my-books' : pathname
  const displayName = user?.displayName?.trim() || 'Reader'
  const initials = displayName.split(/\s+/).slice(0, 2).map(name => name[0]).join('').toUpperCase()
  const initialQuery = pathname === '/search' ? new URLSearchParams(search).get('q') || '' : ''
  return <header className="masthead">
    <div className="masthead-rail">
      <SiteLink to="/" className="wordmark">Goodreads<span aria-hidden="true">.</span></SiteLink>
      <nav aria-label="Main navigation">
        {[['/my-books', 'My Books'], ['/my-reviews', 'My Reviews'], ['/reading-challenge', 'Reading Challenge']].map(([to, label]) =>
          <SiteLink key={to} to={to} aria-current={active === to ? 'page' : undefined}>{label}</SiteLink>)}
      </nav>
      <CatalogSearch key={pathname + search} initialQuery={initialQuery} onSearch={query => navigate(withSid(`/search?q=${encodeURIComponent(query)}`))} />
      <div className="account"><span className="avatar" aria-hidden="true">{initials}</span><span>{displayName}</span></div>
    </div>
  </header>
}

function CatalogSearch({ initialQuery, onSearch }) {
  const [query, setQuery] = useState(initialQuery)
  return <form className="catalog-search" role="search" onSubmit={event => { event.preventDefault(); onSearch(query.trim()) }}>
    <label className="sr-only" htmlFor="catalog-search">Search catalog</label>
    <input id="catalog-search" type="search" placeholder="Search books or authors" value={query} onChange={event => setQuery(event.target.value)} />
    <button type="submit" aria-label="Search"><Icon name="search" /></button>
  </form>
}

function ResultsRoute() {
  const [query] = useSearchParams()
  return <Catalog query={query.get('q') || ''} />
}

export function App() {
  const { key } = useLocation()
  return <><a className="skip-link" href="#main-content">Skip to content</a><Masthead /><RouteContent key={key} /></>
}

function RouteContent() {
  const [dialog, setDialog] = useState(null)
  const close = () => setDialog(null)
  const actions = {
    onDate: options => setDialog({ type: 'date', ...options }),
    onDeleteDate: log => setDialog({ type: 'deleteDate', log }),
    onReview: bookId => setDialog({ type: 'review', bookId }),
    onDeleteReview: review => setDialog({ type: 'deleteReview', review }),
  }
  const onLibraryDate = options => setDialog({ type: options.manage ? 'manageDates' : 'date', ...options })
  return <>
    <main id="main-content" className="rail" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Library onDate={onLibraryDate} />} />
        <Route path="/my-books" element={<Library onDate={onLibraryDate} />} />
        <Route path="/search" element={<ResultsRoute />} />
        <Route path="/books/:bookId" element={<BookDetail {...actions} />} />
        <Route path="/my-reviews" element={<ReviewIndex {...actions} />} />
        <Route path="/reading-challenge" element={<Challenge {...actions} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    {dialog?.type === 'date' && <DateEditor bookId={dialog.bookId} log={dialog.log} onClose={close} />}
    {dialog?.type === 'manageDates' && <DateManager bookId={dialog.bookId} onClose={close} {...actions} />}
    {dialog?.type === 'deleteDate' && <DateDeletion log={dialog.log} onClose={close} />}
    {dialog?.type === 'review' && <ReviewEditor bookId={dialog.bookId} onClose={close} />}
    {dialog?.type === 'deleteReview' && <ReviewDeletion review={dialog.review} onClose={close} />}
  </>
}

