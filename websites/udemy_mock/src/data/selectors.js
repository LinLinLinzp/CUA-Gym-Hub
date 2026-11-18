export const rows = (value) => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : []
export const ids = (value) => Array.isArray(value) ? value : []
export const byId = (value, id) => rows(value).find(row => row.id === id)
export const isActive = (record) => Boolean(record && record.status !== 'deleted')
export const position = (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)
export const nextPosition = (records) => Math.max(0, ...records.map(record => Number(record.position) || 0)) + 1
export const time = (value) => Date.parse(value) || 0
export const compareText = (a, b) => String(a || '').localeCompare(String(b || ''))
export const searchable = (value) => String(value ?? '').toLocaleLowerCase()
export const matches = (query, ...values) => values.some(value => searchable(value).includes(searchable(query).trim()))
export const actorId = (state) => state.account?.profileId
export const profileName = (state, id, fallback = 'Community member') => byId(state.profiles, id)?.name || fallback
export const ownedCourses = (state) => rows(state.courses).filter(course => course.instructorId === actorId(state))
export const learnerEnrollments = (state) => rows(state.enrollments).filter(row => row.profileId === actorId(state))
export const enrollmentFor = (state, courseId) => learnerEnrollments(state).find(row => row.courseId === courseId)
export const learnerLists = (state) => rows(state.courseLists).filter(row => row.profileId === actorId(state) && isActive(row))
export const sectionsFor = (state, courseId) => rows(state.sections).filter(section => section.courseId === courseId).sort(position)
export const lessonsFor = (state, sectionId) => rows(state.lectures).filter(lecture => lecture.sectionId === sectionId).sort(position)
export const curriculumFor = (state, courseId) => sectionsFor(state, courseId).map(section => ({
  ...section, lessons: lessonsFor(state, section.id),
}))
export const completedIds = (enrollment, lessons) => {
  const valid = new Set(lessons.map(lesson => lesson.id))
  return [...new Set(ids(enrollment?.completedLectureIds).filter(id => valid.has(id)))]
}
export function progressFor(enrollment, lessons) {
  const done = completedIds(enrollment, lessons).length
  return { done, total: lessons.length, percent: lessons.length ? Math.round(100 * done / lessons.length) : 0 }
}
export const repliesFor = (state, questionId) => rows(state.answers)
  .filter(answer => answer.questionId === questionId && isActive(answer))
  .sort((a, b) => time(a.createdAt) - time(b.createdAt))
export const topAnswer = (question, replies) => replies.find(answer => answer.id === question.topAnswerId)
export const questionFlag = (state, key, questionId) => rows(state[key]).find(row => (
  row.questionId === questionId && row.profileId === actorId(state)
))
export const statusLabel = (status) => ({ draft: 'Draft', published: 'Published', in_review: 'In review', archived: 'Archived' })[status] || 'Active'
export function relativeDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date unavailable'
  const days = Math.round((Date.parse(value) - new Date().getTime()) / 86400000)
  if (Math.abs(days) < 7) return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(days || 0, 'day')
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}
