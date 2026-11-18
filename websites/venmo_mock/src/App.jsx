import { createContext, useContext, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'
import { AccountProvider, useAccount } from './store'
import { Activity, Missing, Overview, PaymentDetail, RequestDetail, Requests, SplitDetail, Splits, Statements } from './pages'
import { Composer, SplitComposer } from './workflows'
import { Avatar } from './ui'

const WorkspaceContext = createContext(null)
export const useWorkspace = () => useContext(WorkspaceContext)

const tabs = [
  ['/', 'Overview'],
  ['/activity', 'Activity'],
  ['/requests', 'Requests'],
  ['/splits', 'Splits'],
  ['/statements', 'Statements'],
]

function Workspace() {
  const { state } = useAccount()
  const [sheet, setSheet] = useState(null)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  function finish(path, message) {
    setSheet(null)
    navigate(withSid(path))
    setNotice(message)
  }

  const actions = {
    openComposer: (options = {}) => setSheet({ kind: 'composer', ...options }),
    openSplit: (payment) => setSheet({ kind: 'split', payment }),
    announce: setNotice,
  }

  return (
    <WorkspaceContext.Provider value={actions}>
      <header className="masthead">
        <div className="frame masthead-inner">
          <Link className="brand" to={withSid('/')}>Venmo</Link>
          <nav aria-label="Account navigation">
            {tabs.map(([path, title]) => <NavLink key={path} end={path === '/'} to={withSid(path)}>{title}</NavLink>)}
          </nav>
          <div className="identity"><Avatar person={state.account} /><span>{state.account.name || 'Your account'}</span></div>
        </div>
      </header>
      <main className="frame workspace">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/activity/:paymentId" element={<PaymentDetail />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/:requestId" element={<RequestDetail />} />
          <Route path="/splits" element={<Splits />} />
          <Route path="/splits/:splitId" element={<SplitDetail />} />
          <Route path="/statements" element={<Statements />} />
          <Route path="*" element={<Missing />} />
        </Routes>
      </main>
      <div className="announcement" role="status">
        {notice && <div className="toast">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
      </div>
      {sheet?.kind === 'composer' && <Composer options={sheet} close={() => setSheet(null)} finish={finish} />}
      {sheet?.kind === 'split' && <SplitComposer payment={sheet.payment} close={() => setSheet(null)} finish={finish} />}
    </WorkspaceContext.Provider>
  )
}

export default function App({ initialState }) {
  return <AccountProvider initialState={initialState}><Workspace /></AccountProvider>
}
