import { Trash2 } from 'lucide-react'
import { AppLink, projectPath } from '../components/navigation.jsx'
import { personName } from '../components/people.jsx'
import { Breadcrumbs, Empty, PageHeading } from '../components/ui.jsx'
import { useProject, useStore } from '../store.jsx'
import { formatInstant, validZone } from '../utils/dates.js'
import { active, boardOf, byId, idOrder, inProject, sameId, scheduleOf } from '../utils/records.js'

const bins = [
  ['todoLists', 'To-do list'], ['todos', 'To-do'], ['messages', 'Message Board'], ['scheduleEntries', 'Schedule'],
]
const trashId = (list) => 'trashed-list-' + encodeURIComponent(list.id)

function trashedRecords(state, project) {
  const lists = inProject(state.todoLists, project)
  const board = boardOf(state, project)
  const schedule = scheduleOf(state, project)
  const actor = state.workspace?.currentUserId
  return bins.flatMap(([collection, tool]) => inProject(state[collection], project).flatMap((record) => {
    if (record.status !== 'trashed') return []
    if (collection === 'messages' && (!sameId(record.boardId, board?.id) ||
      record.statusBeforeTrash === 'draft' && !sameId(record.createdById, actor))) return []
    if (collection === 'scheduleEntries' && !sameId(record.scheduleId, schedule?.id)) return []
    const list = collection === 'todos' ? byId(lists, record.listId) : null
    return [{ collection, record, list, tool }]
  })).sort((a, b) => (b.record.updatedAt ?? '').localeCompare(a.record.updatedAt ?? '') || idOrder(a.record, b.record))
}

export function ProjectTrash() {
  const project = useProject()
  const { state, restore } = useStore()
  const records = trashedRecords(state, project)
  const zone = validZone(state.workspace?.timeZone)
  const base = projectPath(project)
  const path = base + '/trash'

  return <>
    <Breadcrumbs items={[{ label: project.name || 'Project', to: base }, { label: 'Trash' }]} />
    <PageHeading title="Trash" icon={Trash2} />
    {records.length ? <ul className="card message-list trash-list">{records.map(({ collection, record, list, tool }) => {
      const blocked = collection === 'todos' && !active(list)
      return <li key={collection + '-' + record.id} id={collection === 'todoLists' ? trashId(record) : undefined}
        tabIndex={collection === 'todoLists' ? -1 : undefined}>
        <div><h3>{record.title || record.subject || record.name || 'Untitled item'}</h3>
          <p className="small muted">{tool} · {personName(state.people, record.updatedById)}{record.updatedAt && ' · ' + formatInstant(record.updatedAt, zone)}</p>
          {blocked && (list?.status === 'trashed'
            ? <AppLink to={path + '#' + trashId(list)} onClick={() => {
              requestAnimationFrame(() => document.getElementById(trashId(list))?.focus())
            }}>Restore {list.name || 'the parent list'} first</AppLink>
            : <span className="small muted">The parent list is unavailable.</span>)}
        </div>
        <button type="button" className="button secondary" disabled={blocked} onClick={() => restore(collection, record.id, project.id)}>
          Restore
        </button>
      </li>
    })}</ul> : <Empty>The project trash is empty.</Empty>}
  </>
}
