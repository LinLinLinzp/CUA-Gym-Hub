import { useState } from 'react'
import { byId, canPost, channelName } from '../data/selectors.js'
import { builtins } from '../data/channelActions.js'
import { MessageMarkdown } from './Markdown.jsx'
import { Actions, Dialog } from './UI.jsx'

export function ForwardDialog({ state, team, post, close, apply }) {
  const [channelId, setChannelId] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const channels = state.channels.filter(channel => channel?.teamId === team.id && canPost(state, channel) &&
    channelName(state, channel).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => channelName(state, a).localeCompare(channelName(state, b)))
  return <Dialog title="Forward message" close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      try { apply(channelId, message) } catch (failure) { setError(failure.message) }
    }}>
      <div className="content">
        <label className="field"><span>Find a channel or direct message</span><input data-focus value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label className="field"><span>Destination</span><select value={channelId} onChange={event => setChannelId(event.target.value)}>
          <option value="">Select a destination</option>
          {channels.map(channel => <option key={channel.id} value={channel.id}>{channelName(state, channel)}</option>)}
        </select></label>
        <label className="field"><span>Comment (optional)</span><textarea value={message} onChange={event => setMessage(event.target.value)} /></label>
        <blockquote className="forwarded"><MessageMarkdown message={post.message || 'Attachment'} /></blockquote>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <Actions close={close} submit="Forward" disabled={!channels.some(channel => channel.id === channelId)} />
    </form>
  </Dialog>
}

export function CategoryDialog({ state, team, category, channel, close, apply }) {
  const [name, setName] = useState(category?.name ?? '')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const custom = state.sidebarCategories.filter(row => row?.type === 'custom' && row.teamId === team.id && row.userId === state.currentUserId)
  const options = [...Object.entries(builtins).map(([type, [name]]) => ({ type, name })), ...custom]
  const title = channel ? 'Move to category' : category ? 'Rename category' : 'Create category'
  return <Dialog title={title} close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      try { apply(channel ? options.find(item => (item.id ?? item.type) === target) : name) } catch (failure) { setError(failure.message) }
    }}>
      <div className="content">
        {channel ? <label className="field"><span>Category</span><select data-focus value={target} onChange={event => setTarget(event.target.value)}>
          <option value="">Select a category</option>
          {options.map(item => <option key={item.id ?? item.type} value={item.id ?? item.type}>{item.name}</option>)}
        </select></label> : <label className="field"><span>Category name</span><input data-focus value={name} onChange={event => setName(event.target.value)} /></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <Actions close={close} submit={channel ? 'Move' : category ? 'Save' : 'Create'} disabled={channel ? !target : !name.trim()} />
    </form>
  </Dialog>
}

export function BookmarkDialog({ channel, bookmarkId, close, apply }) {
  const bookmark = byId(channel.bookmarks ?? [], bookmarkId)
  const [label, setLabel] = useState(bookmark?.label ?? '')
  const [url, setUrl] = useState(bookmark?.url ?? '')
  const [error, setError] = useState('')
  return <Dialog title={bookmark ? 'Edit bookmark' : 'Add bookmark'} close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      try { apply({ label, url }) } catch (failure) { setError(failure.message) }
    }}>
      <div className="content">
        <label className="field"><span>Label</span><input data-focus value={label} onChange={event => setLabel(event.target.value)} /></label>
        <label className="field"><span>URL</span><input type="url" value={url} onChange={event => setUrl(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <Actions close={close} />
    </form>
  </Dialog>
}
