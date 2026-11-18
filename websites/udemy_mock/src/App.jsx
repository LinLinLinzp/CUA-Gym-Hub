import { useLayoutEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './context/Workspace.jsx'
import { actorId, profileName } from './data/selectors.js'
import { Missing, RouteLink } from './components/Parts.jsx'
import { Library } from './pages/Library.jsx'
import { Learn } from './pages/Learn.jsx'
import { Instructor } from './pages/Instructor.jsx'

export function App() {
  const { state } = useStore()
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  useLayoutEffect(() => {
    if (previousPath.current !== pathname) window.scrollTo(0, 0)
    previousPath.current = pathname
  }, [pathname])
  const isInstructor = pathname === '/instructor' || pathname.startsWith('/instructor/')
  const name = profileName(state, actorId(state), 'My account')
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('')
  return <>
    <header className="site-header">
      <div className="header-inner">
        <RouteLink className="wordmark" to="/" aria-label="Udemy home">Udemy</RouteLink>
        <nav className="site-nav" aria-label="Main navigation">
          <RouteLink className={!isInstructor ? 'current' : undefined} aria-current={!isInstructor ? 'page' : undefined} to="/my-learning">My learning</RouteLink>
          <RouteLink className={isInstructor ? 'current' : undefined} aria-current={isInstructor ? 'page' : undefined} to="/instructor">Instructor</RouteLink>
        </nav>
        <div className="account"><span className="avatar" aria-hidden="true">{initials}</span><span className="account-name">{name}</span></div>
      </div>
    </header>
    <main className={'canvas' + (isInstructor ? ' instructor-canvas' : '')} id="main-content">
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/my-learning" element={<Library />} />
        <Route path="/my-learning/lists/:listId" element={<Library />} />
        <Route path="/learn/:courseId" element={<Learn />} />
        <Route path="/learn/:courseId/questions/:questionId" element={<Learn />} />
        <Route path="/instructor" element={<Instructor />} />
        <Route path="/instructor/courses/:courseId" element={<Instructor />} />
        <Route path="/instructor/questions/:questionId?" element={<Instructor />} />
        <Route path="/instructor/performance" element={<Instructor />} />
        <Route path="*" element={<Missing>Use the account navigation to return to your courses.</Missing>} />
      </Routes>
    </main>
  </>
}
