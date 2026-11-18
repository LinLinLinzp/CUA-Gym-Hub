import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Workspace } from './context/Workspace.jsx'
import Shell from './components/Shell.jsx'
import Home from './pages/Home.jsx'
import { StockReport } from './pages/Inventory.jsx'
import Record from './pages/Record.jsx'
import WorkspaceTools from './pages/WorkspaceTools.jsx'
import Queue from './pages/Queue.jsx'
import RecordList from './pages/RecordList.jsx'
import RouteFrame from './pages/RouteFrame.jsx'
import { getSessionId } from './utils/dataManager.js'
import './styles.css'

function Session() {
  useLocation()
  const sid = getSessionId()
  return <Workspace key={sid}><Shell><Routes><Route path="*" element={<RouteFrame pages={{ home: Home, workspace: WorkspaceTools, record: Record, stock: StockReport, list: RecordList, queue: Queue }} />} /></Routes></Shell></Workspace>
}

export default function App() {
  return <BrowserRouter><Session /></BrowserRouter>
}
