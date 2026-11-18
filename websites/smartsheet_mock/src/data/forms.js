import { insertRow } from './rows.js'
import { parseCell } from './cells.js'
import { APPROVAL_OPTIONS, byId, changedBy, columnsOf, createdWith, idFor, isActive, isBlank, primaryOf, replace, sameValue } from './sheets.js'

const formTypes = new Set(['text', 'number', 'date', 'dropdown', 'contact', 'checkbox', 'percent'])

export function formColumns(state, sheet) {
  const settings = sheet.projectSettings ?? {}
  const system = new Set([settings.startColumnId, settings.endColumnId, settings.percentColumnId, settings.durationColumnId, settings.predecessorsColumnId])
  for (const rule of state.approvalWorkflows ?? []) if (rule.sheetId === sheet.id) system.add(rule.responseColumnId)
  return columnsOf(sheet).filter(column => formTypes.has(column.type) && !system.has(column.id) &&
    !(column.type === 'dropdown' && APPROVAL_OPTIONS.every(option => (column.options ?? []).includes(option))))
}

export function newField(column) {
  return { id: idFor('ff'), columnId: column.id, label: column.title, helpText: '', required: Boolean(column.primary), hidden: false }
}

export function newForm(state, sheet) {
  const available = formColumns(state, sheet)
  const primary = available.find(column => column.id === primaryOf(sheet)?.id) ?? available[0]
  return {
    title: sheet.name || 'Untitled form', description: '', confirmationMessage: 'Your response has been submitted.',
    rowPlacement: 'bottom', status: 'active', fields: primary ? [newField(primary)] : [],
  }
}

export function saveForm(state, sheetId, id, draft) {
  const sheet = byId(state.sheets, sheetId)
  if (!isActive(sheet)) throw new Error('This sheet is unavailable.')
  const previous = byId(state.forms, id)
  if (previous && previous.sheetId !== sheetId) throw new Error('This form is unavailable.')
  const title = draft.title.trim()
  if (!title) throw new Error('Enter a form title.')
  const available = formColumns(state, sheet)
  const fieldIds = new Set()
  const sourceIds = new Set()
  const visibleEarlier = new Map()
  const fields = (draft.fields ?? []).filter(field => byId(available, field.columnId)).map(field => {
    if (fieldIds.has(field.id) || sourceIds.has(field.columnId)) throw new Error('Use each sheet column at most once.')
    fieldIds.add(field.id)
    sourceIds.add(field.columnId)
    const column = byId(available, field.columnId)
    let defaultValue
    try { defaultValue = parseCell(column, field.defaultValue, { users: state.users }) }
    catch (error) { throw new Error((field.label || column.title) + ' — ' + error.message) }
    if (field.hidden && field.required && isBlank(defaultValue)) throw new Error((field.label || column.title) + ' needs a default because it is hidden and required.')
    let visibleWhen
    if (field.visibleWhen) {
      const source = visibleEarlier.get(field.visibleWhen.fieldId)
      if (!source) throw new Error((field.label || column.title) + ' must use an earlier visible field for its condition.')
      const equals = parseCell(source, field.visibleWhen.equals, { users: state.users })
      if (isBlank(equals)) throw new Error((field.label || column.title) + ' needs a matching value for its condition.')
      visibleWhen = { fieldId: field.visibleWhen.fieldId, equals }
    }
    if (!field.hidden) visibleEarlier.set(field.id, column)
    return {
      id: field.id, columnId: field.columnId, label: field.label?.trim() || column.title, helpText: field.helpText?.trim() ?? '',
      required: Boolean(field.required), hidden: Boolean(field.hidden),
      ...(isBlank(defaultValue) ? {} : { defaultValue }), ...(visibleWhen ? { visibleWhen } : {}),
    }
  })
  if (!fields.some(field => !field.hidden)) throw new Error('Add at least one visible field.')
  const update = changedBy(state)
  const record = {
    ...previous, id, sheetId, title, description: draft.description?.trim() ?? '',
    confirmationMessage: draft.confirmationMessage?.trim() || 'Your response has been submitted.',
    rowPlacement: draft.rowPlacement === 'top' ? 'top' : 'bottom',
    fields, status: previous?.status ?? 'active', ...(previous ? update : createdWith(update)),
  }
  return { ...state, forms: previous ? replace(state.forms, record) : [...(state.forms ?? []), record] }
}

export function changeFormStatus(state, sheetId, id) {
  const form = byId(state.forms, id)
  if (!form || form.sheetId !== sheetId || !isActive(byId(state.sheets, sheetId))) throw new Error('This form is unavailable.')
  return { ...state, forms: replace(state.forms, { ...form, status: form.status === 'inactive' ? 'active' : 'inactive', ...changedBy(state) }) }
}

export function validateResponse(state, sheet, form, answers) {
  const values = {}
  const errors = {}
  const visible = new Map()
  for (const field of form.fields ?? []) {
    const column = byId(columnsOf(sheet), field.columnId)
    if (!column) continue
    if (field.visibleWhen) {
      const source = visible.get(field.visibleWhen.fieldId)
      if (!source) continue
      try {
        const equals = parseCell(source.column, field.visibleWhen.equals, { users: state.users })
        if (isBlank(equals) || !sameValue(source.value, equals)) continue
      } catch { continue }
    }
    const supplied = field.hidden ? field.defaultValue : Object.hasOwn(answers, field.id) ? answers[field.id] : field.defaultValue
    if (!field.hidden) visible.set(field.id, { column, value: null })
    try {
      const value = parseCell(column, supplied, { users: state.users })
      if (field.required && isBlank(value)) throw new Error('This field is required.')
      if (!field.hidden) visible.set(field.id, { column, value })
      if (!isBlank(value)) values[field.columnId] = value
    } catch (error) { errors[field.id] = error.message }
  }
  return { values, errors, visible }
}

export function submitForm(state, id, answers) {
  const form = byId(state.forms, id)
  const sheet = byId(state.sheets, form?.sheetId)
  if (!form || form.status === 'inactive' || !isActive(sheet)) throw new Error('This form is no longer accepting responses.')
  const { values, errors } = validateResponse(state, sheet, form, answers)
  if (Object.keys(errors).length) throw new Error('Check the form fields and try again.')
  const submissionId = idFor('sub')
  const rowId = idFor('row')
  const update = changedBy(state)
  const next = insertRow(state, sheet.id, { id: rowId, placement: form.rowPlacement, cells: values, formSubmissionId: submissionId, update })
  const submission = {
    id: submissionId, formId: form.id, sheetId: sheet.id, rowId, values,
    status: 'submitted', createdAt: update.updatedAt, createdBy: update.updatedBy,
  }
  return { ...next, formSubmissions: [...(state.formSubmissions ?? []), submission] }
}
