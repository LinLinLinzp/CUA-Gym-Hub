import Papa from 'papaparse'
import { durationEnd } from '../utils/dates.js'
import { stamp } from '../utils/format.js'
import { grantStatus } from './access.js'
import { revokedGrant } from './comps.js'
import { actionContext, newId } from './transactions.js'

export const normalizeEmail = value => String(value || '').trim().toLowerCase()
const emailFormat = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i
const emailValid = email => {
  if (!emailFormat.test(email) || email.length > 254) return false
  const local = email.split('@')[0]
  return local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..')
}

export function readImport(source, input) {
  if (source === 'manual') return { rows: input.split(/[,\n]/).map(email => ({ email })).filter(row => row.email.trim()) }
  const parsed = Papa.parse(input, { delimiter: ',', skipEmptyLines: 'greedy' })
  const [headers = [], ...records] = parsed.data
  const names = headers.map(header => header.trim().toLowerCase())
  const emailIndex = names.indexOf('email')
  const nameIndex = names.indexOf('name')
  if (emailIndex < 0) return { rows: [], error: 'The CSV needs a header named email.' }
  if (parsed.errors.some(issue => issue.row === 0 || !Number.isInteger(issue.row))) return { rows: [], error: 'Check the CSV formatting and choose the file again.' }
  const malformed = new Set(parsed.errors.map(issue => issue.row))
  return { rows: records.map((record, index) => ({
    email: record[emailIndex], name: record[nameIndex], rowNumber: index + 2,
    ...(record.length !== headers.length || malformed.has(index + 1) ? { issue: 'Invalid CSV row' } : {}),
  })) }
}

export function validateImport(rows, subscribers) {
  const existing = new Map(subscribers.map(row => [normalizeEmail(row.email), row.status]))
  const seen = new Set()
  return rows.map(row => {
    const email = normalizeEmail(row.email)
    const issue = row.issue || (!emailValid(email) ? 'Invalid email address'
      : existing.has(email) ? existing.get(email) === 'removed' ? 'Previously removed' : 'Already subscribed'
      : seen.has(email) ? 'Duplicate in this batch' : '')
    if (!issue) seen.add(email)
    return { email, name: String(row.name || '').trim(), rowNumber: row.rowNumber, issue }
  })
}

export function addSubscribers(state, rows, source, trial, welcomeEmailRequested) {
  const accepted = validateImport(rows, state.subscribers).filter(row => !row.issue)
  if (!accepted.length) return null
  const action = actionContext(state)
  const baseType = trial ? 'trial' : 'free'
  const trialEndsAt = trial ? durationEnd(action.now, trial) : null
  const added = accepted.map(({ email, name }) => ({
    id: newId('sub'), publicationId: action.publicationId, userId: null, email, ...(name ? { name } : {}),
    status: 'active', baseType, source, joinedAt: action.createdAt, trialEndsAt,
    welcomeEmailRequestedAt: welcomeEmailRequested ? action.createdAt : null,
    ...action.created, ...action.updated,
  }))
  const details = { subscriberIds: added.map(row => row.id), quantity: added.length, source, baseType, welcomeEmailRequested }
  return {
    ...state, subscribers: [...state.subscribers, ...added],
    events: [...state.events, action.event('subscriber.added', action.publicationId, details)],
  }
}

export function removalRefunds(state, rows, now = new Date()) {
  const currency = state.publication.currency || 'USD'
  return rows.flatMap(row => {
    const amount = Number(row.periodAmount)
    const started = stamp(row.paidPeriodStartedAt)
    const ends = stamp(row.paidThroughAt)
    if (!['paid', 'founding'].includes(row.baseType) || row.periodAmount == null || row.periodAmount === ''
        || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(started) || !Number.isFinite(ends) || ends <= started) return []
    const share = Math.max(0, Math.min(1, (ends - now) / (ends - started)))
    return [{ subscriberId: row.id, amount: (amount * share).toFixed(2), currency }]
  })
}

export function removeSubscribers(state, ids) {
  const targets = new Set(ids)
  const rows = state.subscribers.filter(row => targets.has(row.id) && row.status === 'active')
  if (!rows.length) return null
  const action = actionContext(state)
  const subscriberIds = rows.map(row => row.id)
  const removedIds = new Set(subscriberIds)
  const compIds = []
  const compSubscriptions = state.compSubscriptions.map(grant => {
    if (!removedIds.has(grant.subscriberId) || !['active', 'upcoming'].includes(grantStatus(grant, action.now))) return grant
    compIds.push(grant.id)
    return revokedGrant(grant, action)
  })
  const details = { subscriberIds, quantity: rows.length, compIds, refunds: removalRefunds(state, rows, action.now) }
  return {
    ...state, compSubscriptions,
    subscribers: state.subscribers.map(row => removedIds.has(row.id)
      ? { ...row, status: 'removed', removedAt: action.createdAt, removedById: action.actorId, ...action.updated } : row),
    events: [...state.events, action.event('subscriber.removed', action.publicationId, details)],
  }
}

export function exportSubscribers(state, ids, scope, columns, filename) {
  const active = new Set(state.subscribers.filter(row => row.status === 'active').map(row => row.id))
  const subscriberIds = ids.filter(id => active.has(id))
  if (!subscriberIds.length) return null
  const action = actionContext(state)
  const details = { subscriberIds, quantity: subscriberIds.length, scope, columns, filename }
  return { ...state, events: [...state.events, action.event('subscriber.exported', action.publicationId, details)] }
}

export function subscriberCsv(rows, columns, read) {
  return Papa.unparse([columns, ...rows.map(row => columns.map(column => read(row, column) ?? ''))],
    { quotes: true, escapeFormulae: true })
}
