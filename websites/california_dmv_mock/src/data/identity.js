import { list } from './display.js'

export function recordIdentity(collection, idPrefix, confirmationPrefix) {
  const records = list(collection)
  let sequence = records.length + 1
  while (true) {
    const id = `${idPrefix}-${String(sequence).padStart(4, '0')}`
    const confirmationCode = `${confirmationPrefix}-${String(100000 + sequence).padStart(6, '0')}`
    if (!records.some((record) => record?.id === id || record?.confirmationCode === confirmationCode)) return { id, confirmationCode }
    sequence += 1
  }
}
