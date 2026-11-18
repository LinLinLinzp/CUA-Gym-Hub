import { withSid } from './dataManager.js'

export const routeTo = (path) => new URLSearchParams(window.location.search).has('sid')
  ? path + window.location.search : withSid(path + window.location.search)
export const documentPath = (id) => '/documents/' + encodeURIComponent(id)
export const sharePath = (id) => '/share/' + encodeURIComponent(id)
