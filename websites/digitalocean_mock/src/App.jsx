import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Missing, Shell } from './ui.jsx'
import { loadWorld, useWorkspace, WorkspaceProvider } from './store.jsx'
import { Overview } from './Overview.jsx'
import { Snapshots } from './Snapshots.jsx'
import { DomainDetail, Domains } from './Domains.jsx'
import { CreateDroplet, DropletDetail, Droplets } from './Droplets.jsx'

function WorkspaceRoutes() {
  const { world, notice } = useWorkspace()
  return <Shell account={world.account} notice={notice}>
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/droplets" element={<Droplets />} />
      <Route path="/droplets/new" element={<CreateDroplet />} />
      <Route path="/droplets/:id" element={<DropletDetail />} />
      <Route path="/networking/domains" element={<Domains />} />
      <Route path="/networking/domains/:id" element={<DomainDetail />} />
      <Route path="/snapshots" element={<Snapshots />} />
      <Route path="*" element={<Missing title="Page unavailable" />} />
    </Routes>
  </Shell>
}

export function App() {
  const [initial, setInitial] = useState(null)
  useEffect(() => { loadWorld().then(setInitial) }, [])
  if (!initial) return <main className="workspace-loading" role="status">Loading workspace…</main>
  return <WorkspaceProvider initial={initial}><BrowserRouter><WorkspaceRoutes /></BrowserRouter></WorkspaceProvider>
}



