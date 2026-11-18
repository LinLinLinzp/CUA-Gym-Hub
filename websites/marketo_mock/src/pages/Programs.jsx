import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { usePaths } from '../navigation.jsx'
import { Button, Confirm, Definition, DetailHeader, Icon, Pill, displayDate } from '../ui.jsx'
import { findRecord, log, metadata, programMembers, records, replace } from '../data/model.js'
import { RecordForm } from '../components/RecordForm.jsx'
import { People } from '../components/People.jsx'
import { Activity } from '../components/Activity.jsx'
import { Missing } from '../App.jsx'

const tabs = [['overview', 'Overview'], ['members', 'Members'], ['assets', 'Assets']]

export function ProgramPage() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const program = findRecord(state.programs, id)
  return program ? <ProgramDetail key={id} program={program} /> : <Missing section="programs" title="Program" />
}

function ProgramDetail({ program }) {
  const { state, commit } = useWorkspace()
  const { params, path, navigate } = usePaths()
  const [dialog, setDialog] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [asset, setAsset] = useState(null)
  const menuButton = useRef(null)
  const tab = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'overview'
  const base = '/programs/' + encodeURIComponent(program.id)
  const archived = program.status === 'archived'
  const action = archived ? 'Restore' : 'Archive'

  function toggleArchive() {
    commit(previous => {
      const current = findRecord(previous.programs, program.id)
      if (!current) return previous
      const meta = metadata(previous)
      const status = archived ? 'active' : 'archived'
      if (current.status === status) return previous
      return log({ ...previous, programs: replace(previous.programs, { ...current, status, ...meta.updated }) },
        meta, archived ? 'program_restored' : 'program_archived', 'program', current.id)
    }, archived ? 'Program restored.' : 'Program archived.')
    setDialog(null)
  }

  const related = [
    { section: 'lists', title: 'Lists', singular: 'list', rows: records(state.lists) },
    { section: 'campaigns', title: 'Smart Campaigns', singular: 'smart campaign', rows: records(state.smartCampaigns) },
  ]
  return <>
    <DetailHeader back={path('/programs')} section="Programs" title={program.name || 'Untitled program'}
      meta={<><Pill value={program.status} /><span>{program.type || 'Unspecified type'}</span>{program.channel && <span className="tag">{program.channel}</span>}</>}
      actions={<div className="heading-actions">
        {tab === 'overview' && <Button onClick={() => setDialog('edit')}>Edit program</Button>}
        <div className="menu-wrap" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
        }} onKeyDown={event => {
          if (event.key === 'Escape') { setMenuOpen(false); event.currentTarget.querySelector('button')?.focus() }
        }}>
          <Button ref={menuButton} icon="more" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Actions</Button>
          {menuOpen && <div className="action-menu"><Button onClick={() => {
            menuButton.current?.focus()
            setMenuOpen(false)
            setDialog('archive')
          }}>{action} program</Button></div>}
        </div>
      </div>}
      tabs={tabs} tab={tab} tabPath={value => path(base, { tab: value })} />
    {tab === 'overview' && <div className="detail-grid">
      <section className="card content-card"><h2>Program details</h2>
        <Definition entries={[
          ['Folder', findRecord(state.folders, program.folderId)?.name], ['Type', program.type],
          ['Channel', program.channel], ['Updated', displayDate(program.updatedAt)],
        ]} />
        <h3>Description</h3><p className="preserve-lines">{program.description || 'No description.'}</p>
      </section>
      <Activity entityType="program" entityId={program.id} />
    </div>}
    {tab === 'members' && <People key="members" program={program} rows={programMembers(state, program.id)} />}
    {tab === 'assets' && <div className="detail-grid">
      {related.map(({ section, title, singular, rows }) => {
        const assets = rows.filter(row => row.programId === program.id)
        return <section className="card content-card" key={section}>
          <div className="section-heading"><div><h2>{title}</h2><p>{assets.length} linked</p></div>
            <Button icon="plus" onClick={() => setAsset(section)}>New {singular}</Button></div>
          {assets.length ? <ul className="asset-preview">{assets.slice(0, 5).map(row =>
            <li key={row.id}><Link to={path('/' + section + '/' + encodeURIComponent(row.id), { programId: program.id })}>{row.name || 'Untitled ' + singular}</Link></li>,
          )}</ul> : <p className="muted">No linked {title.toLowerCase()}.</p>}
          <Link className="inline-link" to={path('/' + section, { programId: program.id })}>View {title.toLowerCase()} <Icon name="right" size={14} /></Link>
        </section>
      })}
    </div>}
    {dialog === 'edit' && <RecordForm section="programs" record={program} onClose={() => setDialog(null)} />}
    {dialog === 'archive' && <Confirm title={action + ' program'} message={action + ' “' + (program.name || 'Untitled program') + '”?'}
      label={action + ' program'} destructive={!archived} onClose={() => setDialog(null)} onConfirm={toggleArchive} />}
    {asset && <RecordForm section={asset} programId={program.id} onClose={() => setAsset(null)}
      onSaved={(id, programId) => navigate(path('/' + asset + '/' + encodeURIComponent(id), { programId }))} />}
  </>
}

