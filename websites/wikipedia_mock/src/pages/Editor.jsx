import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { articlePath, bytes, changeArticleWatch, isWatched, newId } from '../data/records.js'
import { sourceSections, updateSection } from '../data/source.js'
import { ButtonLink, useQuery, useSiteNavigate } from '../navigation.jsx'
import { useWorkspace } from '../workspace.js'
import { SourceProse } from './Article.jsx'

export function TextChanges({ before, after }) {
  const oldLines = before.split(/\r?\n/)
  const newLines = after.split(/\r?\n/)
  let first = 0
  while (first < oldLines.length && first < newLines.length && oldLines[first] === newLines[first]) first++
  if (first === oldLines.length && first === newLines.length) return <p>No text changes.</p>
  let oldEnd = oldLines.length
  let newEnd = newLines.length
  while (oldEnd > first && newEnd > first && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--
    newEnd--
  }
  return <pre className="diff" aria-label="Text differences">
    {oldLines.slice(first, oldEnd).map((line, index) => <del key={'old-' + index}>− {line}</del>)}
    {newLines.slice(first, newEnd).map((line, index) => <ins key={'new-' + index}>+ {line}</ins>)}
  </pre>
}

function EditForm({ article, section }) {
  const body = article.body ?? ''
  const initialText = section?.text ?? body
  const { state, commit, setNotice } = useWorkspace()
  const navigate = useSiteNavigate()
  const [draft, setDraft] = useState(initialText)
  const [summary, setSummary] = useState('')
  const [minor, setMinor] = useState(false)
  const [watch, setWatch] = useState(() => isWatched(state, article.id))
  const [mode, setMode] = useState('')
  const [error, setError] = useState('')
  const articleUrl = articlePath(article)
  const nextBody = draft.replace(/\r\n/g, '\n') === initialText.replace(/\r\n/g, '\n') ? body
    : section ? updateSection(body, section, draft) : draft

  function publish(event) {
    event.preventDefault()
    if (!draft.trim()) return setError('Enter article text before publishing.')
    if (nextBody === body) return setError('Make a text change before publishing.')
    if (summary.length > 500) return setError('Shorten your edit summary to 500 characters.')
    const accepted = commit(current => {
      const live = current.articles.find(item => item.id === article.id)
      const actorId = current.account?.id
      if (!live || !actorId || (live.body ?? '') !== body || live.currentRevisionId !== article.currentRevisionId) return current
      const createdAt = new Date().toISOString()
      const previous = current.revisions.find(item => item.id === live.currentRevisionId && item.articleId === live.id)
      const revision = {
        id: newId('revision'), articleId: live.id, parentRevisionId: previous?.id ?? null, actorId, createdAt,
        status: 'published', body: nextBody, summary: summary.trim(), minor, section: section?.title ?? null,
        byteDelta: bytes(nextBody) - bytes(body),
      }
      const updated = {
        ...current,
        articles: current.articles.map(item => item.id === live.id
          ? { ...item, body: nextBody, currentRevisionId: revision.id, updatedAt: createdAt }
          : item),
        revisions: [...current.revisions, revision],
      }
      return changeArticleWatch(updated, live.id, watch, createdAt)
    })
    if (!accepted) return setError('This article changed while you were editing. Reopen the editor to start from the latest version.')
    setNotice({ articleId: article.id, text: 'Your changes were published.' })
    navigate(articleUrl)
  }

  return <div className="stack">
    <form className="paper stack" onSubmit={publish}>
      <h2>{section ? 'Edit section: ' + section.title : 'Edit article'}</h2>
      <label className="field">{section ? 'Section source' : 'Article source'}
        <textarea className="source" rows={section ? 8 : 14} value={draft}
          onChange={event => { setDraft(event.target.value); setError('') }} />
      </label>
      <label className="field">Edit summary
        <input aria-label="Edit summary" value={summary} maxLength={500} onChange={event => setSummary(event.target.value)} />
        <span className="metadata">{summary.length}/500 characters</span>
      </label>
      <div className="actions">
        <label className="check"><input type="checkbox" checked={minor} onChange={event => setMinor(event.target.checked)} /> Minor edit</label>
        <label className="check"><input type="checkbox" checked={watch} onChange={event => setWatch(event.target.checked)} /> Watch this page</label>
      </div>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <div className="actions">
        <button className="primary" disabled={!state.account?.id} type="submit">Publish changes</button>
        <button type="button" aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Show preview</button>
        <button type="button" aria-pressed={mode === 'diff'} onClick={() => setMode('diff')}>Show changes</button>
        <ButtonLink to={articleUrl}>Cancel</ButtonLink>
      </div>
    </form>
    {mode && <section className="paper" aria-live="polite">
      <h2>{mode === 'preview' ? 'Preview' : 'Changes'}</h2>
      {mode === 'preview' ? <SourceProse body={nextBody} /> : <TextChanges before={body} after={nextBody} />}
    </section>}
  </div>
}

export function Editor() {
  const article = useOutletContext()
  const [params] = useQuery()
  const requested = params.get('section')
  const section = requested !== null && /^\d+$/.test(requested) ? sourceSections(article.body ?? '')[Number(requested)] : undefined
  if (requested !== null && !section) return <section className="paper">
    <h2>Section unavailable</h2><ButtonLink to={articlePath(article)}>Return to article</ButtonLink>
  </section>
  return <EditForm key={article.id + ':' + (section?.index ?? 'full')} article={article} section={section} />
}
