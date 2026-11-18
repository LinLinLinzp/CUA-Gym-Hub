import { durationEnd } from '../utils/dates.js'
import { stamp } from '../utils/format.js'
import { grantStatus, relevantGrant } from './access.js'
import { actionContext, newId, replace } from './transactions.js'

export const revokedGrant = (grant, action) => ({
  ...grant, status: 'revoked', revokedAt: action.createdAt, revokedById: action.actorId, ...action.updated,
})

export const compDurations = {
  '7d': '7 days', '30d': '30 days', '90d': '90 days', '6mo': '6 months', '1y': '1 year', forever: 'Forever',
}

export function planComp(row, existing, now, duration, founding) {
  const tier = founding || existing?.tier === 'founding' ? 'founding' : 'paid'
  if (existing && !existing.endsAt) {
    return { startsAt: existing.startsAt, endsAt: null, duration: 'forever', tier, unchanged: existing.tier === tier }
  }
  if (existing) {
    return { startsAt: existing.startsAt, endsAt: durationEnd(new Date(existing.endsAt), duration), duration, tier }
  }
  const baseEnd = row.baseType === 'trial' ? stamp(row.trialEndsAt)
    : ['paid', 'founding'].includes(row.baseType) ? stamp(row.paidThroughAt) : NaN
  const starts = baseEnd > now ? new Date(baseEnd) : now
  return { startsAt: starts.toISOString(), endsAt: durationEnd(starts, duration), duration, tier }
}

export function grantComp(state, subscriberIds, duration, founding) {
  if (!Object.hasOwn(compDurations, duration)) return null
  const selected = new Set(subscriberIds)
  const rows = state.subscribers.filter(row => row.status === 'active' && selected.has(row.id))
  const action = actionContext(state)
  const currency = state.publication.currency || 'USD'
  let compSubscriptions = state.compSubscriptions
  const events = []
  for (const row of rows) {
    const existing = relevantGrant(compSubscriptions, row.id, action.now)
    const { unchanged, ...plan } = planComp(row, existing, action.now, duration, founding)
    if (unchanged) continue
    const compId = existing?.id || newId('comp')
    const details = { compId, subscriberId: row.id, ...plan, amount: existing?.amount ?? '0.00', currency: existing?.currency || currency }
    if (existing) {
      compSubscriptions = replace(compSubscriptions, {
        ...existing, endsAt: plan.endsAt, duration: plan.duration, tier: plan.tier, ...action.updated,
      })
      events.push(action.event('comp.extended', compId, { ...details, previousEndsAt: existing.endsAt ?? null }))
    } else {
      const record = {
        id: compId, publicationId: action.publicationId, subscriberId: row.id, status: 'granted',
        ...plan, amount: '0.00', currency, ...action.created, ...action.updated,
      }
      compSubscriptions = [...compSubscriptions, record]
      events.push(action.event('comp.granted', compId, details))
    }
  }
  return events.length ? { ...state, compSubscriptions, events: [...state.events, ...events] } : null
}

export function endComp(state, compId) {
  const action = actionContext(state)
  const grant = state.compSubscriptions.find(item => item.id === compId)
  if (!grant || !['active', 'upcoming'].includes(grantStatus(grant, action.now))
      || !state.subscribers.some(row => row.id === grant.subscriberId && row.status === 'active')) return null
  return {
    ...state, compSubscriptions: replace(state.compSubscriptions, revokedGrant(grant, action)),
    events: [...state.events, action.event('comp.revoked', grant.id, { compId: grant.id, subscriberId: grant.subscriberId })],
  }
}
