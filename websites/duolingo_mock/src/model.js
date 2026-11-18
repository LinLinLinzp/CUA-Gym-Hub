export const records = (value) => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : []
export const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback
export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase()
export const matches = (query, ...fields) => {
  const term = query.trim().toLowerCase()
  return fields.some(field => String(field ?? '').toLowerCase().includes(term))
}
export const newId = (prefix) => prefix + '-' + crypto.randomUUID()
export const courseName = course => course?.name || 'Untitled course'
export const goalName = goal => goal?.label || 'Untitled goal'
export const questName = quest => quest?.title || 'Friends Quest'
export const friendName = friend => friend?.displayName || friend?.username || 'Partner unavailable'
export const metricName = metric => ({ xp: 'XP', lessons: 'lessons', perfect_lessons: 'perfect lessons' })[metric] || 'progress'

export function enrollmentFor(state, courseId) {
  return records(state.enrollments).find(row => row.courseId === courseId)
}

export function activeCourse(state) {
  const courses = records(state.courses)
  const enrolled = records(state.enrollments).filter(row => row.status === 'enrolled')
  const course = courses.find(row => row.id === state.profile.activeCourseId && enrolled.some(entry => entry.courseId === row.id))
  if (course) return course
  for (const entry of enrolled) {
    const fallback = courses.find(row => row.id === entry.courseId)
    if (fallback) return fallback
  }
  return null
}

export function courseLessons(state, courseId) {
  return records(state.lessons).filter(row => row.courseId === courseId)
    .sort((a, b) => number(a.order) - number(b.order))
}

export function playable(lesson) {
  return typeof lesson?.prompt === 'string' && Array.isArray(lesson.options) && lesson.options.length > 1
    && Number.isInteger(lesson.answerIndex) && lesson.answerIndex >= 0 && lesson.answerIndex < lesson.options.length
}

export function nextLesson(state, enrollment) {
  if (!enrollment) return undefined
  const completed = new Set(records(state.lessonAttempts)
    .filter(row => row.enrollmentId === enrollment.id && number(row.run, 1) === number(enrollment.run, 1) && row.status === 'completed')
    .map(row => row.lessonId))
  const summaryCount = number(enrollment.lessonsCompleted)
  const firstIndex = summaryCount > completed.size ? summaryCount : 0
  return courseLessons(state, enrollment.courseId).find((lesson, index) =>
    index >= firstIndex && !completed.has(lesson.id) && playable(lesson))
}

export function displayDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isFinite(+date) ? new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date) : ''
}

export function goalPeriod(date, cadence) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  if (cadence === 'weekly') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + (cadence === 'weekly' ? 7 : 1))
  return { start, end }
}

export function goalSnapshot(state, goal, date = new Date(), historical = false) {
  let settings = goal
  if (historical) {
    const events = records(state.goalEvents).filter(row => row.goalId === goal.id).reverse()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    const event = events.find(row => {
      const { end } = goalPeriod(date, row.cadence || goal.cadence)
      return +new Date(row.createdAt) < +end
    })
    if (event) settings = { ...goal, ...event }
  }
  const metric = settings.metric || 'xp'
  const cadence = settings.cadence || 'daily'
  const { start, end } = goalPeriod(date, cadence)
  if (historical && Date.parse(goal.createdAt) >= +end) return null
  const amount = records(state.goalProgress).reduce((sum, row) => {
    const time = Date.parse(row.createdAt)
    return row.goalId === goal.id && row.metric === metric && time >= +start && time < +end ? sum + number(row.amount) : sum
  }, 0)
  const last = new Date(+end - 1)
  const period = cadence === 'weekly'
    ? displayDate(start) + ' – ' + displayDate(last)
    : displayDate(start)
  const target = number(settings.target)
  return { amount, target, metric, cadence, period, label: settings.label, complete: target > 0 && amount >= target }
}

export function questStatus(quest, now = new Date()) {
  if (quest.status !== 'active' && quest.status !== 'available') return quest.status || 'unavailable'
  if (quest.endsAt && Date.parse(quest.endsAt) <= +now) return 'expired'
  if (quest.startsAt && Date.parse(quest.startsAt) > +now) return 'upcoming'
  return quest.status
}

export function questProgress(state, quest, contributions = records(state.questContributions)) {
  let own = 0
  let partner = 0
  for (const row of contributions) {
    if (row.questId !== quest.id || row.metric !== quest.metric) continue
    if (row.actorId === state.profile.id) own += number(row.amount)
    else if (row.actorId === quest.partnerId) partner += number(row.amount)
  }
  return { own, partner, total: own + partner }
}

export function eligibleFriends(state) {
  return records(state.friends).filter(friend => friend.id && friend.id !== state.profile.id && friend.mutual && friend.eligible)
}

export function questPartner(state, quest) {
  return quest.partnerId ? records(state.friends).find(friend => friend.id === quest.partnerId) : undefined
}
