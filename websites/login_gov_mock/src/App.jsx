import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Shell, Missing } from './components/ui.jsx'
import { paths } from './data/selectors.js'
import { Overview, Identity, Verify, Connections, Catalog, Consent, Connection } from './pages/index.jsx'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Shell>
        <Routes>
          <Route path={paths.account} element={<Overview />} />
          <Route path={paths.identity} element={<Identity />} />
          <Route path={paths.verify} element={<Verify />} />
          <Route path={paths.connections} element={<Connections />} />
          <Route path={paths.catalog} element={<Catalog />} />
          <Route path="/connected-services/consent/:serviceId" element={<Consent />} />
          <Route path="/connected-services/:connectionId" element={<Connection />} />
          <Route path="*" element={<Missing title="Page unavailable" to={paths.account} label="Return to account" />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
