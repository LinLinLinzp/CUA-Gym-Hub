import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { applyAction } from './actions.js'
import { ordered, owned, records } from './catalog.js'
import { persistState } from './utils/persist.js'

export const APP = 'imdb'
const Account = createContext(null)
const messages = {
  'watchlist.add': 'Added to your Watchlist.',
  'watchlist.remove': 'Removed from your Watchlist.',
  'watchlist.reorder': 'Watchlist order saved.',
  'watchlist.visibility': 'Watchlist visibility saved.',
  'rating.set': 'Rating saved.',
  'rating.remove': 'Rating removed.',
  'ratings.visibility': 'Ratings visibility saved.',
  'list.create': 'List created.',
  'list.edit': 'List details saved.',
  'list.delete': 'List deleted.',
  'list.item.add': 'Title added to list.',
  'list.item.remove': 'Title removed from list.',
  'list.reorder': 'List order saved.',
}

export function AccountProvider({ initialState, children }) {
  const latest = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)
  const view = useMemo(() => {
    const user = state.user || {}
    const titles = records(state.titles)
    const lists = owned(state.lists, user.id)
    const listItems = new Map(lists.map((list) => [list.id, []]))
    for (const item of records(state.listItems)) listItems.get(item.listId)?.push(item)
    for (const [id, rows] of listItems) listItems.set(id, ordered(rows))
    const watchlist = ordered(owned(state.watchlist, user.id))
    const ratings = owned(state.ratings, user.id)
    return {
      user, titles, watchlist, ratings, lists, listItems,
      titleById: new Map(titles.map((title) => [title.id, title])),
      watchByTitle: new Map(watchlist.map((row) => [row.titleId, row])),
      ratingByTitle: new Map(ratings.map((row) => [row.titleId, row])),
    }
  }, [state])

  function dispatch(input) {
    const result = applyAction(latest.current, input)
    if (!result) return null
    latest.current = result.state
    persistState(APP, result.state)
    setState(result.state)
    setNotice({ text: messages[input.type] })
    return result.entityId
  }

  return <Account.Provider value={{ ...view, dispatch, notice, clearNotice: () => setNotice(null) }}>{children}</Account.Provider>
}

export const useAccount = () => useContext(Account)
