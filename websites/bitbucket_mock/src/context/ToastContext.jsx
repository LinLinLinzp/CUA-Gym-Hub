import { createContext, useContext, useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

const Toast = createContext(null)
export const useToast = () => useContext(Toast)

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null)
  useEffect(() => {
    if (!message) return
    const timeout = setTimeout(() => setMessage(null), 4500)
    return () => clearTimeout(timeout)
  }, [message])
  return <Toast.Provider value={text => setMessage({ text })}>
    {children}
    <div className="toast-area" role="status">{message && <div className="toast"><CheckCircle2 size={18} />{message.text}<button aria-label="Dismiss notification" onClick={() => setMessage(null)}><X size={16} /></button></div>}</div>
  </Toast.Provider>
}
