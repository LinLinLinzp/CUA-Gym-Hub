import { blockOffsets, bodyText, sliceFragment, textFragment } from './body.js'
import { documentContent, fixtures, people, templateContent } from './sampleContent.js'

const AVERY = 'usr_avery'
const ORG = 'org_northwind'

const colors = ['#285D78', '#6e507c', '#336751', '#8a4e50', '#765c31', '#4e5684']
const timeAt = (daysAgo = 0, hour = 14) => new Date(Date.UTC(2026, 9, 29 - daysAgo, hour, 15)).toISOString()
const audit = (person, createdAt, updatedAt = createdAt) => ({
  createdAt, createdByUserId: person, updatedAt, updatedByUserId: person,
})

function makeBody(id, paragraphs) {
  return { blocks: (paragraphs.length ? paragraphs : [['']]).map(([text, style = 'normal', list = null, marks = []], index) => ({
    id: `${id}_block_${index + 1}`, style, list, alignment: 'left', runs: text ? [{ text, marks }] : [],
  })) }
}

function seedUsers() {
  return people.map(([key, name], index) => ({
    id: 'usr_' + key, name,
    initials: name.split(' ').map((part) => part[0]).join(''),
    email: name.toLowerCase().replaceAll(' ', '.') + (index < 26 ? '@northwind.example.com' : '@cedar.example.com'),
    organizationId: index < 26 ? ORG : null, avatarColor: colors[index % colors.length],
  }))
}

function seedTemplates() {
  return templateContent.map(([key, name, description, paragraphs]) => {
    const id = 'tpl_' + key
    return { id, name, description, body: makeBody(id, paragraphs) }
  })
}

function seedDocuments(users) {
  const content = [...fixtures, ...documentContent.map(([title, heading, summary], index) => {
    const owner = index % 3 === 1 ? users[(index % (users.length - 1)) + 1].id.slice(4) : 'avery'
    const id = 'doc_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const paragraphs = heading ? [[title, 'title'], [heading, 'heading1'], [summary]] : []
    if ([1, 9, 22].includes(index)) paragraphs.push(
      ['Team inputs', 'heading2'],
      ['Review the baseline with the teams responsible for implementation and record where estimates differ before the next decision.'],
      ['Ask the project lead for a short update on open dependencies and attach it to the planning notes.'],
      ['Follow-up', 'heading2'],
      ['Assign an owner to every action and capture the decision date when there is agreement.'],
    )
    return [id, title, owner, paragraphs]
  })]
  return content.map(([id, title, key, paragraphs], index) => {
    const ownerId = 'usr_' + key
    const deleted = index >= content.length - 3
    const createdAt = timeAt(index + 42)
    const updatedAt = timeAt(index)
    const mode = index === 1 ? 'everyone' : index === 2 ? 'mine' : index > 5 && index % 9 === 0 ? 'everyone' : index > 5 && index % 7 === 0 ? 'mine' : 'off'
    return {
      id, title, ownerId, locationLabel: ownerId === AVERY ? 'OneDrive · Documents' : 'Shared documents',
      originTemplateId: null, copiedFromDocumentId: null, status: deleted ? 'deleted' : 'active',
      deletedAt: deleted ? updatedAt : null, deletedByUserId: deleted ? ownerId : null,
      body: makeBody(id, paragraphs), revision: index === 1 ? 2 : index % 5,
      tracking: { mode, ...audit(ownerId, createdAt, updatedAt) }, ...audit(ownerId, createdAt, updatedAt),
    }
  })
}

function seedActivity(documents) {
  const actorHistory = documents.slice(0, 40).map((doc, index) => ({
    id: `activity_avery_${doc.id}`, documentId: doc.id, userId: AVERY,
    openedAt: timeAt(index, 16), isFavorite: [0, 4, 6, 10, 14, 20, 24, 28, 35].includes(index),
    ...audit(AVERY, timeAt(index + 3), timeAt(index, 16)),
  }))
  const ownerHistory = documents.filter((doc) => doc.ownerId !== AVERY).map((doc, index) => ({
    id: `activity_owner_${doc.id}`, documentId: doc.id, userId: doc.ownerId,
    openedAt: timeAt(index + 4), isFavorite: index % 4 === 0,
    ...audit(doc.ownerId, doc.createdAt, timeAt(index + 4)),
  }))
  return [...actorHistory, ...ownerHistory]
}

function seedComments(documents) {
  const docs = documents.filter((doc) => doc.id !== 'doc_private_notes' && bodyText(doc.body))
  const prompt = [
    'Could we confirm who will take the next step before sharing this?',
    'Please include the source in the notes so the next team can trace the decision.',
    'Can we review this with Operations before we publish?',
    'Please clarify how the escalation works outside business hours.',
    'This matches our last discussion. Should we link the decision record?',
    'Can we give the regional teams a day to check how this applies to them?',
    'Let’s verify the timing with the team that owns the handover.',
  ]
  return Array.from({ length: 56 }, (_, index) => {
    const doc = docs[index < 2 ? 0 : (index - 1) % docs.length]
    const text = bodyText(doc.body)
    const quote = index === 0 ? '12 October' : index === 1 ? 'Rollout plan' : text.slice(0, text.indexOf(' '))
    const start = text.indexOf(quote)
    const authorId = doc.id === 'doc_launch_brief' ? 'usr_riley' : doc.ownerId
    const replyAuthor = authorId === AVERY ? 'usr_riley' : AVERY
    const status = index === 1 || (index > 1 && index % 4 === 0) ? 'resolved' : index > 1 && index % 11 === 0 ? 'deleted' : 'active'
    const issueDate = timeAt(index + 3, 11)
    const followupDate = timeAt(index + 1, 12)
    const id = index === 0 ? 'thread_launch_target' : index === 1 ? 'thread_launch_rollout' : `thread_seed_${index.toString().padStart(2, '0')}`
    const starter = {
      id: id + '_starter', authorId, createdAt: issueDate,
      body: index === 0 ? '@Avery Morgan Could we confirm this date with the regional leads?' :
        index === 1 ? 'The staged rollout was approved at the coordination meeting.' : prompt[index % prompt.length],
      mentionUserIds: index === 0 ? [AVERY] : [], editedAt: null, editedByUserId: null,
      deletedAt: status === 'deleted' ? followupDate : null, deletedByUserId: status === 'deleted' ? authorId : null,
    }
    const messages = [starter]
    if (index === 0 || index % 3 === 0) messages.push({
      id: id + '_reply', authorId: replyAuthor, createdAt: followupDate,
      body: index === 0 ? 'I’ll confirm with the pilot offices after the readiness call.' : 'I’ll check the decision with the owner and follow up.',
      mentionUserIds: [], editedAt: null, editedByUserId: null, deletedAt: null, deletedByUserId: null,
    })
    return {
      id, documentId: doc.id, status, messages, anchor: { start, end: start + quote.length, quote, detached: false },
      resolvedAt: status === 'resolved' ? followupDate : null, resolvedByUserId: status === 'resolved' ? replyAuthor : null,
      deletedAt: starter.deletedAt, deletedByUserId: starter.deletedByUserId,
      ...audit(authorId, issueDate, messages.length > 1 || status !== 'active' ? followupDate : issueDate),
    }
  })
}

function seedChanges(documents) {
  const policy = documents[1]
  const source = bodyText(policy.body)
  const policyInsert = source.indexOf('before')
  const policyDelete = source.lastIndexOf('must ')
  const policyFixtures = [
    ['change_policy_insert', 'insert', policyInsert, policyInsert, 'at least five business days ', 'pending'],
    ['change_policy_delete', 'delete', policyDelete, policyDelete + 'must '.length, '', 'pending'],
    ['change_policy_accepted', 'replace', source.indexOf('every October'), source.indexOf('every October') + 'every October'.length, 'every October', 'accepted'],
    ['change_policy_rejected', 'replace', source.indexOf('core overlap hours'), source.indexOf('core overlap hours') + 'core overlap hours'.length, 'office hours', 'rejected'],
  ]
  function record(doc, index, { id, kind, start, end, replacement, status, formatScope }) {
    const range = { start, end }
    const before = sliceFragment(doc.body, range, formatScope === 'paragraph')
    let after = textFragment(replacement, [], before.blocks[0])
    if (kind === 'format') after = { blocks: before.blocks.map((block) => ({ ...block, alignment: 'center' })) }
    if (status === 'withdrawn') after = before
    if (status === 'accepted') {
      if (kind === 'insert') {
        const text = bodyText(doc.body).slice(start)
        after = textFragment(text.slice(0, text.indexOf(' ') + 1), [], blockOffsets(doc.body).find((entry) => entry.start === start)?.block)
      } else if (kind === 'format') {
        after = { blocks: before.blocks }
        before.blocks = before.blocks.map((block) => ({ ...block, alignment: 'center' }))
      } else if (kind === 'replace') {
        after = { blocks: before.blocks.map((block) => ({ ...block })) }
        before.blocks[0].runs = [{ text: id === 'change_policy_accepted' ? 'every December' : 'Draft', marks: [] }]
      }
    }
    const authorId = doc.ownerId === AVERY ? 'usr_riley' : AVERY
    const createdAt = timeAt(index + 2, 10)
    const decidedAt = status === 'pending' ? null : timeAt(index + 1, 17)
    const decidedByUserId = decidedAt ? (status === 'withdrawn' ? authorId : doc.ownerId) : null
    return {
      id, documentId: doc.id, authorId, kind, range, before, after, status, decidedAt, decidedByUserId,
      ...(formatScope ? { formatScope } : {}), ...audit(authorId, createdAt, decidedAt || createdAt),
      updatedByUserId: decidedByUserId || authorId,
    }
  }
  const special = policyFixtures.map(([id, kind, start, end, replacement, status], index) => record(policy, index, { id, kind, start, end, replacement, status }))
  const samples = documents.filter((doc) => !['doc_policy_revision', 'doc_private_notes'].includes(doc.id) && bodyText(doc.body))
  const additional = Array.from({ length: 44 }, (_, index) => {
    const doc = samples[index % samples.length]
    const offsets = blockOffsets(doc.body)
    const { start, end } = offsets.at(-1)
    const status = ['pending', 'pending', 'accepted', 'rejected', 'withdrawn'][index % 5]
    const kind = ['insert', 'delete', 'replace', 'format'][index % 4]
    const wordEnd = start + bodyText(doc.body).slice(start, end).indexOf(' ')
    const selectionEnd = kind === 'insert' ? start : kind === 'format' ? end : Math.max(start + 1, wordEnd)
    return record(doc, index + 4, {
      id: `change_seed_${index.toString().padStart(2, '0')}`, kind, start, end: selectionEnd, status,
      replacement: kind === 'insert' ? 'For review: ' : kind === 'replace' ? 'Review' : '',
      formatScope: kind === 'format' ? 'paragraph' : null,
    })
  })
  return [...special, ...additional]
}

function seedSharing(documents, users) {
  const peopleById = new Map(users.map((person) => [person.id, person]))
  const docs = documents.filter((doc) => doc.status === 'active' && doc.id !== 'doc_private_notes')
  const docsById = new Map(docs.map((doc) => [doc.id, doc]))
  const permissions = ['edit', 'review', 'view', 'viewNoDownload']
  const candidates = [
    ['doc_launch_brief', 'usr_riley', 'review'],
    ['doc_launch_brief', 'usr_mina', 'edit'],
    ['doc_launch_brief', 'usr_jordan', 'view'],
    ['doc_vendor_review', AVERY, 'review'],
    ['doc_expense_reference', AVERY, 'viewNoDownload'],
  ]
  for (const doc of docs.filter((entry) => entry.ownerId !== AVERY && !['doc_vendor_review', 'doc_expense_reference'].includes(entry.id))) {
    candidates.push([doc.id, AVERY, permissions[candidates.length % permissions.length]])
  }
  for (let index = 0; candidates.length < 48; index += 1) {
    const doc = docs[index % docs.length]
    const person = users[((index + 2) % (users.length - 1)) + 1]
    if (doc.ownerId !== person.id && !candidates.some(([documentId, userId]) => documentId === doc.id && userId === person.id)) {
      candidates.push([doc.id, person.id, permissions[index % permissions.length]])
    }
  }
  const shareInvitations = []
  const shareGrants = candidates.map(([documentId, userId, permission], index) => {
    const doc = docsById.get(documentId)
    const recipient = { userId, email: peopleById.get(userId).email }
    const createdAt = timeAt(index + 8, 9)
    const invitationId = index < 40 ? 'invite_seed_' + index : null
    const revoked = index > 5 && index % 9 === 0
    const revokedAt = revoked ? timeAt(index + 2, 15) : null
    if (invitationId) shareInvitations.push({
      id: invitationId, documentId, recipients: [recipient], permission, status: 'sent',
      message: ['Please take a look before the next team check-in.', 'Sharing the latest version for your reference.', null][index % 3],
      ...audit(doc.ownerId, createdAt),
    })
    return {
      id: index === 3 ? 'grant_vendor_avery' : index === 4 ? 'grant_expense_avery' : 'grant_seed_' + index,
      documentId, ...recipient, permission, invitationId, status: revoked ? 'revoked' : 'active',
      revokedAt, revokedByUserId: revoked ? doc.ownerId : null, ...audit(doc.ownerId, createdAt, revokedAt || createdAt),
    }
  })
  const shareLinks = Array.from({ length: 36 }, (_, index) => {
    const doc = index === 0 ? docsById.get('doc_launch_brief') : index === 1 ? docsById.get('doc_expense_reference') : docs[(index + 1) % docs.length]
    const owner = peopleById.get(doc.ownerId)
    const options = ['anyone', 'organization', 'existingAccess', 'specificPeople']
    let scope = index === 0 ? 'anyone' : index === 1 ? 'specificPeople' : options[index % options.length]
    if (scope === 'organization' && !owner.organizationId) scope = 'existingAccess'
    const permission = index === 0 ? 'review' : index === 1 ? 'viewNoDownload' : scope === 'existingAccess' ? null : permissions[(index + 1) % permissions.length]
    const recipientEmails = scope === 'specificPeople' ? [peopleById.get(doc.ownerId === AVERY ? 'usr_riley' : AVERY).email] : []
    const id = index === 0 ? 'link_launch_review' : index === 1 ? 'link_expense_reference' : 'link_seed_' + index
    const createdAt = timeAt(index + 10, 9)
    const lastCopiedAt = timeAt(index + 5, 11)
    const revokedAt = index > 1 && index % 5 === 0 ? timeAt(index + 2, 13) : null
    return {
      id, documentId: doc.id, scope, permission, organizationId: scope === 'organization' ? owner.organizationId : null,
      recipientEmails, path: '/share/' + id, status: revokedAt ? 'revoked' : 'active',
      lastCopiedAt, lastCopiedByUserId: doc.ownerId, revokedAt, revokedByUserId: revokedAt ? doc.ownerId : null,
      ...audit(doc.ownerId, createdAt, revokedAt || lastCopiedAt),
    }
  })
  return { shareInvitations, shareGrants, shareLinks }
}

export function createInitialData() {
  const users = seedUsers()
  const documents = seedDocuments(users)
  return {
    currentUserId: AVERY,
    users,
    templates: seedTemplates(),
    documents,
    documentActivity: seedActivity(documents),
    commentThreads: seedComments(documents),
    trackedChanges: seedChanges(documents),
    ...seedSharing(documents, users),
  }
}
