import { loadState } from './dataManager.js'

export async function loadInitialState(app, createInitialData) {
  const transport = window.fetch
  let baseline
  // The shared loader returns after starting its baseline POST. Keep forms
  // gated until that write settles so it cannot replace a later mutation.
  window.fetch = (input, options) => {
    const request = transport.call(window, input, options)
    if (options?.method === 'POST' && typeof input === 'string' && input.split('?')[0] === '/post') {
      baseline = request.then(response => response.arrayBuffer()).catch(() => {})
    }
    return request
  }
  try {
    const state = await loadState(app, createInitialData)
    await baseline
    return state
  } finally {
    window.fetch = transport
  }
}
