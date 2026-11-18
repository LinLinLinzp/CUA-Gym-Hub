import { array, id, lower } from './model.js'

export function folderError(folders, name, parentId = null, exceptId) {
  if (!name.trim() || name.trim().length > 100) return 'Enter a folder name with 1–100 characters.'
  if (array(folders).some(folder => folder.id !== exceptId && (folder.parentId || null) === parentId && lower(folder.name?.trim()) === lower(name.trim()))) return 'A folder with that name already exists here.'
  return ''
}

export function makeFolder(folders, name, parentId = null, now = new Date().toISOString()) {
  const siblings = array(folders).filter(folder => (folder.parentId || null) === parentId)
  return { id: id('fld'), name: name.trim(), type: 'user', parentId, order: Math.max(-1, ...siblings.map(folder => Number(folder.order) || 0)) + 1, createdAt: now, updatedAt: null }
}
