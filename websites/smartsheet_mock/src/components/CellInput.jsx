import React from 'react'
import { predecessorText } from '../data/cells.js'

export default function CellInput({ column, value, onChange, users = [], rows = [], booleanSelect = false, ...props }) {
  if (column.type === 'checkbox') {
    if (!booleanSelect) return <input {...props} type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} />
    return <select {...props} value={value == null ? '' : String(value)} onChange={event => onChange(event.target.value === '' ? null : event.target.value === 'true')}>
      <option value="">Select a value</option><option value="true">Checked</option><option value="false">Unchecked</option>
    </select>
  }
  if (column.type === 'contact' || column.type === 'dropdown') {
    const options = column.type === 'contact' ? users.map(user => ({ value: user.id, label: user.name ?? user.id })) : (column.options ?? []).map(option => ({ value: option, label: option }))
    return <select {...props} value={value ?? ''} onChange={event => onChange(event.target.value)}>
      <option value="">Select {column.type === 'contact' ? 'a contact' : 'an option'}</option>
      {value && !options.some(item => item.value === value) && <option value={value}>{value}</option>}
      {options.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  }
  const numeric = ['number', 'percent', 'duration'].includes(column.type)
  return <input {...props} type={column.type === 'date' ? 'date' : 'text'} inputMode={numeric ? 'decimal' : undefined}
    placeholder={column.type === 'predecessor' ? 'e.g. 2FS+1d' : props.placeholder}
    value={column.type === 'predecessor' && Array.isArray(value) ? predecessorText(value, rows) : value ?? ''}
    onChange={event => onChange(event.target.value)} />
}
