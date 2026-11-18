import { categories } from './data/seed.js'
import { activeLimits, cents, currencies, localFileUrl, lookup, numeric, positiveAmount, receiptFor, validDate } from './model.js'

const id = prefix => `${prefix}_${crypto.randomUUID()}`
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message)
}
const required = (value, name) => {
  const result = String(value ?? '').trim()
  requireValue(result, `Enter ${name}.`)
  return result
}
const links = values => Object.fromEntries(Object.entries(values).filter(([, value]) => value))
const diff = (before, after) => Object.fromEntries(Object.entries(after).map(([key, value]) => [key, { from: before?.[key] ?? null, to: value }]))

export function mutate(state, command, data) {
  const actor = state.currentUser?.id
  requireValue(actor, 'A signed-in team member is needed to continue.')
  const now = new Date().toISOString()
  const created = { createdBy: actor, createdAt: now }
  const updated = { updatedBy: actor, updatedAt: now }
  let next = state

  function store(collection, record) {
    const previous = Array.isArray(next[collection]) ? next[collection] : []
    const items = lookup(previous, record.id)
      ? previous.map(item => item?.id === record.id ? record : item)
      : [...previous, record]
    next = { ...next, [collection]: items }
    return record
  }

  function event(action, targetType, target, relatedIds, changes, reason) {
    store('activity', {
      id: id('act'), action, actorId: actor, createdAt: now,
      targetType, targetId: target.id, relatedIds: links(relatedIds), changes,
      ...(reason ? { reason } : {}),
    })
    return { state: next, id: target.id }
  }

  function activeLimit(limitId) {
    const limit = lookup(activeLimits(state), limitId)
    requireValue(limit, 'Choose an active spend limit.')
    return limit
  }

  const card = lookup(state.cards, data.id)
  const expense = lookup(state.expenses, data.id)
  const receipt = lookup(state.receipts, data.id)
  const limit = lookup(state.limits, data.id)

  switch (command) {
    case 'card.issued': {
      const name = required(data.name, 'a card name')
      requireValue(lookup(state.members, data.holderId), 'Choose a team member.')
      activeLimit(data.limitId)
      const last4 = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
      const fields = { name, holderId: data.holderId, limitId: data.limitId, format: 'virtual', last4, status: 'active' }
      const target = store('cards', { id: id('crd'), ...fields, ...created })
      return event(command, 'card', target, { holderId: target.holderId, limitId: target.limitId }, diff(null, fields))
    }
    case 'card.locked':
    case 'card.unlocked':
    case 'card.canceled':
    case 'card.limit_changed': {
      const allowed = { 'card.locked': ['active'], 'card.unlocked': ['locked'], 'card.canceled': ['active', 'locked'], 'card.limit_changed': ['active', 'locked'] }
      requireValue(allowed[command].includes(card?.status), 'This action is unavailable for the current card status.')
      const reason = ['card.locked', 'card.canceled'].includes(command) ? required(data.reason, 'a reason') : undefined
      const status = { 'card.locked': 'locked', 'card.unlocked': 'active', 'card.canceled': 'canceled' }[command]
      let fields = { status }
      if (command === 'card.limit_changed') {
        const assignment = activeLimit(data.limitId)
        requireValue(assignment.id !== card.limitId, 'Choose a different spend limit.')
        fields = { limitId: assignment.id }
      }
      const target = store('cards', { ...card, ...fields, ...updated })
      return event(command, 'card', target, {
        holderId: card.holderId, limitId: target.limitId,
        ...(fields.limitId && { previousLimitId: card.limitId }),
      }, diff(card, fields), reason)
    }
    case 'expense.submitted': {
      const allocation = activeLimit(data.limitId)
      requireValue(allocation.currency, 'Choose a spend limit with a currency.')
      requireValue(categories.includes(data.category), 'Choose a category.')
      const fields = {
        kind: 'reimbursement', merchant: required(data.merchant, 'a merchant'), amount: positiveAmount(data.amount),
        currency: allocation.currency, transactionDate: validDate(data.transactionDate), employeeId: actor,
        cardId: null, limitId: allocation.id, category: data.category,
        memo: required(data.memo, 'a business memo'), status: 'pending_review',
      }
      const target = store('expenses', { id: id('exp'), ...fields, ...created })
      return event(command, 'expense', target, { employeeId: actor, limitId: allocation.id }, diff(null, fields))
    }
    case 'expense.memo_updated':
    case 'expense.approved':
    case 'expense.denied': {
      requireValue(expense, 'This expense is unavailable.')
      let fields
      let changes
      let reason
      if (command === 'expense.memo_updated') {
        fields = { memo: String(data.memo ?? '').trim() }
        changes = diff(expense, fields)
      } else {
        requireValue(expense.status === 'pending_review', 'This expense has already been reviewed.')
        const denied = command === 'expense.denied'
        reason = denied ? required(data.reason, 'a denial reason') : null
        fields = { status: denied ? 'denied' : 'approved', reviewedBy: actor, reviewedAt: now, reviewReason: reason }
        changes = diff(expense, { status: fields.status, amount: expense.amount ?? null, currency: expense.currency ?? null })
      }
      const target = store('expenses', { ...expense, ...fields, ...updated })
      return event(command, 'expense', target, {
        employeeId: expense.employeeId, cardId: expense.cardId, limitId: expense.limitId,
      }, changes, reason)
    }
    case 'receipt.uploaded':
    case 'receipt.attached': {
      const attaching = command === 'receipt.attached'
      if (attaching) requireValue(expense && !receiptFor(state, expense.id), 'This expense cannot accept a receipt.')
      const file = data.file
      requireValue(file?.original_name && localFileUrl(file.url) && numeric(file.size), 'The upload response did not contain a receipt.')
      const fields = {
        filename: file.original_name, fileUrl: file.url, mimeType: file.content_type,
        size: Number(file.size), expenseId: attaching ? expense.id : null, status: attaching ? 'attached' : 'unmatched',
      }
      const target = store('receipts', { id: id('rcp'), ...fields, ...created })
      return event(command, 'receipt', target, { expenseId: fields.expenseId }, diff(null, fields))
    }
    case 'receipt.matched':
    case 'receipt.removed': {
      const matching = command === 'receipt.matched'
      requireValue(receipt && (matching ? receipt.status === 'unmatched' : ['unmatched', 'attached'].includes(receipt.status)), 'This receipt is unavailable for that action.')
      if (matching) {
        requireValue(lookup(state.expenses, data.expenseId) && !receiptFor(state, data.expenseId), 'Choose an expense without a receipt.')
      }
      const fields = { expenseId: matching ? data.expenseId : null, status: matching ? 'attached' : 'removed' }
      const target = store('receipts', { ...receipt, ...fields, ...updated })
      return event(command, 'receipt', target, { expenseId: matching ? fields.expenseId : receipt.expenseId }, diff(receipt, fields))
    }
    case 'limit.created':
    case 'limit.updated':
    case 'limit.archived': {
      const creating = command === 'limit.created'
      requireValue(creating || limit?.status === 'active', 'Choose an active spend limit.')
      let fields = { status: 'archived' }
      if (command !== 'limit.archived') {
        requireValue(lookup(state.members, data.ownerId), 'Choose a limit owner.')
        requireValue(['monthly', 'quarterly', 'one_time'].includes(data.recurrence), 'Choose a recurrence.')
        fields = { name: required(data.name, 'a limit name'), ownerId: data.ownerId, amount: positiveAmount(data.amount), recurrence: data.recurrence }
        if (creating) {
          requireValue(currencies.includes(data.currency), 'Choose a currency.')
          Object.assign(fields, { currency: data.currency, status: 'active' })
        }
      }
      const target = store('limits', creating ? { id: id('lim'), ...fields, ...created } : { ...limit, ...fields, ...updated })
      const changed = Object.fromEntries(Object.entries(fields).filter(([key, value]) => limit?.[key] !== value))
      return event(command, 'limit', target, { ownerId: target.ownerId, ...(target.ownerId !== limit?.ownerId && { previousOwnerId: limit?.ownerId }) }, diff(limit, changed))
    }
    case 'limit.increase_requested': {
      const allocation = activeLimit(data.id)
      requireValue(allocation.currency, 'This spend limit has no currency.')
      const reason = required(data.reason, 'a reason for the increase')
      const fields = {
        limitId: allocation.id, requestedBy: actor, additionalAmount: positiveAmount(data.amount),
        currency: allocation.currency, reason, status: 'pending',
      }
      const target = store('limitIncreaseRequests', { id: id('lir'), ...fields, ...created })
      return event(command, 'limitIncreaseRequest', target, { limitId: allocation.id, requestId: target.id }, diff(null, fields), reason)
    }
    case 'limit.increase_approved':
    case 'limit.increase_denied': {
      const request = lookup(state.limitIncreaseRequests, data.requestId)
      requireValue(limit && request?.limitId === limit.id && request.status === 'pending', 'This increase request is no longer pending.')
      const approving = command === 'limit.increase_approved'
      const reason = approving ? null : required(data.reason, 'a denial reason')
      const fields = { status: approving ? 'approved' : 'denied', decidedBy: actor, decidedAt: now, decisionReason: reason }
      const changes = { ...diff(request, { status: fields.status }), ...diff(request, { additionalAmount: request.additionalAmount ?? null, currency: request.currency ?? null }) }
      if (approving) {
        requireValue(limit.status === 'active', 'Only active spend limits can be increased.')
        requireValue(limit.currency && limit.currency === request.currency && numeric(limit.amount), 'This request has incomplete amount or currency information.')
        const increment = positiveAmount(request.additionalAmount)
        const total = cents(limit.amount) + cents(increment)
        requireValue(total > 0 && Number.isSafeInteger(total), 'The resulting cap is outside the supported range.')
        const digits = String(total).padStart(3, '0')
        const amount = positiveAmount(`${digits.slice(0, -2)}.${digits.slice(-2)}`)
        store('limits', { ...limit, amount, ...updated })
        changes.limitAmount = { from: limit.amount, to: amount }
      }
      const target = store('limitIncreaseRequests', { ...request, ...fields })
      return event(command, 'limitIncreaseRequest', target, { limitId: limit.id, requestId: request.id }, changes, reason)
    }
    default:
      throw new Error('This action is unavailable.')
  }
}
