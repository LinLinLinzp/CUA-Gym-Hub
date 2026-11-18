const pendingPosts = new Map()
const keepaliveLimit = 64 * 1024

export function fetchForState(url, options) {
  if (options?.method !== 'POST') return fetch(url, options)

  // The template measures string length, but browsers limit keepalive by UTF-8 bytes.
  if (options.keepalive && new TextEncoder().encode(options.body).byteLength > keepaliveLimit) {
    options = { ...options, keepalive: false }
  }
  const send = async () => {
    const response = await fetch(url, options)
    // Finish the response before the next request uses the browser's keepalive budget.
    await response.arrayBuffer()
    if (!response.ok) throw new Error(`State write failed (${response.status})`)
    return response
  }
  const previous = pendingPosts.get(url)
  const request = previous ? previous.then(send, send) : send()
  pendingPosts.set(url, request)
  const clear = () => {
    if (pendingPosts.get(url) === request) pendingPosts.delete(url)
  }
  request.then(clear, clear)
  return request
}

export const pendingStatePost = (url) => pendingPosts.get(url)
