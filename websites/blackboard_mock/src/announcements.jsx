import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { announcementDate, announcementStatus, changeAnnouncement } from './announcementActions.js'
import { Badge, Confirm, courseTitle, dateLabel, Drawer, Empty, Field, matches, records, Search, Select, titleOrder, useValidation } from './components.jsx'
import { useStore } from './store.jsx'

const titleOf = (record) => record.title || 'Untitled announcement'

function localDateInput(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function localDateValue(input) {
  if (!input) return null
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function CourseOptions({ courses }) {
  return courses.map((course) => <option value={course.id} key={course.id}>
    {courseTitle(course)}{course.code ? ' · ' + course.code : ''}
  </option>)
}

function Composer({ courses, initialCourse, record, close }) {
  const { commit } = useStore()
  const { errors, ref, validate } = useValidation()
  const [scheduling, setScheduling] = useState(record?.status === 'scheduled')
  const published = record && ['posted', 'hidden'].includes(announcementStatus(record))
  const availableCourses = courses.filter((course) => course.access !== 'complete')
  const fixedCourse = record?.courseId || initialCourse.fixed
  function submit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const intent = event.nativeEvent.submitter?.value || 'save'
    const courseId = fixedCourse || values.get('courseId')
    const title = values.get('title').trim()
    const message = values.get('message').trim()
    const publishAt = localDateValue(values.get('publishAt'))
    const hideAt = localDateValue(values.get('hideAt'))
    const issues = {}
    if (!availableCourses.some((course) => course.id === courseId)) issues.courseId = 'Choose an available course.'
    if (!title) issues.title = 'Enter a title.'
    if (!message) issues.message = 'Enter a message.'
    if (intent === 'schedule') {
      if (!publishAt || !(new Date(publishAt) > new Date())) issues.publishAt = 'Enter a publication time in the future.'
      if (values.get('hideAt') && (!hideAt || (publishAt && !(new Date(hideAt) > new Date(publishAt))))) {
        issues.hideAt = 'Enter a hide time after publication.'
      }
    }
    if (!validate(issues)) return
    const saved = commit((state, meta) => changeAnnouncement(state, meta,
      { intent, courseId, id: record?.id, title, message, publishAt, hideAt }),
    intent === 'post' ? 'Announcement posted.' : intent === 'schedule' ? 'Announcement scheduled.' : published ? 'Announcement updated.' : 'Draft saved.')
    if (saved) close()
  }

  return <Drawer title={record ? 'Edit Announcement' : 'New Announcement'} wide close={close}>
    <form ref={ref} onSubmit={submit} className="compact" noValidate>
      {fixedCourse ? <p className="meta">{courseTitle(courses.find((course) => course.id === fixedCourse))}</p> :
        <Field label="Course" error={errors.courseId}><select name="courseId" required defaultValue={initialCourse.selected} aria-invalid={Boolean(errors.courseId)}>
          <option value="">Choose a course</option><CourseOptions courses={availableCourses} />
        </select></Field>}
      <Field label="Title" error={errors.title}><input name="title" required defaultValue={record?.title ?? ''} aria-invalid={Boolean(errors.title)} /></Field>
      <Field label="Message" error={errors.message}><textarea name="message" required rows={7} defaultValue={record?.message ?? ''} aria-invalid={Boolean(errors.message)} /></Field>
      {!published && <div><button type="button" aria-expanded={scheduling} onClick={() => setScheduling(!scheduling)}>Schedule publication</button></div>}
      {scheduling && !published && <fieldset className="compact schedule-options">
        <legend>Publication schedule</legend>
        <p className="meta">Times use your local time zone.</p>
        <Field label="Publish at" error={errors.publishAt}><input name="publishAt" type="datetime-local" defaultValue={localDateInput(record?.publishAt)} aria-invalid={Boolean(errors.publishAt)} /></Field>
        <Field label="Hide at (optional)" error={errors.hideAt}><input name="hideAt" type="datetime-local" defaultValue={localDateInput(record?.hideAt)} aria-invalid={Boolean(errors.hideAt)} /></Field>
      </fieldset>}
      <div className="actions">
        {published ? <button type="submit" value="save" className="primary">Save changes</button> : <>
          <button type="submit" value="save">Save Draft</button>
          <button type="submit" value="post" className={scheduling ? '' : 'primary'}>Post Now</button>
          {scheduling && <button type="submit" value="schedule" className="primary">Save Schedule</button>}
        </>}
        <button type="button" onClick={close}>Cancel</button>
      </div>
    </form>
  </Drawer>
}

export function Announcements() {
  const course = useOutletContext()
  const { state, commit } = useStore()
  const [courseId, setCourseId] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('date-desc')
  const [detailId, setDetailId] = useState(null)
  const [composing, setComposing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const courses = records(state.courses).sort((a, b) => titleOrder(a.title, b.title) || titleOrder(a.code, b.code))
  const courseMap = new Map(courses.map((entry) => [entry.id, entry]))
  const existing = records(state.announcements).filter((record) => courseMap.has(record.courseId))
  const detail = existing.find((record) => record.id === detailId)
  const detailCourse = detail && courseMap.get(detail.courseId)
  const detailActor = detail && (detail.authorId === state.account.id ? state.account.name
    : detail.authorId === detailCourse.instructorId ? detailCourse.instructorName : null)
  const now = new Date()
  const selectedCourse = course?.id || courseId
  const rows = existing.filter((record) =>
    (!selectedCourse || record.courseId === selectedCourse) &&
    (!status || announcementStatus(record, now) === status) &&
    matches(query, titleOf(record), record.message)).sort((a, b) => {
    if (sort === 'title-asc') return titleOrder(titleOf(a), titleOf(b))
    if (sort === 'title-desc') return titleOrder(titleOf(b), titleOf(a))
    const direction = sort === 'date-asc' ? 1 : -1
    const time = (record) => new Date(announcementDate(record, now)).getTime() || 0
    return direction * (time(a) - time(b)) || titleOrder(titleOf(a), titleOf(b))
  })

  function changeDetail(intent) {
    const message = intent === 'copy' ? 'Announcement copied to drafts.' : 'Announcement deleted.'
    if (commit((current, meta) => changeAnnouncement(current, meta,
      { intent, courseId: detail.courseId, id: detail.id }), message)) {
      setDeleting(false)
      setDetailId(null)
    }
  }
  const Heading = course ? 'h2' : 'h1'
  return <section className="stack">
    <header className="page-heading"><Heading>Announcements</Heading>
      <button type="button" className="primary" disabled={course ? course.access === 'complete' : !courses.some(({ access }) => access !== 'complete')}
        onClick={() => { setDetailId(null); setComposing(true) }}>New Announcement</button>
    </header>
    {course?.access === 'complete' && <p className="meta">Reopen the course in Course Settings to change announcements.</p>}
    <div className="toolbar">
      <Search label="Search announcements" value={query} onChange={setQuery} placeholder="Title or message" />
      {!course && <Select label="Course" value={courseId} onChange={setCourseId}><option value="">All courses</option><CourseOptions courses={courses} /></Select>}
      <Select label="Status" value={status} onChange={setStatus}><option value="">All statuses</option>
        {['draft', 'scheduled', 'posted', 'hidden'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select>
      <Select label="Sort by" value={sort} onChange={setSort}>
        <option value="date-desc">Date (newest first)</option><option value="date-asc">Date (oldest first)</option>
        <option value="title-asc">Title (A–Z)</option><option value="title-desc">Title (Z–A)</option>
      </Select>
    </div>
    {rows.length ? <div className="table-scroll"><table className="announcements-table">
      <thead><tr><th scope="col">Announcement</th>{!course && <th scope="col">Course</th>}<th scope="col">Status</th><th scope="col">Date</th></tr></thead>
      <tbody>{rows.map((record) => <tr key={record.id}>
        <th scope="row"><button type="button" className="text-button" onClick={() => setDetailId(record.id)}>{titleOf(record)}</button>
          <p className="meta summary">{record.message || '—'}</p></th>
        {!course && <td>{courseTitle(courseMap.get(record.courseId))}<div className="meta">{courseMap.get(record.courseId)?.code}</div></td>}
        <td><Badge status={announcementStatus(record, now)} /></td><td className="date-cell">{dateLabel(announcementDate(record, now), true)}</td>
      </tr>)}</tbody>
    </table></div> : <Empty>{query || status ? 'No announcements match these filters.' : 'No announcements are available in this view.'}</Empty>}
    {detail && <Drawer title={titleOf(detail)} close={() => setDetailId(null)}>
      <div className="compact">
        <div className="actions"><Badge status={announcementStatus(detail, now)} /><span>{courseTitle(detailCourse)}</span></div>
        <p className="message">{detail.message || 'No message is available.'}</p>
        <dl className="details">
          <dt>Author</dt><dd>{detailActor || '—'}</dd>
          <dt>Posted</dt><dd>{dateLabel(detail.postedAt || (['posted', 'hidden'].includes(announcementStatus(detail, now)) ? detail.publishAt : null), true)}</dd>
          {detail.publishAt && <><dt>Scheduled publication</dt><dd>{dateLabel(detail.publishAt, true)}</dd></>}
          {detail.hideAt && <><dt>Hide time</dt><dd>{dateLabel(detail.hideAt, true)}</dd></>}
          <dt>Last updated</dt><dd>{dateLabel(detail.updatedAt || detail.createdAt, true)}</dd>
        </dl>
        {detailCourse.access !== 'complete' && <div className="actions">
          <button type="button" className="primary" onClick={() => setComposing(true)}>Edit</button>
          <button type="button" onClick={() => changeDetail('copy')}>Copy</button>
          <button type="button" onClick={() => setDeleting(true)}>Delete</button>
        </div>}
      </div>
    </Drawer>}
    {composing && <Composer courses={courses} initialCourse={{ fixed: course?.id, selected: courseId }} record={detail}
      close={() => setComposing(false)} />}
    {detail && deleting && <Confirm title="Delete announcement?" confirmLabel="Delete announcement" danger
      close={() => setDeleting(false)} onConfirm={() => changeDetail('delete')}>
      Delete “{titleOf(detail)}” from {courseTitle(detailCourse)}?
    </Confirm>}
  </section>
}
