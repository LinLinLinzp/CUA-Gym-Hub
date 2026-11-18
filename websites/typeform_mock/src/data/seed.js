const account = {
  id: 'user_morgan', name: 'Morgan Ellis', email: 'morgan@rowanstudio.example', organization: 'Rowan Studio',
}

const groups = [
  ['research', 'Customer Research', [
    ['onboarding', 'Customer onboarding check-in', 'Where are you in setup?', 'What is blocking your setup?', 'How easy has setup been so far?'],
    ['interviews', 'Customer interview intake', 'Do you have time for a 30-minute interview?', 'What should we cover in the interview?', 'What email should we use to follow up?'],
    ['routines', 'Weekly workflow diary', 'How many times did you use the dashboard this week?', 'What brought you to the dashboard?', 'What would make the dashboard more useful?'],
    ['testing', 'Usability testing screener', 'Which testing format suits you?', 'What accessibility needs should we plan for?', 'Which time zone are you in?'],
    ['support', 'Support follow-up', 'Did the support team resolve your issue?', 'What remains unresolved?', 'How would you rate the help you received?'],
    ['quarterly', 'Quarterly customer pulse', 'Which best describes your experience?', 'What should we prioritize next quarter?', 'How likely are you to renew?'],
    ['handoff', 'Implementation handoff', 'Is your implementation ready to hand over?', 'Which handoff tasks are still open?', 'Who should own the handoff?'],
    ['feedback', 'Product feedback collection', 'What is your feedback about?', 'What would you change?', 'What email can we use to contact you?'],
  ]],
  ['people', 'People Operations', [
    ['orientation', 'New starter orientation', 'Did orientation answer your questions?', 'What could we cover next time?', 'How useful was the session?'],
    ['offsite', 'Team offsite preferences', 'Which offsite format would you attend?', 'Do you have any access or dietary needs?', 'What city would you travel from?'],
    ['learning', 'Learning budget requests', 'How much funding are you requesting?', 'What would the funding cover?', 'What is your work email?'],
    ['survey', 'Ways of working survey', 'Would you prefer more meeting-free time?', 'Where would you make room for it?', 'What is the ideal number of meeting-free hours?'],
    ['manager', 'Manager workshop feedback', 'Which session was most relevant?', 'What should we revise?', 'What will you try with your team?'],
    ['equipment', 'Equipment request', 'Do you need equipment shipped?', 'What equipment do you need?', 'Who can confirm delivery details?'],
  ]],
  ['product', 'Product Operations', [
    ['beta', 'Beta access request', 'Which product area are you interested in?', 'What would you like to test?', 'Where should we send the invitation?'],
    ['release', 'Release readiness review', 'Is the release ready for sign-off?', 'Which risks are open?', 'How many teams need a briefing?'],
    ['documentation', 'Documentation gap report', 'Where did you look for help?', 'What were you unable to find?', 'Which feature were you using?'],
    ['quality', 'Quality review intake', 'How many users are affected?', 'What behavior did you observe?', 'Who should we contact for more details?'],
    ['roadmap', 'Roadmap proposal intake', 'Is the proposed change time sensitive?', 'What problem does it solve?', 'What product area does it affect?'],
    ['pilots', 'Pilot retrospective', 'Which stage needs the most attention?', 'What should we change for the next pilot?', 'How many customers took part?'],
  ]],
  ['marketing', 'Marketing', [
    ['newsletter', 'Newsletter reader survey', 'Which topic interests you most?', 'What should we cover more often?', 'How often would you like to hear from us?'],
    ['stories', 'Customer story nominations', 'Can we contact this customer?', 'What is the story behind the nomination?', 'What is the customer contact email?'],
    ['campaign', 'Campaign creative brief', 'Which channel is the priority?', 'What should this campaign communicate?', 'What is the campaign name?'],
    ['partners', 'Partner inquiry', 'Do you have a collaboration in mind?', 'What would you like to do together?', 'What is your email?'],
    ['content', 'Content planning requests', 'Which audience should we focus on?', 'What is the proposed topic?', 'When would the content be useful?'],
  ]],
  ['events', 'Events', [
    ['rsvp', 'Design roundtable RSVP', 'Will you join the roundtable?', 'What topic would you like to discuss?', 'Where should we send the invite?'],
    ['webinar', 'Webinar feedback', 'How helpful was the webinar?', 'Which part needs more explanation?', 'What topic should come next?'],
    ['speakers', 'Speaker proposal intake', 'Which session style would you prefer?', 'What is the main takeaway of your talk?', 'What is your speaker email?'],
    ['volunteers', 'Volunteer registration', 'Can you attend the volunteer briefing?', 'What work would you like to help with?', 'What is your preferred shift?'],
    ['venue', 'Venue accessibility check', 'Which area should we review?', 'What barriers did you encounter?', 'How many people were affected?'],
  ]],
  ['archive', 'Archive', []],
]

export function createInitialData() {
  const workspaces = groups.map(([id, name]) => ({ id: 'ws_' + id, name }))
  const forms = []
  const responses = []
  const responseExports = []
  const activity = []
  for (const [workspace, , entries] of groups) {
    entries.forEach(([slug, title, first, second, third], index) => {
      const n = forms.length
      const createdAt = new Date(Date.UTC(2026, 6, 2 + n, 14)).toISOString()
      const updatedAt = new Date(Date.UTC(2026, 9, 29 - n, 16)).toISOString()
      const status = index % 4 === 1 ? 'draft' : index % 4 === 2 ? 'closed' : 'published'
      const formId = 'form_' + slug
      const onboarding = slug === 'onboarding'
      const firstType = /^(Do|Did|Is|Would|Can|Will) /.test(first) ? 'yes_no' :
        /^How (many|much|helpful) /.test(first) ? 'number' : 'multiple_choice'
      const finalType = /\bemail\b|^Where should/.test(third) ? 'email' :
        /^(How (easy|useful|likely|many|would you rate)|What is the ideal number)/.test(third) ? 'number' : 'short_text'
      const labels = ({
        onboarding: ['I need help', 'I am on track', 'I finished setup'],
        testing: ['Remote session', 'In-person session', 'Written feedback'],
        quarterly: ['Still getting started', 'In regular use', 'Evaluating renewal'],
        feedback: ['Reporting', 'Collaboration', 'Workspace settings'],
        offsite: ['Full-day workshop', 'Half-day retreat', 'Virtual session'],
        manager: ['Coaching', 'Delegation', 'Giving feedback'],
        beta: ['Reporting', 'Collaboration', 'Account settings'],
        documentation: ['Help center', 'In-app guidance', 'Team handbook'],
        pilots: ['Recruitment', 'Onboarding', 'Evaluation'],
        newsletter: ['Product news', 'Practical guides', 'Customer stories'],
        campaign: ['Email', 'Social media', 'Website'],
        content: ['New customers', 'Current customers', 'Partners'],
        speakers: ['Lightning talk', 'Panel discussion', 'Hands-on workshop'],
        venue: ['Entrance and arrival', 'Meeting rooms', 'Restrooms'],
      })[slug] || []
      const choices = firstType === 'multiple_choice' ? labels.map((label, i) => ({
        id: onboarding ? ['c_need_help', 'c_on_track', 'c_finished'][i] : 'c_' + slug + '_' + (i + 1), label,
      })) : []
      const questions = [
        { id: 'q_' + slug + '_track', title: first, description: onboarding ? 'Choose the answer that best fits where you are today.' : '', type: firstType, required: true, choices },
        { id: 'q_' + slug + '_blocker', title: second, description: '', type: 'long_text', required: true, choices: [] },
        { id: 'q_' + slug + '_followup', title: third, description: onboarding ? 'Use a scale from 1 to 10.' : '', type: finalType, required: false, choices: [] },
      ]
      const endings = [{ id: onboarding ? 'end_thanks' : 'end_' + slug, title: 'Thanks for sharing', description: onboarding ? 'Your feedback helps us improve onboarding.' : 'Your response has been recorded.' }]
      const logic = [
        { id: 'lr_' + slug + '_help', sourceQuestionId: questions[0].id,
          condition: { questionId: questions[0].id, operator: firstType === 'number' ? 'less_than' : 'equals',
            value: firstType === 'number' ? 5 : firstType === 'yes_no' ? false : choices[0].id },
          destination: { type: 'question', id: questions[1].id } },
        { id: 'lr_' + slug + '_fallback', sourceQuestionId: questions[0].id, condition: null,
          destination: { type: 'question', id: questions[2].id } },
      ]
      const published = status !== 'draft'
      forms.push({
        id: formId, workspaceId: 'ws_' + workspace, title, status, questions, endings, logic,
        createdBy: account.id, updatedBy: account.id, createdAt, updatedAt,
        publishedAt: published ? createdAt : null, publishedVersion: published ? 1 : 0,
        publishedSnapshot: published ? { title, questions, endings, logic } : null,
      })
      if (!published) return
      activity.push({ id: 'activity_' + slug, action: status === 'closed' ? 'form_closed' : 'form_published', formId, actorId: account.id, createdAt: updatedAt })
      if (index >= 4) return
      const notes = onboarding ? [
        'The verification email arrived after the setup link had already expired.',
        'Our billing contact and account owner are different people.',
        'I could not tell which permissions an editor needs before inviting the team.',
        'Importing our existing projects stalled after the first batch.',
        'The workspace invitation was sent to my old address.',
      ] : ['I would appreciate a follow-up with the next steps.', 'A short checklist would help my team prepare.', 'I have a scheduling conflict and would welcome another option.']
      const followups = ({
        routines: ['A filter for completed projects', 'A weekly activity digest', 'Faster export for team reports'],
        testing: ['Eastern time', 'Pacific time', 'Central European time'],
        documentation: ['Managing workspace roles', 'Sharing reports', 'Setting up notifications'],
        newsletter: ['Every two weeks', 'Once a month', 'Once a quarter'],
        campaign: ['Spring field notes', 'Studio in focus', 'Better together'],
        content: ['Before the next release', 'Early next quarter', 'During onboarding'],
        webinar: ['Reporting shortcuts', 'How to set up a workspace', 'A customer Q&A'],
      })[slug] || ['Happy to discuss during a follow-up.', 'I will coordinate with our team.', 'Please share the next steps.']
      const count = onboarding ? 26 : 5
      for (let i = 0; i < count; i++) {
        const choice = choices[i % choices.length]
        const firstValue = choice?.id ?? (firstType === 'number' ? i + 2 : i % 2 !== 0)
        const matches = firstType === 'number' ? firstValue < 5 : firstType === 'yes_no' ? !firstValue : choice === choices[0]
        const answers = [{ questionId: questions[0].id, questionTitle: first, type: firstType, value: firstValue, ...(choice ? { choiceLabel: choice.label } : {}) }]
        if (matches) answers.push({ questionId: questions[1].id, questionTitle: second, type: 'long_text', value: notes[i % notes.length] })
        if (i % 7 !== 6) answers.push({ questionId: questions[2].id, questionTitle: third, type: finalType,
          value: finalType === 'number' ? 4 + (i % 7) : finalType === 'email' ? 'reader.' + (i + 1) + '@fieldwork.example' : followups[i % followups.length] })
        responses.push({
          id: 'response_' + slug + '_' + String(i + 1).padStart(3, '0'), formId, formVersion: 1,
          endingId: endings[0].id, actorId: 'respondent_' + slug + '_' + (i + 1), status: 'completed', answers,
          createdAt: new Date(Date.UTC(2026, 9, i + 1, 9 + (n % 8), (i * 13) % 60)).toISOString(),
        })
      }
      if (responseExports.length < 4) responseExports.push({
        id: 'export_' + slug, formId, actorId: account.id, format: 'csv',
        responseIds: ['response_' + slug + '_001'], createdAt: updatedAt,
      })
    })
  }
  return { account: { ...account }, workspaces, forms, responses, responseExports, activity }
}
