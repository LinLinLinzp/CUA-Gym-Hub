import { useState } from 'react'
import { Badge, Confirm, Dialog, Empty, Heading } from '../common.jsx'
import { makeId, useWorkspace } from '../workspace.jsx'
import { CHANNEL_ZONE, displayInstant, displayTime } from '../utils/calendar.js'

const actionNames = { timeout: 'Timeout', ban: 'Ban', unban: 'Unban', untimeout: 'Remove Timeout', delete_message: 'Delete Message' }
const resultStatuses = { timeout: 'timed_out', ban: 'banned', unban: 'clear', untimeout: 'clear', delete_message: 'deleted' }
const presets = [[60, '1 minute'], [300, '5 minutes'], [600, '10 minutes'], [1800, '30 minutes'], [3600, '1 hour'], [86400, '1 day'], [604800, '1 week'], [1209600, '2 weeks']]
const newest = (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

function activeStatus(viewer, now) {
  const restriction = viewer?.restriction
  if (restriction?.type === 'ban') return 'banned'
  if (restriction?.type === 'timeout' && Date.parse(restriction.expiresAt) > +new Date(now)) return 'timed_out'
  return 'clear'
}

function viewerName(viewer) {
  return viewer?.displayName || viewer?.login || 'Unknown viewer'
}

function Restrict({ viewer, action, close, apply }) {
  const [preset, setPreset] = useState('600')
  const [custom, setCustom] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const timeout = action === 'timeout'
  function submit(event) {
    event.preventDefault()
    const duration = Number(preset === 'custom' ? custom : preset)
    if (timeout && (!Number.isInteger(duration) || duration < 1 || duration > 1209600)) {
      setError('Enter a whole number from 1 to 1,209,600 seconds.')
      return
    }
    apply(action, viewer.id, reason.trim(), timeout ? duration : null)
    close()
  }
  return <Dialog title={timeout ? 'Timeout viewer' : 'Ban viewer?'} close={close} compact>
    <form className="form" onSubmit={submit}>
      <p>{timeout ? 'Temporarily restrict ' : 'Ban '}<strong>{viewerName(viewer)}</strong> from chat.</p>
      {timeout && <label>Duration<select value={preset} onChange={event => { setPreset(event.target.value); setError('') }}>
        {presets.map(([seconds, label]) => <option key={seconds} value={seconds}>{label}</option>)}
        <option value="custom">Custom duration</option>
      </select></label>}
      {timeout && preset === 'custom' && <label>Duration in seconds<input type="number" min="1" max="1209600" step="1" required
        value={custom} onChange={event => { setCustom(event.target.value); setError('') }} aria-describedby={error ? 'timeout-error' : undefined} /></label>}
      {error && <p className="error" id="timeout-error" role="alert">{error}</p>}
      <label>Reason (optional)<textarea maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button>
        <button className={timeout ? 'primary' : 'danger'}>{actionNames[action]}</button></div>
    </form>
  </Dialog>
}

function ModerationLog({ records, people, viewers, zone }) {
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const keyword = query.trim().toLowerCase()
  const actions = records.filter(item => {
    const viewer = viewers.get(item.viewerId)
    const actor = people.get(item.actorId)
    return (!filter || item.action === filter) && (!keyword ||
      [viewerName(viewer), viewer?.login, item.viewerId, actor?.displayName, actor?.login, item.reason].some(value => value?.toLowerCase().includes(keyword)))
  }).sort(newest)
  return <section className="panel stack"><div className="row between"><h2>Mod Actions</h2><span className="meta">{actions.length} actions</span></div>
    <div className="fields log-filters">
      <label>Search mod actions<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search viewer, moderator or reason" /></label>
      <label>Action type<select value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="">All actions</option>{Object.entries(actionNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select></label>
    </div>
    {actions.length ? <div className="table-scroll"><table className="mod-table">
      <thead><tr><th scope="col">Action</th><th scope="col">Viewer</th><th scope="col">Moderator</th><th scope="col">Reason / message</th><th scope="col">Date</th></tr></thead>
      <tbody>{actions.map(item => <tr key={item.id}>
        <td><strong>{actionNames[item.action] || item.action || 'Unknown action'}</strong>{item.durationSeconds ? <small> · {item.durationSeconds}s</small> : null}</td>
        <td>{viewerName(viewers.get(item.viewerId))}{!viewers.has(item.viewerId) && item.viewerId && <small className="block">{item.viewerId}</small>}</td>
        <td>{people.get(item.actorId)?.displayName || people.get(item.actorId)?.login || item.actorId || 'Unknown moderator'}</td>
        <td>{item.reason || (item.messageId ? 'Message ' + item.messageId : '—')}</td>
        <td className="metric nowrap">{displayInstant(item.createdAt, zone)} <small>{displayTime(item.createdAt, zone)}</small></td>
      </tr>)}</tbody>
    </table></div> : <Empty title={records.length ? 'No actions match these filters.' : 'No moderation actions logged.'}>
      {(filter || query) && <button onClick={() => { setFilter(''); setQuery('') }}>Clear log filters</button>}
    </Empty>}
  </section>
}

export function Moderation() {
  const { state, commit } = useWorkspace()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const viewers = state.viewers ?? []
  const now = new Date()
  const zone = state.scheduleSettings?.timezone || CHANNEL_ZONE
  const lookup = new Map(viewers.map(viewer => [viewer.id, viewer]))
  const actors = new Map([state.account, ...(state.moderators ?? [])].filter(Boolean).map(actor => [actor.id, actor]))
  const query = search.trim().toLowerCase()
  const matching = viewers.filter(viewer => (!filter || activeStatus(viewer, now) === filter)
    && (!query || viewerName(viewer).toLowerCase().includes(query) || (viewer.login ?? '').toLowerCase().includes(query)))
  const selected = lookup.get(selectedId) ?? matching[0]
  const status = activeStatus(selected, now)
  const chats = selected ? (state.chatMessages ?? []).filter(message => message.viewerId === selected.id).sort(newest) : []

  function apply(action, viewerId, reason = '', durationSeconds = null, messageId) {
    commit((current, tx) => {
      const records = current.viewers ?? []
      const viewer = records.find(item => item.id === viewerId)
      if (!viewer) return current
      const priorStatus = activeStatus(viewer, tx.now)
      const result = resultStatuses[action]
      const audit = { id: makeId('mod-action'), action, actorId: tx.actorId, viewerId, reason, resultingStatus: result, createdAt: tx.now }
      let next = current
      if (action === 'delete_message') {
        const messages = current.chatMessages ?? []
        const message = messages.find(item => item.id === messageId && item.viewerId === viewerId)
        if (!message || message.status === 'deleted') return current
        audit.messageId = messageId
        next = { ...current, chatMessages: messages.map(item => item.id === messageId
          ? { ...item, status: 'deleted', deletedAt: tx.now, deletedBy: tx.actorId } : item) }
      } else {
        if (action === 'timeout' && priorStatus === 'banned') return current
        if (action === 'ban' && priorStatus === 'banned') return current
        if (action === 'unban' && priorStatus !== 'banned') return current
        if (action === 'untimeout' && priorStatus !== 'timed_out') return current
        const expiresAt = durationSeconds ? new Date(Date.parse(tx.now) + durationSeconds * 1000).toISOString() : null
        if (durationSeconds) Object.assign(audit, { durationSeconds, expiresAt })
        if (priorStatus !== 'clear' && viewer.restriction.actionId) audit.relatedActionId = viewer.restriction.actionId
        const restriction = action === 'timeout' || action === 'ban'
          ? { type: action, reason, startedAt: tx.now, expiresAt, actionId: audit.id } : null
        next = { ...current, viewers: records.map(item => item.id === viewerId ? { ...item, restriction, updatedAt: tx.now } : item) }
      }
      return { ...next, modActions: [...(current.modActions ?? []), audit] }
    }, { timeout: 'Viewer timed out.', ban: 'Viewer banned.', unban: 'Viewer unbanned.', untimeout: 'Timeout removed.', delete_message: 'Message deleted.' }[action])
  }

  return <><Heading title="Moderation" description="Review viewers, recent chat and moderation history." />
    <div className="stack roomy">
      <div className="moderation-grid">
        <section className="panel stack viewer-list"><h2>Viewers</h2>
          <label>Search viewers<input type="search" value={search} onChange={event => { setSearch(event.target.value); setSelectedId(null) }} placeholder="Search by name or login" /></label>
          <label>Restriction<select value={filter} onChange={event => { setFilter(event.target.value); setSelectedId(null) }}>
            <option value="">All restrictions</option><option value="clear">Clear</option><option value="timed_out">Timed out</option><option value="banned">Banned</option>
          </select></label>
          {matching.length ? <div className="viewer-results">{matching.map(viewer =>
            <button key={viewer.id} aria-pressed={viewer.id === selected?.id} onClick={() => setSelectedId(viewer.id)}>
              <span><strong>{viewerName(viewer)}</strong>{viewer.login && <small className="block">@{viewer.login}</small>}</span>
              <Badge status={activeStatus(viewer, now)} />
            </button>)}</div> : <Empty title={viewers.length ? 'No viewers match these filters.' : 'No viewers available.'}>
              {(search || filter) && <button onClick={() => { setSearch(''); setFilter(''); setSelectedId(null) }}>Clear viewer filters</button>}
            </Empty>}
        </section>
        <section className="panel stack viewer-detail">
          {selected ? <>
            <div className="row between"><div><h2>{viewerName(selected)}</h2>{selected.login && <p className="muted">@{selected.login}</p>}</div><Badge status={status} /></div>
            {(selected.joinedAt || (status !== 'clear' && selected.restriction?.reason)) && <div className="meta">
              {selected.joinedAt && <p>Joined {displayInstant(selected.joinedAt, zone)}</p>}
              {status !== 'clear' && selected.restriction?.reason && <p>Reason: {selected.restriction.reason}</p>}
              {status === 'timed_out' && <p>Until {displayInstant(selected.restriction.expiresAt, zone)} at {displayTime(selected.restriction.expiresAt, zone)}</p>}
            </div>}
            <div className="actions">
              {status === 'banned' ? <button className="primary" onClick={() => apply('unban', selected.id)}>Unban</button> : <>
                {status === 'timed_out' ? <button onClick={() => apply('untimeout', selected.id)}>Remove Timeout</button>
                  : <button className="primary" onClick={() => setDialog({ action: 'timeout', viewer: selected })}>Timeout</button>}
                <button className="danger-text" onClick={() => setDialog({ action: 'ban', viewer: selected })}>Ban</button>
              </>}
            </div>
            <div className="recent-chat stack"><h3>Recent Chat</h3>
              {chats.length ? <ul className="chat-list">{chats.map(message => <li key={message.id}>
                <div><p>{message.status === 'deleted' ? 'Message removed' : message.text || 'Message text unavailable'}</p>
                  <small>{displayInstant(message.createdAt, zone)} · {displayTime(message.createdAt, zone)}</small></div>
                {message.status === 'deleted' ? <Badge status="deleted" /> : <button className="danger-text"
                  onClick={() => setDialog({ action: 'delete_message', viewer: selected, message })}>Delete Message</button>}
              </li>)}</ul> : <Empty title="No recent chat from this viewer." />}
            </div>
          </> : <Empty title="Select a viewer to review their profile." />}
        </section>
      </div>
      <ModerationLog records={state.modActions ?? []} people={actors} viewers={lookup} zone={zone} />
    </div>
    {dialog && (dialog.action === 'delete_message' ? <Confirm title="Delete message?" close={() => setDialog(null)} verb="Delete Message" confirm={() => {
      apply('delete_message', dialog.viewer.id, '', null, dialog.message.id)
      setDialog(null)
    }}>Remove this message from {viewerName(dialog.viewer)}? “{dialog.message.text || 'Message text unavailable'}”</Confirm>
      : <Restrict viewer={dialog.viewer} action={dialog.action} close={() => setDialog(null)} apply={apply} />)}
  </>
}

