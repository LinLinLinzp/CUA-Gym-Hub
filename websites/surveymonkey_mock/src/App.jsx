import { useEffect, useState } from 'react'
import { Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useWorkspace } from './state.jsx'
import { actorFor, surveyPath, titleFor, userFor } from './model.js'
import { Icon, Missing, SiteLink } from './ui.jsx'
import { Library, SurveyDialog, Design } from './surveys.jsx'
import { CollectorList, CollectorDetail } from './collectors.jsx'
import { Entry } from './entry.jsx'
import { Analyze } from './analysis.jsx'

const sections = { design: 'Design survey', collect: 'Collect responses', analyze: 'Analyze results' }

function Shell() {
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  const [creating, setCreating] = useState(false)
  const user = userFor(state, actorFor(state))
  const userName = user?.name || 'Workspace member'
  const section = sections[pathname.split('/')[3]] || 'Surveys'
  return <div className="workspace">
    <a className="skip" href="#main">Skip to content</a>
    <aside className="rail">
      <SiteLink className="wordmark" to="/surveys">SurveyMonkey<span aria-hidden="true">.</span></SiteLink>
      <div className="rail-content">
        <p className="rail-label">Workspace</p>
        <nav aria-label="Workspace"><SiteLink className="rail-link" to="/surveys" aria-current={pathname === '/' || pathname === '/surveys' ? 'page' : undefined}><Icon name="survey" size={18}/> Surveys</SiteLink></nav>
      </div>
      <div className="rail-user"><span className="avatar" aria-hidden="true">{userName.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>
        <span><strong>{userName}</strong><small>{state.account?.workspaceName || 'Workspace'}</small></span>
      </div>
    </aside>
    <div className="work-area">
      <header className="context-header">
        <div className="context-inner">
          <nav aria-label="Breadcrumb"><SiteLink to="/surveys">Workspace</SiteLink><Icon name="right" size={14}/><span aria-current="page">{section}</span></nav>
          <button className="button primary" onClick={() => setCreating(true)}><Icon name="plus" size={18}/> Create survey</button>
        </div>
      </header>
      <main className="content" id="main"><Outlet/></main>
    </div>
    {creating && <SurveyDialog onClose={() => setCreating(false)}/>}
  </div>
}

function SurveyFrame() {
  const { surveyId } = useParams()
  const { state } = useWorkspace()
  const survey = state.surveys.find(record => record.id === surveyId)
  if (!survey) return <Missing title="Survey unavailable"/>
  return <>
    <header className="survey-header">
      <SiteLink className="back-link" to="/surveys"><Icon name="left" size={15}/> All surveys</SiteLink>
      <h1>{titleFor(survey)}</h1>
      <nav className="tabs" aria-label="Survey workspace">
        <SiteLink active to={surveyPath(surveyId)}>Design survey</SiteLink>
        <SiteLink active to={surveyPath(surveyId, 'collect')}>Collect responses</SiteLink>
        <SiteLink active to={surveyPath(surveyId, 'analyze')}>Analyze results</SiteLink>
      </nav>
    </header>
    <Outlet context={survey}/>
  </>
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <Routes>
    <Route path="/r/:collectorId" element={<Entry key={pathname} mode="web"/>}/>
    <Route path="/surveys/:surveyId/preview" element={<Entry key={pathname} mode="preview"/>}/>
    <Route path="/surveys/:surveyId/collect/:collectorId/entry" element={<Entry key={pathname} mode="manual"/>}/>
    <Route element={<Shell/>}>
      <Route index element={<Library/>}/>
      <Route path="/surveys" element={<Library/>}/>
      <Route path="/surveys/:surveyId" element={<SurveyFrame/>}>
        <Route index element={<Design key={pathname}/>}/>
        <Route path="design" element={<Design key={pathname}/>}/>
        <Route path="collect" element={<CollectorList key={pathname}/>}/>
        <Route path="collect/:collectorId" element={<CollectorDetail key={pathname}/>}/>
        <Route path="analyze/:responseId?" element={<Analyze/>}/>
        <Route path="*" element={<Missing/>}/>
      </Route>
      <Route path="*" element={<Missing/>}/>
    </Route>
  </Routes>
}
