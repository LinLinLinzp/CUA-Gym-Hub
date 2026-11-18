import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { WorkspaceProvider } from './context/Workspace.jsx'
import { Missing, Shell } from './components/ui.jsx'
import Overview from './pages/Overview.jsx'
import { Contracts, ContractDetail } from './pages/Contracts.jsx'
import ContractForm from './pages/ContractForm.jsx'
import { Invoices, InvoiceDetail } from './pages/Invoices.jsx'
import { TimeOff, TimeOffDetail, TimeOffForm } from './pages/TimeOff.jsx'
export default function App() {
  return <BrowserRouter><WorkspaceProvider><WorkspaceRoutes /></WorkspaceProvider></BrowserRouter>
}

function WorkspaceRoutes() {
  const { search } = useLocation()
  return <Shell><Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/contracts" element={<Contracts key={search} />} />
      <Route path="/contracts/new" element={<ContractForm />} />
      <Route path="/contracts/:id" element={<ContractDetail />} />
      <Route path="/contracts/:id/edit" element={<ContractForm />} />
      <Route path="/invoices" element={<Invoices key={search} />} />
      <Route path="/invoices/:id" element={<InvoiceDetail />} />
      <Route path="/time-off" element={<TimeOff />} />
      <Route path="/time-off/new" element={<TimeOffForm />} />
      <Route path="/time-off/:id" element={<TimeOffDetail />} />
      <Route path="/time-off/:id/edit" element={<TimeOffForm />} />
      <Route path="*" element={<Missing noun="Page" back={['/', 'Overview']} />} />
    </Routes>
  </Shell>
}
