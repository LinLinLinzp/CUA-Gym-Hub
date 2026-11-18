const field = (key, label, required = true) => ({ key, label, required })
const event = (id, name, kind, fields, sampleOutput) => ({ id, name, kind, fields, sampleOutput })

function catalog() {
  return [
    ['sheets', 'Google Sheets', 'GS', '#237057',
      event('new_row', 'New Spreadsheet Row', 'trigger', [field('spreadsheet', 'Spreadsheet'), field('worksheet', 'Worksheet')], { email: 'casey@example.test', name: 'Casey Rivera', row: 12 }),
      event('create_row', 'Create Spreadsheet Row', 'action', [field('spreadsheet', 'Spreadsheet'), field('worksheet', 'Worksheet'), field('values', 'Row values')], { row: 13 })],
    ['slack', 'Slack', 'SL', '#673b79',
      event('new_message', 'New Channel Message', 'trigger', [field('channel', 'Channel')], { text: 'Quarterly review is ready', channel: '#operations' }),
      event('send_channel_message', 'Send Channel Message', 'action', [field('channel', 'Channel'), field('message', 'Message', false)], { messageId: 'msg_104' })],
    ['gmail', 'Gmail', 'GM', '#a94436',
      event('new_email', 'New Email', 'trigger', [field('label', 'Label')], { from: 'casey@example.test', subject: 'Intake request' }),
      event('send_email', 'Send Email', 'action', [field('to', 'To'), field('subject', 'Subject'), field('body', 'Body')], { messageId: 'mail_102' })],
    ['hubspot', 'HubSpot', 'HS', '#9b4b24',
      event('new_contact', 'New Contact', 'trigger', [], { email: 'casey@example.test', name: 'Casey Rivera' }),
      event('create_contact', 'Create Contact', 'action', [field('email', 'Email'), field('name', 'Name', false)], { contactId: 'contact_28' })],
    ['airtable', 'Airtable', 'AT', '#3961a2',
      event('new_record', 'New Record', 'trigger', [field('base', 'Base'), field('table', 'Table')], { recordId: 'record_231', name: 'Quarterly review' }),
      event('create_record', 'Create Record', 'action', [field('base', 'Base'), field('table', 'Table'), field('values', 'Record values')], { recordId: 'record_232' })],
    ['forms', 'Google Forms', 'GF', '#5f4f99',
      event('new_response', 'New Form Response', 'trigger', [field('form', 'Form')], { email: 'casey@example.test', response: 'Please follow up next week' }),
      event('create_form', 'Create Form', 'action', [field('title', 'Form title')], { formId: 'form_42' })],
    ['calendar', 'Google Calendar', 'GC', '#365bb0',
      event('event_start', 'Event Start', 'trigger', [field('calendar', 'Calendar')], { title: 'Renewal review', eventId: 'evt_81' }),
      event('create_event', 'Create Detailed Event', 'action', [field('calendar', 'Calendar'), field('title', 'Title'), field('start', 'Start time')], { eventId: 'evt_82' })],
    ['trello', 'Trello', 'TR', '#216e93',
      event('new_card', 'New Card', 'trigger', [field('board', 'Board')], { name: 'Review new intake', cardId: 'card_72' }),
      event('create_card', 'Create Card', 'action', [field('board', 'Board'), field('list', 'List'), field('name', 'Card name')], { cardId: 'card_73' })],
    ['notion', 'Notion', 'NO', '#474c61',
      event('new_item', 'New Database Item', 'trigger', [field('database', 'Database')], { title: 'Handoff notes', itemId: 'item_215' }),
      event('create_item', 'Create Database Item', 'action', [field('database', 'Database'), field('title', 'Title')], { itemId: 'item_216' })],
    ['schedule', 'Schedule by Zapier', 'SZ', '#a64e32',
      event('every_day', 'Every Day', 'trigger', [field('time', 'Time of day')], { date: '2026-11-06', weekday: 'Friday' }),
      event('every_week', 'Every Week', 'trigger', [field('day', 'Day of week'), field('time', 'Time of day')], { date: '2026-11-06', weekday: 'Friday' })],
  ].map(([id, name, initials, color, ...events]) => ({
    id: 'app_' + id, name, initials, color, requiresConnection: id !== 'schedule', events,
  }))
}

const workflows = [
  ['Notify sales about a new lead', 'sheets', 'slack', 'leads'],
  ['Flag overdue onboarding reviews', 'schedule', 'slack', 'customers'],
  ['Send renewal reminders', 'calendar', 'gmail', 'customers'],
  ['Log partner referrals', 'forms', 'hubspot', 'leads'],
  ['Share weekly pipeline notes', 'schedule', 'slack', 'leads'],
  ['Create tickets from intake forms', 'forms', 'trello', 'projects'],
  ['Sync campaign responses', 'forms', 'sheets', 'marketing'],
  ['Send welcome emails', 'hubspot', 'gmail', 'customers'],
  ['Log new customer interviews', 'calendar', 'notion', 'customers'],
  ['Route priority support requests', 'gmail', 'trello', 'customers'],
  ['Build the weekly operations digest', 'schedule', 'notion', null],
  ['Archive resolved escalations', 'trello', 'airtable', 'customers'],
  ['Share new demo requests', 'forms', 'slack', 'leads'],
  ['Track contract approvals', 'gmail', 'sheets', 'finance'],
  ['Schedule customer check-ins', 'hubspot', 'calendar', 'customers'],
  ['Log webinar registrations', 'forms', 'airtable', 'marketing'],
  ['Remind owners about open invoices', 'schedule', 'gmail', 'finance'],
  ['Create product feedback cards', 'forms', 'trello', 'projects'],
  ['Send hiring panel updates', 'calendar', 'slack', 'people'],
  ['Copy incident notes to the knowledge base', 'slack', 'notion', 'projects'],
  ['Collect supplier requests', 'forms', 'airtable', 'finance'],
  ['Start project kickoff checklists', 'sheets', 'trello', 'projects'],
  ['Alert the team about inventory changes', 'airtable', 'slack', null],
  ['Track procurement approvals', 'gmail', 'sheets', 'finance'],
  ['Share Friday staffing notes', 'schedule', 'slack', 'people'],
  ['Log community feedback', 'forms', 'notion', 'marketing'],
  ['Create finance review events', 'airtable', 'calendar', 'finance'],
  ['Route website corrections', 'gmail', 'trello', 'marketing'],
  ['Send release readiness prompts', 'calendar', 'slack', 'projects'],
  ['Track inbound partnership emails', 'gmail', 'hubspot', 'leads'],
  ['Sync field visit notes', 'notion', 'airtable', 'projects'],
  ['Log onboarding form responses', 'forms', 'sheets', 'people'],
  ['Monitor outstanding quotes', 'sheets', 'gmail', 'finance'],
  ['Share approved creative briefs', 'notion', 'slack', 'marketing'],
  ['Create customer survey follow-ups', 'forms', 'trello', 'customers'],
  ['Send monthly planning prompts', 'schedule', 'gmail', null],
]
const values = {
  spreadsheet: 'Operations tracker', worksheet: 'Intake', values: 'New intake item', channel: '#operations',
  message: 'A new item is ready for review', label: 'Intake', to: 'ops@northwind.example', subject: 'New intake',
  body: 'A new request is ready for review.', email: 'casey@example.test', name: 'Casey Rivera',
  base: 'Operations', table: 'Requests', form: 'Operations intake', title: 'Review new intake',
  calendar: 'Operations calendar', start: '2026-11-18T14:00:00Z', board: 'Operations', list: 'Inbox',
  database: 'Operations notes', time: '09:00', day: 'Friday',
}
const literal = (value) => ({ type: 'literal', value })
const actor = 'usr_avery'
const stamp = (day, hour = 14, minute = 0) => new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString()

export function createInitialData() {
  const workspace = { id: 'ws_northwind', name: 'Northwind Operations', currentUserId: actor }
  const users = ['Avery Morgan', 'Jordan Kim', 'Morgan Patel', 'Riley Brooks'].map((name) => {
    const first = name.split(' ')[0].toLowerCase()
    return { id: 'usr_' + first, name, email: first + '@northwind.example' }
  })
  const folders = [
    ['leads', 'Lead Operations'], ['customers', 'Customer Success'], ['projects', 'Project Delivery'],
    ['finance', 'Finance'], ['people', 'People Operations'], ['marketing', 'Marketing'],
  ].map(([id, name]) => ({ id: 'fld_' + id, name }))
  const apps = catalog()
  const connectedApps = apps.filter((app) => app.requiresConnection)
  const connections = connectedApps.flatMap((app, index) => ['Operations', 'Studio', 'Field team'].map((team, group) => {
    const ownerId = users[(index + group) % users.length].id
    const status = group === 2 && index < 6 ? 'expired' : 'active'
    return {
      id: 'con_' + app.id.slice(4) + '_' + group, appId: app.id, name: team + ' ' + app.name,
      accountLabel: ['ops', 'studio', 'field'][group] + '@northwind.example', ownerId, status,
      lastTestResult: status, lastTestedAt: stamp(5 + index), lastReconnectedAt: null,
      createdAt: stamp(-index), createdBy: ownerId, updatedAt: stamp(5 + index), updatedBy: ownerId,
    }
  }))
  connections.push({
    id: 'con_sales_slack', appId: 'app_slack', name: 'Sales alerts Slack', accountLabel: 'sales-ops@northwind.example',
    ownerId: actor, status: 'expired', lastTestResult: 'expired', lastTestedAt: stamp(6, 10, 10),
    lastReconnectedAt: null, createdAt: stamp(1), createdBy: actor, updatedAt: stamp(6, 10, 10), updatedBy: actor,
  })

  function makeStep(index, app, kind) {
    const choice = app.events.find((entry) => entry.kind === kind)
    return {
      id: 'stp_' + index + '_' + kind, kind, appId: app.id, eventId: choice.id,
      connectionId: app.requiresConnection ? 'con_' + app.id.slice(4) + '_' + (index % 2) : null,
      fields: Object.fromEntries(choice.fields.map(({ key }) => [key, literal(values[key])])), lastTest: null,
    }
  }
  const appMap = new Map(apps.map((app) => [app.id.slice(4), app]))
  const zaps = workflows.map(([name, triggerApp, actionApp, folder], index) => {
    const ownerId = users[index % users.length].id
    const status = index && index % 5 === 0 ? 'draft' : index % 4 === 2 || index === 3 ? 'off' : 'on'
    const trigger = makeStep(index, appMap.get(triggerApp), 'trigger')
    const action = makeStep(index, appMap.get(actionApp), 'action')
    if (!index) {
      trigger.id = 'stp_lead_trigger'
      action.id = 'stp_lead_slack'
      action.connectionId = 'con_sales_slack'
      action.fields = {
        channel: literal('#sales-intake'),
        message: { type: 'mapping', stepId: trigger.id, outputKey: 'email' },
      }
    }
    const steps = [trigger, action]
    return {
      id: index ? 'zap_' + String(index + 1).padStart(2, '0') : 'zap_lead_alert',
      name, ownerId, folderId: folder ? 'fld_' + folder : null, status,
      enabled: status === 'on', version: status === 'draft' ? 0 : 1,
      draftSteps: steps, publishedSteps: status === 'draft' ? [] : structuredClone(steps),
      createdAt: stamp(-index % 12), createdBy: ownerId, updatedAt: stamp(16 - index % 15), updatedBy: ownerId,
      publishedAt: status === 'draft' ? null : stamp(2),
    }
  })
  const published = zaps.filter((zap) => zap.version)
  const runs = Array.from({ length: 84 }, (_, index) => {
    const zap = index < 3 ? zaps[index ? 1 : 0] : published[(index * 7) % (published.length - 1) + 1]
    const status = index < 2 ? 'errored' : index % 13 === 0 ? 'on_hold' : index % 7 === 0 ? 'filtered' : index % 5 === 0 ? 'errored' : 'success'
    const [trigger, action] = zap.publishedSteps
    const fixture = (step) => apps.find((app) => app.id === step.appId).events.find((entry) => entry.id === step.eventId)
    const triggerInput = { ...fixture(trigger).sampleOutput }
    const actionInput = Object.fromEntries(Object.entries(action.fields).map(([key, setting]) => [
      key, setting.type === 'mapping' ? triggerInput[setting.outputKey] : setting.value,
    ]))
    return {
      id: index ? 'run_' + String(index + 1).padStart(3, '0') : 'run_lead_error',
      zapId: zap.id, zapName: zap.name, zapVersion: zap.version, status,
      taskCount: status === 'success' ? 1 : 0, source: index === 2 ? 'replay' : 'trigger',
      replayOfRunId: index === 2 ? 'run_002' : null,
      createdAt: !index ? stamp(6, 10, 5) : index === 1 ? stamp(17, 13, 50) : stamp(17 - Math.floor((index - 1) / 4), 16 - index % 4, index % 60),
      createdBy: index === 2 ? actor : null, triggerInput,
      stepResults: [
        { stepId: trigger.id, name: fixture(trigger).name, kind: 'trigger', appId: trigger.appId, eventId: trigger.eventId,
          status: 'success', input: {}, output: triggerInput, error: null },
        { stepId: action.id, name: fixture(action).name, kind: 'action', appId: action.appId, eventId: action.eventId,
          status, input: actionInput, output: status === 'success' ? fixture(action).sampleOutput : null,
          error: status === 'errored' ? (index ? 'The destination did not accept the request.' : 'Reconnect Sales alerts Slack') : null },
      ],
    }
  })
  return { workspace, users, folders, apps, connections, zaps, runs }
}
