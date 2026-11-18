import { useState } from 'react'
import { Archive, Check, Hash, Plus, Search, Users, VolumeX } from 'lucide-react'
import { active, availableUsers, byId, canManage, canView, channelName, member, members, teamMember, userName } from '../data/selectors.js'
import { canManageMembers, isDefault, slugify } from '../data/channelActions.js'
import { Actions, Avatar, ChannelIcon, Dialog, Empty } from './UI.jsx'

export function ChannelForm({ channel, kind, close, apply }) {
  const [displayName, setDisplayName] = useState(channel?.displayName ?? '')
  const [name, setName] = useState(channel?.name ?? '')
  const [manual, setManual] = useState(Boolean(channel))
  const [type, setType] = useState('O')
  const [purpose, setPurpose] = useState('')
  const [value, setValue] = useState(channel?.[kind] ?? '')
  const [error, setError] = useState('')
  const title = { create: 'Create New Channel', rename: 'Rename Channel', header: 'Edit Channel Header', purpose: 'Edit Channel Purpose' }[kind]
  const names = kind === 'create' || kind === 'rename'
  return <Dialog title={title} close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      try {
        apply(kind === 'create' ? { displayName, name, type, purpose } : names ? { displayName, name } : { [kind]: value })
      } catch (error) { setError(error.message) }
    }}>
      <div className="content">
        {names ? <>
          <label className="field"><span>Name</span><input data-focus value={displayName} onChange={event => {
            setDisplayName(event.target.value)
            if (!manual) setName(slugify(event.target.value))
          }} /></label>
          <label className="field"><span>Channel URL</span><input value={name} onChange={event => { setManual(true); setName(event.target.value) }} /></label>
          {kind === 'create' && <>
            <fieldset className="channel-type"><legend>Channel type</legend>
              <label><input type="radio" name="type" checked={type === 'O'} onChange={() => setType('O')} /> Public</label>
              <label><input type="radio" name="type" checked={type === 'P'} onChange={() => setType('P')} /> Private</label>
            </fieldset>
            <label className="field"><span>Purpose (optional)</span><textarea value={purpose} onChange={event => setPurpose(event.target.value)} /></label>
          </>}
        </> : <label className="field"><span>{kind === 'header' ? 'Channel Header' : 'Channel Purpose'}</span>
          <textarea data-focus value={value} onChange={event => setValue(event.target.value)} /></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <Actions close={close} submit={kind === 'create' ? 'Create Channel' : 'Save'} />
    </form>
  </Dialog>
}

export function BrowseChannels({ state, team, onOpen, onJoin, onCreate, compact = false, inDialog = false }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(() => compact ? 'Joined' : 'All channels')
  const [sort, setSort] = useState('Alphabetical')
  const needle = query.trim().toLowerCase()
  const rows = state.channels.filter(channel => channel?.teamId === team.id && (!compact ? ['O', 'P'].includes(channel.type) : true) &&
    canView(state, channel) && (filter === 'Archived' ? !active(channel) : active(channel)) &&
    (filter !== 'Public' || channel.type === 'O') && (filter !== 'Joined' || member(state, channel.id)) &&
    [channelName(state, channel), channel.name, channel.purpose].some(value => String(value ?? '').toLowerCase().includes(needle)))
    .sort((a, b) => (sort === 'Recently created' ? String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) : 0) ||
      channelName(state, a).localeCompare(channelName(state, b)))

  const create = <button type="button" className="primary" onClick={onCreate}><Plus size={16} /> Create New Channel</button>
  return <>
    {!compact && !inDialog && <div className="view-header"><h1>Browse channels</h1>{create}</div>}
    <div className="browse-tools">
      <label className="search-field"><Search size={17} /><input data-focus aria-label="Search channels" placeholder="Search channels" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {!compact && <>
        <select aria-label="Channel filter" value={filter} onChange={event => setFilter(event.target.value)}>
          {['All channels', 'Public', 'Joined', 'Archived'].map(option => <option key={option}>{option}</option>)}
        </select>
        <select aria-label="Sort channels" value={sort} onChange={event => setSort(event.target.value)}>
          {['Alphabetical', 'Recently created'].map(option => <option key={option}>{option}</option>)}
        </select>
        {inDialog && create}
      </>}
    </div>
    <div className="scroll browse-results">
      {rows.length === 0 && <Empty icon={Hash} title="No channels found" />}
      {rows.map(channel => {
        const joined = member(state, channel.id)
        return <div className="result-row" key={channel.id}>
          {active(channel) ? <ChannelIcon channel={channel} size={19} /> : <Archive size={19} />}
          <div className="result-description">
            <button className="text-button" type="button" onClick={() => onOpen(channel)}>{channelName(state, channel)}</button>
            {channel.purpose && <p>{channel.purpose}</p>}
          </div>
          {!compact && <span className="result-count"><Users size={14} /> {members(state, channel.id).length}</span>}
          {!compact && <button type="button" className="secondary" onClick={() => joined ? onOpen(channel) : onJoin(channel)}>{joined ? 'Open' : 'Join'}</button>}
        </div>
      })}
    </div>
  </>
}

export function MemberList({ state, channel, close, add, remove, makeAdmin }) {
  const [query, setQuery] = useState('')
  const manage = canManageMembers(state, channel)
  const items = members(state, channel.id).map(row => ({ row, user: byId(state.users, row.userId) }))
    .filter(({ user }) => (userName(user) + ' ' + (user?.username ?? '')).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => userName(a.user).localeCompare(userName(b.user)))
  return <Dialog title="Channel members" close={close}>
    <div className="content">
      <label className="field"><span>Search members</span><input data-focus value={query} onChange={event => setQuery(event.target.value)} /></label>
      {manage && <button type="button" className="primary" onClick={add}><Plus size={15} /> Add people</button>}
      <div className="picker-list">
        {!items.length && <Empty title="No members found" />}
        {items.map(({ row, user }) => <div className="person channel-member" key={row.id}>
          <Avatar user={user} presence={user?.presence} />
          <div className="result-description"><strong>{userName(user)}</strong>{user?.username && <small>@{user.username}</small>}</div>
          <small>{row.role === 'channel_admin' ? 'Channel admin' : 'Member'}</small>
          {manage && row.userId !== state.currentUserId && <>
            {active(user) && row.role !== 'channel_admin' && <button className="secondary" type="button"
              onClick={() => makeAdmin(row.userId)}>Make channel admin</button>}
            {(!isDefault(channel) || user?.isGuest) && <button className="secondary" type="button" onClick={() => remove(row.userId)}>Remove</button>}
          </>}
        </div>)}
      </div>
    </div>
  </Dialog>
}

export function PeoplePicker({ state, team, channel, close, apply, initial = [] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(initial)
  const [error, setError] = useState('')
  const people = availableUsers(state, team.id).filter(user => user.id !== state.currentUserId && (!channel || !member(state, channel.id, user.id)) &&
    (userName(user) + ' ' + (user.username ?? '')).toLowerCase().includes(query.toLowerCase()))
  return <Dialog title={channel ? 'Add people' : 'Direct Messages'} close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      try { apply(selected) } catch (error) { setError(error.message) }
    }}>
      <div className="content">
        <label className="field"><span>Search people</span><input data-focus placeholder="Search by name or username" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="chips">{selected.map(id => <button type="button" className="secondary" key={id}
          onClick={() => setSelected(items => items.filter(item => item !== id))}>{userName(byId(state.users, id))} ×</button>)}</div>
        <div className="picker-list">
          {!people.length && <Empty title="No people found" />}
          {people.map(user => <button type="button" className="person person-option" key={user.id} disabled={!active(user)}
            aria-pressed={selected.includes(user.id)} onClick={() => {
              if (!channel && selected.length === 7 && !selected.includes(user.id)) {
                setError('For more than seven other people, create a private channel.')
                return
              }
              setError('')
              setSelected(items => items.includes(user.id) ? items.filter(id => id !== user.id) : [...items, user.id])
            }}>
            <Avatar user={user} presence={user.presence} />
            <span className="result-description"><strong>{userName(user)}</strong><small>@{user.username}{!active(user) && ' · Inactive'}</small></span>
            {selected.includes(user.id) && <Check size={17} />}
          </button>)}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <Actions close={close} submit={channel ? 'Add' : 'Start'} disabled={!selected.length} />
    </form>
  </Dialog>
}

export function Confirm({ title, description, submit, close, apply, children, disabled, danger = false }) {
  const [error, setError] = useState('')
  return <Dialog title={title} close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      try { apply() } catch (error) { setError(error.message) }
    }}>
      <div className="content"><p>{description}</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
      <Actions close={close} submit={submit} danger={danger} disabled={disabled}>{children}</Actions>
    </form>
  </Dialog>
}

export function channelMenu({ state, channel, openDialog, favorite, mute, unread, canMove }) {
  const own = member(state, channel.id)
  const manage = canManage(state, channel)
  const normal = !['D', 'G'].includes(channel.type)
  const edit = (kind, label) => ({ label, run: () => openDialog({ kind, channelId: channel.id }) })
  if (!active(channel)) return [
    manage && normal && !isDefault(channel) && teamMember(state, channel.teamId)?.role === 'team_admin' && edit('restore', 'Unarchive Channel'),
  ]
  const menu = []
  if (own && favorite) menu.push({ label: own.isFavorite ? 'Remove from Favorites' : 'Add to Favorites', run: favorite })
  if (own && mute) menu.push({ label: own.muted ? 'Unmute Channel' : 'Mute Channel', run: mute })
  if (own && unread) menu.push({ label: 'Mark as Unread', run: unread })
  if (own && canMove) menu.push(edit('move', 'Move to category'))
  if (manage && normal) menu.push(edit('header', 'Edit Channel Header'), edit('purpose', 'Edit Channel Purpose'), edit('rename', 'Rename Channel'), edit('add', 'Add people'))
  if (channel.type === 'G') menu.push(edit('people', 'Start new group with more people'))
  if (own && normal && (!isDefault(channel) || byId(state.users, state.currentUserId)?.isGuest)) menu.push(edit('leave', 'Leave Channel'))
  if (manage && normal && !isDefault(channel)) menu.push({ ...edit('archive', 'Archive Channel'), danger: true })
  return menu
}

export function ChannelInfo({ state, channel, openDialog, openPane, favorite, mute }) {
  return <div className="info-body scroll">
    <h3>{channelName(state, channel)}</h3>
    {channel.status === 'archived' && <p className="muted-text">Archived channel</p>}
    {['purpose', 'header'].map(key => <section key={key}>
      <strong>{key === 'purpose' ? 'Purpose' : 'Header'}</strong>
      <p>{channel[key] || (key === 'purpose' ? 'No purpose set' : 'No header set')}</p>
      {canManage(state, channel) && active(channel) && !['D', 'G'].includes(channel.type) &&
        <button type="button" className="text-button" onClick={() => openDialog({ kind: key, channelId: channel.id })}>Edit {key}</button>}
    </section>)}
    <div className="info-links">
      <button className="secondary" type="button" onClick={() => openDialog({ kind: 'members', channelId: channel.id })}>Members · {members(state, channel.id).length}</button>
      <button className="secondary" type="button" onClick={() => openPane({ kind: 'pins', channelId: channel.id })}>Pinned messages</button>
      <button className="secondary" type="button" onClick={() => openPane({ kind: 'files', channelId: channel.id })}>Files</button>
      {favorite && <button className="secondary" type="button" onClick={favorite}>{member(state, channel.id)?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</button>}
      {mute && <button className="secondary" type="button" onClick={mute}><VolumeX size={15} />{member(state, channel.id)?.muted ? 'Unmute' : 'Mute'}</button>}
    </div>
  </div>
}
