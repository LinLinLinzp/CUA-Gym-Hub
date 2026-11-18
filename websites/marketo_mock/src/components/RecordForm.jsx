import { useState } from 'react'
import { Button, Field, Modal } from '../ui.jsx'
import { useWorkspace } from '../store.jsx'
import { channels } from '../data/catalog.js'
import { findRecord, log, metadata, newId, normalized, records, replace, unique } from '../data/model.js'

const types = unique(channels.map(channel => channel.type))
const configs = {
  programs: { label: 'program', collection: 'programs', prefix: 'program', entity: 'program' },
  lists: { label: 'list', collection: 'lists', prefix: 'list', entity: 'list' },
  campaigns: { label: 'smart campaign', collection: 'smartCampaigns', prefix: 'campaign', entity: 'smartCampaign' },
}

function Select({ value, onChange, options, placeholder }) {
  return <select value={value} onChange={event => onChange(event.target.value)}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
  </select>
}

export function RecordForm({ section, record, programId: preselected, onClose, onSaved }) {
  const { state, commit } = useWorkspace()
  const config = configs[section]
  const creating = !record
  const isProgram = section === 'programs'
  const isList = section === 'lists'
  const [name, setName] = useState(record?.name ?? '')
  const [description, setDescription] = useState(record?.description ?? '')
  const [folderId, setFolder] = useState('')
  const [type, setType] = useState('')
  const [channel, setChannel] = useState('')
  const [kind, setKind] = useState('static')
  const [scope, setScope] = useState(preselected ? 'program' : 'database')
  const [programId, setProgram] = useState(preselected ?? '')
  const [errors, setErrors] = useState({})
  const availableChannels = channels.filter(item => item.type === type)
  const owningProgram = isList && scope === 'database' ? null : programId

  function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    const trimmedName = name.trim()
    const ownerKey = isProgram ? 'folderId' : 'programId'
    const owner = record ? record[ownerKey] : isProgram ? folderId : owningProgram
    if (!trimmedName) nextErrors.name = 'Enter a name.'
    else if (records(state[config.collection]).some(item => item.id !== record?.id &&
      (item[ownerKey] ?? null) === (owner ?? null) && normalized(item.name) === normalized(trimmedName))) {
      nextErrors.name = 'This name is already in use in this ' + (isProgram ? 'folder.' : isList ? 'scope.' : 'program.')
    }
    if (creating && isProgram) {
      if (!findRecord(state.folders, folderId)) nextErrors.folder = 'Select a folder.'
      if (!types.includes(type)) nextErrors.type = 'Select a type.'
      if (!availableChannels.some(item => item.name === channel)) nextErrors.channel = 'Select a compatible channel.'
    }
    if (creating && !isProgram && (!isList || scope === 'program') && !findRecord(state.programs, owningProgram)) {
      nextErrors.program = 'Select a program.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const id = record?.id ?? newId(config.prefix)
    const fields = { name: trimmedName, description: description.trim() }
    const saved = commit(previous => {
      const meta = metadata(previous)
      const collection = previous[config.collection] ?? []
      let nextRecord
      if (record) {
        const current = findRecord(collection, id)
        if (!current || (current.name === fields.name && (current.description ?? '') === fields.description)) return previous
        nextRecord = { ...current, ...fields, ...meta.updated }
      } else {
        const definition = isProgram ? { folderId, type, channel, status: 'active' }
          : isList ? { kind, programId: owningProgram, matchMode: null, rules: [] }
            : { programId, mode: 'batch', status: 'draft', matchMode: null, rules: [], triggers: [], flow: [], activatedAt: null, deactivatedAt: null }
        nextRecord = { id, ...fields, ...definition, ...meta.created }
      }
      const next = { ...previous, [config.collection]: record ? replace(collection, nextRecord) : [...collection, nextRecord] }
      return log(next, meta, config.prefix + (creating ? '_created' : '_updated'), config.entity, id)
    }, creating ? 'Created ' + trimmedName + '.' : 'Saved changes.')
    onClose()
    if (saved) onSaved?.(id, isProgram ? null : owningProgram)
  }

  function chooseType(value) {
    setType(value)
    const compatible = channels.filter(item => item.type === value)
    setChannel(compatible.length === 1 ? compatible[0].name : '')
  }

  return <Modal title={(creating ? 'New ' : 'Edit ') + config.label} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <div className="form-body">
        <Field label="Name" error={errors.name}><input autoFocus value={name} maxLength={140} onChange={event => setName(event.target.value)} /></Field>
        {creating && isProgram && <>
          <Field label="Folder" error={errors.folder}><Select value={folderId} onChange={setFolder} placeholder="Select a folder"
            options={records(state.folders).map(folder => [folder.id, folder.name || 'Unnamed folder'])} /></Field>
          <div className="form-grid">
            <Field label="Type" error={errors.type}><Select value={type} onChange={chooseType} placeholder="Select a type" options={types.map(value => [value, value])} /></Field>
            <Field label="Channel" error={errors.channel}><Select value={channel} onChange={setChannel} placeholder="Select a channel" options={availableChannels.map(item => [item.name, item.name])} /></Field>
          </div>
        </>}
        {creating && isList && <div className="form-grid">
          <Field label="Kind"><Select value={kind} onChange={setKind} options={['static', 'smart'].map(value => [value, value === 'static' ? 'Static list' : 'Smart list'])} /></Field>
          <Field label="Scope"><Select value={scope} onChange={setScope} options={ [['database', 'Database'], ['program', 'Program']] } /></Field>
        </div>}
        {creating && !isProgram && (!isList || scope === 'program') &&
          <Field label="Program" error={errors.program}><Select value={programId} onChange={setProgram} placeholder="Select a program"
            options={records(state.programs).map(program => [program.id, program.name || 'Unnamed program'])} /></Field>}
        <Field label="Description (optional)"><textarea value={description} rows={3} maxLength={2000} onChange={event => setDescription(event.target.value)} /></Field>
      </div>
      <div className="dialog-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">{creating ? 'Create ' + config.label : 'Save changes'}</Button>
      </div>
    </form>
  </Modal>
}

