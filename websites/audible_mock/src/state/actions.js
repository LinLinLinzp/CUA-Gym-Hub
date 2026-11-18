import {
  activeLibrary, activeWish, oneYearLater, orderById, purchaseBlock,
  returnBlock, rows, titleById, titleLabel, usableCredits,
} from './selectors.js'

function id(kind) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${kind}-${hex}`
}
const denied = (message) => ({ notice: { message, error: true } })
const updated = (state, message, links) => ({ state, notice: { message, links } })
const replace = (entries, previous, next) => entries.map((entry) => entry === previous ? next : entry)
const newLibrary = (titleId, source, actorId, createdAt) => ({
  id: id('lib'), titleId, source, actorId, createdAt, updatedAt: createdAt,
  status: 'active', listeningStatus: 'not_started', progressPercent: 0,
})

function libraryEvent(entry, action, actorId, createdAt, links = {}) {
  const {
    id: libraryId, titleId, purchaseId, status, listeningStatus = 'not_started', progressPercent = 0,
  } = entry
  return {
    id: id('lib-event'), libraryId, titleId, actorId, action, status, listeningStatus,
    progressPercent, createdAt, quantity: 1, ...(purchaseId && { purchaseId }), ...links,
  }
}

function changeLibrary(state, entry, changes, action, actorId, now, message) {
  const next = { ...entry, ...changes, updatedAt: now }
  return updated({
    ...state,
    library: replace(rows(state, 'library'), entry, next),
    libraryActivity: [...rows(state, 'libraryActivity'), libraryEvent(next, action, actorId, now)],
  }, message)
}

function buyTitle(state, title, actorId, clock, now) {
  const reason = purchaseBlock(state, title, clock)
  if (reason) return denied(reason)

  const credit = usableCredits(state, clock)[0]
  const titleId = title.id
  const purchaseId = id('order')
  const order = {
    id: purchaseId, titleId, actorId, creditId: credit.id,
    status: 'completed', paymentMethod: 'credit', quantity: 1, amountCredits: 1, amountUsd: 0, createdAt: now,
  }
  const entry = { ...newLibrary(titleId, 'purchased', actorId, now), purchaseId }
  const wish = activeWish(state, titleId)
  const transaction = {
    id: id('credit-txn'), creditId: credit.id, actorId, type: 'redeemed', status: 'completed',
    titleId, purchaseId, quantity: 1, amount: -1, createdAt: now,
  }

  return updated({
    ...state,
    credits: replace(rows(state, 'credits'), credit, { ...credit, status: 'spent', purchaseId, spentAt: now }),
    creditTransactions: [...rows(state, 'creditTransactions'), transaction],
    purchases: [...rows(state, 'purchases'), order],
    library: [...rows(state, 'library'), entry],
    libraryActivity: [...rows(state, 'libraryActivity'), libraryEvent(entry, 'acquired', actorId, now)],
    ...(wish && {
      wishlist: replace(rows(state, 'wishlist'), wish, { ...wish, status: 'purchased', purchaseId, updatedAt: now }),
    }),
  }, `${titleLabel(title)} was added to your Library.`, [
    { to: '/library', label: 'Go to Library' },
    { to: `/account/purchases/${encodeURIComponent(purchaseId)}`, label: 'View order details' },
  ])
}

function returnTitle(state, order, actorId, clock, now) {
  const reason = returnBlock(state, order, clock)
  if (reason) return denied(reason)

  const { id: purchaseId, titleId } = order
  const returnId = id('return')
  const refundCreditId = id('credit')
  const refundAmounts = { quantity: 1, amountCredits: 1, amountUsd: 0 }
  const refund = {
    id: returnId, purchaseId, actorId, status: 'completed', refundCreditId, createdAt: now,
    ...refundAmounts, items: [{ titleId, purchaseId, ...refundAmounts }],
  }
  const credit = {
    id: refundCreditId, actorId, source: 'return', quantity: 1, status: 'available',
    returnId, createdAt: now, expiresAt: oneYearLater(clock),
  }
  const transaction = {
    id: id('credit-txn'), creditId: refundCreditId, actorId, type: 'refund', status: 'completed',
    titleId, purchaseId, returnId, quantity: 1, amount: 1, createdAt: now,
  }
  const entry = rows(state, 'library').find((row) =>
    row.purchaseId === purchaseId && row.source === 'purchased' && row.status === 'active',
  )
  const nextEntry = entry && { ...entry, status: 'returned', updatedAt: now }
  return updated({
    ...state,
    purchases: replace(rows(state, 'purchases'), order, { ...order, status: 'returned', returnedAt: now, returnId }),
    returns: [...rows(state, 'returns'), refund],
    credits: [...rows(state, 'credits'), credit],
    creditTransactions: [...rows(state, 'creditTransactions'), transaction],
    ...(entry && {
      library: replace(rows(state, 'library'), entry, nextEntry),
      libraryActivity: [...rows(state, 'libraryActivity'), libraryEvent(nextEntry, 'returned', actorId, now, { returnId })],
    }),
  }, 'Title returned. One credit was added to your balance.', [
    { to: '/account/purchases?view=refunds', label: 'View refund history' },
    { to: '/account/credits', label: 'View credit summary' },
  ])
}

export function applyAction(state, action, clock) {
  const actorId = state.account?.id
  if (!actorId) return denied('Your membership details are unavailable.')

  const now = clock.toISOString()
  const title = titleById(state, action.titleId)
  const label = titleLabel(title)

  if (action.type === 'buy') return buyTitle(state, title, actorId, clock, now)
  if (action.type === 'return') return returnTitle(state, orderById(state, action.purchaseId), actorId, clock, now)

  if (action.type === 'save_wish' || action.type === 'remove_wish') {
    const wish = activeWish(state, action.titleId)
    const list = rows(state, 'wishlist')
    if (action.type === 'remove_wish') {
      if (!wish) return denied('This title is no longer in your Wish List.')
      const wishlist = replace(list, wish, { ...wish, status: 'removed', updatedAt: now })
      return updated({ ...state, wishlist }, `${label} was removed from your Wish List.`)
    }
    if (!title?.id || wish || activeLibrary(state, title.id)) return denied('This title cannot be saved.')
    const entry = { id: id('wish'), titleId: title.id, actorId, status: 'saved', createdAt: now, updatedAt: now }
    return updated({ ...state, wishlist: [...list, entry] }, `${label} was saved to your Wish List.`, [
      { to: '/wishlist', label: 'View Wish List' },
    ])
  }

  if (action.type === 'add_included') {
    if (!title?.id || title.included !== true || activeLibrary(state, title.id)) {
      return denied('This title cannot be added to your Library.')
    }
    const list = rows(state, 'library')
    const removed = list.filter((row) =>
      row.titleId === title.id && row.source === 'included' && row.status === 'removed',
    ).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0]
    const entry = removed
      ? { ...removed, status: 'active', updatedAt: now }
      : newLibrary(title.id, 'included', actorId, now)
    return updated({
      ...state,
      library: removed ? replace(list, removed, entry) : [...list, entry],
      libraryActivity: [...rows(state, 'libraryActivity'), libraryEvent(entry, 'added_included', actorId, now)],
    }, `${label} was added to your Library.`, [{ to: '/library', label: 'Go to Library' }])
  }

  const entry = rows(state, 'library').find((row) => row.id === action.libraryId && row.status === 'active')
  if (!entry?.titleId) return denied('This title is no longer in your Library.')
  const entryLabel = titleLabel(titleById(state, entry.titleId))
  if (action.type === 'remove_included' && entry.source === 'included') {
    return changeLibrary(state, entry, { status: 'removed' }, 'removed_included', actorId, now,
      `${entryLabel} was removed from your Library.`)
  }
  if (action.type === 'finish' && entry.listeningStatus !== 'finished') {
    return changeLibrary(state, entry, { listeningStatus: 'finished', progressPercent: 100 },
      'marked_finished', actorId, now, `${entryLabel} was marked as finished.`)
  }
  if (action.type === 'unfinish' && entry.listeningStatus === 'finished') {
    return changeLibrary(state, entry, { listeningStatus: 'not_started', progressPercent: 0 },
      'marked_unfinished', actorId, now, `${entryLabel} was marked as unfinished.`)
  }
  return denied('This Library action is unavailable.')
}
