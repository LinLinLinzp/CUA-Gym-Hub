import { useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/Workspace.jsx'
import { reviewRequirements, saveCourse, saveLesson, saveSection, submitForReview } from '../data/actions.js'
import { categories } from '../data/seed.js'
import {
  byId, compareText, curriculumFor, isActive, matches, ownedCourses, questionFlag, relativeDate, rows, statusLabel, time,
} from '../data/selectors.js'
import {
  Artwork, Empty, FormDialog, Missing, PageTitle, RouteLink, Search, Select, useRouteNavigate,
} from '../components/Parts.jsx'
import { InstructorQuestions } from './Questions.jsx'

const titleField = { name: 'title', label: 'Course title', required: true, prompt: 'a course title' }
const categoryField = { name: 'category', label: 'Category', required: true, prompt: 'a category', options: categories }
const statuses = ['draft', 'in_review', 'published']
const statusClass = status => statuses.includes(status) ? status : 'neutral'

function Status({ value }) {
  return <span className={'badge ' + statusClass(value)}>{statuses.includes(value) ? statusLabel(value) : 'Status unavailable'}</span>
}

function CourseDashboard() {
  const { state, commit } = useStore()
  const navigate = useRouteNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const courses = ownedCourses(state)
  const items = courses.filter(course => (!status || course.status === status) && matches(query, course.title, course.category))
    .sort((a, b) => time(b.updatedAt || b.createdAt) - time(a.updatedAt || a.createdAt) || compareText(a.title, b.title))
  const courseIds = new Set(courses.map(course => course.id))
  const questions = rows(state.questions).filter(question => isActive(question) && courseIds.has(question.courseId))
  const unreadCount = questions.filter(question => !questionFlag(state, 'questionReads', question.id)?.isRead).length
  const filtered = Boolean(query || status)

  return <>
    <PageTitle title="Instructor courses" actions={<button className="primary" onClick={() => setCreating(true)}><span aria-hidden="true">+</span> New course</button>}>Build courses and manage the lessons you teach.</PageTitle>
    <div className="metric-strip">
      {[['Courses', items.length], ['Published', items.filter(course => course.status === 'published').length],
        ['In review', items.filter(course => course.status === 'in_review').length], ['Drafts', items.filter(course => course.status === 'draft').length]]
        .map(([label, count]) => <div className="metric" key={label}><span>{label}</span><strong>{count}</strong></div>)}
    </div>
    <div className="instructor-columns">
      <section aria-label="Your courses">
        <div className="filter-bar instructor-filters">
          <Search label="Search courses" value={query} onChange={setQuery} placeholder="Course title or category" />
          <Select label="Status" value={status} onChange={setStatus} options={[['', 'All statuses'], ...statuses.map(value => [value, statusLabel(value)])]} />
        </div>
        <div className="result-line"><span>{items.length} {items.length === 1 ? 'course' : 'courses'}</span>
          {filtered && <button className="text-button" onClick={() => { setQuery(''); setStatus('') }}>Clear filters</button>}</div>
        {items.length ? <div className="panel table-wrap"><table className="course-table">
          <thead><tr><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead>
          <tbody>{items.map((course, index) => <tr key={course.id}>
            <th scope="row"><RouteLink className="table-course-link" to={'/instructor/courses/' + course.id}>
              <Artwork category={course.category} variant={index} /><span>{course.title || 'Untitled course'}<small>{course.category || 'General'}</small></span>
            </RouteLink></th>
            <td><Status value={course.status} /></td><td>{relativeDate(course.updatedAt || course.createdAt)}</td>
          </tr>)}</tbody>
        </table></div> : <Empty title={filtered ? 'No matching courses' : 'You have no courses yet'}>
          {filtered ? 'Try a new search or clear your filters.' : 'Create your first course to start building lessons.'}
        </Empty>}
      </section>
      <aside className="panel instructor-summary">
        <div className="panel-head"><h2>Course Q&A</h2></div>
        <div className="summary-body"><strong>{unreadCount}</strong><p>{unreadCount === 1 ? 'Unread question' : 'Unread questions'} across your courses</p>
          <RouteLink className="button" to="/instructor/questions">Open Q&A inbox <span aria-hidden="true">→</span></RouteLink></div>
      </aside>
    </div>
    {creating && <FormDialog title="New course" fields={[titleField, categoryField]} submitLabel="Create course" onClose={() => setCreating(false)}
      onSave={values => {
        const next = commit((state, meta) => saveCourse(state, meta, null, values), 'Draft course created.')
        if (next !== state) navigate('/instructor/courses/' + next.courses.at(-1).id)
      }} />}
  </>
}

const sectionFields = [{ name: 'title', label: 'Section title', required: true, prompt: 'a section title' }]
const lessonFields = [
  { name: 'title', label: 'Lesson title', required: true, prompt: 'a lesson title' },
  { name: 'durationMinutes', label: 'Duration (minutes)', required: true, type: 'number', prompt: 'a duration in minutes' },
  { name: 'content', label: 'Lesson content', type: 'textarea', optional: true },
]

function InstructorCourse() {
  const { courseId } = useParams()
  const [params] = useSearchParams()
  const { state, commit } = useStore()
  const [editing, setEditing] = useState(null)
  const course = ownedCourses(state).find(item => item.id === courseId)
  if (!course) return <Missing title="Course unavailable" to="/instructor" label="Back to Instructor courses">Choose a course you teach from your dashboard.</Missing>

  const base = '/instructor/courses/' + courseId
  const tab = params.get('tab') === 'curriculum' ? 'curriculum' : 'details'
  const curriculum = curriculumFor(state, courseId)
  const missing = reviewRequirements(state, course)
  const courseCategories = course.category && !categories.includes(course.category) ? [...categories, course.category] : categories
  const close = () => setEditing(null)
  const detailFields = [
    titleField,
    { name: 'subtitle', label: 'Subtitle', optional: true },
    { ...categoryField, options: courseCategories },
    { name: 'description', label: 'Description', type: 'textarea', optional: true },
  ]
  return <>
    <RouteLink className="back-link" to="/instructor">← Instructor courses</RouteLink>
    <PageTitle title={course.title || 'Untitled course'} actions={<Status value={course.status} />}>{course.category || 'General'}</PageTitle>
    <nav className="tabs" aria-label="Instructor course sections">
      <RouteLink to={base} className={tab === 'details' ? 'selected' : undefined} aria-current={tab === 'details' ? 'page' : undefined}>Course details</RouteLink>
      <RouteLink to={base + '?tab=curriculum'} className={tab === 'curriculum' ? 'selected' : undefined} aria-current={tab === 'curriculum' ? 'page' : undefined}>Curriculum</RouteLink>
    </nav>
    <div className="instructor-columns edit-columns">
      {tab === 'details' ? <section className="panel about-panel">
        <div className="section-heading"><h2>Course details</h2><button onClick={() => setEditing({ type: 'details' })}>Edit details</button></div>
        <dl className="detail-list">
          {[['Title', course.title], ['Subtitle', course.subtitle], ['Category', course.category], ['Description', course.description]].map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
        </dl>
      </section> : <section className="curriculum-editor">
        <div className="section-heading"><h2>Curriculum</h2><button onClick={() => setEditing({ type: 'section' })}><span aria-hidden="true">+</span> Add section</button></div>
        {curriculum.length ? curriculum.map(section => <article className="panel edit-section" key={section.id}>
          <div className="section-heading"><h3>{section.title || 'Untitled section'}</h3><button onClick={() => setEditing({ type: 'section', section })}>Rename section</button></div>
          {section.lessons.length ? <ul>{section.lessons.map(lesson => <li key={lesson.id}>
            <div><strong>{lesson.title || 'Untitled lesson'}</strong>{Boolean(lesson.durationMinutes) && <small>{lesson.durationMinutes} min</small>}</div>
            <button onClick={() => setEditing({ type: 'lesson', section, lesson })}>Edit lesson</button>
          </li>)}</ul> : <p className="panel-note">This section has no lessons yet.</p>}
          <button className="add-lesson" onClick={() => setEditing({ type: 'lesson', section })}><span aria-hidden="true">+</span> Add lesson</button>
        </article>) : <Empty title="No sections yet">Add a section to organize the lessons in this course.</Empty>}
      </section>}
      <aside className="panel review-panel">
        <div className="panel-head"><h2>Course review</h2></div>
        <div className="summary-body">
          <Status value={course.status} />
          {course.status === 'draft' ? <>
            {missing.length ? <><p>Before submitting, add:</p><ul>{missing.map(item => <li key={item}>{item}</li>)}</ul></>
              : <p>Your course is ready to submit for review.</p>}
            <button className="primary" disabled={Boolean(missing.length)} onClick={() => commit((state, meta) => submitForReview(state, meta, course.id), 'Course submitted for review.')}>Submit for review</button>
          </> : <p>{course.status === 'in_review' ? 'This course has been submitted for review.' : course.status === 'published' ? 'This course is published.' : 'Review status is unavailable.'}</p>}
        </div>
      </aside>
    </div>
    {editing?.type === 'details' && <FormDialog title="Edit course details" fields={detailFields} initial={course} submitLabel="Save details" onClose={close}
      onSave={values => commit((state, meta) => saveCourse(state, meta, course.id, values), 'Course details saved.')} />}
    {editing?.type === 'section' && <FormDialog title={editing.section ? 'Rename section' : 'Add section'} fields={sectionFields} initial={editing.section}
      submitLabel={editing.section ? 'Save section' : 'Add section'} onClose={close}
      onSave={({ title }) => commit((state, meta) => saveSection(state, meta, course.id, editing.section?.id, title), 'Section saved.')} />}
    {editing?.type === 'lesson' && <FormDialog title={editing.lesson ? 'Edit lesson' : 'Add lesson'} fields={lessonFields} initial={editing.lesson}
      submitLabel={editing.lesson ? 'Save lesson' : 'Add lesson'} onClose={close}
      onSave={values => commit((state, meta) => saveLesson(state, meta, editing.section.id, editing.lesson?.id, values), 'Lesson saved.')} />}
  </>
}

const number = new Intl.NumberFormat('en')
const rating = new Intl.NumberFormat('en', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const period = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const metricNumber = value => typeof value === 'number' && Number.isFinite(value) ? value : null

function LearnerActivity({ records }) {
  const counts = new Map()
  for (const record of records) {
    const count = metricNumber(record.learnerCount)
    if (count === null || count < 0 || !time(record.periodStart)) continue
    counts.set(record.periodStart, (counts.get(record.periodStart) || 0) + count)
  }
  const trend = [...counts].sort(([a], [b]) => time(a) - time(b))
  if (trend.length < 2) return null
  const max = Math.max(1, ...counts.values())
  const points = trend.map(([month, count]) => ({ label: period.format(new Date(month)), count }))
  const summary = points.map(({ label, count }) => label + ', ' + number.format(count)).join('. ')
  return <section className="panel activity-panel">
    <div className="panel-head"><h2>Monthly learner activity</h2></div>
    <div className="activity-chart" role="img" aria-label={summary}>
      {points.map(({ label, count }) => <div className="activity-point" key={label} aria-hidden="true">
        <span className="activity-value">{number.format(count)}</span>
        <span className="activity-track"><span className="activity-fill" style={{ height: count / max * 100 + '%' }} /></span>
        <span className="activity-month">{label}</span>
      </div>)}
    </div>
  </section>
}

function Performance() {
  const { state } = useStore()
  const [courseId, setCourseId] = useState('')
  const [month, setMonth] = useState('')
  const courses = ownedCourses(state)
  const courseMap = new Map(courses.map(course => [course.id, course]))
  const metrics = rows(state.performance).filter(item => courseMap.has(item.courseId))
  const periods = [...new Set(metrics.map(item => item.periodStart).filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value))))].sort().reverse()
  const visible = metrics.filter(item => (!courseId || item.courseId === courseId) && (!month || item.periodStart === month))
    .sort((a, b) => time(b.periodStart) - time(a.periodStart))
  const ratings = visible.map(item => metricNumber(item.averageRating)).filter(value => value !== null)
  const counts = visible.map(item => metricNumber(item.learnerCount)).filter(value => value !== null)
  const minutes = visible.map(item => metricNumber(item.minutesTaught)).filter(value => value !== null)
  const sum = values => values.length ? number.format(values.reduce((total, value) => total + value, 0)) : '—'
  const formatted = (value, formatter) => metricNumber(value) === null ? '—' : formatter.format(value)
  return <>
    <PageTitle title="Performance">Review monthly learner activity across your courses.</PageTitle>
    <div className="filter-bar instructor-filters">
      <Select label="Course" value={courseId} onChange={setCourseId} options={[['', 'All my courses'], ...courses.map(course => [course.id, course.title || 'Untitled course'])]} />
      <Select label="Reporting month" value={month} onChange={setMonth} options={[['', 'All months'], ...periods.map(value => [value, period.format(new Date(value))])]} />
    </div>
    <div className="result-line"><span>{visible.length} {visible.length === 1 ? 'report' : 'reports'}</span>
      {(courseId || month) && <button className="text-button" onClick={() => { setCourseId(''); setMonth('') }}>Clear filters</button>}</div>
    <div className="metric-strip performance-metrics">
      {[['Learner activity', sum(counts)], ['Average rating', ratings.length ? rating.format(ratings.reduce((total, value) => total + value, 0) / ratings.length) : '—'], ['Minutes taught', sum(minutes)]]
        .map(([label, value]) => <div key={label} className="metric"><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <LearnerActivity records={visible} />
    {visible.length ? <div className="panel table-wrap"><table className="performance-table">
      <caption>Monthly course metrics</caption>
      <thead><tr>{['Course', 'Month', 'Learners', 'Rating', 'Minutes taught'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{visible.map(item => <tr key={item.id}>
        <th scope="row">{byId(courses, item.courseId)?.title || 'Untitled course'}</th>
        <td>{Number.isFinite(Date.parse(item.periodStart)) ? period.format(new Date(item.periodStart)) : '—'}</td>
        <td>{formatted(item.learnerCount, number)}</td><td>{formatted(item.averageRating, rating)}</td><td>{formatted(item.minutesTaught, number)}</td>
      </tr>)}</tbody>
    </table></div> : <Empty title="No performance data">Choose another course or reporting month.</Empty>}
  </>
}

export function Instructor() {
  const { pathname } = useLocation()
  const { courseId } = useParams()
  const inbox = pathname.startsWith('/instructor/questions')
  const performance = pathname.startsWith('/instructor/performance')
  const selected = inbox ? 'questions' : performance ? 'performance' : 'courses'
  return <div className="instructor-shell">
    <aside className="instructor-rail">
      <nav aria-label="Instructor workspace">
        {[['courses', '/instructor', 'Courses'], ['questions', '/instructor/questions', 'Q&A'], ['performance', '/instructor/performance', 'Performance']].map(([key, to, label]) =>
          <RouteLink key={key} className={selected === key ? 'selected' : undefined} aria-current={selected === key ? 'page' : undefined} to={to}>{label}</RouteLink>)}
      </nav>
    </aside>
    <div className="instructor-content">
      {inbox ? <><PageTitle title="Instructor Q&A">Read and respond to questions from your courses.</PageTitle><InstructorQuestions /></>
        : performance ? <Performance /> : courseId ? <InstructorCourse key={courseId} /> : <CourseDashboard />}
    </div>
  </div>
}
