import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

export const APP = 'kayak'
const Account = createContext(null)

export function AccountProvider({ initialWorld, children }) {
  const current = useRef(initialWorld)
  const [world, setWorld] = useState(initialWorld)
  const [feedback, setFeedback] = useState({ text: '', sequence: 0 })

  function announce(text) {
    setFeedback((previous) => ({ text, sequence: previous.sequence + 1 }))
  }

  function commit(change, message) {
    const actor = current.current.user?.id || 'usr_maya_chen'
    const update = { updatedAt: new Date().toISOString(), updatedBy: actor }
    const next = change(current.current, update)
    if (next === current.current) return false
    saveState(APP, next)
    current.current = next
    setWorld(next)
    announce(message)
    return true
  }

  return <Account.Provider value={{ world, commit, announce }}>
    {children}
    <div className="feedback" role="status">
      {feedback.text && <div key={feedback.sequence} className="toast" onAnimationEnd={(event) => {
        if (event.animationName === 'toast-life') {
          setFeedback((previous) => previous.sequence === feedback.sequence ? { ...previous, text: '' } : previous)
        }
      }}>{feedback.text}</div>}
    </div>
  </Account.Provider>
}

export const useAccount = () => useContext(Account)
