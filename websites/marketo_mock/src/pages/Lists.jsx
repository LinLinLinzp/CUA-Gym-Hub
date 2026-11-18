import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { usePaths } from '../navigation.jsx'
import { Button, Definition, DetailHeader, Pill, displayDate } from '../ui.jsx'
import { findRecord, listPeople, log, metadata, replace, validAudience } from '../data/model.js'
import { RecordForm } from '../components/RecordForm.jsx'
import { People } from '../components/People.jsx'
import { AudienceEditor } from '../components/AudienceEditor.jsx'
import { Activity } from '../components/Activity.jsx'
import { Missing } from '../App.jsx'

export function ListPage() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const list = findRecord(state.lists, id)
  return list ? <ListDetail key={id} list={list} /> : <Missing section="lists" title="List" />
}

function ListDetail({ list }) {
  const { state, commit } = useWorkspace()
  const { params, path } = usePaths()
  const [editing, setEditing] = useState(false)
  const smart = list.kind === 'smart'
  const tabs = smart ? [['smart-list', 'Smart List'], ['people', 'People'], ['overview', 'Overview']]
    : [['people', 'People'], ['overview', 'Overview']]
  const tab = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : tabs[0][0]
  const base = '/lists/' + encodeURIComponent(list.id)
  const programId = params.get('programId')
  const scope = list.programId ? findRecord(state.programs, list.programId)?.name || 'Unavailable program' : 'Database'
  const people = listPeople(state, list)

  function saveRules(config) {
    return commit(previous => {
      const current = findRecord(previous.lists, list.id)
      if (current?.kind !== 'smart' || !validAudience(previous, config)) return previous
      const meta = metadata(previous)
      const { matchMode, rules } = config
      return log({ ...previous, lists: replace(previous.lists, { ...current, matchMode, rules, ...meta.updated }) },
        meta, 'list_rules_saved', 'list', current.id)
    }, 'Smart list rules saved.')
  }

  return <>
    <DetailHeader back={path('/lists', { programId })} section="Lists" title={list.name || 'Untitled list'}
      meta={<><Pill value={list.kind} /><span>{scope}</span><span>{people.length} {people.length === 1 ? 'person' : 'people'}</span></>}
      actions={<Button onClick={() => setEditing(true)}>Edit list</Button>}
      tabs={tabs} tab={tab} tabPath={value => path(base, { tab: value, programId })} />
    {tab === 'overview' && <div className="detail-grid">
      <section className="card content-card"><h2>List details</h2>
        <Definition entries={[['Kind', <Pill value={list.kind} />], ['Scope', scope], ['Updated', displayDate(list.updatedAt)]]} />
        <h3>Description</h3><p className="preserve-lines">{list.description || 'No description.'}</p>
      </section><Activity entityType="list" entityId={list.id} />
    </div>}
    {tab === 'people' && <People key="people" list={list} rows={people} readOnly={list.kind !== 'static'} />}
    {tab === 'smart-list' && <AudienceEditor config={list} onSave={saveRules} />}
    {editing && <RecordForm section="lists" record={list} onClose={() => setEditing(false)} />}
  </>
}

