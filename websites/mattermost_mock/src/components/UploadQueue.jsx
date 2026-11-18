import { createContext, useContext, useRef, useState } from 'react'

const UploadQueue = createContext(null)
const empty = []

export function UploadQueueProvider({ children }) {
  const current = useRef(new Map())
  const uploadTail = useRef(Promise.resolve())
  const [queues, setQueues] = useState(current.current)

  function update(key, files) {
    const next = new Map(current.current)
    if (files.length) next.set(key, files)
    else next.delete(key)
    current.current = next
    setQueues(next)
  }

  function enqueue(upload) {
    uploadTail.current = uploadTail.current.then(upload).catch(() => {})
  }

  return <UploadQueue.Provider value={{ queues, update, enqueue, read: key => current.current.get(key) ?? empty }}>
    {children}
  </UploadQueue.Provider>
}

export function useUploadQueue(userId, channelId, rootId) {
  const { queues, update, enqueue, read } = useContext(UploadQueue)
  const key = JSON.stringify([userId, channelId, rootId])
  return { pending: queues.get(key) ?? empty, setPending: files => update(key, files), readPending: () => read(key), enqueue }
}
