import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Appearance } from './components/Appearance.jsx'
import { StateRoot } from './state/Store.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(<Appearance><StateRoot><App /></StateRoot></Appearance>)
