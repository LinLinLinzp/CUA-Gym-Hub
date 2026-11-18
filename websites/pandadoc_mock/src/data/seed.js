import { calculateTable, documentValue, pricingSnapshot } from '../pricing.js'

const accounts = [
  ['Hana Soto', 'Harborlight Books'], ['Rowan Ellis', 'Northline Coffee'], ['Priya Shah', 'Juniper Health'],
  ['Elliot Park', 'Fieldwork Collective'], ['Nadia Chen', 'Lumen House'], ['Sam Rivera', 'Cedar & Coast'],
  ['Tessa Dunn', 'Morrow Kitchen'], ['Noah Kim', 'Fable Learning'], ['Imani Brooks', 'Aster Supply'],
  ['Mateo Flores', 'Silverfern Labs'], ['Ava Green', 'Wildgrid Energy'], ['Leila Moss', 'Everwell Market'],
  ['Micah Cole', 'Rill Architecture'], ['Zoe Reed', 'Stoneway Design'], ['Sofia Vega', 'Bluebird Ceramics'],
  ['Hugo Tran', 'Hearthside Foods'], ['Mina Woods', 'Broadleaf Partners'], ['Owen Snow', 'Acre & Air'],
  ['Dara Singh', 'Branchline Press'], ['Jules Price', 'Marsh Street Hotel'], ['Tariq Lane', 'Daybreak Studio'],
  ['Lina Fox', 'Sable Workshop'], ['Nico Ross', 'Paperbridge'], ['Mara Bell', 'Common Ground Farms'],
  ['Ada Banks', 'Bloomfield Works'], ['Gia Wong', 'Interval Music'], ['Reese Hall', 'Little Orchard'],
  ['Iris Stone', 'Kite Hill Goods'], ['Leo Wells', 'Northstar Wellness'], ['Anya Quinn', 'Driftwood Cycling'],
]

const services = {
  Strategy: ['Discovery workshop', 'Messaging framework', 'Competitive scan', 'Launch roadmap', 'Audience interviews', 'Positioning brief'],
  Design: ['Visual identity', 'Type system', 'Packaging concept', 'Presentation design', 'Campaign art direction', 'Illustration suite'],
  Digital: ['Website wireframes', 'Homepage design', 'Accessibility review', 'Content migration', 'Development sprint', 'Analytics setup'],
  Content: ['Editorial guidelines', 'Product copy', 'Newsletter series', 'Photography planning', 'Social toolkit', 'Case study writing'],
  Support: ['Launch support', 'Team training', 'Monthly reporting', 'Design office hours', 'Content maintenance', 'Handoff documentation'],
}

const templateNames = {
  Strategy: ['Brand launch proposal', 'Market research plan', 'Positioning engagement', 'Discovery workshop plan', 'Growth strategy brief'],
  Design: ['Visual identity proposal', 'Packaging design scope', 'Campaign creative estimate', 'Brand refresh proposal', 'Presentation design brief'],
  Digital: ['Website redesign proposal', 'Ecommerce discovery', 'Accessibility improvement plan', 'Landing page estimate', 'Product prototype scope'],
  Content: ['Editorial retainer', 'Content migration proposal', 'Messaging and copy scope', 'Photography production brief', 'Newsletter launch plan'],
  Support: ['Launch support plan', 'Creative services retainer', 'Quarterly support agreement', 'Studio onboarding plan'],
}

const day = offset => new Date(Date.UTC(2026, 9, 4 + offset, 15)).toISOString()
const section = (key, heading, body) => ({ id: 'sec_' + key, heading, body })

export function createInitialData() {
  const workspace = { id: 'ws_alder', name: 'Alder Studio', currentUserId: 'usr_maya', currency: 'USD' }
  const users = [
    { id: 'usr_maya', name: 'Maya Patel', email: 'maya@alder.example', role: 'member' },
    { id: 'usr_elena', name: 'Elena Morris', email: 'elena@alder.example', role: 'admin' },
    { id: 'usr_jamie', name: 'Jamie Bell', email: 'jamie@alder.example', role: 'member' },
  ]
  const contacts = accounts.map(([name, company], index) => ({
    id: 'ct_' + name.split(' ')[0].toLowerCase(), name, company,
    email: name.split(' ')[0].toLowerCase() + '@' + company.toLowerCase().replace(/[^a-z]/g, '') + '.example',
    title: ['Operations Director', 'Founder', 'Marketing Lead', 'Project Manager'][index % 4],
    createdBy: users[index % 3].id, createdAt: day(index % 15),
  }))
  const catalogItems = Object.entries(services).flatMap(([category, names], group) => names.map((name, index) => ({
    id: group + index === 0 ? 'prd_workshop' : 'prd_' + group + '_' + index,
    sku: category.slice(0, 3).toUpperCase() + '-' + (101 + index),
    name, description: group + index === 0 ? 'Two-hour stakeholder workshop' : name + ' for one project, including a review round',
    category, unitPrice: 450 + group * 65 + index * 125, currency: 'USD',
  })))
  function estimate(key, catalogIndex, date, optional = false) {
    const product = catalogItems[catalogIndex % catalogItems.length]
    const productRow = (item, index) => ({
      id: 'li_' + key + '_' + index, catalogItemId: item.id, name: item.name, description: item.description,
      unitPrice: item.unitPrice, quantity: index ? 1 : 2, optional: !!index, selected: true,
      quantityEditable: !!index, lineTotal: 0,
    })
    return calculateTable({
      id: 'pt_' + key, name: 'Project estimate', currency: 'USD',
      lineItems: [productRow(product, 0), ...(optional ? [productRow(catalogItems[24], 1)] : [])],
      discount: { type: 'percent', value: optional ? 10 : 0 }, tax: { type: 'percent', value: optional ? 10 : 0 },
      createdAt: date, updatedAt: date,
    })
  }
  const templates = Object.entries(templateNames).flatMap(([category, names], group) => names.map((name, index) => ({
    id: group + index === 0 ? 'tpl_launch' : 'tpl_' + group + '_' + index,
    name, category, description: 'Set out deliverables, timing and fees for ' + name.toLowerCase() + '.',
    ownerId: users[(index + group) % 3].id, createdAt: day(index), updatedAt: day(index + group + 5),
    sections: [
      section('tpl_' + group + '_' + index + '_overview', 'Project overview', 'Agree on the goals for ' + name.toLowerCase() + ' and confirm who will review each milestone.'),
      section('tpl_' + group + '_' + index + '_scope', 'Scope of work', 'Alder Studio will present an initial direction, incorporate two rounds of feedback and deliver the approved materials.'),
    ],
    pricingTables: [estimate('tpl_' + group + '_' + index, group * 6 + index, day(index))],
  })))
  const deliveries = []
  const signatures = []
  const signingCompletions = []
  const activity = []
  const featured = ['Website refresh proposal', 'Retail launch strategy', 'Fall packaging design', 'Quarterly creative retainer', 'Partner onboarding proposal', 'Brand discovery proposal']
  const documents = Array.from({ length: 36 }, (_, index) => {
    const key = index === 0 ? 'harborlight' : String(index + 1).padStart(2, '0')
    const contact = contacts[index % contacts.length]
    const id = 'doc_' + key
    const title = index === 7 ? 'Untitled proposal' : featured[index] || contact.company + ' · ' + templates[(index + 1) % templates.length].name
    const status = ['sent', 'draft', 'viewed', 'completed', 'declined', 'expired'][index % 6]
    const createdAt = day(37 - index)
    const updatedAt = day(41 - index)
    const sections = index === 7 ? [section(key + '_scope', 'Scope of work', '')] : [
      section(key + '_intro', 'Project overview', 'Alder Studio prepared this proposal for ' + contact.company + ' to confirm the work, timing and review process.'),
      section(key + '_scope', 'Scope of work', 'We will start with ' + catalogItems[index % catalogItems.length].name.toLowerCase() + ', then present a first draft for review.'),
    ]
    const pricingTables = index === 7 ? [] : [estimate(key, index, createdAt, index === 0)]
    if (index === 1) pricingTables.push({ ...estimate(key + '_support', 24, createdAt), name: 'Ongoing support' })
    const recipients = status === 'draft' ? [] : [contact, ...(index === 0 ? [contacts[1], contacts[2]] : [])].map((person, position) => ({
      id: 'rcp_' + key + '_' + position, contactId: person.id, name: person.name, email: person.email,
      role: position === 2 ? 'cc' : 'signer', ...(position < 2 ? { order: position + 1 } : {}),
      status: status === 'completed' ? 'completed' : 'pending', addedAt: createdAt,
      ...(status === 'completed' ? { completedAt: updatedAt } : {}),
    }))
    const fields = recipients.filter(recipient => recipient.role === 'signer').map((recipient, position) => ({
      id: 'fld_' + key + '_' + position, type: 'signature', label: 'Client signature', sectionId: sections.at(-1).id,
      recipientId: recipient.id, required: true, createdAt,
    }))
    const document = {
      id, title, company: index === 7 ? '' : contact.company, ownerId: users[index % 3].id,
      ...(index !== 7 ? { templateId: templates[index % templates.length].id } : {}),
      status, currency: 'USD', value: documentValue(pricingTables), sections, recipients, fields, pricingTables,
      signingOrderEnabled: index === 0, createdAt, updatedAt,
      ...(status !== 'draft' ? { sentAt: createdAt } : {}),
      ...(status === 'completed' ? { completedAt: updatedAt } : {}),
    }
    activity.push({ id: 'act_' + key + '_create', documentId: id, actorId: document.ownerId, actorType: 'user', type: 'document.created', relatedIds: [], createdAt })
    if (status !== 'draft') {
      const deliveryId = 'del_' + key
      deliveries.push({ id: deliveryId, documentId: id, recipientIds: recipients.map(recipient => recipient.id), method: 'link', subject: title, status: 'sent', actorId: document.ownerId, createdAt })
      activity.push({ id: 'act_' + key + '_send', documentId: id, actorId: document.ownerId, actorType: 'user', type: 'document.sent', relatedIds: [deliveryId], createdAt })
    }
    if (status === 'completed') {
      const completionId = 'cmp_' + key
      const recipient = recipients[0]
      const signatureId = 'sig_' + key
      signatures.push({ id: signatureId, documentId: id, recipientId: recipient.id, fieldId: fields[0].id, completionId, method: 'typed', value: recipient.name, status: 'signed', actorId: recipient.id, createdAt: updatedAt })
      signingCompletions.push({ id: completionId, documentId: id, recipientId: recipient.id, signatureIds: [signatureId], pricingSnapshot: pricingSnapshot(pricingTables), currency: 'USD', documentValue: document.value, status: 'completed', actorId: recipient.id, createdAt: updatedAt })
      activity.push({ id: 'act_' + key + '_finish', documentId: id, actorId: recipient.id, actorType: 'recipient', type: 'signing.completed', relatedIds: [completionId, signatureId], createdAt: updatedAt })
    }
    return document
  })
  return { workspace, users, contacts, catalogItems, templates, documents, deliveries, signatures, signingCompletions, activity }
}
