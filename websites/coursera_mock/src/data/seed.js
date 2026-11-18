const groups = [
  ['Museum Studies', 'museum', 'Juniper School of Museum Practice', [
    'Making Meaning in Museums', 'Designing a Gallery Trail', 'Care for Paper Collections', 'A Guide to Exhibition Labels',
    'Museums and Community Memory', 'Collecting Everyday Objects', 'Planning an Accessible Exhibition', 'Collections in Conversation',
  ]],
  ['Film', 'film', 'Lantern Film Workshop', [
    'Reading a Film Scene', 'Editing for Continuity', 'Sound and Silence in Cinema', 'The Art of the Opening Shot',
    'Lighting for Documentary', 'Tracing the Visual Essay', 'Classic Film Genres', 'Framing Short Documentaries',
  ]],
  ['Public History', 'archive', 'Alder Institute for Public History', [
    'Inside the Community Archive', 'Mapping a Neighborhood’s Past', 'Preserving Family Photographs', 'Making an Oral History Record',
    'Reading Old Street Plans', 'Community History on Display', 'The Life of a Local Newspaper', 'Telling History in Public',
  ]],
  ['Storytelling', 'story', 'Fieldnote School of Narrative', [
    'Stories in Everyday Objects', 'Writing with Place and Memory', 'Interviewing for a Narrative', 'Building a Story from Fragments',
    'The Craft of the Audio Essay', 'Writing a Scene from Memory', 'Editing Personal Narratives', 'Stories Across Generations',
  ]],
  ['Design', 'design', 'Hearthline Design School', [
    'Designing with Type and Space', 'Understanding Visual Hierarchy', 'Design for Wayfinding', 'An Introduction to Editorial Design',
    'Making a Color System', 'Designing an Accessible Poster', 'Patterns in Public Space', 'Reading an Illustrated Page',
  ]],
  ['Cultural History', 'history', 'Stonebridge Cultural Institute', [
    'Reading the City Through Signs', 'The Social Life of Clothing', 'Traditions at the Shared Table', 'A History of Public Squares',
    'Everyday Rituals and Their Meanings', 'Travel Writing as Evidence', 'Materials and Memory', 'The Cultural History of Markets',
  ]],
  ['Photography', 'photo', 'Stillwater Center for Photography', [
    'Looking Closely at Photographs', 'Sequencing a Photo Essay', 'Portraits and Their Context', 'Reading the Photographic Contact Sheet',
    'Photographing a Changing Place', 'Light in Everyday Photography', 'Working with a Family Album', 'Photographs in the Exhibition',
  ]],
  ['Material Culture', 'material', 'North Quay School of Cultural Studies', [
    'Ceramics and the Everyday', 'Reading a Woven Object', 'The Evidence of Repair', 'Household Objects and Migration',
    'Tools and the History of Work', 'The Culture of Handmade Books', 'Materials in a Public Collection', 'The Biography of an Object',
  ]],
]

const specialIds = ['museum-meaning', 'film-scene', 'archive']
const specialLessons = ['Read an exhibition label', 'Follow a cut', 'Read an object label']
const specialAssignments = ['Exhibition interpretation', 'Scene analysis', 'Cataloging basics']
const specialReadings = [
  [
    'Imagine a small brass cup in a gallery case. The label gives its measurements, names a maker and calls it ceremonial. Those three details make different claims. You can measure the cup, consult a record to check the name, and look for an account of the cup in use to understand the ceremony.',
    'A strong label gives visitors enough evidence to take the first step themselves. Place the claim next to a detail they can see or a source the museum can name. Leave room for a second interpretation if the material supports more than one.',
    'Choose one sentence from an exhibition label you remember. Rewrite it so that a visitor can tell what is documented and what the curator inferred.',
  ],
  [
    'Imagine a character looking past the camera before the film cuts to a key on a desk. Even without dialogue, the order of those shots invites you to connect the glance and the key. The film can later confirm that connection or show that the character was looking somewhere else.',
    'Watch a short sequence twice. On the first pass, record what happens in the story. On the second, make a list of the shots, noting what enters or leaves the frame, where the cuts occur, and which sounds continue across them.',
    'Compare your two notes. Choose one inference about the scene and explain which cut, sound, or change of framing led you to make it.',
  ],
  [
    'A volunteer brings a photograph to a neighborhood archive. The front shows a crowded sidewalk. On the back someone wrote “market opening,” but there is no year. Start the description with the visible details and transcribe the handwritten note as it appears.',
    'Record who supplied the photograph and what they know about its previous owners in the provenance field. Use the display location field for the current shelf or case. These records serve different purposes when the photograph moves.',
    'Ask whether the donor can identify the street or people in the frame. If a date is uncertain, leave it open and note what might help confirm it, such as a shop sign in a local directory.',
  ],
]
const observationPrompts = [
  'A label describes a cup as ceremonial. Which evidence best supports that interpretation?',
  'A scene moves from a character’s glance to a close-up of a key. What should you note first?',
  'Where should the source of an object be recorded?',
  'What makes a remembered detail useful evidence in an interview?',
  'Which observation best supports an analysis of visual hierarchy?',
  'Which evidence best supports a claim about how a public space was used?',
  'What should you document before interpreting a photograph?',
  'What detail best supports a claim that an object was repaired?',
]
const answerPairs = [
  ['A documented account of the cup in use', 'The color of its display case'],
  ['The order of the shots and what each shows', 'The name of the streaming service'],
  ['Provenance field', 'Display location'],
  ['The speaker’s account and its context', 'The length of the interview file'],
  ['How size and placement guide the reader', 'The name of the file format'],
  ['Descriptions from people who used the space', 'The color of the current map'],
  ['Visible details and known context', 'An assumed intention of the photographer'],
  ['A visible join with supporting documentation', 'The current shelf number'],
]
const learnerId = 'learner-001'
const displayName = 'Maya Chen'
const date = (day) => `2026-11-${String(day).padStart(2, '0')}T15:00:00.000Z`

export function createInitialData() {
  const state = {
    learner: { id: learnerId, displayName },
    courses: [], lessons: [], assignments: [], enrollments: [],
    lessonCompletions: [], assignmentAttempts: [], certificates: [], certificateActions: [],
  }

  for (const [groupIndex, [topic, artworkKey, issuerName, titles]] of groups.entries()) {
    for (const [index, title] of titles.entries()) {
      const number = groupIndex * 8 + index + 1
      const isSpecial = index === 0 && groupIndex < specialIds.length
      const slug = isSpecial ? specialIds[groupIndex] : `${artworkKey}-${index + 1}`
      const id = `course-${slug}`
      const lessonIds = []
      const lessonCount = index >= 4 ? 2 : 1
      for (let lesson = 1; lesson <= lessonCount; lesson++) {
        const lessonId = `lesson-${slug}-0${lesson}`
        lessonIds.push(lessonId)
        state.lessons.push({
          id: lessonId, courseId: id, estimatedMinutes: 10 + lesson * 2,
          title: isSpecial ? specialLessons[groupIndex] : lesson === 1 ? `Field notes on ${title.toLowerCase()}` : 'Write an evidence note',
          paragraphs: isSpecial ? [...specialReadings[groupIndex]] : lesson === 1 ? [
            `Begin your study of ${title.toLowerCase()} with a single example. Record details another reader could find for themselves. Pay attention to sequence, material and the way the example was presented to you.`,
            `Consider this case. ${observationPrompts[groupIndex]} A useful starting point is ${answerPairs[groupIndex][0].toLowerCase()}. Write down where that evidence comes from and what it lets you conclude.`,
            'Make two notes before moving on. In the first, describe one detail you can point to. In the second, explain what the detail suggests and identify a question you would still need to investigate.',
          ] : [
            'Choose a detail from the first reading and write a short note about it. Include enough context for someone who has never seen the source to understand what you noticed.',
            'Read the note out loud. Check that each claim can be traced to a detail or a named source. If you find an assumption, turn it into a question for further research.',
          ],
        })
      }
      const assignmentId = `assignment-${slug}-01`
      const correctId = groupIndex === 2 ? 'opt-provenance' : 'opt-evidence'
      const incorrectId = groupIndex === 2 ? 'opt-display' : 'opt-assumption'
      const questions = [
        { id: `q-${slug}-01`, prompt: observationPrompts[groupIndex], correctOptionId: correctId,
          options: [{ id: correctId, label: answerPairs[groupIndex][0] }, { id: incorrectId, label: answerPairs[groupIndex][1] }] },
        { id: `q-${slug}-02`, prompt: 'How should you handle a claim the available evidence cannot settle?', correctOptionId: 'opt-open',
          options: [{ id: 'opt-certain', label: 'State the claim as settled' }, { id: 'opt-open', label: 'Describe the uncertainty and name a source to check' }] },
      ]
      state.assignments.push({
        id: assignmentId, courseId: id, title: isSpecial ? specialAssignments[groupIndex] : `${title} checkpoint`,
        instructions: 'Select one answer per question. Use details from the reading to guide your choices.',
        estimatedMinutes: 8, type: 'quiz', passingPercent: 75,
        dueAt: id === 'course-archive' ? '2026-11-24T17:00:00.000Z' : null, questions,
      })
      const certificateEligible = index !== 3 || groupIndex < 4
      const course = {
        id, title, topic, issuerName, artworkKey, certificateEligible,
        level: index < 3 ? 'Beginner' : index < 6 ? 'Intermediate' : 'Advanced',
        estimatedMinutes: 90 + (number % 7) * 30,
        description: `Study ${title.toLowerCase()} through an original reading, an annotated example and a short assessment. Practice turning close observations into interpretations you can support with evidence.`,
        modules: [{ id: `module-${slug}-01`, title: isSpecial && groupIndex === 2 ? 'Reading the collection' : 'Observation and interpretation', lessonIds, assignmentIds: [assignmentId] }],
      }
      state.courses.push(course)

      // Completed courses favor two-reading outlines so the account has a substantial study history.
      const historyRank = [4, 5, 6, 7].includes(index) ? groupIndex * 4 + index - 4 : 32 + groupIndex * 4 + index
      const completed = historyRank < 24
      const activeSlugs = ['museum-meaning', 'archive', 'story-2', 'design-2', 'history-2', 'photo-2', 'material-2', 'museum-2']
      const withdrawnSlugs = ['film-2', 'story-3', 'photo-3', 'museum-3']
      const status = completed ? 'completed' : activeSlugs.includes(slug) ? 'in_progress' : withdrawnSlugs.includes(slug) ? 'withdrawn' : null
      if (!status) continue

      const ready = slug === 'museum-meaning'
      const passed = completed || ready
      const completedLessons = passed ? lessonIds : lessonIds.slice(0, 1)
      const completionDay = 11 + historyRank % 7
      const enrollment = {
        id: `enrollment-${slug}`, learnerId, courseId: id, status,
        progressPercent: Math.round(100 * (completedLessons.length + Number(passed)) / (lessonIds.length + 1)),
        createdAt: date(2), updatedAt: slug === 'archive' ? '2026-11-17T18:00:00.000Z' : date(completed ? completionDay : 9),
        completedAt: completed ? date(completionDay) : null, withdrawnAt: status === 'withdrawn' ? date(9) : null, reenrolledAt: null,
      }
      state.enrollments.push(enrollment)
      const links = { learnerId, enrollmentId: enrollment.id, courseId: id }
      for (const lessonId of completedLessons) {
        state.lessonCompletions.push({ id: `completion-${lessonId.slice(7)}`, ...links, lessonId, status: 'completed', createdAt: date(7) })
      }
      for (let attemptNumber = 1; attemptNumber <= (completed ? 2 : 1); attemptNumber++) {
        const pass = passed && (!completed || attemptNumber === 2)
        state.assignmentAttempts.push({
          id: `attempt-${slug}-${attemptNumber}`, ...links, assignmentId, attemptNumber,
          answers: questions.map(question => ({
            questionId: question.id,
            optionId: pass ? question.correctOptionId : question.options.find(option => option.id !== question.correctOptionId).id,
          })),
          scorePercent: pass ? 100 : 0, status: pass ? 'passed' : 'failed',
          createdAt: date(pass && completed ? 10 : 8),
        })
      }
      if (completed && certificateEligible) {
        state.certificates.push({
          id: `certificate-${slug}`, ...links, courseTitle: title, learnerName: displayName, issuerName,
          verificationCode: `CRS-${String(number).padStart(4, '0')}-R`, status: 'issued', createdAt: date(completionDay),
        })
      }
    }
  }
  return state
}
