const stamp = '2026-08-20T14:00:00.000Z'
const teacher = 'usr-instructor'
const record = (id, fields, actorId = teacher) => ({ id, actorId, createdAt: stamp, updatedAt: stamp, ...fields })
const disciplines = [
  ['sciences', 'Sciences', [['ENV 210', 'Environmental Field Methods', 'Field observation and sampling methods for urban watersheds.'], ['BIO 115', 'Ecology of Cities'], ['CHEM 220', 'Water Chemistry'], ['GEO 120', 'Climate Systems'], ['AST 101', 'Observational Astronomy']]],
  ['humanities', 'Humanities', [['HIS 214', 'Cities in the Modern Era'], ['LIT 155', 'The Contemporary Short Story'], ['PHI 200', 'Ethics in Public Life'], ['REL 140', 'Religion and Place'], ['HIS 302', 'Archives and Memory']]],
  ['design', 'Design', [['DES 205', 'Information Design'], ['ART 112', 'Color and Composition'], ['DES 320', 'Design for Accessibility'], ['MED 201', 'Documentary Media'], ['ARC 110', 'Reading the Built Environment']]],
  ['technology', 'Technology', [['CIS 170', 'Introduction to Data Systems'], ['WEB 240', 'Web Application Studio'], ['CIS 250', 'Database Design'], ['GIS 212', 'Mapping with Spatial Data'], ['CIS 310', 'Human–Computer Interaction']]],
  ['social', 'Social Sciences', [['SOC 205', 'Communities and Institutions'], ['PSY 118', 'Learning and Cognition'], ['ANT 215', 'Ethnographic Methods'], ['POL 130', 'Local Government'], ['ECN 250', 'Economics of Housing']]],
  ['writing', 'Writing and Languages', [['WRI 201', 'Writing for Public Audiences'], ['ENG 108', 'Rhetoric and Research'], ['SPA 202', 'Intermediate Spanish'], ['WRI 255', 'Writing About Science'], ['LIN 115', 'Language and Society']]],
]
const studentNames = [
  'Sam Ortiz', 'Maya Chen', 'Jordan Reed', 'Amina Yusuf', 'Oliver Price', 'Priya Shah',
  'Eli Morgan', 'Sofia Vega', 'Noah Brooks', 'Lina Haddad', 'Mateo Cruz', 'Nora Foster',
  'Ravi Patel', 'Zoe Bennett', 'Isaac Hall', 'Mei Lin', 'Leah Kim', 'Omar Ali',
  'Avery Collins', 'Nina Silva', 'Theo Martin', 'Iris Nguyen', 'Luca Romano', 'Hana Ito',
  'Ezra Flores', 'Alma Rossi', 'Miles Cooper', 'Sara Quinn', 'Dara Okafor', 'June Walker',
  'Ian Murphy', 'Tessa Wright', 'Remy Laurent', 'Alex Rivera', 'Mina Choi', 'Jamie Bell',
]
const slug = (value) => value.toLowerCase().replaceAll(' ', '-')
const courseId = 'crs-env-210'
const fieldId = 'asn-env-210-field-notes'
const fieldItem = 'item-env-210-field-notes'

export function createInitialData() {
  const account = { userId: teacher, displayName: 'Elena Park' }
  const students = studentNames.map(name => ({
    id: 'usr-' + slug(name), name, email: name.toLowerCase().replaceAll(' ', '.') + '@example.test', role: 'student',
  }))
  const users = [{ id: teacher, name: account.displayName, email: 'elena.park@example.test', role: 'teacher' }, ...students]
  const categories = disciplines.map(([key, name]) => ({ id: 'cat-' + key, name }))
  const courses = disciplines.flatMap(([key, category, entries], group) => entries.map(([shortName, fullName, summary], index) => {
    const [startDate, endDate] = index === 4 ? ['2027-01-19', '2027-05-14']
      : index === 3 ? ['2026-01-20', '2026-05-15'] : ['2026-09-08', '2026-12-18']
    return record('crs-' + slug(shortName), {
      fullName, shortName, categoryId: 'cat-' + key,
      summary: summary ?? `Seminars and applied coursework in ${fullName.toLowerCase()}.`,
      startDate, endDate, visibility: index === 4 && group % 2 === 0 ? 'hidden' : 'visible',
    })
  }))
  const courseSections = courses.flatMap((course, index) => (index < 12 ? ['General', index === 0 ? 'Field investigations' : 'Applied practice'] : ['General']).map((title, position) =>
    record('sec-' + course.id.slice(4) + (position ? '-practice' : '-general'), { courseId: course.id, title, position })))
  const coursePreferences = [0, 5, 10, 15, 25].map(index => record('pref-' + courses[index].id.slice(4) + '-elena', {
    courseId: courses[index].id, userId: teacher, starred: true,
  }))
  const enrolments = courses.flatMap((course, index) => {
    const roster = index === 0 ? students.slice(0, 25) : Array.from({ length: 3 }, (_, offset) => students[(index * 3 + offset) % students.length])
    return [
      record('enr-' + course.id.slice(4) + '-elena', { courseId: course.id, userId: teacher, role: 'teacher', status: 'active', method: 'manual' }),
      ...roster.map((student, row) => record('enr-' + course.id.slice(4) + '-' + student.id.slice(4), {
        courseId: course.id, userId: student.id, role: 'student', status: index === 0 && row === 24 ? 'suspended' : 'active', method: 'manual',
      })),
    ]
  })
  const planned = [
    ['field-notes', 'Watershed field notes', 'Describe your survey transect and two sources of uncertainty.', '2026-10-12T13:00:00.000Z', '2026-11-23T22:00:00.000Z', 50, 'visible', 0],
    ['sampling-plan', 'Stream sampling plan', 'Propose a sampling route and justify three observation points.', null, null, 30, 'visible', 1],
    ['field-brief', 'Riparian habitat brief', 'Summarize the condition of the study reach with observations from your field journal.', '2026-11-02T13:00:00.000Z', '2026-12-07T22:00:00.000Z', 60, 'visible', 1],
    ['lab-prep', 'Equipment calibration notes', 'Record your calibration checks and identify any equipment that needs service.', null, null, 20, 'hidden', 0],
  ]
  const assignments = courses.flatMap((course, index) => {
    const topics = index === 0 ? planned : [
      ['research-brief', `${course.fullName} research brief`, 'Frame a research question, identify two sources, and explain your approach.', null, `2026-11-${String(19 + index % 10)}T22:00:00.000Z`, 40, 'visible', 0],
      ...((index < 16) ? [['applied-analysis', `${course.shortName} applied analysis`, 'Analyze a case from seminar and support your conclusion with evidence.', null, '2026-12-04T22:00:00.000Z', 80, 'visible', index < 12 ? 1 : 0]] : []),
    ]
    const sections = courseSections.filter(section => section.courseId === course.id)
    return topics.map(([key, title, instructions, opensAt, dueAt, maxPoints, visibility, section]) =>
      record('asn-' + course.id.slice(4) + '-' + key, {
        courseId: course.id, sectionId: sections[section].id, title, instructions, opensAt, dueAt, maxPoints, visibility, submissionType: 'online_text',
      }))
  })
  const gradeItems = [
    ...assignments.map(assignment => record('item-' + assignment.id.slice(4), {
      courseId: assignment.courseId, assignmentId: assignment.id, type: 'assignment',
      name: assignment.title, maxPoints: assignment.maxPoints, visibility: assignment.visibility,
    })),
    ...courses.slice(0, 6).map(course => record('item-' + course.id.slice(4) + '-participation', {
      courseId: course.id, assignmentId: null, type: 'manual', name: 'Seminar participation', maxPoints: 20, visibility: 'visible',
    })),
  ]
  const samples = [
    'The eastern bank showed higher turbidity after rainfall.',
    'I compared readings from shaded and exposed sampling points.',
    'The second observation site had slower flow and finer sediment.',
    'I noted the time of collection and kept the sample bottles out of direct sun.',
  ]
  const submissions = assignments.slice(0, 18).flatMap((assignment, index) => {
    const roster = enrolments.filter(row => row.courseId === assignment.courseId && row.role === 'student' && row.status === 'active')
    const count = index === 0 ? 16 : index === 1 ? 8 : index === 2 ? 6 : index === 3 ? 0 : 2
    return roster.slice(index === 1 ? 4 : 0, (index === 1 ? 4 : 0) + count).map(({ userId }, row) => {
      const draft = row === 15 || (index === 1 && row === 7)
      const submittedAt = draft ? null : index === 0 && row === 1 ? '2026-11-24T12:00:00.000Z' : '2026-11-13T18:00:00.000Z'
      return record(index === 0 ? 'sub-field-notes-' + (row === 0 ? 'sam' : userId.slice(4)) : 'sub-' + assignment.id.slice(4) + '-' + userId.slice(4), {
        courseId: assignment.courseId, assignmentId: assignment.id, studentId: userId,
        text: samples[(row + index) % samples.length], status: draft ? 'draft' : 'submitted',
        submittedAt, late: Boolean(submittedAt && assignment.dueAt && submittedAt > assignment.dueAt),
        createdAt: submittedAt ?? stamp, updatedAt: submittedAt ?? stamp,
      }, userId)
    })
  })
  const assessed = submissions.filter((submission, index) => submission.status === 'submitted' && (index < 11 || (index >= 18 && index % 3 !== 0))).slice(0, 36)
  const grades = assessed.map((submission, index) => {
    const item = gradeItems.find(row => row.assignmentId === submission.assignmentId)
    const isSam = submission.assignmentId === fieldId && submission.studentId === students[0].id
    const gradedAt = submission.submittedAt > '2026-11-16T15:00:00.000Z' ? '2026-11-25T15:00:00.000Z' : '2026-11-16T15:00:00.000Z'
    return record(isSam ? 'grd-field-notes-sam' : 'grd-' + submission.id.slice(4), {
      courseId: submission.courseId, gradeItemId: isSam ? fieldItem : item.id, studentId: submission.studentId, submissionId: submission.id,
      score: isSam ? 42.5 : index === 1 ? 0 : Math.round(item.maxPoints * (0.72 + (index % 5) * 0.04)),
      feedback: isSam ? 'Explain how the rainfall affected the readings.' : 'Support your conclusion with a specific observation.',
      gradedBy: teacher, gradedAt, createdAt: gradedAt, updatedAt: gradedAt,
      override: isSam ? { score: 46, feedback: 'Adjusted after reviewing the field log.', actorId: teacher, createdAt: gradedAt, updatedAt: gradedAt } : null,
    })
  })
  for (const student of students.slice(0, 8)) {
    grades.push(record('grd-participation-' + student.id.slice(4), {
      courseId, gradeItemId: 'item-env-210-participation', studentId: student.id, submissionId: null,
      score: 17, feedback: 'Prepared for the field discussion.', gradedBy: teacher, gradedAt: stamp, override: null,
    }))
  }
  return { account, users, categories, courses, courseSections, coursePreferences, enrolments, assignments, submissions, gradeItems, grades }
}
