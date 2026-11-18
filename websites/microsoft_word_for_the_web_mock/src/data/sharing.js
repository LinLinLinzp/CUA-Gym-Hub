import { actorOf, emailKey, permissionLabels, rows, scopeLabels, userOf } from './access.js'
import { sharePath } from '../utils/routes.js'
import { created, newId, updated } from './documents.js'

export const validEmail = (email) => /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)

export function recipientIdentity(state, address) {
  const value = String(address ?? '').trim()
  const people = rows(state, 'users')
  const user = people.find((person) => emailKey(person.email) === emailKey(value) || person.name?.toLowerCase() === value.toLowerCase())
  const email = emailKey(user?.email || value)
  return validEmail(email) ? { email, userId: user?.id ?? null } : null
}

export function invitePeople(state, doc, input, permission, note) {
  const actor = actorOf(state)?.id
  if (!actor || !permissionLabels[permission]) return state
  const ownerEmail = emailKey(userOf(state, doc.ownerId)?.email)
  const recipients = [...new Map(input.map(({ email }) => recipientIdentity(state, email))
    .filter((recipient) => recipient && recipient.email !== ownerEmail && recipient.userId !== doc.ownerId)
    .map((recipient) => [recipient.email, recipient])).values()]
  if (!recipients.length) return state
  const time = new Date().toISOString()
  const invitation = {
    id: newId('invite'), documentId: doc.id, recipients, permission, message: note.trim() || null, status: 'sent',
    ...created(actor, time),
  }
  const grants = [...rows(state, 'shareGrants')]
  for (const recipient of recipients) {
    const index = grants.findIndex((grant) => grant.documentId === doc.id && emailKey(grant.email) === recipient.email)
    const details = {
      ...recipient, permission, invitationId: invitation.id, status: 'active',
      revokedAt: null, revokedByUserId: null, ...updated(actor, time),
    }
    if (index < 0) grants.push({ id: newId('grant'), documentId: doc.id, ...created(actor, time), ...details })
    else grants[index] = { ...grants[index], ...details }
  }
  return { ...state, shareInvitations: [...rows(state, 'shareInvitations'), invitation], shareGrants: grants }
}

export function linkConfiguration(state, settings) {
  const actor = actorOf(state)
  const { scope, permission, recipientEmails } = settings
  if (!actor || !scopeLabels[scope]) return { error: 'Choose a link audience.' }
  if (scope !== 'existingAccess' && !permissionLabels[permission]) return { error: 'Choose a link permission.' }
  if (scope === 'organization' && !actor.organizationId) return { error: 'Your account is not part of an organization.' }
  const emails = scope === 'specificPeople' ? [...new Set((recipientEmails ?? []).map(emailKey).filter(validEmail))].sort() : []
  if (scope === 'specificPeople' && !emails.length) return { error: 'Add at least one person.' }
  return {
    scope, permission: scope === 'existingAccess' ? null : permission,
    organizationId: scope === 'organization' ? actor.organizationId : null, recipientEmails: emails,
  }
}

export function copyLink(state, doc, settings) {
  const configuration = linkConfiguration(state, settings)
  if (configuration.error) return { state, error: configuration.error }
  const actor = actorOf(state).id
  const links = rows(state, 'shareLinks')
  const existing = links.find((link) => link.status === 'active' && link.documentId === doc.id &&
    link.scope === configuration.scope && (link.permission ?? null) === configuration.permission &&
    (link.organizationId ?? null) === configuration.organizationId &&
    JSON.stringify((link.recipientEmails ?? []).map(emailKey).sort()) === JSON.stringify(configuration.recipientEmails))
  const id = existing?.id ?? newId('link')
  const time = new Date().toISOString()
  const link = {
    id, documentId: doc.id, revokedAt: null, revokedByUserId: null,
    ...created(actor, time), ...existing, ...configuration, path: sharePath(id), status: 'active',
    lastCopiedAt: time, lastCopiedByUserId: actor, ...updated(actor, time),
  }
  return { link, state: { ...state, shareLinks: existing ? links.map((entry) => entry.id === id ? link : entry) : [...links, link] } }
}

export function changeAccess(state, doc, collection, id, permission = null) {
  const actor = actorOf(state)?.id
  if (!actor || doc.ownerId !== actor || !['shareGrants', 'shareLinks'].includes(collection)) return state
  if (permission && (collection !== 'shareGrants' || !permissionLabels[permission])) return state
  const entries = rows(state, collection)
  const access = entries.find((item) => item.id === id && item.documentId === doc.id && item.status === 'active')
  const ownerEmail = emailKey(userOf(state, doc.ownerId)?.email)
  const isOwnerGrant = collection === 'shareGrants' && (access?.userId === doc.ownerId || Boolean(ownerEmail && emailKey(access?.email) === ownerEmail))
  if (!access || isOwnerGrant || (permission && access.permission === permission)) return state
  const time = new Date().toISOString()
  const patch = permission ? { permission } : { status: 'revoked', revokedAt: time, revokedByUserId: actor }
  return { ...state, [collection]: entries.map((item) => item === access ? { ...item, ...patch, ...updated(actor, time) } : item) }
}
