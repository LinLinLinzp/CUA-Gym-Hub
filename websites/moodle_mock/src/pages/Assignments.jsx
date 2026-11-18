import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useWorkspace, upsert } from '../context/Workspace'
import { assignmentPath, byName, coursePath, courseWork, dateLabel, effective, find, inCourse, isScore, learnerPath, list, localDateTime, matches, nameOf, roster, submissionLabel, timestamp, visible } from '../data/views'
import { Badge, CourseTabs, Empty, Field, FormActions, Go, Heading, Icon, Missing, Nav, Pagination, Search, Select, useGo } from '../components/UI'
import { GradeEditor } from '../components/GradeEditor'

const titleOf = (assignment) => assignment.title || 'Untitled assignment'
const statusOptions = ['No submission', 'Draft', 'Needs grading', 'Graded']
const tone = (status) => status === 'Graded' ? 'success' : status === 'Needs grading' ? 'attention' : 'neutral'

function useAssignmentRoute() {
  const { courseId, assignmentId, userId } = useParams()
  const { state } = useWorkspace()
  return {
    course: find(state.courses, courseId),
    assignment: inCourse(state.assignments, courseId).find(row => row.id === assignmentId),
    courseId, assignmentId, userId,
  }
}

export function AssignmentIndex() {
  const { state } = useWorkspace()
  const [params] = useSearchParams()
  const gradingQueue = params.get('status') === 'needs-grading'
  const [query, setQuery] = useState('')
  const [courseId, setCourseId] = useState('')
  const [visibility, setVisibility] = useState('')
  const [sort, setSort] = useState('earliest')
  const [page, setPage] = useState(0)
  const courses = list(state.courses).sort((a, b) => byName(a.fullName, b.fullName))
  const rows = list(state.assignments).filter(assignment => find(courses, assignment.courseId)
    && matches(query, assignment.title) && (!courseId || assignment.courseId === courseId)
    && (!visibility || visible(assignment) === (visibility === 'visible')))
    .filter(assignment => {
      if (!gradingQueue) return true
      const { submissions, grades } = courseWork(state, assignment)
      return roster(state, assignment.courseId).some(({ userId }) => submissionLabel(submissions.get(userId), grades.get(userId)) === 'Needs grading')
    })
    .sort((a, b) => {
      const aDue = timestamp(a.dueAt)
      const bDue = timestamp(b.dueAt)
      if (Number.isFinite(aDue) !== Number.isFinite(bDue)) return Number.isFinite(aDue) ? -1 : 1
      return (sort === 'earliest' ? aDue - bDue : bDue - aDue) || byName(a.title, b.title)
    })
  const size = 12
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / size) - 1))
  const filter = (setter) => value => { setter(value); setPage(0) }

  return <Heading title="Assignments" subtitle={gradingQueue ? 'Assignments with submissions to grade.' : 'Review activities and deadlines across your courses.'} actions={gradingQueue && <Go className="button secondary" to="/assignments">Show all assignments</Go>}>
    <div className="panel filters">
      <Search label="Search assignments" placeholder="Assignment title" value={query} onChange={filter(setQuery)} />
      <Select label="Course" value={courseId} onChange={filter(setCourseId)}><option value="">All courses</option>{courses.map(course => <option key={course.id} value={course.id}>{course.fullName || course.shortName || 'Untitled course'}</option>)}</Select>
      <Select label="Visibility" value={visibility} onChange={filter(setVisibility)}><option value="">All visibility</option><option value="visible">Visible</option><option value="hidden">Hidden</option></Select>
      <Select label="Sort by" value={sort} onChange={filter(setSort)}><option value="earliest">Earliest due date</option><option value="latest">Latest due date</option></Select>
    </div>
    <div className="panel table-scroll">{rows.length ? <table><thead><tr><th scope="col">Assignment</th><th scope="col">Course</th><th scope="col">Due date</th><th scope="col">Visibility</th><th scope="col">Review</th></tr></thead>
      <tbody>{rows.slice(current * size, (current + 1) * size).map(assignment => <tr key={assignment.id}>
        <th scope="row"><Go to={assignmentPath(assignment)}>{titleOf(assignment)}</Go></th>
        <td><Go to={coursePath({ id: assignment.courseId })}>{find(courses, assignment.courseId)?.shortName || 'Course'}</Go></td>
        <td>{dateLabel(assignment.dueAt, true)}</td><td><Visibility row={assignment} /></td>
        <td><Go to={assignmentPath(assignment) + '/submissions' + (gradingQueue ? '?status=Needs+grading' : '')}>Submissions</Go></td></tr>)}</tbody>
    </table> : <Empty>No assignments match these filters.</Empty>}</div>
    <Pagination count={rows.length} size={size} page={current} setPage={setPage} label="assignments" />
  </Heading>
}

function Visibility({ row }) {
  return <Badge tone={visible(row) ? 'success' : 'neutral'}>{visible(row) ? 'Visible' : 'Hidden'}</Badge>
}

function AssignmentTabs({ assignment }) {
  const base = assignmentPath(assignment)
  return <nav className="tabs" aria-label="Assignment navigation"><Nav end to={base}>Assignment</Nav><Nav to={base + '/submissions'}>Submissions</Nav><Nav to={base + '/edit'}>Settings</Nav></nav>
}

function AssignmentDetails({ assignment }) {
  return <div className="panel details stack"><h2>Instructions</h2><p className="text-block">{assignment.instructions || 'No instructions provided.'}</p>
    <dl><div><dt>Opens</dt><dd>{dateLabel(assignment.opensAt, true)}</dd></div><div><dt>Due</dt><dd>{dateLabel(assignment.dueAt, true)}</dd></div><div><dt>Maximum points</dt><dd>{assignment.maxPoints ?? '—'}</dd></div><div><dt>Visibility</dt><dd><Visibility row={assignment} /></dd></div></dl>
  </div>
}

export function AssignmentDetail() {
  const { course, assignment } = useAssignmentRoute()
  const { state } = useWorkspace()
  if (!course || !assignment) return <Missing title="Assignment unavailable" to={course ? coursePath(course) : '/assignments'} />
  const { submissions, grades } = courseWork(state, assignment)
  const students = roster(state, course.id)
  const counts = students.reduce((result, { userId }) => {
    const status = submissionLabel(submissions.get(userId), grades.get(userId))
    result[status] = (result[status] ?? 0) + 1
    return result
  }, {})
  return <Heading title={titleOf(assignment)} subtitle={course.fullName} actions={<Go className="button" to={assignmentPath(assignment) + '/submissions'}>View submissions</Go>}>
    <AssignmentTabs assignment={assignment} />
    <div className="stack"><AssignmentDetails assignment={assignment} />
      <div className="panel details"><h2>Submission summary</h2><dl>{statusOptions.map(status => <div key={status}><dt>{status}</dt><dd>{counts[status] ?? 0}</dd></div>)}</dl></div>
    </div>
  </Heading>
}

export function AssignmentSettings() {
  const { course, assignment, assignmentId } = useAssignmentRoute()
  if (!course || (assignmentId && !assignment)) return <Missing title="Assignment unavailable" to={course ? coursePath(course) : '/courses'} />
  return <AssignmentForm key={assignmentId ?? course.id} course={course} assignment={assignment} />
}

function AssignmentForm({ course, assignment }) {
  const { state, commit, notify } = useWorkspace()
  const go = useGo()
  const [params] = useSearchParams()
  const sections = inCourse(state.courseSections, course.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const initialSection = assignment ? assignment.sectionId : params.get('section') || sections[0]?.id
  const [form, setForm] = useState({
    title: assignment?.title ?? '', instructions: assignment?.instructions ?? '',
    sectionId: find(sections, initialSection)?.id ?? '',
    opensAt: localDateTime(assignment?.opensAt), dueAt: localDateTime(assignment?.dueAt),
    maxPoints: assignment?.maxPoints ?? '100', visibility: assignment?.visibility ?? 'visible',
  })
  const [errors, setErrors] = useState({})
  const field = (key) => ({ value: form[key], onChange: event => {
    setForm({ ...form, [key]: event.target.value })
    setErrors({ ...errors, [key]: undefined })
  } })

  function submit(event) {
    event.preventDefault()
    const problems = {}
    const title = form.title.trim()
    const maxPoints = Number(form.maxPoints)
    const opens = timestamp(form.opensAt)
    const due = timestamp(form.dueAt)
    if (!title) problems.title = 'Enter an assignment title.'
    if (form.sectionId && !find(sections, form.sectionId)) problems.sectionId = 'Select a section in this course.'
    if (!isScore(maxPoints) || maxPoints <= 0) problems.maxPoints = 'Enter maximum points greater than zero.'
    if (form.opensAt && !Number.isFinite(opens)) problems.opensAt = 'Enter a valid opening time.'
    if (form.dueAt && (!Number.isFinite(due) || due < opens)) problems.dueAt = 'Enter a due time on or after the opening time.'
    const existingItem = assignment && courseWork(state, assignment).item
    if (existingItem && inCourse(state.grades, course.id).some(row => row.gradeItemId === existingItem.id && (row.score > maxPoints || row.override?.score > maxPoints))) {
      problems.maxPoints = 'Maximum points cannot be lower than a stored score or override.'
    }
    setErrors(problems)
    if (Object.keys(problems).length) return
    let saved
    commit((current, time) => {
      const assignments = list(current.assignments)
      const actor = current.account.userId
      const result = upsert(assignments, find(assignments, assignment?.id), {
        courseId: course.id, title, sectionId: form.sectionId || null, instructions: form.instructions.trim(),
        opensAt: Number.isFinite(opens) ? new Date(opens).toISOString() : null,
        dueAt: Number.isFinite(due) ? new Date(due).toISOString() : null,
        maxPoints, visibility: form.visibility, submissionType: 'online_text',
      }, actor, time, 'asn')
      saved = result.changed
      const gradeItems = list(current.gradeItems)
      const item = gradeItems.find(row => row.courseId === course.id && row.assignmentId === saved.id)
      return { ...current, assignments: result.rows, gradeItems: upsert(gradeItems, item, {
        courseId: course.id, assignmentId: saved.id, type: 'assignment', name: title, maxPoints, visibility: form.visibility,
      }, actor, time, 'item').rows }
    })
    notify(assignment ? 'Assignment settings saved.' : 'Assignment created.')
    go(assignmentPath(saved))
  }

  return <Heading title={assignment ? 'Assignment settings' : 'Add assignment'} subtitle={assignment ? titleOf(assignment) : course.fullName}>
    {assignment ? <AssignmentTabs assignment={assignment} /> : <CourseTabs course={course} />}
    <div className="form-panel"><form onSubmit={submit} noValidate>
      <Field label="Title" error={errors.title}>{props => <input {...props} {...field('title')} required />}</Field>
      <Field label="Instructions">{props => <textarea {...props} {...field('instructions')} />}</Field>
      <Field label="Section" error={errors.sectionId}>{props => <select {...props} {...field('sectionId')}><option value="">Activities (no section)</option>{sections.map(section => <option key={section.id} value={section.id}>{section.title || 'Section'}</option>)}</select>}</Field>
      <div className="form-grid"><Field label="Opens at" error={errors.opensAt}>{props => <input {...props} {...field('opensAt')} type="datetime-local" step="any" />}</Field>
        <Field label="Due at" error={errors.dueAt}>{props => <input {...props} {...field('dueAt')} type="datetime-local" step="any" />}</Field></div>
      <div className="form-grid"><Field label="Maximum points" error={errors.maxPoints}>{props => <input {...props} {...field('maxPoints')} type="number" step="any" required />}</Field>
        <Field label="Visibility">{props => <select {...props} {...field('visibility')}><option value="visible">Visible</option><option value="hidden">Hidden</option></select>}</Field></div>
      <FormActions cancel={assignment ? assignmentPath(assignment) : coursePath(course)}><button type="submit">{assignment ? 'Save changes' : 'Create assignment'}</button></FormActions>
    </form></div>
  </Heading>
}

export function Submissions() {
  const { course, assignment } = useAssignmentRoute()
  if (!course || !assignment) return <Missing title="Assignment unavailable" to={course ? coursePath(course) : '/assignments'} />
  return <SubmissionRoster key={assignment.id} course={course} assignment={assignment} />
}

function SubmissionRoster({ course, assignment }) {
  const { state } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const filter = params.get('status') ?? ''
  const [editor, edit] = useState(null)
  const { item, submissions, grades } = courseWork(state, assignment)
  const rows = roster(state, course.id).map(row => {
    const submission = submissions.get(row.userId)
    const grade = grades.get(row.userId)
    return { ...row, submission, grade, status: submissionLabel(submission, grade) }
  }).filter(row => matches(query, nameOf(row.user), row.user?.email) && (!filter || filter === row.status))

  function changeStatus(value) {
    const next = new URLSearchParams(params)
    if (value) next.set('status', value)
    else next.delete('status')
    setParams(next, { replace: true })
  }

  return <Heading title="Submissions" subtitle={titleOf(assignment)} actions={<Go className="button secondary" to={coursePath(course) + '/grades'}><Icon name="grade" /> Gradebook</Go>}>
    <AssignmentTabs assignment={assignment} />
    <div className="panel filters"><Search label="Search students" placeholder="Name or email" value={query} onChange={setQuery} />
      <Select label="Submission status" value={filter} onChange={changeStatus}><option value="">All statuses</option>{statusOptions.map(status => <option key={status}>{status}</option>)}</Select>
    </div>
    <div className="panel table-scroll">{rows.length ? <table><thead><tr><th scope="col">Student</th><th scope="col">Status</th><th scope="col">Submitted</th><th scope="col">Effective score</th><th scope="col">Actions</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><th scope="row">{nameOf(row.user)}</th><td><Badge tone={tone(row.status)}>{row.status}</Badge> {row.submission?.late && <Badge tone="attention">Late</Badge>}</td>
        <td>{row.submission?.submittedAt ? dateLabel(row.submission.submittedAt, true) : '—'}</td><td>{effective(row.grade)?.score ?? '—'} {row.grade?.override && <Badge tone="attention">Override</Badge>}</td>
        <td><div className="actions">{item && row.submission?.status === 'submitted' && <button type="button" onClick={() => edit(row)} aria-label={'Grade ' + nameOf(row.user)}>Grade</button>}
          <Go className="button secondary" to={learnerPath(assignment, row.userId)} aria-label={'Open learner workspace for ' + nameOf(row.user)}>Open learner workspace</Go></div></td>
      </tr>)}</tbody>
    </table> : <Empty>No students match these filters.</Empty>}</div>
    {editor && <GradeEditor item={item} studentId={editor.userId} user={editor.user} submission={editor.submission} onClose={() => edit(null)} />}
  </Heading>
}

function learnerAccess(state, course, assignment, userId, now) {
  if (!course || !assignment || !visible(course) || !visible(assignment)
    || !roster(state, course.id).some(row => row.userId === userId && row.user)) return 'This assignment is unavailable to this learner.'
  if (timestamp(assignment.opensAt) > now) return 'This assignment opens ' + dateLabel(assignment.opensAt, true) + '.'
  return null
}

export function Learner() {
  const { course, assignment, userId } = useAssignmentRoute()
  const { state } = useWorkspace()
  const issue = learnerAccess(state, course, assignment, userId, new Date().getTime())
  if (issue) return <Missing title="Learner workspace unavailable" to={assignment ? assignmentPath(assignment) + '/submissions' : '/assignments'}>{issue}</Missing>
  return <LearnerForm key={assignment.id + ':' + userId} course={course} assignment={assignment} userId={userId} />
}

function LearnerForm({ course, assignment, userId }) {
  const { state, commit, notify } = useWorkspace()
  const { item, submissions, grades } = courseWork(state, assignment)
  const submission = submissions.get(userId)
  const grade = item && visible(item) ? effective(grades.get(userId)) : null
  const [text, setText] = useState(submission?.text ?? '')
  const [error, setError] = useState('')
  const submitted = submission?.status === 'submitted'

  function save(status) {
    if (!text.trim()) {
      setError('Enter your response before saving or submitting.')
      return
    }
    const changed = commit((current, time) => {
      const currentCourse = find(current.courses, course.id)
      const currentAssignment = inCourse(current.assignments, course.id).find(row => row.id === assignment.id)
      if (learnerAccess(current, currentCourse, currentAssignment, userId, timestamp(time))) return current
      const rows = list(current.submissions)
      const previous = rows.find(row => row.courseId === course.id && row.assignmentId === assignment.id && row.studentId === userId)
      if (previous?.status === 'submitted') return current
      const submittedAt = status === 'submitted' ? time : null
      return { ...current, submissions: upsert(rows, previous, {
        courseId: course.id, assignmentId: assignment.id, studentId: userId, text: text.trim(), status, submittedAt,
        late: Boolean(submittedAt && timestamp(time) > timestamp(currentAssignment.dueAt)),
      }, userId, time, 'sub').rows }
    })
    if (changed) notify(status === 'draft' ? 'Draft saved.' : 'Submitted for grading.')
    else setError('This assignment is no longer accepting changes from this learner.')
  }

  return <Heading title={titleOf(assignment)} subtitle={'Learner workspace · ' + nameOf(find(state.users, userId))} actions={<Go className="button secondary" to={assignmentPath(assignment) + '/submissions'}>Back to submissions</Go>}>
    <div className="stack"><AssignmentDetails assignment={assignment} />
      <div className="form-panel stack">
        <div className="card-meta"><h2>Your submission</h2><span><Badge tone={submitted ? 'success' : 'neutral'}>{submitted ? 'Submitted' : submission ? 'Draft' : 'No submission'}</Badge> {submission?.late && <Badge tone="attention">Late</Badge>}</span></div>
        {submitted ? <p className="text-block">{submission.text || 'No text available.'}</p> : <form onSubmit={event => { event.preventDefault(); save('submitted') }} noValidate>
          <Field label="Online text" error={error}>{props => <textarea {...props} value={text} onChange={event => { setText(event.target.value); setError('') }} />}</Field>
          <div className="actions"><button type="button" className="secondary" onClick={() => save('draft')}>Save draft</button><button type="submit">Submit for grading</button></div>
        </form>}
        {grade && (isScore(grade.score) || grade.feedback) && <div className="panel details stack"><h3>Grade and feedback</h3><p>{grade.score ?? '—'} / {item.maxPoints ?? '—'} points</p>{grade.feedback && <p className="text-block">{grade.feedback}</p>}</div>}
      </div>
    </div>
  </Heading>
}
