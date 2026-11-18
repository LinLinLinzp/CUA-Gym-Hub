import React, { useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { dateKey, timeKey, timeZoneFor, toInstant } from '../utils/dates.js'
import { array, createId, findRecord, profileName, records, text } from '../utils/records.js'
import { submitPost } from '../features/posts.js'
import { Icon, Modal, PostPreview, ProfileTile } from './ui.jsx'

export function Composer({ options, onClose, onSaved }) {
  const { actor, state, commit } = useWorkspace()
  const post = findRecord(state.posts, options.postId)
  const original = findRecord(state.approvals, options.previousRequestId)
  const zone = timeZoneFor(state.workspace?.timeZone)
  const profiles = records(state.profiles).filter((profile) => profile.id)
  const reviewers = records(state.users).filter((person) => person.id && person.id !== actor?.id)
  const reschedule = options.mode === 'reschedule'
  const revising = Boolean(options.previousRequestId)
  const [requesting, setRequesting] = useState(options.mode === 'review' || revising)
  const [fields, setFields] = useState(() => ({
    body: text(post?.body),
    profileIds: array(post?.profileIds),
    day: dateKey(post?.scheduledAt, zone) || options.day || '',
    time: timeKey(post?.scheduledAt, zone),
    reviewerId: original?.reviewerId || '',
    requestNote: '',
  }))
  const [error, setError] = useState('')

  function set(field, value) {
    setFields((previous) => ({ ...previous, [field]: value }))
    setError('')
  }

  function toggle(id) {
    set('profileIds', fields.profileIds.includes(id) ? fields.profileIds.filter((value) => value !== id) : [...fields.profileIds, id])
  }

  function save(mode) {
    const newPostId = post?.id || createId('post')
    const requestId = mode === 'review' ? createId('approval') : null
    let savedPost
    const failure = commit((current, change) => {
      const next = submitPost(current, change, { mode, postId: options.postId, previousRequestId: options.previousRequestId, fields, zone, newPostId, requestId })
      if (typeof next !== 'string') savedPost = findRecord(next.posts, newPostId)
      return next
    })
    if (failure) {
      setError(failure)
      return
    }
    const message = {
      draft: 'Draft saved.', schedule: 'Post scheduled.', reschedule: 'Post rescheduled.',
      review: revising ? 'Post resubmitted for approval.' : 'Approval requested.',
    }[mode]
    onSaved({ postId: savedPost.id, day: dateKey(savedPost?.scheduledAt, zone), requestId, message })
  }

  const title = revising ? 'Revise and resubmit' : reschedule ? 'Reschedule post' : requesting ? 'Request approval' : post ? 'Edit post' : 'New post'
  const missing = fields.profileIds.filter((id) => !findRecord(state.profiles, id))

  return <Modal title={title} onClose={onClose} wide returnFocus={options.returnFocus}>
    {revising && <div className="feedback"><strong>Rejection reason</strong><p>{text(original?.decisionNote) || 'No reason available.'}</p></div>}
    <form noValidate onSubmit={(event) => { event.preventDefault(); save(requesting ? 'review' : reschedule ? 'reschedule' : 'schedule') }}>
      <div className="composer-grid">
        <div className="composer-fields">
          {!reschedule && <>
            <fieldset className="profile-picker"><legend>Social profiles</legend>
              {profiles.map((profile) => <label className="profile-option" key={profile.id}>
                <input type="checkbox" checked={fields.profileIds.includes(profile.id)} onChange={() => toggle(profile.id)} />
                <ProfileTile profile={profile} />
                <span>{profileName(profile)}{profile.handle && <small>{profile.handle}</small>}</span>
              </label>)}
              {missing.map((id, index) => <label className="profile-option" key={`missing-${index}`}>
                <input type="checkbox" checked onChange={() => toggle(id)} />Unavailable profile
              </label>)}
              {!profiles.length && !missing.length && <p className="muted">No connected profiles.</p>}
            </fieldset>
            <label>Caption<textarea aria-label="Caption" rows="4" value={fields.body} onChange={(event) => set('body', event.target.value)} placeholder="Write your post…" /></label>
          </>}
          <fieldset><legend>Schedule <small>{zone}</small></legend>
            <div className="date-fields">
              <label>Date<input type="date" value={fields.day} onChange={(event) => set('day', event.target.value)} /></label>
              <label>Time<input type="time" value={fields.time} onChange={(event) => set('time', event.target.value)} /></label>
            </div>
          </fieldset>
          {requesting && <>
            <label>Reviewer<select aria-label="Reviewer" value={fields.reviewerId} onChange={(event) => set('reviewerId', event.target.value)}>
              <option value="">Choose a teammate</option>
              {reviewers.map((person) => <option key={person.id} value={person.id}>{text(person.name) || 'Unnamed teammate'}</option>)}
            </select></label>
            <label>Request note <small>(optional)</small><textarea aria-label="Request note" rows="2" value={fields.requestNote} onChange={(event) => set('requestNote', event.target.value)} /></label>
          </>}
        </div>
        <aside className="composer-preview">
          <h3><Icon name="review" /> Post preview</h3>
          <PostPreview post={{ body: fields.body, profileIds: fields.profileIds, scheduledAt: toInstant(fields.day, fields.time, zone) }}
            profiles={state.profiles} zone={zone} showStatus={false} />
        </aside>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <footer className="modal-actions">
        {!requesting && !reschedule && <>
          <button type="button" onClick={() => save('draft')}>Save draft</button>
          <button type="button" onClick={() => { setRequesting(true); setError('') }}>Request approval</button>
        </>}
        {requesting && !revising && <button type="button" onClick={() => { setRequesting(false); setError('') }}>Back to post</button>}
        <button type="submit" className="primary">{revising ? 'Resubmit for approval' : requesting ? 'Send request' : reschedule ? 'Save new schedule' : 'Schedule post'}</button>
      </footer>
    </form>
  </Modal>
}
