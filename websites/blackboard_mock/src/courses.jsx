import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { changeCourse } from './actions.js'
import { Badge, coursePath, courseTitle, Empty, enrolledStudents, matches, records, Search, Select, SiteLink, studentName, titleOrder } from './components.jsx'
import { useStore } from './store.jsx'

const accessModes = [
  ['open', 'Open', 'Enrolled students can enter the course and view available materials.'],
  ['closed', 'Closed', 'Students cannot enter the course. Instructors can still teach and prepare materials.'],
  ['complete', 'Complete', 'The course stays available to instructors for review. Reopen it to make changes.'],
]
const accessLabels = Object.fromEntries(accessModes.map(([value, label]) => [value, label]))
const subjects = ['Environmental Studies', 'Art History', 'Biology', 'Communication', 'Design', 'Economics', 'English', 'Geography', 'History', 'Mathematics', 'Philosophy', 'Sociology']

function Favorite({ course }) {
  const { commit } = useStore()
  return <button type="button" className="icon favorite" aria-label={'Favorite ' + courseTitle(course)} aria-pressed={Boolean(course.favorite)}
    onClick={() => commit((state, meta) => changeCourse(state, meta, course.id,
      (current) => ({ favorite: !current.favorite }), 'course.favorite', (_, fields) => fields),
    course.favorite ? 'Course removed from favorites.' : 'Course added to favorites.')}>
    <span aria-hidden="true">{course.favorite ? '★' : '☆'}</span>
  </button>
}

function CourseCard({ course, term, instructor }) {
  const subjectIndex = subjects.indexOf(course.subject)
  const signature = subjectIndex < 0 ? '' : [' signature-sage', ' signature-clay', ' signature-cobalt'][subjectIndex % 3]
  return <article className="course-card">
    <div className={'signature' + signature} aria-hidden="true" />
    <div className="course-card-body">
      <div className="card-top"><span className="mono muted">{course.code || 'No course code'}</span><Favorite course={course} /></div>
      <h3><SiteLink to={coursePath(course.id)}>{courseTitle(course)}</SiteLink></h3>
      <p className="meta">{term} · {instructor}</p>
      <div className="card-footer"><Badge status={course.access} /><SiteLink to={coursePath(course.id) + '/settings'} aria-label={'Course Settings for ' + courseTitle(course) + ' ' + (course.code || '')}>Course Settings</SiteLink></div>
    </div>
  </article>
}

export function Courses() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [termId, setTermId] = useState('')
  const [access, setAccess] = useState('')
  const [favorites, setFavorites] = useState(false)
  const terms = records(state.terms).sort((a, b) => titleOrder(b.startsOn, a.startsOn) || titleOrder(a.name, b.name))
  const termNames = new Map(terms.map(({ id, name }) => [id, name]))
  const instructorName = (course) => course.instructorName || (course.instructorId === state.account.id && state.account.name) || 'Instructor unavailable'
  const courses = records(state.courses).filter((course) =>
    (!termId || course.termId === termId) && (!access || course.access === access) &&
    (!favorites || course.favorite) && matches(query, courseTitle(course), course.code, instructorName(course)))
    .sort((a, b) => titleOrder(a.title, b.title) || titleOrder(a.code, b.code))
  const groups = [
    ['favorites', 'Favorites', courses.filter((course) => course.favorite)],
    ...terms.map((term) => [term.id, term.name || 'Unnamed term', courses.filter((course) => !course.favorite && course.termId === term.id)]),
    ['unassigned', 'No term', courses.filter((course) => !course.favorite && !termNames.has(course.termId))],
  ]
  function clearFilters() {
    setQuery('')
    setTermId('')
    setAccess('')
    setFavorites(false)
  }
  return <div className="stack">
    <header className="page-heading"><h1>Courses</h1></header>
    <div className="toolbar">
      <Search label="Search courses" value={query} onChange={setQuery} placeholder="Title, course code, or instructor" />
      <Select label="Term" value={termId} onChange={setTermId}><option value="">All terms</option>
        {terms.map((term) => <option key={term.id} value={term.id}>{term.name || 'Unnamed term'}</option>)}</Select>
      <Select label="Access" value={access} onChange={setAccess}><option value="">All access statuses</option>
        {accessModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
      <button type="button" aria-pressed={favorites} onClick={() => setFavorites(!favorites)}>Favorites only</button>
      <button type="button" onClick={clearFilters}>Clear filters</button>
    </div>
    <p className="meta result-count" role="status">{courses.length} {courses.length === 1 ? 'course' : 'courses'}</p>
    {groups.filter(([, , group]) => group.length).map(([id, label, group]) => <section className="compact" key={id}>
      <h2 className="group-title">{label}</h2>
      <div className="course-grid">{group.map((course) => <CourseCard key={course.id} course={course}
        term={termNames.get(course.termId) || 'No term'} instructor={instructorName(course)} />)}</div>
    </section>)}
    {!courses.length && <Empty>{records(state.courses).length ? 'No courses match these filters.' : 'No courses are available.'}</Empty>}
  </div>
}

export function CourseOverview() {
  const course = useOutletContext()
  const { state } = useStore()
  const content = records(state.courseContent).filter((entry) => entry.courseId === course.id && entry.visible)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const enrollmentCount = enrolledStudents(state, course.id).length
  return <div className="overview">
    <section className="panel compact"><h2>Course Content</h2>
      {content.length ? <ul className="line-list">{content.map((entry) => <li key={entry.id}>
        <span className="meta kind">{entry.kind || 'Material'}</span><strong>{entry.title || 'Untitled material'}</strong>
        {entry.description && <p className="meta">{entry.description}</p>}
      </li>)}</ul> : <Empty>No visible course materials.</Empty>}
    </section>
    <aside className="panel compact">
      <div className="section-heading"><h2>Course details</h2><Favorite course={course} /></div>
      <p>{course.description || 'No course description is available.'}</p>
      <p className="meta">{course.instructorName || (course.instructorId === state.account.id && state.account.name) || 'Instructor unavailable'}</p>
      <SiteLink to={coursePath(course.id) + '/roster'}>{enrollmentCount} enrolled {enrollmentCount === 1 ? 'student' : 'students'}</SiteLink>
    </aside>
  </div>
}

export function Roster() {
  const course = useOutletContext()
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const students = enrolledStudents(state, course.id)
    .filter((student) => matches(query, studentName(student), student.username))
    .sort((a, b) => titleOrder(a.lastName, b.lastName) || titleOrder(studentName(a), studentName(b)))
  return <section className="compact"><h2>Roster</h2>
    <div className="toolbar"><Search label="Search roster" value={query} onChange={setQuery} placeholder="Name or username" /></div>
    {students.length ? <div className="table-scroll"><table><thead><tr><th scope="col">Student</th><th scope="col">Username</th><th scope="col">Grade Center</th></tr></thead>
      <tbody>{students.map((student) => <tr key={student.id}>
        <th scope="row">{studentName(student)}</th><td>{student.username || '—'}</td>
        <td><SiteLink to={coursePath(course.id) + '/grade-center/students/' + encodeURIComponent(student.id)}
          aria-label={'Grade summary for ' + studentName(student)}>Grade summary</SiteLink></td>
      </tr>)}</tbody></table></div>
      : <Empty>No enrolled students match this view.</Empty>}
  </section>
}

export function CourseSettings() {
  const course = useOutletContext()
  const { commit } = useStore()
  const [selection, setSelection] = useState(null)
  const access = selection ?? course.access
  function save(event) {
    event.preventDefault()
    if (!Object.hasOwn(accessLabels, access)) return
    commit((state, meta) => changeCourse(state, meta, course.id,
      (current) => current.access === access ? null : { access },
      'course.access', (current) => ({ before: current.access ?? null, after: access })), 'Course access saved.')
    setSelection(null)
  }
  return <form className="panel compact settings" onSubmit={save}>
    <h2>Course Settings</h2>
    <fieldset className="compact"><legend>Course access</legend>
      {accessModes.map(([value, label, description]) => <label className="radio-card" key={value}>
        <input type="radio" name="access" value={value} checked={value === access} onChange={() => setSelection(value)} />
        <span><strong>{label}</strong><span className="meta">{description}</span></span>
      </label>)}
    </fieldset>
    <div><button type="submit" className="primary" disabled={!Object.hasOwn(accessLabels, access) || access === course.access}>Save access</button></div>
  </form>
}
