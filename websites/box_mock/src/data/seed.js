const morgan = 'user-morgan'
const leah = 'user-leah'
const daniel = 'user-daniel'
const client = 'folder-client-operations'
const vendor = 'folder-vendor-onboarding'
const date = (index = 0) => `2026-10-${String(1 + index % 28).padStart(2, '0')}T14:20:00.000Z`
const audit = (id, index = 0, actor = morgan) => ({
  id, createdById: actor, createdAt: date(index), updatedById: actor, updatedAt: date(index),
})
const slug = text => text.toLowerCase().replaceAll(' ', '-')
const departments = ['Client Operations', 'Finance', 'People Operations', 'Studio Projects', 'Corporate Records']
const groups = [
  ['Vendor Onboarding', 'Client Briefs', 'Service Agreements', 'Account Reviews', 'Intake Templates', 'Client Reports'],
  ['Quarterly Close', 'Accounts Payable', 'Budget Planning', 'Expense Reviews', 'Forecast Models', 'Treasury'],
  ['Hiring Plans', 'Staff Handbook', 'Training Materials', 'Benefits Review', 'Team Planning', 'People Analytics'],
  ['Harbor Redesign', 'Meridian Research', 'Field Notes', 'Design Systems', 'Studio Library', 'Workshop Kits'],
  ['Board Materials', 'Risk Register', 'Insurance', 'Brand Archive', 'Audit Evidence', 'Legacy Archives'],
]
const names = [
  'Morgan Ellis', 'Leah Brooks', 'Daniel Park', 'Nina Patel', 'Owen Reed', 'Maya Torres', 'Samuel Bell',
  'Clara Singh', 'Iris Walker', 'Jonah Kim', 'Eva Chen', 'Miles Foster', 'Amara Price', 'Naomi Shaw',
  'Eli Grant', 'Sofia Lane', 'Andre Flores', 'Avery Scott', 'Ruth Young', 'Lucas Martin', 'Lena Hart',
  'Isaac Webb', 'Tessa Green', 'Adrian Hill', 'Priya Rao', 'Caleb Stone', 'Nora Mills', 'Hugo Cole',
]

export function createInitialData() {
  const users = names.map((name, i) => ({
    id: `user-${name.split(' ')[0].toLowerCase()}`, name, email: `${slug(name).replace('-', '.')}@example.test`,
    department: departments[i % departments.length],
  }))
  const folder = (name, parentId, i) => ({
    ...audit(`folder-${slug(name)}`, i), parentId, name,
    description: name === 'Vendor Onboarding' ? 'Templates and intake documents for new suppliers.' : `Shared working records for ${name.toLowerCase()}.`,
    ownerId: parentId && i > 6 ? users[i % users.length].id : morgan,
    status: 'active', trashedAt: null, trashedById: null,
  })
  const folders = departments.map((name, i) => folder(name, null, i + 13))
  groups.forEach((group, groupIndex) => group.forEach((name, i) => {
    folders.push(folder(name, `folder-${slug(departments[groupIndex])}`, groupIndex * 6 + i))
  }))
  folders.push(folder('Due Diligence', vendor, 5))
  const legacy = folders.find(item => item.id === 'folder-legacy-archives')
  folders.find(item => item.id === 'folder-brand-archive').parentId = legacy.id
  Object.assign(legacy, { status: 'trashed', trashedAt: date(26), trashedById: morgan })

  const files = Array.from({ length: 60 }, (_, i) => {
    const parent = i < 4 ? null : i === 4 ? folders.find(item => item.id === vendor) : folders[5 + (i - 5) % 31]
    const base = parent?.name || ['Workspace Directory', 'Quarterly Calendar', 'Intake Guidelines', 'Records Handbook'][i]
    const name = i === 4 ? 'Vendor Intake Checklist.pdf' : `${base}${i >= 36 ? ' Review Notes' : ''}.${i % 5 === 3 ? 'docx' : 'pdf'}`
    return {
      ...audit(i === 4 ? 'file-vendor-intake-checklist' : `file-${i + 1}`, i),
      folderId: parent?.id ?? null, name, ownerId: parent?.ownerId ?? morgan,
      mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 48432 + i * 321,
      previewText: i === 4
        ? 'Collect tax and contact details before requesting review. Confirm the supplier’s legal name, billing contact and payment instructions against the intake packet.'
        : `This document records the current working decisions and next steps for ${base.toLowerCase()}. Review the listed items with the document owner before circulation.`,
      ...(i === 4 || i === 5 ? { previewRows: [['Intake packet', 'Confirm required attachments'], ['Contact details', 'Verify with the account owner'], ['Review', 'Record the outcome in Activity']] } : {}),
    }
  })

  const collaboration = (id, folderId, userId, inviteeEmail, role, status, index) => ({
    ...audit(id, index), folderId, userId, inviteeEmail, role, status, message: null,
    removedAt: status === 'removed' ? date(index) : null, removedById: status === 'removed' ? morgan : null,
  })
  const collaborations = [
    collaboration('collab-vendor-leah', vendor, leah, users[1].email, 'editor', 'active', 2),
    collaboration('collab-client-daniel', client, daniel, users[2].email, 'viewer', 'active', 3),
    collaboration('collab-vendor-pending', vendor, null, 'riley.vendor@example.test', 'viewer', 'pending', 4),
    collaboration('collab-vendor-removed', vendor, null, 'casey.vendor@example.test', 'viewer', 'removed', 5),
  ]
  for (let i = 0; i < 44; i++) {
    const parent = folders[6 + i % 26]
    const user = users.slice(1).find((candidate, index) => index >= i % 24 && candidate.id !== parent.ownerId)
    collaborations.push(collaboration(`collab-${i + 1}`, parent.id, user.id, user.email, i % 2 ? 'viewer' : 'editor', 'active', i))
  }

  const tasks = []
  const taskAssignments = []
  for (let i = 0; i < 30; i++) {
    const file = i < 3 ? files[4] : files[i + 4]
    const creator = i < 2 ? leah : morgan
    const type = i % 3 === 1 ? 'approval' : 'general'
    const status = i < 3 || i % 4 < 2 ? 'open' : type === 'general' ? 'completed' : i % 2 ? 'rejected' : 'approved'
    const id = ['task-vendor-checklist', 'task-vendor-approval', 'task-vendor-review'][i] || `task-${i + 1}`
    const candidates = [...new Set([file.ownerId, ...collaborations.filter(entry => entry.folderId === file.folderId && entry.status === 'active').map(entry => entry.userId)])]
    const assignees = i < 2 ? [morgan, daniel] : i === 2 ? [leah] : candidates.slice(0, 1 + Number(i % 2 === 0))
    tasks.push({
      ...audit(id, i, creator), fileId: file.id, type, status, completionRule: 'all',
      message: ['Check the vendor intake attachments.', 'Approve the supplier checklist for circulation.', 'Check the required attachments.'][i] || `Review ${file.name.split('.')[0]} and confirm the next steps.`,
      dueDate: i % 5 === 4 ? null : i % 2 ? '2026-12-04' : '2026-11-12',
      resolvedAt: status === 'open' ? null : date(i), resolvedById: status === 'open' ? null : assignees[0],
      deletedAt: null, deletedById: null,
    })
    assignees.forEach((assigneeId, j) => taskAssignments.push({
      ...audit(`task-assignment-${i + 1}-${j + 1}`, i, creator), taskId: id, assigneeId,
      status: status === 'open' ? 'pending' : status,
      decidedAt: status === 'open' ? null : date(i), decidedById: status === 'open' ? null : assigneeId,
      removedAt: null, removedById: null,
    }))
  }

  const policyNames = ['Vendor Records', 'Client Operations Archive', 'Corporate Charter', 'Superseded Contracts',
    'Accounts Payable History', 'Expense Documentation', 'Quarterly Working Papers', 'Tax Submissions',
    'Hiring Records', 'Employee Agreements', 'Training Attendance', 'Benefits Correspondence',
    'Studio Deliverables', 'Design Approvals', 'Research Consent Forms', 'Workshop Records',
    'Board Minutes', 'Risk Reviews', 'Insurance Certificates', 'Audit Correspondence',
    'Budget Approvals', 'Client Reviews', 'Supplier Due Diligence', 'Project Closeout']
  const retentionPolicies = policyNames.map((name, i) => ({
    ...audit(`policy-${slug(name)}`, i), name,
    description: i === 0 ? 'Keep vendor intake and due diligence records.' : `Retention for ${name.toLowerCase()}.`,
    type: i === 1 || i % 5 === 4 ? 'non_modifiable' : 'modifiable', scope: 'folders',
    duration: i === 2 ? { unit: 'indefinite', value: null } : { unit: 'years', value: [6, 3, 1, 10][i % 4] },
    startBasis: 'content_created_at', disposition: i === 2 || i % 3 === 1 ? 'keep' : 'permanently_delete',
    status: i === 3 || i === 20 ? 'retired' : 'active',
    activatedAt: date(i), activatedById: morgan,
    retiredAt: i === 3 || i === 20 ? date(27) : null, retiredById: i === 3 || i === 20 ? morgan : null,
  }))
  const retentionAssignments = retentionPolicies.flatMap((policy, i) => {
    const targets = i < 4 ? [folders[[5, 0, 4, 7][i]]] : [folders[6 + i % 21]]
    if (i >= 4 && i < 12) targets.push(folders[19 + i % 9])
    return targets.map((target, j) => ({
      ...audit(`retention-assignment-${i + 1}-${j + 1}`, i), policyId: policy.id, folderId: target.id,
      kind: 'direct', sourceAssignmentId: null, status: 'active', removedAt: null, removedById: null,
    }))
  })

  return { account: { currentUserId: morgan, workspaceName: 'Northline Studio', canManageRetention: true },
    users, folders, files, collaborations, tasks, taskAssignments, retentionPolicies, retentionAssignments }
}


