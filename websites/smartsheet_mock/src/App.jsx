import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './store.jsx'
import Shell from './components/Shell.jsx'
import { SheetResource, Unavailable } from './components/Resource.jsx'
import { SheetFrame } from './components/SheetFrame.jsx'
import { FormBuilder, FormsList, PublicForm } from './pages/Forms.jsx'
import { WorkflowBuilder, WorkflowList } from './pages/Automation.jsx'
import Notifications from './pages/Notifications.jsx'
import Gantt from './pages/Gantt.jsx'
import SheetView from './pages/SheetView.jsx'
import { Directory, SearchPage } from './pages/Directory.jsx'

export default function App() {
  return <StoreProvider><BrowserRouter><Routes>
    <Route element={<Shell />}>
      <Route index element={<Directory key="home" home />} />
      <Route path="browse" element={<Directory key="browse" />} />
      <Route path="workspaces/:workspaceId" element={<Directory key="workspace" />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="sheets/:sheetId" element={<SheetResource />}>
        <Route element={<SheetFrame />}>
          <Route index element={<SheetView />} />
          <Route path="gantt" element={<Gantt />} />
          <Route path="forms" element={<FormsList />} />
          <Route path="forms/new" element={<FormBuilder />} />
          <Route path="forms/:formId/edit" element={<FormBuilder />} />
          <Route path="automation" element={<WorkflowList />} />
          <Route path="automation/new" element={<WorkflowBuilder />} />
          <Route path="automation/:workflowId/edit" element={<WorkflowBuilder />} />
        </Route>
      </Route>
      <Route path="notifications" element={<Notifications />} />
      <Route path="notifications/approvals/:requestId" element={<Notifications />} />
      <Route path="*" element={<Unavailable />} />
    </Route>
    <Route path="forms/:formId" element={<PublicForm />} />
  </Routes></BrowserRouter></StoreProvider>
}
