import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Feedback, Missing, Workspace } from './components.jsx'
import { Overview } from './Overview.jsx'
import { Bills, BillDetail } from './Bills.jsx'
import { BillEditor } from './BillEditor.jsx'
import { Approvals } from './Approvals.jsx'
import { Vendors, VendorDetail } from './Vendors.jsx'
import { Payments, PaymentEditor, PaymentDetail } from './Payments.jsx'

export function App() {
  return <BrowserRouter>
    <Feedback>
      <Routes>
        <Route element={<Workspace />}>
          <Route index element={<Overview />} />
          <Route path="bills" element={<Bills />} />
          <Route path="bills/new" element={<BillEditor />} />
          <Route path="bills/:id" element={<BillDetail />} />
          <Route path="bills/:id/edit" element={<BillEditor />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/:id" element={<VendorDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="payments/new" element={<PaymentEditor />} />
          <Route path="payments/:id" element={<PaymentDetail />} />
          <Route path="*" element={<Missing title="Page unavailable" to="/" label="Back to Overview" />} />
        </Route>
      </Routes>
    </Feedback>
  </BrowserRouter>
}
