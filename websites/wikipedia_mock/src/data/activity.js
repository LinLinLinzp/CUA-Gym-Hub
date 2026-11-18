import { activeWatches, articlePath, newestFirst, posted, published } from './records.js'

export function watchActivity(state) {
  const watched = new Set(activeWatches(state).map(item => item.articleId))
  const articles = new Map(state.articles.filter(item => watched.has(item.id)).map(item => [item.id, item]))
  const topics = new Map(state.talkTopics.map(item => [item.id, item]))
  const edits = state.revisions.filter(item => published(item) && articles.has(item.articleId)).map(item => {
    const article = articles.get(item.articleId)
    return { ...item, article, kind: 'edit', label: item.summary || 'Article edit',
      href: articlePath(article) + '/history?revision=' + encodeURIComponent(item.id) }
  })
  const comments = state.talkComments.filter(item => posted(item) && articles.has(item.articleId)
    && topics.get(item.topicId)?.articleId === item.articleId).map(item => {
    const article = articles.get(item.articleId)
    return { ...item, article, kind: 'talk', label: topics.get(item.topicId).subject || 'Talk comment',
      href: articlePath(article) + '/talk/' + encodeURIComponent(item.topicId) + '#comment-' + encodeURIComponent(item.id) }
  })
  return [...edits, ...comments].sort(newestFirst)
}
