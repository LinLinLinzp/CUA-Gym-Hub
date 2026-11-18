import { activeCourse, eligibleFriends, enrollmentFor, newId, nextLesson, number, questPartner, questProgress, questStatus, records } from './model.js'

function replace(items, record) {
  return items.map(row => row.id === record.id ? record : row)
}

export function changeCourse(state, now, courseId, type) {
  if (!records(state.courses).some(course => course.id === courseId)) return state
  const enrollment = enrollmentFor(state, courseId)
  const isEnrolled = enrollment?.status === 'enrolled'
  const previousActiveCourseId = state.profile.activeCourseId ?? null
  if (type === 'enrolled' ? isEnrolled : !isEnrolled) return state
  if (type === 'switched' && previousActiveCourseId === courseId) return state

  let entry = enrollment
  let enrollments = records(state.enrollments)
  let activeCourseId = courseId
  const actorId = state.profile.id

  if (type === 'enrolled') {
    entry = {
      ...enrollment, id: enrollment?.id ?? newId('enrollment'), actorId, courseId,
      status: 'enrolled', run: enrollment ? number(enrollment.run, 1) + 1 : 1,
      xp: 0, lessonsCompleted: 0, createdAt: enrollment?.createdAt ?? now, updatedAt: now, removedAt: null,
    }
    enrollments = enrollment ? replace(enrollments, entry) : [...enrollments, entry]
  } else if (type === 'removed') {
    entry = { ...enrollment, status: 'removed', xp: 0, lessonsCompleted: 0, updatedAt: now, removedAt: now }
    enrollments = replace(enrollments, entry)
    activeCourseId = activeCourse({ ...state, enrollments })?.id ?? null
  }

  const event = {
    id: newId('course-event'), actorId, courseId, enrollmentId: entry.id,
    run: number(entry.run, 1), type, previousActiveCourseId, activeCourseId, createdAt: now,
  }
  return {
    ...state, profile: { ...state.profile, activeCourseId },
    enrollments, courseEvents: [...records(state.courseEvents), event],
  }
}

export function finishLesson(state, now, lessonId, enrollmentId, run, answer) {
  const course = activeCourse(state)
  if (!course) return state
  const enrollment = enrollmentFor(state, course.id)
  const lesson = nextLesson(state, enrollment)
  if (!lesson || lesson.id !== lessonId || enrollment.id !== enrollmentId || number(enrollment.run, 1) !== run
    || !Number.isInteger(answer) || answer < 0 || answer >= lesson.options.length) return state

  const xp = Math.max(0, number(lesson.xp))
  const attempt = {
    id: newId('attempt'), actorId: state.profile.id, courseId: course.id, lessonId,
    enrollmentId, run, status: 'completed', xp, perfect: answer === lesson.answerIndex, createdAt: now,
  }
  const entry = {
    ...enrollment, xp: number(enrollment.xp) + xp,
    lessonsCompleted: number(enrollment.lessonsCompleted) + 1, updatedAt: now,
  }
  return {
    ...state, enrollments: replace(records(state.enrollments), entry),
    lessonAttempts: [...records(state.lessonAttempts), attempt],
    goalProgress: [...records(state.goalProgress), ...lessonGoalProgress(state, attempt)],
    ...lessonQuestProgress(state, attempt),
  }
}

export function changeGoal(state, now, type, goalId, fields) {
  const goals = records(state.goals)
  const goal = goals.find(row => row.id === goalId)
  const actorId = state.profile.id
  if (type !== 'created' && (!goal || goal.status === 'archived')) return state
  let entry
  if (type === 'archived') {
    entry = { ...goal, status: 'archived', archivedAt: now, updatedAt: now }
  } else {
    const label = fields.label.trim()
    const { metric, cadence, target } = fields
    if (!label || !['xp', 'lessons'].includes(metric) || !['daily', 'weekly'].includes(cadence)
      || !Number.isSafeInteger(target) || target < 1) return state
    if (goal && goal.label === label && goal.metric === metric && goal.cadence === cadence && goal.target === target) return state
    const base = goal || { id: newId('goal'), actorId, status: 'active', createdAt: now, archivedAt: null }
    entry = { ...base, label, metric, cadence, target, updatedAt: now }
  }

  const event = {
    id: newId('goal-event'), actorId, goalId: entry.id, type, label: entry.label ?? 'Untitled goal',
    metric: entry.metric ?? 'xp', cadence: entry.cadence ?? 'daily', target: number(entry.target), createdAt: now,
  }
  return { ...state,
    goals: goal ? replace(goals, entry) : [...goals, entry],
    goalEvents: [...records(state.goalEvents), event],
  }
}

function lessonGoalProgress(state, attempt) {
  return records(state.goals).filter(goal => goal.status !== 'archived' && ['xp', 'lessons'].includes(goal.metric))
    .flatMap(goal => {
      const amount = goal.metric === 'xp' ? attempt.xp : 1
      if (!amount) return []
      return [{
        id: newId('goal-progress'), actorId: attempt.actorId, goalId: goal.id,
        lessonAttemptId: attempt.id, metric: goal.metric, amount, createdAt: attempt.createdAt,
      }]
    })
}

export const nudgeMessages = {
  practice: 'Ready for another round?',
  close: 'We’re getting close. Up for a lesson?',
  cheer: 'Nice work so far. Let’s keep it going!',
}

function questEvent(state, quest, type, now, amount = 0) {
  return {
    id: newId('quest-event'), questId: quest.id, actorId: state.profile.id,
    partnerId: quest.partnerId ?? null, type, amount, createdAt: now,
  }
}

export function joinQuest(state, now, questId, partnerId) {
  const quests = records(state.friendQuests)
  const quest = quests.find(row => row.id === questId)
  if (!quest || quest.joinedAt || questStatus(quest, new Date(now)) !== 'available'
    || !eligibleFriends(state).some(friend => friend.id === partnerId)) return state
  const entry = { ...quest, partnerId, status: 'active', joinedAt: now }
  return { ...state,
    friendQuests: replace(quests, entry),
    questEvents: [...records(state.questEvents), questEvent(state, entry, 'joined', now)],
  }
}

export function nudgeQuest(state, now, questId, messageKey) {
  const quest = records(state.friendQuests).find(row => row.id === questId)
  if (!quest || questStatus(quest, new Date(now)) !== 'active' || !questPartner(state, quest)
    || !Object.hasOwn(nudgeMessages, messageKey)) return state
  const nudge = {
    id: newId('nudge'), questId, actorId: state.profile.id, recipientId: quest.partnerId,
    messageKey, message: nudgeMessages[messageKey], status: 'sent', createdAt: now,
  }
  return { ...state, questNudges: [...records(state.questNudges), nudge] }
}

export function claimQuest(state, now, questId) {
  const quests = records(state.friendQuests)
  const quest = quests.find(row => row.id === questId)
  if (!quest || quest.status !== 'completed' || quest.claimedAt) return state
  const reward = Math.max(0, number(quest.rewardGems))
  const entry = { ...quest, status: 'claimed', claimedAt: now }
  return { ...state,
    profile: { ...state.profile, gems: number(state.profile.gems) + reward },
    friendQuests: replace(quests, entry),
    questEvents: [...records(state.questEvents), questEvent(state, entry, 'reward_claimed', now, reward)],
  }
}

function lessonQuestProgress(state, attempt) {
  const now = new Date(attempt.createdAt)
  const amounts = { xp: attempt.xp, lessons: 1, perfect_lessons: Number(attempt.perfect) }
  const newContributions = []
  const completedEvents = []
  const existing = records(state.questContributions)
  const quests = records(state.friendQuests).map(quest => {
    if (questStatus(quest, now) !== 'active' || !Object.hasOwn(amounts, quest.metric) || amounts[quest.metric] <= 0) return quest
    const amount = amounts[quest.metric]
    newContributions.push({
      id: newId('quest-contribution'), questId: quest.id, actorId: attempt.actorId,
      lessonAttemptId: attempt.id, metric: quest.metric, amount, createdAt: attempt.createdAt,
    })
    if (number(quest.target) <= 0 || questProgress(state, quest, existing).total + amount < quest.target) return quest
    completedEvents.push(questEvent(state, quest, 'completed', attempt.createdAt))
    return { ...quest, status: 'completed', completedAt: attempt.createdAt }
  })
  return {
    ...(newContributions.length && { questContributions: [...existing, ...newContributions] }),
    ...(completedEvents.length && { friendQuests: quests, questEvents: [...records(state.questEvents), ...completedEvents] }),
  }
}
