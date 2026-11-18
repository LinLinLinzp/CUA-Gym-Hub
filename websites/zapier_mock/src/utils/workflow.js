import { appName, byId, eventFor, idFor, isPublished, items } from './model.js'

export function blankStep(kind) {
  return { id: idFor('stp'), kind, appId: null, eventId: null, connectionId: null, fields: {}, lastTest: null }
}

export function connectionIssue(state, step) {
  const app = byId(state.apps, step.appId)
  if (!app || app.requiresConnection === false) return ''
  const connection = byId(state.connections, step.connectionId)
  if (!connection || connection.appId !== app.id) return 'Choose or replace the ' + appName(state, app.id) + ' connection.'
  if (connection.status !== 'active') return 'Reconnect ' + (connection.name || connection.accountLabel || appName(state, app.id)) + ' in App connections.'
  return ''
}

const literalOf = (setting) => setting?.type === 'literal' ? setting.value : setting
const validValue = (value) => value != null && (typeof value !== 'string' || value.trim() !== '')

function runStep(state, steps, index, resolve, triggerInput) {
  const step = steps[index]
  const event = eventFor(state, step)
  const label = (step.kind === 'trigger' ? 'Trigger' : 'Action ' + index) + ' — '
  if (!event || event.kind !== step.kind) return { error: label + 'Choose an app and event.' }
  const issue = connectionIssue(state, step)
  if (issue) return { error: label + issue }

  const input = {}
  for (const field of items(event.fields)) {
    if (!field.key) continue
    const fieldLabel = field.label || field.key
    const setting = step.fields?.[field.key]
    let value = literalOf(setting)
    if (setting?.type === 'mapping') {
      const source = steps.findIndex((entry) => entry.id === setting.stepId)
      if (step.kind !== 'action' || source < 0 || source >= index || !setting.outputKey) {
        return { error: label + fieldLabel + ' must map to an earlier step.' }
      }
      const previous = resolve(source)
      if (previous.error) return previous
      if (!Object.hasOwn(previous.output, setting.outputKey)) {
        return { error: label + fieldLabel + ' maps to an unavailable output.' }
      }
      value = previous.output[setting.outputKey]
    }
    if (field.required && !validValue(value)) return { error: label + 'Enter ' + fieldLabel + '.' }
    if (validValue(value)) input[field.key] = value
  }
  const output = step.kind === 'trigger'
    ? triggerInput ?? { ...event.sampleOutput }
    : { ...event.sampleOutput, data: input }
  return { input, output, error: null }
}

export function evaluateSteps(state, steps, triggerInput) {
  const results = new Map()
  function resolve(index) {
    if (!results.has(index)) results.set(index, runStep(state, steps, index, resolve, triggerInput))
    return results.get(index)
  }
  return resolve
}

export function validateWorkflow(state, steps, triggerInput) {
  if (steps[0]?.kind !== 'trigger' || steps.length < 2 || steps.slice(1).some((step) => step.kind !== 'action')) {
    return { error: 'Configure one trigger and at least one action.' }
  }
  const evaluate = evaluateSteps(state, steps, triggerInput)
  const results = steps.map((step, index) => evaluate(index))
  return { error: results.find((result) => result.error)?.error, results }
}

export function invalidateTests(steps, changedId) {
  const affected = new Set([changedId])
  return steps.map((step) => {
    const dependent = Object.values(step.fields || {}).some((setting) => setting?.type === 'mapping' && affected.has(setting.stepId))
    if (affected.has(step.id) || dependent) {
      affected.add(step.id)
      return { ...step, lastTest: null }
    }
    return step
  })
}

export const canSelectReplay = (state, run) => {
  const zap = byId(state.zaps, run.zapId)
  return run.status === 'errored' && zap && isPublished(zap) && (zap.enabled ?? zap.status === 'on')
}

export function planReplay(state, run) {
  if (run.status !== 'errored') return { error: 'Only errored runs can be replayed.' }
  const zap = byId(state.zaps, run.zapId)
  if (!zap) return { error: 'The original Zap is unavailable.' }
  if (!isPublished(zap)) return { error: 'Publish and turn on the Zap to replay this run.' }
  const steps = items(zap.publishedSteps)
  const previousTrigger = items(run.stepResults).find((result) => result.kind === 'trigger')
  if (!previousTrigger?.appId || !previousTrigger?.eventId || !run.triggerInput || typeof run.triggerInput !== 'object' || Array.isArray(run.triggerInput)) {
    return { error: 'The original trigger data is unavailable.' }
  }
  if (steps[0]?.appId !== previousTrigger.appId || steps[0]?.eventId !== previousTrigger.eventId) {
    return { error: 'The published trigger app or event has changed since this run.' }
  }
  const broken = steps.find((step) => connectionIssue(state, step))
  if (broken) return { error: connectionIssue(state, broken), repairAppId: broken.appId }
  if (!canSelectReplay(state, run)) return { error: 'Turn on the Zap to replay this run.' }
  const { results, error } = validateWorkflow(state, steps, run.triggerInput)
  if (error) return { error }
  return {
    replay: {
      zapId: zap.id, zapName: zap.name || run.zapName || 'Untitled Zap', zapVersion: Number(zap.version) || 0,
      status: 'success', taskCount: steps.filter((step) => step.kind === 'action').length, source: 'replay', replayOfRunId: run.id,
      triggerInput: run.triggerInput,
      stepResults: steps.map((step, index) => ({
        stepId: step.id, name: eventFor(state, step).name, kind: step.kind, appId: step.appId, eventId: step.eventId,
        status: 'success', ...results[index],
      })),
    },
  }
}
