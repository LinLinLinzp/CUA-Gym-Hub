export const active = (row) => (row.status ?? 'active') === 'active'
export const visible = (row) => (row.visibility ?? 'visible') === 'visible'
export const nameOf = (user) => user?.name || user?.email || 'Unknown user'
export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const find = (rows, id) => list(rows).find(row => row.id === id)
export const inCourse = (rows, courseId) => list(rows).filter(row => row.courseId === courseId)
export const matches = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const byName = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true })
export const isScore = (value) => typeof value === 'number' && Number.isFinite(value)
export const effective = (grade) => grade?.override ?? grade
export const timestamp = (value) => value ? Date.parse(value) : NaN
export const coursePath = (course) => '/courses/' + encodeURIComponent(course.id)
export const assignmentPath = (assignment) => coursePath({ id: assignment.courseId }) + '/assignments/' + encodeURIComponent(assignment.id)
export const learnerPath = (assignment, userId) => coursePath({ id: assignment.courseId }) + '/learner/' + encodeURIComponent(userId) + '/assignments/' + encodeURIComponent(assignment.id)

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export function dateLabel(value, withTime = false) {
  if (!Number.isFinite(timestamp(value))) return 'Unscheduled'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00' : value)
  return (withTime ? dateTime : day).format(date)
}

export function coursePeriod(course, now = new Date()) {
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  if (Number.isFinite(timestamp(course.startDate)) && course.startDate.slice(0, 10) > today) return 'future'
  if (Number.isFinite(timestamp(course.endDate)) && course.endDate.slice(0, 10) < today) return 'past'
  return 'current'
}

export function roster(state, courseId, includeSuspended = false) {
  return inCourse(state.enrolments, courseId).filter(row => row.role === 'student' && (includeSuspended || active(row)))
    .map(row => ({ ...row, user: find(state.users, row.userId) }))
    .sort((a, b) => byName(nameOf(a.user), nameOf(b.user)))
}

export function submissionLabel(submission, grade) {
  if (submission?.status === 'submitted') return isScore(grade?.score) ? 'Graded' : 'Needs grading'
  return submission?.status === 'draft' ? 'Draft' : 'No submission'
}

export function courseWork(state, assignment) {
  const item = inCourse(state.gradeItems, assignment.courseId).find(row => row.assignmentId === assignment.id)
  const submissions = new Map(inCourse(state.submissions, assignment.courseId)
    .filter(row => row.assignmentId === assignment.id).map(row => [row.studentId, row]))
  const grades = new Map(inCourse(state.grades, assignment.courseId)
    .filter(row => item && row.gradeItemId === item.id).map(row => [row.studentId, row]))
  return { item, submissions, grades }
}

export function localDateTime(value) {
  if (!Number.isFinite(timestamp(value))) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 23).replace(/:00\.000$/, '').replace(/\.000$/, '')
}
