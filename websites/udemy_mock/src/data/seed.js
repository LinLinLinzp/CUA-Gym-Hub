const profileNames = [
  'Morgan Ellis', 'Jules Campbell', 'Nina Park', 'Emmett Ruiz', 'Asha Bennett', 'Leo Liao',
  'Sofia Patel', 'Dani Brooks', 'Theo Okafor', 'Maya Chen', 'Avery Reed', 'Samir Ford',
  'Elise Warren', 'Ren Ito', 'Bea Santos', 'Rory Walsh', 'Zara Ali', 'Kai Novak',
  'Lena Torres', 'Micah Cole', 'Ada Turner', 'Inez Rivera', 'Owen Gale', 'Tara Mehta',
]

const catalog = [
  ['field_sketching', 'Field Sketching with Ink', 'Illustration', 'A portable drawing practice', 'Build confident lines through short outdoor studies.', 'Choosing a viewpoint', 'Working with ink', 'A five-minute contour study'],
  ['photo_essays', 'The Art of the Photo Essay', 'Photography', 'Tell a story in twelve frames', 'Sequence everyday photographs into a story with a clear point of view.', 'Finding a story', 'Editing a sequence', 'Opening with an establishing frame'],
  ['scene_structure', 'Writing Scenes That Move', 'Writing', 'A practical workshop in scene structure', 'Give each scene a direction, a turn, and a reason to stay in the story.', 'Purpose and tension', 'Revising a scene', 'Finding the turning point'],
  ['color_notebooks', 'Color Notebooks for Designers', 'Design'],
  ['rhythm_by_ear', 'Rhythm by Ear', 'Music'],
  ['spreadsheet_habits', 'Spreadsheets for Everyday Projects', 'Digital Skills'],
  ['botanical_shapes', 'Botanical Shapes in Gouache', 'Illustration'],
  ['window_light', 'Portraits in Window Light', 'Photography'],
  ['family_archives', 'Writing from Family Archives', 'Writing'],
  ['zine_layout', 'A Weekend Zine Layout', 'Design'],
  ['piano_patterns', 'Piano Patterns in Three Chords', 'Music'],
  ['digital_archive', 'Organizing a Digital Archive', 'Digital Skills'],
  ['print_shapes', 'Relief Prints from Simple Shapes', 'Illustration'],
  ['street_details', 'Street Details After Rain', 'Photography'],
  ['essay_voice', 'Finding Your Essay Voice', 'Writing'],
  ['letterpress_type', 'Type Inspired by Letterpress', 'Design'],
  ['field_recording', 'Field Recording for Musicians', 'Music'],
  ['web_notes', 'Writing Better Notes for the Web', 'Digital Skills'],
  ['ink_and_wash', 'Ink and Wash for Quiet Interiors', 'Illustration'],
  ['night_exposure', 'Night Exposure on Foot', 'Photography'],
  ['travel_journal', 'Keeping a Travel Journal', 'Writing'],
  ['wayfinding', 'Wayfinding with Color and Type', 'Design'],
  ['playing_duets', 'Listening and Playing Duets', 'Music'],
  ['file_workflows', 'File Workflows for Small Studios', 'Digital Skills'],
  ['paper_mosaics', 'Paper Mosaics from Found Color', 'Illustration'],
  ['community_portraits', 'Community Portraits', 'Photography'],
  ['short_memoir', 'The Short Memoir Studio', 'Writing'],
  ['exhibit_labels', 'Designing Exhibit Labels', 'Design'],
  ['sound_collage', 'Making a Sound Collage', 'Music'],
  ['studio_web', 'A Simple Studio Website', 'Digital Skills'],
  ['graphic_diaries', 'Graphic Diaries in Two Colors', 'Illustration'],
  ['contact_sheets', 'Reading a Contact Sheet', 'Photography'],
  ['spoken_stories', 'Shaping Stories for the Stage', 'Writing'],
  ['poster_series', 'Building a Poster Series', 'Design'],
  ['acoustic_arrangement', 'Acoustic Arrangement Lab', 'Music'],
  ['metadata_basics', 'Metadata for Creative Work', 'Digital Skills'],
]

export const categories = ['Illustration', 'Photography', 'Writing', 'Design', 'Music', 'Digital Skills']
const topics = {
  Illustration: ['shape', 'Make a small study using two line weights. Compare where your eye comes to rest.'],
  Photography: ['composition', 'Make three frames of the same subject from different distances. Note what changes in each frame.'],
  Writing: ['structure', 'Draft a short example, then revise the opening to make its purpose clearer. Read both versions aloud.'],
  Design: ['hierarchy', 'Lay out the same material in two different orders. Check which element you notice first.'],
  Music: ['phrasing', 'Record a short phrase at two tempos. Listen back and mark where the emphasis falls.'],
  'Digital Skills': ['workflow', 'Try the exercise on a small set of your own files, then write down which steps you could repeat.'],
}
const accountId = 'profile_morgan'
const date = (offset = 0) => new Date(Date.UTC(2026, 8, 8 + offset, 13, 10)).toISOString()
const metadata = (actor, offset) => ({
  createdAt: date(offset), createdBy: actor, updatedAt: date(offset), updatedBy: actor,
})

const discussions = [
  ['How should I handle broken contours?', 'Should I lift the pen between overlapping shapes?', 'Try tracing each shape separately on a second study.'],
  ['Choosing an opening image', 'My strongest image is also the busiest. Would you open with it?', 'Try leading with the quieter frame and using the busy one to change the pace.'],
  ['Where does the turning point belong?', 'My scene changes direction late. How can I tell if the setup is too long?', 'Underline the first action that changes what the character can do next.'],
  ['What belongs in the first pass?', 'I keep revising details before the whole piece is in place.', 'Set a short timer and make a complete rough version before revising.'],
  ['Is there a good way to compare studies?', 'I made several versions and would like a way to evaluate them.', 'Put them side by side and write down where your attention goes first.'],
  ['How much should I prepare before starting?', 'I have a few ideas in my notebook and want to choose one.', 'Start with the example you can try in ten minutes and use it to test your idea.'],
  ['Can I adapt the final exercise?', 'I would like to use material from my neighborhood project.', 'Yes. Keep the same constraints and swap in your own source material.'],
  ['What did you learn from the second draft?', 'I am curious how others changed their approach between drafts.', 'I found it helpful to simplify the opening before adding any details.'],
]

export function createInitialData() {
  const profiles = profileNames.map((name, index) => ({
    id: index === 0 ? accountId : index === 1 ? 'profile_jules' : 'profile_' + (index + 1),
    name,
    headline: index === 0 ? 'Illustrator and educator' : 'Member of the studio community',
  }))
  const courses = catalog.map(([key, title, category, subtitle, description], i) => {
    const instructorId = i < 2 || (i >= 24 && i < 34) ? accountId : profiles[1 + i % 23].id
    const status = instructorId !== accountId || i < 2 || i % 3 === 0 ? 'published' : i % 3 === 1 ? 'draft' : 'in_review'
    return {
      id: 'course_' + key, instructorId, title, category, status,
      subtitle: subtitle || 'A hands-on workshop in ' + topics[category][0],
      description: description || 'Explore ' + topics[category][0] + ' through short exercises in ' + title.toLowerCase() + '. Each section ends with a study you can adapt to your own work.',
      ...metadata(instructorId, -16),
      ...(status === 'in_review' ? { submittedAt: date(-5), updatedAt: date(-5) } : {}),
    }
  })
  const sections = courses.flatMap((course, i) => {
    const titles = [catalog[i][5] || 'Working with ' + topics[course.category][0], catalog[i][6] || 'Practice and revision']
    return titles.map((title, index) => ({
      id: course.id.replace('course_', 'section_') + '_0' + (index + 1),
      courseId: course.id, title, position: index + 1, ...metadata(course.instructorId, -15),
    }))
  })
  const lectures = sections.flatMap((section, i) => {
    const course = courses[Math.floor(i / 2)]
    const titles = i % 2 === 0
      ? [catalog[Math.floor(i / 2)][7] || 'A study in ' + topics[course.category][0], 'Comparing two approaches', 'An independent exercise']
      : ['Review your first pass', 'Develop a finished study']
    return titles.map((title, index) => ({
      id: section.id.replace('section_', 'lecture_') + '_0' + (index + 1),
      sectionId: section.id, title, position: index + 1, durationMinutes: 8 + index * 4,
      content: topics[course.category][1], ...metadata(course.instructorId, -14),
    }))
  })
  const courseLectures = (index) => lectures.slice(index * 5, index * 5 + 5)
  const enrollments = courses.slice(0, 24).map((course, i) => {
    const lessons = courseLectures(i)
    const count = i >= 16 && i < 20 ? 5 : i >= 12 && i < 16 ? 0 : i % 3 + 1
    return {
      id: course.id.replace('course_', 'enrollment_morgan_'), profileId: accountId, courseId: course.id,
      status: i >= 20 ? 'archived' : 'active', archivedAt: i >= 20 ? date(26 - i) : null,
      lastLectureId: count ? lessons[Math.min(count, 4)].id : null,
      lastAccessedAt: count ? date(36 - i) : null,
      completedLectureIds: lessons.slice(0, count).map(lesson => lesson.id),
      completedAt: count === 5 ? date(36 - i) : null, ...metadata(accountId, -12),
      updatedAt: count ? date(36 - i) : date(-12),
    }
  })
  const courseLists = [
    ['weekend', 'Weekend studio', 'Courses to revisit on Saturdays', [0, 1, 20]],
    ['reference', 'Reference shelf', 'Exercises worth coming back to', [2, 5, 14, 21]],
    ['photo', 'Photo projects', 'Ideas for the next photo walk', [1, 7, 13, 19]],
    ['writing', 'Writing practice', 'Prompts and revision techniques', [2, 8, 14]],
    ['music', 'Listening room', 'Courses on rhythm and recording', [4, 10, 16]],
    ['design', 'Design studies', 'Layouts and color exercises', [3, 9, 15, 22]],
  ].map(([key, name, description, indices]) => ({
    id: 'list_' + key, profileId: accountId, name, description,
    courseIds: indices.map(index => courses[index].id), status: 'active', deletedAt: null,
    ...metadata(accountId, 5),
  }))
  const questionCourses = [0, 1, 2, 24, 25, 26, 3, 4, 5, 27, 28, 29]
  const questions = Array.from({ length: 48 }, (_, i) => {
    const courseIndex = questionCourses[i % questionCourses.length]
    const course = courses[courseIndex]
    const [title, body] = discussions[i < 3 ? i : 3 + i % 5]
    const authorId = i % 5 === 3 ? accountId : profiles[1 + i % 23].id
    return {
      id: 'question_' + (i + 1), courseId: course.id,
      lectureId: i % 4 === 1 ? null : courseLectures(courseIndex)[Math.floor(i / 12)].id,
      authorId, title: i < 3 ? title : title + ' · ' + ['Getting started', 'First study', 'Revision', 'Final project'][Math.floor(i / 12)],
      body, topAnswerId: i % 3 === 0 ? 'answer_' + (i + 1) + '_1' : null,
      status: 'active', deletedAt: null, ...metadata(authorId, i % 32),
    }
  })
  const answers = questions.flatMap((question, i) => Array.from({ length: i % 2 + 1 }, (_, j) => {
    const authorId = j ? profiles[1 + (i + 8) % 23].id : courses.find(course => course.id === question.courseId).instructorId
    return {
      id: 'answer_' + (i + 1) + '_' + (j + 1), questionId: question.id, authorId,
      body: j ? 'I tried this during my practice session and kept notes on the changes. Comparing the versions helped me decide what to keep.' : discussions[i < 3 ? i : 3 + i % 5][2],
      status: 'active', ...metadata(authorId, i % 32 + 1 + j),
    }
  }))
  const questionFollows = questions.slice(0, 16).map((question, i) => ({
    id: 'follow_morgan_' + question.id, questionId: question.id, profileId: accountId,
    following: i % 3 === 0, ...metadata(accountId, 18),
  }))
  const questionReads = questions.filter((question, i) => (
    i % 4 === 1 && courses.some(course => course.id === question.courseId && course.instructorId === accountId)
  )).map(question => ({
    id: 'read_morgan_' + question.id, questionId: question.id, profileId: accountId,
    isRead: true, ...metadata(accountId, 34),
  }))
  const performance = courses.filter(course => course.instructorId === accountId && course.status === 'published')
    .flatMap((course, i) => ['08', '09', '10'].map((month, j) => ({
      id: 'performance_' + course.id + '_' + month, courseId: course.id, periodStart: '2026-' + month + '-01',
      learnerCount: 52 + 17 * i + 13 * j, averageRating: 4.3 + ((i + j) % 6) / 10,
      minutesTaught: 2100 + 800 * i + 690 * j,
    })))

  return {
    account: { profileId: accountId }, profiles, courses, sections, lectures, enrollments, courseLists,
    questions, answers, questionFollows, questionReads, performance,
  }
}
