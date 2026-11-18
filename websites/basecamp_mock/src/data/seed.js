const workspace = {
  id: 'workspace-northstar', name: 'Northstar Studio', currentUserId: 'person-maya', timeZone: 'America/Chicago',
}
const winter = '2026-10-19T15:00:00.000Z'
const palette = ['#cbe6da', '#e9d9f5', '#f5dec8', '#dce8f7', '#efe6ae', '#efd9e6']

const roster = [
  ['maya', 'Maya Chen', 'Project Lead'], ['jordan', 'Jordan Patel', 'Web Developer'],
  ['leila', 'Leila Brooks', 'Content Strategist'], ['owen', 'Owen Reed', 'Operations Coordinator'],
  ['nina', 'Nina Alvarez', 'Product Designer'], ['sam', 'Sam Okafor', 'Engineering Lead'],
  ['ava', 'Ava Martin', 'Account Manager'], ['eli', 'Eli Cohen', 'QA Engineer'],
  ['imani', 'Imani Bell', 'Editor'], ['theo', 'Theo Nguyen', 'Research Lead'],
  ['sara', 'Sara Kim', 'Brand Designer'], ['luca', 'Luca Rossi', 'Producer'],
  ['riya', 'Riya Shah', 'Finance Coordinator'], ['ben', 'Ben Wallace', 'Facilities Lead'],
  ['ana', 'Ana Morales', 'Partnerships Lead'], ['noah', 'Noah Fischer', 'Writer'],
  ['grace', 'Grace Park', 'Customer Success'], ['caleb', 'Caleb Ross', 'Developer'],
  ['yasmin', 'Yasmin Ali', 'Researcher'], ['mateo', 'Mateo Silva', 'Photographer'],
  ['zoe', 'Zoe Hart', 'Illustrator'], ['felix', 'Felix Wright', 'IT Coordinator'],
  ['audrey', 'Audrey Hayes', 'Copywriter'], ['diego', 'Diego Romero', 'Analyst'],
]

const portfolio = [
  ['website', 'Website Relaunch', 'Rebuild the marketing site and prepare for the December release.', 'maya jordan leila owen nina sam eli sara caleb audrey'],
  ['onboarding', 'Client Onboarding', 'Make the first month feel clear and personal for every new client.', 'ava maya owen grace jordan riya'],
  ['editorial', 'Editorial Calendar', 'Plan, edit and ship the studio’s editorial work for the winter quarter.', 'leila imani noah luca audrey mateo'],
  ['creative', 'Creative Operations', 'Coordinate design requests, the asset library and production handoffs.', 'nina sara zoe luca mateo owen maya'],
  ['research', 'Product Research', 'Recruit participants and share evidence for the next product planning cycle.', 'theo yasmin diego nina maya grace'],
  ['office', 'Office Operations', 'Keep the studio running across equipment, office days and vendors.', 'owen ben felix riya maya luca'],
  ['partner', 'Partner Launch', 'Coordinate enablement and communications for the Alder & Finch launch.', 'ana ava leila sam diego maya'],
  ['handbook', 'Studio Handbook', 'A home for team guidance, studio practices and shared decisions.', 'maya owen leila jordan'],
]

const personId = (key) => 'person-' + key
const metadata = (createdById, createdAt = winter) => ({ createdById, createdAt, updatedById: createdById, updatedAt: createdAt })
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function seedPeople() {
  return roster.map(([key, name, role], index) => ({
    id: personId(key), name, email: slug(name) + '@northstar.example', role,
    avatarColor: palette[index % palette.length], isAdmin: key === 'maya',
  }))
}

function seedProjects() {
  return portfolio.map(([key, name, description, members], index) => ({
    id: 'project-' + key, name, description, memberIds: members.split(' ').map(personId), color: palette[index % palette.length],
  }))
}

export function createInitialData() {
  const people = seedPeople()
  const projects = seedProjects()
  const messageBoards = projects.map((project) => ({
    id: project.id.replace('project-', 'board-'), projectId: project.id, title: 'Message Board', sortOrder: 'newest',
    ...metadata(project.memberIds[0]),
  }))
  const schedules = projects.map((project) => ({
    id: project.id.replace('project-', 'schedule-'), projectId: project.id, title: 'Schedule',
  }))
  const { todoLists, todos } = seedTasks(projects)
  const { messageCategories, messages } = seedBoards(projects, messageBoards)
  const scheduleEntries = seedEvents(projects, schedules)
  const comments = seedComments(projects, messages, todos)
  return {
    workspace: { ...workspace }, people, projects, todoLists, todos, messageBoards, messageCategories,
    messages, schedules, scheduleEntries, comments,
  }
}

const taskGroups = [
  [
    ['Launch checklist', 'Final checks before the staged rollout.',
      'Review the redirect map|Approve the final launch copy|Update the launch day checklist|Confirm monitoring coverage|Check the public status banner'],
    ['QA round two', 'Check the release candidate across browsers and devices.',
      'Test the pricing calculator on mobile|Verify keyboard navigation|Retest the newsletter form|Run a Safari smoke test|Capture comparison screenshots'],
    ['Content migration', 'Move approved content into the new site structure.',
      'Archive retired articles|Map redirects for case studies|Replace stale team photos|Import article author profiles|Review the resource center taxonomy'],
    ['Design polish', 'Resolve remaining visual details from the review.',
      'Check heading scale on tablets|Tidy the footer columns|Align the mobile menu icons|Update high contrast components|Approve homepage image crops'],
    ['Analytics and tracking', 'Verify reporting before traffic moves.',
      'Audit consent behavior|Validate signup conversion events|Check channel attribution tags|Preserve historical funnel labels|Prepare the launch dashboard'],
    ['Release handoff', 'Make deployment ownership and rollback steps obvious.',
      'Confirm the support rotation|Document DNS rollback steps|Review the operations runbook|Write release notes for support|Schedule the release retrospective'],
  ], [
    ['Welcome materials', 'Prepare the information clients receive in week one.',
      'Refresh the kickoff checklist|Rewrite the welcome email|Collect the client success examples|Share the welcome packet for review'],
    ['Kickoff sessions', 'Set up the first meetings and confirm attendance.',
      'Reserve the orientation slot|Send the discovery questionnaire|Confirm client billing contacts|Draft the kickoff discussion guide'],
    ['Handoff', 'Close out onboarding with clear ownership.',
      'Document the account milestones|Check the escalation contacts|Review first-month feedback'],
  ], [
    ['November pitches', 'Review ideas for the upcoming feature cycle.',
      'Read the winter market pitch|Commission the studio profile|Choose an illustrator for the interview|Review the photo essay outline'],
    ['In production', 'Coordinate articles that are in active production.',
      'Edit the typography interview|Fact-check the process feature|Clear the featured image rights|Proofread the Q4 newsletter'],
    ['Publishing', 'Prepare and verify publishing slots.',
      'Set publication dates for December|Write social copy for the profile|Update the byline guide'],
  ], [
    ['Design intake', 'Triage requests and collect usable briefs.',
      'Triage new brand requests|Estimate the signage work|Review the cover illustration brief|Assign the landing page concepts'],
    ['Asset library', 'Keep approved design assets available and organized.',
      'Replace the production icon exports|Add usage notes to the templates|Retire the legacy type samples|Verify the photography credits'],
    ['Production handoff', 'Ship the source materials with complete specs.',
      'Confirm the print proofs|Package the partner banner assets|Share artwork dimensions with the vendor'],
  ], [
    ['Recruitment', 'Line up a varied group of study participants.',
      'Confirm interview availability|Check the recruiting screener|Invite two accessibility participants|Prepare the participant incentives'],
    ['Interview prep', 'Make the study materials ready for facilitators.',
      'Rehearse the prototype walkthrough|Update the consent wording|Review the note-taking prompts|Reserve the remote interview rooms'],
    ['Synthesis', 'Make research evidence easy to share.',
      'Cluster findings by workflow|Draft the recommendation summary|Add clips to the insights library'],
  ], [
    ['Office days', 'Coordinate the next studio days.',
      'Order supplies for the studio day|Share seating plans|Update the guest badges|Confirm the November lunch order'],
    ['Equipment', 'Track setup and maintenance work.',
      'Replace the meeting room adapter|Return the loaner laptop|Audit spare keyboards|Check the projector firmware'],
    ['Vendors', 'Keep contracts and invoices easy to track.',
      'Review the cleaning contract renewal|Confirm the courier pickup slots|Update the vendor directory'],
  ], [
    ['Enablement', 'Give both teams what they need before launch.',
      'Approve the partner training deck|Collect sales team questions|Prepare the partner demo login|Run an enablement dry run'],
    ['Communications', 'Coordinate approvals and distribution for launch assets.',
      'Review the joint announcement|Confirm press contact names|Sign off on launch email language|Update the partner landing copy'],
    ['Launch follow-up', 'Review rollout results and outstanding work.',
      'Build the launch metrics sheet|Share the first-week results|Schedule the partner retrospective'],
  ],
]

const dateOn = (day, month = '11') => `2026-${month}-${String(day).padStart(2, '0')}`
const at = (day, time = '15:00') => `${day}T${time}:00.000Z`

function seedTasks(projects) {
  const todoLists = []
  const todos = []
  projects.forEach((project, projectIndex) => {
    const groups = taskGroups[projectIndex] ?? []
    const projectKey = project.id.slice(8)
    groups.forEach(([name, description, titles], position) => {
      const id = 'list-' + (projectIndex ? projectKey + '-' : '') + slug(name)
      const owner = project.memberIds[position % project.memberIds.length]
      todoLists.push({ id, projectId: project.id, name, description, position, status: 'active', ...metadata(owner) })
      titles.split('|').forEach((title, taskIndex) => {
        const index = todos.length
        const example = index === 0
        const completed = index % 4 === 3
        const author = project.memberIds[(taskIndex + position) % project.memberIds.length]
        const createdAt = at(dateOn(2 + index % 8), '16:00')
        const completedAt = completed ? at(dateOn(10 + index % 13)) : null
        const dueOn = example ? dateOn(19) : index % 7 === 0 ? null : dateOn(13 + index % 17)
        const rangeStart = index % 9 === 0 && dueOn ? dateOn(Number(dueOn.slice(-2)) - 2) : null
        todos.push({
          id: example ? 'todo-redirect-map' : 'todo-' + projectKey + '-' + slug(title),
          projectId: project.id, listId: id, title, position: taskIndex,
          notes: example ? 'Spot-check the highest traffic legacy paths.'
            : ['Add any open questions to the list before the next project check-in.',
                'Ask the list owner to review the handoff before marking this complete.',
                'Include the latest decision and any follow-up owners in your notes.',
                'Flag dependencies that might change the delivery date.'][index % 4],
          assigneeIds: example ? [project.memberIds[0]] : index % 7 === 0 ? []
            : index % 5 === 0 ? [author, project.memberIds[(taskIndex + position + 1) % project.memberIds.length]] : [author],
          completionNotifyIds: index % 6 === 0 ? [project.memberIds[0]] : [],
          startsOn: rangeStart, dueOn, completed, completedById: completed ? author : null,
          completedAt, status: 'active', ...metadata(author, createdAt),
          ...(completed ? { updatedAt: completedAt } : {}),
        })
      })
    })
  })
  return { todoLists, todos }
}

const categoryFixtures = [
  ['Announcement', '📣'], ['FYI', '🗂️'], ['Pitch', '💡'], ['Question', '❓'], ['Update', '📝'],
]

const boardFixtures = [
  [
    ['Website relaunch kickoff', 'The relaunch is underway. Use the launch checklist for owners and the Schedule for review dates. Keep decisions and release risks on this board.'],
    ['December release plan', 'We will start with the staging walkthrough on Thursday. After that we will roll out redirects in batches and check the public status banner.'],
    ['Mobile navigation options', 'The drawer and the inline menu are ready for comparison. I recommend the drawer so the pricing link stays visible at small widths.'],
    ['Which old resource links should remain?', 'The resource center export still lists retired webinars. Please flag any pages that should redirect to an active resource.'],
    ['Accessibility review notes', 'The latest check found missing focus indicators in the footer and on the account menu. The QA list has a separate task for keyboard navigation.'],
    ['Swapping the homepage photography', 'We have three new crops of the studio photos. The wide exterior image works well on desktop, and the workshop photo is stronger on mobile.'],
    ['Redirect mapping handoff', 'The redirect map is ready for a spot-check. Start with the legacy paths from last month’s traffic report and note any missing destinations.'],
    ['New staging preview details', 'Use the release candidate to verify the pricing and contact pages. We will reset the sample form submissions after the Thursday review.'],
    ['Launch copy and tone', 'Headings should describe the work in plain language. The pricing page copy is ready, and the support team is reviewing the short descriptions.'],
    ['Analytics naming conventions', 'Use a single signup event across the form variants. The reporting dashboard joins these events to the previous site’s conversion data.'],
    ['Content migration progress', 'The case studies are imported, including the older image credits. We still need two updated author bios before the article archive is complete.'],
    ['Security review is scheduled', 'Sam and Caleb will review redirects and form handling before release. Please add any items that need a second pair of eyes.'],
    ['Brand proof for the footer', 'The lighter wordmark is ready for the footer. The contrast improves in dark mode and the full studio name stays legible at narrow widths.'],
    ['Which support links should be on the home page?', 'Support asked for contact and office hours to remain visible. Let us know if there is a third link customers use frequently.'],
    ['Notes from the browser smoke test', 'The latest Safari and Firefox runs passed. The remaining check is a slow-network pass on the signup page and its confirmation screen.'],
    ['Launch day reporting coverage', 'We will keep a shared log of traffic changes and inbound questions. Owen will update the incident channel when the rollout starts.'],
  ], [
    ['Client onboarding check-in', 'The welcome packet is through its first review. Please add feedback from this month’s new accounts to the handoff list.'],
    ['New welcome packet for November', 'The packet now includes office hours and a short guide to the first invoice. Ava will share it with the onboarding team after approval.'],
    ['A shorter kickoff agenda', 'Try a twenty-minute opening call with introductions, goals and the next checkpoint. Send the longer discovery questions separately.'],
    ['Can we offer two training times?', 'Several clients asked for late-afternoon options. We have a second slot held on Thursday if we can staff it.'],
    ['First-month feedback summary', 'Customers are using the kickoff checklist, but the escalation contact is hard to find. The next packet update will move it to the top.'],
    ['Client example archive', 'Grace organized examples by industry and onboarding stage. Add recent examples with the relevant contacts removed.'],
  ], [
    ['December editorial slate', 'We have three confirmed features and room for one shorter piece. Pitch any timely ideas before the next editorial review.'],
    ['Winter market photo selections', 'The contact sheet has all locations and credits. Review the portraits first so we can request usage permission early.'],
    ['Pitch for the type studio feature', 'We could follow a single typeface from its first sketches to a specimen sheet. The studio’s archive has enough material for a useful sidebar.'],
    ['Who can fact-check the process story?', 'The draft mentions two workshop techniques and an older production tool. We need a reviewer with practical shop experience.'],
    ['Newsletter proofreading complete', 'The newsletter passed its final proof. Imani will schedule it after the image rights for the lead story are confirmed.'],
    ['An updated byline guide', 'Confirm titles and preferred names with interviewees. Contributors can choose whether to include their location in the short bio.'],
  ], [
    ['New creative intake hours', 'Design requests will be reviewed on Tuesday and Thursday mornings. Please include owners and estimated production dates in your brief.'],
    ['Photo credit conventions', 'Credit the photographer on the first use in each format. Put the original credit and license under the source asset in the library.'],
    ['Simplify the template folders', 'Organize templates by deliverable so the current files are easy to spot. Mark retired layouts and keep their documentation in the archive.'],
    ['Signage proof approvals', 'Do we want the smaller line of text on the street-facing panel? Print has asked for an answer before sending the final proof.'],
    ['Partner banner artwork is ready', 'The production package has two sizes, a bleed guide and an approved image. Luca has the printer’s contact details.'],
  ], [
    ['Research recruitment is open', 'The screener is live for existing customers and a new cohort. Reserve two slots for people who use assistive technology.'],
    ['Interview materials and roles', 'Theo will facilitate the first sessions and Yasmin will take notes. Open the same prototype version before each interview.'],
    ['Pitch for a synthesis workshop', 'Use one session to map evidence to user workflows. The next session can prioritize recommendations and owners.'],
    ['How should we handle incentive delays?', 'One participant asked about the payment timeline. Please confirm the standard turnaround so it is accurate in the email.'],
    ['Interview round one findings', 'Several people could complete the workflow after a short hint. We should compare the errors before adjusting the prototype copy.'],
  ], [
    ['November studio day', 'The full studio meets on Thursday. Bring any loaner equipment that needs maintenance and add dietary requirements by Tuesday.'],
    ['Updated visitor process', 'Reception has a printed guest list and temporary badges. The host should meet guests in the lobby and escort them upstairs.'],
    ['Ideas for the equipment cabinet', 'The spare adapters are difficult to find. Colored labels by connector type would make the shared cabinet easier to use.'],
    ['Catering headcount for Thursday', 'Can everyone check the count before the caterer confirms the order? A few people are joining only for the afternoon.'],
    ['Meeting room adapter replacement', 'The replacement has arrived and works at the usual display resolution. Ben will keep the spare cable in the room.'],
  ], [
    ['Alder & Finch launch kickoff', 'Both partnership teams have approved the rollout dates. Enablement comes first, followed by the joint announcement and landing page.'],
    ['Partner demo environment', 'The demo has the approved sample data and the new onboarding screens. Use the shared login during the training dry run.'],
    ['Joint announcement draft', 'The draft leads with the customer benefit and includes a quote from each team. Please leave wording changes before Friday.'],
    ['Who will own launch-day questions?', 'We need a named contact on both teams for the morning of release. Add your backup and preferred contact details to the launch plan.'],
    ['First enablement dry run notes', 'The deck is ready to share, and the demo took eleven minutes. Two pricing questions need written answers before the next session.'],
  ],
]

function seedBoards(projects, boards) {
  const messageCategories = []
  const messages = []
  boards.forEach((board, projectIndex) => {
    const project = projects[projectIndex]
    const key = project.id.slice(8)
    const categories = categoryFixtures.map(([name, emoji], position) => ({
      id: 'category-' + key + '-' + slug(name), boardId: board.id, name, emoji, position,
    }))
    messageCategories.push(...categories)
    for (const [index, [subject, copy]] of (boardFixtures[projectIndex] ?? []).entries()) {
      const createdById = project.memberIds[index % project.memberIds.length]
      const publishedAt = at(dateOn(4 + index), index % 2 ? '16:30' : '14:00')
      const pinned = projectIndex === 0 && index === 0
      messages.push({
        id: projectIndex === 0 && index === 1 ? 'message-launch-plan' : 'message-' + key + '-' + slug(subject),
        projectId: project.id, boardId: board.id, categoryId: index % 7 === 6 ? null : categories[index % 5].id,
        subject, bodyHtml: '<p>' + copy + '</p>',
        notifyRecipientIds: index % 3 === 0 ? project.memberIds.slice(0, 3) : [],
        status: 'active', publishedAt, pinnedAt: pinned ? publishedAt : null, pinnedById: pinned ? createdById : null,
        ...metadata(createdById, publishedAt),
      })
    }
  })

  const drafts = [
    [0, 'December launch notes for the studio', 'Add the last browser QA results before sending.', 'maya'],
    [0, 'Follow-up on pricing form validation', 'Waiting for the device comparison and screen reader notes.', 'jordan'],
    [1, 'Welcome packet handoff summary', 'Include the dates for the remaining training sessions.', 'ava'],
    [2, 'Ideas for the December newsletter', 'A note from the print shop would make a good opening.', 'leila'],
    [4, 'Research sprint follow-up', 'Confirm the consent wording before sharing the recording links.', 'maya'],
    [6, 'Partner enablement recap', 'The team still needs the updated pricing answers.', 'ana'],
  ]
  drafts.forEach(([projectIndex, subject, copy, author], index) => {
    const project = projects[projectIndex]
    const board = boards[projectIndex]
    messages.push({
      id: 'draft-' + slug(subject), projectId: project.id, boardId: board.id,
      categoryId: index % 2 ? null : 'category-' + project.id.slice(8) + '-update',
      subject, bodyHtml: '<p>' + copy + '</p>', notifyRecipientIds: [], status: 'draft',
      publishedAt: null, pinnedAt: null, pinnedById: null, ...metadata(personId(author), at(dateOn(13 + index))),
    })
  })
  return { messageCategories, messages }
}

const eventFixtures = [
  [
    ['Review the old site inventory', '10-27', '16:00', '17:00', 'Bring the exports from the article archive and redirects.'],
    ['Content freeze', '11-12', null, null, 'Only release-blocking copy updates during the freeze.', '11-14'],
    ['Relaunch design review', '11-16', '16:00', '16:45', 'Resolve the open questions from the tablet layouts.'],
    ['Release QA office hours', '11-17', '18:00', '19:00', 'Drop in to compare device results or share browser bugs.'],
    ['Browser coverage check-in', '11-18', '15:30', '16:00', 'Review the slow-network run and test coverage on mobile.'],
    ['Redirect map review', '11-18', '15:45', '16:30', 'Bring the top traffic paths and proposed destinations.'],
    ['Staging walkthrough', '11-19', '16:00', '16:45', 'Meet in Cedar and bring the device checklist.'],
    ['Help center handoff', '11-20', '20:00', '20:45', 'Share the list of new help links with customer support.'],
    ['Production rehearsal', '11-23', '17:00', '18:00', 'Practice the rollout and confirm the rollback contacts.'],
    ['Launch window', '12-02', null, null, 'Release updates and owners are on the Message Board.', '12-03'],
    ['Production health review', '12-04', '16:00', '16:30', 'Compare the first two days of launch metrics.'],
    ['Relaunch retrospective', '12-10', '20:00', '21:00', 'Bring one improvement for the next release.'],
  ], [
    ['Account onboarding check-in', '10-28', '17:00', '17:30', 'Review the current onboarding queue.'],
    ['Client materials review', '11-13', '15:30', '16:00', 'Check the invoice and training information.'],
    ['November onboarding workshop', '11-17', '19:00', '20:00', 'Walk through the welcome packet with the account team.'],
    ['Client kickoff window', '11-18', null, null, 'Keep these days clear for first meetings.', '11-20'],
    ['Support handoff', '11-24', '16:30', '17:00', 'Review ownership and escalation paths.'],
    ['First-month review', '12-08', '16:00', '16:45', 'Compare feedback from the November cohort.'],
  ], [
    ['Editorial production sync', '10-29', '18:00', '18:30', 'Confirm freelance assignments for November.'],
    ['December pitch review', '11-12', '17:00', '18:00', 'Bring an outline and estimated word count.'],
    ['Photo research day', '11-17', null, null, 'Collect images and check the rights notes.'],
    ['Newsletter copy review', '11-18', '20:00', '20:30', 'Review subject lines and short blurbs.'],
    ['Winter market deadline', '11-24', null, null, 'Send the market feature and captions to Imani.'],
    ['December slate kickoff', '12-03', '16:00', '17:00', 'Review the new publication dates.'],
  ], [
    ['Studio asset audit', '10-30', '16:00', '16:45', 'Clean up the current template folders together.'],
    ['Illustration brief review', '11-11', '18:00', '18:45', 'Confirm the required formats and dimensions.'],
    ['Production asset window', '11-16', null, null, 'Reserve time for export and print proof checks.', '11-19'],
    ['Organize the photo library', '11-18', '19:00', '20:30', 'Tag current images and reconcile outstanding credits.'],
    ['Print proof reviews', '11-24', '16:00', '16:30', 'Review proofs for the partner banner.'],
    ['December design planning', '12-04', '17:00', '17:45', 'Review incoming work and leave time for production.'],
  ], [
    ['Research scope review', '10-28', '17:00', '18:00', 'Agree on the study questions and recruiting criteria.'],
    ['Prototype interview rehearsal', '11-12', '20:00', '21:00', 'Run through the interview guide and task prompts.'],
    ['Participant interview block', '11-16', null, null, 'Hold time for the remote interview sessions.', '11-18'],
    ['Review recruiting progress', '11-18', '16:00', '16:30', 'Check for gaps in the participant roster.'],
    ['Evidence synthesis', '11-25', '17:30', '18:30', 'Bring notes and examples from each interview.'],
    ['Planning readout', '12-07', '18:00', '18:45', 'Share findings and recommended next steps.'],
  ], [
    ['New equipment delivery', '10-30', null, null, 'Meet the courier and verify the packing list.'],
    ['Catering check-in', '11-12', '17:30', '18:00', 'Confirm headcount and dietary requirements.'],
    ['Studio day setup', '11-17', '21:00', '22:00', 'Update signs and put out guest badges.'],
    ['November studio day', '11-19', null, null, 'Join the rest of the studio in person.'],
    ['Facilities review', '11-24', '18:00', '18:45', 'Review meeting room equipment with IT.'],
    ['Winter vendor review', '12-09', '16:00', '17:00', 'Bring the renewal dates and courier schedule.'],
  ], [
    ['Alder & Finch planning call', '10-27', '18:00', '19:00', 'Confirm owners and key dates for the rollout.'],
    ['Announcement copy review', '11-12', '17:00', '17:45', 'Review the partner quote and the headline.'],
    ['Partner enablement dry run', '11-17', '20:00', '21:00', 'Bring the training deck and demo checklist.'],
    ['Joint asset delivery', '11-20', null, null, 'Send approved launch files to both teams.'],
    ['Partner release window', '11-23', null, null, 'Monitor the new partner page together.', '11-25'],
    ['Launch follow-up call', '12-01', '17:00', '17:30', 'Compare launch questions and first-week results.'],
  ],
]

function seedEvents(projects, schedules) {
  return projects.flatMap((project, projectIndex) =>
    (eventFixtures[projectIndex] ?? []).map(([title, day, startTime, endTime, notes, endDay], index) => {
      const startsOn = '2026-' + day
      const endsOn = endDay ? '2026-' + endDay : startsOn
      const allDay = !startTime
      const participants = project.memberIds
      const example = projectIndex === 0 && title === 'Staging walkthrough'
      const author = example ? participants[0] : participants[index % participants.length]
      return {
        id: example ? 'event-staging-walkthrough' : 'event-' + project.id.slice(8) + '-' + slug(title),
        projectId: project.id, scheduleId: schedules[projectIndex].id, title, notes,
        joinUrl: index % 5 === 2 && !allDay ? 'https://meet.northstar.example/' + slug(title) : null,
        participantIds: index % 6 === 1 ? [] : [author, participants[(index + 1) % participants.length]],
        allDay, startsOn, endsOn, startsAt: allDay ? null : at(startsOn, startTime),
        endsAt: allDay ? null : at(endsOn, endTime),
        timeZone: workspace.timeZone, status: 'active', ...metadata(author, winter),
      }
    }))
}

const boardReplies = [
  'I added a link to the supporting notes in the project list.',
  'Could we cover this in the next check-in? I have two follow-up questions.',
  'The team reviewed this today and is aligned with the proposed timing.',
  'I can own the follow-up. Please send any outstanding details before Thursday.',
  'I updated the handoff notes to include the decision from this thread.',
  'Thanks for the update. The dates now match the project calendar.',
  'I am available to do a second pass if anything is still open.',
  'This is ready from my side. I will bring the final notes to the review.',
]
const taskReplies = [
  'I finished the first pass and will check the remaining details tomorrow.',
  'Please include the results in the next project check-in.',
  'I have the supporting materials. Let me know if you need a second reviewer.',
  'The owner and due date are current. I checked them this morning.',
  'I can take this after the review slot if the timing still works.',
  'The handoff is ready whenever you are able to take a look.',
]

function seedComments(projects, messages, todos) {
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  function reply(parent, type, index, copy, id) {
    const project = projectsById.get(parent.projectId)
    const start = project.memberIds.indexOf(parent.createdById)
    const author = project.memberIds[(start + index + 1) % project.memberIds.length]
    const createdAt = new Date(Date.parse(parent.createdAt) + (25 + index * 4) * 3600000).toISOString()
    return {
      id: id ?? 'comment-' + parent.id + '-' + (index + 1), projectId: parent.projectId, parentId: parent.id,
      parentType: type, bodyHtml: '<p>' + copy + '</p>', status: 'active', ...metadata(author, createdAt),
    }
  }
  const threaded = messages.filter((message, index) => message.status === 'active' && index % 4 !== 3)
  const boardComments = threaded.flatMap((message, index) =>
    Array.from({ length: [4, 0, 2, 2, 2, 2][index % 6] }, (_, offset) =>
      reply(message, 'message', offset, boardReplies[(index * 3 + offset) % boardReplies.length])))
  const launchPlan = messages.find((message) => message.id === 'message-launch-plan')
  boardComments[boardComments.length - 1] = reply(launchPlan, 'message', 0,
    'The device checklist is ready for the walkthrough.', 'comment-release-device')
  const taskComments = todos.filter((_, index) => index % 4 === 1).map((todo, index) =>
    reply(todo, 'todo', 0, taskReplies[index % taskReplies.length]))
  return [...boardComments, ...taskComments]
}
