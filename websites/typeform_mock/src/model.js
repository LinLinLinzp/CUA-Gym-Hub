export const types = {
  short_text: 'Short text', long_text: 'Long text', email: 'Email',
  number: 'Number', multiple_choice: 'Multiple choice', yes_no: 'Yes / No',
}

export const statuses = { draft: 'Draft', published: 'Published', closed: 'Closed' }
export const operators = { equals: 'is', not_equals: 'is not', greater_than: 'is greater than', less_than: 'is less than' }
export const items = (value) => Array.isArray(value) ? value : []
export function newId(prefix) {
  const random = crypto.getRandomValues(new Uint32Array(4))
  return prefix + '_' + Array.from(random, (part) => part.toString(16).padStart(8, '0')).join('')
}
export const questionTitle = (question) => question?.title || 'Untitled question'
export const endingTitle = (ending) => ending?.title || 'Thank you'
export const defaultEnding = () => ({ id: newId('end'), title: 'Thanks for sharing', description: 'Your response has been recorded.' })

export function draftOf(form) {
  return {
    title: form.title || 'Untitled form',
    questions: items(form.questions),
    endings: items(form.endings),
    logic: items(form.logic),
  }
}

export function isPending(form) {
  return !!form.publishedSnapshot && Object.entries(draftOf(form)).some(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(form.publishedSnapshot[key]))
}

export function reorder(records, from, to) {
  const copy = [...records]
  copy.splice(to, 0, ...copy.splice(from, 1))
  return copy
}

export function copyQuestion(question) {
  return { ...question, id: newId('q'), choices: items(question.choices).map((choice) => ({ ...choice, id: newId('c') })) }
}

export function copyForm(form, forms, actorId, date, id) {
  const original = draftOf(form)
  const ids = new Map()
  const questions = original.questions.map((question) => {
    const copy = copyQuestion(question)
    ids.set(question.id, copy.id)
    items(question.choices).forEach((choice, index) => ids.set(choice.id, copy.choices[index].id))
    return copy
  })
  const endings = original.endings.map((ending) => {
    const copy = { ...ending, id: newId('end') }
    ids.set(ending.id, copy.id)
    return copy
  })
  const logic = original.logic.filter((rule) =>
    ids.has(rule.sourceQuestionId) && ids.has(rule.destination?.id) && (!rule.condition || ids.has(rule.condition.questionId))
  ).map((rule) => {
    const conditionQuestion = original.questions.find((question) => question.id === rule.condition?.questionId)
    return {
      ...rule,
      id: newId('lr'),
      sourceQuestionId: ids.get(rule.sourceQuestionId),
      condition: rule.condition ? {
        ...rule.condition,
        questionId: ids.get(rule.condition.questionId),
        value: conditionQuestion?.type === 'multiple_choice' ? (ids.get(rule.condition.value) ?? rule.condition.value) : rule.condition.value,
      } : null,
      destination: { ...rule.destination, id: ids.get(rule.destination.id) },
    }
  })
  const base = original.title + ' copy'
  let title = base
  let suffix = 2
  while (forms.some((entry) => entry.workspaceId === form.workspaceId && entry.title === title)) title = base + ' ' + suffix++
  return {
    ...form, id, title, questions, endings, logic, duplicatedFromId: form.id,
    status: 'draft', publishedAt: null, publishedVersion: 0, publishedSnapshot: null,
    createdBy: actorId, updatedBy: actorId, createdAt: date, updatedAt: date,
  }
}

export function validCondition(condition, questions, sourceIndex) {
  const index = questions.findIndex((question) => question.id === condition.questionId)
  if (index < 0 || index > sourceIndex) return false
  const question = questions[index]
  const { value, operator } = condition
  if (!Object.hasOwn(operators, operator)) return false
  if ((operator === 'greater_than' || operator === 'less_than') && question.type !== 'number') return false
  if (question.type === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (question.type === 'yes_no') return typeof value === 'boolean'
  if (question.type === 'multiple_choice') return items(question.choices).some((choice) => choice.id === value)
  return ['short_text', 'long_text', 'email'].includes(question.type) && typeof value === 'string' && !!value.trim()
}

export function validRule(rule, questions, endings) {
  const source = questions.findIndex((question) => question.id === rule.sourceQuestionId)
  const target = rule.destination
  if (source < 0 || !target) return false
  if (target.type === 'question') {
    if (questions.findIndex((question) => question.id === target.id) <= source) return false
  } else if (target.type !== 'ending' || !endings.some((ending) => ending.id === target.id)) return false
  return rule.condition === null || (!!rule.condition && validCondition(rule.condition, questions, source))
}

export function following(form, index, answers) {
  const { questions, endings, logic } = form
  const rules = logic.filter((rule) => rule.sourceQuestionId === questions[index]?.id && validRule(rule, questions, endings))
  const match = rules.find(({ condition }) => {
    if (!condition || !Object.hasOwn(answers, condition.questionId)) return false
    const answer = answers[condition.questionId]
    switch (condition.operator) {
      case 'equals': return answer === condition.value
      case 'not_equals': return answer !== condition.value
      case 'greater_than': return answer > condition.value
      case 'less_than': return answer < condition.value
      default: return false
    }
  }) || rules.find((rule) => rule.condition === null)
  if (match) return match.destination
  if (questions[index + 1]) return { type: 'question', id: questions[index + 1].id }
  return { type: 'ending', id: endings[0]?.id ?? null }
}

export function answerText(answer) {
  if (typeof answer?.value === 'boolean') return answer.value ? 'Yes' : 'No'
  return String(answer?.choiceLabel ?? answer?.value ?? '')
}

export function dateText(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

export function answerRecord(question, value) {
  const label = question.type === 'multiple_choice' ? items(question.choices).find((choice) => choice.id === value)?.label : undefined
  return {
    questionId: question.id, questionTitle: questionTitle(question), type: question.type, value,
    ...(label !== undefined ? { choiceLabel: label } : {}),
  }
}
