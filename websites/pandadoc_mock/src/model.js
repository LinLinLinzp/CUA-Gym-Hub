import { calculateTable, documentValue, items, pricingSnapshot, validateTable } from './pricing.js'

export const statuses = ['draft', 'sent', 'viewed', 'completed', 'declined', 'expired']
export const id = prefix => prefix + '_' + crypto.randomUUID()
export const timestamp = () => new Date().toISOString()
export const actor = state => state.workspace?.currentUserId || items(state.users)[0]?.id || 'workspace'
export const currencyOf = (document, workspace) => document?.currency || workspace?.currency || 'USD'
export const documentById = (state, key) => items(state.documents).find(document => document.id === key)
export const activeDelivery = document => ['sent', 'viewed'].includes(document?.status)

export function activityFor(state, type, documentId, createdAt, relatedIds = [], recipientId) {
  return {
    id: id('act'), ...(documentId ? { documentId } : {}), type, relatedIds, createdAt,
    actorId: recipientId || actor(state), actorType: recipientId ? 'recipient' : 'user',
  }
}

const withActivity = (state, ...events) => ({ ...state, activity: [...items(state.activity), ...events] })
const patchDocument = (state, document) => ({
  ...state, documents: items(state.documents).map(current => current.id === document.id ? document : current),
})

function draftFor(state, snapshot) {
  const latest = documentById(state, snapshot.id)
  if (latest?.status !== 'draft') throw new Error('This proposal is no longer editable.')
  if (JSON.stringify(latest) !== JSON.stringify(snapshot)) {
    throw new Error('This draft changed in another tab. Reload the proposal before saving.')
  }
  return latest
}

export function createDocument(state, payload) {
  const { documentId, title, company, templateId, sourceDocumentId } = payload
  if (!title?.trim()) throw new Error('Enter a proposal title.')
  const source = sourceDocumentId ? documentById(state, sourceDocumentId)
    : items(state.templates).find(template => template.id === templateId)
  if ((sourceDocumentId || templateId) && !source) throw new Error('The source proposal or template is no longer available.')
  const date = timestamp()
  const currency = currencyOf(source, state.workspace)
  const pricingTables = items(source?.pricingTables).map(table => calculateTable({
    ...table, id: id('pt'), currency, createdAt: date, updatedAt: date,
    lineItems: items(table.lineItems).map(row => ({ ...row, id: id('li') })),
  }))
  const sections = source ? items(source.sections).map(section => ({ ...section, id: id('sec') }))
    : [{ id: id('sec'), heading: 'Scope of work', body: '' }]
  const document = {
    id: documentId, title: title.trim(), company: company?.trim() || '', currency, ownerId: actor(state),
    ...(templateId || source?.templateId ? { templateId: templateId || source.templateId } : {}),
    ...(sourceDocumentId ? { sourceDocumentId } : {}),
    sections, pricingTables, value: documentValue(pricingTables), status: 'draft',
    recipients: [], fields: [], signingOrderEnabled: false, createdAt: date, updatedAt: date,
  }
  return withActivity({ ...state, documents: [...items(state.documents), document] },
    activityFor(state, sourceDocumentId ? 'document.duplicated' : 'document.created', documentId, date,
      [sourceDocumentId || templateId].filter(Boolean)))
}

export function createContact(state, contact) {
  const name = contact.name.trim()
  const email = contact.email.trim()
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a name and a valid email address.')
  if (items(state.contacts).some(person => person.email?.toLowerCase() === email.toLowerCase())) {
    throw new Error('A contact already uses this email address.')
  }
  const date = timestamp()
  const record = { ...contact, name, email, company: contact.company.trim(), title: contact.title.trim(), createdBy: actor(state), createdAt: date }
  return withActivity({ ...state, contacts: [...items(state.contacts), record] },
    activityFor(state, 'contact.created', null, date, [record.id]))
}

export function assignmentError(sections, recipients, fields) {
  if (fields.some(field => !sections.some(section => section.id === field.sectionId))) {
    return 'Choose an existing section for each signature field or remove the field.'
  }
  if (fields.some(field => !recipients.some(recipient => recipient.id === field.recipientId && recipient.role === 'signer'))) {
    return 'Assign each signature field to a signer or remove the field.'
  }
  return ''
}

export function sendError(document) {
  const recipients = items(document.recipients)
  const signers = recipients.filter(recipient => recipient.role === 'signer')
  const fields = items(document.fields)
  if (!signers.length) return 'Add at least one signer before sending.'
  return assignmentError(items(document.sections), recipients, fields)
    || (signers.some(signer => !fields.some(field => field.recipientId === signer.id && field.type === 'signature' && field.required))
      ? 'Give every signer a required Signature field.' : '')
}

export function saveDraft(state, snapshot, changes, areas) {
  const document = draftFor(state, snapshot)
  const date = timestamp()
  const next = { ...document }
  const events = []
  if (areas.includes('content')) {
    if (!changes.title.trim()) throw new Error('Enter a proposal title.')
    const sections = changes.sections.map(section => ({ ...section, heading: section.heading?.trim() || '' }))
    if (sections.some(section => !section.heading)) throw new Error('Enter a heading for each section.')
    Object.assign(next, { title: changes.title.trim(), company: changes.company.trim(), sections })
    events.push(activityFor(state, 'document.updated', next.id, date, sections.map(section => section.id)))
  }
  if (areas.includes('recipients')) {
    let order = 0
    next.recipients = changes.recipients.map(recipient => {
      const { order: previousOrder, ...rest } = recipient
      return {
        ...rest, addedAt: rest.addedAt || date,
        ...(changes.signingOrderEnabled && rest.role === 'signer' ? { order: ++order } : {}),
      }
    })
    next.signingOrderEnabled = changes.signingOrderEnabled
    const recipientKeys = next.recipients.map(recipient => recipient.contactId || recipient.email || recipient.id)
    if (new Set(recipientKeys).size !== recipientKeys.length) throw new Error('Each contact can be added once.')
    events.push(activityFor(state, 'recipients.updated', next.id, date, next.recipients.map(recipient => recipient.id)))
  }
  if (areas.includes('fields')) {
    next.fields = changes.fields.map(field => ({ ...field, label: field.label?.trim() || 'Signature', createdAt: field.createdAt || date }))
    events.push(activityFor(state, 'fields.updated', next.id, date, next.fields.map(field => field.id)))
  }
  const invalid = assignmentError(items(next.sections), items(next.recipients), items(next.fields))
  if (invalid) throw new Error(invalid)
  return withActivity(patchDocument(state, { ...next, updatedAt: date }), ...events)
}

export function savePricing(state, snapshot, table, remove = false) {
  const document = draftFor(state, snapshot)
  const date = timestamp()
  const existing = items(document.pricingTables)
  let pricingTables
  if (remove) {
    pricingTables = existing.filter(current => current.id !== table.id)
  } else {
    const saved = validateTable({ ...table, currency: currencyOf(document, state.workspace), createdAt: table.createdAt || date, updatedAt: date })
    pricingTables = existing.some(current => current.id === saved.id)
      ? existing.map(current => current.id === saved.id ? saved : current) : [...existing, saved]
  }
  return withActivity(patchDocument(state, { ...document, pricingTables, value: documentValue(pricingTables), updatedAt: date }),
    activityFor(state, remove ? 'pricing.removed' : 'pricing.saved', document.id, date, [table.id, ...items(table.lineItems).map(row => row.id)]))
}

export function sendDocument(state, snapshot, subject, message) {
  const document = draftFor(state, snapshot)
  const error = sendError(document)
  if (error) throw new Error(error)
  const date = timestamp()
  const delivery = {
    id: id('del'), documentId: document.id, recipientIds: items(document.recipients).map(recipient => recipient.id),
    method: 'link', ...(subject.trim() ? { subject: subject.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}),
    status: 'sent', actorId: actor(state), createdAt: date,
  }
  const next = patchDocument(state, { ...document, status: 'sent', sentAt: date, updatedAt: date })
  return withActivity({ ...next, deliveries: [...items(state.deliveries), delivery] },
    activityFor(state, 'document.sent', document.id, date, [delivery.id, ...delivery.recipientIds]))
}

export function signingStatus(state, document, recipient) {
  if (!recipient || recipient.role !== 'signer') return 'read-only'
  const completed = person => person.status === 'completed' || items(state.signingCompletions).some(
    entry => entry.documentId === document.id && entry.recipientId === person.id,
  )
  if (completed(recipient)) return 'completed'
  if (!activeDelivery(document)) return 'read-only'
  if (document.signingOrderEnabled && items(document.recipients).some(person => (
    person.role === 'signer' && person.order < recipient.order && !completed(person)
  ))) return 'waiting'
  return 'ready'
}

export const priceIsLocked = (state, documentId) => items(state.signingCompletions).some(entry => entry.documentId === documentId)

function matchesAcceptedPricing(document, snapshot, choices) {
  if (JSON.stringify(document.pricingTables) !== JSON.stringify(snapshot.pricingTables)) return false
  return items(document.pricingTables).every(table => items(table.lineItems).every(row => {
    const choice = choices[row.id]
    return !choice || ((choice.quantity === undefined || Number(choice.quantity) === row.quantity)
      && (choice.selected === undefined || choice.selected === (row.selected !== false)))
  }))
}

export function finishSigning(state, snapshot, recipientId, entries, choices) {
  const document = documentById(state, snapshot.id)
  const recipient = items(document?.recipients).find(person => person.id === recipientId)
  const status = signingStatus(state, document, recipient)
  if (status === 'completed') throw new Error('You have already finished signing this proposal.')
  if (status !== 'ready') throw new Error('This proposal is unavailable for your signature.')
  const fieldsFor = record => items(record.fields).filter(field => field.recipientId === recipientId && field.type === 'signature')
  const fields = fieldsFor(document)
  if (JSON.stringify(fields) !== JSON.stringify(fieldsFor(snapshot))) throw new Error('Your signature fields changed. Review the current proposal.')
  if (!fields.length) throw new Error('There are no signature fields assigned to you.')
  const sameRecipient = signature => signature.documentId === document.id && signature.recipientId === recipientId
  const saved = new Map(items(state.signatures).filter(sameRecipient).map(signature => [signature.fieldId, signature]))
  const hasValue = entry => typeof entry?.value === 'string' && Boolean(entry.value.trim())
  const entryFor = field => hasValue(saved.get(field.id)) ? saved.get(field.id) : entries[field.id]
  if (fields.some(field => field.required && !hasValue(entryFor(field)))) throw new Error('Complete every required signature before finishing.')
  const locked = priceIsLocked(state, document.id)
  if (locked && !matchesAcceptedPricing(document, snapshot, choices)) {
    throw Object.assign(new Error('The price changed when another signer finished. Review the accepted pricing and try again.'), { code: 'price_changed' })
  }
  const date = timestamp()
  let priceChanged = false
  const pricingTables = items(document.pricingTables).map(table => {
    if (locked) return table
    let changed = false
    const lineItems = items(table.lineItems).map(row => {
      const choice = choices[row.id]
      if (!choice) return row
      const selected = row.optional && choice.selected !== undefined ? choice.selected : row.selected
      const quantity = row.quantityEditable && choice.quantity !== undefined ? Number(choice.quantity) : Number(row.quantity)
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Enter a positive whole quantity for the pricing item.')
      if (selected === row.selected && quantity === row.quantity) return row
      changed = true
      return { ...row, selected, quantity }
    })
    if (!changed) return table
    priceChanged = true
    const calculated = calculateTable({ ...table, lineItems, updatedAt: date })
    if (!Number.isFinite(calculated.total)) throw new Error('The pricing total is too large.')
    return calculated
  })
  const value = priceChanged ? documentValue(pricingTables) : Number(document.value ?? documentValue(pricingTables))
  if (!Number.isFinite(value)) throw new Error('The pricing total is too large.')
  const completionId = id('cmp')
  const signatures = fields.filter(field => hasValue(entryFor(field))).map(field => {
    const previous = saved.get(field.id)
    if (previous?.completionId && items(state.signingCompletions).some(completion => completion.id === previous.completionId)) {
      throw new Error('A signature is already linked to an existing completion. Review the proposal before finishing.')
    }
    if (hasValue(previous)) return { ...previous, id: previous.id || id('sig'), completionId }
    const entry = entryFor(field)
    return {
      id: previous?.id || id('sig'), documentId: document.id, recipientId, fieldId: field.id, completionId,
      method: entry.method, value: entry.value.trim(), status: 'signed', actorId: recipientId, createdAt: date,
    }
  })
  const completedFields = new Set(signatures.map(signature => signature.fieldId))
  const completion = {
    id: completionId, documentId: document.id, recipientId, signatureIds: signatures.map(signature => signature.id),
    pricingSnapshot: pricingSnapshot(pricingTables), currency: currencyOf(document, state.workspace),
    documentValue: value, status: 'completed', actorId: recipientId, createdAt: date,
  }
  const recipients = items(document.recipients).map(person => person.id === recipientId
    ? { ...person, status: 'completed', completedAt: date } : person)
  const finished = recipients.filter(person => person.role === 'signer').every(person => person.status === 'completed'
    || signingStatus(state, document, person) === 'completed')
  const next = patchDocument(state, {
    ...document, recipients, ...(priceChanged ? { pricingTables, value } : {}), updatedAt: date,
    ...(finished ? { status: 'completed', completedAt: date } : {}),
  })
  return withActivity({
    ...next,
    signatures: [...items(state.signatures).filter(signature => !sameRecipient(signature) || !completedFields.has(signature.fieldId)), ...signatures],
    signingCompletions: [...items(state.signingCompletions), completion],
  }, activityFor(state, 'signing.completed', document.id, date, [completion.id, ...completion.signatureIds], recipientId))
}
