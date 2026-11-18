import { saveState } from './dataManager.js'

const jsonHeaders = { 'Content-Type': 'application/json' }

export function createStateTransport({ app, postUrl, storage, fetch }) {
  const journalKey = app + ':pending:' + postUrl
  // The outbox belongs to this tab and survives a reload. A Retry sends the
  // recorded snapshot again with the original post and activity IDs.
  let latest = JSON.parse(storage.getItem(journalKey))
  let status = { phase: latest ? 'interrupted' : 'idle', postIds: latest?.postIds ?? [] }
  let loading = true
  let baseline
  let newPostIds = null
  const listeners = new Set()

  function journal(entry) {
    if (entry) storage.setItem(journalKey, JSON.stringify(entry))
    else storage.removeItem(journalKey)
    latest = entry
  }

  function publish(phase) {
    status = { phase, postIds: latest?.postIds ?? [] }
    listeners.forEach(listener => listener())
  }

  async function send(body) {
    const response = await fetch(postUrl, {
      method: 'POST', headers: jsonHeaders, body, signal: AbortSignal.timeout(15000),
    })
    if (!response.ok || !(await response.json()).success) throw new Error('State write failed')
  }

  async function flush() {
    if (!latest || status.phase === 'saving') return
    publish('saving')
    try {
      await baseline
      while (latest) {
        const submitted = latest
        await send(submitted.body)
        if (latest === submitted) {
          journal(null)
        } else {
          // The newest snapshot includes any edits made while this one was in flight.
          const committed = new Set(submitted.postIds)
          journal({ ...latest, postIds: latest.postIds.filter(id => !committed.has(id)) })
          publish('saving')
        }
      }
      publish('idle')
    } catch {
      publish('failed')
    }
  }

  return {
    intercept(url, options) {
      if (url !== postUrl || options?.method !== 'POST') return fetch(url, options)
      if (newPostIds === null) {
        if (!loading) return fetch(url, options)
        // Let the template establish its initial snapshot before the first user write.
        const request = fetch(url, { ...options, signal: AbortSignal.timeout(15000) })
        baseline = request.catch(() => {})
        return request
      }
      journal({ body: options.body, postIds: [...(latest?.postIds ?? []), ...newPostIds] })
      if (status.phase === 'idle') return flush()
      publish(status.phase)
      return Promise.resolve()
    },
    save(state, postIds) {
      newPostIds = postIds
      try { saveState(app, state) }
      finally { newPostIds = null }
    },
    restore(initial) {
      loading = false
      return latest ? JSON.parse(latest.body).state : initial
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getStatus: () => status,
    retry: flush,
  }
}
