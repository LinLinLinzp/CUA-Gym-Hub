import { array, id } from './model.js'

export function activity(state, type, details = {}, links = {}) {
  return {
    id: id('act'), type, actor: state.currentUser?.email || state.currentUser?.id || '',
    createdAt: new Date().toISOString(), messageIds: [], folderIds: [], filterIds: [],
    contactIds: [], listIds: [], ...links, details,
  }
}

export function record(state, patch, ...events) {
  return { ...state, ...patch, activityLog: [...array(state.activityLog), ...events] }
}
