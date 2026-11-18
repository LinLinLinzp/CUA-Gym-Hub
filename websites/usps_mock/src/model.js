export const array = value => Array.isArray(value) ? value.filter(Boolean) : []
export const records = (state, key) => array(state[key])
export const byId = (state, key, id) => records(state, key).find(record => record.id === id)
export const label = value => value ? String(value).replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()) : 'Not provided'

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const DAY = 86400000

export function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value
}
export const showDate = value => {
  const date = typeof value === 'string' ? value.slice(0, 10) : ''
  return isDate(date) ? dateFormatter.format(new Date(date + 'T00:00:00Z')) : 'Not provided'
}
export const dateRange = (start, end) => end ? showDate(start) + ' – ' + showDate(end) : showDate(start)
export const dateDistance = (from, to) => (Date.parse(to) - Date.parse(from)) / DAY

export function today() {
  const time = new Date()
  return [time.getFullYear(), String(time.getMonth() + 1).padStart(2, '0'), String(time.getDate()).padStart(2, '0')].join('-')
}
export const addDays = (date, days) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10)
export function addMonths(date, months) {
  const result = new Date(date + 'T00:00:00Z')
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const finalDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, finalDay))
  return result.toISOString().slice(0, 10)
}
export const money = value => value == null || value === '' || !Number.isFinite(Number(value)) ? 'Not provided' : moneyFormatter.format(Number(value))

export const addressKeys = ['line1', 'line2', 'city', 'state', 'zip']
export const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ')
export const cleanAddress = address => Object.fromEntries(addressKeys.map(key => [key, key === 'state' ? clean(address?.[key]).toUpperCase() : clean(address?.[key])]).filter(([, value]) => value))
export const addressKey = address => addressKeys.map(key => clean(address?.[key]).toLowerCase()).join('|')
export const showAddress = address => {
  const cityState = [address?.city, address?.state].filter(Boolean).join(', ')
  return [address?.line1, address?.line2, [cityState, address?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Address not provided'
}

export const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value))
const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS FM GU MH MP PR PW VI AA AE AP'.split(' ')
export function validAddress(value) {
  const address = cleanAddress(value)
  return address.line1 && address.city && states.includes(address.state) && /^\d{5}(-\d{4})?$/.test(address.zip || '')
}

export const newest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(a.id || '').localeCompare(String(b.id || ''))
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), byte => byte.toString(16).padStart(2, '0')).join('')
export const makeId = prefix => prefix + '-' + token()
export const makeCode = prefix => prefix === 'coa'
  ? String(BigInt('0x' + token()) % 10000000000000000n).padStart(16, '0')
  : prefix + '-' + token().slice(0, 12).toUpperCase()
export const actor = state => state.account?.id || 'account-001'
export const created = (state, id, timestamp) => ({ id, createdAt: timestamp, createdBy: actor(state) })
export const updated = (state, timestamp) => ({ updatedAt: timestamp, updatedBy: actor(state) })
export const replace = (state, key, id, patch) => ({
  ...state, [key]: records(state, key).map(record => record.id === id ? { ...record, ...patch } : record),
})

export const choices = pairs => Object.entries(pairs)
export const deliveryMethods = { carrier_delivery: 'Carrier delivery', post_office_pickup: 'Post Office pickup' }
export const mailServices = { priority_mail_express: 'Priority Mail Express', priority_mail: 'Priority Mail', ground_advantage: 'USPS Ground Advantage', insured_mail: 'Insured Mail' }
export const claimReasons = { lost: 'Lost', damaged: 'Damaged', missing_contents: 'Missing contents' }
export const evidenceKinds = { proof_of_value: 'Proof of value', proof_of_insurance: 'Proof of insurance', proof_of_damage: 'Proof of damage' }
export const boxSizes = { xs: 'Extra Small', s: 'Small', m: 'Medium', l: 'Large', xl: 'Extra Large' }
export const boxTerms = [3, 6, 12]
