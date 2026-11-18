import { isFuture, ordered, owned, records } from './catalog.js'

const visibilityOptions = ['private', 'public']
const idFor = (prefix) => {
  const random = crypto.getRandomValues(new Uint32Array(4))
  const suffix = Array.from(random, (part) => part.toString(16).padStart(8, '0')).join('')
  return prefix + '-' + suffix
}
const siblingsFor = (rows, row) => rows.map((item) => item.id === row.id ? row : item)
const compact = (rows, order) => {
  const positions = new Map(order.map((row, index) => [row.id, index + 1]))
  return rows.map((row) => positions.has(row?.id) && positions.get(row.id) !== row.position
    ? { ...row, position: positions.get(row.id) } : row)
}
const listFields = (input) => {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const description = typeof input.description === 'string' ? input.description : ''
  if (!name || name.length > 255 || description.length > 10000 || !visibilityOptions.includes(input.visibility)) return null
  return { name, description, visibility: input.visibility }
}

export function applyAction(state, input) {
  const userId = state.user?.id
  if (!userId) return null

  const time = new Date().toISOString()
  const { type, titleId, listId, membershipId } = input
  const getRows = (key) => Array.isArray(state[key]) ? state[key] : []
  const findTitle = (id) => records(state.titles).find((item) => item.id === id)
  const lists = getRows('lists')
  const list = owned(lists, userId).find((item) => item.id === listId)
  const finish = (patch, entityId, details, linked = {}) => ({
    state: {
      ...state, ...patch,
      stateEvents: [...getRows('stateEvents'), {
        id: idFor('event'), type, status: 'completed', userId, entityId, ...linked, createdAt: time, details,
      }],
    },
    entityId,
  })

  if (type === 'watchlist.visibility' || type === 'ratings.visibility') {
    const field = type === 'watchlist.visibility' ? 'watchlistVisibility' : 'ratingsVisibility'
    const previousVisibility = state.user[field] ?? 'private'
    const { visibility } = input
    if (!visibilityOptions.includes(visibility) || previousVisibility === visibility) return null
    return finish({ user: { ...state.user, [field]: visibility } }, userId, { previousVisibility, visibility })
  }

  if (type === 'rating.set' || type === 'rating.remove') {
    const ratings = getRows('ratings')
    const rating = owned(ratings, userId).find((item) => membershipId ? item.id === membershipId : item.titleId === titleId)
    if (type === 'rating.remove') {
      if (!rating) return null
      return finish({ ratings: ratings.filter((item) => item?.id !== rating.id) }, rating.id,
        { previousValue: rating.value ?? null, value: null }, { titleId: rating.titleId })
    }
    const { value } = input
    const title = findTitle(titleId)
    if (!title || isFuture(title) || (rating && rating.titleId !== titleId) || !Number.isInteger(value) || value < 1 || value > 10 || rating?.value === value) return null
    const row = rating ? { ...rating, value, updatedAt: time } : {
      id: idFor('rating'), userId, titleId, value, createdAt: time, updatedAt: time,
    }
    return finish({ ratings: rating ? siblingsFor(ratings, row) : [...ratings, row] }, row.id,
      { previousValue: rating?.value ?? null, value }, { titleId })
  }

  if (type === 'list.create' || type === 'list.edit') {
    const fields = listFields(input)
    if (!fields) return null
    if (type === 'list.create') {
      const row = { id: idFor('list'), userId, ...fields, createdAt: time, updatedAt: time }
      return finish({ lists: [...lists, row] }, row.id, { name: row.name, visibility: row.visibility }, { listId: row.id })
    }
    if (!list) return null
    const changes = Object.fromEntries(Object.entries(fields).filter(([key, value]) =>
      (list[key] ?? (key === 'visibility' ? 'private' : '')) !== value)
      .map(([key, value]) => [key, { previousValue: list[key] ?? null, value }]))
    if (!Object.keys(changes).length) return null
    const updates = Object.fromEntries(Object.keys(changes).map((key) => [key, fields[key]]))
    return finish({ lists: siblingsFor(lists, { ...list, ...updates, updatedAt: time }) }, listId, { changes }, { listId })
  }

  if (type === 'list.delete') {
    if (!list) return null
    const all = getRows('listItems')
    const removed = records(all).filter((item) => item.listId === listId)
    return finish({ lists: lists.filter((item) => item?.id !== listId), listItems: all.filter((item) => item?.listId !== listId) },
      listId, { name: list.name ?? '', removedItemIds: removed.map((item) => item.id), removedTitleIds: removed.map((item) => item.titleId) }, { listId })
  }

  const watch = type.startsWith('watchlist.')
  if (!watch && !list) return null
  const key = watch ? 'watchlist' : 'listItems'
  const rows = getRows(key)
  const scope = watch ? owned(rows, userId) : records(rows).filter((item) => item.listId === listId)
  const sequence = ordered(scope)
  const patch = (nextRows) => watch ? { [key]: nextRows } : {
    [key]: nextRows, lists: siblingsFor(lists, { ...list, updatedAt: time }),
  }

  if (type === 'watchlist.add' || type === 'list.item.add') {
    if (!findTitle(titleId) || sequence.some((item) => item.titleId === titleId)) return null
    const position = sequence.length + 1
    const links = watch ? { titleId } : { titleId, listId }
    const row = { id: idFor(watch ? 'watch' : 'list-item'), userId, ...links, position, createdAt: time }
    return finish(patch([...compact(rows, sequence), row]), row.id, { position }, links)
  }

  const index = sequence.findIndex((item) => item.id === membershipId)
  if (index < 0) return null
  const row = sequence[index]
  if (!watch && row.userId && row.userId !== userId) return null
  const links = watch ? { titleId: row.titleId } : { titleId: row.titleId, listId }
  const previousPosition = Number.isInteger(row.position) && row.position > 0 ? row.position : index + 1
  if (type === 'watchlist.remove' || type === 'list.item.remove') {
    const remaining = sequence.filter((item) => item.id !== row.id)
    return finish(patch(compact(rows.filter((item) => item?.id !== row.id), remaining)), row.id, { previousPosition }, links)
  }

  if (type === 'watchlist.reorder' || type === 'list.reorder') {
    const { position } = input
    if (!Number.isInteger(position) || position < 1 || position > sequence.length || index + 1 === position) return null
    sequence.splice(index, 1)
    sequence.splice(position - 1, 0, row)
    return finish(patch(compact(rows, sequence)), row.id,
      { previousPosition, position, orderedIds: sequence.map((item) => item.id) }, links)
  }
  return null
}
