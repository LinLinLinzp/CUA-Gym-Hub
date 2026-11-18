import { useEffect } from 'react'
import { BookOpen, Compass, ClipboardList, Award, ChevronRight } from 'lucide-react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace } from './context/Workspace.jsx'
import { withSid } from './utils/dataManager.js'
import { Missing, SiteLink } from './components/ui.jsx'
import { MyLearning, Browse } from './pages/Library.jsx'
import { Course, Lesson } from './pages/Course.jsx'
import { AssignmentDesk, Quiz } from './pages/Assignments.jsx'
import { Accomplishments, Certificate, Verification } from './pages/Certificates.jsx'

const links = [
  ['/', 'My Learning', BookOpen], ['/browse', 'Explore', Compass],
  ['/assignments', 'Assignments', ClipboardList], ['/accomplishments', 'Accomplishments', Award],
]
function Layout() {
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  const name = state.learner?.displayName || 'Learner'
  const area = pathname.startsWith('/learn/') ? (pathname.includes('/assignments/') ? 'Assignments' : 'My Learning')
    : pathname.startsWith('/verify/') ? 'Accomplishments'
    : links.find(([path]) => path !== '/' && pathname.startsWith(path))?.[1] || 'My Learning'

  useEffect(() => {
    document.title = 'Coursera | ' + area
    window.scrollTo(0, 0)
  }, [pathname, area])

  return <div className="workspace">
    <a href={withSid(pathname + '#workspace-main')} className="skip" onClick={event => {
      event.preventDefault()
      document.getElementById('workspace-main')?.focus()
    }}>Skip to content</a>
    <aside className="rail">
      <SiteLink to="/" className="brand" aria-label="Coursera home"><span className="brand-mark" aria-hidden="true"><BookOpen size={19} /></span>Coursera</SiteLink>
      <nav aria-label="Workspace">
        {links.map(([to, label, Icon]) => <SiteLink key={to} to={to}
          className={area === label ? 'nav-link selected' : 'nav-link'}
          aria-current={area === label ? 'page' : undefined}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span>
        </SiteLink>)}
      </nav>
      <div className="account"><span className="avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><div>{name}<small>Learner account</small></div></div>
    </aside>
    <div className="workspace-body">
      <div className="topline"><span>Learner workspace</span><ChevronRight size={14} aria-hidden="true" /><strong>{area}</strong></div>
      <main id="workspace-main" tabIndex={-1} className="content">
        <Routes>
          <Route path="/" element={<MyLearning />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/learn/:courseId" element={<Course />} />
          <Route path="/learn/:courseId/lesson/:lessonId" element={<Lesson />} />
          <Route path="/assignments" element={<AssignmentDesk />} />
          <Route path="/learn/:courseId/assignments/:assignmentId" element={<Quiz />} />
          <Route path="/accomplishments" element={<Accomplishments />} />
          <Route path="/accomplishments/:certificateId" element={<Certificate />} />
          <Route path="/verify/:verificationCode" element={<Verification />} />
          <Route path="*" element={<Missing to="/" action="Back to My Learning" />} />
        </Routes>
      </main>
    </div>
  </div>
}
export default Layout
