import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace, upsert } from '../context/Workspace'
import { byName, coursePath, effective, find, inCourse, isScore, list, matches, nameOf, roster, visible } from '../data/views'
import { Badge, CourseTabs, Empty, Field, FormActions, Go, Heading, Icon, Missing, Pagination, Search, Select, useGo } from '../components/UI'
import { GradeEditor } from '../components/GradeEditor'

const itemName = (item) => item.name || 'Untitled item'
const courseName = (course) => course.fullName || course.shortName || 'Untitled course'
const size = 12
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })

export function GradeIndex() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const courses = list(state.courses).filter(course => matches(query, course.fullName, course.shortName))
    .sort((a, b) => byName(courseName(a), courseName(b)))

  return <Heading title="Gradebook" subtitle="Choose a course to review scores and manage grade items.">
    <div className="panel filters"><Search label="Search courses" placeholder="Course name or code" value={query} onChange={value => { setQuery(value); setPage(0) }} /></div>
    <div className="panel table-scroll">{courses.length ? <table><thead><tr><th scope="col">Course</th><th scope="col">Code</th><th scope="col">Grade items</th><th scope="col">Report</th></tr></thead>
      <tbody>{courses.slice(page * size, (page + 1) * size).map(course => <tr key={course.id}><th scope="row"><Go to={coursePath(course) + '/grades'}>{courseName(course)}</Go></th><td>{course.shortName || '—'}</td>
        <td>{inCourse(state.gradeItems, course.id).length}</td><td><Go to={coursePath(course) + '/grades'}>Grader report</Go></td></tr>)}</tbody>
    </table> : <Empty>No courses match this search.</Empty>}</div>
    <Pagination count={courses.length} size={size} page={page} setPage={setPage} label="courses" />
  </Heading>
}

function itemKind(item) {
  return item.assignmentId ? 'Assignment' : 'Manual item'
}

function itemVisibility(item) {
  return visible(item) ? 'Visible' : 'Hidden'
}

function csvText(value) {
  let text = String(value ?? '')
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

function exportGradebook(course, students, items, getGrade) {
  const columns = ['Student ID', 'Student', ...items.map(itemName)].map(csvText)
  const records = students.map(({ userId, user }) => {
    const scores = items.map(item => {
      const value = effective(getGrade(userId, item.id))?.score
      return isScore(value) ? String(value) : ''
    })
    return [csvText(userId), csvText(nameOf(user)), ...scores].join(',')
  })
  const file = new Blob([[columns.join(','), ...records].join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = (course.shortName || course.id).replace(/[^a-zA-Z0-9_-]+/g, '-') + '-gradebook.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function GradeReport() {
  const { courseId } = useParams()
  const { state } = useWorkspace()
  const course = find(state.courses, courseId)
  if (!course) return <Missing title="Course unavailable" to="/grades" />
  return <Report key={courseId} course={course} />
}

function Report({ course }) {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [itemFilter, setItemFilter] = useState('')
  const [page, setPage] = useState(0)
  const [editor, edit] = useState(null)
  const items = inCourse(state.gradeItems, course.id)
  const displayed = items.filter(item => !itemFilter || item.id === itemFilter)
  const enrolled = roster(state, course.id)
  const students = enrolled.filter(({ user }) => matches(query, nameOf(user), user?.email))
  const current = Math.min(page, Math.max(0, Math.ceil(students.length / size) - 1))
  const grades = new Map()
  for (const grade of inCourse(state.grades, course.id)) {
    if (!grades.has(grade.studentId)) grades.set(grade.studentId, new Map())
    grades.get(grade.studentId).set(grade.gradeItemId, grade)
  }
  const getGrade = (studentId, itemId) => grades.get(studentId)?.get(itemId)
  const base = coursePath(course) + '/grades'

  function total(studentId) {
    let score = 0
    let maximum = 0
    for (const item of items) {
      const value = effective(getGrade(studentId, item.id))?.score
      if (!isScore(value) || !isScore(item.maxPoints) || item.maxPoints <= 0) continue
      score += value
      maximum += item.maxPoints
    }
    return maximum ? percent.format(score / maximum) : '—'
  }

  return <Heading title="Grader report" subtitle={courseName(course)} actions={<><button className="secondary" type="button" onClick={() => exportGradebook(course, enrolled, items, getGrade)}>Export CSV</button><Go className="button" to={base + '/setup'}><Icon name="grade" /> Gradebook setup</Go></>}>
    <CourseTabs course={course} />
    <div className="panel filters">
      <Search label="Search students" placeholder="Name or email" value={query} onChange={value => { setQuery(value); setPage(0) }} />
      <Select label="Grade item" value={itemFilter} onChange={setItemFilter}><option value="">All grade items</option>{items.map(item => <option key={item.id} value={item.id}>{itemName(item)}</option>)}</Select>
    </div>
    {!items.length && <div className="panel"><Empty>No grade items yet. Add one in Gradebook setup or through a course assignment.</Empty></div>}
    <div className="panel table-scroll">{students.length ? <table className="grade-table"><thead><tr><th scope="col">Student</th><th scope="col">Course total</th>{displayed.map(item => <th scope="col" key={item.id}>
      {itemName(item)}<small>{item.maxPoints ?? '—'} points · {itemKind(item)}</small>{!visible(item) && <Badge>Hidden</Badge>}</th>)}</tr></thead>
      <tbody>{students.slice(current * size, (current + 1) * size).map(({ id, userId, user }) => <tr key={id}><th scope="row">{nameOf(user)}<small>{user?.email}</small></th><td>{total(userId)}</td>
        {displayed.map(item => {
          const grade = getGrade(userId, item.id)
          const value = effective(grade)?.score
          return <td key={item.id}><div className="grade-cell"><strong>{isScore(value) ? value : '—'}</strong>{grade?.override && <Badge tone="attention">Override</Badge>}</div>
            <button type="button" className="secondary" onClick={() => edit({ item, userId, user })} aria-label={'Edit grade for ' + nameOf(user) + ' · ' + itemName(item)}>Edit grade</button></td>
        })}</tr>)}</tbody>
    </table> : <Empty>No active students match this search.</Empty>}</div>
    <Pagination count={students.length} size={size} page={current} setPage={setPage} label="students" />
    {editor && <GradeEditor item={editor.item} studentId={editor.userId} user={editor.user} onClose={() => edit(null)} />}
  </Heading>
}

export function GradeSetup() {
  const { courseId } = useParams()
  const { state } = useWorkspace()
  const course = find(state.courses, courseId)
  if (!course) return <Missing title="Course unavailable" to="/grades" />
  return <SetupForm key={courseId} course={course} />
}

function SetupForm({ course }) {
  const { state, commit, notify } = useWorkspace()
  const go = useGo()
  const [name, setName] = useState('')
  const [maximum, setMaximum] = useState('100')
  const [visibility, setVisibility] = useState('visible')
  const [errors, setErrors] = useState({})
  const items = inCourse(state.gradeItems, course.id)
  const base = coursePath(course) + '/grades'

  function save(event) {
    event.preventDefault()
    const title = name.trim()
    const maxPoints = Number(maximum)
    const problems = {}
    if (!title) problems.name = 'Enter an item title.'
    if (!isScore(maxPoints) || maxPoints <= 0) problems.maximum = 'Enter maximum points greater than zero.'
    setErrors(problems)
    if (Object.keys(problems).length) return
    commit((current, time) => ({ ...current, gradeItems: upsert(list(current.gradeItems), null, {
      courseId: course.id, assignmentId: null, type: 'manual', name: title, maxPoints, visibility,
    }, current.account.userId, time, 'item').rows }))
    notify('Manual grade item created.')
    go(base)
  }

  return <Heading title="Gradebook setup" subtitle={courseName(course)} actions={<Go className="button secondary" to={base}>Grader report</Go>}>
    <CourseTabs course={course} />
    <div className="stack">
      <div className="panel table-scroll">{items.length ? <table><thead><tr><th scope="col">Item</th><th scope="col">Type</th><th scope="col">Maximum points</th><th scope="col">Visibility</th></tr></thead>
        <tbody>{items.map(item => <tr key={item.id}><th scope="row">{itemName(item)}</th><td>{itemKind(item)}</td><td>{item.maxPoints ?? '—'}</td><td><Badge tone={visible(item) ? 'success' : 'neutral'}>{itemVisibility(item)}</Badge></td></tr>)}</tbody>
      </table> : <Empty>No grade items in this course.</Empty>}</div>
      <section className="form-panel stack"><h2>Add manual grade item</h2><form onSubmit={save} noValidate>
        <Field label="Item title" error={errors.name}>{props => <input {...props} value={name} required onChange={event => { setName(event.target.value); setErrors({ ...errors, name: undefined }) }} />}</Field>
        <div className="form-grid">
          <Field label="Maximum points" error={errors.maximum}>{props => <input {...props} type="number" step="any" required value={maximum} onChange={event => { setMaximum(event.target.value); setErrors({ ...errors, maximum: undefined }) }} />}</Field>
          <Field label="Visibility">{props => <select {...props} value={visibility} onChange={event => setVisibility(event.target.value)}><option value="visible">Visible</option><option value="hidden">Hidden</option></select>}</Field>
        </div>
        <FormActions cancel={base}><button type="submit">Create grade item</button></FormActions>
      </form></section>
    </div>
  </Heading>
}
