export function prepareStateTransport() {
  const fetch = window.fetch.bind(window)
  let pending = Promise.resolve()

  window.fetch = (input, options) => {
    if (typeof input !== 'string' || !/^\/post(?:\?|$)/.test(input) || options?.method !== 'POST') {
      return fetch(input, options)
    }

    // Fetch limits keepalive payloads by UTF-8 bytes.
    const request = options.keepalive && new TextEncoder().encode(options.body).byteLength >= 60000
      ? { ...options, keepalive: false }
      : options

    // Keep whole-state uploads ordered and release Chromium's keepalive quota.
    const next = pending.then(async () => {
      const response = await fetch(input, request)
      await response.clone().arrayBuffer()
      return response
    })
    pending = next.catch(() => {})
    return next
  }
}
