import {
  byId, completedIds, curriculumFor, ids, isActive, lessonsFor, nextPosition, repliesFor, rows,
  sectionsFor,
} from './selectors.js'

function updateRecord(state, key, record, fields, meta) {
  if (Object.entries(fields).every(([field, value]) => Object.is(record[field], value))) return state
  return { ...state, [key]: state[key].map(row => row?.id === record.id ? { ...row, ...fields, ...meta } : row) }
}

function appendRecord(state, key, prefix, fields, meta) {
  const suffix = crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(4)).join('_')
  return {
    ...state,
    [key]: [...(Array.isArray(state[key]) ? state[key] : []), {
      id: prefix + '_' + suffix, ...fields, createdAt: meta.updatedAt, createdBy: meta.updatedBy, ...meta,
    }],
  }
}

export function changeEnrollment(state, meta, id, type, lectureId) {
  const enrollment = byId(state.enrollments, id)
  if (!enrollment || enrollment.profileId !== meta.updatedBy || !byId(state.courses, enrollment.courseId)) return state
  if (type === 'archive' || type === 'restore') {
    const status = type === 'archive' ? 'archived' : 'active'
    if (enrollment.status === status) return state
    return updateRecord(state, 'enrollments', enrollment, { status, archivedAt: status === 'archived' ? meta.updatedAt : null }, meta)
  }
  const lessons = curriculumFor(state, enrollment.courseId).flatMap(section => section.lessons)
  if (!lessons.some(lesson => lesson.id === lectureId)) return state
  if (type === 'start' || type === 'resume') {
    if (type === 'start' && enrollment.lastLectureId === lectureId && enrollment.lastAccessedAt) return state
    return updateRecord(state, 'enrollments', enrollment, { lastLectureId: lectureId, lastAccessedAt: meta.updatedAt }, meta)
  }
  const complete = completedIds(enrollment, lessons)
  const next = complete.includes(lectureId) ? complete.filter(id => id !== lectureId) : [...complete, lectureId]
  const completedAt = next.length === lessons.length
    ? enrollment.completedAt || meta.updatedAt
    : null
  return updateRecord(state, 'enrollments', enrollment, { completedLectureIds: next, completedAt }, meta)
}

export function saveList(state, meta, id, values) {
  if (!id) return appendRecord(state, 'courseLists', 'list', {
    ...values, profileId: meta.updatedBy, courseIds: [], status: 'active', deletedAt: null,
  }, meta)
  const list = byId(state.courseLists, id)
  if (!isActive(list) || list.profileId !== meta.updatedBy) return state
  return updateRecord(state, 'courseLists', list, values, meta)
}

export function toggleMembership(state, meta, listId, courseId, checked) {
  const list = byId(state.courseLists, listId)
  const enrollment = rows(state.enrollments).find(row => row.profileId === meta.updatedBy && row.courseId === courseId)
  if (!isActive(list) || list.profileId !== meta.updatedBy || !enrollment || enrollment.status === 'archived' || !byId(state.courses, courseId)) return state
  const members = ids(list.courseIds)
  if (members.includes(courseId) === checked) return state
  const courseIds = checked ? [...members, courseId] : members.filter(id => id !== courseId)
  return updateRecord(state, 'courseLists', list, { courseIds }, meta)
}

export function saveQuestion(state, meta, courseId, id, values) {
  if (!id) {
    if (!byId(state.courses, courseId)) return state
    return appendRecord(state, 'questions', 'question', {
      ...values, courseId, authorId: meta.updatedBy, topAnswerId: null, status: 'active', deletedAt: null,
    }, meta)
  }
  const question = byId(state.questions, id)
  if (!isActive(question) || question.courseId !== courseId || question.authorId !== meta.updatedBy) return state
  return updateRecord(state, 'questions', question, values, meta)
}

export function addReply(state, meta, questionId, body) {
  if (!isActive(byId(state.questions, questionId)) || !body) return state
  return appendRecord(state, 'answers', 'answer', { questionId, authorId: meta.updatedBy, body, status: 'active' }, meta)
}

export function setQuestionFlag(state, meta, questionId, field, value) {
  const question = byId(state.questions, questionId)
  if (!isActive(question)) return state
  if (field === 'isRead' && byId(state.courses, question.courseId)?.instructorId !== meta.updatedBy) return state
  const key = field === 'isRead' ? 'questionReads' : 'questionFollows'
  const flag = rows(state[key]).find(row => row.profileId === meta.updatedBy && row.questionId === questionId)
  if (Boolean(flag?.[field]) === value) return state
  return flag ? updateRecord(state, key, flag, { [field]: value }, meta)
    : appendRecord(state, key, field === 'isRead' ? 'read' : 'follow', {
      questionId, profileId: meta.updatedBy, [field]: value,
    }, meta)
}

export function selectAnswer(state, meta, questionId, answerId) {
  const question = byId(state.questions, questionId)
  if (!isActive(question)) return state
  const course = byId(state.courses, question.courseId)
  if (meta.updatedBy !== question.authorId && meta.updatedBy !== course?.instructorId) return state
  if (answerId && !repliesFor(state, questionId).some(answer => answer.id === answerId)) return state
  return updateRecord(state, 'questions', question, { topAnswerId: answerId }, meta)
}

export function saveCourse(state, meta, id, values) {
  if (!id) return appendRecord(state, 'courses', 'course', {
    subtitle: '', description: '', ...values, instructorId: meta.updatedBy, status: 'draft',
  }, meta)
  const course = byId(state.courses, id)
  if (!course || course.instructorId !== meta.updatedBy) return state
  return updateRecord(state, 'courses', course, values, meta)
}

export function saveSection(state, meta, courseId, id, title) {
  if (byId(state.courses, courseId)?.instructorId !== meta.updatedBy) return state
  const sections = sectionsFor(state, courseId)
  if (!id) return appendRecord(state, 'sections', 'section', { title, courseId, position: nextPosition(sections) }, meta)
  const section = sections.find(row => row.id === id)
  return section ? updateRecord(state, 'sections', section, { title }, meta) : state
}

export function saveLesson(state, meta, sectionId, id, fields) {
  const section = byId(state.sections, sectionId)
  if (!section || byId(state.courses, section.courseId)?.instructorId !== meta.updatedBy) return state
  const lessons = lessonsFor(state, sectionId)
  if (!id) return appendRecord(state, 'lectures', 'lecture', { ...fields, sectionId, position: nextPosition(lessons) }, meta)
  const lesson = lessons.find(row => row.id === id)
  return lesson ? updateRecord(state, 'lectures', lesson, fields, meta) : state
}

export function reviewRequirements(state, course) {
  const missing = []
  if (!String(course.title ?? '').trim()) missing.push('a title')
  if (!String(course.category ?? '').trim()) missing.push('a category')
  if (!String(course.description ?? '').trim()) missing.push('a description')
  if (!curriculumFor(state, course.id).some(section => section.lessons.some(lesson => String(lesson.content ?? '').trim()))) {
    missing.push('at least one lesson with content')
  }
  return missing
}

export function submitForReview(state, meta, courseId) {
  const course = byId(state.courses, courseId)
  if (!course || course.instructorId !== meta.updatedBy || course.status !== 'draft' || reviewRequirements(state, course).length) return state
  return updateRecord(state, 'courses', course, { status: 'in_review', submittedAt: meta.updatedAt }, meta)
}

export function deleteOwned(state, meta, key, id) {
  const record = byId(state[key], id)
  const owner = key === 'questions' ? record?.authorId : record?.profileId
  if (!isActive(record) || owner !== meta.updatedBy) return state
  return updateRecord(state, key, record, { status: 'deleted', deletedAt: meta.updatedAt }, meta)
}
