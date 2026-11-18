import { entries } from './entries.js'

const names = [
  ['mara', 'MaraFieldnotes', 'Mara Ellis'], ['iris', 'IrisAtTheQuay', 'Iris Marlow'],
  ['elliot', 'ElliotIndexes', 'Elliot Vale'], ['ren', 'RenAtDusk', 'Ren Archer'],
  ['jonah', 'JonahRiverline', 'Jonah Bell'], ['nora', 'NoraNotebooks', 'Nora Pike'],
  ['ada', 'AdaTheArchivist', 'Ada Rowe'], ['beau', 'BeauOnFoot', 'Beau Reed'],
  ['min', 'MinTakesNotes', 'Min Sutton'], ['opal', 'OpalEtchings', 'Opal West'],
  ['kit', 'KitWithTheMaps', 'Kit Crowe'], ['faye', 'FayeFolio', 'Faye Holt'],
  ['tom', 'TomOnTheCanal', 'Tom Lyle'], ['lea', 'LeaAndLinen', 'Lea Frost'],
  ['ash', 'AshInTheStacks', 'Ash Blythe'], ['wren', 'WrenTidebook', 'Wren Shaw'],
  ['noel', 'NoelCatalogues', 'Noel Price'], ['imani', 'ImaniInInk', 'Imani Voss'],
  ['jules', 'JulesMillLane', 'Jules Sayer'], ['elena', 'ElenaAtTheFerry', 'Elena Marsh'],
  ['neve', 'NeveFootnotes', 'Neve Wills'], ['sal', 'SalLetterpress', 'Sal Woods'],
  ['lia', 'LiaInTheLoft', 'Lia Brooke'], ['rami', 'RamiOnRecord', 'Rami Nash'],
  ['tess', 'TessOfTheVale', 'Tess Grove'], ['luca', 'LucaReadsMaps', 'Luca King'],
  ['robin', 'RobinByTheStile', 'Robin Lane'], ['zara', 'ZaraRecords', 'Zara Fox'],
  ['ben', 'BenOnTheBank', 'Ben Dunn'], ['mira', 'MiraMargins', 'Mira Finch'],
  ['alba', 'AlbaBookplates', 'Alba Harrow'], ['remy', 'RemyInTheField', 'Remy Lake'],
  ['sage', 'SageAndPaper', 'Sage Dean'], ['avery', 'AveryAfterTheFair', 'Avery Keel'],
]

const revisionDates = [
  ['2026-10-11T10:15:00.000Z', '2026-11-08T10:30:00.000Z'],
  ['2026-10-12T13:10:00.000Z', '2026-11-09T11:25:00.000Z'],
  ['2026-10-16T09:05:00.000Z', '2026-11-10T14:20:00.000Z'],
  ['2026-10-19T17:35:00.000Z', '2026-11-12T16:35:00.000Z'],
]
const discussionDates = [
  ['2026-11-13T09:20:00.000Z', '2026-11-13T11:40:00.000Z', '2026-11-13T16:05:00.000Z'],
  ['2026-11-14T13:15:00.000Z', '2026-11-15T10:25:00.000Z', '2026-11-15T12:00:00.000Z'],
  ['2026-11-16T10:00:00.000Z', '2026-11-16T14:45:00.000Z', '2026-11-17T08:10:00.000Z'],
]
const watchDates = ['2026-11-06T15:00:00.000Z', '2026-11-08T15:00:00.000Z', '2026-11-10T15:00:00.000Z']
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')

export function createInitialData() {
  const account = { id: 'user-mara' }
  const contributors = names.map(([key, username, displayName]) => ({ id: 'user-' + key, username, displayName }))
  const actor = index => contributors[index % contributors.length].id
  const revisions = []
  const articles = entries.map(([title, category, intro, heading, detail, reference], index) => {
    const articleId = id('article', index)
    const body = intro + '\n\n== ' + heading + ' ==\n' + detail
    const annotated = body + '\n\n== Documentation ==\n' + reference
    const dates = revisionDates[index % revisionDates.length]
    const snapshots = [
      [intro, 'Started the article', null, dates[0]],
      [index < 2 ? body : annotated, 'Added details about ' + heading.toLowerCase(), null, dates[1]],
    ]
    if (index < 2) snapshots.push([annotated, 'Added a note on early records', 'Documentation', '2026-11-12T17:20:00.000Z'])
    let previous = null
    if (index !== 24) snapshots.forEach(([text, summary, section, createdAt], position) => {
      const revision = {
        id: id('revision', revisions.length), articleId, parentRevisionId: previous?.id ?? null, actorId: actor(index + position),
        createdAt, status: 'published', body: text, summary, minor: position === 2, section,
        byteDelta: new TextEncoder().encode(text).length - new TextEncoder().encode(previous?.body ?? '').length,
      }
      revisions.push(revision)
      previous = revision
    })
    return {
      id: articleId, slug: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      title, category, body: annotated, currentRevisionId: previous?.id ?? null, updatedAt: previous?.createdAt ?? null,
    }
  })

  const talkTopics = []
  const talkComments = []
  const discussionArticles = [...Array.from({ length: 32 }, (_, index) => index % 16), 25, 26, 29, 32]
  discussionArticles.forEach((articleIndex, index) => {
    const articleId = articles[articleIndex].id
    const [, , , heading, detail, reference] = entries[articleIndex]
    const firstSourceQuestion = index < 16
    const subject = index === 0 ? 'Source for the route change'
      : firstSourceQuestion ? 'Sources for ' + heading.toLowerCase() : 'Wording in the ' + heading.toLowerCase() + ' section'
    const topicId = id('topic', index)
    const dates = discussionDates[index % discussionDates.length]
    const bodies = firstSourceQuestion
      ? ['Does anyone have a reference we can cite for the ' + heading.toLowerCase() + ' section?', reference + ' I can check the page number.', 'Please add the date of the record when you cite it.']
      : ['Could we clarify this passage in the next revision?\n\n' + detail, 'I can check the exact wording against the source. ' + reference, 'I’ll keep the current wording until we have a citation.']
    const length = index < 18 ? 3 : 2
    talkTopics.push({ id: topicId, articleId, subject, actorId: actor(index + 1), createdAt: dates[0], updatedAt: dates[length - 1], status: 'open' })
    let parentCommentId = null
    bodies.slice(0, length).forEach((body, position) => {
      const commentId = id('comment', talkComments.length)
      talkComments.push({
        id: commentId, topicId, articleId, parentCommentId, actorId: actor(index + position + 1),
        body, createdAt: dates[position], status: 'posted',
      })
      parentCommentId = commentId
    })
  })

  const watchlist = articles.slice(0, 26).map((article, index) => ({
    id: id('watch', index), articleId: article.id, actorId: account.id,
    createdAt: watchDates[index % watchDates.length], status: 'active',
  }))
  const watchlistEvents = watchlist.map(({ id: watchId, articleId, actorId, createdAt }, index) => ({
    id: id('watch-event', index), watchId, articleId, actorId, createdAt, action: 'watch', status: 'completed',
  }))
  articles.slice(26, 29).forEach((article, index) => {
    const watchId = id('watch', index + 26)
    for (const [action, createdAt] of [['watch', '2026-10-04T15:00:00.000Z'], ['unwatch', '2026-10-07T15:00:00.000Z']]) {
      watchlistEvents.push({
        id: id('watch-event', watchlistEvents.length), watchId, articleId: article.id, actorId: account.id,
        createdAt, action, status: 'completed',
      })
    }
  })
  return { account, contributors, articles, revisions, talkTopics, talkComments, watchlist, watchlistEvents }
}
