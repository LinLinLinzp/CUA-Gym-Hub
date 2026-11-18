import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Empty, Frame, Heading, WorkspaceLink } from './common.jsx'
import { Overview, StreamSettings } from './pages/Stream.jsx'
import { VideoProducer } from './pages/Videos.jsx'
import { Moderation } from './pages/Moderation.jsx'
import { Schedule } from './pages/Schedule.jsx'

function Missing() {
  return <><Heading title="Page not found" /><Empty title="This address is outside the creator workspace.">
    <WorkspaceLink className="button primary" to="/stream-manager">Back to Overview</WorkspaceLink>
  </Empty></>
}

export function App() {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Frame><Routes>
    <Route path="/" element={<Overview />} />
    <Route path="/stream-manager" element={<Overview />} />
    <Route path="/settings/stream" element={<StreamSettings />} />
    <Route path="/content/video-producer" element={<VideoProducer />} />
    <Route path="/moderation" element={<Moderation />} />
    <Route path="/schedule" element={<Schedule />} />
    <Route path="/settings/channel/schedule" element={<Schedule />} />
    <Route path="*" element={<Missing />} />
  </Routes></Frame></BrowserRouter>
}

