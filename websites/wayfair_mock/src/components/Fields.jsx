import { useId, useState } from 'react'
import { label } from '../data/rules.js'

export function SelectField({ title, options, value, onChange, placeholder, required = false, ...props }) {
  const titleId = useId()
  return <label className="field">
    <span id={titleId}>{title}</span>
    <select {...props} aria-labelledby={titleId} required={required} value={value} onChange={(event) => onChange(event.currentTarget.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => typeof option === 'string'
        ? <option value={option} key={option}>{label(option)}</option>
        : <option value={option.value} key={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
  </label>
}

export function QuantityField({ value, limit, onChange, itemName }) {
  const hintId = useId()
  const [invalid, setInvalid] = useState(false)
  return <label className="field quantity-field">
    <span>Quantity</span>
    <input type="number" min="1" max={limit} step="1" value={value} required
      aria-label={itemName ? 'Quantity for ' + itemName : 'Quantity'} aria-describedby={hintId} aria-invalid={invalid || undefined}
      onInvalid={(event) => { event.preventDefault(); setInvalid(true); event.currentTarget.focus() }}
      onChange={(event) => { setInvalid(false); onChange(event.currentTarget.value) }} />
    <small className={invalid ? 'field-error' : 'muted'} role={invalid ? 'alert' : undefined} id={hintId}>
      {invalid ? 'Enter a whole quantity from 1 to ' + limit + '.' : limit + ' available'}
    </small>
  </label>
}
