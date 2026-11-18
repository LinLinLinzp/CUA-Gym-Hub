const actor = 'user-001'
const stamp = '2025-05-12T13:00:00.000Z'
const created = { createdBy: actor, createdAt: stamp }
const id = (type, number) => `${type}-${String(number).padStart(3, '0')}`

const courts = {
  'federal-9th': 'U.S. Court of Appeals for the Ninth Circuit',
  'federal-2nd': 'U.S. Court of Appeals for the Second Circuit',
  'federal-7th': 'U.S. Court of Appeals for the Seventh Circuit',
  california: 'California Court of Appeal',
  'new-york': 'New York Appellate Division',
  delaware: 'Delaware Court of Chancery',
}

const cases = [
  ['Barton v. Alder Logistics', 'delegation clause', 'The panel found that a separately acknowledged delegation clause assigned disputes over class waivers to the arbitrator.'],
  ['Merritt v. Seabrook Transit', 'notice and cure', 'A delivery notice sent to the agreed address started the contractual cure period.'],
  ['Cove Analytics v. Ralston', 'trade secrets', 'General familiarity with a customer market did not establish use of a confidential client list.'],
  ['Hale v. Cinder Works', 'wage statements', 'The panel allowed employees to challenge an omission in the regular-rate calculation.'],
  ['Willow Basin Partners v. Nolin', 'fiduciary duty', 'Directors disclosed the financial interest before voting on the disputed sale.'],
  ['Delmar v. Lantern Freight', 'arbitration waiver', 'The carrier waived arbitration by seeking a merits ruling before invoking its agreement.'],
  ['Iverson v. Glen Orchard', 'contract formation', 'The offer did not incorporate a later version of the terms by reference.'],
  ['Whitaker v. Pine Harbor Staffing', 'delegation clause', 'The panel distinguished Barton because workers never signed a separate arbitration agreement.'],
  ['Kite Ridge Energy v. Calven', 'environmental review', 'The permit record supported further review of downstream impacts.'],
  ['Porter v. Sable Medical', 'leave accommodation', 'A revised schedule could qualify as a reasonable accommodation on the pleaded facts.'],
  ['Linwell Foods v. Stone Ferry', 'indemnity', 'The indemnity provision covered third-party claims tied to goods in transit.'],
  ['Thorne v. Ashmont Media', 'online assent', 'The placement of the terms link gave sufficient notice before checkout.'],
  ['Copper Brook v. East Fen Holdings', 'venue transfer', 'Witness availability favored the district where the inspection occurred.'],
  ['Rowan v. Quarry & Finch', 'delegation clause', 'The court required clear language before referring scope questions to arbitration.'],
  ['Fenwick v. Marlow Retail', 'class certification', 'Unreliable return records prevented proof of loss through common evidence.'],
  ['Sutter v. Bellberry Labs', 'privilege', 'An investigative memorandum prepared for counsel retained work-product protection.'],
  ['North Cairn v. Talbot Supply', 'commercial leases', 'The parties’ renewal correspondence left the term of the extension unresolved.'],
  ['Gale v. Larch Systems', 'employment classification', 'Control over service pricing supported employee status.'],
  ['Voss v. Elm Junction', 'personal jurisdiction', 'Recurring local deliveries supported jurisdiction over a dispute concerning those deliveries.'],
  ['Ridgefield Studio v. Oram', 'copyright license', 'The print license did not extend to distribution in downloadable collections.'],
  ['Hollis v. Cedar Trestle', 'delegation clause', 'The panel enforced the delegation clause after finding that both parties accepted the same version.'],
  ['Glass Harbor v. Lowen', 'unjust enrichment', 'A valid service agreement foreclosed a duplicative equitable recovery.'],
  ['Quill v. Fernline Health', 'discovery sanctions', 'The trial court could order remedial discovery for incomplete preservation.'],
  ['Briar Commons v. Wren', 'property easement', 'Longstanding commercial access established the limited scope of the easement.'],
  ['Sloan v. Longwater Bank', 'consumer disclosures', 'A separately displayed fee disclosure satisfied the timing requirement.'],
  ['Esker v. Hawthorn Robotics', 'protective order', 'Source code could be exchanged under an attorneys-only protective order.'],
  ['Osier v. Fallow Insurance', 'coverage exclusions', 'The endorsement did not clearly exclude losses from the alleged water source.'],
  ['Kerr v. Blue Vale Foods', 'retaliation', 'The close timing of discharge and a documented complaint supported an inference of retaliation.'],
  ['Crosswind v. Ellery Restoration', 'liquidated damages', 'The agreed sum reasonably estimated anticipated costs from delay.'],
  ['Vale v. Sparrow Networks', 'data privacy', 'The written consent covered account history and excluded location records.'],
  ['Marsh v. Fieldglass Markets', 'expert evidence', 'The court excluded projections based on an unrepresentative customer sample.'],
  ['Weldon v. North Lantern', 'delegation clause', 'The panel held that the clause did not reach a party who never assented.'],
]

const guides = [
  ['Arbitration Notice Review', 'delegation clause', 'Check whether the reader can locate the delegation clause before accepting terms.'],
  ['Commercial Records Preservation', 'discovery', 'Document how custodians acknowledge a hold and where they retain relevant records.'],
  ['Fixed-Term Renewal Practice', 'commercial leases', 'Track when notice is due and which delivery methods the lease accepts.'],
  ['Appellate Research Checklist', 'appellate practice', 'Confirm later history and assemble separate citations for related decisions.'],
  ['Consumer Notice Timing', 'consumer disclosures', 'Collect screenshots or forms that show what a customer saw before submitting an order.'],
  ['Comparing Independent Contractor Tests', 'employment classification', 'Compare control over pricing, hours and customer assignments.'],
  ['Cure Periods in Supply Agreements', 'notice and cure', 'Identify dates of actual receipt and any explicit contractual tolling clauses.'],
  ['Preparing a Protective Order', 'protective order', 'Specify access, secure review and the disposition of confidential records.'],
]

const statutes = [
  ['Commercial Notice of Default', 'notice and cure', 'A notice of default must describe the missed obligation and the time allowed to cure.'],
  ['Electronic Signatures and Records', 'online assent', 'A retained electronic record must accurately reflect the version presented for signature.'],
  ['Employee Pay Records', 'wage statements', 'A wage statement must identify the covered period and itemize applicable rates.'],
  ['Limited Disclosure of Customer Data', 'data privacy', 'A custodian may disclose account data within the scope of recorded consent.'],
  ['Environmental Permit Findings', 'environmental review', 'The permitting authority must identify material site-specific impacts in its findings.'],
  ['Commercial Sale Disclosures', 'fiduciary duty', 'An interested director must disclose the nature and extent of the interest before a vote.'],
  ['Witness Attendance on Transfer', 'venue transfer', 'When transferring a matter, the court may consider practical constraints on witness attendance.'],
  ['Deposits for Commercial Tenancies', 'commercial leases', 'A landlord must account for deductions after surrender of the premises.'],
]

const folderNames = [
  'Arbitration and Class Waivers', 'Ninth Circuit Decisions', 'Delegation Clauses', 'Briefing Drafts',
  'Cedar Trestle Employment Review', 'Commercial Lease Renewals', 'Consumer Notice Standards',
  'Discovery and Preservation', 'Damages and Remedies', 'Lantern Freight Review', 'Confidentiality Orders',
  'Trade Secret Authorities', 'Environmental Permitting', 'Corporate Governance', 'Venue and Jurisdiction',
  'Insurance Coverage', 'Wage and Hour', 'Healthcare Accommodations', 'Privacy and Consent',
  'Retail Agreements', 'Copyright Licensing', 'Prior Lease Review', '2019 Research Archive', 'Historical Decisions',
]

const treatments = ['followed', 'distinguished', 'criticized', 'cited']
const jurisdictions = Object.keys(courts)
const signals = ['caution', 'positive', 'neutral', 'negative']
const filterSnapshot = { contentType: 'case', jurisdiction: 'federal-9th' }
const fixtureDate = (day) => `2025-05-${String(day).padStart(2, '0')}T14:00:00.000Z`

export function createInitialData() {
  const profile = {
    id: actor, name: 'Madeline Foster', organization: 'Harrow & Finch LLP',
    email: 'madeline.foster@example.test', timeZone: 'America/New_York', citationFormat: 'standard',
  }
  const documents = [...cases, ...statutes, ...guides].map(([title, topic, excerpt], index) => {
    const number = index + 1
    const type = index < cases.length ? 'case' : index < cases.length + statutes.length ? 'statute' : 'secondary'
    const jurisdiction = [1, 8, 14, 21, 32].includes(number) ? 'federal-9th' : jurisdictions[index % jurisdictions.length]
    const date = number === 1 ? '2025-04-17'
      : index >= 17 || [8, 14].includes(number) ? fixtureDate(1 + index % 12).slice(0, 10)
        : `2025-0${1 + index % 3}-${String(1 + index % 25).padStart(2, '0')}`
    const citation = number === 1 ? '214 F.4th 731' : type === 'case' ? `214 F.4th ${734 + index * 6}` : type === 'statute' ? `Research Code § ${100 + index}` : `Practice Library No. ${100 + index}`
    const reporterCourt = { 'federal-9th': '9th Cir.', 'federal-2nd': '2d Cir.', 'federal-7th': '7th Cir.', california: 'Cal. Ct. App.', 'new-york': 'N.Y. App. Div.', delaware: 'Del. Ch.' }[jurisdiction]
    return {
      id: id('doc', number), title, citation, jurisdiction, type, date, excerpt,
      topics: [topic, ...(number === 1 ? ['arbitration', 'class waiver'] : [])],
      body: type === 'case'
        ? [excerpt, `The parties’ briefing centered on ${topic}. The panel limited its review to the disputed provision and the records exchanged before the proceeding.`]
        : [excerpt, `Researchers reviewing ${topic} should identify the relevant provision, preserve its effective date and record how it applies to the matter under review.`],
      ...(type === 'case' ? {
        court: courts[jurisdiction], source: number === 1 ? 'Alder Appellate Digest' : 'Appellate Research Digest',
        signal: signals[index % signals.length],
        citationAliases: [`2025 U.S. App. LEXIS ${8400 + number}`],
        citationFormats: {
          standard: `${title}, ${citation} (${reporterCourt} 2025).`,
          alwd: `${title}, ${citation}, ${number === 1 ? 735 : 735 + index * 6} (${reporterCourt} 2025).`,
        },
      } : { source: type === 'statute' ? 'Research Code Library' : 'Practice Library' }),
    }
  })
  const folders = folderNames.map((name, index) => ({
    id: id('folder', index + 1), name,
    parentId: [1, 2, 3].includes(index) ? id('folder', 1) : index === 23 ? id('folder', 23) : null,
    status: [21, 22].includes(index) ? 'archived' : 'active',
    ...created,
  }))
  const folderItems = Array.from({ length: 48 }, (_, index) => {
    const kind = ['document', 'search', 'citation'][index % 3]
    const doc = documents[index < 3 ? 0 : index % 32]
    const base = {
      id: id('item', index + 1), folderId: index < 3 ? 'folder-002' : id('folder', 1 + index % 20),
      kind, status: index === 11 ? 'removed' : 'active', title: doc.title,
      note: index === 0 ? 'Compare the delegation clause.' : index % 8 === 0 ? 'Review before the next matter conference.' : '',
      ...created,
    }
    if (kind === 'search') return {
      ...base, title: index === 1 ? 'Delegation clause research' : `${doc.topics[0][0].toUpperCase()}${doc.topics[0].slice(1)} research`,
      query: doc.topics[0], filters: index === 1 ? { ...filterSnapshot } : { contentType: doc.type, jurisdiction: doc.jurisdiction },
    }
    if (kind === 'citation') return {
      ...base, documentId: doc.id, format: 'standard', includeLink: false, citationText: doc.citationFormats.standard,
    }
    return { ...base, documentId: doc.id }
  })
  const citingReferences = Array.from({ length: 36 }, (_, index) => {
    const documentId = index < 4 ? 'doc-001' : id('doc', 2 + (index - 4) % 16)
    const citing = documents[index < 4 ? [7, 20, 31, 13][index] : 17 + (index - 4) % 15]
    return {
      id: id('ref', index + 1), documentId, citingDocumentId: citing.id,
      treatment: treatments[(index + 1) % treatments.length], excerpt: citing.excerpt,
    }
  })
  const citationActions = Array.from({ length: 24 }, (_, index) => {
    const item = folderItems[index === 1 ? 2 : 2 + (index % 16) * 3]
    const doc = documents[index === 0 ? 0 : index]
    const base = { id: id('cite-action', index + 1), ...created, createdAt: fixtureDate(13 + index % 10) }
    if (index % 3 === 0) return { ...base, type: 'checked', documentId: doc.id, query: doc.citation }
    if (index % 3 === 1) return {
      ...base, type: 'saved', documentId: item.documentId,
      folderId: item.folderId, folderItemId: item.id,
      format: item.format, includeLink: item.includeLink, citationText: item.citationText,
    }
    return { ...base, type: 'copied', documentId: doc.id, format: 'standard', includeLink: false, citationText: doc.citationFormats.standard }
  })
  const alerts = Array.from({ length: 24 }, (_, index) => {
    const type = index % 2 ? 'shepards' : 'search'
    const doc = documents[index < 2 ? 0 : index]
    const topic = doc.topics[0]
    return {
      id: id('alert', index + 1), type,
      status: index === 4 ? 'deleted' : index % 7 === 3 ? 'paused' : 'active',
      title: ['Delegation clauses in the Ninth Circuit', 'Barton treatment updates'][index]
        || (type === 'search' ? `${topic[0].toUpperCase()}${topic.slice(1)} decisions` : `${doc.title} treatment updates`),
      description: index < 2 ? 'Review before the next arbitration practice meeting.' : '',
      client: index < 4 ? 'Alder matter' : '',
      expiresOn: index === 6 ? '2025-06-30' : index === 8 ? '2030-12-31' : '',
      source: type === 'search' ? { query: topic, filters: index === 0 ? { ...filterSnapshot } : { contentType: 'case' } } : { documentId: doc.id },
      monitor: type === 'search' ? { contentTypes: ['case'] } : { treatments: ['distinguished', 'criticized'] },
      delivery: type === 'search' ? { channel: 'online_and_email', frequency: ['weekly', 'daily', 'monthly'][index % 3] } : { channel: 'online' },
      ...created,
    }
  })
  const reportHits = citingReferences.filter((ref) => ['distinguished', 'criticized'].includes(ref.treatment))
  const alertResults = Array.from({ length: 48 }, (_, index) => {
    const isBarton = index < 2
    const ref = reportHits[index % reportHits.length]
    const searchAlerts = alerts.filter((alert) => alert.type === 'search' && !['alert-003', 'alert-005'].includes(alert.id))
    const alert = isBarton ? alerts[1] : alerts.find((row) => row.type === 'shepards' && row.source.documentId === ref.documentId)
      || searchAlerts[index % searchAlerts.length]
    const document = alert.type === 'shepards' ? documents.find((doc) => doc.id === ref.citingDocumentId)
      : documents.find((doc) => doc.type === 'case' && doc.topics.includes(alert.source.query))
    const matchedAt = fixtureDate(index === 0 ? 18 : 14 + index % 15)
    const readAt = index % 3 === 1 ? matchedAt : null
    return {
      id: id('result', index + 1), alertId: alert.id, documentId: document.id,
      summary: document.excerpt, matchedAt, status: readAt ? 'read' : 'unread', readAt,
    }
  })
  return { profile, documents, folders, folderItems, citingReferences, citationActions, alerts, alertResults }
}
