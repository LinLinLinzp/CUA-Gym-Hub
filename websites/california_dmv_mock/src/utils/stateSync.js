import { createInitialData } from '../data/seed.js'
import { getSessionId, loadState, mergeWithDefaults, saveState } from './dataManager.js'

const app = 'california_dmv_mock'
const saveError = 'DMV couldn’t confirm the save. Your information is still here. Try again.'

export async function withStateLock(work) {
  const sid = getSessionId()
  const query = sid ? `?sid=${encodeURIComponent(sid)}` : ''
  const session = sid?.replace(/[^a-zA-Z0-9_-]/g, '') || '_default'
  const currentKey = `${app}:current:${sid || '_default'}`
  const loadedKey = `${app}:loaded:${sid || '_default'}`
  return navigator.locks.request(`${app}:${session}`, () => work({
    stateUrl: `/state${query}`, postUrl: `/post${query}`, currentKey, loadedKey,
  }))
}

async function readResponse(response) {
  if (!response?.ok) throw new Error('State API request failed.')
  return response.json()
}

function seedFor(custom) {
  const defaults = createInitialData()
  // The template skips nulls during merge. Use a null default only when explicitly injected.
  if (custom?.profile?.credential === null) defaults.profile.credential = null
  return defaults
}

export async function readCurrent({ stateUrl }) {
  const { stored_state: custom } = await readResponse(await fetch(stateUrl, { cache: 'no-store' }))
  return mergeWithDefaults(seedFor(custom), custom)
}

async function runTemplate({ stateUrl, postUrl }, run, readCustom) {
  const fetch = window.fetch
  let post
  // Observe the template's own fetch promise so each action still makes just one POST.
  window.fetch = (input, options) => {
    const response = fetch.call(window, input, options)
    if (input === postUrl && options?.method === 'POST') post = response
    if (input === stateUrl && readCustom) return response.then(async (result) => {
      if (result.ok) readCustom((await result.clone().json()).stored_state)
      return result
    })
    return response
  }
  try {
    return { value: await run(), post }
  } finally {
    window.fetch = fetch
  }
}

async function acknowledge(post) {
  const result = await readResponse(await post)
  if (!result.success) throw new Error('State API did not confirm the write.')
  return result
}

function cache({ currentKey }, state) {
  localStorage.setItem(currentKey, JSON.stringify(state))
}

export function loadSession() {
  return withStateLock(async (session) => {
    let custom
    const { value, post } = await runTemplate(session, () => loadState(app, () => seedFor(custom)), (state) => { custom = state })
    if (!post) {
      const latest = await readCurrent(session)
      cache(session, latest)
      return latest
    }
    try {
      await acknowledge(post)
      return value
    } catch (error) {
      localStorage.removeItem(session.currentKey)
      localStorage.removeItem(session.loadedKey)
      throw error
    }
  })
}

export async function persist(session, latest, next, findOperation) {
  try {
    const { post } = await runTemplate(session, () => {
      try {
        saveState(app, next)
      } finally {
        cache(session, latest)
      }
    })
    const { state = next } = await acknowledge(post)
    if (findOperation(state)) return state
  } catch {
    // A response can be lost after the server applies the request.
    const observed = await readCurrent(session).catch(() => null)
    if (observed && findOperation(observed)) return observed
  }
  throw new Error(saveError)
}

export async function readForTransaction(session) {
  try {
    return await readCurrent(session)
  } catch {
    throw new Error(saveError)
  }
}

export function publishState(session, state, setState) {
  cache(session, state)
  setState(state)
}
