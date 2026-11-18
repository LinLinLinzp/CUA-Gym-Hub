import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from '../utils/dataManager.js'
import { catalog, dynoSizes, regions } from './catalog.js'

export const APP = 'heroku'
const Store = createContext(null)

function newId(kind) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  return kind + '-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export const activeApps = (state) => state.apps.filter((app) => app.status !== 'deleted')
export const recordsFor = (rows, appId) => rows.filter((row) => row.appId === appId)
export const appFormations = (state, appId) =>
  recordsFor(state.formations, appId).filter((row) => row.status !== 'retired')
export const appAddOns = (state, appId) =>
  recordsFor(state.addOns, appId).filter((row) => row.status !== 'removed')

export function appNameError(state, name, appId) {
  if (!/^[a-z](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(name)) {
    return 'Use 1–30 lowercase letters, digits or hyphens. Start with a letter and end with a letter or digit.'
  }
  if (activeApps(state).some((app) => app.id !== appId && app.name?.toLowerCase() === name)) {
    return 'An app with this name already exists in your workspace.'
  }
  return ''
}

export function canRollBack(app, release, releases) {
  const active = releases.find((row) => row.id === app.activeReleaseId)
  return Boolean(active && release.version < active.version && release.status === 'succeeded')
}

function change(state, action) {
  const stamp = { actorId: state.account.id, createdAt: new Date().toISOString() }
  const updated = { actorId: stamp.actorId, updatedAt: stamp.createdAt }
  const event = { ...stamp, status: 'completed' }
  const app = activeApps(state).find((row) => row.id === action.appId)
  const updateApp = (patch) => state.apps.map((row) => row.id === app.id ? { ...row, ...updated, ...patch } : row)
  const appEvent = (fields) => [...state.appEvents, { id: newId('app-event'), ...event, ...fields }]
  const failed = (error) => ({ error })

  if (action.type === 'create') {
    const error = appNameError(state, action.name)
    if (error) return failed(error)
    if (!Object.hasOwn(regions, action.region)) return failed('Choose an available region.')
    const appId = newId('app')
    const release = {
      id: newId('release'), appId, version: 1, type: 'initial',
      status: 'succeeded', description: 'Initial app release', ...stamp,
    }
    return {
      appId,
      state: {
        ...state,
        apps: [...state.apps, {
          id: appId, name: action.name, region: action.region, stack: 'heroku-24',
          status: 'active', activeReleaseId: release.id, ...stamp, ...updated,
        }],
        releases: [...state.releases, release],
        appEvents: appEvent({ type: 'create', appId, name: action.name, initialReleaseId: release.id }),
      },
    }
  }

  if (!app) return failed('This application is no longer available.')
  const appId = app.id
  const formations = appFormations(state, appId)
  const addOns = appAddOns(state, appId)
  const releases = recordsFor(state.releases, appId)
  const dynoEvent = (fields) => [...state.dynoEvents, { id: newId('dyno-event'), appId, ...event, ...fields }]
  const appendRelease = (fields, patch = {}) => {
    const release = {
      id: newId('release'), appId, status: 'succeeded', ...stamp,
      version: releases.reduce((max, row) => Math.max(max, Number(row.version) || 0), 0) + 1,
      ...fields,
    }
    return {
      ...state, ...patch,
      apps: updateApp({ activeReleaseId: release.id }),
      releases: [...state.releases, release],
    }
  }

  switch (action.type) {
    case 'rename': {
      const error = appNameError(state, action.name, appId)
      if (error) return failed(error)
      if (action.name === app.name) return {}
      return { state: {
        ...state,
        apps: updateApp({ name: action.name }),
        appEvents: appEvent({ type: 'rename', appId, name: action.name, previousName: app.name }),
      } }
    }
    case 'delete': {
      if (action.confirmation !== (app.name ?? app.id)) return failed('Enter the current app name exactly.')
      const formationIds = formations.map((row) => row.id)
      const addOnIds = addOns.map((row) => row.id)
      return { state: {
        ...state,
        apps: updateApp({ status: 'deleted', deletedAt: stamp.createdAt }),
        formations: state.formations.map((row) => formationIds.includes(row.id)
          ? { ...row, ...updated, status: 'retired' } : row),
        addOns: state.addOns.map((row) => addOnIds.includes(row.id)
          ? { ...row, ...updated, status: 'removed', removedAt: stamp.createdAt } : row),
        appEvents: appEvent({ type: 'delete', appId, name: app.name ?? app.id, formationIds, addOnIds }),
      } }
    }
    case 'edit_dyno': {
      const formation = formations.find((row) => row.id === action.formationId)
      if (!formation) return failed('This process is no longer available.')
      const { size, quantity } = action
      const max = Object.hasOwn(dynoSizes, size) ? dynoSizes[size].max : undefined
      if (max === undefined) return failed('Choose an available dyno size.')
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > max) {
        return failed('Enter a whole number from 0 to ' + max + '.')
      }
      const previousQuantity = formation.quantity ?? 0
      const previousSize = formation.size ?? null
      if (previousQuantity === quantity && previousSize === size) return {}
      const type = previousSize === size ? 'scale' : previousQuantity === quantity ? 'resize' : 'scale_and_resize'
      return { state: {
        ...state,
        formations: state.formations.map((row) => row.id === formation.id
          ? { ...row, ...updated, size, quantity, status: quantity ? 'running' : 'stopped' } : row),
        dynoEvents: dynoEvent({ type, formationIds: [formation.id], size, quantity, previousSize, previousQuantity }),
      } }
    }
    case 'restart': {
      const running = formations.filter(isRunning)
      if (!running.length) return failed('There are no running dynos.')
      const formationIds = running.map((row) => row.id)
      return { state: {
        ...state,
        formations: state.formations.map((row) => formationIds.includes(row.id)
          ? { ...row, ...updated, lastRestartedAt: stamp.createdAt } : row),
        dynoEvents: dynoEvent({
          type: 'restart', formationIds, quantity: running.reduce((sum, row) => sum + row.quantity, 0),
        }),
      } }
    }
    case 'provision':
    case 'change_plan':
    case 'remove': {
      const instance = addOns.find((row) => row.id === action.addOnId)
      if (action.type !== 'provision' && !instance) return failed('This add-on is no longer available.')
      const service = catalog.find((row) => row.key === (instance?.serviceKey ?? action.serviceKey))
      const plan = service?.plans.find((row) => row.key === action.planKey)
      if (action.type === 'remove') {
        if (action.confirmation !== (instance.name ?? instance.id)) return failed('Enter the instance name exactly.')
      } else if (!plan) return failed('Choose an available plan.')
      if (action.type === 'change_plan' && plan.key === instance.planKey) return {}

      const eventId = newId('addon-event')
      const releaseId = newId('release')
      const addOnId = instance?.id ?? newId('addon')
      const planKey = plan?.key ?? instance?.planKey ?? null
      const monthlyPrice = plan?.monthlyPrice ?? (action.type === 'remove' ? 0 : null)
      let nextInstance
      if (instance) {
        nextInstance = action.type === 'remove'
          ? { ...instance, ...updated, status: 'removed', removedAt: stamp.createdAt }
          : { ...instance, ...updated, planKey, monthlyPrice }
      } else {
        const suffix = addOnId.slice(-8)
        nextInstance = {
          id: addOnId, appId, name: service.key + '-' + suffix, serviceKey: service.key,
          serviceName: service.name, planKey, monthlyPrice, status: 'provisioned', ...stamp, ...updated,
        }
      }
      const activeRelease = releases.find((row) => row.id === app.activeReleaseId)
      const verb = { provision: 'Provision', change_plan: 'Change plan for', remove: 'Remove' }[action.type]
      return { state: appendRelease({
        id: releaseId, type: 'add_on', addOnId, addOnEventId: eventId,
        description: verb + ' ' + (nextInstance.name ?? nextInstance.id),
        ...(activeRelease?.revision && { revision: activeRelease.revision }),
      }, {
        addOns: instance ? state.addOns.map((row) => row.id === addOnId ? nextInstance : row)
          : [...state.addOns, nextInstance],
        addOnEvents: [...state.addOnEvents, {
          id: eventId, type: action.type, appId, addOnId, releaseId, ...event, planKey, monthlyPrice,
          ...(instance && { previousPlanKey: instance.planKey ?? null, previousMonthlyPrice: instance.monthlyPrice ?? null }),
        }],
      }) }
    }
    case 'deploy': {
      const revision = action.revision.trim()
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(revision)) {
        return failed('Enter a revision of 1–80 letters, digits, dots, underscores or hyphens. Start with a letter or digit.')
      }
      return { state: appendRelease({ type: 'deploy', description: action.description.trim() || 'Deploy ' + revision, revision }) }
    }
    case 'rollback': {
      const target = releases.find((row) => row.id === action.releaseId)
      if (!target || !canRollBack(app, target, releases)) return failed('This release is no longer eligible for rollback.')
      return { state: appendRelease({
        type: 'rollback', description: 'Rollback to v' + target.version, rollbackToReleaseId: target.id,
        ...(target.revision && { revision: target.revision }),
      }) }
    }
    default:
      return failed('This action is unavailable.')
  }
}

export function isRunning(formation) {
  return formation.quantity > 0 && (formation.status ?? 'running') === 'running'
}

export function StoreProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)
  const current = useRef(initial)
  function commit(action, message) {
    const result = change(current.current, action)
    if (result.state) {
      current.current = result.state
      setState(result.state)
      saveState(APP, result.state)
      setNotice({ message })
    }
    return result
  }

  return <Store.Provider value={{ state, commit, notice, dismiss: () => setNotice(null) }}>
    {children}
  </Store.Provider>
}

export const useStore = () => useContext(Store)
