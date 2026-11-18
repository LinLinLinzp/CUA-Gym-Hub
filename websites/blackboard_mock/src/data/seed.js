const instructor = { id: 'usr-instructor-01', name: 'Dr. Elena Morales', role: 'instructor' }
const baseline = '2026-08-24T13:00:00.000Z'
const terms = [
  { id: 'term-fall-2026', name: 'Fall 2026', startsOn: '2026-08-24', endsOn: '2026-12-18' },
  { id: 'term-summer-2026', name: 'Summer 2026', startsOn: '2026-05-26', endsOn: '2026-08-07' },
  { id: 'term-spring-2026', name: 'Spring 2026', startsOn: '2026-01-12', endsOn: '2026-05-08' },
]
const catalog = [
  ['ENV 210', 'Environmental Policy', 'Environmental Studies', 'environmental decision-making'],
  ['ART 225', 'Visual Culture', 'Art History', 'images and cultural interpretation'],
  ['BIO 312', 'Conservation Biology', 'Biology', 'biodiversity and habitat restoration'],
  ['COM 203', 'Public Speaking', 'Communication', 'argument and audience'],
  ['DES 242', 'Design Research', 'Design', 'field studies and interviews'],
  ['ECO 114', 'Principles of Economics', 'Economics', 'markets and economic tradeoffs'],
  ['ENG 245', 'Writing for Public Audiences', 'English', 'editorial judgment and revision'],
  ['GEO 221', 'Urban Geography', 'Geography', 'cities and spatial inequality'],
  ['HIS 270', 'Modern World History', 'History', 'historical evidence and interpretation'],
  ['MAT 180', 'Applied Statistics', 'Mathematics', 'data analysis and uncertainty'],
  ['PHI 220', 'Ethics and Society', 'Philosophy', 'moral arguments and public life'],
  ['SOC 226', 'Community and Social Change', 'Sociology', 'community organizing and social institutions'],
]
const names = [
  ['Amina', 'Patel'], ['Jordan', 'Brooks'], ['Maya', 'Chen'], ['Samir', 'Hassan'],
  ['Lucia', 'Vega'], ['Noah', 'Kim'], ['Nia', 'Johnson'], ['Mateo', 'Rivera'],
  ['Avery', 'Morgan'], ['Priya', 'Shah'], ['Eli', 'Foster'], ['Leila', 'Reed'],
  ['Sofia', 'Nguyen'], ['Gabriel', 'Santos'], ['Imani', 'James'], ['Owen', 'Bennett'],
  ['Isabel', 'Flores'], ['Theo', 'Wright'], ['Jade', 'Coleman'], ['Ravi', 'Mehta'],
  ['Zoe', 'Park'], ['Daniel', 'Ruiz'], ['Amara', 'Gray'], ['Jonah', 'Wu'],
  ['Mila', 'Cruz'], ['Finn', 'Watson'], ['Lina', 'Ibrahim'], ['Aria', 'Price'],
  ['Luca', 'Howard'], ['Grace', 'Cho'], ['Adrian', 'Miller'], ['Keira', 'Evans'],
  ['Cleo', 'Ross'], ['Ethan', 'Tran'], ['Talia', 'Singh'], ['Remy', 'Bell'],
  ['Hana', 'Ito'], ['Hugo', 'Diaz'], ['Jules', 'Scott'], ['Yara', 'Saleh'],
  ['Mae', 'Turner'], ['Rosa', 'Silva'], ['Asher', 'Wood'], ['Nolan', 'Green'],
  ['Layla', 'Adams'], ['Kai', 'Thomas'], ['Eva', 'Gomez'], ['Dara', 'King'],
]
const envItems = [
  ['policy-brief', 'Policy Brief', 'assignment', 100],
  ['foundations', 'Policy Foundations Quiz', 'quiz', 20],
  ['stakeholders', 'Stakeholder Map', 'assignment', 40],
  ['memo', 'Regulatory Memo', 'assignment', 75],
  ['workshop', 'Workshop Participation', 'participation', 15],
  ['case-study', 'Watershed Case Study', 'assignment', 80],
  ['instruments', 'Policy Instruments Quiz', 'quiz', 25],
  ['reflection', 'Semester Reflection', 'assignment', 30],
]
const exampleAnnouncements = [
  ['Welcome to Environmental Policy', 'Read the course outline before our first meeting. Bring one example of a policy decision that affects your community.', 'posted'],
  ['Room change for Thursday', 'Meet in Cedar Hall 204 for the policy workshop. Bring your annotated stakeholder map.', 'posted'],
  ['Policy Brief reminders', 'Use the rubric to check your recommendation and the evidence supporting it.', 'draft'],
  ['Workshop materials', 'The case packet will be available in Course Content. Please read the first scenario before class.', 'scheduled', '2026-12-01T14:00:00.000Z', null],
  ['Field discussion sign-up', 'Choose a discussion slot before the sign-up window closes.', 'scheduled', '2026-09-09T12:00:00.000Z', '2026-09-19T12:00:00.000Z'],
  ['Feedback on stakeholder maps', 'Review your Grade Center feedback before revising the final map.', 'draft'],
]
const serial = (number) => String(number).padStart(3, '0')

export function createInitialData() {
  const courses = terms.flatMap((term, termIndex) => catalog.map(([code, title, subject, topic], index) => {
    const instructorName = [instructor.name, 'Prof. Malcolm Ellis', 'Dr. Celeste Okafor', 'Prof. Vivian Lin'][index % 4]
    return {
      id: 'course-' + code.toLowerCase().replace(' ', '-') + (termIndex ? '-' + term.id.split('-')[1] : ''),
      code: code + '-0' + (termIndex + 1), title, termId: term.id,
      instructorId: index % 4 ? 'usr-instructor-0' + (index % 4 + 1) : instructor.id,
      instructorName, subject, description: 'Examine ' + topic + ' through readings, applied exercises, and discussion. Use the course materials to prepare for each workshop.',
      access: termIndex === 2 || index === 2 ? 'complete' : index === 1 || index === 8 ? 'closed' : 'open',
      favorite: termIndex === 0 && [0, 4, 7].includes(index),
      createdAt: term.startsOn + 'T13:00:00.000Z',
    }
  }))
  const students = names.map(([firstName, lastName], index) => {
    const username = (firstName[0] + lastName).toLowerCase()
    return { id: 'stu-' + serial(index + 1), firstName, lastName, username, email: username + '@example.test' }
  })
  const enrollments = courses.flatMap((course, index) =>
    Array.from({ length: index === 0 ? 20 : 3 + index % 4 }, (_, offset) => ({
      id: 'enr-' + course.id.slice(7).replaceAll('-', '') + '-' + serial(offset + 1),
      courseId: course.id, studentId: students[(index * 3 + offset) % students.length].id,
      status: index === 0 && offset === 19 ? 'inactive' : 'enrolled', createdAt: course.createdAt,
    })))
  const gradeItems = courses.flatMap((course, index) => {
    const items = index === 0 ? envItems : [
      ['analysis', course.title + ' Analysis', 'assignment', 50],
      ['knowledge-check', 'Reading Check', 'quiz', 20],
    ]
    const prefix = index === 0 ? 'env210' : course.id.slice(7)
    return items.map(([key, title, category, pointsPossible]) => ({
      id: 'item-' + prefix + '-' + key, courseId: course.id, title, category, pointsPossible,
      kind: category === 'participation' ? 'manual' : category,
      dueOn: terms.find((term) => term.id === course.termId).endsOn,
      description: 'See the scoring criteria for ' + title + '.',
      createdAt: course.createdAt, createdBy: course.instructorId,
    }))
  })
  const courseContent = courses.flatMap((course) => [
    { id: 'content-' + course.id + '-outline', courseId: course.id, title: 'Course Outline', kind: 'resource', description: 'Reading schedule, workshop expectations, and grading policies.', visible: true, position: 1 },
    { id: 'content-' + course.id + '-workshop', courseId: course.id, title: course.id === 'course-env-210' ? 'Week 7: Policy Instruments' : 'Workshop Materials', kind: 'module', description: 'Preparation and resources for the next workshop.', visible: true, position: 2 },
    ...gradeItems.filter((item) => item.courseId === course.id && item.kind !== 'manual').map((item, index) => ({
      id: 'content-' + item.id, courseId: course.id, gradeItemId: item.id,
      title: item.title, kind: item.kind, visible: index < 4, position: index + 3,
    })),
  ])
  const grades = gradeItems.flatMap((item, itemIndex) => enrollments
    .filter((enrollment) => enrollment.courseId === item.courseId && enrollment.status === 'enrolled')
    .flatMap(({ studentId }, index) => {
      const position = (index + itemIndex) % 7
      if (position === 6) return []
      const status = position === 2 ? 'needs_grading' : position < 2 || position === 5 ? 'graded' : 'posted'
      const score = status === 'needs_grading' ? null : position === 5 ? 0 : Number((item.pointsPossible * (0.82 + position * 0.8 / 10)).toFixed(2))
      const createdBy = item.createdBy
      return [{
        id: 'grade-' + item.id.slice(5) + '-' + studentId.slice(4), courseId: item.courseId,
        itemId: item.id, studentId, score, status, feedback: position === 0 ? 'Support your analysis with one more specific example.' : '',
        submittedAt: item.createdAt, createdAt: item.createdAt, createdBy,
        ...(status === 'posted' ? { postedAt: item.createdAt, postedBy: createdBy } : {}),
      }]
    }))
  const announcements = courses.flatMap((course, index) => {
    const examples = index === 0 ? exampleAnnouncements : [
      ['Welcome to ' + course.title, 'Begin with the course outline and complete the first reading before our next meeting.', 'posted'],
      ['Materials for the next workshop', 'Use the materials in Course Content to prepare your discussion notes.', index % 3 ? 'posted' : 'draft'],
    ]
    return examples.map(([title, message, status, publishAt = null, hideAt = null], offset) => ({
      id: index === 0 ? 'ann-env210-' + serial(offset + 1) : 'ann-' + course.id + '-' + serial(offset + 1),
      courseId: course.id, title, message, authorId: course.instructorId, status, publishAt, hideAt,
      createdAt: course.createdAt, updatedAt: course.createdAt, updatedBy: course.instructorId,
      postedAt: status === 'posted' ? course.createdAt : null,
    }))
  })
  return { account: { ...instructor }, terms: terms.map((term) => ({ ...term })), courses, students, enrollments, courseContent, gradeItems, grades, announcements, activity: [] }
}
