const owner = 'usr_maya'
const baseline = '2026-10-26T15:00:00.000Z'
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const notebookId = (name) => 'nb_' + slug(name)
const actorFields = (createdAt, updatedAt = createdAt) => ({ createdBy: owner, createdAt, updatedBy: owner, updatedAt })

const catalog = [
  ['Inbox', [
    ['Things to do', 'Clear the remaining November follow-ups before the planning meeting. Save action owners here as decisions come in.', 'follow-up'],
    ['Monday operations brief', 'The office move is on schedule. Vendor renewals and the training pilot are the two decisions for Monday.', 'meeting,follow-up'],
    ['Incoming requests', 'Route badge and access requests to Facilities. Budget approvals go to Finance by Wednesday.'],
  ]],
  ['Weekly Planning', [
    ['Monday priorities', 'Confirm which teams can use the second floor during the first week of the move.', 'meeting,follow-up'],
    ['November capacity check', 'The reception team has coverage on Tuesday and Thursday. Shift training to the quieter Thursday slot.', 'planning'],
    ['Quarter-end decisions', 'Write down the two dates that affect dispatch before the Friday handoff.', 'meeting'],
  ]],
  ['Office Move', [
    ['Move Day Runbook', 'The east loading dock opens at 7 a.m. Set up the freight elevator and check each floor before the first truck.', 'process,follow-up'],
    ['Floor plan feedback', 'Leave two spare desks near the southwest windows for visiting colleagues.', 'meeting'],
    ['Move budget assumptions', 'The moving quote includes one truck and four crew members. Add a contingency line for another hour.', 'budget,vendors'],
    ['Old seating proposal', 'The draft put the service desk beside the loading dock. The updated plan places it beside reception.', 'planning', true],
  ]],
  ['Vendor Reviews', [
    ['November Vendor Scorecard', 'Score support response times before the renewal meeting.\n\nOpen question: confirm the weekend escalation contact.', 'vendors,renewal,follow-up'],
    ['Renewal decision log', 'The cleaning vendor can extend through March. Hold the decision until evening staffing is confirmed.', 'vendors,budget'],
    ['Courier comparison', 'Compare the guaranteed arrival windows for the three weekday routes before signing.', 'vendors'],
    ['Superseded vendor shortlist', 'Archive the July shortlist after the new scorecard is signed. Keep the call notes with procurement.', 'vendors', true],
  ]],
  ['Team Rituals', [
    ['Retro discussion guide', 'Start with one process that made work easier. Leave ten minutes for owners and follow-ups.', 'meeting,process'],
    ['Monday standup format', 'Give each team one minute for blockers. Park detailed updates in the shared notes.', 'meeting'],
    ['Monthly demo roster', 'Onboarding and Accessibility will give the first two demos. Collect slide titles by Wednesday.', 'follow-up'],
  ]],
  ['Process Library', [
    ['Purchase approvals', 'Purchases above the team limit need a written estimate and a cost center before approval.', 'process,budget'],
    ['Document naming guide', 'Start recurring reports with the month and finish with the team name. Keep drafts in the project notebook.', 'process'],
    ['Access request workflow', 'Verify the requester and record approval before sending access details.', 'process'],
  ]],
  ['People Operations', [
    ['Interview panel notes', 'Schedule the practical exercise with one person from support and one from operations.', 'meeting'],
    ['Manager onboarding checklist', 'Confirm account access, payroll orientation and a first-week check-in with a peer manager.', 'process,follow-up'],
    ['Benefits session questions', 'Collect questions about remote coverage before the Wednesday briefing.'],
  ]],
  ['Finance', [
    ['November spend review', 'The travel budget is on forecast. Confirm the vendor credit before closing the month.', 'budget,meeting'],
    ['Invoice exception list', 'Two invoices are missing purchase order numbers. Send a consolidated request to the supplier.', 'budget,vendors'],
    ['December forecast notes', 'Move the delivery fee to the facilities cost center and keep the training materials in operations.', 'budget'],
  ]],
  ['Customer Support', [
    ['Call Escalation Guide', 'Record the caller and the impact before opening an incident. For urgent cases, contact the duty lead.', 'process,follow-up'],
    ['Queue coverage handoff', 'Rina covers the early queue. Escalation ownership changes at 1 p.m.', 'meeting'],
    ['Support snippets review', 'Update the hours in the password reset and delivery status replies.'],
  ]],
  ['IT Requests', [
    ['Laptop refresh checklist', 'Collect serial numbers before deployment and reserve two spare chargers for training.', 'process'],
    ['Guest Wi-Fi instructions', 'Give vendors a time-limited guest pass when they sign in at reception.', 'process,vendors'],
    ['Archived device inventory', 'The inventory from the spring refresh is superseded by the new asset register.', 'process', true],
  ]],
  ['Compliance', [
    ['Records retention review', 'Check that contract revisions and signed copies are filed with the correct dates.', 'process'],
    ['Control owner reminders', 'Confirm which teams own quarterly account reviews and update the register.', 'follow-up'],
    ['Audit evidence checklist', 'Link each evidence file to the relevant request and confirm the reporting period.', 'process'],
  ]],
  ['Facilities', [
    ['Loading dock access', 'Check that the new dock passes work on weekends and record the duty phone number.', 'follow-up'],
    ['Reception handover', 'Replace the directions sheet at the reception desk after the new signs are installed.', 'process'],
    ['Quiet room booking', 'Leave one afternoon slot open for orientation during the first week of December.'],
  ]],
  ['Web Refresh', [
    ['Content migration decisions', 'Retain the policy pages and retire duplicated help articles after redirects are verified.', 'meeting,process'],
    ['Homepage review', 'The next review needs a draft headline, a revised brief and annotated accessibility feedback.', 'follow-up'],
    ['Release checklist', 'Confirm redirects, broken-link reports and page ownership before publishing.', 'process'],
  ]],
  ['Spring Launch', [
    ['Launch timeline', 'The product briefing comes before partner training. Reserve a day for review after both drafts are ready.', 'planning'],
    ['Demo rehearsal notes', 'Switch to the sample workspace before the recording. Ask the presenter to pause after the first example.', 'meeting'],
    ['Partner event budget', 'Set aside the room costs first, then confirm the catering minimum.', 'budget'],
  ]],
  ['Partner Enablement', [
    ['Partner handout outline', 'Cover role permissions, setup and points of contact on one page.', 'process'],
    ['Office hours questions', 'Collect customer migration questions for the next office hours.', 'follow-up'],
    ['Retired partner checklist', 'Keep the previous checklist for reference after distributing the updated guide.', 'process', true],
  ]],
  ['Training Pilot', [
    ['Pilot session plan', 'Give participants five minutes to find the correct request form before discussing the exercise.', 'process,meeting'],
    ['Training feedback themes', 'Everyone understood the intake example. The escalation exercise needs a clearer scenario.', 'follow-up'],
  ]],
  ['Inventory Audit', [
    ['Stockroom count plan', 'Count the locked storage first. Mark any open cases and note the quantity remaining.', 'process'],
    ['Inventory reconciliation', 'Check the shelf labels against the register before changing counts.', 'follow-up'],
    ['Replacement supplies estimate', 'Request two quotes for cases of labels and protective sleeves.', 'budget,vendors'],
  ]],
  ['Accessibility Reviews', [
    ['Keyboard review findings', 'Verify that focus returns to the dialog trigger after Escape and that all controls have names.', 'process,follow-up'],
    ['Forms accessibility follow-up', 'Move field errors next to their labels and check that the summary links focus the right fields.', 'follow-up'],
    ['Review notes for mobile', 'Test wrapped toolbars and focus outlines at narrow widths before sign-off.', 'meeting'],
  ]],
  ['Meeting Archive', [
    ['October operations minutes', 'The team approved the updated dispatch schedule and assigned owners for open vendor questions.', 'meeting'],
  ]],
  ['Templates'], ['Client Handoffs'], ['Research'], ['Travel Planning'], ['Onboarding'],
]

const actions = [
  ['November Vendor Scorecard', 'Check vendor references', 'Ask the office coordinator for two comparable references.'],
  ['Move Day Runbook', 'Confirm loading dock access', 'Get a weekend contact for the freight elevator.'],
  ['Things to do', 'Send November follow-up summary', 'Include owners and dates for every open item.'],
  ['Monday operations brief', 'Circulate the operations brief', 'Send the final agenda to Finance and Facilities.'],
  ['Monday priorities', 'Reserve the planning room', 'Allow an extra half hour for the move discussion.'],
  ['November capacity check', 'Check reception coverage', 'Confirm the Thursday training slot with the reception lead.'],
  ['Quarter-end decisions', 'Record the dispatch deadlines', 'Check both dates with the program manager.'],
  ['Floor plan feedback', 'Label spare desks', 'Use removable signs for visiting staff.'],
  ['Move budget assumptions', 'Review the overtime estimate', 'Confirm the crew can stay an extra hour.'],
  ['Old seating proposal', 'Archive the marked floor plan', 'Keep the old proposal with the review notes.'],
  ['Renewal decision log', 'Request evening staffing details', 'Ask for a named contact and coverage hours.'],
  ['Courier comparison', 'Compare delivery windows', 'Record guaranteed windows for the three routes.'],
  ['Superseded vendor shortlist', 'File the July call notes', 'Store the notes under procurement history.'],
  ['Retro discussion guide', 'Collect retro topics', 'Ask each workstream for one example.'],
  ['Monday standup format', 'Share the standup outline', 'Include the time limit and location of shared notes.'],
  ['Monthly demo roster', 'Confirm demo presenters', 'Collect two names and a title for each demo.'],
  ['Purchase approvals', 'Check approval limits', 'Verify the table covers travel as well as supplies.'],
  ['Document naming guide', 'Update sample file names', 'Use examples from operations and Finance.'],
  ['Access request workflow', 'Check the approval handoff', 'Confirm escalation ownership with IT.'],
  ['Interview panel notes', 'Book the interview panel', 'Include the exercise briefing in the invite.'],
  ['Manager onboarding checklist', 'Confirm onboarding access', 'Check access before scheduling orientation.'],
  ['Benefits session questions', 'Summarize benefits questions', 'Group questions about coverage and reimbursements.'],
  ['November spend review', 'Confirm the vendor credit', 'Check the credit against the original invoice.'],
  ['Invoice exception list', 'Request purchase order numbers', 'Combine both invoice exceptions into one request.'],
  ['December forecast notes', 'Reassign the delivery fee', 'Confirm the facilities cost center.'],
  ['Call Escalation Guide', 'Verify the escalation contact', 'Ask the duty lead to review the urgent cases section.'],
  ['Queue coverage handoff', 'Publish the queue rota', 'Make the owner change at 1 p.m. explicit.'],
  ['Support snippets review', 'Review the password reset snippet', 'Use the latest operating hours.'],
  ['Laptop refresh checklist', 'Reserve two spare chargers', 'Set them aside with the pilot supplies.'],
  ['Guest Wi-Fi instructions', 'Test a guest pass', 'Verify expiration using a spare device.'],
  ['Records retention review', 'File signed contract copies', 'Check the dates against the contract register.'],
  ['Control owner reminders', 'Verify the account review owners', 'Use the current team roster.'],
  ['Loading dock access', 'Record the duty phone', 'Add the after-hours contact to the runbook.'],
  ['Content migration decisions', 'Verify policy redirects', 'Use the published inventory of policy pages.'],
  ['Launch timeline', 'Reserve a review day', 'Check the briefing and training dates first.'],
  ['Partner handout outline', 'Draft the permissions section', 'Include a point of contact for elevated requests.'],
  ['Pilot session plan', 'Print the intake exercise', 'Bring a copy for each participant and two spares.'],
  ['Stockroom count plan', 'Schedule the stockroom count', 'Choose a time outside the delivery window.'],
  ['Keyboard review findings', 'Retest dialog focus', 'Check Tab, Shift+Tab and Escape in the three primary flows.'],
  ['Move Day Runbook', 'Send the lift booking details', 'Include the booking number and duty phone.'],
]

export function createInitialData() {
  const notebooks = catalog.map(([name]) => ({
    id: notebookId(name), name, status: 'active', ...actorFields(baseline), deletedAt: null, deletedBy: null,
  }))
  const notes = catalog.flatMap(([name, entries = []]) => entries.map(([title, content, labels = '', trash = false]) => ({
    id: 'note_' + (title === 'November Vendor Scorecard' ? 'vendor_scorecard' : slug(title)),
    notebookId: notebookId(name), title, content, tags: labels ? labels.split(',') : [], status: trash ? 'trashed' : 'active',
    ...actorFields('2026-10-28T14:30:00.000Z'),
    trashedAt: trash ? '2026-11-12T18:00:00.000Z' : null, trashedBy: trash ? owner : null,
  }))).map((note, index) => ({
    ...note, updatedAt: note.trashedAt || new Date(Date.UTC(2026, 10, 17 - index % 19, 20 - Math.floor(index / 19))).toISOString(),
  }))
  const notesByTitle = new Map(notes.map((note) => [note.title, note.id]))
  const tasks = actions.map(([parent, title, description], index) => {
    const completed = index % 4 === 2
    const completedAt = completed ? '2026-11-16T16:40:00.000Z' : null
    return {
      id: 'task_' + slug(title), noteId: notesByTitle.get(parent), title, description,
      dueDate: index % 6 === 5 ? null : '2026-11-' + String(index === 0 ? 25 : 12 + (index * 7) % 18).padStart(2, '0'),
      flagged: index % 7 === 0 || index % 7 === 1,
      status: completed ? 'completed' : 'open', completedAt, completedBy: completed ? owner : null,
      deletedAt: null, deletedBy: null, ...actorFields('2026-11-09T14:00:00.000Z', completedAt || '2026-11-13T14:00:00.000Z'),
    }
  })
  return {
    user: { id: owner, name: 'Maya Chen', email: 'maya.chen@example.test' },
    preferences: { defaultNotebookId: 'nb_inbox', defaultTaskNoteId: 'note_things_to_do', updatedBy: owner, updatedAt: baseline },
    notebooks, notes, tasks,
  }
}
