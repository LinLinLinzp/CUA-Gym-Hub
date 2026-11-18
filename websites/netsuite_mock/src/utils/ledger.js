import { documentNo, find, linesOf, postingPeriod, records, rows } from './model.js'

const idPrefixes = {
  salesord: 'so', itemship: 'if', purchord: 'po', itemrcpt: 'ir', vendbill: 'bill', invadjst: 'adj',
  invtrnfr: 'trf', custinvc: 'inv', custpymt: 'pymt', vendpymt: 'vp', custjob: 'cust', vendor: 'vend', item: 'item',
}

export class ValidationError extends Error {}
export class ConfirmationRequired extends Error {}
export const requireValue = (condition, message) => { if (!condition) throw new ValidationError(message) }
export const requireFields = (fields) => {
  const missing = Object.entries(fields).filter(([, value]) => !value).map(([title]) => title)
  requireValue(!missing.length, `Please enter value(s) for: ${missing.join(', ')}`)
}
export const requireLines = (lines) => requireValue(lines.length, 'You must enter at least one line item for this transaction.')
export const validNumber = (value) => value !== '' && value != null && Number.isFinite(Number(value))
export const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export function list(state, key) {
  if (!Array.isArray(state[key])) state[key] = []
  return state[key]
}

export function transaction(state, operation) {
  const next = structuredClone(state)
  const env = { state: next, actor: state.currentUser?.employeeId || 'emp_101', now: new Date().toISOString() }
  const record = operation(env)
  return { state: record === null ? state : next, record }
}

function taken(state, key, value) {
  return Object.values(state).some((valueList) =>
    Array.isArray(valueList) && valueList.some((row) => row?.[key] != null && String(row[key]) === String(value)))
}

export function allocateInternal(state, prefix) {
  const counters = (state.counters ||= {})
  let internalId = Math.max(1, Math.floor(Number(counters.nextInternalId) || 5001))
  let id = ''
  do {
    id = `${prefix}_${Date.now().toString(36)}${internalId}`
    if (!taken(state, 'internalId', internalId) && !taken(state, 'id', id)) break
    internalId++
  } while (true)
  counters.nextInternalId = internalId + 1
  return { id, internalId }
}

export function createRecord(env, code, values) {
  const { state, now, actor } = env
  const config = records[code]
  const identity = allocateInternal(state, idPrefixes[code])
  let documentFields = {}
  if (config.prefix) {
    let next = Math.max(1, Math.floor(Number(state.counters[config.type]) || 1))
    const occupied = new Set(rows(state, config.key).map(documentNo))
    while (occupied.has(`${config.prefix}${next}`)) next++
    const doc = `${config.prefix}${next}`
    state.counters[config.type] = next + 1
    documentFields = code === 'vendbill' ? { transactionNumber: doc }
      : ['custjob', 'vendor'].includes(code) ? { entityId: doc } : { tranId: doc }
  }
  const header = config.directory ? {} : {
    type: config.type, postingPeriod: postingPeriod(values.tranDate), memo: '', departmentId: null, classId: null,
    locationId: null, createdFromId: null, createdFromType: null,
  }
  const record = { ...header, ...values, ...identity, ...documentFields, createdAt: now, createdById: actor,
    lastModifiedAt: now, lastModifiedById: actor }
  list(state, config.key).push(record)
  note(env, config.type, record.id, 'Create', 'Record', null, documentNo(record))
  return record
}

export function note({ state, now, actor }, recordType, recordId, type, field, oldValue, newValue) {
  const notes = list(state, 'systemNotes')
  const prefix = `sn_${Date.now().toString(36)}`
  let next = notes.length + 1
  while (notes.some((entry) => entry?.id === `${prefix}_${next}`)) next++
  notes.push({
    id: `${prefix}_${next}`, recordType, recordId, createdAt: now, date: now, setById: actor,
    context: 'UI', type, field, oldValue: oldValue ?? null, newValue: newValue ?? null,
  })
}

export function updateRecord(env, code, record, values, action = 'Edit', perField = false) {
  const type = records[code].type
  const previousStatus = record.status
  const changes = Object.entries(values).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(record[key]))
  if (perField) for (const [key, value] of changes) note(env, type, record.id, 'Change', key, record[key], value)
  else note(env, type, record.id, action, values.status && previousStatus !== values.status ? 'Status' : 'Record',
    values.status && previousStatus !== values.status ? previousStatus : null, values.status && previousStatus !== values.status ? values.status : documentNo(record))
  return Object.assign(record, values, { lastModifiedAt: env.now, lastModifiedById: env.actor })
}

export function existing(state, code, id) {
  const record = find(state, records[code].key, id)
  requireValue(record, 'This record is no longer available.')
  return record
}

export function hasChildren(state, id) {
  return Object.values(records).some(({ key }) => rows(state, key).some((row) => row.createdFromId === id))
}

export function removeRecord(env, code, record) {
  requireValue(!hasChildren(env.state, record.id), 'This record has linked transactions and cannot be deleted.')
  const { key, type } = records[code]
  env.state[key] = rows(env.state, key).filter((row) => row.id !== record.id)
  note(env, type, record.id, 'Delete', 'Record', documentNo(record), null)
  return record
}

export function assignLineIds(input, prior = []) {
  const used = new Set(prior.map((line) => line.lineId).filter(Boolean))
  let sequence = 1
  return input.map((row, index) => {
    let lineId = row.lineId
    if (!lineId) {
      while (used.has(`l${sequence}`)) sequence++
      lineId = `l${sequence++}`
      used.add(lineId)
    }
    return { ...row, lineId, line: index + 1 }
  })
}

export function recordLines(record, draft) {
  const originals = linesOf(record)
  const seen = new Set()
  for (const row of draft) {
    if (!row.lineId) continue
    requireValue(!seen.has(row.lineId) && originals.some((line) => line.lineId === row.lineId), 'A line has changed. Reopen the record and try again.')
    seen.add(row.lineId)
  }
  return assignLineIds(draft, originals)
}
