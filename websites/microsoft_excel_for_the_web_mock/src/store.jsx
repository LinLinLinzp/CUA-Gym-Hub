import React, {createContext, useContext, useRef, useState} from 'react'
import {recalculate} from './utils/formulas.js'
import {transactionValidation} from './utils/rules.js'

export const APP = 'microsoft_excel_for_the_web'
const Store = createContext(null)
export const useStore = () => useContext(Store)
export * from './model.js'
import {append, findRecord, newId, records, touch} from './model.js'

export function StoreProvider({initial, pending, connecting, session, children}) {
  const [world, setWorld] = useState(initial)
  const latest = useRef(initial)
  const [saveStatus, setSaveStatus] = useState(pending ? 'failed' : 'saved')
  const saveVersion = useRef(0)
  const [notice, setNotice] = useState('')
  const timer = useRef()
  function notify(message) {
    clearTimeout(timer.current)
    setNotice(message)
    timer.current = setTimeout(() => setNotice(''), 4800)
  }
  function persist(state) {
    const version = ++saveVersion.current
    setSaveStatus('saving')
    const finish = status => {
      if (version === saveVersion.current) setSaveStatus(status)
    }
    session.save(state).then(result => finish(result.conflict ? 'conflict' : 'saved'), () => finish('failed'))
  }
  async function loadServerCopy() {
    try {
      await session.discard()
      window.location.reload()
    } catch {
      notify('Excel could not clear the unsaved copy. Try again.')
    }
  }
  function dispatch(type, change, {onReject} = {}) {
    if (connecting) {
      notify('Excel is connecting. Try again shortly.')
      return null
    }
    if (saveStatus === 'conflict') {
      notify('Resolve the save conflict to continue editing.')
      return null
    }
    const before = latest.current
    const next = structuredClone(before)
    const tx = {id:newId('op'), actor: next.currentUserId ?? 'user-local', now:new Date().toISOString()}
    const result = change(next, tx)
    if (!result) return null
    if (result.error) {
      onReject?.(result.error)
      notify(result.error)
      return null
    }
    const {workbookId = null, sheetId = null, targetIds = [], details = {}, calculate = false,
      updateWorkbook = true, reversesOperationId} = result
    if (calculate) {
      const ids = new Set(recalculate(next, workbookId))
      for (const cell of records(next, 'cells')) {
        if (ids.has(cell.id)) touch(cell, tx)
      }
      details.recalculatedCellIds = [...ids]
    }
    const error=transactionValidation(before,next,type,workbookId,targetIds)
    if (error) {onReject?.(error);notify(error);return null}
    const workbook = findRecord(next, 'workbooks', workbookId)
    if (workbook && updateWorkbook) touch(workbook, tx)
    const operation = {id:tx.id, type, actorId:tx.actor, createdAt:tx.now, workbookId, sheetId, targetIds, details}
    if (reversesOperationId) operation.reversesOperationId = reversesOperationId
    append(next, 'operations', operation)
    latest.current = next
    setWorld(next)
    persist(next)
    return {operation, before, next}
  }
  return <Store.Provider value={{world, dispatch, notify, saveStatus:connecting ? 'saving' : saveStatus, retrySave: () => persist(latest.current), loadServerCopy}}>
    {children}
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
  </Store.Provider>
}
