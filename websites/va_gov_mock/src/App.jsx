import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useLayoutEffect, useRef } from 'react'
import { Shell } from './Shell'
import Overview from './Overview'
import { useAccount } from './state'
import Missing from './components/Missing'
import { ClaimDetail, Claims, NewClaim } from './pages/Claims'
import { AppointmentDetail, Appointments, NewAppointment } from './pages/Appointments'
import { PrescriptionDetail, Prescriptions } from './pages/Prescriptions'
import { CopayDetail, DirectDeposit, PaymentDetail, Payments } from './pages/Payments'

function AccountRoutes() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const lastPath = useRef(pathname)
  useLayoutEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    window.scrollTo(0, 0)
    document.querySelector('main h1')?.focus({ preventScroll: true })
  }, [pathname])
  return <Shell profile={state.profile}>
    <Routes key={pathname}>
      <Route path="/" element={<Overview state={state} />} />
      <Route path="/claims">
        <Route index element={<Claims />} />
        <Route path="new" element={<NewClaim />} />
        <Route path="record/:token" element={<ClaimDetail />} />
        <Route path=":id" element={<ClaimDetail />} />
      </Route>
      <Route path="/appointments">
        <Route index element={<Appointments />} />
        <Route path="new" element={<NewAppointment />} />
        <Route path="record/:token" element={<AppointmentDetail />} />
        <Route path=":id" element={<AppointmentDetail />} />
      </Route>
      <Route path="/prescriptions">
        <Route index element={<Prescriptions />} />
        <Route path="record/:token" element={<PrescriptionDetail />} />
        <Route path=":id" element={<PrescriptionDetail />} />
      </Route>
      <Route path="/payments">
        <Route index element={<Payments />} />
        <Route path="history/record/:token" element={<PaymentDetail />} />
        <Route path="history/:id" element={<PaymentDetail />} />
        <Route path="copays/record/:token" element={<CopayDetail />} />
        <Route path="copays/:id" element={<CopayDetail />} />
        <Route path="direct-deposit" element={<DirectDeposit />} />
      </Route>
      <Route path="*" element={<Missing />} />
    </Routes>
  </Shell>
}

export default function App() {
  return <BrowserRouter><AccountRoutes /></BrowserRouter>
}


