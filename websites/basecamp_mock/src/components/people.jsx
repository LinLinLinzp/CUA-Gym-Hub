import { array, byId, hasId } from '../utils/records.js'

export function Avatar({ person, size = 32 }) {
  const name = person?.name || 'Unknown person'
  const initials = person?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
  return <span className="avatar" role="img" aria-label={name} title={name} style={{ '--avatar-size': `${size}px`, backgroundColor: person?.avatarColor }}>{initials}</span>
}

export function Avatars({ people, limit = 6, size = 28 }) {
  if (!people.length) return null
  return <span className="avatars">
    {people.slice(0, limit).map((person) => <Avatar key={person.id} person={person} size={size} />)}
    {people.length > limit && <span className="avatar-more">+{people.length - limit}</span>}
  </span>
}

export const resolvePeople = (people, ids) => array(ids).map((id) => byId(people, id)).filter(Boolean)
export const personName = (people, id) => byId(people, id)?.name || 'Unknown person'

export function PeoplePicker({ label, people, selected, onChange }) {
  const selectedIds = array(selected)
  return <fieldset className="people-picker">
    <legend>{label}</legend>
    {!!selectedIds.length && <div className="chips">
      {[...new Set(selectedIds.map(String))].map((id) => {
        const person = byId(people, id)
        const name = person?.name || `Unavailable person (${id})`
        return <button key={id} type="button" className="chip"
          aria-label={`Remove ${name} from ${label}`}
          onClick={() => onChange(selectedIds.filter((selectedId) => String(selectedId) !== id))}>
          {person && <Avatar person={person} size={19} />} {name} <span aria-hidden="true">×</span>
        </button>
      })}
    </div>}
    <select aria-label={label} value="" onChange={(event) => {
      if (event.target.value) onChange([...selectedIds, event.target.value])
    }}>
      <option value="">{people.length ? 'Choose a person…' : 'No project members'}</option>
      {people.filter((person) => !hasId(selectedIds, person.id)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
  </fieldset>
}
