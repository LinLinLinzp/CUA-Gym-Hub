import { channels, countries, stages } from './catalog.js'

const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const date = (index) => new Date(Date.UTC(2026, 9, 29 - index, 14, 30 + index % 25)).toISOString()
const actor = 'user-001'
const metadata = (index) => ({ createdAt: date(index + 6), createdBy: actor, updatedAt: date(index), updatedBy: actor })
const firstNames = ['Tessa', 'Omar', 'Priya', 'Mateo', 'Eva', 'Theo', 'Nina', 'Alex', 'Iris', 'Lena', 'Samir', 'Hugo']
const lastNames = ['Morris', 'Khan', 'Patel', 'Flores', 'Wagner', 'Bennett', 'Rivera', 'Park', 'Nguyen', 'Brooks', 'Shah', 'Reed']
const companies = ['Juniper Gaugeworks', 'Northline Systems', 'Cedar Relay', 'Aster Freight', 'Meridian Loom', 'Birch Signal']
const folderNames = {
  field: 'Field Marketing', partner: 'Partner Programs', lifecycle: 'Lifecycle',
  digital: 'Digital Demand', customer: 'Customer Marketing', events: 'Events',
}
const programNames = [
  'North America Operations Webinar', 'Industrial Insights Library', 'Q4 Partner Demand Exchange',
  'Supply Chain Leadership Forum', 'Manufacturing Readiness Series', 'Customer Expansion Digest',
  'EMEA Operations Briefing', 'Equipment Planning Resource Center', 'Channel Enablement Guide',
  'West Coast Industrial Expo', 'Renewal Readiness Nurture', 'October Product Update',
  'APAC Automation Roundtable', 'Inventory Planning Toolkit', 'Logistics Research Syndication',
  'Partner Innovation Summit', 'Buyer Education Path', 'Winter Field Notes',
  'Predictive Maintenance Webinar', 'Plant Modernization Hub', 'Operations Buyer Study',
  'Sustainable Logistics Expo', 'New Account Onboarding', 'Quarterly Channel Bulletin',
  'Regional Distribution Webinar', 'Energy Planning Center', 'Factory Analytics Report',
  'Process Design Roadshow', 'Equipment Upgrade Journey', 'Customer Advisory Newsletter',
]
const listNames = [
  'West Coast Webinar Registrants', 'Partner Advisory Contacts', 'October Field Leads', 'Renewal Review Accounts',
  'Operations Newsletter Subscribers', 'Factory Modernization Prospects', 'EMEA Event Attendees',
  'Executive Roundtable Invitees', 'Northline Account Team', 'New Equipment Buyers', 'Channel Education Cohort',
  'Supply Chain Forum Speakers', 'Customer Launch Advocates', 'APAC Partner Directory', 'Distribution Webinar Leads',
  'Design Roadshow Follow-up', 'Winter Pilot Waitlist', 'Trade Show Reserve',
  'US Operations Prospects', 'Canadian Accounts', 'Qualified Supply Chain Leads', 'Customer Education Audience',
  'Northline Contacts', 'Cedar Relay Contacts', 'West Coast Follow-up Audience', 'German Operations Leads',
  'Australian Prospects', 'Singapore Pipeline', 'Lifecycle Expansion Segment', 'Unassigned Region Review',
]
const campaignNames = [
  'Promote webinar registrants', 'Qualify report readers', 'Route demand exchange leads',
  'Record forum attendance', 'Enroll readiness cohort', 'Update digest audience',
  'Record briefing registrations', 'Segment toolkit downloads', 'Register channel prospects',
  'Add expo visitors to follow-up', 'Track renewal milestones', 'Prepare product update audience',
]

export function createInitialData() {
  const currentUser = { id: actor, name: 'Maya Chen', role: 'Marketing Operations Manager', email: 'maya.chen@example.test' }
  const folders = Object.entries(folderNames).map(([key, name]) => ({ id: 'folder-' + key, name }))
  const people = Array.from({ length: 72 }, (_, index) => {
    const firstName = firstNames[index % 12]
    const lastName = lastNames[(index + Math.floor(index / 12)) % 12]
    return {
      id: id('person', index), firstName, lastName,
      email: [firstName, lastName].join('.').toLowerCase() + '@example.test',
      company: companies[(index + Math.floor(index / 6)) % 6],
      country: countries[(index + Math.floor(index / 4)) % 6],
      lifecycleStage: stages[(index + Math.floor(index / 7)) % 4],
    }
  })
  const programChannels = [channels[3], channels[0], channels[1], channels[2], channels[4], channels[5]]
  const programs = programNames.map((name, index) => ({
    id: id('program', index), folderId: folders[(index + Math.floor(index / 6)) % 6].id, name,
    type: programChannels[index % 6].type, channel: programChannels[index % 6].name,
    description: 'Coordinate audience participation and follow-up for ' + name + '.',
    status: index % 8 === 7 ? 'archived' : 'active', ...metadata(index),
  }))
  const programMembers = programs.flatMap((program, index) => {
    const statuses = programChannels[index % 6].statuses
    return Array.from({ length: 4 + index % 5 }, (_, offset) => ({
      id: id('program-member', index * 9 + offset), programId: program.id,
      personId: people[(index * 5 + offset * 3) % people.length].id,
      status: statuses[(offset + index) % statuses.length], ...metadata(index + offset),
    }))
  })
  const smartRules = [
    ['country', 'is', countries[0]], ['country', 'is', countries[1]], ['lifecycleStage', 'is', 'MQL'],
    ['lifecycleStage', 'is', 'Customer'], ['company', 'contains', 'Northline'], ['company', 'is', companies[2]],
    ['memberOfList', 'in', 'list-001'], ['country', 'is', countries[3]], ['country', 'is', countries[4]],
    ['country', 'is', countries[5]], ['lifecycleStage', 'is', 'SQL'], ['country', 'is', 'Iceland'],
  ]
  const lists = listNames.map((name, index) => {
    const [field, operator, value] = smartRules[index - 18] ?? []
    return {
      id: id('list', index), name, kind: field ? 'smart' : 'static',
      programId: index % 3 === 1 ? null : programs[index % 12].id,
      description: 'Audience maintained by Demand Operations for ' + name + '.',
      matchMode: field ? 'all' : null,
      rules: field ? [{ id: id('list-rule', index), field, operator, value }] : [],
      ...metadata(index),
    }
  })
  const listMembers = lists.slice(0, 17).flatMap((list, index) =>
    Array.from({ length: 5 + index % 6 }, (_, offset) => ({
      id: id('list-member', index * 11 + offset), listId: list.id,
      personId: people[(index * 7 + offset * 4) % people.length].id, createdAt: date(index), createdBy: actor,
    })),
  )
  const smartCampaigns = Array.from({ length: 36 }, (_, index) => {
    const trigger = index % 6 === 1 || index % 6 === 2
    const program = programs[index % programs.length]
    return {
      id: id('campaign', index), programId: program.id,
      name: campaignNames[index % 12] + (index < 12 ? '' : index < 24 ? ' · Regional' : ' · Partner'),
      description: 'Apply the saved audience and follow-up steps for ' + program.name + '.',
      mode: trigger ? 'trigger' : 'batch',
      status: ['draft', 'active', 'inactive', 'scheduled', 'completed', 'draft'][index % 6],
      matchMode: trigger ? 'everyone' : 'all',
      rules: trigger ? [] : [{ id: id('campaign-rule', index), field: 'memberOfList', operator: 'in', value: lists[index % 17].id }],
      triggers: trigger ? [{ id: id('trigger', index), type: 'addedToList', listId: lists[index % 17].id }] : [],
      flow: [{ id: id('step', index), type: 'changeProgramStatus', listId: null, status: programChannels[index % 6].statuses[0] }],
      activatedAt: trigger ? date(index + 3) : null, deactivatedAt: index % 6 === 2 ? date(index) : null,
      ...metadata(index),
    }
  })
  const campaignRuns = smartCampaigns.flatMap((campaign, index) => {
    const status = campaign.status === 'draft' && index % 6 === 5 ? 'canceled' : campaign.status
    if (!['scheduled', 'completed', 'canceled'].includes(status)) return []
    const completed = status === 'completed'
    const personIds = completed ? listMembers.filter(link => link.listId === campaign.rules[0].value).map(link => link.personId) : []
    return [{
      id: id('run', index), campaignId: campaign.id, programId: campaign.programId, status,
      scheduledAt: status === 'scheduled' ? new Date(Date.UTC(2027, 0, 4 + index, 15)).toISOString() : status === 'canceled' ? date(index) : null,
      startedAt: completed ? date(index + 1) : null, completedAt: completed ? date(index) : null,
      canceledAt: status === 'canceled' ? date(index + 1) : null,
      processedPersonIds: personIds, processedCount: personIds.length,
      stepResults: completed ? [{ stepId: campaign.flow[0].id, type: campaign.flow[0].type, targetId: campaign.programId, personIds: [], changedCount: 0 }] : [],
      ...metadata(index),
    }]
  })
  const activityLog = [
    ['program_created', 'program', programs[0].id], ['list_created', 'list', lists[0].id],
    ['campaign_flow_saved', 'smartCampaign', smartCampaigns[0].id],
  ].map(([action, entityType, entityId], index) => ({
    id: id('activity', index), action, entityType, entityId, actorId: actor, createdAt: date(index), personIds: [], quantity: 0, runId: null,
  }))
  return { currentUser, folders, people, programs, programMembers, lists, listMembers, smartCampaigns, campaignRuns, activityLog }
}

