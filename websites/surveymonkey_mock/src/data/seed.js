const users = [
  { id: 'usr-maya', name: 'Maya Chen', email: 'maya.chen@example.test' },
  { id: 'usr-daniel', name: 'Daniel Ortiz', email: 'daniel.ortiz@example.test' },
  { id: 'usr-priya', name: 'Priya Shah', email: 'priya.shah@example.test' },
  { id: 'usr-jordan', name: 'Jordan Bell', email: 'jordan.bell@example.test' },
]

const briefs = [
  ['onboarding', 'Customer Onboarding Pulse', 'Feedback after the first 30 days', 'How did you complete your initial setup?', 'Guided setup', 'Self-service', 'With a colleague'],
  ['renewal', 'Customer Renewal Check-in', 'Understand what customers value before renewal', 'What matters most for your renewal?', 'Product fit', 'Support', 'Pricing'],
  ['engagement', 'Employee Engagement Q2', 'Quarterly feedback across teams', 'Where would more support help?', 'Career growth', 'Workload', 'Team communication'],
  ['benefits', 'Benefits Enrollment Feedback', 'Review this year’s enrollment process', 'Where did you look for enrollment information?', 'Benefits portal', 'Email guide', 'People team'],
  ['training', 'Field Training Debrief', 'Feedback from the spring field cohort', 'Which session helped most?', 'Hands-on practice', 'Team discussion', 'Reference materials'],
  ['support', 'Customer Support Follow-up', 'Follow-up after resolved support requests', 'How did you reach the support team?', 'Email', 'Chat', 'Phone'],
  ['partner', 'Partner Program Review', 'Check in with regional partners'],
  ['workshop', 'Facilitator Workshop Feedback', 'Improve the next facilitator workshop'],
  ['product', 'Product Discovery Interviews', 'Collect input for roadmap planning'],
  ['software', 'Internal Software Inventory', 'Understand how teams choose their tools'],
  ['handoff', 'Customer Success Handoff', 'Improve handoffs between customer teams'],
  ['events', 'Spring Event Attendee Survey', 'Review talks and breakout sessions'],
  ['manager', 'Manager Enablement Pulse', 'Gather feedback on manager resources'],
  ['access', 'Office Accessibility Review', 'Identify priorities for workplace access'],
  ['vendors', 'Vendor Experience Survey', 'Review the purchasing process'],
  ['portal', 'Customer Portal Usability', 'Identify improvements to the self-service portal'],
  ['hybrid', 'Hybrid Work Preferences', 'Shape office scheduling and team norms'],
  ['research', 'Research Panel Intake', 'Understand participant interests'],
  ['reporting', 'Reporting Dashboard Feedback', 'Improve monthly reporting'],
  ['docs', 'Help Center Content Review', 'Find gaps in support documentation'],
  ['brand', 'Brand Awareness Pulse', 'Measure recognition across our audience'],
  ['community', 'Community Roundtable Follow-up', 'Build an agenda for the next roundtable'],
  ['newhire', 'New Hire Week One Survey', 'Improve the employee onboarding experience'],
  ['operations', 'Operations Process Review', 'Collect improvement ideas from operations'],
  ['retreat', 'Team Retreat Planning', 'Choose activities and meeting formats'],
  ['security', 'Security Training Check-in', 'Review the clarity of security guidance'],
  ['billing', 'Customer Billing Experience', 'Understand common invoice questions'],
  ['leadership', 'Leadership Forum Feedback', 'Review quarterly leadership sessions'],
  ['mobile', 'Mobile Experience Pilot', 'Gather feedback from mobile pilot participants'],
  ['budget', 'Research Budget Priorities', 'Identify research needs for next quarter'],
]

const comments = [
  'The walkthrough made setup easier.',
  'A checklist would help me keep track of what is left.',
  'The team answered my questions quickly.',
  'I would have liked a clearer example to start with.',
  'The follow-up email was helpful to share with my team.',
  'Please keep the short drop-in sessions.',
  'The instructions were easy to follow on my phone.',
  'A single place for resources would save time.',
  'More notice would help me coordinate with colleagues.',
  'The notes helped me pick up where I left off.',
  'I appreciated being able to go at my own pace.',
  'A short recap would make it easier to remember the next steps.',
]
const names = ['Jordan Patel', 'Alex Rivera', 'Camille Brooks', 'Emery Price', 'Taylor Nguyen', 'Avery Ellis', 'Morgan James', 'Riley Park']
const date = (day, hour = 14) => new Date(Date.UTC(2026, 4, day, hour, 30)).toISOString()

export function createInitialData() {
  const surveys = briefs.map(([slug, title, description, prompt, ...labels], index) => {
    const ownerId = users[index % users.length].id
    const questions = [
      {
        id: 'q-' + slug + '-approach', type: 'multipleChoice', required: true,
        prompt: prompt ?? 'How did you take part in this initiative?',
        options: (labels.length ? labels : ['Independently', 'With my team', 'With a facilitator']).map((label, optionIndex) => ({
          id: 'opt-' + slug + '-' + (optionIndex + 1), label,
        })),
      },
      { id: 'q-' + slug + '-score', type: 'rating', required: true, prompt: 'How would you rate your experience?' },
      { id: 'q-' + slug + '-comment', type: 'openText', required: false, prompt: 'What would you improve?' },
    ]
    if (index === 0) questions.splice(1, 0, {
      id: 'q-onboarding-resources', type: 'checkboxes', required: false, prompt: 'Which resources did you use?',
      options: [
        { id: 'opt-quickstart', label: 'Quick-start guide' },
        { id: 'opt-office-hours', label: 'Office hours' },
        { id: 'opt-help-center', label: 'Help center' },
      ],
    })
    return {
      id: 'sv-' + slug, title, description, ownerId, questions,
      createdAt: date(12 - index), updatedAt: date(27 - index),
      createdBy: ownerId, updatedBy: ownerId,
    }
  })
  const collectors = surveys.slice(0, 22).flatMap((survey, index) => {
    const channels = index === 0
      ? [['web', 'May customer follow-up'], ['manual', 'Interview notes'], ['archive', 'April pilot']]
      : [
          ['web', index % 2 ? 'Team distribution link' : 'Participant link'],
          ...(index < 15 ? [['manual', index % 2 ? 'Workshop notes' : 'Offline responses']] : []),
        ]

    return channels.map(([channel, name]) => {
      const closed = channel === 'archive' || index % 4 === 3
      const anonymous = index === 0 ? channel === 'manual' : (channel === 'manual' || index % 3 !== 1)
      return {
        id: 'col-' + survey.id.slice(3) + '-' + channel, surveyId: survey.id, name,
        type: channel === 'manual' ? 'manual' : 'webLink', status: closed ? 'closed' : 'open',
        settings: {
          anonymous, allowMultipleResponses: anonymous,
          closedMessage: 'Thanks for your interest. This survey has ended.',
        },
        closedAt: closed ? date(22 - index) : null,
        createdAt: date(13 - index, 15), updatedAt: date(22 - index, 15),
        createdBy: survey.ownerId, updatedBy: survey.ownerId,
      }
    })
  })
  const responses = surveys.slice(0, 22).flatMap((survey, index) => {
    const channels = collectors.filter(collector => collector.surveyId === survey.id)
    const [approach, resources, score, comment] = index === 0
      ? survey.questions
      : [survey.questions[0], null, survey.questions[1], survey.questions[2]]
    const count = index === 0 ? 14 : index <= 8 ? 3 : 2
    return Array.from({ length: count }, (_, entry) => {
      const collector = index === 5 ? channels[0] : channels[entry % channels.length]
      const partial = entry === 1 && index % 3 === 0
      const name = names[(index + entry) % names.length]
      const actor = collector.type === 'manual' ? survey.ownerId : 'respondent'
      const createdAt = date(15 + entry % 6 - index, 10 + entry % 8)
      return {
        id: 'rsp-' + survey.id.slice(3) + '-' + String(entry + 1).padStart(3, '0'),
        surveyId: survey.id, collectorId: collector.id, status: partial ? 'partial' : 'completed',
        ...(!collector.settings.anonymous && { respondent: { name, email: name.toLowerCase().replace(' ', '.') + '@example.test' } }),
        answers: {
          [approach.id]: approach.options[(entry + index) % approach.options.length].id,
          ...(!partial && { [score.id]: 2 + (entry + index * 3) % 4 }),
          ...(resources && entry % 3 !== 1 && { [resources.id]: resources.options.slice(0, 1 + entry % 3).map(option => option.id) }),
          ...(!partial && (entry % 2 === 0 || index === 0) && { [comment.id]: comments[(index + entry) % comments.length] }),
        },
        createdAt, updatedAt: createdAt, submittedAt: partial ? null : createdAt,
        createdBy: actor, updatedBy: actor,
      }
    })
  })
  return {
    account: { userId: 'usr-maya', workspaceName: 'Northline Research' },
    users: users.map(user => ({ ...user })),
    surveys, collectors, responses, deletions: [], exports: [],
  }
}
