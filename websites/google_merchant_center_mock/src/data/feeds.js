import { currencies, fixtureKeyFor, fixtureText } from './seed.js'
import {
  active, addProductChanges, availabilities, changeRecord, changesBetween, conditions, isWebUrl, newId, numericPrice,
  offerKey, productFields, replaceById, resolveProductCorrections, rows, supportedCurrencies, text, tombstoneProducts, validGtin,
} from './records.js'

export const feedTypes = ['primary', 'supplemental']
export const feedMethods = ['file_upload', 'scheduled_fetch']
export const feedStatuses = ['never_run', 'success', 'partial', 'failed']
export const frequencies = ['daily', 'weekly', 'monthly']
export const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney', 'UTC']
export const maxFileSize = 1024 * 1024
const feedFields = ['name', 'type', 'method', 'country', 'language', 'sourceUrl', 'schedule', 'fixtureKey']
const defaultCurrency = { ...currencies, AT: 'EUR', BE: 'EUR', ES: 'EUR', FI: 'EUR', IE: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR' }

function validTimezone(value) {
  if (!value || !/^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(value)) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
}

export function saveFeed(state, meta, id, draft) {
  const available = active(state.feeds)
  const previous = id ? available.find((feed) => feed.id === id) : null
  if (id && !previous) return { error: 'This data source is no longer available.' }

  const fields = Object.fromEntries(['name', 'type', 'method', 'country', 'language'].map((key) => [key, text(draft[key])]))
  fields.country = fields.country.toUpperCase()
  fields.language = fields.language.toLowerCase()
  const errors = {}
  if (fields.name.length < 2 || fields.name.length > 100) errors.name = 'Enter a name between 2 and 100 characters.'
  else if (available.some((item) => item.id !== id && text(item.name).toLowerCase() === fields.name.toLowerCase())) errors.name = 'An active source already has this name.'
  if (!feedTypes.includes(fields.type)) errors.type = 'Choose a source type.'
  if (!feedMethods.includes(fields.method)) errors.method = 'Choose an input method.'
  if (!/^[A-Z]{2}$/.test(fields.country)) errors.country = 'Choose a market.'
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(fields.language)) errors.language = 'Choose a language.'

  const scheduled = fields.method === 'scheduled_fetch'
  fields.sourceUrl = scheduled ? text(draft.sourceUrl) : ''
  fields.schedule = null
  fields.fixtureKey = null
  if (scheduled) {
    if (!isWebUrl(fields.sourceUrl)) errors.sourceUrl = 'Enter a complete HTTP or HTTPS file link.'
    const frequency = text(draft.schedule?.frequency)
    const time = text(draft.schedule?.time)
    const timezone = text(draft.schedule?.timezone)
    if (!frequencies.includes(frequency)) errors.frequency = 'Choose Daily, Weekly, or Monthly.'
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = 'Enter a local time.'
    if (!validTimezone(timezone)) errors.timezone = 'Choose a valid timezone.'
    fields.schedule = { ...previous?.schedule, frequency, time, timezone }
    fields.fixtureKey = previous && previous.sourceUrl === fields.sourceUrl && previous.method === fields.method && previous.fixtureKey
      ? previous.fixtureKey : fixtureKeyFor(fields.sourceUrl)
  } else if (previous?.method === fields.method) {
    for (const key of ['sourceUrl', 'schedule', 'fixtureKey']) {
      if (previous[key] === undefined) delete fields[key]
    }
  }
  if (Object.keys(errors).length) return { errors }

  const next = previous ? { ...previous, ...fields } : {
    id: newId('feed'), ...fields, status: 'never_run', lastRunId: null, lastRunAt: null,
    deletedAt: null, actor: meta.actor, createdAt: meta.createdAt,
  }
  const changes = changesBetween(previous, next, [...feedFields, 'status'])
  if (!Object.keys(changes).length) return { id }
  const feeds = rows(state.feeds)
  next.updatedAt = meta.createdAt
  const entry = changeRecord('fchg', { feedId: next.id }, previous ? 'updated' : 'created', changes, meta)
  return {
    id: next.id,
    state: {
      ...state, feeds: previous ? replaceById(feeds, new Map([[id, next]])) : [...feeds, next],
      feedChanges: [...rows(state.feedChanges), entry],
    },
  }
}

export const ownedProducts = (state, feed) => active(state.products).filter((item) => item.feedId === feed.id)

export function removeFeed(state, meta, id) {
  const feed = active(state.feeds).find((item) => item.id === id)
  if (!feed) return { error: 'This data source is no longer available.' }
  const next = { ...feed, deletedAt: meta.createdAt, updatedAt: meta.createdAt }
  const entry = changeRecord('fchg', { feedId: id }, 'removed', changesBetween(feed, next, ['deletedAt']), meta)
  const targetIds = new Set(ownedProducts(state, feed).map((item) => item.id))
  return {
    state: {
      ...tombstoneProducts(state, targetIds, meta, feed),
      feeds: replaceById(rows(state.feeds), new Map([[id, next]])), feedChanges: [...rows(state.feedChanges), entry],
    },
  }
}

const headersToFields = {
  title: 'title', description: 'description', brand: 'brand', condition: 'condition', availability: 'availability',
  link: 'link', image_link: 'imageLink', gtin: 'gtin', mpn: 'mpn',
}

function parseDelimited(input, filename) {
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (source.includes('\0')) throw new Error('Save the file as UTF-8 CSV or TSV and upload it again.')
  const header = source.split('\n', 1)[0]
  const delimiter = header.includes('\t') || (!header.includes(',') && /\.tsv$/i.test(filename)) ? '\t' : ','
  const parsed = []
  let cells = []
  let cell = ''
  let cellMode = 'start'
  let line = 1
  let row = line
  function finishCell() {
    cells.push(cell)
    cell = ''
    cellMode = 'start'
  }
  function finishRow() {
    finishCell()
    if (cells.some((value) => value.trim())) parsed.push({ row, cells })
    cells = []
    row = line
  }
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (cellMode === 'quoted') {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"'
        index++
      } else if (char === '"') cellMode = 'closed'
      else {
        cell += char
        if (char === '\n') line++
      }
      continue
    }
    if (char === delimiter) finishCell()
    else if (char === '\n') {
      line++
      finishRow()
    } else if (cellMode === 'closed') {
      if (char !== ' ') throw new Error('Unexpected text after a closing quote on line ' + line + '.')
    } else if (char === '"' && (cellMode === 'start' || !cell.trim())) {
      cell = ''
      cellMode = 'quoted'
    } else if (char === '"') throw new Error('Escape a literal quote with two quotes on line ' + line + '.')
    else {
      cell += char
      cellMode = 'unquoted'
    }
  }
  if (cellMode === 'quoted') throw new Error('Close the quoted field starting on line ' + row + '.')
  finishRow()

  const headers = parsed.shift()?.cells.map((value) => text(value).toLowerCase())
  if (!headers?.includes('id') && !headers?.includes('offer_id')) throw new Error('Include an id or offer_id column in the header.')
  if (new Set(headers).size !== headers.length) throw new Error('Remove duplicate column names from the header.')
  if (parsed.length === 0) throw new Error('Add at least one product row below the header.')
  return parsed.map((item) => ({
    row: item.row,
    values: Object.fromEntries(headers.map((name, index) => [name, text(item.cells[index])])),
    extraColumns: item.cells.length > headers.length,
  }))
}

function parsePrice(value, country, accountCurrency) {
  const parts = /^(?:([a-z]{3})\s+)?(\d+(?:\.\d{1,2})?)(?:\s+([a-z]{3}))?$/i.exec(value)
  if (!parts || (parts[1] && parts[3])) return null
  const price = numericPrice(parts[2])
  const currency = (parts[1] || parts[3] || defaultCurrency[country] || accountCurrency || 'USD').toUpperCase()
  return price === null || !supportedCurrencies.includes(currency) ? null : { price, currency }
}

function rowPatch(values, feed, accountCurrency) {
  const fields = {}
  for (const [header, field] of Object.entries(headersToFields)) {
    if (values[header] && !['condition', 'availability'].includes(field)) fields[field] = values[header]
  }
  if (values.price) {
    const price = parsePrice(values.price, feed.country, accountCurrency)
    if (!price) return ['invalid_price', 'Enter a nonnegative price with up to two decimal places and a supported currency.']
    Object.assign(fields, price)
  }
  for (const [field, options] of [['condition', conditions], ['availability', availabilities]]) {
    if (!values[field]) continue
    const value = values[field].toLowerCase().replace(/\s+/g, '_')
    if (!options.includes(value)) return ['invalid_' + field, 'Choose a supported ' + field + ' value.']
    fields[field] = value
  }
  for (const [field, name] of [['link', 'landing-page URL'], ['imageLink', 'image URL']]) {
    if (fields[field] && !isWebUrl(fields[field])) return ['invalid_' + (field === 'imageLink' ? 'image_link' : field), 'Enter a complete HTTP or HTTPS ' + name + '.']
  }
  if (fields.gtin && !validGtin(fields.gtin)) return ['invalid_gtin', 'Enter a valid GTIN including its check digit.']
  return fields
}

const fileError = (code, message) => ({ row: null, offerId: null, code, message })

function evaluateInput(feed, request) {
  if (request.trigger === 'manual_update') {
    const key = feed.fixtureKey || fixtureKeyFor(feed.sourceUrl)
    const input = { sourceUrl: feed.sourceUrl ?? null, fixtureKey: key || null }
    return key !== 'north-america-catalog'
      ? { input, error: fileError('missing_fixture', 'No local file is available for this link. Edit setup and use the sample file link.') }
      : { input, content: fixtureText, filename: 'catalog.tsv' }
  }
  const input = { fileName: request.filename, sizeBytes: request.sizeBytes }
  if (request.sizeBytes > maxFileSize) return { input, error: fileError('file_too_large', 'Choose a UTF-8 CSV or TSV file up to 1 MB.') }
  if (!/\.(csv|tsv)$/i.test(request.filename)) return { input, error: fileError('unsupported_file_type', 'Choose a CSV or TSV file.') }
  if (request.readError) return { input, error: fileError('file_read_error', 'The browser could not read the file. Select it again and retry.') }
  return { input, content: request.content, filename: request.filename }
}

export function runFeed(state, meta, id, request) {
  const feed = active(state.feeds).find((item) => item.id === id)
  if (!feed) return { error: 'This data source is no longer available.' }
  if (feed.method !== (request.trigger === 'upload' ? 'file_upload' : 'scheduled_fetch')) return { error: 'The source input method has changed.' }
  const runId = newId('run')
  const evaluated = evaluateInput(feed, request)
  const errors = evaluated.error ? [evaluated.error] : []
  let parsed = []
  if (!evaluated.error) {
    try { parsed = parseDelimited(evaluated.content, evaluated.filename) }
    catch (error) { errors.push(fileError('invalid_file', error.message)) }
  }

  const market = text(feed.country).toUpperCase()
  const language = text(feed.language).toLowerCase()
  const existing = new Map()
  for (const product of active(state.products)) {
    const key = offerKey(product.country, product.language, product.offerId)
    const matches = existing.get(key) ?? []
    matches.push(product)
    existing.set(key, matches)
  }
  const seen = new Set()
  const updates = new Map()
  const inserts = []
  const productChanges = []
  const issueUpdates = new Map()
  const issueActions = []
  const issues = rows(state.issues)
  let acceptedCount = 0
  for (const { row, values, extraColumns } of parsed) {
    const offerId = values.offer_id || values.id
    const reject = (code, message) => errors.push({ row, offerId: offerId || null, code, message })
    if (!offerId) { reject('missing_offer_id', 'Enter an offer ID.'); continue }
    const key = offerKey(market, language, offerId)
    if (seen.has(key)) { reject('duplicate_offer_id', 'This offer appears more than once in the file.'); continue }
    seen.add(key)
    if (extraColumns) { reject('extra_columns', 'This row has more cells than the header.'); continue }
    const matches = existing.get(key)
    if (matches?.length > 1) { reject('ambiguous_offer_id', 'Multiple active product records match this offer identity.'); continue }
    const previous = matches?.[0]
    const patch = rowPatch(values, feed, state.account?.defaultCurrency)
    if (Array.isArray(patch)) { reject(...patch); continue }
    if (!market || !language) { reject('incomplete_source', 'Set the source market and language before running an update.'); continue }
    if (feed.type === 'supplemental' && !previous) { reject('offer_not_found', 'Add the offer to a primary source or the catalog first.'); continue }
    if (feed.type === 'supplemental' && !Object.keys(patch).length) { reject('empty_update', 'Supply at least one supported attribute to update.'); continue }
    if (!previous && (!patch.title || patch.price == null || !patch.availability || !patch.link)) {
      reject('incomplete_product', 'New offers require title, price, availability, and link.')
      continue
    }

    acceptedCount++
    const product = previous ? { ...previous, ...patch } : {
      id: newId('prd'), offerId, country: market, language, condition: 'new', ...patch, visibility: 'visible',
      status: 'pending', actor: meta.actor, createdAt: meta.createdAt, deletedAt: null,
    }
    if (feed.type === 'primary') product.feedId = id
    const next = previous ? resolveProductCorrections(issues, previous, product, issueUpdates, issueActions, meta) : product
    const changes = changesBetween(previous, next, [...productFields, 'feedId', 'visibility', 'status'])
    if (!Object.keys(changes).length) continue
    next.updatedAt = meta.createdAt
    if (previous) updates.set(previous.id, next)
    else inserts.push(next)
    productChanges.push(changeRecord('pchg', { productId: next.id, feedRunId: runId }, previous ? 'updated' : 'created', changes, meta))
  }

  const rejectedCount = parsed.length - acceptedCount
  const status = acceptedCount === 0 ? 'failed' : rejectedCount ? 'partial' : 'success'
  const run = {
    id: runId, feedId: id, trigger: request.trigger, status, input: evaluated.input, receivedCount: parsed.length,
    acceptedCount, rejectedCount, errors, ...meta,
  }
  const nextFeed = { ...feed, status, lastRunId: runId, lastRunAt: meta.createdAt, updatedAt: meta.createdAt }
  const afterProducts = productChanges.length ? addProductChanges(
    state, [...replaceById(rows(state.products), updates), ...inserts], productChanges, issueUpdates, issueActions,
  ) : state
  return {
    run,
    state: {
      ...afterProducts, feeds: replaceById(rows(state.feeds), new Map([[id, nextFeed]])), feedRuns: [...rows(state.feedRuns), run],
    },
  }
}

