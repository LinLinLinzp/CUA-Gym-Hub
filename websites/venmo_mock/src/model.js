const list = (value) => Array.isArray(value) ? value : []
export const records = (value) => list(value).filter((record) => record && typeof record === 'object')
export const find = (value, id) => id ? records(value).find((record) => record.id === id) : undefined
export const person = (state, id) => id && state.account.id === id ? state.account : find(state.contacts, id)
export const nameOf = (state, id) => person(state, id)?.name || 'Unknown contact'
export const cents = (value) => Math.round(Number(value) * 100)
export const dollars = (value) => value / 100
export const money = (value) => Number.isFinite(Number(value)) && value != null
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  : '—'
export const signedMoney = (value, incoming) => value == null ? '—' : (incoming ? '+' : '−') + money(value)
export const amountCents = (value) => {
  const text = String(value ?? '').trim()
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) return 0
  const [whole, fraction = ''] = text.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0
}
const newId = (prefix) => prefix + '_' + Array.from(crypto.getRandomValues(new Uint32Array(4)),
  (word) => word.toString(16).padStart(8, '0')).join('')
const timestamp = (value) => typeof value === 'string' ? Date.parse(value) : NaN
export const postedAt = (payment) => payment.completedAt || payment.createdAt
export const dateLabel = (value, long = false) => Number.isFinite(timestamp(value))
  ? new Intl.DateTimeFormat('en-US', { month: long ? 'long' : 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC', ...(long ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}) }).format(new Date(value))
  : 'Date unavailable'
export const newest = (items, getDate = (item) => item.createdAt) => [...items].sort((a, b) =>
  (timestamp(getDate(b)) || 0) - (timestamp(getDate(a)) || 0) || String(a.id ?? '').localeCompare(String(b.id ?? '')),
)
export const paymentDirection = (payment, id) => id && payment.senderId === id ? 'sent' : id && payment.recipientId === id ? 'received' : ''
export const requestDirection = (request, id) => id && request.requesterId === id ? 'outgoing' : id && request.payerId === id ? 'incoming' : ''
export const paymentParty = (payment, direction) => direction === 'sent' ? payment.recipientId : payment.senderId
export const requestParty = (request, direction) => direction === 'outgoing' ? request.payerId : request.requesterId
export const match = (query, ...values) => values.some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const eligibleFunding = (state, amount) => {
  const sources = records(state.fundingSources).filter((source) => source.id)
  return [
    ...sources.filter((source) => source.kind === 'balance' && cents(state.account.balance) >= amount),
    ...sources.filter((source) => ['bank', 'debit'].includes(source.kind)),
  ]
}
export const fundingLabel = (source) => {
  if (!source) return 'Funding source unavailable'
  const label = source.label || ({ balance: 'Venmo balance', bank: 'Bank account', debit: 'Debit card' })[source.kind] || 'Funding source'
  return source.last4 ? label + ' ···· ' + source.last4 : label
}

function actor(state) {
  if (!state.account.id) throw new Error('Your account is unavailable.')
  return state.account.id
}

function makePayment(actorId, recipientId, amount, note, fundingSourceId, createdAt) {
  return {
    id: newId('payment'), type: 'payment', status: 'completed', actorId, senderId: actorId,
    recipientId, amount: dollars(amount), currency: 'USD', note, fundingSourceId,
    createdAt, completedAt: createdAt,
  }
}

function makeRequest(actorId, payerId, amount, note, createdAt) {
  return {
    id: newId('request'), status: 'pending', actorId, requesterId: actorId, payerId,
    amount: dollars(amount), currency: 'USD', note, createdAt,
  }
}

function assertDraft(state, recipients, note) {
  const actorId = actor(state)
  if (!recipients.length || new Set(recipients.map(({ id }) => id)).size !== recipients.length ||
      recipients.some(({ id }) => id === actorId || !find(state.contacts, id))) {
    throw new Error('Choose an available contact for each recipient.')
  }
  const total = recipients.reduce((sum, recipient) => sum + recipient.amount, 0)
  if (!Number.isSafeInteger(total) || recipients.some(({ amount }) => !Number.isSafeInteger(amount) || amount <= 0)) {
    throw new Error('Enter a positive amount with up to two decimal places for each recipient.')
  }
  if (!note.trim()) throw new Error('Enter a note.')
  return { actorId, total }
}

function fund(state, amount, sourceId) {
  const source = find(eligibleFunding(state, amount), sourceId)
  if (!source) throw new Error('Choose a funding source that covers the full amount.')
  return source.kind === 'balance'
    ? { ...state.account, balance: dollars(cents(state.account.balance) - amount) }
    : state.account
}

export function send(state, mode, recipients, note, sourceId) {
  const { actorId, total } = assertDraft(state, recipients, note)
  const createdAt = new Date().toISOString()
  if (mode === 'request') {
    const added = recipients.map(({ id, amount }) => makeRequest(actorId, id, amount, note, createdAt))
    return { state: { ...state, requests: [...list(state.requests), ...added] }, id: added[0].id }
  }
  const account = fund(state, total, sourceId)
  const added = recipients.map(({ id, amount }) => makePayment(actorId, id, amount, note, sourceId, createdAt))
  return { state: { ...state, account, payments: [...list(state.payments), ...added] }, id: added[0].id }
}

export function splitStatus(split, requests) {
  const statuses = records(split.shares).filter((share) => share.requestId || share.userId !== split.ownerId)
    .map((share) => find(requests, share.requestId)?.status)
  const terminal = statuses.filter((status) => ['paid', 'declined', 'cancelled'].includes(status))
  if (!terminal.length) return 'pending'
  if (terminal.length < statuses.length) return 'partial'
  return terminal.every((status) => status === 'paid') ? 'settled' : 'closed'
}

export function changeRequest(state, requestId, action, sourceId) {
  const actorId = actor(state)
  const request = find(state.requests, requestId)
  const incoming = ['paid', 'declined'].includes(action)
  const expectedDirection = incoming ? 'incoming' : 'outgoing'
  if (!request || request.status !== 'pending' || requestDirection(request, actorId) !== expectedDirection) {
    throw new Error('This request is no longer available for that action.')
  }
  const createdAt = new Date().toISOString()
  if (action === 'remind') {
    const reminder = { id: newId('reminder'), actorId, createdAt }
    const reminders = [...list(request.reminders), reminder]
    return { state: { ...state, requests: state.requests.map((item) => item === request ? { ...item, reminders } : item) } }
  }
  let next = { ...state }
  const updated = { ...request, status: action, updatedAt: createdAt, updatedById: actorId }
  if (action === 'paid') {
    const amount = amountCents(request.amount)
    if (!amount || !request.requesterId) throw new Error('The amount or recipient is unavailable.')
    const payment = { ...makePayment(actorId, request.requesterId, amount, request.note || '', sourceId, createdAt), requestId }
    next = { ...next, account: fund(state, amount, sourceId), payments: [...list(state.payments), payment] }
    updated.paymentId = payment.id
  }
  next.requests = state.requests.map((item) => item === request ? updated : item)
  if (request.splitId && find(state.splits, request.splitId)) {
    next.splits = state.splits.map((split) => split?.id === request.splitId
      ? { ...split, status: splitStatus(split, next.requests), updatedAt: createdAt, updatedById: actorId }
      : split)
  }
  return { state: next, id: updated.paymentId }
}

export function equalShares(total, count) {
  if (!count) return []
  return Array.from({ length: count }, (_, index) => Math.floor(total / count) + (index < total % count ? 1 : 0))
}

export function addSplit(state, participants, total, note, method, sourcePaymentId) {
  const ownerId = actor(state)
  const others = participants.filter(({ id }) => id !== ownerId)
  assertDraft(state, others, note)
  if (participants.length < 2 || new Set(participants.map(({ id }) => id)).size !== participants.length ||
      !Number.isSafeInteger(total) || participants.some(({ amount }) => !Number.isSafeInteger(amount) || amount <= 0) ||
      participants.reduce((sum, { amount }) => sum + amount, 0) !== total) {
    throw new Error('Enter positive shares that add up to the total for at least two participants.')
  }
  if (sourcePaymentId) {
    const source = find(state.payments, sourcePaymentId)
    if (source?.status !== 'completed' || source.senderId !== ownerId) throw new Error('The source payment is unavailable.')
  }
  const id = newId('split')
  const createdAt = new Date().toISOString()
  const requests = others.map((entry) => ({ ...makeRequest(ownerId, entry.id, entry.amount, note, createdAt), splitId: id }))
  const shares = participants.map(({ id: userId, amount }) => {
    const request = requests.find(({ payerId }) => payerId === userId)
    return { userId, amount: dollars(amount), ...(request && { requestId: request.id }) }
  })
  const split = {
    id, actorId: ownerId, ownerId, amount: dollars(total), currency: 'USD', note,
    method, ...(sourcePaymentId && { sourcePaymentId }), status: 'pending', createdAt, shares,
  }
  return { state: { ...state, splits: [...list(state.splits), split], requests: [...list(state.requests), ...requests] }, id }
}

export function postedPayments(state) {
  return newest(records(state.payments).filter((payment) => payment.status === 'completed' &&
    paymentDirection(payment, state.account.id) && Number.isFinite(timestamp(postedAt(payment)))), postedAt)
}

export function statement(state, year, month) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString()
  const periodEndExclusive = new Date(Date.UTC(year, month, 1)).toISOString()
  const start = timestamp(periodStart)
  const end = timestamp(periodEndExclusive)
  const rows = postedPayments(state).filter((payment) => {
    const time = timestamp(postedAt(payment))
    return time >= start && time < end
  }).map((payment) => {
    const direction = paymentDirection(payment, state.account.id)
    return {
      date: new Date(postedAt(payment)).toISOString(), id: payment.id,
      counterparty: nameOf(state, paymentParty(payment, direction)), note: payment.note || '',
      amount: (direction === 'received' ? 1 : -1) * (amountCents(payment.amount) || 0),
      currency: payment.currency || 'USD',
    }
  })
  const totalIncoming = dollars(rows.reduce((sum, row) => sum + Math.max(0, row.amount), 0))
  const totalOutgoing = dollars(rows.reduce((sum, row) => sum + Math.max(0, -row.amount), 0))
  const filename = 'venmo-statement-' + periodStart.slice(0, 7) + '.csv'
  return { periodStart, periodEndExclusive, rows, totalIncoming, totalOutgoing, filename }
}

function textCell(value) {
  const text = String(value ?? '')
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(text) ? "'" + text : text
  return /[",\n\r]/.test(safe) ? '"' + safe.replaceAll('"', '""') + '"' : safe
}

export function exportStatement(state, year, month) {
  const { rows, filename, periodStart, periodEndExclusive, totalIncoming, totalOutgoing } = statement(state, year, month)
  const entry = {
    id: newId('export'), actorId: actor(state), createdAt: new Date().toISOString(), status: 'generated',
    periodStart, periodEndExclusive, format: 'csv', filename, currency: 'USD',
    transactionIds: rows.map(({ id }) => id ?? ''), transactionCount: rows.length, totalIncoming, totalOutgoing,
  }
  const csv = ['date,payment_id,counterparty,note,amount,currency', ...rows.map((row) =>
    [textCell(row.date), textCell(row.id), textCell(row.counterparty), textCell(row.note), dollars(row.amount).toFixed(2), textCell(row.currency)].join(','),
  )].join('\r\n') + '\r\n'
  return { state: { ...state, statementExports: [...list(state.statementExports), entry] }, filename, csv }
}
