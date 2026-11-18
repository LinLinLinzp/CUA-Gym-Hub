import { useAccount } from '../account.jsx'
import {
  activeCourse, courseLessons, courseName, displayDate, enrollmentFor, friendName,
  goalName, goalSnapshot, metricName, nextLesson, number, questName, questPartner, questProgress, questStatus, records,
} from '../model.js'
import { AccountLink, Badge, PageHead, Progress } from '../ui.jsx'

function Notebook() {
  return <div className="notebook-art" aria-hidden="true">
    <div className="art-sun" />
    <div className="art-orbit" />
    <div className="art-star star-one">✦</div><div className="art-star star-two">✦</div>
    <div className="art-card art-first"><span>¡Hola!</span><i /></div>
    <div className="art-card art-second"><span>Bonjour</span><i /></div>
    <div className="book">
      <div className="book-page book-left"><i /><i /><i /><i /></div>
      <div className="book-page book-right"><b>あ</b><i /><i /></div>
    </div>
    <div className="art-pencil"><i /></div>
  </div>
}

const courseVerbs = { enrolled: 'Added', switched: 'Switched to', removed: 'Removed' }
const goalVerbs = { created: 'Created', updated: 'Updated', archived: 'Archived' }
const questVerbs = { joined: 'Joined', completed: 'Completed', reward_claimed: 'Claimed rewards for' }

function recentActivity(state) {
  const courses = new Map(records(state.courses).map(course => [course.id, course]))
  const lessons = new Map(records(state.lessons).map(lesson => [lesson.id, lesson]))
  const quests = new Map(records(state.friendQuests).map(quest => [quest.id, quest]))
  const activity = [
    ...records(state.lessonAttempts).filter(row => row.status === 'completed').map(row => ({
      row, category: 'Lesson', to: '/courses', text: 'Finished ' + (lessons.get(row.lessonId)?.title || 'a lesson') + ' · ' + courseName(courses.get(row.courseId)),
    })),
    ...records(state.courseEvents).map(row => ({
      row, category: 'Course', to: '/courses', text: (courseVerbs[row.type] || 'Updated') + ' ' + courseName(courses.get(row.courseId)),
    })),
    ...records(state.goalEvents).map(row => ({
      row, category: 'Goal', to: '/goals', text: (goalVerbs[row.type] || 'Updated') + ' ' + (row.label || 'a goal'),
    })),
    ...records(state.questNudges).map(row => ({
      row, category: "Quest", to: "/friends-quests", text: "Sent a nudge · " + questName(quests.get(row.questId)),
    })),
    ...records(state.questEvents).map(row => ({
      row, category: 'Quest', to: '/friends-quests', text: (questVerbs[row.type] || 'Updated') + ' ' + questName(quests.get(row.questId)),
    })),
  ]
  return activity.filter(({ row }) => row.createdAt)
    .sort((a, b) => String(b.row.createdAt).localeCompare(String(a.row.createdAt))).slice(0, 6)
}

export function Overview() {
  const { state } = useAccount()
  const course = activeCourse(state)
  const enrollment = course && enrollmentFor(state, course.id)
  const lesson = nextLesson(state, enrollment)
  const lessonCount = course ? courseLessons(state, course.id).length : 0
  const now = new Date()
  const goals = records(state.goals).filter(goal => goal.status !== 'archived').map(goal => ({ goal, progress: goalSnapshot(state, goal, now) }))
  const summary = goals.sort((a, b) => b.progress.amount / (b.progress.target || 1) - a.progress.amount / (a.progress.target || 1))[0]
  const quests = records(state.friendQuests)
  const quest = quests.find(entry => questStatus(entry, now) === 'active')
  const rewards = quests.filter(entry => questStatus(entry, now) === 'completed' && !entry.claimedAt).length
  const activity = recentActivity(state)
  const name = state.profile.displayName?.trim().split(/\s+/)[0]

  return <>
    <PageHead title={name ? 'Welcome back, ' + name : 'Welcome back'}>Pick up a lesson, check a goal, or practice with a friend.</PageHead>
    <article className="feature card">
      <div className="feature-copy">
        {course && <Badge tone="green">Current course</Badge>}
        <h2>{course ? courseName(course) : 'Choose a language'}</h2>
        <p className="muted">{lesson ? 'Unit ' + number(lesson.order, number(enrollment.lessonsCompleted) + 1) + ' · ' + (lesson.title || 'Vocabulary practice')
          : course ? 'You’ve reached the end of the available lessons.' : 'Add a course to start your practice.'}</p>
        {course && <Progress value={enrollment.lessonsCompleted} target={lessonCount} unit="lessons" />}
        <div className="actions">
          <AccountLink className="button primary" to={lesson ? '/learn' : '/courses'}>{lesson ? 'Continue learning' : 'Browse courses'} <span aria-hidden="true">→</span></AccountLink>
          {course && lesson && <AccountLink className="text-link" to="/courses">Manage courses</AccountLink>}
        </div>
      </div>
      <Notebook />
    </article>
    <div className="grid two section">
      <article className="card overview-card">
        <div className="between"><h2>Goals</h2><span className="section-icon" aria-hidden="true">◎</span></div>
        {summary ? <>
          <div><h3>{goalName(summary.goal)}</h3><p className="caption">{summary.progress.cadence === 'weekly' ? 'Weekly' : 'Daily'} · {summary.progress.period}</p></div>
          <Progress value={summary.progress.amount} target={summary.progress.target} unit={metricName(summary.progress.metric)} />
        </> : <p className="muted">Create a practice target for XP or lessons.</p>}
        <AccountLink className="text-link" to="/goals">View goals <span aria-hidden="true">→</span></AccountLink>
      </article>
      <article className="card overview-card">
        <div className="between"><h2>Friends Quests</h2><span className="section-icon apricot" aria-hidden="true">✦</span></div>
        {quest ? <>
          <div><h3>{questName(quest)}</h3><p className="caption">With {friendName(questPartner(state, quest))}</p></div>
          <Progress value={questProgress(state, quest).total} target={quest.target} unit={metricName(quest.metric)} />
        </> : <p className="muted">Choose a partner to start a shared challenge.</p>}
        {rewards > 0 && <Badge tone="apricot">{rewards} {rewards === 1 ? 'reward' : 'rewards'} to claim</Badge>}
        <AccountLink className="text-link" to="/friends-quests">View Friends Quests <span aria-hidden="true">→</span></AccountLink>
      </article>
    </div>
    {activity.length > 0 && <section className="section" aria-labelledby="recent">
      <h2 className="section-title" id="recent">Recent activity</h2>
      <ul className="rows card activity-list">
        {activity.map(({ row, text, category, to }) => <li key={category + row.id}>
          <Badge tone="neutral">{category}</Badge><AccountLink to={to}>{text}</AccountLink><time className="caption" dateTime={row.createdAt}>{displayDate(row.createdAt)}</time>
        </li>)}
      </ul>
    </section>}
  </>
}
