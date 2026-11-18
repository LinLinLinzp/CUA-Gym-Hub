import React, { createContext, useContext, useRef, useState } from 'react'
import { records } from './display.js'
import { persistAccountState } from './utils/accountTransport.js'

export const APP = 'my_social_security'
const Account = createContext(null)

export function AccountProvider({ initialState, children }) {
  const latest = useRef(initialState)
  const [state, setState] = useState(initialState)

  function commit(update) {
    const next = update(latest.current)
    if (next === latest.current) return
    latest.current = next
    persistAccountState(APP, next)
    setState(next)
  }

  return <Account.Provider value={{ state, commit }}>{children}</Account.Provider>
}

export const useAccount = () => useContext(Account)
export const isUnread = letter => letter?.status === 'issued' && letter.type !== 'benefit_verification' && !letter.readAt

export function addStatementActivity(commit, statement, action) {
  commit(state => ({
    ...state,
    statementActivity: [...records(state.statementActivity), {
      id: newId('sa'),
      statementId: statement.id,
      kind: statement.kind ?? null,
      year: statement.year ?? null,
      action,
      status: action === 'print_requested' ? 'requested' : 'completed',
      actorId: state.profile?.id ?? null,
      createdAt: new Date().toISOString(),
    }],
  }))
}

export function newId(prefix) {
  const value = crypto.randomUUID?.() ?? Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    byte => byte.toString(16).padStart(2, '0'),
  ).join('')
  return prefix + '-' + value
}

function letterEvent(state, letterId, action, createdAt) {
  return [...records(state.letterActivity), {
    id: newId('la'),
    letterId,
    action,
    status: action === 'print_requested' ? 'requested' : 'completed',
    actorId: state.profile?.id ?? null,
    createdAt,
  }]
}

export function addLetterActivity(commit, letterId, action) {
  commit(state => ({
    ...state,
    letterActivity: letterEvent(state, letterId, action, new Date().toISOString()),
  }))
}

export function markNoticeRead(commit, letterId) {
  commit(state => {
    const letter = records(state.letters).find(item => item.id === letterId)
    if (!isUnread(letter)) return state
    const createdAt = new Date().toISOString()
    return {
      ...state,
      letters: state.letters.map(item => item?.id === letterId ? { ...item, readAt: createdAt } : item),
      letterActivity: letterEvent(state, letterId, 'marked_read', createdAt),
    }
  })
}
