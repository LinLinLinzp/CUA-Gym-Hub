import { NavLink, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAccount } from './account.jsx'
import { initials, number } from './model.js'
import { AccountLink } from './ui.jsx'
import { Overview } from './pages/Overview.jsx'
import { Courses, Learn } from './pages/Courses.jsx'
import { Goals } from './pages/Goals.jsx'
import { FriendsQuests } from './pages/FriendsQuests.jsx'

const tabs = [
  ['/', 'Overview'],
  ['/courses', 'Courses'],
  ['/goals', 'Goals'],
  ['/friends-quests', 'Friends Quests'],
]

function AccountShell() {
  const location = useLocation()
  const { state, notice } = useAccount()
  const learner = state.profile
  const name = learner.displayName || 'Learner'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead">
      <div className="frame masthead-inner">
        <Link to={'/' + location.search} className="wordmark">Duolingo</Link>
        <div className="identity">
          <span className="avatar" aria-hidden="true">{initials(name)}</span>
          <span className="learner-name">{name}</span>
          <span className="gem-count"><span aria-hidden="true">◆</span> {number(learner.gems).toLocaleString()} gems</span>
        </div>
      </div>
      <nav className="tabs frame" aria-label="Account">
        {tabs.map(([path, title]) => <NavLink key={path} to={path + location.search} end={path === '/'}>{title}</NavLink>)}
      </nav>
    </header>
    <main className="frame page" id="main"><Outlet /></main>
    <div className="notice-region" role="status" aria-live="polite">
      {notice && <div className="notice" key={notice.id}>{notice.message}</div>}
    </div>
  </>
}

export function App() {
  return <Routes>
    <Route element={<AccountShell />}>
      <Route index element={<Overview />} />
      <Route path="courses" element={<Courses />} />
      <Route path="learn" element={<Learn />} />
      <Route path="goals" element={<Goals />} />
      <Route path="friends-quests" element={<FriendsQuests />} />
      <Route path="*" element={<>
        <h1>Page unavailable</h1>
        <AccountLink to="/" className="button primary">Back to Overview</AccountLink>
      </>} />
    </Route>
  </Routes>
}
