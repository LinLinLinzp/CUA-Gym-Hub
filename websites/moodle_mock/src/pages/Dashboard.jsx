import { useWorkspace } from '../context/Workspace'
import { Go, Heading, Icon, Empty } from '../components/UI'
import { assignmentPath, coursePath, courseWork, dateLabel, find, list, roster, submissionLabel, timestamp, visible } from '../data/views'

export default function Dashboard() {
  const { state } = useWorkspace()
  const courses = list(state.courses)
  const assignments = list(state.assignments).filter(row => find(courses, row.courseId))
  const pending = assignments.map(assignment => {
    const { submissions, grades } = courseWork(state, assignment)
    const count = roster(state, assignment.courseId).filter(({ userId }) => submissionLabel(submissions.get(userId), grades.get(userId)) === 'Needs grading').length
    return { assignment, count }
  }).filter(row => row.count).sort((a, b) => b.count - a.count)
  const now = new Date().getTime()
  const upcoming = assignments.filter(row => visible(row) && visible(find(courses, row.courseId)) && timestamp(row.dueAt) >= now)
    .sort((a, b) => timestamp(a.dueAt) - timestamp(b.dueAt))
  const name = find(state.users, state.account.userId)?.name || state.account.displayName || 'Instructor'
  const metrics = [
    ['books', courses.length, 'Courses', '/courses'],
    ['work', assignments.length, 'Assignments', '/assignments'],
    ['check', pending.reduce((sum, row) => sum + row.count, 0), 'Submissions to grade', '/assignments?status=needs-grading'],
  ]
  return <Heading title="Dashboard" subtitle={dateLabel(new Date().toISOString())} actions={<Go className="button" to="/courses/new"><Icon name="plus" /> Create course</Go>}>
    <section className="welcome"><div><h2>Welcome, {name.split(' ')[0]}</h2><p>Review submissions and keep track of coursework across your classes.</p></div><div className="welcome-art" aria-hidden="true" /></section>
    <div className="metrics">{metrics.map(([icon, count, label, to]) => <Go key={label} className="metric" to={to}><span className="icon-tile"><Icon name={icon} /></span><span><strong>{count}</strong><small>{label}</small></span><Icon name="arrow" size={16} /></Go>)}</div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><h2>Grading queue</h2><Go to="/assignments?status=needs-grading">View queue <Icon name="arrow" size={15} /></Go></div>
        {!pending.length && <Empty>No submissions are waiting for a grade.</Empty>}
        {pending.slice(0, 5).map(({ assignment, count }) => <Go className="dashboard-row" key={assignment.id} to={assignmentPath(assignment) + '/submissions?status=Needs+grading'}><span className="icon-tile"><Icon name="work" /></span><span className="grow"><strong>{assignment.title || 'Untitled assignment'}</strong><small>{find(courses, assignment.courseId)?.shortName}</small></span><span className="badge attention">{count} to grade</span></Go>)}
      </section>
      <section className="panel"><div className="panel-heading"><h2>Upcoming work</h2><Go to="/assignments">All assignments <Icon name="arrow" size={15} /></Go></div>
        {!upcoming.length && <Empty>No upcoming assignment deadlines.</Empty>}
        {upcoming.slice(0, 5).map(assignment => <Go className="dashboard-row" key={assignment.id} to={assignmentPath(assignment)}><span className="icon-tile"><Icon name="clock" /></span><span><strong>{assignment.title || 'Untitled assignment'}</strong><small>{dateLabel(assignment.dueAt, true)}</small></span></Go>)}
      </section>
    </div>
    {courses.length > 0 && <section className="panel quick-courses"><div className="panel-heading"><h2>Course shortcuts</h2><Go to="/courses">My courses <Icon name="arrow" size={15} /></Go></div>
      <div className="shortcut-grid">{courses.slice(0, 3).map(course => <Go key={course.id} to={coursePath(course)}><span><small>{course.shortName}</small><strong>{course.fullName || 'Untitled course'}</strong></span><Icon name="arrow" size={16} /></Go>)}</div>
    </section>}
  </Heading>
}
