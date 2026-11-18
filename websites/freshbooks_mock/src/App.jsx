import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { Missing } from './components/ui.jsx'
import { ClientDetail, Dashboard, Directory, Layout, Payments, ProjectDetail } from './pages/Workspace.jsx'
import { InvoiceEditor } from './pages/InvoiceEditor.jsx'
import { InvoiceDetail, Invoices } from './pages/Invoices.jsx'
import { TimeTracking } from './pages/TimeTracking.jsx'
import { ExpenseDetail, ExpenseEditor, Expenses } from './pages/Expenses.jsx'
import { RetainerEditor, Retainers } from './pages/Retainers.jsx'
import { RetainerDetail } from './pages/RetainerDetail.jsx'

export default function App({ initial }) {
  return <AppProvider initial={initial}><BrowserRouter><Routes><Route element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="/clients" element={<Directory type="clients" />} />
    <Route path="/clients/:id" element={<ClientDetail />} />
    <Route path="/projects" element={<Directory type="projects" />} />
    <Route path="/projects/:id" element={<ProjectDetail />} />
    <Route path="/payments" element={<Payments />} />
    <Route path="/invoices" element={<Invoices />} />
    <Route path="/invoices/:id" element={<InvoiceDetail />} />
    <Route path="/invoices/new" element={<InvoiceEditor />} />
    <Route path="/invoices/:id/edit" element={<InvoiceEditor />} />
    <Route path="/invoices/retainers" element={<Retainers />} />
    <Route path="/invoices/retainers/new" element={<RetainerEditor />} />
    <Route path="/invoices/retainers/:id/edit" element={<RetainerEditor />} />
    <Route path="/invoices/retainers/:id" element={<RetainerDetail />} />
    <Route path="/expenses" element={<Expenses />} />
    <Route path="/expenses/:id" element={<ExpenseDetail />} />
    <Route path="/expenses/new" element={<ExpenseEditor />} />
    <Route path="/expenses/:id/edit" element={<ExpenseEditor />} />
    <Route path="/time-tracking" element={<TimeTracking />} />
    <Route path="*" element={<Missing title="Page unavailable" to="/" label="Back to Dashboard" />} />
  </Route></Routes></BrowserRouter></AppProvider>
}
