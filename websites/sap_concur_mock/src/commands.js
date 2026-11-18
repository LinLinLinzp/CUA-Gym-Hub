import { EXPENSE, activeId, assignedReviewer, canDecide, categories, cents, cyclesFor, docs, documentById, documentTotal, editable, eligibleReviewers, lineTotal, lines, list, paymentTypes, receiptPath, schemas, totalLines, userById } from './model.js'

const uid = prefix => prefix + '-' + crypto.randomUUID()
const clean = value => String(value ?? '').trim()
const validDate = value => {
  const date = new Date(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}
const validAmount = value => /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(clean(value)) && cents(value) > 0 && Number.isSafeInteger(cents(value))
const validQuantity = value => /^\d+$/.test(clean(value)) && Number(value) > 0 && Number.isSafeInteger(Number(value))

export function validateHeader(type, fields) {
  const errors = {}
  for (const [key, label] of Object.entries({ title: 'name', businessPurpose: 'business purpose', costCenter: 'cost center', ...(type !== EXPENSE && { origin: 'origin', destination: 'destination' }) })) {
    if (!clean(fields[key])) errors[key] = 'Enter a ' + label + '.'
  }
  if (type === EXPENSE) {
    if (!validDate(fields.reportDate)) errors.reportDate = 'Enter a valid report date.'
  } else {
    if (!validDate(fields.startDate)) errors.startDate = 'Enter a valid start date.'
    if (!validDate(fields.endDate)) errors.endDate = 'Enter a valid end date.'
    else if (!errors.startDate && fields.endDate < fields.startDate) errors.endDate = 'End date must be on or after the start date.'
  }
  return errors
}

export function validateLine(type, fields) {
  const errors = {}
  if (!categories.includes(fields.category)) errors.category = 'Choose a category.'
  if (type === EXPENSE) {
    if (!clean(fields.merchant)) errors.merchant = 'Enter a merchant.'
    if (!validDate(fields.transactionDate)) errors.transactionDate = 'Enter a valid transaction date.'
    if (!Object.hasOwn(paymentTypes, fields.paymentType)) errors.paymentType = 'Choose a payment type.'
    if (!validAmount(fields.amount)) errors.amount = 'Enter a positive amount with up to two decimal places.'
  } else {
    if (!clean(fields.description)) errors.description = 'Enter a description.'
    if (!validQuantity(fields.quantity)) errors.quantity = 'Enter a positive whole number.'
    if (!validAmount(fields.unitAmount)) errors.unitAmount = 'Enter a positive amount with up to two decimal places.'
    else if (!errors.quantity && !Number.isSafeInteger(cents(fields.unitAmount) * Number(fields.quantity))) errors.unitAmount = 'Enter a smaller quantity or unit amount.'
  }
  return errors
}

export const needsReceipt = line => cents(line.amount) >= 7500 && !receiptPath(line.receipt)
export function submissionProblems(type, document) {
  const entries = lines(type, document)
  const problems = []
  if (Object.keys(validateHeader(type, document)).length) problems.push('Complete the document details.')
  if (!entries.length) problems.push(type === EXPENSE ? 'Add at least one expense.' : 'Add at least one expected expense.')
  if (entries.some(entry => Object.keys(validateLine(type, entry)).length)) problems.push('Correct the incomplete or invalid line items.')
  if (type === EXPENSE && entries.some(needsReceipt)) problems.push('Attach a receipt to each expense of $75.00 or more.')
  return problems
}

const commands = {
  created(state, type, document, fields, meta) {
    if (Object.keys(validateHeader(type, fields)).length) return null
    const schema = schemas[type]
    const next = { ...trimFields(type, fields), id: uid(schema.prefix), ownerId: meta.actorId, currency: 'USD',
      status: 'draft', createdAt: meta.createdAt, updatedAt: meta.createdAt, [schema.lines]: [], [schema.total]: 0 }
    return { document: next }
  },
  header_updated(state, type, document, fields) {
    if (Object.keys(validateHeader(type, fields)).length) return null
    return { document: { ...document, ...trimFields(type, fields) } }
  },
  deleted() { return { remove: true } },
  line_added: lineChange,
  line_updated: lineChange,
  line_removed: lineChange,
  receipt_attached: lineChange,
  receipt_removed: lineChange,
  submitted(state, type, document, { reviewerId }, meta) {
    if (submissionProblems(type, document).length || cyclesFor(state, type, document.id).some(cycle => cycle.status === 'pending')) return null
    const reviewer = assignedReviewer(state, document) ?? eligibleReviewers(state, document.ownerId).find(user => user.id === reviewerId)
    if (!reviewer) return null
    const approval = { id: uid('APR'), subjectType: type, subjectId: document.id, status: 'pending',
      approverId: reviewer.id, submitterId: document.ownerId, submitterName: userById(state, document.ownerId)?.name || document.ownerId,
      subjectTitle: document.title, amount: documentTotal(type, document), currency: document.currency || 'USD', createdAt: meta.createdAt }
    return { document: { ...document, status: 'pending_approval', approverId: reviewer.id, submittedAt: meta.createdAt },
      approvals: [...list(state.approvals), approval], fields: { approvalId: approval.id } }
  },
  recalled(state, type, document, payload, meta) {
    if (document.status !== 'pending_approval') return null
    const open = cyclesFor(state, type, document.id).find(cycle => cycle.status === 'pending' &&
      cycle.submitterId === meta.actorId && (!document.approverId || cycle.approverId === document.approverId))
    if (!open) return null
    return resolution(state, document, open, 'recalled', 'draft', '', meta)
  },
  approved: decide,
  sent_back: decide,
}

function trimFields(type, fields) {
  const keys = ['title', 'businessPurpose', 'costCenter', ...(type === EXPENSE ? ['reportDate'] : ['origin', 'destination', 'startDate', 'endDate'])]
  return Object.fromEntries(keys.map(key => [key, clean(fields[key])]))
}

function lineChange(state, type, document, payload, meta) {
  const schema = schemas[type]
  const current = lines(type, document)
  const previous = current.find(line => line.id === payload.lineId)
  const add = meta.action === 'line_added'
  if (!add && !previous) return null
  let line = previous
  if (add || meta.action === 'line_updated') {
    const { fields } = payload
    if (Object.keys(validateLine(type, fields)).length) return null
    const base = previous || { id: uid(schema.linePrefix), createdBy: meta.actorId, createdAt: meta.createdAt }
    line = { ...base, category: fields.category, description: clean(fields.description), updatedAt: meta.createdAt }
    if (type === EXPENSE) {
      Object.assign(line, { merchant: clean(fields.merchant), transactionDate: fields.transactionDate,
        amount: cents(fields.amount) / 100, quantity: 1, paymentType: fields.paymentType })
    } else {
      const quantity = Number(fields.quantity)
      Object.assign(line, { quantity, unitAmount: cents(fields.unitAmount) / 100, lineTotal: cents(fields.unitAmount) * quantity / 100 })
    }
  }
  if (meta.action === 'receipt_attached' || meta.action === 'receipt_removed') {
    if (type !== EXPENSE || (meta.action === 'receipt_removed' && !previous.receipt) ||
      (meta.action === 'receipt_attached' && !receiptPath(payload.receipt))) return null
    line = { ...previous, receipt: payload.receipt ? { ...payload.receipt, attachedAt: meta.createdAt, attachedBy: meta.actorId } : null, updatedAt: meta.createdAt }
  }
  const entries = add ? [...current, line] : meta.action === 'line_removed'
    ? current.filter(entry => entry.id !== line.id) : current.map(entry => entry.id === line.id ? line : entry)
  const fields = { lineId: line.id, lineAmount: lineTotal(type, line) ?? 0, quantity: line.quantity ?? 1 }
  const receiptName = (meta.action === 'receipt_removed' ? previous.receipt : line.receipt)?.fileName
  if (receiptName) fields.receiptFileName = receiptName
  return { document: { ...document, [schema.lines]: entries, [schema.total]: totalLines(type, entries) }, fields }
}

function resolution(state, document, approval, status, documentStatus, comment, meta) {
  const fields = { approvalId: approval.id }
  if (status !== 'recalled') fields.comment = comment
  return {
    document: { ...document, status: documentStatus },
    approvals: list(state.approvals).map(cycle => cycle.id === approval.id
      ? { ...cycle, status, ...(status !== 'recalled' && { comment }), decidedAt: meta.createdAt, decidedBy: meta.actorId } : cycle),
    fields,
  }
}

function decide(state, type, document, { approvalId, comment }, meta) {
  const approval = cyclesFor(state, type, document.id).find(cycle => cycle.id === approvalId)
  const reason = clean(comment)
  if (!canDecide(state, approval) || (meta.action === 'sent_back' && !reason)) return null
  return resolution(state, document, approval, meta.action, meta.action, reason, meta)
}

export function change(state, type, id, action, payload = {}) {
  const schema = schemas[type]
  const actorId = activeId(state)
  if (!schema || !actorId) return state
  const original = documentById(state, type, id)
  if (action !== 'created') {
    if (!original) return state
    if (action !== 'approved' && action !== 'sent_back') {
      if (original.ownerId !== actorId || (action !== 'recalled' && !editable(original))) return state
    }
    if (action === 'deleted' && cyclesFor(state, type, id).some(cycle => cycle.status === 'pending')) return state
  }
  const meta = { action, actorId, createdAt: new Date().toISOString() }
  const result = commands[action](state, type, original, payload, meta)
  if (!result) return state
  const document = result.remove ? original : { ...result.document, updatedAt: meta.createdAt }
  const documents = docs(state, type)
  const nextDocuments = action === 'created' ? [...documents, document] : result.remove
    ? documents.filter(item => item.id !== id) : documents.map(item => item.id === id ? document : item)
  const event = { id: uid('ACT'), ...meta, subjectId: document.id, subjectType: type,
    subjectTitle: document.title || document.id, status: result.remove ? 'deleted' : document.status,
    amount: documentTotal(type, document), currency: document.currency || 'USD', ...result.fields }
  return { ...state, [schema.key]: nextDocuments, ...(result.approvals && { approvals: result.approvals }), activity: [...list(state.activity), event] }
}
