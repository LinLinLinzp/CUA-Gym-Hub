import { useState } from 'react'
import { ArrowRight, BookOpen, Clock, Layers3 } from 'lucide-react'
import { useWorkspace } from '../context/Workspace.jsx'
import { active, byId, certificateFor, courseProgress, list, own, validId } from '../data/learning.js'
import { Artwork, Empty, PageHeading, Progress, SearchField, SelectField, SiteLink, Status, certificatePath, coursePath, dateText, duration, matches, requirementPath } from '../components/ui.jsx'

const statuses = [['all', 'All courses'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['withdrawn', 'Withdrawn']]

function PinnedCourse({ state, enrollment, course }) {
  const progress = courseProgress(state, course, enrollment)
  const next = progress.next
  const days = next?.item?.dueAt ? (new Date(next.item.dueAt).getTime() - new Date().getTime()) / 86400000 : NaN
  return <section className="featured" aria-labelledby="featured-title">
    <div className="featured-content">
      <div className="feature-label"><BookOpen size={15} aria-hidden="true" /> Continue studying</div>
      <h2 id="featured-title">{course.title || 'Course'}</h2>
      <p className="feature-issuer">{course.issuerName || 'Course provider'}</p>
      <Progress value={enrollment.progressPercent ?? progress.percent} />
      {next && <p className="feature-next">Up next <strong>{next.item.title || 'Course activity'}</strong>
        {days >= 0 && days <= 7 && <span className="status warning">Due {dateText(next.item.dueAt)}</span>}
      </p>}
      <div className="actions">
        <SiteLink className="button" to={next ? requirementPath(course.id, next) : coursePath(course.id)}>Continue learning <ArrowRight size={17} aria-hidden="true" /></SiteLink>
        {next && <SiteLink className="text-link" to={coursePath(course.id)}>View outline</SiteLink>}
      </div>
    </div>
    <Artwork variant={course.artworkKey} />
  </section>
}

export function MyLearning() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const rows = own(state, 'enrollments').map(enrollment => ({ enrollment, course: byId(state.courses, enrollment.courseId) }))
    .sort((a, b) => String(b.enrollment.updatedAt || '').localeCompare(String(a.enrollment.updatedAt || '')))
  const pinned = rows.find(row => active(row.enrollment) && validId(row.course?.id))
  const filtered = rows.filter(({ enrollment, course }) => (filter === 'all' || enrollment.status === filter)
    && matches(query, course?.title || 'Unavailable course', course?.issuerName, course?.topic))
  return <>
    <PageHeading title="My Learning" subtitle={state.learner?.displayName ? 'Welcome back, ' + state.learner.displayName.split(' ')[0] + '. Pick up where you left off.' : 'Find your courses and see your progress.'} />
    {pinned && <PinnedCourse state={state} {...pinned} />}
    <section className="section library" aria-labelledby="library-heading">
      <div className="section-heading"><h2 id="library-heading">Your courses</h2><span>{rows.length} {rows.length === 1 ? 'enrollment' : 'enrollments'}</span></div>
      <div className="library-controls">
        <div className="segments" role="group" aria-label="Enrollment status">
          {statuses.map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        <SearchField label="Search your courses" value={query} setValue={setQuery} />
      </div>
      {filtered.length ? <div className="record-list">
        {filtered.map(({ enrollment, course }, index) => {
          const credential = certificateFor(state, enrollment.courseId)
          return <article className="record learning-record" key={enrollment.id || index}>
            <Artwork variant={course?.artworkKey} className="thumb" />
            <div className="record-main">
              <h3>{validId(course?.id) ? <SiteLink to={coursePath(course.id)}>{course.title || 'Course'}</SiteLink> : 'Unavailable course'}</h3>
              <p>{course?.issuerName || 'Course provider unavailable'}</p>
            </div>
            <div className="record-progress"><Status value={enrollment.status} /><Progress value={enrollment.progressPercent ?? (enrollment.status === 'completed' ? 100 : 0)} /></div>
            {validId(course?.id) && <SiteLink className="button secondary" to={credential && validId(credential.id) ? certificatePath(credential.id) : coursePath(course.id)}>
              {credential && validId(credential.id) ? 'View certificate' : active(enrollment) ? 'Continue learning' : 'View course'}<ArrowRight size={16} aria-hidden="true" />
            </SiteLink>}
          </article>
        })}
      </div> : <Empty title={rows.length ? 'No courses match' : 'Your library is empty'} description={rows.length ? 'Try changing the status filter or search terms.' : 'Explore the catalog to find your first course.'} to={rows.length ? undefined : '/browse'} action="Explore courses" />}
    </section>
  </>
}

export function Browse() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('')
  const [sort, setSort] = useState('featured')
  const courses = list(state.courses)
  const choices = key => [...new Set(courses.map(course => course[key]).filter(Boolean))].sort().map(value => [value, value])
  const results = courses.filter(course => matches(query, course.title, course.issuerName, course.topic)
    && (!topic || course.topic === topic) && (!level || course.level === level))
  if (sort === 'title') results.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
  if (sort === 'duration') results.sort((a, b) => (a.estimatedMinutes ?? Infinity) - (b.estimatedMinutes ?? Infinity))
  return <>
    <PageHeading title="Explore courses" subtitle="Browse courses in film, design, history and the arts." />
    <div className="filters">
      <SearchField label="Search the catalog" value={query} setValue={setQuery} />
      <SelectField label="Topic" value={topic} setValue={setTopic} options={[[ '', 'All topics'], ...choices('topic')]} />
      <SelectField label="Level" value={level} setValue={setLevel} options={[[ '', 'All levels'], ...choices('level')]} />
      <SelectField label="Sort courses" value={sort} setValue={setSort} options={[[ 'featured', 'Featured order'], ['title', 'Title A–Z'], ['duration', 'Shortest first']]} />
    </div>
    <p className="result-count" aria-live="polite">{results.length} {results.length === 1 ? 'course' : 'courses'}</p>
    {results.length ? <div className="catalog-grid">
      {results.map((course, index) => <article className="catalog-card" key={course.id || index}>
        <Artwork variant={course.artworkKey} />
        <div className="catalog-body">
          <p className="eyebrow">{course.topic || 'Course'}</p>
          <h2>{validId(course.id) ? <SiteLink to={coursePath(course.id)}>{course.title || 'Untitled course'}</SiteLink> : course.title || 'Untitled course'}</h2>
          <p className="provider">{course.issuerName || 'Course provider'}</p>
          <div className="catalog-meta"><span><Layers3 size={15} />{course.level || 'Level unavailable'}</span><span><Clock size={15} />{duration(course.estimatedMinutes)}</span></div>
        </div>
      </article>)}
    </div> : <Empty title={courses.length ? 'No courses match' : 'No courses available'} description={courses.length ? 'Try a different search or clear a filter.' : 'Return to My Learning to check your current enrollments.'} to={courses.length ? undefined : '/'} action="Back to My Learning" />}
  </>
}
