import { appDescriptions } from './appDescriptions.js'

const actor = 'admin-001'
const createdAt = '2026-07-15T13:00:00.000Z'
const created = { createdAt, createdBy: actor }
const updated = { ...created, updatedAt: createdAt, updatedBy: actor }
const fixedId = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')

const names = [
  'Avery Chen', 'Jordan Rivera', 'Samira Patel', 'Riley Morgan', 'Cameron Brooks', 'Leila Haddad',
  'Noah Bennett', 'Maya Thompson', 'Mateo Silva', 'Nina Park', 'Theo Mitchell', 'Zara Ahmed',
  'Leo Nguyen', 'Elena Vargas', 'Iris Coleman', 'Owen Walker', 'Amina Yusuf', 'Ethan Price',
  'Lena Ortiz', 'Hugo Martin', 'Mika Tanaka', 'Sofia Reyes', 'Adrian Ward', 'Nora Evans',
  'Dante Rossi', 'Amara James', 'Kai Lin', 'Layla Hassan', 'Jules Laurent', 'Sage Nelson',
  'Ben Foster', 'Talia Reed', 'Ana Costa', 'Ravi Gupta', 'Nadia Khan', 'Miles Davis',
  'Aisha Malik', 'Pablo Flores', 'Mei Wong', 'Omar Ali', 'Alina Novak', 'Elias Stone',
  'Mira Singh', 'Julian Wright', 'Remy Dubois', 'Serena Kim', 'Caleb Hayes', 'Ada Scott',
]

const roles = [
  ['Engineering', 'Platform Engineer'], ['Finance', 'Financial Analyst'],
  ['People Operations', 'HR Partner'], ['Design', 'Product Designer'],
  ['IT', 'Systems Administrator'], ['Operations', 'Program Coordinator'],
  ['Customer Success', 'Account Specialist'], ['Security', 'Security Analyst'],
]

const groupsByName = [
  ['Platform Engineering', 'Platform infrastructure team'], ['Release Coordinators', 'Release planning and readiness'],
  ['Product Design', 'Design systems and product research'], ['Finance Operations', 'Reporting and expense review'],
  ['IT Service Desk', 'Employee support and device management'], ['People Partners', 'People operations and onboarding'],
  ['Customer Programs', 'Customer onboarding and enablement'], ['Security Response', 'Security incident response'],
  ['Data Operations', 'Data quality and reporting'], ['Internal Communications', 'Company updates and editorial calendar'],
  ['Procurement', 'Purchasing and vendor management'], ['Workplace Services', 'Office operations'],
  ['Quality Engineering', 'Testing and release quality'], ['Business Analytics', 'Business intelligence and metrics'],
  ['Research Studio', 'Product discovery and interviews'], ['Web Operations', 'Website maintenance and publishing'],
  ['Mobile Engineering', 'Mobile application development'], ['Identity Operations', 'Directory administration'],
  ['Legal Operations', 'Contracts and legal requests'], ['Account Management', 'Customer account planning'],
  ['Privacy Council', 'Privacy reviews and governance'], ['New Hire Mentors', 'Peer onboarding support'],
  ['Architecture Review', 'Technical architecture reviews'], ['Accessibility Guild', 'Accessibility standards and reviews'],
  ['Sustainability Circle', 'Sustainability projects'], ['Quarterly Planning', 'Quarterly operating reviews'],
  ['Documentation Guild', 'Internal documentation quality'], ['Training Hosts', 'Cross-team learning sessions'],
  ['Pilot Reviewers', 'Reviewers for upcoming pilots'], ['Continuity Planning', 'Business continuity exercises'],
]

const appNames = [
  'Engineering Wiki', 'Expense Desk', 'Service Queue', 'People Directory', 'Team Notebook', 'Build Monitor',
  'Invoice Center', 'Benefits Portal', 'Device Register', 'Meeting Studio', 'Release Board', 'Ledger View',
  'Learning Center', 'Incident Console', 'Project Canvas', 'Code Review Hub', 'Travel Ledger', 'Hiring Desk',
  'Systems Catalog', 'Document Library', 'Test Grid', 'Budget Planner', 'Feedback Room', 'Support Console',
  'Work Planner', 'Metrics Lab', 'Vendor Records', 'Shift Calendar', 'Asset Inventory', 'Forms Studio',
  'Configuration Review', 'Purchase Requests',
]
const categories = ['Productivity', 'Finance', 'IT', 'HR', 'Productivity', 'Engineering', 'Finance', 'HR', 'IT', 'Productivity',
  'Engineering', 'Finance', 'HR', 'IT', 'Productivity', 'Engineering', 'Finance', 'HR', 'IT', 'Productivity',
  'Engineering', 'Finance', 'HR', 'IT', 'Productivity', 'Engineering', 'Finance', 'HR', 'IT', 'Productivity', 'Engineering', 'Finance']

export function createInitialData() {
  const users = names.map((name, index) => {
    const [firstName, lastName] = name.split(' ')
    const [department, title] = roles[index % roles.length]
    const email = name.toLowerCase().replace(' ', '.') + '@acme.example'
    const status = ['ACTIVE', 'STAGED', 'SUSPENDED', 'DEACTIVATED'][index % 12] || 'ACTIVE'
    return {
      id: fixedId('usr', index), firstName, lastName, username: email, email,
      ...(index === 0 ? { secondaryEmail: 'avery.backup@example.org' } : {}),
      department, title, status, ...updated,
    }
  })
  const groups = groupsByName.map(([name, description], index) => ({
    id: fixedId('grp', index), name, description, source: index % 5 === 4 ? 'DIRECTORY' : 'OKTA', ...updated,
  }))
  const applications = appNames.map((name, index) => ({
    id: fixedId('app', index), name, category: categories[index],
    description: appDescriptions[index],
    status: index % 9 === 8 ? 'INACTIVE' : 'ACTIVE', ...created,
  }))
  const groupMemberships = groups.slice(0, 27).flatMap(({ id: groupId }, index) =>
    Array.from({ length: 4 }, (_, member) => ({
      groupId,
      userId: users[(index * 5 + member * 7) % users.length].id,
    })),
  )
  groupMemberships.push({ groupId: 'grp-002', userId: 'usr-001' }, { groupId: 'grp-003', userId: 'usr-001' })

  const appAssignments = applications.slice(0, 29).flatMap(({ id: appId }, index) => {
    const user = users[(index * 5) % users.length]
    return [
      { appId, principalType: 'GROUP', principalId: groups[index % 27].id },
      { appId, principalType: 'GROUP', principalId: groups[(index + 1) % 27].id },
      { appId, principalType: 'USER', principalId: user.id, appUsername: user.username },
    ]
  })
  appAssignments.push(
    { appId: 'app-005', principalType: 'GROUP', principalId: 'grp-009' },
    { appId: 'app-012', principalType: 'GROUP', principalId: 'grp-018' },
    { appId: 'app-018', principalType: 'GROUP', principalId: 'grp-021' },
  )
  return {
    workspace: { name: 'Acme Workspace', admin: { id: actor, name: 'Morgan Ellis', email: 'morgan.ellis@acme.example', role: 'Organization Administrator' } },
    users, groups, applications,
    groupMemberships: groupMemberships.map((record, index) => ({ id: fixedId('mem', index), ...record, status: 'ACTIVE', ...created })),
    appAssignments: appAssignments.map((record, index) => ({ id: fixedId('asg', index), ...record, status: 'ACTIVE', ...created })),
    activityEvents: [],
  }
}
