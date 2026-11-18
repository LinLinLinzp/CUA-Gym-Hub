export function installStateTransport() {
  const request = window.fetch.bind(window)
  const encoder = new TextEncoder()
  const keepaliveByteLimit = 64 * 1024
  let pending = Promise.resolve()

  // Chromium can retain a keepalive upload's byte quota until its response is read.
  // The shared state helper sends whole worlds and leaves POST responses unread.
  window.fetch = (url, options) => {
    const statePost = options?.method === 'POST' && typeof url === 'string'
      && (url === '/post' || url.startsWith('/post?'))
    if (!statePost) return request(url, options)

    // The browser applies its upload limit to UTF-8 bytes.
    const exceedsKeepaliveLimit = options.keepalive && typeof options.body === 'string'
      && encoder.encode(options.body).byteLength > keepaliveByteLimit
    const settings = exceedsKeepaliveLimit ? { ...options, keepalive: false } : options
    const send = pending.then(async () => {
      const response = await request(url, settings)
      await response.arrayBuffer()
      return response
    })
    pending = send.catch(() => {})
    return send
  }
}
