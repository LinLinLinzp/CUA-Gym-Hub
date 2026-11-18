import { withSid } from './dataManager.js'

export function libraryPath(id, { collectionId, itemId, view } = {}) {
  const root = '/libraries/' + encodeURIComponent(id)
  const query = new URLSearchParams()
  if (view) query.set('view', view)
  if (itemId && collectionId) query.set('collection', collectionId)
  const path = itemId ? root + '/items/' + encodeURIComponent(itemId)
    : collectionId ? root + '/collections/' + encodeURIComponent(collectionId) : root
  return withSid(query.size ? path + '?' + query : path)
}

export { withSid as appPath }
