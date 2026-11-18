const morgan = 'usr_morgan'
const date = (day, hour = 14) => new Date(Date.UTC(2026, 9, day, hour, 15)).toISOString()
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/, '')

const people = [
  'Morgan Ellis', 'Jules Cho', 'Mina Alvarez', 'Theo Bennett', 'Rina Patel', 'Samira Reed',
  'Leah Santos', 'Noah Kim', 'Eva Brooks', 'Dylan Shah', 'Inez Foster', 'Arlo Grant',
  'Zoe Nguyen', 'Isaac Price', 'Freya Moss', 'Felix Turner', 'Maya Clarke', 'Nora Park',
  'Luis Rivera', 'Hana Walsh', 'Ari Lin', 'Wren Bishop', 'Lena Hughes', 'Owen Ross',
  'Asha Hale', 'Milo Chen', 'Ada Collins', 'Emil Wright',
]
const folders = [
  ['atlas', 'Atlas Brand Launch'], ['cedar', 'Cedar Research'], ['vendor', 'Vendor Intake'],
  ['finance', 'Finance'], ['studio', 'Studio Operations'], ['library', 'Asset Library'],
  ['partner', 'Partner Materials'], ['atlas_incoming', 'Incoming proofs', 'atlas'],
  ['atlas_creative', 'Creative', 'atlas'], ['atlas_review', 'Review rounds', 'atlas_creative'],
  ['atlas_signed', 'Approved rounds', 'atlas_review'], ['cedar_field', 'Field notes', 'cedar'],
  ['cedar_reports', 'Research reports', 'cedar'], ['vendor_forms', 'Vendor forms', 'vendor'],
  ['invoices', 'Invoices', 'finance'], ['studio_briefs', 'Briefs', 'studio'],
  ['library_print', 'Print templates', 'library'], ['archive', 'Superseded layouts', 'atlas'],
]
const documents = [
  ['launch_brief', 'Launch Brief.txt', 'atlas', 'Atlas launch review: proofs and vendor estimates are due Friday by 3 p.m.'],
  ['workspace_guide', 'Workspace Guide.md', null, 'Use project folders for work in progress. Approved client materials belong in the project review folder.'],
  ['weekly', 'Weekly Planning Notes.txt', null, 'Monday: check proofs with Atlas. Wednesday: review fieldwork notes. Friday: reserve an hour for finance.'],
  ['calendar', 'Studio Calendar.csv', null, 'Date,Milestone,Lead\n2026-10-21,Atlas proof review,Jules\n2026-10-27,Cedar synthesis,Mina'],
  ['supplier', 'Supplier Directory.csv', null, 'Vendor,Service,Contact\nOak Press,Print production,rina@oakpress.example\nCopper Fold,Packaging,ada@copperfold.example'],
  ['handoff', 'Project Handoff Checklist.md', null, '## Handoff\n- Confirm access for the project lead\n- Add review links\n- Move approved work to the archive'],
  ['visual', 'Atlas Cover Study.svg', 'atlas_creative', '/art/atlas-cover.svg', 'image/svg+xml'],
  ['timeline', 'Production Timeline.csv', 'atlas', 'Stage,Lead\nConcept,Jules\nProduction,Morgan\nReview,Theo'],
  ['style_notes', 'Paper and Color Notes.txt', 'atlas_review', 'Compare warm white and natural stock. Use the approved teal swatch on the cover.'],
  ['proof_notes', 'Proof Review Notes.md', 'atlas_signed', 'The studio approved the final page geometry and ruled out the narrower spine.'],
  ['cedar_summary', 'Interview Summary.md', 'cedar_reports', 'Participants described the approval process in three stages: intake, review, and release.'],
  ['cedar_notes', 'Fieldwork Notes.txt', 'cedar_field', 'Record the original language participants use for project stages.'],
  ['vendor_list', 'Vendor Onboarding.csv', 'vendor', 'Vendor,Stage\nOak Press,In review\nStudio Offset,Approved'],
  ['expenses', 'Expense Categories.csv', 'finance', 'Category,Approver\nPrint,Theo\nWorkshop,Mina'],
  ['retrospective', 'October Retrospective.md', 'studio', 'Assign a single owner to each set of proof comments before the next handoff.'],
  ['partner_overview', 'Partner Delivery Notes.txt', 'partner', 'Copper Fold will send final dielines after the board thickness is approved.'],
  ['partner_schedule', 'Partner Shipping Schedule.csv', 'partner', 'Date,Shipment\n2026-10-28,Trial cartons\n2026-11-03,Approved samples'],
  ['press', 'Press Check Template.md', 'library_print', 'Confirm crop marks, paper weight, alignment and ink coverage before signing.'],
  ['layout_grid', 'Layout Grid.svg', 'library', '/art/layout-grid.svg', 'image/svg+xml'],
  ['prototype', 'Packaging Prototype Notes.txt', 'atlas_creative', 'Sample C passed the fold test. Request one more sample in uncoated stock.'],
  ['quote', 'Quote Comparison.csv', 'invoices', 'Vendor,Estimate\nOak Press,1800\nBlue Fern,2120'],
  ['intake', 'Project Intake Questions.md', 'studio_briefs', 'What is the review deadline? Who will provide source files? Who has approval authority?'],
  ['draft_a', 'Early Cover Draft.txt', 'archive', 'First approach: bookcloth textures and blue ink.'],
  ['draft_b', 'Early Spine Draft.txt', 'archive', 'First approach: use a narrow spine on the proof.'],
  ['old_budget', 'Superseded Budget.csv', 'finance', 'Item,Estimate\nStock,480\nBinding,160'],
  ['old_notes', 'Workshop Notes Draft.txt', null, 'Draft agenda and early materials list for the studio workshop.'],
]
const requestNames = [
  ['atlas_proofs', 'Atlas print proofs', 'atlas_incoming'], ['paper_samples', 'Paper sample specifications', 'atlas_incoming'],
  ['cedar_notes', 'Cedar fieldwork notes', 'cedar_field'], ['vendor_packets', 'Signed vendor packets', 'vendor_forms'],
  ['oct_invoices', 'October supplier invoices', 'invoices'], ['studio_briefs', 'Upcoming studio briefs', 'studio_briefs'],
  ['partner_dielines', 'Partner packaging dielines', 'partner'], ['print_estimates', 'Print production estimates', 'atlas_incoming'],
  ['release_forms', 'Participant release forms', 'cedar_reports'], ['supplier_forms', 'Supplier insurance forms', 'vendor_forms'],
  ['finance_receipts', 'Workshop expense receipts', 'invoices'], ['studio_updates', 'Studio operations updates', 'studio'],
  ['atlas_reference', 'Atlas reference photography notes', 'atlas_creative'], ['brand_review', 'Brand review feedback', 'atlas_review'],
  ['approved_art', 'Approved artwork sign-offs', 'atlas_signed'], ['cedar_tables', 'Cedar coding tables', 'cedar_reports'],
  ['template_edits', 'Production template revisions', 'library_print'], ['vendor_samples', 'Vendor sample inventory', 'vendor'],
  ['sep_invoices', 'September supplier invoices', 'invoices'], ['fall_briefs', 'Autumn campaign briefs', 'studio_briefs'],
  ['checklists', 'Print quality checklists', 'library_print'], ['binding', 'Binding sample feedback', 'atlas_incoming'],
  ['interview', 'Interview transcripts', 'cedar_field'], ['partner_forms', 'Partner delivery forms', 'partner'],
]

function fileRecord(id, name, parentId, ownerId, kind = 'file') {
  return { id, name, kind, parentId, ownerId, status: 'active', createdBy: ownerId, updatedBy: ownerId,
    createdAt: date(1), updatedAt: date(1), deletedAt: null, deletedBy: null, deletionRootId: null,
    currentVersionId: null, mimeType: null, sizeBytes: null }
}

export function createInitialData() {
  const users = people.map((name, index) => {
    const key = name.toLowerCase().split(' ')
    return { id: 'usr_' + key[0], name, email: key.join('.') + (index < 20 && index !== 4 ? '@harborline.example' : '@printpartner.example'), isTeamMember: index < 20 && index !== 4 }
  })
  const files = folders.map(([key, name, parent], index) =>
    fileRecord('fld_' + key, name, parent ? 'fld_' + parent : null, index === 6 ? 'usr_theo' : morgan, 'folder'))
  const versions = []
  const shareMembers = []
  const shareLinks = []
  const requestSubmissions = []
  const activity = []

  function event(action, targetType, targetId, details, createdAt, actorId = morgan) {
    activity.push({ id: 'evt_' + String(activity.length + 1).padStart(3, '0'), action, targetType, targetId, details, createdAt, actorId, status: 'completed' })
  }

  function addFile(key, name, parentId, value, mimeType, count, ownerId = morgan, createdAt = date(1)) {
    const file = fileRecord('file_' + key, name, parentId, ownerId)
    file.createdAt = createdAt
    for (let step = 1; step <= count; step++) {
      const launchDrafts = ['Atlas launch review: collect estimates and request a first cover proof.', 'Atlas launch review: Jules will review the second proof on Thursday.']
      const content = mimeType === 'image/svg+xml'
        ? { kind: 'localAsset', value }
        : { kind: 'text', value: step === count ? value : (key === 'launch_brief' ? launchDrafts[step - 1] : 'Review draft ' + step + '\n\n' + value) }
      const version = { id: 'ver_' + (key === 'launch_brief' ? 'launch' : key) + '_0' + step, fileId: file.id,
        createdBy: step % 2 ? ownerId : 'usr_jules', createdAt: count > 1 ? date(step * 2) : createdAt,
        mimeType, sizeBytes: content.kind === 'text' ? new TextEncoder().encode(content.value).length : (key === 'visual' ? 616 : 638), sourceVersionId: null, content }
      versions.push(version)
      Object.assign(file, { currentVersionId: version.id, mimeType, sizeBytes: version.sizeBytes, updatedAt: version.createdAt, updatedBy: version.createdBy })
    }
    files.push(file)
    return file
  }

  documents.forEach(([key, name, parent, value, type], index) => {
    const count = index === 0 ? 3 : index < 12 ? 4 : index === 12 ? 3 : 1
    addFile(key, name, parent ? 'fld_' + parent : null, value, type || (name.endsWith('.csv') ? 'text/csv' : 'text/plain'),
      count, parent === 'partner' ? 'usr_theo' : morgan, date(1 + index % 16))
  })

  for (const [root, children, day] of [['fld_archive', ['file_draft_a', 'file_draft_b', 'file_prototype'], 19], ['file_old_budget', [], 20], ['file_old_notes', [], 21]]) {
    const createdAt = date(day)
    for (const id of [root, ...children]) {
      const file = files.find(item => item.id === id)
      if (id === 'file_prototype') file.parentId = root
      Object.assign(file, { status: 'deleted', deletedAt: createdAt, deletedBy: morgan, deletionRootId: root, updatedAt: createdAt, updatedBy: morgan })
    }
    event('file.delete', 'file', root, { affectedIds: [root, ...children] }, createdAt)
  }

  const fileRequests = requestNames.map(([key, title, folder], index) => {
    const status = index < 17 ? 'open' : 'closed'
    const request = { id: 'req_' + key, title, description: index === 0 ? 'Upload the print-ready proofs for the Atlas review.' : 'Please include your name and the delivery date in the filename.',
      destinationFolderId: 'fld_' + folder, token: key.replaceAll('_', '-'), createdBy: morgan, updatedBy: morgan,
      status, createdAt: date(2 + index % 5), updatedAt: date(status === 'open' ? 8 + index % 5 : 22), closedAt: status === 'closed' ? date(22) : null }
    event('request.create', 'fileRequest', request.id, { title, destinationFolderId: request.destinationFolderId }, request.createdAt)
    return request
  })

  for (let index = 0; index < 28; index++) {
    const request = fileRequests[index % 14]
    const user = users[(index + 4) % users.length]
    const actorId = 'external:' + user.email
    const destinationFolderId = index === 1 ? 'fld_atlas' : request.destinationFolderId
    const name = index === 0 ? 'Cover proof.txt' : request.title + ' — ' + user.name.split(' ')[0] + '.txt'
    const file = addFile(index === 0 ? 'atlas_proof_01' : 'delivery_' + (index + 1), name, destinationFolderId,
      'Submitted by ' + user.name + ' for ' + request.title + '.\n\nReview copy for the studio team.', 'text/plain', 1, morgan, date(8 + index % 10))
    file.createdBy = file.updatedBy = actorId
    versions.at(-1).createdBy = actorId
    const submission = { id: 'sub_' + (index === 0 ? 'atlas_01' : 'delivery_' + (index + 1)), requestId: request.id,
      fileId: file.id, destinationFolderId, originalName: name, uploaderName: user.name, uploaderEmail: user.email,
      createdAt: file.createdAt, status: 'received' }
    requestSubmissions.push(submission)
    event('request.submit', 'requestSubmission', submission.id, { requestId: request.id, fileId: file.id, destinationFolderId, versionId: file.currentVersionId }, submission.createdAt, actorId)
  }

  const unshared = new Set(['file_weekly', 'file_calendar', 'file_supplier', 'file_handoff'])
  const candidates = files.filter(item => item.status === 'active' && !unshared.has(item.id))
  for (let index = 0; index < 32; index++) {
    const file = index === 1 ? files.find(item => item.id === 'fld_partner') : candidates[index]
    const user = users[index === 0 ? 1 : index === 1 ? 0 : 2 + index % 23]
    const removed = index > 0 && index % 7 === 0
    shareMembers.push({ id: index === 0 ? 'mem_atlas_jules' : 'mem_' + index, fileId: file.id, email: user.email, userId: user.id,
      role: index % 3 === 0 ? 'editor' : 'viewer', status: removed ? 'removed' : 'active',
      createdBy: file.ownerId, updatedBy: file.ownerId, createdAt: date(7), updatedAt: date(removed ? 12 : 7), removedAt: removed ? date(12) : null })
  }
  for (let index = 0; index < 24; index++) {
    const file = candidates[index]
    const revoked = index > 0 && index % 5 === 0
    shareLinks.push({ id: index === 0 ? 'lnk_atlas' : 'lnk_' + index, fileId: file.id, token: index === 0 ? 'atlas-review' : 'review-' + slug(file.name),
      audience: ['team', 'invited', 'anyone'][index % 3], role: index % 4 ? 'editor' : 'viewer', status: revoked ? 'revoked' : 'active',
      createdBy: file.ownerId, updatedBy: file.ownerId, createdAt: date(9), updatedAt: date(revoked ? 16 : 9), revokedAt: revoked ? date(16) : null })
  }

  event('file.rename', 'file', 'file_launch_brief', { previousName: 'Atlas Brief.txt', name: 'Launch Brief.txt' }, date(6))
  event('request.edit', 'fileRequest', 'req_paper_samples', { previousDestinationFolderId: 'fld_atlas', destinationFolderId: 'fld_atlas_incoming' }, date(10))
  event('share.invite', 'shareMember', 'mem_atlas_jules', { fileId: 'fld_atlas', email: users[1].email, role: 'editor' }, date(7))
  event('link.create', 'shareLink', 'lnk_atlas', { fileId: 'fld_atlas', audience: 'team', role: 'viewer' }, date(9))
  activity.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return { account: { userId: morgan, teamName: 'Harborline Studio' }, users, files, versions, shareMembers, shareLinks,
    fileRequests, requestSubmissions, activity }
}
