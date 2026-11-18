import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { MissingRecord } from './components/RouteViews'
import { routes } from './data/routes'
import { Store, useStore } from './context/Store'
import { AddressHistory, AddressIntroduction, AddressRequest, AddressWizard } from './pages/AddressChanges'
import { AppointmentConfirmation, AppointmentLookup, AppointmentTypes, ScheduleAppointment } from './pages/Appointments'
import { RenewalCart, RenewalIntroduction, RenewalReceipt, RenewalStatus, RenewalWizard } from './pages/Renewals'
import Locations from './pages/Locations'
import { Account, Home, OnlineServices } from './pages/Portal'

function PortalRoutes() {
  const { state } = useStore()
  return <Routes>
    <Route element={<Layout />}>
      <Route index element={<Home />} />
      <Route path={routes.home} element={<Home />} />
      <Route path={routes.online} element={<OnlineServices />} />
      <Route path={routes.account} element={<Account state={state} />} />
      <Route path={routes.appointments} element={<AppointmentTypes />} />
      <Route path={routes.appointmentTypes} element={<AppointmentTypes />} />
      <Route path={routes.schedule} element={<ScheduleAppointment />} />
      <Route path={routes.appointmentLookup} element={<AppointmentLookup />} />
      <Route path={`${routes.appointmentConfirmation}:id`} element={<AppointmentConfirmation />} />
      <Route path={routes.locations} element={<Locations />} />
      <Route path={routes.renewal} element={<RenewalIntroduction />} />
      <Route path={decodeURIComponent(routes.renewalStart)} element={<RenewalWizard />} />
      <Route path={routes.renewalStatus} element={<RenewalStatus />} />
      <Route path={routes.cart} element={<RenewalCart />} />
      <Route path={`${routes.receipt}:id`} element={<RenewalReceipt />} />
      <Route path={routes.address} element={<AddressIntroduction />} />
      <Route path={routes.addressStart} element={<AddressWizard />} />
      <Route path={routes.addressStatus} element={<AddressHistory />} />
      <Route path={`${routes.addressStatus}:id`} element={<AddressRequest />} />
      <Route path="*" element={<MissingRecord title="Page unavailable" message="We couldn’t find that page" to={routes.online} action="Online Services" />} />
    </Route>
  </Routes>
}

export default function App() {
  return <BrowserRouter><Store><PortalRoutes /></Store></BrowserRouter>
}
