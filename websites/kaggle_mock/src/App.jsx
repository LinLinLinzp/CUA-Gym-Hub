import { Datasets, NewDataset, DatasetRoute } from './datasets.jsx'
import { Notebooks, NewNotebook, NotebookRoute } from './notebooks.jsx'
import { Competitions, CompetitionDetail } from './competitions.jsx'
import { useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppLink, Art, Heading, Icon, Missing, count, titleOf } from './ui.jsx'
import { competitionPath, entityPath, isJoined, useStore } from './store.jsx'

const areas = [
  { group: 'competitions', label: 'Competitions', description: 'Work on open challenges and track your submissions.' },
  { group: 'code', label: 'Notebooks', description: 'Explore analyses and develop a reproducible notebook.' },
  { group: 'datasets', label: 'Datasets', description: 'Find a collection, inspect its files, or publish your own.' },
]

function TopBar() {
  const { state } = useStore()
  const account = state.account
  const name = account.displayName ?? account.username ?? 'Account'
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  const menu = useRef(null)
  const { pathname, search } = useLocation()
  useEffect(() => {
    menu.current.open = false
  }, [pathname, search])
  useEffect(() => {
    function outside(event) {
      if (!menu.current.contains(event.target)) menu.current.open = false
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return <header className="top-bar">
    <div className="bar-inner">
      <AppLink className="wordmark" to="/">Kaggle<span aria-hidden="true" /></AppLink>
      <nav className="top-nav" aria-label="Main navigation">{areas.map(area =>
        <AppLink nav to={`/${area.group}`} key={area.group}>{area.label}</AppLink>)}</nav>
      <details ref={menu} className="account-menu" onKeyDown={event => {
        if (event.key === 'Escape' && menu.current.open) {
          menu.current.open = false
          menu.current.querySelector('summary').focus()
        }
      }}>
        <summary><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span><Icon name="chevron" size={15} /></summary>
        <div className="account-popover">
          <div className="account-identity"><strong>{name}</strong><span>@{account.username ?? 'account'}</span></div>
          <AppLink to="/workspace"><Icon name="workspace" size={17} /> My Workspace</AppLink>
        </div>
      </details>
    </div>
  </header>
}

function HeroChart() {
  return <svg className="hero-chart" viewBox="0 0 492 264" fill="none" aria-hidden="true">
    <defs>
      <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0v36" stroke="#9EAFE5" strokeOpacity=".23" /></pattern>
      <linearGradient id="chart-fill" x1="0" y1="40" x2="0" y2="220" gradientUnits="userSpaceOnUse"><stop stopColor="#36C5E8" stopOpacity=".37" /><stop offset="1" stopColor="#36C5E8" stopOpacity="0" /></linearGradient>
    </defs>
    <rect x="37" y="19" width="414" height="218" rx="18" fill="#2D3866" stroke="#6878AE" strokeOpacity=".55" />
    <rect x="51" y="32" width="386" height="191" rx="11" fill="url(#hero-grid)" />
    <path d="m65 183 66-48 58 19 63-64 59 19 96-64v172H65Z" fill="url(#chart-fill)" />
    <path d="m65 197 65-26 58 8 64-42 58 9 97-66" stroke="#A49DFF" strokeWidth="2" strokeDasharray="5 6" />
    <path d="m65 183 66-48 58 19 63-64 59 19 96-64" stroke="#62DBF3" strokeWidth="3" strokeLinejoin="round" />
    {[ [65,183], [131,135], [189,154], [252,90], [311,109], [407,45] ].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="#252F59" stroke="#62DBF3" strokeWidth="3" />)}
    <rect x="339" y="157" width="119" height="74" rx="10" fill="#303B69" stroke="#8391C2" />
    <path d="M355 211h86M355 172v39" stroke="#8494C2" />
    <path d="M366 201v-8m15 8v-14m15 14v-10m15 10v-23m15 23v-29" stroke="#6FDDF3" strokeWidth="5" strokeLinecap="round" />
    <circle cx="52" cy="224" r="5" fill="#A49DFF" /><path d="M16 66h19m-9-9v18m442 49h14m-7-7v14" stroke="#7892CA" strokeWidth="2" />
  </svg>
}

function WorkspaceGroups({ compact = false }) {
  const { state } = useStore()
  const groups = [
    ['Joined competitions', 'competitions', state.competitions.filter(item => isJoined(state, item)), competitionPath],
    ['My notebooks', 'code', state.notebooks.filter(item => item.ownerId === state.account.id), item => entityPath(state, 'code', item)],
    ['My datasets', 'datasets', state.datasets.filter(item => item.ownerId === state.account.id), item => entityPath(state, 'datasets', item)],
  ]
  return <div className="card-grid workspace-grid">
    {groups.map(([label, type, records, path]) => <section className="panel workspace-card" key={type}>
      <h3><Icon name={type} size={18} />{label}<span className="counter">{count(records.length)}</span></h3>
      {records.length ? <ul className="workspace-list">{(compact ? records.slice(0, 3) : records).map(item =>
        <li key={item.id}><AppLink to={path(item)}>{titleOf(item)}<Icon name="arrow" size={14} /></AppLink></li>)}</ul>
        : <p className="muted">No records yet.</p>}
    </section>)}
  </div>
}

function Home() {
  return <>
    <section className="hero">
      <div className="hero-content">
        <h1>Explore data.<br />Build what’s next.</h1>
        <p>Find a challenge, open a notebook, or get to know a new dataset on Kaggle.</p>
        <AppLink to="/workspace" className="button hero-button">My Workspace <Icon name="arrow" size={18} /></AppLink>
      </div>
      <HeroChart />
    </section>
    <section className="home-section" aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore Kaggle</h2>
      <div className="card-grid">{areas.map((area, index) => <AppLink to={`/${area.group}`} className="panel area-link" key={area.group}>
        <Art type={area.group} variant={index} /><div><h3>{area.label}</h3><p>{area.description}</p></div><Icon name="arrow" size={19} />
      </AppLink>)}</div>
    </section>
    <section className="home-section" aria-labelledby="workspace-heading">
      <div className="section-heading"><h2 id="workspace-heading">Your workspace</h2><AppLink to="/workspace" className="text-link">View workspace <Icon name="arrow" size={16} /></AppLink></div>
      <WorkspaceGroups compact />
    </section>
  </>
}

function Workspace() {
  const { state } = useStore()
  return <><Heading title="My Workspace" eyebrow={state.account.displayName ?? 'Kaggle account'} type="workspace"
    description="Find your joined competitions, notebooks, and datasets." /><WorkspaceGroups /></>
}

export default function App() {
  return <BrowserRouter><TopBar /><main className="page" id="main">
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/workspace" element={<Workspace />} />
      <Route path="/competitions" element={<Competitions />} />
      <Route path="/competitions/:slug" element={<CompetitionDetail />} />
      <Route path="/competitions/:slug/:tab" element={<CompetitionDetail />} />
      <Route path="/code" element={<Notebooks />} />
      <Route path="/code/new" element={<NewNotebook />} />
      <Route path="/code/:owner/:slug" element={<NotebookRoute />} />
      <Route path="/code/:owner/:slug/edit" element={<NotebookRoute edit />} />
      <Route path="/datasets" element={<Datasets />} />
      <Route path="/datasets/new" element={<NewDataset />} />
      <Route path="/datasets/:owner/:slug" element={<DatasetRoute />} />
      <Route path="*" element={<Missing />} />
    </Routes>
  </main></BrowserRouter>
}
