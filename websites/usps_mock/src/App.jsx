import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { StoreProvider, useStore } from './store.jsx'
import { services, Shell, Missing } from './navigation.jsx'
import { History, Home } from './history.jsx'
import { HoldForm, MoveForm, ScheduleDetail } from './schedules.jsx'
import { ClaimDetail, ClaimForm } from './claims.jsx'
import { BoxDetail, RenewForm, ReserveForm } from './boxes.jsx'
import { byId } from './model.js'

const scheduleForms = { changeOfAddressRequests: MoveForm, holdMailRequests: HoldForm }

function ServiceRecord({ service, edit, renew }) {
  const { id } = useParams()
  const { state } = useStore()
  const record = byId(state, service.key, id)
  if (!record) return <Missing service={service} />
  const ScheduleForm = scheduleForms[service.key]
  if (ScheduleForm && edit) return record.status === 'scheduled' ? <ScheduleForm key={id} service={service} record={record} /> : <Missing service={service} />
  if (ScheduleForm) return <ScheduleDetail service={service} record={record} />
  if (service.key === 'packageClaims') {
    return record.status === 'draft' ? <ClaimForm key={id} service={service} record={record} /> : <ClaimDetail service={service} record={record} />
  }
  return renew ? <RenewForm key={id} service={service} record={record} /> : <BoxDetail service={service} record={record} />
}

function ServiceNew({ service }) {
  const ScheduleForm = scheduleForms[service.key]
  if (ScheduleForm) return <ScheduleForm service={service} />
  if (service.key === 'packageClaims') return <ClaimForm service={service} />
  return <ReserveForm service={service} />
}

function AccountRoutes() {
  const { state, notice } = useStore()
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route element={<Shell account={state.account} notice={notice} />}>
      <Route index element={<Home />} />
      {services.map(service => <Route key={service.key} path={service.path}>
        <Route index element={<History key={service.key} service={service} />} />
        <Route path="new" element={<ServiceNew service={service} />} />
        <Route path=":id" element={<ServiceRecord service={service} />} />
        {scheduleForms[service.key] && <Route path=":id/edit" element={<ServiceRecord service={service} edit />} />}
        {service.key === "poBoxes" && <Route path=":id/renew" element={<ServiceRecord service={service} renew />} />}
      </Route>)}
      <Route path="*" element={<Missing />} />
    </Route>
  </Routes></BrowserRouter>
}

export default function App() {
  return <StoreProvider><AccountRoutes /></StoreProvider>
}
