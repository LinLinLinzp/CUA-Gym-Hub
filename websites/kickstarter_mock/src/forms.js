export function textValues(record, keys) {
  return Object.fromEntries(keys.map(key => [key, String(record?.[key] ?? '')]))
}

export function bind(values, setValues, name) {
  return {
    value: values[name],
    onChange: event => setValues(current => ({ ...current, [name]: event.target.value })),
  }
}

export function selected(values, current) {
  return current && !values.includes(current) ? [...values, current] : values
}

export function validMoney(value, allowZero = false) {
  const input = String(value).trim()
  const amount = Number(input)
  return /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(input) && Number.isFinite(amount) &&
    amount <= Number.MAX_SAFE_INTEGER / 100 && (allowZero ? amount >= 0 : amount > 0)
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const time = Date.parse(value + 'T00:00:00Z')
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

export function today() {
  const date = new Date()
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
  return parts.map(part => String(part).padStart(2, '0')).join('-')
}

