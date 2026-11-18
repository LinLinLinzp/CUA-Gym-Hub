import { useId, useState } from 'react'
import { label } from './model'
import { useWorkspace } from './state'
import { Button, Modal } from './ui'

export const profileFields = [
  ['firstName', 'First name', 'text', true],
  ['lastName', 'Last name', 'text', true],
  ['username', 'Username', 'email', true],
  ['email', 'Primary email', 'email', true],
  ['secondaryEmail', 'Secondary email', 'email'],
  ['department', 'Department'],
  ['title', 'Job title'],
]
const groupFields = [['name', 'Group name', 'text', true], ['description', 'Description', 'textarea']]
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getValues(fields, record) {
  return Object.fromEntries(fields.map(([field]) => [field, record?.[field] || '']))
}

function Field({ field, caption, type = 'text', required, value, onChange, error, initialFocus }) {
  const id = useId()
  const props = { id, value, onChange, required, 'data-initial-focus': initialFocus || undefined, 'aria-invalid': Boolean(error), 'aria-describedby': error ? id + '-error' : undefined }
  return <label className="field" htmlFor={id}>
    <span>{caption}{required && <span className="required" aria-hidden="true"> *</span>}</span>
    {type === 'textarea' ? <textarea {...props} rows={4} maxLength={500} /> : <input {...props} name={field} type={type} maxLength={254} />}
    {error && <span className="error" id={id + '-error'} role="alert">{error}</span>}
  </label>
}

export function RecordForm({ kind, record, onClose }) {
  const { commit } = useWorkspace()
  const person = kind === 'people'
  const fields = person ? profileFields : groupFields
  const collection = person ? 'users' : 'groups'
  const entity = person ? 'USER' : 'GROUP'
  const [values, setValues] = useState(() => getValues(fields, record))
  const [status, setStatus] = useState('ACTIVE')
  const [errors, setErrors] = useState({})
  const title = record ? (person ? 'Edit Profile' : 'Edit Group') : (person ? 'Add Person' : 'Add Group')

  function submit(event) {
    event.preventDefault()
    const clean = Object.fromEntries(fields.map(([field]) => [field, values[field].trim()]))
    const problems = {}
    for (const [field, caption, type, required] of fields) {
      if (required && !clean[field]) problems[field] = caption + ' is required.'
      else if (type === 'email' && clean[field] && !emailPattern.test(clean[field])) problems[field] = 'Enter a valid email address.'
    }
    if (Object.keys(problems).length) {
      setErrors(problems)
      event.currentTarget.elements.namedItem(Object.keys(problems)[0])?.focus()
      return
    }

    const identifier = person ? 'username' : 'name'
    const saved = commit((state, meta) => {
      const records = state[collection]
      if (records.some(row => row.id !== record?.id && row[identifier]?.toLowerCase() === clean[identifier].toLowerCase())) {
        problems[identifier] = person ? 'This username is already in use.' : 'This group name is already in use.'
        return null
      }
      if (!record) {
        const id = meta.id(person ? 'usr' : 'grp')
        meta.event(entity + '_CREATED', entity, id, person ? { status } : {})
        return { [collection]: [...records, { id, ...clean, ...(person ? { status } : { source: 'OKTA' }), ...meta.created, ...meta.updated }] }
      }
      const current = records.find(row => row.id === record.id)
      if (!current || (!person && current.source !== 'OKTA')) {
        problems.form = 'This record is no longer editable.'
        return null
      }
      const changedFields = Object.keys(clean).filter(field => (current[field] ?? '') !== clean[field])
      if (!changedFields.length) return null
      const updatedFields = Object.fromEntries(changedFields.map(field => [field, clean[field]]))
      meta.event(entity + '_UPDATED', entity, current.id, { changedFields })
      return { [collection]: records.map(row => row.id === current.id ? { ...row, ...updatedFields, ...meta.updated } : row) }
    }, person ? (record ? 'Profile saved.' : 'Person added.') : (record ? 'Group saved.' : 'Group added.'))

    if (!saved && Object.keys(problems).length) {
      setErrors(problems)
      event.currentTarget.elements.namedItem(identifier)?.focus()
      return
    }
    if (!record && saved && event.nativeEvent.submitter?.value === 'another') {
      setValues(getValues(fields))
      setStatus('ACTIVE')
      setErrors({})
      event.currentTarget.elements.namedItem(fields[0][0])?.focus()
      return
    }
    onClose()
  }

  return <Modal title={title} onClose={onClose} drawer>
    <form className="dialog-form" noValidate onSubmit={submit}>
      <div className="dialog-body form-fields">
        {fields.map(([field, caption, type, required], index) => <Field
          key={field} field={field} caption={caption} type={type} required={required} value={values[field]}
          initialFocus={index === 0} error={errors[field]}
          onChange={event => {
            setValues(current => ({ ...current, [field]: event.target.value }))
            setErrors(current => ({ ...current, [field]: '' }))
          }}
        />)}
        {person && !record && <label className="field">Initial status
          <select value={status} onChange={event => setStatus(event.target.value)}>
            {['ACTIVE', 'STAGED'].map(value => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>}
        {errors.form && <p className="error" role="alert">{errors.form}</p>}
      </div>
      <footer className="dialog-footer">
        <Button onClick={onClose}>Cancel</Button>
        <Button tone="primary" type="submit">{record ? 'Save Changes' : 'Save'}</Button>
        {!record && <Button type="submit" value="another">Save and Add Another</Button>}
      </footer>
    </form>
  </Modal>
}
