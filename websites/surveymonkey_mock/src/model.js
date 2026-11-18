export const questionTypes = {
  multipleChoice: 'Multiple choice',
  checkboxes: 'Checkboxes',
  rating: 'Rating',
  openText: 'Open text',
}

export const collectorTypes = { webLink: 'Web link', manual: 'Manual data entry' }
export const defaultSettings = {
  anonymous: true,
  allowMultipleResponses: true,
  closedMessage: 'Thanks for your interest. This survey has ended.',
}
export const settingsFor = collector => ({ ...defaultSettings, ...collector.settings })
export const questionsFor = survey => survey.questions ?? []
export const actorFor = state => state.account?.userId || 'workspace-user'
export const titleFor = survey => survey.title || 'Untitled survey'
export const nameFor = collector => collector?.name || 'Unnamed collector'
export const userFor = (state, id) => state.users.find(user => user.id === id)
export const idFor = prefix => prefix + '-' + crypto.randomUUID()
export const updated = (state, now = new Date().toISOString()) => ({ updatedAt: now, updatedBy: actorFor(state) })
export const created = (state, now = new Date().toISOString()) => ({
  createdAt: now, createdBy: actorFor(state), ...updated(state, now),
})
export const surveyPath = (id, section = 'design') => '/surveys/' + encodeURIComponent(id) + '/' + section
export const collectorPath = (surveyId, collectorId) => surveyPath(surveyId, 'collect') + '/' + encodeURIComponent(collectorId)
export const responsePath = (surveyId, id) => surveyPath(surveyId, 'analyze') + '/' + encodeURIComponent(id)
export const entryPath = id => '/r/' + encodeURIComponent(id)

export function surveyStatus(collectors = []) {
  if (collectors.some(collector => collector.status === 'open')) return 'Collecting'
  return collectors.length ? 'Closed' : 'Draft'
}

export function groupCount(records, key) {
  const counts = new Map()
  for (const record of records) counts.set(record[key], (counts.get(record[key]) ?? 0) + 1)
  return counts
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function displayDate(value) {
  const time = Date.parse(value)
  return Number.isFinite(time) ? dateFormatter.format(time) : '—'
}

export function replaceRecord(state, key, id, transform) {
  if (!state[key].some(record => record.id === id)) return state
  return { ...state, [key]: state[key].map(record => record.id === id ? transform(record) : record) }
}

export function removeRecords(state, action, entityId, surveyId, surveyIds = [], collectorIds = [], responseIds = []) {
  const deletion = {
    id: idFor('del'), action, entityId, surveyId, createdAt: new Date().toISOString(), createdBy: actorFor(state),
    removedSurveyIds: surveyIds, removedCollectorIds: collectorIds, removedResponseIds: responseIds,
  }
  const next = { ...state, deletions: [...state.deletions, deletion] }
  for (const [key, ids] of [['surveys', surveyIds], ['collectors', collectorIds], ['responses', responseIds]]) {
    if (ids.length) {
      const removed = new Set(ids)
      next[key] = state[key].filter(record => !removed.has(record.id))
    }
  }
  return next
}

export function hasAnswer(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return Boolean(value.trim())
  return value !== undefined && value !== null
}

export function validateAnswers(questions, answers, checkRequired = true) {
  const errors = {}
  for (const question of questions) {
    const value = answers[question.id]
    if (!hasAnswer(value)) {
      if (checkRequired && question.required) errors[question.id] = 'Please answer this question.'
      continue
    }
    const options = question.options ?? []
    if (question.type === 'multipleChoice' && !options.some(option => option.id === value)) {
      errors[question.id] = 'Select one of the available choices.'
    }
    if (question.type === 'checkboxes' && (!Array.isArray(value) || value.some(id => !options.some(option => option.id === id)))) {
      errors[question.id] = 'Select from the available choices.'
    }
    if (question.type === 'rating' && (!Number.isInteger(value) || value < 1 || value > 5)) {
      errors[question.id] = 'Choose a rating from 1 to 5.'
    }
  }
  return errors
}

export function cleanAnswers(questions, answers) {
  return Object.fromEntries(questions.flatMap(({ id }) => {
    const value = answers[id]
    return hasAnswer(value) ? [[id, typeof value === 'string' ? value.trim() : value]] : []
  }))
}

export function displayAnswer(question, value) {
  if (!hasAnswer(value)) return 'No answer'
  if (question.type === 'multipleChoice' || question.type === 'checkboxes') {
    return (Array.isArray(value) ? value : [value])
      .map(id => question.options?.find(option => option.id === id)?.label || 'Unavailable choice')
      .join(', ')
  }
  return String(value)
}

export const normalEmail = value => (value ?? '').trim().toLowerCase()
export const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
export const respondentName = response => response.respondent?.name || response.respondent?.email || 'Anonymous'
