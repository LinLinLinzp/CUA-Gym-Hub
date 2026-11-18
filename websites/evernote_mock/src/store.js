import { useCallback, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { APP, stampFor } from './model.js'
import { loadState, saveState } from './utils/dataManager.js'

async function loadWorkspace() {
  const fetchOriginal = window.fetch
  let baseline
  // The template starts the baseline write without awaiting it.
  // Finish it before allowing edits that would replace the current snapshot.
  window.fetch = (url, options) => {
    const response = fetchOriginal.call(window, url, options)
    if (typeof url === 'string' && /^\/post(?:\?|$)/.test(url) && options?.method === 'POST') {
      baseline = response.then((result) => result.arrayBuffer()).catch(() => {})
    }
    return response
  }
  const loaded = await loadState(APP, createInitialData).finally(() => {
    window.fetch = fetchOriginal
  })
  await baseline
  return loaded
}

function persist(state, uploads) {
  const fetchOriginal = window.fetch
  // Drain the template's unused response so Chromium releases its keepalive upload quota.
  window.fetch = (...args) => {
    const send = async () => {
      const response = await fetchOriginal.apply(window, args)
      await response.arrayBuffer()
      return response
    }
    const pending = uploads.current
    const request = (pending ? pending.then(send, send) : send()).finally(() => {
      if (uploads.current === request) uploads.current = null
    })
    uploads.current = request
    return request
  }
  try {
    saveState(APP, state)
  } finally {
    window.fetch = fetchOriginal
  }
}

export function useStore() {
  const current = useRef(null)
  const uploads = useRef(null)
  const [state, setState] = useState(null)
  useEffect(() => {
    let listening = true
    loadWorkspace().then((loaded) => {
      if (!listening) return
      current.current = loaded
      setState(loaded)
    })
    return () => { listening = false }
  }, [])
  const mutate = useCallback((apply) => {
    const previous = current.current
    const next = apply(previous, stampFor(previous))
    if (next === previous) return false
    current.current = next
    setState(next)
    persist(next, uploads)
    return true
  }, [])
  return { state, mutate }
}
