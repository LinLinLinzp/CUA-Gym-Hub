import { useState } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Go, Icon, Missing, Nav } from './components/UI'
import { useWorkspace } from './context/Workspace'
import { find } from './data/views'
import Dashboard from './pages/Dashboard'
import { CourseIndex, CourseDetail, CourseSettings, Participants } from './pages/Courses'
import { AssignmentIndex, AssignmentDetail, AssignmentSettings, Submissions, Learner } from './pages/Assignments'
import { GradeIndex, GradeReport, GradeSetup } from './pages/Grades'

const navigation = [
  ['/', 'Dashboard', 'home'], ['/courses', 'My courses', 'books'],
  ['/assignments', 'Assignments', 'work'], ['/grades', 'Gradebook', 'grade'],
]

function Shell() {
  const { state, notice, notify } = useWorkspace()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const name = find(state.users, state.account.userId)?.name || state.account.displayName || 'Instructor'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  const [, area, courseId, subpage] = pathname.split('/')
  const course = area === 'courses' && courseId !== 'new' ? find(state.courses, decodeSafe(courseId)) : null
  const section = navigation.find(([path]) => path === '/' ? pathname === '/' : pathname.startsWith(path))
  const subsection = { participants: 'Participants', settings: 'Settings', assignments: 'Assignments', grades: 'Grades', learner: 'Learner workspace' }[subpage]
  return <div className="workspace">
    <aside className="rail">
      <div className="rail-top"><Go className="wordmark" to="/">Moodle</Go><button className="menu-toggle" aria-expanded={menu} aria-controls="workspace-nav" onClick={() => setMenu(!menu)}>Menu</button></div>
      <nav id="workspace-nav" className={'primary-nav' + (menu ? ' open' : '')} aria-label="Primary navigation">
        {navigation.map(([path, label, icon]) => <Nav end={path === '/'} to={path} key={path} onClick={() => setMenu(false)}><Icon name={icon} />{label}</Nav>)}
      </nav>
      <div className="account"><span className="avatar">{initials}</span><div><strong>{name}</strong><small>Instructor</small></div></div>
    </aside>
    <div className="workspace-body">
      <header className="topbar"><nav aria-label="Breadcrumb"><Go to="/">Workspace</Go><span aria-hidden="true">/</span>
        {course ? <><Go to="/courses">My courses</Go><span aria-hidden="true">/</span><Go to={'/courses/' + encodeURIComponent(course.id)}>{course.shortName || course.fullName || 'Course'}</Go>{subsection && <><span aria-hidden="true">/</span><span>{subsection}</span></>}</> : <span>{section?.[1] ?? 'Page'}</span>}
      </nav></header>
      <main className="content" id="main-content"><Outlet /></main>
    </div>
    {notice && <div className="notice" role="status"><Icon name="check" /><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => notify(null)}>×</button></div>}
  </div>
}

function decodeSafe(value) {
  try { return decodeURIComponent(value ?? '') } catch { return value }
}

export default function App() {
  return <BrowserRouter><Routes><Route element={<Shell />}>
    <Route index element={<Dashboard />} />
    <Route path="courses" element={<CourseIndex />} />
    <Route path="courses/new" element={<CourseSettings />} />
    <Route path="courses/:courseId" element={<CourseDetail />} />
    <Route path="courses/:courseId/settings" element={<CourseSettings />} />
    <Route path="courses/:courseId/participants" element={<Participants />} />
    <Route path="assignments" element={<AssignmentIndex />} />
    <Route path="courses/:courseId/assignments/new" element={<AssignmentSettings />} />
    <Route path="courses/:courseId/assignments/:assignmentId" element={<AssignmentDetail />} />
    <Route path="courses/:courseId/assignments/:assignmentId/edit" element={<AssignmentSettings />} />
    <Route path="courses/:courseId/assignments/:assignmentId/submissions" element={<Submissions />} />
    <Route path="courses/:courseId/learner/:userId/assignments/:assignmentId" element={<Learner />} />
    <Route path="grades" element={<GradeIndex />} />
    <Route path="courses/:courseId/grades" element={<GradeReport />} />
    <Route path="courses/:courseId/grades/setup" element={<GradeSetup />} />
    <Route path="*" element={<Missing />} />
  </Route></Routes></BrowserRouter>
}
