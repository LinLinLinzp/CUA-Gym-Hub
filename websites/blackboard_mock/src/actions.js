export function newId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (word) => word.toString(16).padStart(8, '0')).join('')
}

export function writeAction(state, key, collection, meta, type, courseId, entityId, details) {
  return {
    ...state,
    [key]: collection,
    activity: [...(state.activity ?? []), { id: newId(), type, ...meta, courseId, entityId, details }],
  }
}

export function changeCourse(state, meta, courseId, change, type, details) {
  const course = state.courses.find((record) => record?.id === courseId)
  if (!course) return state
  const fields = change(course)
  if (!fields) return state
  return writeAction(state, 'courses', state.courses.map((record) => record === course
    ? { ...record, ...fields, updatedAt: meta.createdAt } : record), meta, type, courseId, courseId, details(course, fields))
}
