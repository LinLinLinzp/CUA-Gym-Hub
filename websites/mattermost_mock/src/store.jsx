import { createContext, useContext, useRef, useState, useSyncExternalStore } from 'react'

export const APP = 'mattermost'
const Store = createContext(null)

export function StoreProvider({ initial, transport, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const saveStatus = useSyncExternalStore(transport.subscribe, transport.getStatus)

  function dispatch(command) {
    const before = current.current
    const next = command(before)
    if (next === before) return false
    let newPostIds = []
    if (before.posts !== next.posts) {
      const beforeIds = new Set(before.posts.map(post => post?.id))
      newPostIds = next.posts.filter(post => post && !beforeIds.has(post.id)).map(post => post.id)
    }
    transport.save(next, newPostIds)
    current.current = next
    setState(next)
    return true
  }

  return <Store.Provider value={{ state, dispatch, saveStatus, retrySave: transport.retry }}>{children}</Store.Provider>
}

export function useStore() {
  return useContext(Store)
}
