import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store'
import { date, eventId, find, list, matches, today, validDay } from '../model'
import { Back, Badge, ButtonLink, Dialog, Empty, ErrorText, Filter, Icon, Labelled, Missing, PageHeader, Portrait, Search, SiteLink, routeId, useSiteNavigate } from '../ui'

const species = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Guinea pig', 'Hamster', 'Reptile', 'Fish', 'Other']
const fields = ['name', 'species', 'breed', 'birthday', 'weightLbs', 'notes']
const profileValues = (pet = {}) => Object.fromEntries(fields.map(key => [key, pet[key] ?? (key === 'weightLbs' ? null : '')]))

export function Pets() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const pets = list(state.pets).filter(pet => pet.status !== 'removed')
  const options = [...new Set([...species, ...pets.map(pet => pet.species).filter(Boolean)])]
  const visible = pets.filter(pet => (!filter || pet.species === filter) && matches(query, pet.name, pet.breed))
  return <>
    <PageHeader title="Pet Profiles" description="Keep your pets’ details together."><ButtonLink primary to="/pets/new"><Icon name="plus" size={16} />Add a pet</ButtonLink></PageHeader>
    <section aria-label="Pet profiles">
      <div className="toolbar">
        <Search label="Search by pet name or breed" value={query} onChange={setQuery} />
        <Filter label="Species" options={Object.fromEntries([['', 'All species'], ...options.map(value => [value, value])])} value={filter} onChange={setFilter} />
      </div>
      {!visible.length && <Empty title={query || filter ? 'No matching pets' : 'No pet profiles yet'} />}
      <div className="grid">{visible.map(pet => <SiteLink className="card pet-card" key={pet.id} to={'/pets/' + routeId(pet.id)}>
        <Portrait species={pet.species} /><div><h3>{pet.name || 'Pet profile'}</h3><small>{[pet.species, pet.breed].filter(Boolean).join(' · ') || 'Pet'}</small></div>
      </SiteLink>)}</div>
    </section>
  </>
}

export function PetDetail({ create = false }) {
  const { id } = useParams()
  const { state } = useAccount()
  const pet = find(state.pets, id)
  if (!create && !pet) return <Missing to="/pets" label="Back to Pet Profiles" title="Pet profile not found" />
  return <Profile key={create ? 'new' : id} pet={pet} create={create} />
}

function Profile({ pet, create }) {
  const { commit } = useAccount()
  const navigate = useSiteNavigate()
  const [editing, setEditing] = useState(create)
  const [draft, setDraft] = useState(() => profileValues(pet))
  const [errors, setErrors] = useState({})
  const [removing, setRemoving] = useState(false)
  const removed = pet?.status === 'removed'

  function edit() {
    setDraft(profileValues(pet))
    setErrors({})
    setEditing(true)
  }

  function save(event) {
    event.preventDefault()
    const profile = {
      name: draft.name.trim(), species: draft.species, breed: draft.breed.trim(), birthday: draft.birthday,
      weightLbs: draft.weightLbs === '' || draft.weightLbs === null ? null : Number(draft.weightLbs), notes: draft.notes.trim(),
    }
    const validation = {}
    if (!profile.name) validation.name = 'Enter your pet’s name.'
    if (!profile.species) validation.species = 'Choose a species.'
    if (profile.birthday && (!validDay(profile.birthday) || profile.birthday > today())) validation.birthday = 'Enter a birthday today or earlier.'
    if (profile.weightLbs !== null && (!Number.isFinite(profile.weightLbs) || profile.weightLbs <= 0)) validation.weightLbs = 'Enter a weight greater than zero.'
    setErrors(validation)
    if (Object.keys(validation).length) return
    const id = create ? eventId('pet') : pet.id
    try {
      commit((state, metadata) => {
        const existing = find(state.pets, id)
        if (!create && (!existing || existing.status === 'removed')) throw Error('This profile is no longer active.')
        const previous = create ? null : profileValues(existing)
        if (!create && fields.every(key => previous[key] === profile[key])) return state
        const next = create ? { ...profile, status: 'active' } : profile
        const updated = create ? { id, ...next, ...metadata } : { ...existing, ...profile, updatedAt: metadata.createdAt, updatedBy: metadata.actorId }
        const pets = list(state.pets)
        return { ...state, pets: create ? [updated, ...pets] : pets.map(entry => entry.id === id ? updated : entry),
          petEvents: [...list(state.petEvents), { id: eventId('pee'), petId: id, action: create ? 'created' : 'updated', ...metadata, previous, next }] }
      }, create ? 'Pet profile added.' : 'Pet profile updated.')
      if (create) navigate('/pets/' + routeId(id), { replace: true })
      else setEditing(false)
    } catch (err) { setErrors({ form: err.message }) }
  }

  function remove() {
    try {
      commit((state, metadata) => {
        const existing = find(state.pets, pet.id)
        if (!existing || existing.status === 'removed') throw Error('This profile has already been removed.')
        const previous = { status: existing.status || 'active' }
        const next = { status: 'removed', removedAt: metadata.createdAt }
        return { ...state, pets: list(state.pets).map(entry => entry.id === pet.id
          ? { ...entry, ...next, updatedAt: metadata.createdAt, updatedBy: metadata.actorId } : entry),
          petEvents: [...list(state.petEvents), { id: eventId('pee'), petId: pet.id, action: 'removed', ...metadata, previous, next }] }
      }, 'Pet profile removed.')
      setRemoving(false)
      navigate('/pets')
    } catch (err) { setErrors({ form: err.message }) }
  }

  const change = (field) => event => setDraft({ ...draft, [field]: event.target.value })
  const input = (field, props) => <input {...props} value={draft[field] ?? ''} onChange={change(field)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? field + '-error' : undefined} />
  const error = (field) => errors[field] && <span className="error" role="alert" id={field + '-error'}>{errors[field]}</span>
  const options = [...new Set([...species, draft.species].filter(Boolean))]
  return <>
    <Back to="/pets">Pet Profiles</Back>
    <PageHeader title={create ? 'Add a pet' : pet.name || 'Pet profile'} description={create ? 'Start with a name and species. Add other details whenever you’re ready.' : pet.species}>
      {!create && <Badge status={pet.status || 'active'} />}
    </PageHeader>
    {editing ? <form className="card" onSubmit={save} noValidate>
      <h2>{create ? 'Pet details' : 'Edit profile'}</h2>
      <div className="form-fields">
        <Labelled label="Name">{input('name', { required: true, maxLength: 80 })}{error('name')}</Labelled>
        <Labelled label="Species"><select required value={draft.species} onChange={change('species')} aria-invalid={Boolean(errors.species)} aria-describedby={errors.species ? 'species-error' : undefined}>
          <option value="">Choose a species</option>{options.map(option => <option key={option}>{option}</option>)}
        </select>{error('species')}</Labelled>
        <Labelled label="Breed (optional)">{input('breed', { maxLength: 100 })}</Labelled>
        <Labelled label="Birthday (optional)">{input('birthday', { type: 'date', max: today() })}{error('birthday')}</Labelled>
        <Labelled label="Weight in pounds (optional)">{input('weightLbs', { type: 'number', min: '0', step: 'any' })}{error('weightLbs')}</Labelled>
        <Labelled label="Notes (optional)" className="wide"><textarea value={draft.notes} onChange={change('notes')} maxLength={1500} /></Labelled>
      </div>
      <ErrorText>{errors.form}</ErrorText>
      <div className="actions">
        <button className="primary" type="submit">{create ? 'Add pet' : 'Save profile'}</button>
        {create ? <ButtonLink to="/pets">Cancel</ButtonLink> : <button type="button" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
    </form> : <div className="detail-grid">
      <section className="card">
        <h2>Profile details</h2>
        <dl className="detail-data">
          <div><dt>Species</dt><dd>{pet.species || 'Not provided'}</dd></div>
          <div><dt>Breed</dt><dd>{pet.breed || 'Not provided'}</dd></div>
          <div><dt>Birthday</dt><dd>{pet.birthday ? date(pet.birthday) : 'Not provided'}</dd></div>
          <div><dt>Weight</dt><dd>{pet.weightLbs ? pet.weightLbs + ' lb' : 'Not provided'}</dd></div>
          <div><dt>Notes</dt><dd>{pet.notes || 'No notes added'}</dd></div>
          {removed && <div><dt>Removed</dt><dd>{date(pet.removedAt)}</dd></div>}
        </dl>
        {!removed && <div className="actions"><button className="primary" onClick={edit}>Edit profile</button><button onClick={() => { setErrors({}); setRemoving(true) }}>Remove profile</button></div>}
      </section>
      <div className="card"><Portrait species={pet.species} /></div>
    </div>}
    {removing && <Dialog title="Remove profile" confirm="Remove pet" danger onClose={() => setRemoving(false)} onSubmit={remove}>
      <p>Remove {pet.name || 'this pet'} from your active profiles?</p><ErrorText>{errors.form}</ErrorText>
    </Dialog>}
  </>
}

