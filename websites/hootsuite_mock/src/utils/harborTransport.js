// Chromium counts an unread keepalive response against the request budget.
// Drain each Harbor write response and send snapshots in submission order.
export function installHarborTransport() {
  const fetch = window.fetch.bind(window)
  let lastWrite = Promise.resolve()
  window.fetch = (resource, options) => {
    const isStateWrite = options?.method === 'POST' && typeof resource === 'string'
      && (resource === '/post' || resource.startsWith('/post?'))
    if (!isStateWrite) return fetch(resource, options)

    const write = lastWrite.then(async () => {
      const response = await fetch(resource, options)
      await response.clone().arrayBuffer()
      return response
    })
    lastWrite = write.catch(() => {})
    return write
  }
}
