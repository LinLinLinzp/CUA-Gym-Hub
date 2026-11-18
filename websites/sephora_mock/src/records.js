export const asArray = (value) => Array.isArray(value) ? value : []
export const list = (value) => asArray(value).filter(Boolean)
export const cents = (value) => (
  typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
) && Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value) * 100) : null
