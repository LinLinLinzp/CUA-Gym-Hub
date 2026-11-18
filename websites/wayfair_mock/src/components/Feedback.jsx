import { createContext, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('')
  return <ToastContext.Provider value={setMessage}>
    {children}
    <div className="toast-region" role="status">
      {message && <div className="toast">
        <span>{message}</span>
        <button type="button" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button>
      </div>}
    </div>
  </ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
