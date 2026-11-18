import React, { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { createSheet, idFor } from '../data/sheets.js'
import { useStore } from '../store.jsx'
import { Button, Dialog, Problem, useAppNavigate } from './ui.jsx'

export default function CreateSheet({ onClose }) {
  const { state, commit } = useStore()
  const navigate = useAppNavigate()
  const workspaceRoute = useMatch('/workspaces/:workspaceId')
  const options = state.workspaces ?? []
  const [workspaceId, setWorkspaceId] = useState(workspaceRoute?.params.workspaceId ?? options[0]?.id ?? '')
  const [name, setName] = useState('')
  const [preset, setPreset] = useState('blank')
  const [error, setError] = useState('')
  return <Dialog title="Create a sheet" onClose={onClose}>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      try {
        const id = idFor('sh')
        commit(current => createSheet(current, { id, workspaceId, name, preset }))
        onClose()
        navigate('/sheets/' + id)
      } catch (failure) { setError(failure.message) }
    }}>
      <label className="field">Sheet name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="Enter a name" /></label>
      <label className="field">Workspace<select required value={workspaceId} onChange={event => setWorkspaceId(event.target.value)}><option value="">Select a workspace</option>{options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Sheet type<select value={preset} onChange={event => setPreset(event.target.value)}><option value="blank">Blank Sheet</option><option value="project">Project Sheet</option></select></label>
      {!options.length && <p className="muted">A workspace is required to create a sheet.</p>}
      <Problem message={error} />
      <div className="actions"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={!options.length}>Create sheet</Button></div>
    </form>
  </Dialog>
}
