import { useState } from 'react'
import { AppearanceSettings } from '../components/Appearance.jsx'
import { useStore } from '../state/Store.jsx'
import { isPublisher, setPublicationComments } from '../state/comments.js'

export default function Settings() {
  const { state, commit } = useStore()
  const saved = state.publication.commentsEnabled !== false
  const [draft, setDraft] = useState(null)
  const checked = draft ?? saved
  const editable = isPublisher(state)
  const dirty = editable && checked !== saved
  function submit(event) {
    event.preventDefault()
    if (dirty) commit(previous => setPublicationComments(previous, checked), 'Community settings saved')
    setDraft(null)
  }
  return <div className="page settings-page">
    <div className="page-heading"><h1>Settings</h1></div>
    <section className="panel settings-panel" id="community" aria-labelledby="community-heading">
      <div className="section-heading"><h2 id="community-heading">Community</h2></div>
      <form onSubmit={submit}>
        <label className="settings-row">
          <span><strong>Enable comments</strong><small>Allow eligible readers to join discussions on published posts.</small></span>
          <input className="setting-switch" type="checkbox" role="switch" aria-label="Enable comments" checked={checked}
            disabled={!editable} onChange={event => setDraft(event.target.checked)} />
        </label>
        <div className="settings-footer">
          {dirty && <button className="button" type="button" onClick={() => setDraft(null)}>Cancel</button>}
          <button className="button primary" type="submit" disabled={!dirty}>Save changes</button>
        </div>
      </form>
    </section>
    <AppearanceSettings />
  </div>
}
