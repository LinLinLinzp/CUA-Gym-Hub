import { Route, Routes } from 'react-router-dom'
import { alertPath, byId, activeFolder, folderPath, nameOf, newest } from './model.js'
import { useWorkspace } from './store.jsx'
import { Icon, List, Missing, Moment, PageHead, Panel, Shell, SiteLink } from './ui.jsx'
import { Document, Research, SearchBox } from './Research.jsx'
import { Folders, FolderDetail } from './Folders.jsx'
import { Citations, CitationReport } from './Citations.jsx'
import { Alerts, AlertDetail } from './Alerts.jsx'

function Workspace() {
  const { state } = useWorkspace()
  const folders = state.folders.filter((folder) => activeFolder(state.folders, folder.id)).sort(newest).slice(0, 5)
  const validAlerts = new Set(state.alerts.filter((alert) => alert.status !== 'deleted').map((alert) => alert.id))
  const unread = state.alertResults.filter((result) => result.status === 'unread' && validAlerts.has(result.alertId))
    .sort((a, b) => String(b.matchedAt || '').localeCompare(String(a.matchedAt || '')))
  const recent = unread.slice(0, 4)
  return <>
    <PageHead title="Research workspace" description={`Welcome back, ${state.profile?.name?.trim().split(/\s+/)[0] || 'researcher'}.`} />
    <section className="hero"><div className="hero-content">
      <h2>Search legal research</h2>
      <p>Find cases, statutes and analysis by keyword, title or citation.</p>
      <SearchBox hero />
    </div></section>
    <div className="dashboard">
      <Panel title="Recent folders" action={<SiteLink to="/folders">All folders <Icon name="arrow" size={15} /></SiteLink>}>
        <List count={folders.length} label="folder" empty="Your research folders will appear here.">
          {folders.map((folder) => {
            const count = state.folderItems.filter((item) => item.folderId === folder.id && item.status !== 'removed').length
            return <li className="row" key={folder.id}><div className="row-main"><span className="row-icon"><Icon name="folder" /></span>
              <div className="row-copy"><SiteLink to={folderPath(folder.id)}>{nameOf(folder, 'name')}</SiteLink><p className="meta">{count} {count === 1 ? 'item' : 'items'}</p></div>
            </div><div className="row-data"><Moment value={folder.updatedAt || folder.createdAt} /></div></li>
          })}
        </List>
      </Panel>
      <Panel title={`Unread alerts${unread.length ? ` (${unread.length})` : ''}`} action={<SiteLink to="/alerts">All alerts <Icon name="arrow" size={15} /></SiteLink>}>
        <List count={recent.length} label="result" empty="You’re caught up on alert results.">
          {recent.map((result) => {
            const alert = byId(state.alerts, result.alertId)
            const doc = byId(state.documents, result.documentId)
            return <li className="row" key={result.id}><div className="row-main"><span className="row-icon"><Icon name="bell" /></span>
              <div className="row-copy"><SiteLink to={alertPath(alert.id)}>{nameOf(alert)}</SiteLink><p className="meta">{doc?.title || 'Document unavailable'}</p></div>
            </div><div className="row-data"><Moment value={result.matchedAt} /></div></li>
          })}
        </List>
      </Panel>
    </div>
  </>
}

export function App() {
  const { state } = useWorkspace()
  return <Shell profile={state.profile}><Routes>
    <Route path="/" element={<Workspace />} />
    <Route path="/research" element={<Research />} />
    <Route path="/research/documents/:documentId" element={<Document />} />
    <Route path="/folders" element={<Folders />} />
    <Route path="/folders/:folderId" element={<FolderDetail />} />
    <Route path="/citations" element={<Citations />} />
    <Route path="/citations/:documentId" element={<CitationReport />} />
    <Route path="/alerts" element={<Alerts />} />
    <Route path="/alerts/:alertId" element={<AlertDetail />} />
    <Route path="*" element={<Missing title="Page unavailable" description="This address does not point to a workspace page." label="Return to workspace" to="/" />} />
  </Routes></Shell>
}
