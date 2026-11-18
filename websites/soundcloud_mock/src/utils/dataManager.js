// Standard client-side state sync for every mock. Copy to src/utils/dataManager.js
// and wire it as described in HARBOR_CONTRACT.md. Do not change the behaviour.
//
// Load:   ?sid= (or sessionStorage 'mock_sid') -> GET /state -> deep-merge over defaults
// Save:   every user-driven state change -> POST /post set_current (keepalive, so a
//         write right before navigating away still reaches the server)
// Never:  write state on timers or without a user action.

const KEY = (app, sid, kind) => `${app}:${kind}:${sid || '_default'}`

export const getSessionId = () => {
  const urlSid = new URLSearchParams(window.location.search).get('sid')
  if (urlSid) {
    sessionStorage.setItem('mock_sid', urlSid)
    return urlSid
  }
  return sessionStorage.getItem('mock_sid') || null
}

export const withSid = (path) => {
  const sid = getSessionId()
  if (!sid) return path
  const [base, hash = ''] = path.split('#')
  return `${base}${base.includes('?') ? '&' : '?'}sid=${encodeURIComponent(sid)}${hash ? `#${hash}` : ''}`
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v)

// Arrays from the injected state replace defaults; objects merge recursively.
export const mergeWithDefaults = (defaults, custom) => {
  if (!isObject(custom)) return defaults
  const out = { ...defaults }
  for (const k of Object.keys(custom)) {
    if (custom[k] === null || custom[k] === undefined) continue
    out[k] = isObject(custom[k]) && isObject(defaults[k]) ? mergeWithDefaults(defaults[k], custom[k]) : custom[k]
  }
  return out
}

export async function loadState(app, createInitialData) {
  const sid = getSessionId()
  const cached = localStorage.getItem(KEY(app, sid, 'current'))
  if (cached && localStorage.getItem(KEY(app, sid, 'loaded'))) return JSON.parse(cached)
  let custom = null
  try {
    const res = await fetch(sid ? `/state?sid=${encodeURIComponent(sid)}` : '/state', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data.has_custom_state) custom = data.stored_state
    }
  } catch { /* offline dev: defaults */ }
  const state = mergeWithDefaults(createInitialData(), custom)
  localStorage.setItem(KEY(app, sid, 'current'), JSON.stringify(state))
  localStorage.setItem(KEY(app, sid, 'loaded'), '1')
  // One baseline push so the server holds the full merged world from the start
  // ('set' never overwrites an existing initial state).
  fetch(sid ? `/post?sid=${encodeURIComponent(sid)}` : '/post', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set', state }),
  }).catch(() => {})
  return state
}

export function saveState(app, state) {
  const sid = getSessionId()
  localStorage.setItem(KEY(app, sid, 'current'), JSON.stringify(state))
  const body = JSON.stringify({ action: 'set_current', state })
  fetch(sid ? `/post?sid=${encodeURIComponent(sid)}` : '/post', {
    method: 'POST',
    keepalive: body.length < 60000, // browsers cap keepalive bodies at 64 KB
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {})
}
