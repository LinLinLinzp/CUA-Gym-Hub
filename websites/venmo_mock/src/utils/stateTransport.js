// The shared template does not read its POST acknowledgements. Drain them in
// order so multiple full snapshots cannot exhaust Chromium's keepalive quota.
export function serializeStatePosts() {
  const fetchResponse = window.fetch.bind(window)
  let pending = null

  window.fetch = (input, options) => {
    if (options?.method !== 'POST' || typeof input !== 'string' ||
        (input !== '/post' && !input.startsWith('/post?sid='))) {
      return fetchResponse(input, options)
    }

    async function post() {
      const response = await fetchResponse(input, options)
      await response.arrayBuffer()
      return response
    }

    const result = pending ? pending.then(post) : post()
    const settled = result.then(() => {}, () => {})
    pending = settled
    settled.then(() => {
      if (pending === settled) pending = null
    })
    return result
  }
}
