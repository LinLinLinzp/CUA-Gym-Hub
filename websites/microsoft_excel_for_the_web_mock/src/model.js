export const records = (world, key) => Array.isArray(world[key]) ? world[key] : []
export const append = (world, key, ...items) => { world[key] = [...records(world, key), ...items] }
export const active = record => record && record.status !== 'deleted'
export const findRecord = (world, key, id) => records(world, key).find(record => record.id === id)
export const sheetsFor = (world, workbookId) => records(world, 'sheets')
  .filter(sheet => active(sheet) && sheet.workbookId === workbookId)
  .sort((a,b) => (a.position ?? 0) - (b.position ?? 0))
export const visibleSheets = (world, workbookId) => sheetsFor(world, workbookId).filter(sheet => sheet.visibility !== 'hidden')
export const cellsFor = (world, sheetId) => records(world, 'cells').filter(cell => cell.sheetId === sheetId)
export function newId(key) {
  const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join('')
  return `${key}-${id}`
}
export const touch = (record, tx) => Object.assign(record, {updatedAt:tx.now, updatedBy:tx.actor})
export const audit = tx => ({createdAt:tx.now, createdBy:tx.actor, updatedAt:tx.now, updatedBy:tx.actor})

