import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Badge, Confirm, courseGrades, coursePath, courseTitle, dateLabel, Drawer, eligibleGrade, Empty, enrolledStudents, Field, matches, records, Search, Select, SiteLink, statusLabel, studentName, titleOrder, useValidation } from './components.jsx'
import { categories, createItem, parsePoints, postGrades, saveGrade } from './gradeActions.js'
import { useStore } from './store.jsx'

const itemTitle = (item) => item.title || 'Untitled item'
const gradeStatus = (grade) => grade?.status || 'ungraded'
const pointsLabel = (value) => Number.isFinite(value) ? value : '—'
const gridLabel = (student, item, grade) => [
  studentName(student), itemTitle(item),
  pointsLabel(grade?.score) + ' of ' + pointsLabel(item.pointsPossible),
  statusLabel(gradeStatus(grade)),
].join(' · ')
const itemSorts = {
  title: (a, b) => titleOrder(itemTitle(a), itemTitle(b)),
  category: (a, b) => titleOrder(categories[a.category], categories[b.category]),
  dueOn: (a, b) => titleOrder(a.dueOn, b.dueOn),
  pointsPossible: (a, b) => (a.pointsPossible ?? 0) - (b.pointsPossible ?? 0),
}

export function GradeQueue() {
  const { state } = useStore()
  const courses = records(state.courses).sort((a, b) => titleOrder(a.title, b.title) || titleOrder(a.code, b.code))
  return <div className="stack"><h1>Grade Center</h1>
    {courses.length ? <div className="table-scroll"><table>
      <thead><tr><th scope="col">Course</th><th scope="col">Needs grading</th><th scope="col">Awaiting post</th></tr></thead>
      <tbody>{courses.map((course) => {
        const grades = courseGrades(state, course.id)
        return <tr key={course.id}><th scope="row"><SiteLink to={coursePath(course.id) + '/grade-center'}>{courseTitle(course)}</SiteLink><div className="mono muted">{course.code || '—'}</div></th>
          <td>{grades.filter((grade) => grade.status === 'needs_grading').length}</td><td>{grades.filter(eligibleGrade).length}</td></tr>
      })}</tbody>
    </table></div> : <Empty>No courses are available.</Empty>}
  </div>
}

function SortButton({ column, sort, change, children }) {
  const direction = sort.column === column ? sort.direction : 0
  return <button type="button" className="table-sort" onClick={() => change({ column, direction: direction === 1 ? -1 : 1 })}>
    {children}<span aria-hidden="true">{direction === 1 ? '↑' : direction === -1 ? '↓' : '↕'}</span></button>
}

function GradeValue({ item, grade }) {
  return <><span className="mono">{pointsLabel(grade?.score)} / {pointsLabel(item.pointsPossible)}</span><Badge status={gradeStatus(grade)} /></>
}

export function StudentGrades() {
  const course = useOutletContext()
  const { studentId } = useParams()
  const { state } = useStore()
  const student = enrolledStudents(state, course.id).find(({ id }) => id === studentId)
  const items = records(state.gradeItems).filter((item) => item.courseId === course.id).sort(itemSorts.title)
  const grades = new Map(courseGrades(state, course.id).filter((grade) => grade.studentId === studentId)
    .map((grade) => [grade.itemId, grade]))
  return <section className="compact">
    <div><SiteLink to={coursePath(course.id) + '/roster'}>Back to Roster</SiteLink></div>
    <h2>{student ? studentName(student) + ' · Grade summary' : 'Student unavailable'}</h2>
    {!student ? <Empty>This student is not enrolled in the course.</Empty> : items.length ?
      <div className="table-scroll"><table><thead><tr>
        <th scope="col">Item</th><th scope="col">Points</th><th scope="col">Status</th><th scope="col">Feedback</th>
      </tr></thead><tbody>{items.map((item) => {
        const grade = grades.get(item.id)
        return <tr key={item.id}>
          <th scope="row">{itemTitle(item)}</th><td className="mono">{pointsLabel(grade?.score)} / {pointsLabel(item.pointsPossible)}</td>
          <td><Badge status={gradeStatus(grade)} /></td><td className="message">{grade?.feedback || '—'}</td>
        </tr>
      })}</tbody></table></div> : <Empty>No grade items are available.</Empty>}
  </section>
}

function ManualItemForm({ course, close }) {
  const { commit } = useStore()
  const { errors, ref, validate } = useValidation()
  function submit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const title = values.get('title').trim()
    const pointsPossible = parsePoints(values.get('pointsPossible'))
    const issues = {}
    if (!title) issues.title = 'Enter a title.'
    if (pointsPossible === null || pointsPossible <= 0) issues.pointsPossible = 'Enter positive points with up to two decimal places.'
    if (!validate(issues)) return
    const fields = { title, pointsPossible, description: values.get('description').trim(), category: values.get('category'), dueOn: values.get('dueOn') || null }
    if (commit((state, meta) => createItem(state, meta, course.id, fields), 'Grade item added.')) close()
  }
  return <Drawer title="Add Item" close={close} wide>
    <form ref={ref} className="compact" onSubmit={submit} noValidate>
      <Field label="Title" error={errors.title}><input name="title" required aria-invalid={Boolean(errors.title)} /></Field>
      <Field label="Description"><textarea name="description" /></Field>
      <Field label="Category"><select name="category">
        {Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></Field>
      <Field label="Due date (optional)"><input type="date" name="dueOn" /></Field>
      <Field label="Points possible" error={errors.pointsPossible}><input name="pointsPossible" inputMode="decimal" required aria-invalid={Boolean(errors.pointsPossible)} /></Field>
      <div className="actions"><button type="submit" className="primary">Save item</button><button type="button" onClick={close}>Cancel</button></div>
    </form>
  </Drawer>
}

function GradeEditor({ course, item, student, grade, close }) {
  const { commit } = useStore()
  const { errors, ref, validate } = useValidation()
  const [confirming, setConfirming] = useState(false)
  const initialScore = grade?.score ?? ''
  const initialFeedback = grade?.feedback ?? ''
  const [scoreText, setScoreText] = useState(String(initialScore))
  const [feedback, setFeedback] = useState(initialFeedback)
  const readOnly = course.access === 'complete'
  const validMaximum = Number.isFinite(item.pointsPossible)
  const canPost = !readOnly && grade && eligibleGrade(grade)
    && String(initialScore) === scoreText && initialFeedback === feedback
  function submit(event) {
    event.preventDefault()
    const score = parsePoints(scoreText)
    if (!validate(score === null || !validMaximum || score > item.pointsPossible
      ? { score: 'Enter points from 0 to ' + pointsLabel(item.pointsPossible) + ' with up to two decimal places.' } : {})) return
    if (commit((state, meta) => saveGrade(state, meta, course.id, item.id, student.id, score, feedback.trim()), 'Grade saved.')) close()
  }
  function post() {
    if (commit((state, meta) => postGrades(state, meta, course.id, item.id, grade.id), 'Grade posted.')) close()
    else setConfirming(false)
  }
  return <>
    <Drawer title="Grade details" close={close} wide>
      <form ref={ref} className="compact" onSubmit={submit} noValidate>
        <div><h2>{studentName(student)}</h2><p>{itemTitle(item)} · {pointsLabel(item.pointsPossible)} points possible</p></div>
        <Badge status={gradeStatus(grade)} />
        <Field label="Points earned" error={errors.score}><input name="score" inputMode="decimal" value={scoreText} required
          onChange={(event) => setScoreText(event.target.value)} readOnly={readOnly || !validMaximum} aria-invalid={Boolean(errors.score)} /></Field>
        <Field label="Feedback"><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} readOnly={readOnly || !validMaximum} /></Field>
        <div className="actions">
          {!readOnly && <button type="submit" className="primary" disabled={!validMaximum}>Save grade</button>}
          {canPost && <button type="button" onClick={() => setConfirming(true)}>Post Grade</button>}
          <button type="button" onClick={close}>{readOnly ? 'Done' : 'Cancel'}</button>
        </div>
      </form>
    </Drawer>
    {confirming && <Confirm title="Post grade?" confirmLabel="Post Grade" onConfirm={post} close={() => setConfirming(false)}>
      This will post 1 grade for {studentName(student)}.
    </Confirm>}
  </>
}

export function CourseGrades() {
  const course = useOutletContext()
  const { state, commit } = useStore()
  const [view, setView] = useState('grid')
  const [studentQuery, setStudentQuery] = useState('')
  const [itemQuery, setItemQuery] = useState('')
  const [category, setCategory] = useState('')
  const [studentSort, setStudentSort] = useState({ column: 'name', direction: 1 })
  const [itemSort, setItemSort] = useState({ column: 'title', direction: 1 })
  const [detailId, setDetailId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [adding, setAdding] = useState(false)
  const [batchId, setBatchId] = useState(null)
  const allItems = records(state.gradeItems).filter((item) => item.courseId === course.id)
  const allStudents = enrolledStudents(state, course.id)
  const readOnly = course.access === 'complete'
  const grades = courseGrades(state, course.id)
  const gradeByItem = new Map()
  for (const grade of grades) {
    if (!gradeByItem.has(grade.itemId)) gradeByItem.set(grade.itemId, new Map())
    gradeByItem.get(grade.itemId).set(grade.studentId, grade)
  }
  const at = (itemId, studentId) => gradeByItem.get(itemId)?.get(studentId)
  const pending = (itemId) => Array.from(gradeByItem.get(itemId)?.values() ?? []).filter(eligibleGrade).length
  const students = allStudents.filter((student) => matches(studentQuery, studentName(student), student.username))
    .sort((a, b) => studentSort.direction * (titleOrder(a.lastName, b.lastName) || titleOrder(studentName(a), studentName(b))))
  const items = allItems.filter((item) => matches(itemQuery, itemTitle(item)) && (!category || category === item.category))
    .sort((a, b) => itemSort.direction * (itemSorts[itemSort.column](a, b) || titleOrder(itemTitle(a), itemTitle(b))))
  const detail = allItems.find((item) => item.id === detailId)
  const editItem = allItems.find((item) => item.id === editor?.itemId)
  const editStudent = allStudents.find((student) => student.id === editor?.studentId)
  const edit = (item, student) => setEditor({ itemId: item.id, studentId: student.id })
  const showItem = (item) => { setView('items'); setDetailId(item.id) }
  function switchView(next) {
    setView(next)
    setDetailId(null)
  }
  function confirmBatch() {
    commit((current, meta) => postGrades(current, meta, course.id, batchId), 'Grades posted.')
    setBatchId(null)
  }
  const studentHeader = <th scope="col" className="student-column" aria-sort={studentSort.direction > 0 ? 'ascending' : 'descending'}>
    <SortButton column="name" sort={studentSort} change={setStudentSort}>Student</SortButton></th>
  const searchStudents = <Search label="Search students" value={studentQuery} onChange={setStudentQuery} placeholder="Name or username" />
  return <section className="stack">
    <header className="section-heading"><h2>Grade Center</h2><button type="button" className="primary" disabled={readOnly} onClick={() => setAdding(true)}>Add Item</button></header>
    {readOnly && <p className="meta">Reopen the course in Course Settings to change or post grades.</p>}
    <div className="tabs" aria-label="Grade Center views">
      <button type="button" aria-pressed={view === 'grid'} onClick={() => switchView('grid')}>Grades</button>
      <button type="button" aria-pressed={view === 'items'} onClick={() => switchView('items')}>Gradable Items</button>
    </div>
    {!detail && <div className="toolbar">
      {view === 'grid' && searchStudents}
      <Search label="Search items" value={itemQuery} onChange={setItemQuery} placeholder="Item title" />
      <Select label="Category" value={category} onChange={setCategory}><option value="">All categories</option>
        {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
    </div>}
    {view === 'grid' && (students.length && items.length ? <div className="table-scroll keyboard-scroll" tabIndex={0} role="region" aria-label="Grades grid"><table className="grade-grid">
      <thead><tr>{studentHeader}{items.map((item) => <th key={item.id} scope="col"><button type="button" className="table-sort" onClick={() => showItem(item)}>{itemTitle(item)}</button>
        <div className="mono muted">{pointsLabel(item.pointsPossible)} pts</div></th>)}</tr></thead>
      <tbody>{students.map((student) => <tr key={student.id}>
        <th scope="row" className="student-column">{studentName(student)}<div className="meta">{student.username || '—'}</div></th>
        {items.map((item) => <td key={item.id}><button type="button" className="grade-cell"
          aria-label={gridLabel(student, item, at(item.id, student.id))}
          onClick={() => edit(item, student)}><GradeValue item={item} grade={at(item.id, student.id)} /></button></td>)}
      </tr>)}</tbody>
    </table></div> : <Empty>{!items.length ? 'No grade items match this view.' : 'No enrolled students match this view.'}</Empty>)}
    {view === 'items' && !detail && (items.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Gradable items"><table>
      <thead><tr>{[['title', 'Item'], ['category', 'Category'], ['dueOn', 'Due date'], ['pointsPossible', 'Points']].map(([column, label]) =>
        <th key={column} scope="col" aria-sort={itemSort.column !== column ? 'none' : itemSort.direction > 0 ? 'ascending' : 'descending'}>
          <SortButton column={column} sort={itemSort} change={setItemSort}>{label}</SortButton></th>)}<th scope="col">Awaiting post</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.id}><th scope="row"><button type="button" className="text-button" onClick={() => showItem(item)}>{itemTitle(item)}</button></th>
        <td>{categories[item.category] || '—'}</td><td>{dateLabel(item.dueOn)}</td><td className="mono">{pointsLabel(item.pointsPossible)}</td><td>{pending(item.id)}</td></tr>)}</tbody>
    </table></div> : <Empty>No grade items match this view.</Empty>)}
    {view === 'items' && detail && <section className="compact">
      <div><button type="button" className="text-button" onClick={() => setDetailId(null)}>Back to Gradable Items</button></div>
      <div className="panel compact">
        <div className="section-heading"><h2>{itemTitle(detail)}</h2>
          <button type="button" className="primary" disabled={readOnly || !pending(detail.id)} onClick={() => setBatchId(detail.id)}>Post All Grades</button></div>
        <p className="meta">{pointsLabel(detail.pointsPossible)} points possible · {pending(detail.id)} awaiting post</p>
        {detail.description && <p className="message">{detail.description}</p>}
      </div>
      <div className="toolbar">{searchStudents}</div>
      {students.length ? <div className="table-scroll"><table><thead><tr>{studentHeader}<th scope="col">Points</th><th scope="col">Status</th></tr></thead>
        <tbody>{students.map((student) => {
          const grade = at(detail.id, student.id)
          return <tr key={student.id}><th scope="row"><button type="button" className="text-button" onClick={() => edit(detail, student)}>{studentName(student)}</button>
            <div className="meta">{student.username || '—'}</div></th>
            <td className="mono">{pointsLabel(grade?.score)} / {pointsLabel(detail.pointsPossible)}</td><td><Badge status={gradeStatus(grade)} /></td></tr>
        })}</tbody></table></div> : <Empty>No enrolled students match this view.</Empty>}
    </section>}
    {adding && <ManualItemForm course={course} close={() => setAdding(false)} />}
    {editItem && editStudent && <GradeEditor course={course} item={editItem} student={editStudent}
      grade={at(editItem.id, editStudent.id)} close={() => setEditor(null)} />}
    {batchId && <Confirm title="Post all grades?" confirmLabel="Post All Grades" onConfirm={confirmBatch} close={() => setBatchId(null)}>
      This will post {pending(batchId)} {pending(batchId) === 1 ? 'grade' : 'grades'} for the item.
    </Confirm>}
  </section>
}
