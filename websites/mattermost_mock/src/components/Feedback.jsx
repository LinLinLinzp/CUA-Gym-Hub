import { createContext, useContext, useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { ownPrefs } from '../data/selectors.js'

const Feedback = createContext(null)

export function FeedbackProvider({ children }) {
  const { state } = useStore()
  const [toast, setToast] = useState(null)
  const [preview, setPreview] = useState(null)
  const preferences = preview ?? ownPrefs(state)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <Feedback.Provider value={{ notify: (message, error = false) => setToast({ message, error }), preferences, setPreview }}>
      <div className="theme" data-theme={preferences?.theme ?? 'denim'} data-density={preferences?.messageDisplay ?? 'comfortable'}>
        {children}
        {toast && <div className={'toast' + (toast.error ? ' error' : '')} role={toast.error ? 'alert' : 'status'}>{toast.message}</div>}
      </div>
    </Feedback.Provider>
  )
}
export const useFeedback = () => useContext(Feedback)
