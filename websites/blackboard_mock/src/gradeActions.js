import { newId, writeAction } from './actions.js'

export const categories = { assignment: 'Assignment', quiz: 'Quiz', participation: 'Participation', other: 'Other' }

export function parsePoints(input) {
  const text = input.trim()
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) return null
  const points = Number(text)
  return Number.isFinite(points) ? points : null
}

function writableCourse(state, courseId) {
  return state.courses.some((course) => course?.id === courseId && course.access !== 'complete')
}

function enrolled(state, courseId, studentId) {
  return state.students.some((student) => student?.id === studentId)
    && state.enrollments.some((row) => row?.courseId === courseId && row.studentId === studentId && row.status === 'enrolled')
}

export function createItem(state, meta, courseId, fields) {
  if (!writableCourse(state, courseId)) return state
  const id = newId()
  const item = { id, courseId, ...fields, kind: 'manual', createdAt: meta.createdAt, createdBy: meta.actorId }
  return writeAction(state, 'gradeItems', [...state.gradeItems, item], meta, 'gradeItem.create', courseId, id,
    { itemId: id, pointsPossible: item.pointsPossible })
}

export function saveGrade(state, meta, courseId, itemId, studentId, score, feedback) {
  const item = state.gradeItems.find((record) => record?.courseId === courseId && record.id === itemId)
  if (!writableCourse(state, courseId) || !item || !enrolled(state, courseId, studentId)
      || !Number.isFinite(item.pointsPossible) || score > item.pointsPossible) return state
  const existing = state.grades.find((record) => record?.courseId === courseId && record.itemId === itemId && record.studentId === studentId)
  const creation = existing || { id: newId(), courseId, itemId, studentId, createdAt: meta.createdAt, createdBy: meta.actorId }
  const grade = {
    ...creation, score, feedback, status: existing?.status === 'posted' ? 'posted' : 'graded',
    updatedAt: meta.createdAt, updatedBy: meta.actorId,
  }
  const grades = existing ? state.grades.map((record) => record === existing ? grade : record) : [...state.grades, grade]
  return writeAction(state, 'grades', grades, meta, 'grade.save', courseId, grade.id, { itemId, studentId, score, status: grade.status })
}

export function postGrades(state, meta, courseId, itemId, gradeId) {
  if (!writableCourse(state, courseId) || !state.gradeItems.some((item) => item?.id === itemId && item.courseId === courseId)) return state
  const gradeIds = []
  const grades = state.grades.map((record) => {
    if (record?.courseId !== courseId || record.itemId !== itemId || (gradeId && record.id !== gradeId)
        || record.status !== 'graded' || !Number.isFinite(record.score)
        || !enrolled(state, courseId, record.studentId)) return record
    gradeIds.push(record.id)
    return { ...record, status: 'posted', postedAt: meta.createdAt, postedBy: meta.actorId, updatedAt: meta.createdAt, updatedBy: meta.actorId }
  })
  if (!gradeIds.length) return state
  return writeAction(state, 'grades', grades, meta, 'grade.post', courseId, gradeId || itemId, { itemId, gradeIds, quantity: gradeIds.length })
}
