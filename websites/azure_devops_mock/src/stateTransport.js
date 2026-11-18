export async function readCurrentState(sid) {
  const endpoint = sid ? `/state?sid=${encodeURIComponent(sid)}` : '/state'
  try {
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (response.ok) {
      const state = await response.json()
      if (state.has_custom_state) {
        if (state.stored_state && typeof state.stored_state === 'object' && !Array.isArray(state.stored_state)) {
          return state.stored_state
        }
      } else if (state.has_custom_state === false) {
        return null
      }
    }
  } catch {
    // The store must not write over server state when its current value is unknown.
  }
  throw new Error('The latest workspace state could not be read. Try again.')
}

// The Harbor helper owns the request and cache format, but discards the POST promise.
// Observe that request while the helper runs so the store can wait for acknowledgement.
export async function awaitStateWrite(sid, runHelper) {
  const endpoint = sid ? `/post?sid=${encodeURIComponent(sid)}` : '/post'
  const fetch = window.fetch
  let acknowledgement
  let result
  window.fetch = (input, options) => {
    const response = fetch.call(window, input, options)
    if (input === endpoint && options?.method === 'POST') {
      acknowledgement = response.then((reply) => reply.ok, () => false)
    }
    return response
  }
  try {
    result = await runHelper()
  } finally {
    window.fetch = fetch
  }
  if (acknowledgement && !(await acknowledgement)) {
    throw new Error('The server could not confirm the save. Try again.')
  }
  return result
}
