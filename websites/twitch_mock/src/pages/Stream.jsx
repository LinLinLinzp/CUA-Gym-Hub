import { useId, useState } from 'react'
import { Badge, CategoryField, Cover, Dialog, Heading, LanguageField, WorkspaceLink, categoryName, languages } from '../common.jsx'
import { editSettings, useWorkspace } from '../workspace.jsx'
import { agendaBetween, addDays, CHANNEL_ZONE, displayInstant, displayTime, onVacation, zonedParts } from '../utils/calendar.js'

const labels = {
  mature_rated_games: 'Mature-rated games',
  sexual_themes: 'Sexual themes',
  drugs_intoxication: 'Drugs, intoxication or excessive tobacco use',
  violent_graphic: 'Violent and graphic depictions',
  significant_profanity: 'Significant profanity or vulgarity',
  gambling: 'Gambling',
  politics_sensitive: 'Politics and sensitive social issues',
}

function StreamEditor({ close }) {
  const { state, commit } = useWorkspace()
  const original = state.streamSettings
  const categories = state.categories ?? []
  const [draft, setDraft] = useState(() => ({
    title: original.title ?? '', goLiveNotification: original.goLiveNotification ?? '',
    categoryId: original.categoryId ?? '', language: original.language ?? '',
    tags: original.tags ?? [], classificationLabels: original.classificationLabels ?? [],
  }))
  const [tag, setTag] = useState('')
  const [error, setError] = useState('')
  const [tagError, setTagError] = useState('')
  const inputId = useId()
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }))
  function addTag() {
    const value = tag.trim()
    if (!value) return draft.tags
    if (draft.tags.some(item => item.toLowerCase() === value.toLowerCase())) {
      setTagError('This tag is already on the list.')
      return null
    }
    if (draft.tags.length >= 10) {
      setTagError('Use up to 10 tags.')
      return null
    }
    const next = [...draft.tags, value]
    change('tags', next)
    setTag('')
    setTagError('')
    return next
  }
  function submit(event) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) {
      setError('Enter a stream title.')
      return
    }
    const tags = addTag()
    if (!tags) return
    if (tags.length > 10) {
      setTagError('Use up to 10 tags.')
      return
    }
    const patch = { ...draft, title, tags, goLiveNotification: draft.goLiveNotification.trim() }
    commit((current, tx) => editSettings(current, 'streamSettings', patch, tx, 'update_stream_info'), 'Stream info saved.')
    close()
  }
  return <Dialog title="Edit Stream Info" close={close}>
    <form className="form" onSubmit={submit}>
      <label>Title<input autoFocus value={draft.title} onChange={event => { change('title', event.target.value); setError('') }}
        aria-invalid={Boolean(error)} aria-describedby={error ? inputId : undefined} required /></label>
      {error && <p className="error" id={inputId} role="alert">{error}</p>}
      <label><span className="row between">Go Live Notification <small>{draft.goLiveNotification.length}/140</small></span>
        <textarea maxLength={140} value={draft.goLiveNotification} onChange={event => change('goLiveNotification', event.target.value)} /></label>
      <CategoryField categories={categories} value={draft.categoryId} onChange={value => change('categoryId', value)} />
      <LanguageField value={draft.language} onChange={value => change('language', value)} />
      <fieldset className="stack"><legend>Custom tags ({draft.tags.length}/10)</legend>
        {draft.tags.length > 0 && <div className="chips">{draft.tags.map((item, index) => <span className="chip" key={item + index}>{item}
          <button type="button" aria-label={'Remove tag ' + item} onClick={() => {
            change('tags', draft.tags.filter((_, position) => position !== index))
            setTagError('')
          }}>×</button></span>)}</div>}
        <div className="tag-entry"><input aria-label="New tag" aria-describedby={tagError ? inputId + '-tag' : undefined}
          value={tag} onChange={event => { setTag(event.target.value); setTagError('') }} onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); addTag() }
          }} /><button type="button" onClick={addTag}>Add tag</button></div>
        {tagError && <p className="error" id={inputId + '-tag'} role="alert">{tagError}</p>}
      </fieldset>
      <fieldset className="checklist"><legend>Content Classification Labels</legend>
        {Object.entries({ ...Object.fromEntries(draft.classificationLabels.map(key => [key, key])), ...labels }).map(([key, description]) =>
          <label className="check" key={key}><input type="checkbox" checked={draft.classificationLabels.includes(key)} onChange={event =>
            change('classificationLabels', event.target.checked ? [...draft.classificationLabels, key] : draft.classificationLabels.filter(label => label !== key))} />{description}</label>)}
      </fieldset>
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Save</button></div>
    </form>
  </Dialog>
}

function StreamSummary({ cover }) {
  const { state } = useWorkspace()
  const settings = state.streamSettings
  const categories = state.categories ?? []
  const [editing, setEditing] = useState(false)
  return <section className={'panel stream-summary' + (cover ? ' feature' : '')}>
    {cover && <Cover className="feature-art" categories={categories} categoryId={settings.categoryId} />}
    <div className="summary-content stack">
      <div className="row between"><div className="row"><h2>Stream Info</h2>{cover && <Badge status="offline" />}</div>
        <button className="primary" onClick={() => setEditing(true)}>Edit Stream Info</button></div>
      <p className="stream-title">{settings.title || 'Untitled stream'}</p>
      <dl className="summary-details">
        <div><dt>Category</dt><dd>{categoryName(categories, settings.categoryId)}</dd></div>
        <div><dt>Language</dt><dd>{languages[settings.language] || settings.language || '—'}</dd></div>
        <div><dt>Go Live Notification</dt><dd>{settings.goLiveNotification || '—'}</dd></div>
        <div><dt>Content Classification Labels</dt><dd>{(settings.classificationLabels ?? []).map(label => labels[label] || label).join(', ') || 'None selected'}</dd></div>
      </dl>
      {!!settings.tags?.length && <div className="chips" aria-label="Custom tags">{settings.tags.map((tag, index) => <span className="chip" key={tag + index}>{tag}</span>)}</div>}
    </div>
    {editing && <StreamEditor close={() => setEditing(false)} />}
  </section>
}

function VodDefaults() {
  const { state, commit } = useWorkspace()
  const settings = state.streamSettings
  const [storage, setStorage] = useState(Boolean(settings.storePastBroadcasts))
  const [publish, setPublish] = useState(Boolean(settings.alwaysPublishVods))
  const [excluded, setExcluded] = useState(settings.excludedCategoryIds ?? [])
  const categories = state.categories ?? []
  const choices = [...categories, ...excluded.filter(id => !categories.some(item => item.id === id)).map(id => ({ id, name: 'Unknown category (' + id + ')' }))]
  function save(event) {
    event.preventDefault()
    const patch = { storePastBroadcasts: storage, alwaysPublishVods: publish, excludedCategoryIds: excluded }
    commit((current, tx) => editSettings(current, 'streamSettings', patch, tx, 'update_vod_settings'), 'VOD settings saved.')
  }
  return <section className="panel stack"><h2>VOD Defaults</h2>
    <p className="muted">Choose how future broadcasts are stored and published.</p>
    <form className="form" onSubmit={save}>
      <label className="check"><input type="checkbox" checked={storage} onChange={event => setStorage(event.target.checked)} />Store Past Broadcasts</label>
      {!storage && <p className="muted" id="vod-disabled">Turn on Store Past Broadcasts to edit publishing and category exclusions.</p>}
      <fieldset className="stack" disabled={!storage} aria-describedby={storage ? undefined : 'vod-disabled'}>
        <label className="check"><input type="checkbox" checked={publish} onChange={event => setPublish(event.target.checked)} />Always Publish VODs</label>
        <fieldset><legend>Excluded Categories</legend>
          {choices.length ? <div className="checklist exclusion-list">{choices.map(item => <label className="check" key={item.id}>
            <input type="checkbox" checked={excluded.includes(item.id)} onChange={event =>
              setExcluded(value => event.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))} />{item.name || item.id}
          </label>)}</div> : <p className="muted">No categories available.</p>}
        </fieldset>
      </fieldset>
      <div><button className="primary" type="submit">Save</button></div>
    </form>
  </section>
}

function OverviewCard({ label, to, link, children }) {
  return <section className="panel overview-card">
    <h2>{label}</h2>{children}<WorkspaceLink to={to}>{link} <span aria-hidden="true">→</span></WorkspaceLink>
  </section>
}

export function Overview() {
  const { state } = useWorkspace()
  const zone = state.scheduleSettings?.timezone || CHANNEL_ZONE
  const now = new Date()
  const today = zonedParts(now, zone).date
  const next = agendaBetween(state, today, addDays(today, 62)).find(item =>
    new Date(item.startsAt) >= now && item.status === 'scheduled' && !onVacation(state.scheduleSettings, item.date))
  const video = (state.videos ?? []).filter(item => item.status !== 'deleted')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
  const categories = state.categories ?? []
  const restrictionCount = (state.viewers ?? []).filter(viewer => viewer.restriction?.type === 'ban'
    || (viewer.restriction?.type === 'timeout' && new Date(viewer.restriction.expiresAt) > now)).length
  return <><Heading title="Overview" description={'Manage the ' + (state.account?.channelName || 'Fieldnote Live') + ' channel.'} />
    <div className="overview-grid"><StreamSummary cover />
      <aside className="stack">
        <OverviewCard label="Next scheduled stream" to="/schedule" link="Open Schedule">{next ? <div>
          <h3>{next.entry.title || 'Untitled stream'}</h3><p className="muted">{displayInstant(next.startsAt, zone)} · {displayTime(next.startsAt, zone)}</p>
        </div> : <p className="muted">No upcoming streams.</p>}</OverviewCard>
        <OverviewCard label="Latest recording" to="/content/video-producer" link="Open Video Producer">{video ? <div className="recording-preview">
          <Cover categories={categories} categoryId={video.categoryId} artworkKey={video.artworkKey} /><div><h3>{video.title || 'Untitled video'}</h3>
          <Badge status={video.status} /></div></div> : <p className="muted">No recordings yet.</p>}</OverviewCard>
        <OverviewCard label="Moderation" to="/moderation" link="Open Moderation"><div className="overview-counts">
          <div><strong>{restrictionCount}</strong><small>Active restrictions</small></div>
          <div><strong>{state.modActions?.length ?? 0}</strong><small>Logged actions</small></div>
        </div></OverviewCard>
      </aside>
    </div></>
}

export function StreamSettings() {
  return <><Heading title="Stream Settings" description="Prepare your next broadcast and set recording defaults." />
    <div className="stack roomy stream-settings"><StreamSummary /><VodDefaults /></div></>
}

