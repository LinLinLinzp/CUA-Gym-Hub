import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { applyAction } from './data/actions.js'
import { getSessionId, saveState } from './utils/dataManager.js'

export const APP = 'shipstation'
const Context = createContext(null)
export const useWorkspace = () => useContext(Context)

export function Workspace({ initial, children }) {
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState('')
  const queues = useRef({})
  const latest = useRef(initial)
  const value = useMemo(() => ({
    state, notice, setNotice, queues: queues.current,
    commit(action, data, message) {
      const { state: next, result } = applyAction(latest.current, action, data)
      saveState(APP, next)
      latest.current = next
      setState(next)
      setNotice(message)
      return result
    },
  }), [state, notice])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useSessionPath() {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid') || getSessionId()
  return path => sid ? path + '?sid=' + encodeURIComponent(sid) : path
}
export function RecordLink({ to, ...props }) {
  const sessionPath = useSessionPath()
  return <Link {...props} to={sessionPath(to)} />
}
export function useOpenRecord() {
  const navigate = useNavigate()
  const sessionPath = useSessionPath()
  return (section, id) => navigate(sessionPath('/' + section + '/' + encodeURIComponent(id)))
}
export const recordPath = (section, id) => '/' + section + '/' + encodeURIComponent(id)

