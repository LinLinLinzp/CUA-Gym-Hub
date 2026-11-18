import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace, upsert } from '../context/Workspace'
import { active, assignmentPath, byName, coursePath, coursePeriod, dateLabel, find, inCourse, list, matches, nameOf, timestamp, visible } from '../data/views'
import { Badge, CourseTabs, Dialog, Empty, Field, FormActions, Go, Heading, Icon, Missing, Pagination, Search, Select, useGo } from '../components/UI'

const pageSize = 9
const titleOf = (course) => course.fullName || 'Untitled course'

export function CourseIndex() {
  const { state, commit, notify } = useWorkspace()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [period, setPeriod] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(0)
  const preferences = list(state.coursePreferences).filter(row => row.userId === state.account.userId)
  const starred = (id) => Boolean(preferences.find(row => row.courseId === id)?.starred)
  const courses = list(state.courses).filter(course => matches(query, course.fullName, course.shortName)
    && (!category || course.categoryId === category)
    && (!period || (period === 'starred' ? starred(course.id) : coursePeriod(course) === period)))
    .sort((a, b) => (sort === 'date' ? (timestamp(b.startDate) || 0) - (timestamp(a.startDate) || 0) : 0) || byName(titleOf(a), titleOf(b)))
  const current = Math.min(page, Math.max(0, Math.ceil(courses.length / pageSize) - 1))
  const filter = (setter) => (value) => { setter(value); setPage(0) }

  function toggle(course) {
    const next = !starred(course.id)
    commit((currentState, time) => {
      const rows = list(currentState.coursePreferences)
      return { ...currentState, coursePreferences: upsert(rows,
        rows.find(row => row.courseId === course.id && row.userId === currentState.account.userId),
        { courseId: course.id, userId: currentState.account.userId, starred: next }, currentState.account.userId, time, 'pref').rows }
    })
    notify(next ? 'Course starred.' : 'Course unstarred.')
  }

  return <Heading title="My courses" subtitle="Manage your courses and enrolments." actions={<Go className="button" to="/courses/new"><Icon name="plus" /> Create course</Go>}>
    <div className="filters panel">
      <Search label="Search courses" placeholder="Course name or code" value={query} onChange={filter(setQuery)} />
      <Select label="Category" value={category} onChange={filter(setCategory)}><option value="">All categories</option>{list(state.categories).map(row => <option key={row.id} value={row.id}>{row.name || 'Uncategorised'}</option>)}</Select>
      <Select label="Course status" value={period} onChange={filter(setPeriod)}><option value="">All courses</option><option value="current">Current</option><option value="future">Future</option><option value="past">Past</option><option value="starred">Starred</option></Select>
      <Select label="Sort by" value={sort} onChange={filter(setSort)}><option value="name">Title A–Z</option><option value="date">Newest start date</option></Select>
    </div>
    {!courses.length && <div className="panel"><Empty>No courses match these filters.</Empty></div>}
    <div className="course-grid">{courses.slice(current * pageSize, (current + 1) * pageSize).map(course => {
      const pattern = [...String(course.id)].reduce((hash, char) => hash + char.codePointAt(0), 0) % 4
      const isStarred = starred(course.id)
      return <article className="course-card" key={course.id}>
        <div className={'course-art c' + pattern} aria-hidden="true" />
        <div className="card-content"><div className="card-meta"><small>{course.shortName || 'No course code'} · {find(state.categories, course.categoryId)?.name || 'Uncategorised'}</small>
          <button className="secondary icon-button" type="button" aria-label={(isStarred ? 'Unstar ' : 'Star ') + titleOf(course)} aria-pressed={isStarred} onClick={() => toggle(course)}>{isStarred ? '★' : '☆'}</button></div>
          <h2><Go to={coursePath(course)}>{titleOf(course)}</Go></h2>
          <div className="card-foot"><small>{dateLabel(course.startDate)}{course.endDate ? ' – ' + dateLabel(course.endDate) : ''}</small><Badge tone={visible(course) ? 'success' : 'neutral'}>{visible(course) ? 'Visible' : 'Hidden'}</Badge></div>
        </div>
      </article>
    })}</div>
    <Pagination count={courses.length} size={pageSize} page={current} setPage={setPage} label="courses" />
  </Heading>
}

export function CourseDetail() {
  const { courseId } = useParams()
  const { state } = useWorkspace()
  const course = find(state.courses, courseId)
  if (!course) return <Missing title="Course unavailable" />
  const sections = inCourse(state.courseSections, courseId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const assignments = inCourse(state.assignments, courseId)
  const unfiled = assignments.filter(row => !sections.some(section => section.id === row.sectionId))
  const add = coursePath(course) + '/assignments/new'
  const sectionCards = [...sections, ...((unfiled.length || !sections.length) ? [{ id: null, title: 'Activities' }] : [])]
  return <Heading title={titleOf(course)} subtitle={course.shortName} actions={<Go className="button" to={add}><Icon name="plus" /> Add assignment</Go>}>
    <CourseTabs course={course} />
    <div className="stack">
      <div className="panel details">
        {course.summary && <p className="text-block">{course.summary}</p>}
        <dl><div><dt>Category</dt><dd>{find(state.categories, course.categoryId)?.name || 'Uncategorised'}</dd></div><div><dt>Starts</dt><dd>{dateLabel(course.startDate)}</dd></div><div><dt>Ends</dt><dd>{course.endDate ? dateLabel(course.endDate) : 'No end date'}</dd></div><div><dt>Visibility</dt><dd><Badge tone={visible(course) ? 'success' : 'neutral'}>{visible(course) ? 'Visible' : 'Hidden'}</Badge></dd></div></dl>
      </div>
      {sectionCards.map(section => {
        const activities = section.id === null ? unfiled : assignments.filter(row => row.sectionId === section.id)
        return <section className="panel" key={section.id ?? 'unfiled'}>
          <header className="section-head"><h2>{section.title || 'Section'}</h2><Go to={add + (section.id ? '?section=' + encodeURIComponent(section.id) : '')}>Add assignment</Go></header>
          {activities.length ? activities.map(assignment => <Go className="dashboard-row" to={assignmentPath(assignment)} key={assignment.id}><span className="icon-tile"><Icon name="work" /></span><span className="grow"><strong>{assignment.title || 'Untitled assignment'}</strong><small>{assignment.dueAt ? 'Due ' + dateLabel(assignment.dueAt, true) : 'No due date'}</small></span>{!visible(assignment) && <Badge>Hidden</Badge>}<Icon name="arrow" size={16} /></Go>) : <Empty>No assignments in this section.</Empty>}
        </section>
      })}
    </div>
  </Heading>
}

export function CourseSettings() {
  const { courseId } = useParams()
  const { state } = useWorkspace()
  const course = find(state.courses, courseId)
  if (courseId && !course) return <Missing title="Course unavailable" />
  return <CourseForm key={courseId ?? 'new'} course={course} />
}

function CourseForm({ course }) {
  const { state, commit, notify } = useWorkspace()
  const go = useGo()
  const [form, setForm] = useState({
    fullName: course?.fullName ?? '', shortName: course?.shortName ?? '', categoryId: course?.categoryId ?? '',
    summary: course?.summary ?? '', startDate: course?.startDate ?? '', endDate: course?.endDate ?? '',
    visibility: course?.visibility ?? 'visible',
  })
  const [errors, setErrors] = useState({})
  const categories = list(state.categories)
  const field = (key) => ({ value: form[key], onChange: event => {
    setForm({ ...form, [key]: event.target.value })
    setErrors({ ...errors, [key]: undefined })
  } })

  function submit(event) {
    event.preventDefault()
    const fullName = form.fullName.trim()
    const shortName = form.shortName.trim()
    const problems = {}
    if (!fullName) problems.fullName = 'Enter a full name.'
    if (!shortName) problems.shortName = 'Enter a short name.'
    else if (list(state.courses).some(row => row.id !== course?.id && row.shortName?.trim().toLowerCase() === shortName.toLowerCase())) problems.shortName = 'This short name is already in use.'
    if (!find(categories, form.categoryId)) problems.categoryId = 'Select a category.'
    if (!Number.isFinite(timestamp(form.startDate))) problems.startDate = 'Enter a start date.'
    if (form.endDate && (!Number.isFinite(timestamp(form.endDate)) || form.endDate < form.startDate)) problems.endDate = 'Enter an end date on or after the start date.'
    setErrors(problems)
    if (Object.keys(problems).length) return

    let saved
    commit((current, time) => {
      const courses = list(current.courses)
      const actor = current.account.userId
      const result = upsert(courses, find(courses, course?.id), {
        ...form, fullName, shortName, summary: form.summary.trim(), endDate: form.endDate || null,
      }, actor, time, 'crs')
      saved = result.changed
      if (course) return { ...current, courses: result.rows }
      return { ...current, courses: result.rows,
        courseSections: upsert(list(current.courseSections), null, { courseId: saved.id, title: 'General', position: 0 }, actor, time, 'sec').rows,
        enrolments: upsert(list(current.enrolments), null, { courseId: saved.id, userId: actor, role: 'teacher', status: 'active', method: 'manual' }, actor, time, 'enr').rows,
      }
    })
    notify(course ? 'Course settings saved.' : 'Course created.')
    go(coursePath(saved))
  }

  return <Heading title={course ? 'Course settings' : 'Create course'} subtitle={course && titleOf(course)}>
    {course && <CourseTabs course={course} />}
    <div className="form-panel"><form onSubmit={submit} noValidate>
      <Field label="Full name" error={errors.fullName}>{props => <input {...props} {...field('fullName')} required />}</Field>
      <Field label="Short name" error={errors.shortName}>{props => <input {...props} {...field('shortName')} required />}</Field>
      <Field label="Category" error={errors.categoryId}>{props => <select {...props} {...field('categoryId')} required><option value="">Select a category</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name || 'Uncategorised'}</option>)}</select>}</Field>
      <Field label="Summary">{props => <textarea {...props} {...field('summary')} />}</Field>
      <div className="form-grid">
        <Field label="Start date" error={errors.startDate}>{props => <input {...props} {...field('startDate')} type="date" required />}</Field>
        <Field label="End date" error={errors.endDate}>{props => <input {...props} {...field('endDate')} type="date" />}</Field>
      </div>
      <Field label="Visibility">{props => <select {...props} {...field('visibility')}><option value="visible">Visible</option><option value="hidden">Hidden</option></select>}</Field>
      <FormActions cancel={course ? coursePath(course) : '/courses'}><button type="submit">{course ? 'Save changes' : 'Create course'}</button></FormActions>
    </form></div>
  </Heading>
}

export function Participants() {
  const { courseId } = useParams()
  const { state, commit, notify } = useWorkspace()
  const [query, setQuery] = useState('')
  const [show, setShow] = useState(false)
  const course = find(state.courses, courseId)
  if (!course) return <Missing title="Course unavailable" />
  const rows = inCourse(state.enrolments, courseId)
  const participants = rows.map(row => ({ row, user: find(state.users, row.userId) }))
    .filter(({ user }) => matches(query, nameOf(user), user?.email)).sort((a, b) => byName(nameOf(a.user), nameOf(b.user)))
  const eligible = list(state.users).filter(user => user.role === 'student'
    && !rows.some(row => row.userId === user.id && (active(row) || row.role !== 'student')))
    .sort((a, b) => byName(nameOf(a), nameOf(b)))

  function saveEnrolments(ids) {
    commit((current, time) => {
      let enrolments = list(current.enrolments)
      for (const userId of ids) {
        const row = enrolments.find(value => value.courseId === courseId && value.userId === userId)
        enrolments = upsert(enrolments, row, { courseId, userId, status: 'active', role: 'student', method: 'manual' }, current.account.userId, time, 'enr').rows
      }
      return { ...current, enrolments }
    })
    setShow(false)
    notify(ids.length === 1 ? 'Learner enrolled.' : ids.length + ' learners enrolled.')
  }

  function changeStatus(row) {
    const status = active(row) ? 'suspended' : 'active'
    commit((current, time) => {
      const rows = list(current.enrolments)
      const currentRow = find(rows, row.id)
      return { ...current, enrolments: upsert(rows, currentRow, { status }, current.account.userId, time, 'enr').rows }
    })
    notify(status === 'active' ? 'Enrolment restored.' : 'Enrolment suspended.')
  }

  return <Heading title="Participants" subtitle={titleOf(course)} actions={<button type="button" onClick={() => setShow(true)}><Icon name="people" /> Enrol users</button>}>
    <CourseTabs course={course} />
    <div className="panel filters"><Search label="Search participants" placeholder="Name or email" value={query} onChange={setQuery} /></div>
    <div className="panel table-scroll">{participants.length ? <table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
      <tbody>{participants.map(({ row, user }) => <tr key={row.id}><th scope="row">{nameOf(user)}</th><td>{user?.email || '—'}</td><td>{row.role === 'teacher' ? 'Teacher' : 'Student'}</td><td><Badge tone={active(row) ? 'success' : 'neutral'}>{active(row) ? 'Active' : 'Suspended'}</Badge></td><td>{row.role === 'student' && <button type="button" className="secondary" onClick={() => changeStatus(row)}>{active(row) ? 'Suspend enrolment' : 'Restore enrolment'}</button>}</td></tr>)}</tbody>
    </table> : <Empty>No participants match this search.</Empty>}</div>
    {show && <EnrolmentDialog eligible={eligible} close={() => setShow(false)} save={saveEnrolments} />}
  </Heading>
}

function EnrolmentDialog({ eligible, close, save }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const results = eligible.filter(user => matches(query, nameOf(user), user.email))
  return <Dialog title="Enrol users" onClose={close}><form className="form-fields" onSubmit={event => { event.preventDefault(); if (selected.length) save(selected) }}>
    <Search label="Find eligible students" placeholder="Name or email" value={query} onChange={setQuery} />
    {results.length ? <div className="selection-list">{results.map(user => <label key={user.id}><input type="checkbox" checked={selected.includes(user.id)}
      onChange={event => setSelected(event.target.checked ? [...selected, user.id] : selected.filter(id => id !== user.id))} /><span>{nameOf(user)}<small>{user.email}</small></span></label>)}</div> : <Empty>No eligible students match this search.</Empty>}
    <div className="actions"><button type="submit" disabled={!selected.length}>Enrol selected users{selected.length ? ' (' + selected.length + ')' : ''}</button><button type="button" className="secondary" onClick={close}>Cancel</button></div>
  </form></Dialog>
}
