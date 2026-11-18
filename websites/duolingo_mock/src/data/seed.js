import { createCatalog } from './catalog.js'

const actorId = 'learner-avery'
const at = (month, day, hour = 14) => new Date(Date.UTC(2026, month - 1, day, hour)).toISOString()
const hoursFrom = (iso, hours) => new Date(Date.parse(iso) + hours * 3600000).toISOString()

function learningHistory(lessons) {
  const runs = [
    ['es', 3, 2, 1, 2], ['fr', 3, 1, 1, 9], ['it', 2, 2, 2, 3],
    ['ja', 2, 1, 2, 16], ['de', 1, 0, 3, 2], ['sv', 1, 0, 3, 16],
  ]
  const enrollments = runs.map(([code, run, count, month, day]) => ({
    id: 'enrollment-' + code, actorId, courseId: 'course-' + code,
    status: count ? 'enrolled' : 'removed', run, xp: count * 15, lessonsCompleted: count,
    createdAt: at(month, day), updatedAt: count ? at(11, 17, 18) : at(9, day),
    removedAt: count ? null : at(9, day),
  }))
  const lessonAttempts = []
  const courseEvents = []
  for (const [index, [code, currentRun, count]] of runs.entries()) {
    const enrollment = enrollments[index]
    const { id: enrollmentId, courseId } = enrollment
    const oldRuns = count ? currentRun - 1 : currentRun
    const courseLessons = lessons.filter(lesson => lesson.courseId === courseId)
    for (let run = 1; run <= currentRun; run += 1) {
      const historical = run <= oldRuns
      const picked = historical ? (code === 'sv' ? 2 : 4) : count
      const started = run === 1 ? enrollment.createdAt : historical ? at(5, index + 1) : at(10, 20 + index)
      courseEvents.push({
        id: 'course-event-' + code + '-enrolled-' + run, actorId, courseId, enrollmentId, run,
        type: 'enrolled', previousActiveCourseId: null, activeCourseId: courseId, createdAt: started,
      })
      for (let i = 0; i < picked; i += 1) {
        const lesson = courseLessons[i]
        const createdAt = historical ? hoursFrom(started, i + 1) : at(11, 16 + i, 15 + index)
        lessonAttempts.push({
          id: 'attempt-' + code + '-' + run + '-' + (i + 1), actorId, courseId, lessonId: lesson.id,
          enrollmentId, run, status: 'completed', xp: lesson.xp, perfect: (index + i) % 4 !== 3, createdAt,
        })
      }
      if (historical) courseEvents.push({
        id: 'course-event-' + code + '-removed-' + run, actorId, courseId, enrollmentId, run,
        type: 'removed', previousActiveCourseId: courseId, activeCourseId: null,
        createdAt: enrollment.removedAt || hoursFrom(started, 24 * 14),
      })
    }
  }
  courseEvents.push({
    id: 'course-event-es-current', actorId, courseId: 'course-es', enrollmentId: 'enrollment-es', run: 3,
    type: 'switched', previousActiveCourseId: 'course-ja', activeCourseId: 'course-es', createdAt: at(11, 17, 18),
  })
  lessonAttempts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return { enrollments, courseEvents, lessonAttempts }
}

const goalLabels = [
  'Daily XP', 'Weekly lessons', 'Steady vocabulary', 'Weekend practice', 'Build a study rhythm',
  'Three short sessions', 'Lunch break lessons', 'Monday momentum', 'Evening words', 'Reading warm-up',
  'Phrases for travel', 'Morning vocabulary', 'Coffee break practice', 'One more unit', 'October reading notes',
  'End-of-week review', 'Conversation basics', 'Everyday expressions', 'Quick daily review', 'Library sessions',
  'A week of greetings', 'Travel vocabulary', 'Make time for Italian', 'Spring language sprint',
]

function goalHistory(attempts) {
  const goals = []
  const goalEvents = []
  const goalProgress = []
  const prior = attempts.filter(attempt => attempt.createdAt < at(10, 1))
  for (const [index, label] of goalLabels.entries()) {
    const metric = index % 2 ? 'lessons' : 'xp'
    const cadence = index % 4 === 0 || index % 4 === 3 ? 'daily' : 'weekly'
    const target = index < 4 ? [30, 5, 60, 2][index] : metric === 'xp' ? 15 * (1 + index % 4) : 1 + index % 3
    const sample = index === 0 || index === 1
      ? attempts.filter(attempt => attempt.createdAt >= at(11, 17, 0))
      : prior.slice(index - 2, index)
    const createdAt = index < 2 ? at(10, 20) : hoursFrom(sample[0].createdAt, -2)
    const archivedAt = index >= 8 ? at(10, index + 2) : null
    const goalId = index === 0 ? 'goal-daily-xp' : index === 1 ? 'goal-weekly-lessons' : 'goal-' + (index + 1)
    goals.push({
      id: goalId, actorId, label, metric, cadence, target, status: archivedAt ? 'archived' : 'active',
      createdAt, updatedAt: archivedAt || createdAt, archivedAt,
    })
    const event = { actorId, goalId, label, metric, cadence, target }
    goalEvents.push({ id: goalId + '-created', ...event, type: 'created', createdAt })
    if (archivedAt) goalEvents.push({ id: goalId + '-archived', ...event, type: 'archived', createdAt: archivedAt })
    for (const [rowIndex, attempt] of sample.entries()) goalProgress.push({
      id: goalId + '-progress-' + (rowIndex + 1), actorId, goalId, lessonAttemptId: attempt.id,
      metric, amount: metric === 'xp' ? attempt.xp : 1, createdAt: attempt.createdAt,
    })
  }
  return { goals, goalEvents, goalProgress }
}

const names = [
  ['maya', 'Maya Ortiz', 'maya.reads', 'Italian'], ['liam', 'Liam Brooks', 'liam.words', 'French'],
  ['amina', 'Amina Okafor', 'amina.studies', 'Swahili'], ['noah', 'Noah Patel', 'noah.learns', 'Spanish'],
  ['yuki', 'Yuki Mori', 'yuki.notes', 'German'], ['lucia', 'Lucía Romero', 'lucia.pages', 'Portuguese'],
  ['eli', 'Eli Wagner', 'eli.practice', 'Swedish'], ['sofia', 'Sofia Mendes', 'sofia.languages', 'Japanese'],
  ['mina', 'Mina Park', 'mina.reads', 'Korean'], ['leo', 'Leo Martin', 'leo.listens', 'French'],
  ['nora', 'Nora Jensen', 'nora.travels', 'Danish'], ['omar', 'Omar Hassan', 'omar.vocab', 'Arabic'],
  ['stella', 'Stella Novak', 'stella.words', 'Czech'], ['ren', 'Ren Ito', 'ren.reviews', 'Japanese'],
  ['ines', 'Inês Silva', 'ines.studies', 'Portuguese'], ['alice', 'Alice Weber', 'alice.pages', 'German'],
  ['ben', 'Ben Rivera', 'ben.notes', 'Spanish'], ['imani', 'Imani Reed', 'imani.reads', 'Swahili'],
  ['eda', 'Eda Kaya', 'eda.practice', 'Turkish'], ['milo', 'Milo Evans', 'milo.learns', 'Welsh'],
  ['rita', 'Rita Flores', 'rita.words', 'Italian'], ['hannah', 'Hannah Lee', 'hannah.notes', 'Korean'],
  ['theo', 'Theo Dubois', 'theo.reads', 'French'], ['yasmin', 'Yasmin Haddad', 'yasmin.learns', 'Arabic'],
  ['ravi', 'Ravi Shah', 'ravi.reviews', 'Hindi'], ['clara', 'Clara Nilsson', 'clara.words', 'Swedish'],
  ['ani', 'Ani Petrosyan', 'ani.travels', 'Greek'], ['mateo', 'Mateo Costa', 'mateo.reads', 'Catalan'],
]

const questHistoryTitles = [
  'A week of practice', 'Breakfast vocabulary', 'Unit finishers', 'Partner practice streak', 'Autumn XP sprint',
  'Perfect practice pair', 'Study break challenge', 'Explore new words', 'Two-minute review', 'Practice before lunch',
  'Vocabulary notebook', 'Team lesson count', 'Good morning practice', 'Tuesday XP challenge', 'Read and review',
  'Coffee shop vocabulary', 'Shared study hour', 'Friday lesson club', 'Finish the unit', 'Lesson partners',
]

function socialHistory(attempts) {
  const friends = names.map(([id, displayName, username, courseName], index) => ({
    id: 'friend-' + id, displayName, username, courseName, mutual: index !== 26, eligible: index < 24,
  }))
  const friendQuests = []
  const questContributions = []
  const questNudges = []
  const questEvents = []
  const quest = (id, title, metric, target, rewardGems, fields) => ({
    id: 'quest-' + id, title, metric, target, rewardGems,
    partnerId: null, status: 'available', startsAt: null, endsAt: null, joinedAt: null, completedAt: null, claimedAt: null, ...fields,
  })
  const addEvent = (entry, type, createdAt, amount = 0) => {
    questEvents.push({
      id: entry.id + '-' + type, questId: entry.id, partnerId: entry.partnerId, actorId, type, amount, createdAt,
    })
  }
  const contribute = (entry, suffix, actor, amount, createdAt, lessonAttemptId = null) => {
    questContributions.push({
      id: entry.id + '-contribution-' + suffix, questId: entry.id, actorId: actor,
      lessonAttemptId, metric: entry.metric, amount, createdAt,
    })
  }
  const current = quest('team-xp', 'Earn 100 XP together', 'xp', 100, 35, {
    status: 'active', partnerId: 'friend-maya', joinedAt: at(11, 17),
  })
  const claimable = quest('weekend-review', 'Weekend review', 'lessons', 4, 25, {
    status: 'completed', partnerId: 'friend-lucia', startsAt: at(3, 15), endsAt: at(3, 23),
    joinedAt: at(3, 15), completedAt: at(3, 18),
  })
  friendQuests.push(current,
    quest('study-pair', 'Practice as a pair', 'lessons', 1, 20),
    quest('clean-sweep', 'Perfect practice', 'perfect_lessons', 3, 40),
    quest('word-week', 'The 75 XP challenge', 'xp', 75, 30),
    quest('lesson-duo', 'Six lessons together', 'lessons', 6, 45),
    claimable,
  )
  addEvent(current, 'joined', current.joinedAt)
  contribute(current, 'partner', current.partnerId, 85, at(11, 17, 17))
  addEvent(claimable, 'joined', claimable.joinedAt)
  contribute(claimable, 'one', claimable.partnerId, 2, at(3, 17))
  contribute(claimable, 'two', claimable.partnerId, 2, claimable.completedAt)
  addEvent(claimable, 'completed', claimable.completedAt)

  const prior = attempts.filter(row => row.createdAt < at(10, 1) && row.perfect)
  for (const [index, title] of questHistoryTitles.entries()) {
    const attempt = prior[index % prior.length]
    const day = attempt.createdAt
    const metric = ['xp', 'lessons', 'perfect_lessons'][index % 3]
    const amount = metric === 'xp' ? attempt.xp : 1
    const claimed = index % 3 !== 2
    const entry = quest('history-' + (index + 1), title, metric, claimed ? amount * 3 : amount * 5, 15 + index, {
      status: claimed ? 'claimed' : 'expired', partnerId: friends[index + 1].id,
      startsAt: hoursFrom(day, -48), endsAt: hoursFrom(day, 72), joinedAt: hoursFrom(day, -36),
      completedAt: claimed ? hoursFrom(day, 2) : null, claimedAt: claimed ? hoursFrom(day, 20) : null,
    })
    friendQuests.push(entry)
    addEvent(entry, 'joined', entry.joinedAt)
    contribute(entry, 'early', entry.partnerId, amount, hoursFrom(day, -6))
    contribute(entry, 'lesson', actorId, amount, day, attempt.id)
    contribute(entry, 'late', entry.partnerId, amount, hoursFrom(day, 2))
    if (claimed) {
      addEvent(entry, 'completed', entry.completedAt)
      addEvent(entry, 'reward_claimed', entry.claimedAt, entry.rewardGems)
    }
    if (index < 12) questNudges.push({
      id: entry.id + '-nudge', questId: entry.id, actorId, recipientId: entry.partnerId, status: 'sent',
      messageKey: 'practice', message: 'Ready for another round?', createdAt: hoursFrom(day, -8),
    })
  }
  return { friends, friendQuests, questContributions, questNudges, questEvents }
}

export function createInitialData() {
  const catalog = createCatalog()
  const history = learningHistory(catalog.lessons)
  return {
    profile: { id: actorId, displayName: 'Avery Chen', username: 'averylearns', activeCourseId: 'course-es', gems: 360 },
    ...catalog,
    ...history,
    ...goalHistory(history.lessonAttempts),
    ...socialHistory(history.lessonAttempts),
  }
}
