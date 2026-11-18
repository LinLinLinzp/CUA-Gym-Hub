import { stamp } from '../utils/format.js'

export function grantStatus(grant, now = new Date()) {
  if (grant.status === 'revoked') return 'revoked'
  if (grant.status !== 'granted' || !Number.isFinite(stamp(grant.startsAt))) return 'expired'
  if (grant.endsAt && !(stamp(grant.endsAt) > now)) return 'expired'
  return stamp(grant.startsAt) > now ? 'upcoming' : 'active'
}

export function relevantGrant(grants, subscriberId, now = new Date()) {
  const matching = grants.filter(grant => grant.subscriberId === subscriberId)
  return matching.find(grant => grantStatus(grant, now) === 'active')
    || matching.filter(grant => grantStatus(grant, now) === 'upcoming')
      .sort((a, b) => stamp(a.startsAt) - stamp(b.startsAt))[0]
}

export function accessFor(subscriber, grant, now = new Date()) {
  if (subscriber.status === 'removed') return { type: 'removed', paid: false, founding: false }
  const hasPaidPeriod = !subscriber.paidThroughAt || stamp(subscriber.paidThroughAt) > now
  const founding = subscriber.baseType === 'founding' && hasPaidPeriod
  const paid = subscriber.baseType === 'paid' && hasPaidPeriod
  if (grant && grantStatus(grant, now) === 'active') return { type: 'comp', paid: true, founding: founding || grant.tier === 'founding' }
  if (founding || paid) return { type: subscriber.baseType, paid: true, founding }
  if (subscriber.baseType === 'trial' && stamp(subscriber.trialEndsAt) > now) return { type: 'trial', paid: true, founding: false }
  return { type: 'free', paid: false, founding: false }
}
