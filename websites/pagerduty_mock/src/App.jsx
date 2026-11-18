import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Missing, Redirect, Shell } from './ui.jsx'
import { IncidentActivity, IncidentDetail, Incidents, NewIncident } from './Incidents.jsx'
import { ScheduleCompare, ScheduleDetail, ScheduleEditor, Schedules } from './Schedules.jsx'
import { Policies, PolicyDetail, PolicyEditor } from './Policies.jsx'

export default function App() {
  const { pathname } = useLocation()
  return <Shell><Routes key={pathname}>
    <Route path="/" element={<Redirect to="/incidents" />} />
    <Route path="/incidents" element={<Incidents />} />
    <Route path="/incidents/activity" element={<IncidentActivity />} />
    <Route path="/incidents/new" element={<NewIncident />} />
    <Route path="/incidents/:id" element={<IncidentDetail />} />
    <Route path="/schedules" element={<Schedules />} />
    <Route path="/schedules/compare" element={<ScheduleCompare />} />
    <Route path="/schedules/new" element={<ScheduleEditor />} />
    <Route path="/schedules/:id" element={<ScheduleDetail />} />
    <Route path="/schedules/:id/edit" element={<ScheduleEditor editing />} />
    <Route path="/escalation-policies" element={<Policies />} />
    <Route path="/escalation-policies/new" element={<PolicyEditor />} />
    <Route path="/escalation-policies/:id" element={<PolicyDetail />} />
    <Route path="/escalation-policies/:id/edit" element={<PolicyEditor editing />} />
    <Route path="*" element={<Missing />} />
  </Routes></Shell>
}
