import { useLayoutEffect } from 'react'
import { Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Badge, coursePath, courseTitle, Empty, Masthead, records, SiteLink } from './components.jsx'
import { Courses, CourseOverview, CourseSettings, Roster } from './courses.jsx'
import { CourseGrades, GradeQueue, StudentGrades } from './grades.jsx'
import { Announcements } from './announcements.jsx'
import { useStore } from './store.jsx'

const courseTabs = [
  ['', 'Overview'], ['/roster', 'Roster'], ['/grade-center', 'Grade Center'],
  ['/announcements', 'Announcements'], ['/settings', 'Course Settings'],
]

function CourseWorkspace() {
  const { courseId } = useParams()
  const { state } = useStore()
  const course = records(state.courses).find(({ id }) => id === courseId)
  if (!course) return <div className="stack"><h1>Course unavailable</h1><Empty>This course could not be found.</Empty><SiteLink to="/courses">Back to Courses</SiteLink></div>
  const path = coursePath(courseId)
  const term = records(state.terms).find(({ id }) => id === course.termId)
  return <div className="stack">
    <nav className="breadcrumb" aria-label="Breadcrumb"><SiteLink to="/courses">Courses</SiteLink><span aria-hidden="true">/</span><span>{course.code || courseTitle(course)}</span></nav>
    <header className="compact">
      <p className="mono muted">{course.code || 'No course code'}</p>
      <h1>{courseTitle(course)}</h1>
      <div className="actions"><span className="muted">{term?.name || 'No term'}</span><Badge status={course.access} /></div>
    </header>
    <nav className="tabs" aria-label="Course navigation">{courseTabs.map(([suffix, label]) =>
      <SiteLink key={label} to={path + suffix} active end={!suffix}>{label}</SiteLink>)}</nav>
    <Outlet key={courseId} context={course} />
  </div>
}

export default function App() {
  const { state, notice, setNotice } = useStore()
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    setNotice('')
  }, [pathname, setNotice])
  if (!state) return <main><p role="status">Loading Blackboard…</p></main>
  return <>
    <Masthead account={state.account} />
    <main>
      <div className="notice" role="status" aria-live="polite">{notice}</div>
      <Routes>
        <Route path="/" element={<Courses />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/grade-center" element={<GradeQueue />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/courses/:courseId" element={<CourseWorkspace />}>
          <Route index element={<CourseOverview />} />
          <Route path="roster" element={<Roster />} />
          <Route path="settings" element={<CourseSettings />} />
          <Route path="grade-center" element={<CourseGrades />} />
          <Route path="grade-center/students/:studentId" element={<StudentGrades />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>
        <Route path="*" element={<div className="stack"><h1>Page unavailable</h1><SiteLink to="/courses">Back to Courses</SiteLink></div>} />
      </Routes>
    </main>
  </>
}
