export function queueStatePosts() {
  const send = window.fetch.bind(window)
  let pending = null

  window.fetch = (input, options) => {
    if (typeof input !== 'string' || !/^\/post(?:\?|$)/.test(input) || options?.method !== 'POST') {
      return send(input, options)
    }

    // The template uses keepalive for small snapshots. Wait for the preceding
    // upload and response to finish so multiple snapshots do not share its quota.
    const transmit = async () => {
      const response = await send(input, options)
      await response.clone().arrayBuffer()
      return response
    }
    const request = pending ? pending.then(transmit, transmit) : transmit()
    pending = request
    const clear = () => { if (pending === request) pending = null }
    request.then(clear, clear)
    return request
  }
}
