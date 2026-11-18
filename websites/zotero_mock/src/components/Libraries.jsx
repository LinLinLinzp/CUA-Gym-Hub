import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { active, newId, records } from '../utils/model.js'
import { libraryPath } from '../utils/routes.js'
import { Dialog, Empty, FormActions, Menu } from './ui.jsx'

export function LibraryForm({ library, close }) {
  const { commit, announce } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState(library?.name ?? '')
  const [description, setDescription] = useState(library?.description ?? '')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a group name.')
      event.currentTarget.elements.groupName.focus()
      return
    }
    const id = library?.id ?? newId('lib')
    const changed = commit((state, audit, createdAt) => {
      const libraries = records(state.libraries)
      const fields = { name: name.trim(), description: description.trim(), ...audit }
      if (!library) {
        const group = { id, kind: 'group', visibility: 'private', role: 'owner', status: 'active', createdAt, ...fields }
        return { ...state, libraries: [...libraries, group] }
      }
      const existing = libraries.find((entry) => entry.id === id)
      if (!existing || !active(existing) || existing.kind !== 'group' || existing.role !== 'owner') return state
      return { ...state, libraries: libraries.map((entry) => entry.id === id ? { ...entry, ...fields } : entry) }
    })
    if (!changed) {
      setError('This group is no longer editable.')
      return
    }
    close()
    announce({ text: library ? 'Group details saved.' : 'Private group created.' })
    if (!library) navigate(libraryPath(id))
  }

  return <Dialog title={library ? 'Edit group details' : 'New group library'} close={close}>
    <form className="form" onSubmit={submit} noValidate>
      <p className="muted">{library ? 'Update the name and description shown in Libraries.' : 'Your new group library will be private.'}</p>
      <label>Group name<input data-initial-focus name="groupName" value={name} onChange={(event) => { setName(event.target.value); setError('') }}
        required aria-invalid={Boolean(error)} aria-describedby={error ? 'group-error' : undefined} /></label>
      {error && <p className="field-error" id="group-error" role="alert">{error}</p>}
      <label>Description <span className="optional">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></label>
      <FormActions close={close} submit={library ? 'Save changes' : 'Create group'} />
    </form>
  </Dialog>
}

export function Directory() {
  const { state } = useStore()
  const [form, setForm] = useState(null)
  const libraries = records(state.libraries).filter(active)
  const counts = new Map()
  for (const item of records(state.items).filter(active)) counts.set(item.libraryId, (counts.get(item.libraryId) ?? 0) + 1)

  return <>
    <div className="page-heading">
      <div><h1>Libraries</h1><p className="muted">Browse your personal and group research libraries.</p></div>
      <button className="primary" onClick={() => setForm({})}><span aria-hidden="true">＋</span> New Group</button>
    </div>
    {libraries.length === 0
      ? <Empty title="No libraries yet"><p>Create a private group to start a library.</p></Empty>
      : <div className="library-grid">
        {libraries.map((library) => {
          const count = counts.get(library.id) ?? 0
          return <article className="library-card" key={library.id}>
            <div className="card-top">
              <span className="library-icon" aria-hidden="true"><span className="paper-mark" /></span>
              {library.kind === 'group' && library.role === 'owner' && <Menu label={'Manage ' + library.name}><button onClick={() => setForm({ library })}>Edit group details</button></Menu>}
            </div>
            <div className="library-type">{library.kind === 'personal' ? 'Personal library' : 'Group library'}</div>
            <h2><Link to={libraryPath(library.id)}>{library.name || 'Untitled library'} <span aria-hidden="true">↗</span></Link></h2>
            {library.description && <p>{library.description}</p>}
            <div className="card-meta"><span>{count} {count === 1 ? 'reference' : 'references'}</span>{library.role && <span className="role">{library.role}</span>}</div>
          </article>
        })}
      </div>}
    {form && <LibraryForm library={form.library} close={() => setForm(null)} />}
  </>
}
