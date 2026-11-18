export function installStateTransport() {
  const nativeFetch = window.fetch.bind(window)
  let pending = Promise.resolve()

  window.fetch = (input, options) => {
    if (options?.method !== 'POST' || typeof input !== 'string' || !/^\/post(?:\?|$)/.test(input)) {
      return nativeFetch(input, options)
    }

    // The shared helper leaves POST response bodies unread. Consume each reply
    // before sending the next snapshot so Chromium releases its keepalive quota.
    const send = pending.then(async () => {
      const response = await nativeFetch(input, options)
      await response.arrayBuffer()
      return response
    })
    pending = send.catch(() => {})
    return send
  }
}
