import { actorOf, rows } from './access.js'
import { applyFragment, blockAttributes, bodyText, fragmentLength, inBounds, mergeRuns, normalizeBody, sliceFragment } from './body.js'
import { created, newId, replaceRow, updated } from './documents.js'

export function rangesOverlap(a, b) {
  if (a.start === a.end && b.start === b.end) return a.start === b.start
  if (a.start === a.end) return b.start < a.start && a.start < b.end
  if (b.start === b.end) return a.start < b.start && b.start < a.end
  return a.start < b.end && b.start < a.end
}

function mapAnchor(anchor, source, range, text, target) {
  if (!anchor || anchor.detached) return anchor
  if (!inBounds(source, anchor)) return { ...anchor, detached: true }
  const { start, end } = range
  const size = text.length
  const delta = size - (end - start)
  if (anchor.start === anchor.end) {
    const point = anchor.start < start ? anchor.start : anchor.start >= end ? anchor.start + delta : start + size
    return point === anchor.start ? anchor : { ...anchor, start: point, end: point }
  }
  if (start !== end && start <= anchor.start && end >= anchor.end) return { ...anchor, detached: true }
  if (anchor.end <= start) return anchor
  const nextStart = anchor.start >= end ? anchor.start + delta : Math.min(anchor.start, start)
  const nextEnd = anchor.end >= end ? anchor.end + delta : start + size
  return { ...anchor, start: nextStart, end: nextEnd, quote: bodyText(target).slice(nextStart, nextEnd) }
}

export function applyAccepted(state, docId, source, range, fragment, formatScope, skipIds = new Set()) {
  const target = applyFragment(source, range, fragment, { paragraph: formatScope === 'paragraph', allocate: () => newId('block') })
  const text = bodyText(fragment)
  if (text === bodyText(source).slice(range.start, range.end)) return { state, body: target }

  const delta = fragmentLength(fragment) - (range.end - range.start)
  const commentThreads = rows(state, 'commentThreads').map((thread) => {
    if (thread.documentId !== docId) return thread
    const anchor = mapAnchor(thread.anchor, source, range, text, target)
    return anchor === thread.anchor ? thread : { ...thread, anchor }
  })
  const trackedChanges = rows(state, 'trackedChanges').map((change) => {
    if (change.documentId !== docId || change.status !== 'pending' || !inBounds(source, change.range) || skipIds.has(change.id)) return change
    const follows = change.range.start >= range.end
    if (!follows || !delta) return change
    return { ...change, range: { start: change.range.start + delta, end: change.range.end + delta } }
  })
  return { body: target, state: { ...state, commentThreads, trackedChanges } }
}

export function commitAccepted(state, docId, range, after, formatScope) {
  const doc = rows(state, 'documents').find((entry) => entry.id === docId)
  const actor = actorOf(state)?.id
  if (!actor || !doc) return state
  const source = normalizeBody(doc.body, doc.id)
  if (!inBounds(source, range)) return state
  const before = sliceFragment(source, range, formatScope === 'paragraph')
  if (JSON.stringify(before) === JSON.stringify(after)) return state
  const result = applyAccepted(state, docId, source, range, after, formatScope)
  return { ...result.state, documents: replaceRow(rows(state, 'documents'), docId, {
    body: result.body, revision: (doc.revision ?? 0) + 1, ...updated(actor, new Date().toISOString()),
  }) }
}

export function pendingChanges(state, docId) {
  return rows(state, 'trackedChanges').filter((change) => change.documentId === docId && change.status === 'pending')
    .sort((a, b) => (a.range?.start ?? Infinity) - (b.range?.start ?? Infinity)
      || String(a.createdAt ?? '').localeCompare(b.createdAt ?? '') || String(a.id).localeCompare(b.id))
}

export function projectBody(body, pending) {
  const entries = []
  let offset = 0
  const ordered = [...pending].sort((a, b) => {
    if (!a.range || !b.range || a.range.start !== b.range.start) return 0
    return Number(a.range.start !== a.range.end) - Number(b.range.start !== b.range.end)
  })
  for (const change of ordered) {
    const range = change.range
    const valid = inBounds(body, range) && Array.isArray(change.after?.blocks) &&
      !entries.some((entry) => entry.valid && rangesOverlap(entry.change.range, range))
    if (!valid) {
      entries.push({ change, valid: false })
      continue
    }
    const start = range.start + offset
    const length = fragmentLength(change.after)
    entries.push({ change, valid: true, start, end: start + length })
    offset += length - (range.end - range.start)
  }
  const result = entries.reduceRight((current, { change, valid }) => valid
    ? applyFragment(current, change.range, change.after, { paragraph: change.formatScope === 'paragraph' }) : current, body)
  return { body: result, entries }
}

export function projectPoint(entries, point, side = 'start') {
  let offset = 0
  for (const { change, valid, start, end } of entries) {
    if (!valid) continue
    const range = change.range
    if (point < range.start || (point === range.start && side === 'start')) break
    if (point < range.end || (point === range.end && range.start !== range.end)) {
      if (change.kind === 'format' && end - start === range.end - range.start) return start + point - range.start
      return side === 'start' && point < range.end ? start : end
    }
    offset += (end - start) - (range.end - range.start)
  }
  return point + offset
}

export function acceptedPoint(entries, point, side = 'start') {
  let offset = 0
  for (const { change, valid, start, end } of entries) {
    if (!valid) continue
    const range = change.range
    if (point < start) break
    if (point === start && start === end) return side === 'start' ? range.end : range.start
    if (point === start) return range.start
    if (point < end) {
      if (change.kind === 'format' && end - start === range.end - range.start) return range.start + point - start
      return side === 'end' ? range.end : range.start
    }
    if (point === end) return range.end
    offset += (end - start) - (range.end - range.start)
  }
  return point - offset
}

export function anchorInAccepted(entries, range, quote) {
  const proposal = entries.find(({ change, valid, start, end }) => valid && change.kind !== 'format' &&
    start < end && start <= range.start && range.end <= end)
  if (proposal) {
    const start = proposal.change.range.start
    return { start, end: start, quote, detached: false }
  }
  const start = acceptedPoint(entries, range.start)
  const end = range.start === range.end ? start : acceptedPoint(entries, range.end, 'end')
  return { start, end: Math.max(start, end), quote, detached: false }
}

export function setTracking(state, docId, mode) {
  const actor = actorOf(state)?.id
  const doc = rows(state, 'documents').find((entry) => entry.id === docId)
  if (!actor || !doc || !['off', 'mine', 'everyone'].includes(mode)) return state
  if ((doc.tracking?.mode ?? 'off') === mode && (mode !== 'mine' || doc.tracking?.updatedByUserId === actor)) return state
  const time = new Date().toISOString()
  const meta = updated(actor, time)
  return { ...state, documents: replaceRow(rows(state, 'documents'), docId, {
    tracking: { ...created(actor, time), ...doc.tracking, mode, ...meta }, ...meta,
  }) }
}

function canonicalFragment(fragment) {
  return { blocks: (fragment?.blocks ?? []).map((block) => ({ ...blockAttributes(block), runs: mergeRuns(block?.runs) })) }
}

const fragmentMatches = (a, b) => JSON.stringify(canonicalFragment(a)) === JSON.stringify(canonicalFragment(b))
const changeKind = (range, after, formatScope) => formatScope ? 'format'
  : range.start === range.end ? 'insert' : fragmentLength(after) ? 'replace' : 'delete'

export function editDocument(state, docId, mode, range, input, formatScope) {
  const actor = actorOf(state)?.id
  const doc = rows(state, 'documents').find((entry) => entry.id === docId)
  if (!actor || !doc || mode === 'viewing') return { state }
  const source = normalizeBody(doc.body, doc.id)
  const projection = projectBody(source, pendingChanges(state, docId))
  if (!inBounds(projection.body, range)) return { state }
  const entries = projection.entries.filter((entry) => entry.valid)
  const contained = entries.find(({ change, start, end }) => change.authorId === actor &&
    start <= range.start && range.end <= end && (
      (!formatScope && change.kind !== 'format') ||
      (formatScope === 'inline' && ['insert', 'replace'].includes(change.kind))
    ))
  const time = new Date().toISOString()
  let after = canonicalFragment(input)
  if (contained) {
    const { change, start } = contained
    const before = canonicalFragment(change.before)
    const proposed = normalizeBody(change.after, change.id)
    const local = { start: range.start - start, end: range.end - start }
    after = canonicalFragment(applyFragment(proposed, local, after))
    if (!fragmentLength(after)) after = { blocks: [] }
    if (fragmentMatches(after, change.after)) return { state }
    const withdrawn = fragmentMatches(before, after)
    const patch = withdrawn
      ? { after, status: 'withdrawn', decidedAt: time, decidedByUserId: actor }
      : { after, kind: changeKind(change.range, after, change.formatScope) }
    return { state: { ...state, trackedChanges: replaceRow(rows(state, 'trackedChanges'), change.id, { ...patch, ...updated(actor, time) }) } }
  }

  const start = acceptedPoint(entries, range.start)
  const end = range.start === range.end ? start : acceptedPoint(entries, range.end, 'end')
  const acceptedRange = { start, end }
  if (entries.some((entry) => rangesOverlap(entry, range) || rangesOverlap(entry.change.range, acceptedRange)) || start > end) {
    return { state, error: 'Decide the overlapping tracked change before editing this text.' }
  }
  if (!inBounds(source, acceptedRange)) return { state }
  const before = sliceFragment(source, acceptedRange, formatScope === 'paragraph')
  if (fragmentMatches(before, after)) return { state }
  const tracks = mode === 'reviewing' || doc.tracking?.mode === 'everyone' ||
    (doc.tracking?.mode === 'mine' && doc.tracking?.updatedByUserId === actor)
  if (!tracks) return { state: commitAccepted(state, docId, acceptedRange, after, formatScope) }
  const change = {
    id: newId('change'), documentId: docId, authorId: actor,
    kind: changeKind(acceptedRange, after, formatScope), range: acceptedRange, before, after,
    ...(formatScope ? { formatScope } : {}),
    status: 'pending', decidedAt: null, decidedByUserId: null, ...created(actor, time),
  }
  return { state: { ...state, trackedChanges: [...rows(state, 'trackedChanges'), change] } }
}

export function decideChanges(state, docId, decision, id) {
  const actor = actorOf(state)?.id
  const doc = rows(state, 'documents').find((entry) => entry.id === docId)
  if (!actor || !doc || !['accepted', 'rejected'].includes(decision)) return state
  const body = normalizeBody(doc.body, doc.id)
  const entries = projectBody(body, pendingChanges(state, docId)).entries
  const selected = entries.filter(({ change, valid }) => (!id || change.id === id) && (decision === 'rejected' || valid))
  if (!selected.length) return state

  const ids = new Set(selected.map(({ change }) => change.id))
  let result = { state, body }
  if (decision === 'accepted') {
    result = selected.reduceRight((current, { change }) =>
      applyAccepted(current.state, docId, current.body, change.range, change.after, change.formatScope, ids), result)
  }
  const time = new Date().toISOString()
  const meta = updated(actor, time)
  return {
    ...result.state,
    trackedChanges: rows(result.state, 'trackedChanges').map((change) => ids.has(change.id) ? {
      ...change, status: decision, decidedAt: time, decidedByUserId: actor, ...meta,
    } : change),
    documents: replaceRow(rows(result.state, 'documents'), docId, {
      ...(decision === 'accepted' ? { body: result.body, revision: (doc.revision ?? 0) + 1 } : {}), ...meta,
    }),
  }
}
