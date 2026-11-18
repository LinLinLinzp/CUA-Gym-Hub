import Citeproc from 'citeproc'
import { records } from './model.js'

const cslTypes = { journalArticle: 'article-journal', book: 'book', report: 'report', webpage: 'webpage' }
const creatorTypes = ['author', 'editor', 'translator']

function cslItem(item) {
  const result = { id: item.id, type: cslTypes[item.itemType] ?? 'document', title: item.title || 'Untitled reference' }
  for (const creator of records(item.creators)) {
    const role = creatorTypes.includes(creator.creatorType) ? creator.creatorType : 'author'
    const name = creator.name ? { literal: creator.name } : { given: creator.firstName, family: creator.lastName }
    if (name.literal || name.given || name.family) (result[role] ??= []).push(name)
  }
  const date = String(item.date ?? '').match(/^\d{4}(?:-\d{2}){0,2}$/)?.[0]
  if (date) result.issued = { 'date-parts': [date.split('-').map(Number)] }
  for (const [key, cslKey] of Object.entries({
    publicationTitle: 'container-title', publisher: 'publisher', place: 'publisher-place',
    volume: 'volume', issue: 'issue', pages: 'page', DOI: 'DOI', ISBN: 'ISBN', url: 'URL',
  })) {
    if (item[key]) result[cslKey] = String(item[key])
  }
  return result
}

export function formatOutput(items, xml, locale, mode, locators) {
  if (!items.length) return ''
  const byId = new Map(items.map((item) => [item.id, cslItem(item)]))
  const engine = new Citeproc.Engine({
    retrieveLocale: () => locale,
    retrieveItem: (id) => byId.get(id),
  }, xml, 'en-US', true)
  engine.setOutputFormat('text')
  engine.updateItems(items.map((item) => item.id))
  if (mode === 'bibliography') {
    const output = engine.makeBibliography()
    return output ? output[1].map((line) => line.trim()).join('\n') : ''
  }
  const byItem = new Map(locators.map((entry) => [entry.itemId, entry]))
  const citationItems = items.map(({ id }) => {
    const locator = byItem.get(id)
    return locator ? { id, label: locator.label, locator: locator.value } : { id }
  })
  const [, updates] = engine.processCitationCluster({ citationItems, properties: { noteIndex: 0 } }, [], [])
  return updates[0]?.[1]?.trim() ?? ''
}
