import { useState } from 'react'
import { DialogActions, Field, Modal } from '../components'
import { randomToken } from '../workspace'
import { changeType, fieldDraft, fieldTypes, validateField } from './firestoreFields'

function FieldInputs({ draft, update, errors = {}, autoFocus }) {
  const change = (key) => (event) => update({ ...draft, [key]: event.target.value })
  return <>
    <div className="field-controls">
      <Field label="Field name" error={errors.name}>{(props) => <input {...props} autoFocus={autoFocus} value={draft.name} onChange={change('name')} />}</Field>
      <Field label="Type">{(props) => <select {...props} value={draft.type} onChange={(event) => update(changeType(draft, event.target.value))}>
        {fieldTypes.map((type) => <option key={type}>{type}</option>)}
      </select>}</Field>
    </div>
    {draft.type !== 'null' && <Field label={draft.type === 'timestamp' ? 'Value (UTC)' : 'Value'} error={errors.input}>{(props) => {
      if (draft.type === 'boolean') return <select {...props} value={draft.input} onChange={change('input')}><option>true</option><option>false</option></select>
      if (draft.type === 'map' || draft.type === 'array') return <textarea {...props} className="mono" rows={3} value={draft.input} onChange={change('input')} />
      const inputType = { timestamp: 'datetime-local', number: 'number' }[draft.type] || 'text'
      return <input {...props} type={inputType} step={inputType === 'text' ? undefined : 'any'} value={draft.input} onChange={change('input')} />
    }}</Field>}
  </>
}

export function EditField({ field, existingFields, onSave, onClose }) {
  const [draft, setDraft] = useState(() => fieldDraft(field))
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const result = validateField(draft, new Set(existingFields.filter((entry) => entry !== field).map((entry) => entry.name)))
    setErrors(result.errors)
    if (!Object.keys(result.errors).length) onSave(result.field)
  }
  const title = field ? 'Edit field' : 'Add field'
  return <Modal title={title} onClose={onClose} wide>
    <form onSubmit={submit} noValidate>
      <FieldInputs draft={draft} update={setDraft} errors={errors} autoFocus />
      <DialogActions onClose={onClose} submit={field ? 'Save field' : 'Add field'} />
    </form>
  </Modal>
}

function idError(id, inUse) {
  if (!id) return 'Enter an ID.'
  if (id.includes('/') || id === '.' || id === '..') return 'Use a single path segment without a slash.'
  if (inUse(id)) return 'This ID already exists here.'
}

export function CreateDocument({ createCollection, collectionExists, documentExists, onSave, onClose }) {
  const [collection, setCollection] = useState('')
  const [doc, setDoc] = useState('')
  const [autoId, setAutoId] = useState('')
  const [drafts, setDrafts] = useState([{ key: 0, value: fieldDraft() }])
  const [nextKey, setNextKey] = useState(1)
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const collectionId = collection.trim()
    const documentId = autoId || doc.trim()
    const next = {
      collection: createCollection ? idError(collectionId, collectionExists) : undefined,
      doc: idError(documentId, (id) => documentExists(collectionId, id)),
    }
    const names = new Set()
    const fieldErrors = {}
    const fields = drafts.map(({ key, value }) => {
      const result = validateField(value, names)
      names.add(result.field.name)
      if (Object.keys(result.errors).length) fieldErrors[key] = result.errors
      return result.field
    })
    setErrors({ ...next, fields: fieldErrors })
    if (!next.collection && !next.doc && !Object.keys(fieldErrors).length) onSave(collectionId, documentId, fields)
  }
  const title = createCollection ? 'Start collection' : 'Add document'
  return <Modal title={title} onClose={onClose} wide>
    <form onSubmit={submit} noValidate>
      {createCollection && <>
        <p className="dialog-copy">A new collection starts with its first document.</p>
        <Field label="Collection ID" error={errors.collection}>{(props) => <input {...props} value={collection} onChange={(event) => setCollection(event.target.value)} autoFocus />}</Field>
      </>}
      <div className="field-controls auto-id">
        <Field label="Document ID" error={errors.doc}>{(props) => <input {...props} value={autoId || doc}
          onChange={(event) => { setAutoId(''); setDoc(event.target.value) }} autoFocus={!createCollection} />}</Field>
        <button type="button" onClick={() => setAutoId(randomToken().slice(0, 20))}>Auto ID</button>
      </div>
      <div className="panel-heading document-form-heading">
        <h3>Document fields</h3>
        <button type="button" onClick={() => { setDrafts([...drafts, { key: nextKey, value: fieldDraft() }]); setNextKey(nextKey + 1) }}>Add field</button>
      </div>
      {drafts.map(({ key, value }, index) => <fieldset key={key} className="draft-field">
        <legend>Field {index + 1}</legend>
        <FieldInputs draft={value} errors={errors.fields?.[key]} update={(next) => setDrafts(drafts.map((draft) => draft.key === key ? { ...draft, value: next } : draft))} />
        <button type="button" className="danger-text" onClick={() => setDrafts(drafts.filter((draft) => draft.key !== key))}>Remove field</button>
      </fieldset>)}
      <DialogActions onClose={onClose} submit={createCollection ? 'Create collection' : 'Create document'} />
    </form>
  </Modal>
}
