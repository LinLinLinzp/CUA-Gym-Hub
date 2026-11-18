import {
  ArrowLeft, ArrowRight, AtSign, Bookmark, ChevronDown, ChevronRight, CircleHelp,
  Menu as MenuIcon, MessageSquareText, Plus, Search, Settings, VolumeX,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { appPath, browsePath, channelPath, threadsPath } from '../utils/routes.js'
import { active, byId, channelName, channelPosts, direct, member, members, mentions, unreadPosts, userName } from '../data/selectors.js'
import { useFeedback } from './Feedback.jsx'
import { builtins } from '../data/channelActions.js'
import { Avatar, ChannelIcon, IconButton, Menu } from './UI.jsx'

const defaultCategories = Object.entries(builtins).map(([type, [name, order]]) => ({ type, name, order }))

export function Topbar({ state, user, team, navigate, openDialog, openPane, toggleDrawer }) {
  const { preferences: profile } = useFeedback()
  return <header className="topbar">
    <div className="nav-tools">
      <IconButton icon={MenuIcon} label="Toggle channel sidebar" className="mobile-only" onClick={toggleDrawer} />
      <span className="product-mark" aria-label="Mattermost" title="Mattermost">
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15.3 1.3A10.8 10.8 0 1 1 9.8 1L7 11a4.9 4.9 0 1 0 9.5 2.6c.4-1.4.2-2.7-.4-3.7L15.3 1.3Z" />
          <path fill="currentColor" d="M13.8 2.4 9.9 13a2.2 2.2 0 1 0 4.3 1.1l-.4-11.7Z" />
        </svg>
      </span>
      <Link className="product" to={appPath('/')} title="Mattermost Channels"><MessageSquareText size={17} /> Channels</Link>
      <IconButton icon={ArrowLeft} label="Go back" onClick={() => navigate(-1)} />
      <IconButton icon={ArrowRight} label="Go forward" onClick={() => navigate(1)} />
    </div>
    {team && user && <button className="global-search" type="button" onClick={() => openDialog({ kind: 'search' })}><Search size={16} /> Search</button>}
    <div className="nav-tools right">
      <IconButton icon={CircleHelp} label="Keyboard shortcuts" onClick={() => openDialog({ kind: 'shortcuts' })} />
      {team && user && <><IconButton icon={AtSign} label="Recent mentions" onClick={() => openPane({ kind: 'mentions' })} />
        <IconButton icon={Bookmark} label="Saved messages" onClick={() => openPane({ kind: 'saved' })} /></>}
      {user && <><IconButton icon={Settings} label="Settings" onClick={() => openDialog({ kind: 'settings' })} />
        <Menu label={userName(user) + ' profile'} tooltip={profile?.customStatus || userName(user)} items={[
          { label: 'Set availability', run: () => openDialog({ kind: 'settings', tab: 'Status' }) },
          { label: 'Set a custom status', run: () => openDialog({ kind: 'settings', tab: 'Status' }) },
          { label: 'Settings', run: () => openDialog({ kind: 'settings' }) },
        ]}><Avatar user={user} size={25} presence={profile?.presence ?? user.presence} /></Menu></>}
    </div>
  </header>
}

function ChannelRow({ state, team, channel, membership, selected, onSelect, category, onMove }) {
  const isDM = direct(channel)
  const other = isDM && members(state, channel.id).find(row => row.userId !== state.currentUserId)
  const person = other && byId(state.users, other.userId)
  const unread = unreadPosts(channelPosts(state, channel.id), membership.lastReadPostId, membership.lastViewedAt)
  const count = unread.filter(post => (post.mentionedUserIds ?? mentions({ ...state, currentUserId: post.userId }, channel, post.message))
    .includes(state.currentUserId)).length
  return <Link draggable onDragStart={event => {
    event.dataTransfer.setData('text/plain', channel.id)
    event.dataTransfer.effectAllowed = 'move'
  }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
    onDrop={event => { event.preventDefault(); event.stopPropagation(); onMove?.(event.dataTransfer.getData('text/plain'), category, channel.id) }}
    to={appPath(channelPath(team, channel))}
    className={'channel-row' + (selected ? ' selected' : '') + (unread.length && (!membership.muted || count) ? ' unread' : '') + (membership.muted ? ' muted' : '')}
    aria-current={selected ? 'page' : undefined}
    onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onSelect(channel) }}>
    {channel.type === 'D' && person ? <Avatar user={person} size={18} /> : <ChannelIcon channel={channel} />}
    <span>{channelName(state, channel)}</span>
    {membership.muted && <VolumeX size={13} aria-label="Muted" />}
    {count > 0 && <b className="mention-badge" aria-label={count + ' mentions'}>{count}</b>}
  </Link>
}

export function Sidebar({ state, team, channel, mode, drawer, closeDrawer, openDialog, onSelect, onCategory, onMove }) {
  const categories = state.sidebarCategories.filter(category => category?.teamId === team.id && category.userId === state.currentUserId)
  const display = [...defaultCategories.map(base => categories.find(category => category.type === base.type) ?? base),
    ...categories.filter(category => category.type === 'custom')].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const joined = state.channels.filter(item => item?.teamId === team.id && active(item))
    .map(item => ({ item, membership: member(state, item.id) })).filter(row => row.membership)
  const placed = new Set(display.flatMap(category => category.channelIds ?? []))
  const create = { label: 'Create New Channel', run: () => openDialog({ kind: 'create' }) }
  const add = [create, { label: 'Browse Channels', run: () => { closeDrawer(); openDialog({ kind: 'browse' }) } }]
  return <>
    {drawer && <button type="button" className="drawer-scrim" onClick={closeDrawer} aria-label="Close sidebar" />}
    <aside className={'team-rail' + (drawer ? ' drawer-open' : '')} aria-label="Teams">
      {state.teams.filter(Boolean).map(item => <Link key={item.id}
        className={'team-tile' + (team.id === item.id ? ' current' : '')} aria-label={item.displayName ?? item.name}
        title={item.displayName ?? item.name} to={appPath(browsePath(item))}>{(item.displayName || item.name || '?').slice(0, 2).toUpperCase()}</Link>)}
    </aside>
    <nav className={'sidebar' + (drawer ? ' drawer-open' : '')} aria-label="Channel sidebar">
      <div className="team-heading"><strong>{team.displayName || team.name}</strong><Menu icon={Plus} label="Add channels" items={add} /></div>
      <button type="button" className="find-channel" onClick={() => openDialog({ kind: 'find' })}><Search size={15} /> Find channels <kbd>Ctrl K</kbd></button>
      <Link className={'channel-row thread-link' + (mode === 'threads' ? ' selected' : '')}
        to={appPath(threadsPath(team))} onClick={closeDrawer}><MessageSquareText size={16} /><span>Threads</span></Link>
      <div className="categories">
        {display.map(category => {
          const assigned = new Set(category.channelIds ?? [])
          const rows = joined.filter(({ item, membership }) => {
            const fallback = membership.isFavorite ? 'favorites' : direct(item) ? 'direct_messages' : 'channels'
            return assigned.has(item.id) || !placed.has(item.id) && category.type === fallback
          }).sort(({ item: a }, { item: b }) => {
            const order = category.channelIds ?? []
            const indexA = order.indexOf(a.id)
            const indexB = order.indexOf(b.id)
            return (indexA < 0 ? Infinity : indexA) - (indexB < 0 ? Infinity : indexB) ||
              channelName(state, a).localeCompare(channelName(state, b))
          })
          return <section className="category" key={category.id ?? category.type} onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); onMove?.(event.dataTransfer.getData('text/plain'), category) }}>
            <div className="category-heading">
              <button type="button" onClick={() => onCategory?.(category, 'collapse')} aria-expanded={!category.collapsed}>
                {category.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}{category.name}
              </button>
              {category.type === 'direct_messages' && <IconButton icon={Plus} label="Start a direct message" size={15} onClick={() => openDialog({ kind: 'people' })} />}
              {category.type === 'channels' && <Menu icon={Plus} label="Channel actions" items={[...add, { label: 'Create category', run: () => openDialog({ kind: 'category' }) }]} />}
              {category.type === 'custom' && <Menu icon={ChevronDown} label={category.name + ' options'} items={[
                { label: 'Rename category', run: () => openDialog({ kind: 'category', category }) },
                { label: 'Delete category', run: () => onCategory?.(category, 'delete') },
              ]} />}
            </div>
            {!category.collapsed && rows.map(({ item, membership }) => <ChannelRow key={item.id} state={state} team={team} channel={item}
              membership={membership}
              selected={channel?.id === item.id} onSelect={onSelect} category={category} onMove={onMove} />)}
            {!category.collapsed && category.type === 'channels' && <Link className="channel-row add-channel" to={appPath(browsePath(team))} onClick={closeDrawer}><Plus size={16} /><span>Add channels</span></Link>}
          </section>
        })}
      </div>
    </nav>
  </>
}
