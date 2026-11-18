import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

const Workspace = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)
  const [notice, setNotice] = useState(null)

  function commit(update, message) {
    const previous = current.current
    const now = new Date().toISOString()
    const actor = previous.account?.currentUserId ?? null
    const next = update(previous, { updatedAt: now, updatedBy: actor })
    if (next === previous) return false
    current.current = next
    setState(next)
    saveState('loom', next)
    setNotice({ message })
    return true
  }

  return <Workspace.Provider value={{ state, commit, notice, setNotice }}>{children}</Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)
export const records = (items) => Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
export const status = (item) => item?.status ?? 'active'
export const isActive = (item) => status(item) === 'active'
export const userName = (user) => user?.name || 'Unknown user'
export const videoTitle = (video) => video?.title || 'Untitled video'
export const folderName = (folder) => folder?.name || 'Untitled folder'
export const findFolder = (folders, id) => id == null ? undefined : folders.find((folder) => folder.id === id)
export const videoIsVisible = (video, folders) => isActive(video) && isActive(findFolder(folders, video.folderId))

export function durationLabel(value) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

export function dateLabel(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  const now = new Date()
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date)
}
