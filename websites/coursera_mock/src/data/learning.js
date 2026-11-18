const asArray = value => Array.isArray(value) ? value : []
export const list = value => asArray(value).filter(Boolean)
export const byId = (items, id) => list(items).find(item => item.id === id)
export const validId = id => typeof id === 'string' && id.length > 0
export const own = (state, key) => validId(state.learner?.id)
  ? list(state[key]).filter(row => row.learnerId === state.learner.id)
  : []
export const enrollmentFor = (state, courseId) => own(state, 'enrollments').find(row => row.courseId === courseId)
export const certificateFor = (state, courseId) => own(state, 'certificates').find(row => row.courseId === courseId && row.status === 'issued')
export const active = enrollment => enrollment?.status === 'in_progress'
export const hasAccess = enrollment => active(enrollment) || enrollment?.status === 'completed'

export function outline(state, course) {
  const modules = list(course?.modules).map(module => {
    const entries = [['lesson', module.lessonIds, state.lessons], ['assignment', module.assignmentIds, state.assignments]]
    return {
      ...module,
      requirements: entries.flatMap(([kind, ids, records]) => asArray(ids).map(id => ({
        id, kind, item: list(records).find(row => row.id === id && row.courseId === course.id && validId(id)),
      }))),
    }
  })
  const unique = new Map(modules.flatMap(module => module.requirements.map(row => [row.kind + ':' + row.id, row])))
  return { modules, requirements: [...unique.values()] }
}

export function belongsTo(row, enrollment) {
  return row.enrollmentId === enrollment.id && row.learnerId === enrollment.learnerId && row.courseId === enrollment.courseId
}

export function attemptsFor(state, enrollment, assignmentId) {
  if (!enrollment) return []
  return list(state.assignmentAttempts).filter(row => belongsTo(row, enrollment) && row.assignmentId === assignmentId)
    .sort((a, b) => Number(b.attemptNumber || 0) - Number(a.attemptNumber || 0))
}

export function fulfilled(state, enrollment, requirement) {
  if (!enrollment || !requirement.item) return false
  if (requirement.kind === 'assignment') return attemptsFor(state, enrollment, requirement.id).some(row => row.status === 'passed')
  return list(state.lessonCompletions).some(row => belongsTo(row, enrollment) && row.lessonId === requirement.id && row.status === 'completed')
}

export function courseProgress(state, course, enrollment) {
  const requirements = outline(state, course).requirements
  const pending = requirements.filter(row => !fulfilled(state, enrollment, row))
  return {
    next: pending.find(row => row.item), missing: requirements.some(row => !row.item),
    ready: requirements.length > 0 && pending.length === 0,
    percent: requirements.length ? Math.round(100 * (requirements.length - pending.length) / requirements.length) : 0,
  }
}

export function usableQuiz(quiz) {
  const questions = list(quiz?.questions)
  return quiz?.type === 'quiz' && Number.isFinite(quiz.passingPercent) && quiz.passingPercent >= 0 && quiz.passingPercent <= 100
    && questions.length > 0 && questions.length === quiz.questions.length
    && new Set(questions.map(row => row.id)).size === questions.length
    && questions.every(question => {
      const options = list(question.options)
      return validId(question.id) && options.length > 1 && options.length === question.options.length
        && new Set(options.map(option => option.id)).size === options.length
        && options.every(option => validId(option.id))
        && options.some(option => option.id === question.correctOptionId)
    })
}

const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
const id = prefix => prefix + '-' + randomCode()
const replace = (state, key, record, patch) => ({ ...state, [key]: asArray(state[key]).map(row => row === record ? { ...row, ...patch } : row) })
const append = (state, key, row) => ({ ...state, [key]: [...asArray(state[key]), row] })

export function applyAction(state, action) {
  const learner = state.learner
  if (!validId(learner?.id)) return null
  const now = new Date().toISOString()
  const course = byId(state.courses, action.courseId)
  const enrollment = enrollmentFor(state, action.courseId)

  if (action.type === 'certificateAction') {
    const certificate = byId(state.certificates, action.certificateId)
    if (certificate?.learnerId !== learner.id || certificate.status !== 'issued') return null
    const details = action.fileName
      ? { type: 'download', fileName: action.fileName }
      : { type: 'copy_link', verificationPath: action.verificationPath }
    if (!details.fileName && !details.verificationPath) return null
    return append(state, 'certificateActions', {
      ...details, id: id('certificate-action'), learnerId: learner.id, certificateId: certificate.id,
      courseId: certificate.courseId, status: 'completed', createdAt: now,
    })
  }

  if (action.type === 'withdraw' && active(enrollment) && validId(enrollment.id)) {
    return replace(state, 'enrollments', enrollment, { status: 'withdrawn', withdrawnAt: now, updatedAt: now })
  }
  if (!validId(course?.id)) return null
  if (action.type === 'enroll' && !enrollment) {
    return append(state, 'enrollments', {
      id: id('enrollment'), learnerId: learner.id, courseId: course.id, status: 'in_progress',
      progressPercent: 0, createdAt: now, updatedAt: now,
    })
  }
  if (action.type === 'reenroll' && enrollment?.status === 'withdrawn' && validId(enrollment.id)) {
    return replace(state, 'enrollments', enrollment, { status: 'in_progress', withdrawnAt: null, reenrolledAt: now, updatedAt: now })
  }
  if (!active(enrollment) || !validId(enrollment.id)) return null

  const linked = { learnerId: learner.id, enrollmentId: enrollment.id, courseId: course.id }
  const requirements = outline(state, course).requirements
  let next
  if (action.type === 'completeLesson') {
    const requirement = requirements.find(row => row.kind === 'lesson' && row.id === action.lessonId)
    if (!list(requirement?.item?.paragraphs).length || fulfilled(state, enrollment, requirement)) return null
    next = append(state, 'lessonCompletions', {
      id: id('completion'), ...linked, lessonId: requirement.id, status: 'completed', createdAt: now,
    })
  }

  if (action.type === 'submitQuiz') {
    const requirement = requirements.find(row => row.kind === 'assignment' && row.id === action.assignmentId)
    const quiz = requirement?.item
    if (!usableQuiz(quiz)) return null
    const questions = list(quiz.questions)
    const answers = questions.map(question => ({ questionId: question.id, optionId: action.answers?.[question.id] }))
    if (answers.some((answer, index) => !list(questions[index].options).some(option => option.id === answer.optionId))) return null
    const exact = 100 * answers.filter((answer, index) => answer.optionId === questions[index].correctOptionId).length / questions.length
    const previous = attemptsFor(state, enrollment, quiz.id)
    if (previous.some(row => row.status === 'passed')) return null
    next = append(state, 'assignmentAttempts', {
      id: id('attempt'), ...linked, assignmentId: quiz.id, answers, attemptNumber: 1 + Math.max(0, ...previous.map(row => Number(row.attemptNumber) || 0)),
      scorePercent: Math.round(exact * 100) / 100, status: exact >= quiz.passingPercent ? 'passed' : 'failed', createdAt: now,
    })
  }

  if (action.type === 'finish') {
    if (!courseProgress(state, course, enrollment).ready) return null
    next = replace(state, 'enrollments', enrollment, { status: 'completed', progressPercent: 100, completedAt: now, updatedAt: now })
    if (course.certificateEligible && !own(state, 'certificates').some(row => row.courseId === course.id)) {
      return append(next, 'certificates', {
        id: id('certificate'), ...linked, courseTitle: course.title || 'Course', learnerName: learner.displayName || 'Learner',
        issuerName: course.issuerName || 'Coursera', verificationCode: 'CRS-' + randomCode().toUpperCase(),
        status: 'issued', createdAt: now,
      })
    }
    return next
  }
  if (!next) return null
  return replace(next, 'enrollments', enrollment, { progressPercent: courseProgress(next, course, enrollment).percent, updatedAt: now })
}
