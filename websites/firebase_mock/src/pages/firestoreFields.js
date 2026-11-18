export const fieldTypes = ['string', 'number', 'boolean', 'null', 'timestamp', 'map', 'array']
const initialValues = { string: '', number: '', boolean: 'true', timestamp: '', map: '{}', array: '[]', null: '' }

export function fieldDraft(field) {
  if (!field) return { name: '', type: 'string', input: '' }
  const { name, type, value } = field
  const input = type === 'map' || type === 'array' ? JSON.stringify(value, null, 2)
    : type === 'timestamp' ? String(value ?? '').replace(/Z$/, '')
    : value == null ? initialValues[type] : String(value)
  return { name, type, input }
}

export function changeType(draft, type) {
  return { ...draft, type, input: initialValues[type] }
}

function fieldValue({ type, input }) {
  switch (type) {
    case 'string': return input
    case 'boolean': return input === 'true'
    case 'null': return null
    case 'number': {
      const value = Number(input)
      if (!input.trim() || !Number.isFinite(value)) throw new Error('Enter a finite number.')
      return value
    }
    case 'timestamp': {
      const value = new Date(`${input}Z`)
      if (!input || !Number.isFinite(value.getTime()) || !value.toISOString().startsWith(input)) throw new Error('Enter a valid UTC date and time.')
      return value.toISOString()
    }
    case 'map':
    case 'array': {
      const description = type === 'map' ? 'a JSON object' : 'a JSON array'
      let value
      try { value = JSON.parse(input, (_, entry) => {
        if (typeof entry === 'number' && !Number.isFinite(entry)) throw new Error()
        return entry
      }) } catch { throw new Error(`Enter valid JSON for ${description} with finite numbers.`) }
      const valid = type === 'array' ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value)
      if (!valid) throw new Error(`Enter ${description}.`)
      return value
    }
    default: throw new Error('Choose a supported field type.')
  }
}

export function validateField(draft, names) {
  const name = draft.name.trim()
  const errors = {}
  if (!name) errors.name = 'Enter a field name.'
  else if (names.has(name)) errors.name = 'This field name already exists.'
  let value
  try { value = fieldValue(draft) }
  catch (error) { errors.input = error.message }
  return { errors, field: { name, type: draft.type, value } }
}
