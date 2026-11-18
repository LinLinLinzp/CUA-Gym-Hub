import { samples } from './media.js'

const people = [
  ['maya', 'Maya Chen', 'MC', 'orchid'],
  ['jules', 'Jules Rivera', 'JR', 'mint'],
  ['amina', 'Amina Foster', 'AF', 'peach'],
  ['leo', 'Leo Brooks', 'LB', 'sky'],
  ['nina', 'Nina Park', 'NP', 'rose'],
  ['sam', 'Sam Patel', 'SP', 'slate'],
  ['iris', 'Iris Morgan', 'IM', 'mint'],
  ['eli', 'Eli Walker', 'EW', 'peach'],
]

const folderNames = [
  'Product Reviews', 'Design Critiques', 'Customer Enablement', 'Launch Operations',
  'Engineering Handoffs', 'Team Onboarding', 'Research Sessions', 'Finance & Planning',
  'Support Playbooks', 'Brand Studio', 'Platform Reliability', 'Partner Demos',
  'Quarterly Readouts', 'Editorial Calendar', 'Data Lab', 'Mobile Experience',
  'Sales Resources', 'Accessibility Reviews', 'Recruiting', 'Studio Operations',
  'Security Training', 'Documentation', 'Workshop Recordings', 'Spring Pilot',
]

const recordings = [
  ['Release readiness walkthrough', 'Review the rollout checklist, final QA notes, and Tuesday handoffs.', 'release-board'],
  ['Sprint 14 demo', 'Walk through the new dashboard filters and keyboard shortcuts.', 'sprint-notes'],
  ['October metrics recap', 'Highlights from the activation funnel and the first cohort retention report.', 'insights-report'],
  ['Billing handoff', 'Review the open billing cases and update the escalation notes before Friday.', 'support-queue'],
  ['Navigation design critique', 'Compare two directions for grouping workspace controls and account settings.', 'design-review'],
  ['New teammate welcome guide', 'Set up your studio tools and meet the people who can help in your first week.', 'onboarding-guide'],
  ['Launch QA walkthrough', 'Revisit the release gate and confirm the remaining device checks.', 'release-board'],
  ['Search relevance review', 'Compare the query results for common onboarding terms.', 'insights-report'],
  ['October support patterns', 'Three common tickets to turn into help center articles.', 'support-queue'],
  ['Weekly studio handoff', 'Share the current work in progress before the Monday review.', 'sprint-notes'],
  ['Homepage motion studies', 'Review the pacing of the entrance and empty-state transitions.', 'design-review'],
  ['Quarter close checklist', 'Confirm handoff dates and supporting documents for Finance.', 'onboarding-guide'],
  ['Product review agenda', 'Preview the agenda and owners for the next roadmap review.', 'release-board'],
  ['Design tokens sync', 'Introduce new contrast-safe secondary colors and spacing aliases.', 'design-review'],
  ['Customer rollout overview', 'Use the rollout guide to prepare a customer workspace for launch.', 'onboarding-guide'],
  ['Launch communication plan', 'Agree on who publishes release notes and when support gets the briefing.', 'release-board'],
  ['API pagination demo', 'Inspect the new cursor responses using the staging examples.', 'sprint-notes'],
  ['First week in Northstar', 'Find your buddy, book intro calls, and submit setup questions.', 'onboarding-guide'],
  ['Interview synthesis session', 'Review the five recurring themes from recent workspace interviews.', 'insights-report'],
  ['Budget review notes', 'Summarize forecast changes and flag the requests pending approval.', 'insights-report'],
  ['Escalation queue tour', 'Route incoming issues by severity and region.', 'support-queue'],
  ['Illustration review', 'Review the sketch set for the November editorial package.', 'design-review'],
  ['Incident review checklist', 'Check that the draft incident summary captures causes and follow-ups.', 'support-queue'],
  ['Partner sandbox demo', 'Set up a partner space and walk through a sample account.', 'sprint-notes'],
  ['Q4 planning overview', 'Read through the quarterly goals, owners, and reporting dates.', 'release-board'],
  ['December publishing calendar', 'Check the ownership and due dates for December content.', 'release-board'],
  ['Retention dashboard notes', 'Interpret the new returning-user breakdown and open questions.', 'insights-report'],
  ['Mobile capture feedback', 'Review the revised flow for capturing a short mobile demo.', 'design-review'],
  ['Discovery call prep', 'Set up the discovery deck with relevant workspace examples.', 'onboarding-guide'],
  ['Keyboard patterns review', 'Walk through visible focus, menus, and playback controls.', 'design-review'],
  ['Portfolio review prep', 'Prepare the candidate packet and share the reviewer schedule.', 'onboarding-guide'],
  ['Equipment request process', 'Choose the right request type and the next approver.', 'support-queue'],
  ['Account recovery training', 'Review the account recovery process and audit fields.', 'onboarding-guide'],
  ['API glossary walkthrough', 'Align the terminology used across the getting-started guides.', 'sprint-notes'],
  ['Navigation workshop replay', 'Review the grouping exercises and the final proposed navigation.', 'design-review'],
  ['Spring pilot kickoff', 'Introduce the pilot checklist and first-week success measures.', 'release-board'],
  ['Support macro cleanup', 'Compare revised templates for refund and billing questions.', 'support-queue'],
  ['Workspace access review', 'Review permission requests and the proposed reminder schedule.', 'sprint-notes'],
  ['April onboarding checklist', 'Walk through the updated reading list and mentor check-ins.', 'onboarding-guide'],
  ['Export usability findings', 'Review issues participants hit when exporting their first report.', 'insights-report'],
  ['Project intake revision', 'Compare the simplified intake template with examples from prior projects.', 'release-board'],
  ['New empty-state illustrations', 'Review the poses and color ratios across the artwork set.', 'design-review'],
  ['Quarterly report rehearsal', 'Review the data labels and speaker notes before presenting.', 'insights-report'],
  ['Spring pilot feedback', 'Review feedback on onboarding friction and recording organization.', 'support-queue'],
  ['Spring pilot exit survey', 'Walk through the survey results for the final pilot cohort.', 'insights-report'],
  ['July dashboard prototype', 'Compare the exploratory dashboard widgets from the July prototype.', 'design-review'],
  ['Retired support automation', 'Archive the old automation flow and the list of retired templates.', 'support-queue'],
  ['Legacy pilot onboarding', 'Review the original pilot instructions for historical reference.', 'onboarding-guide'],
]

const discussion = [
  ['I added the Tuesday handoff notes to the checklist.', 'Thanks, I will cover the mobile checks before then.', 'Can we keep the sign-off in the same document?'],
  ['The keyboard shortcut here will save our team a lot of time.', 'I will add it to the release notes.', 'Can the filter selection persist when we return?'],
  ['Could you share the definition used for an activated workspace?', 'It counts the first completed upload.', 'This cohort looks stronger than the September group.'],
  ['The renewal cases should go to Finance after the first review.', 'I will update the assignment rule.', 'Is there an example ticket for the exception?'],
  ['The shorter label reads well at narrow widths.', 'Agreed. I updated the draft this morning.', 'Can we check the selected tab contrast too?'],
  ['The setup steps match what I saw in my first week.', 'I added the calendar invites to the guide.', 'We should link the recording in the welcome email.'],
  ['I ran this on the older Android device as well.', 'Please add the screenshot to the QA notes.', 'The network retry still needs a check.'],
  ['The support phrasing returns better matches now.', 'I will add that to the query examples.', 'Could we include a misspelling case?'],
  ['Password resets are showing up most often this month.', 'I can draft that article on Thursday.', 'Let us link this from the support playbook.'],
  ['The handoff notes cover everything I was waiting on.', 'I will post the recap in tomorrow’s notes.', 'Could we tag the new owners in the checklist?'],
  ['The gentler entrance feels right for the homepage.', 'I will preserve that timing in the next draft.', 'Please include a reduced motion option.'],
  ['The supporting documents are now ready for review.', 'Thanks, I will confirm the due date with Finance.', 'I added a question to the forecast sheet.'],
]

const id = (prefix, number) => prefix + '-' + String(number).padStart(3, '0')
const fixedTime = (offset) => new Date(Date.UTC(2026, 10, 16, 16) - offset * 22 * 3600000).toISOString()
const owner = (index) => 'user-' + people[index % people.length][0]
const folderForVideo = [
  ...Array(12).fill(null), 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  null, 20, null, 22, 23, 24, 9, 5, 6, 7, 4, 10, 13, 24, 24, null, null, 24,
]

export function createInitialData() {
  return {
    account: { workspaceName: 'Northstar Studio', currentUserId: 'user-maya' },
    users: people.map(([key, name, initials, colorKey]) => ({ id: 'user-' + key, name, initials, colorKey })),
    folders: folderNames.map((name, index) => ({
      id: id('folder', index + 1), name, ownerId: owner(0), status: index === 23 ? 'archived' : 'active',
      createdAt: fixedTime(30 + index), updatedAt: fixedTime(12 + index), updatedBy: owner(0),
      ...(index === 23 ? { archivedAt: fixedTime(12) } : {}),
    })),
    videos: recordings.map(([title, description, sampleKey], index) => ({
      id: id('video', index + 1), title, description, ownerId: owner(index),
      folderId: folderForVideo[index] ? id('folder', folderForVideo[index]) : null,
      sampleKey, durationSeconds: samples[sampleKey].duration, tags: [sampleKey.split('-')[0]],
      status: index >= 45 ? 'archived' : 'active', createdAt: fixedTime(index + 2),
      updatedAt: fixedTime(index), updatedBy: owner(index),
      ...(index >= 45 ? { archivedAt: fixedTime(5 + index - 45) } : {}),
    })),
    comments: Array.from({ length: 72 }, (_, index) => {
      const videoIndex = Math.floor(index / 3)
      const entry = index % 3
      const author = owner(videoIndex + entry * (videoIndex % 2 ? 7 : 1))
      return {
        id: id('comment', index + 1),
        videoId: id('video', videoIndex + 1),
        parentId: entry === 1 ? id('comment', index) : null,
        authorId: author,
        body: discussion[videoIndex % discussion.length][entry],
        timestampSeconds: entry === 0 ? videoIndex * 3 % 34 : null,
        status: 'active', createdAt: fixedTime(videoIndex), updatedAt: fixedTime(videoIndex), updatedBy: author,
      }
    }),
  }
}
