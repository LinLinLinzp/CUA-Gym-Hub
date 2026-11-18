import React, { useState } from 'react'
import { Bell, FolderOpen, House, Plus, Search, Table2 } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store.jsx'
import CreateSheet from './CreateSheet.jsx'
import { AppLink, AppTab, Menu, MenuLabel } from './ui.jsx'

export default function Shell() {
  const { state } = useStore()
  const location = useLocation()
  const [creatingAt, setCreatingAt] = useState(null)
  const user = (state.users ?? []).find(item => item.id === state.currentUserId)
  const unread = (state.approvalRequests ?? []).filter(item => item.approverId === state.currentUserId && !item.readAt && item.status !== 'canceled').length
  return <>
    <header className="topbar">
      <AppLink className="brand" to="/">Smartsheet</AppLink>
      <nav className="nav nav-main" aria-label="Workspace navigation">
        <AppTab end to="/" aria-label="Home"><House size={17} /> <span>Home</span></AppTab>
        <AppTab to="/browse" aria-label="Browse" className={({ isActive }) => isActive || location.pathname.startsWith('/workspaces/') ? 'active' : ''}><FolderOpen size={18} /> <span>Browse</span></AppTab>
      </nav>
      <nav className="nav nav-actions" aria-label="Workspace actions">
        <AppTab to="/search" aria-label="Search"><Search size={18} /> <span>Search</span></AppTab>
        <AppTab to="/notifications" aria-label={unread ? 'Notifications, ' + unread + ' unread' : 'Notifications'}><Bell size={18} /> <span>Notifications</span>{unread > 0 && <b className="count">{unread}</b>}</AppTab>
      </nav>
      <span className="avatar" aria-label={user?.name || 'Account'} title={user?.name || 'Account'}>{user?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('') || '–'}</span>
      <Menu title="Create" className="create-menu" label={<MenuLabel><Plus size={17} /> Create</MenuLabel>}>
        <button type="button" onClick={() => setCreatingAt(location.key)}><Table2 size={16} /> Sheet</button>
      </Menu>
    </header>
    <Outlet />
    {creatingAt === location.key && <CreateSheet onClose={() => setCreatingAt(null)} />}
  </>
}
