import { useId, useState } from 'react'
import { Dialog, ErrorMessage, Field } from './ui.jsx'

export function Lookup({ title, referenceLabel, button, onClose, findMatch, renderMatch }) {
  const errorId = useId()
  const [values, setValues] = useState({ reference: '', firstName: '', lastName: '' })
  const [match, setMatch] = useState(null)
  const [error, setError] = useState('')

  function change(key, value) {
    setValues({ ...values, [key]: value })
    setError('')
    setMatch(null)
  }

  function search(event) {
    event.preventDefault()
    const result = findMatch(values)
    setMatch(result.record || null)
    setError(result.error || '')
  }

  function field(key, label) {
    return <Field label={label} value={values[key]} onChange={(event) => change(key, event.target.value)}
      required autoFocus={key === 'reference'} aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined} />
  }

  return <Dialog title={title} onClose={onClose}>
    <form className="stack" onSubmit={search}>
      {field('reference', referenceLabel)}
      <div className="form-grid">{field('firstName', 'First name')}{field('lastName', 'Last name')}</div>
      <ErrorMessage id={errorId}>{error}</ErrorMessage>
      <button className="button primary">{button}</button>
    </form>
    {match && <div className="stack match">{renderMatch(match, values, setError)}</div>}
  </Dialog>
}
