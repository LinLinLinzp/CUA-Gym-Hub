export function parseCsv(text, limit = Infinity) {
  const rows = []
  let row = [], field = '', quoted = false, closedQuote = false
  const endField = () => { row.push(field); field = ''; closedQuote = false }
  const endRow = () => {
    endField()
    if (row.some(value => value !== '') || row.length > 1) rows.push(row)
    row = []
  }
  for (let index = text.charCodeAt(0) === 0xfeff ? 1 : 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[index + 1] === '"') { field += '"'; index++ }
      else { quoted = false; closedQuote = true }
    } else if (char === ',') endField()
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      endRow()
      if (rows.length >= limit) return rows
    } else if (char === '"' && !field && !closedQuote) quoted = true
    else if (char === '"' || closedQuote) throw new Error('A quoted CSV field is malformed.')
    else field += char
  }
  if (quoted) throw new Error('A quoted CSV field is incomplete.')
  if (field || row.length || closedQuote) endRow()
  return rows
}

export async function predictionScore(file, direction) {
  if (!file || !file.size || !/\.csv$/i.test(file.name)) throw new Error('Choose a nonempty CSV file.')
  const text = await file.text()
  const [header, ...rows] = parseCsv(text)
  if (!header || header.length < 2 || header.some(value => !value.trim()) || !rows.length
    || rows.some(row => row.length !== header.length || row.some(value => !value.trim()))) {
    throw new Error('Include a CSV header and prediction rows with the same number of columns.')
  }
  const columns = header.map(value => value.trim().toLowerCase())
  const idColumn = columns.indexOf('id')
  const predictionColumn = columns.indexOf('prediction')
  if (idColumn === -1 || predictionColumn === -1 || new Set(columns).size !== columns.length) {
    throw new Error('Include unique CSV columns named id and prediction.')
  }
  const ids = new Set(rows.map(row => row[idColumn].trim()))
  if (ids.size !== rows.length) throw new Error('Use a different id on each row.')
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619)
  return Number(((direction === 'higher' ? .64 : .11) + (hash >>> 0) % 2600 / 10000).toFixed(4))
}
