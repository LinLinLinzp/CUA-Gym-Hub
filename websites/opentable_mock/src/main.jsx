import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AccountProvider } from './store'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <AccountProvider><BrowserRouter><App /></BrowserRouter></AccountProvider>,
)
