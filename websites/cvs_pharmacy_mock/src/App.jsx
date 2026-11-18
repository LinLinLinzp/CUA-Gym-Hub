import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Account, Overview } from './Account.jsx'
import { Prescriptions, PrescriptionDetail, PrescriptionHistory } from './Prescriptions.jsx'
import { Refills } from './Refills.jsx'
import { Pickup, PickupDetail } from './Pickup.jsx'
import { Vaccines, VaccineDetail, VaccineForm } from './Vaccines.jsx'
import { Missing } from './ui.jsx'
import { PharmacyProvider } from './state.jsx'

export function App({ initialState }) {
  return <BrowserRouter>
    <PharmacyProvider initialState={initialState}>
      <Routes>
        <Route element={<Account/>}>
          <Route index element={<Overview/>}/>
          <Route path="prescriptions" element={<Prescriptions/>}/>
          <Route path="prescriptions/history" element={<PrescriptionHistory/>}/>
          <Route path="prescriptions/:id" element={<PrescriptionDetail/>}/>
          <Route path="refills" element={<Refills/>}/>
          <Route path="pickup" element={<Pickup/>}/>
          <Route path="pickup/:id" element={<PickupDetail/>}/>
          <Route path="vaccines" element={<Vaccines/>}/>
          <Route path="vaccines/schedule" element={<VaccineForm/>}/>
          <Route path="vaccines/:id" element={<VaccineDetail/>}/>
          <Route path="vaccines/:id/reschedule" element={<VaccineForm editing/>}/>
          <Route path="*" element={<Missing record="Page" back="/" label="Back to overview"/>}/>
        </Route>
      </Routes>
    </PharmacyProvider>
  </BrowserRouter>
}
