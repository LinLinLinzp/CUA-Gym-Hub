import { useState } from 'react'
import { AtSign, Bookmark, Search as SearchIcon, X } from 'lucide-react'
import { active, byId, canView, channelName, mentions, userName } from '../data/selectors.js'
import { matchesSearch, parseSearch } from '../data/search.js'
import { FileCard, visibleFiles } from './Files.jsx'
import { dayLabel, Highlight, Message } from './Messages.jsx'
import { Actions, Dialog, Empty, IconButton } from './UI.jsx'

export function SearchDialog({ initial, close, submit }) {
  const [query, setQuery] = useState(initial?.query ?? '')
  const [tab, setTab] = useState(initial?.tab ?? 'Messages')
  const [error, setError] = useState('')
  return <Dialog title="Search" close={close}>
    <form onSubmit={event => {
      event.preventDefault()
      const search = parseSearch(query)
      if (search.error) setError(search.error)
      else if (!search.terms.length && !search.filters.length) setError('Enter a search term or filter.')
      else submit({ query, tab, search })
    }}>
      <div className="content">
        <div className="search-tabs">{['Messages', 'Files'].map(mode => <button key={mode} className="secondary" aria-pressed={mode === tab}
          type="button" onClick={() => setTab(mode)}>{mode}</button>)}</div>
        <div className="search-query"><label className="search-field"><SearchIcon size={17} /><input data-focus aria-label="Search query"
          placeholder={'Search ' + tab.toLowerCase()} value={query} onChange={event => { setQuery(event.target.value); setError('') }} /></label>
          {!!query && <IconButton icon={X} label="Clear search" onClick={() => { setQuery(''); setError('') }} />}</div>
        <div className="search-filters">{['in:', 'from:', 'before:', 'after:'].map(term => <button type="button" key={term} className="secondary"
          onClick={event => {
            setQuery(value => (value.trim() ? value.trim() + ' ' : '') + term)
            setError('')
            event.currentTarget.closest('form').querySelector('input').focus()
          }}>{term}</button>)}</div>
        <p className="muted-text search-help">Use quotes for phrases. Before and after exclude the named date in UTC.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <Actions close={close} submit="Search" />
    </form>
  </Dialog>
}

const newest = (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))

export function SearchResults({ value, context, update, clear }) {
  const { state, team, openDialog, jumpTo } = context
  const { query, tab, search } = value
  const rows = tab === 'Files' ? visibleFiles(state, post => {
    const channel = byId(state.channels, post.channelId)
    return channel?.teamId === team.id && canView(state, channel)
  }).filter(file => matchesSearch(state, team, byId(state.posts, file.postId), search, file.name)).sort(newest) :
    state.posts.filter(post => post && matchesSearch(state, team, post, search, post.message)).sort(newest)
  return <>
    <div className="search-caption">
      <strong>{rows.length} {rows.length === 1 ? 'result' : 'results'}</strong>
      <span title={query}>{query}</span>
      <button type="button" className="text-button" onClick={update}>Edit</button>
      <IconButton icon={X} label="Clear results" onClick={clear} />
    </div>
    <div className="pane-results scroll">
      {!rows.length && <Empty icon={SearchIcon} title="No search results"><p>Try a different term or filter.</p></Empty>}
      {rows.map(item => tab === 'Files' ? <div className="file-result" key={item.id}>
        <p className="result-file-name"><Highlight value={item.name} terms={search.terms} /></p>
        <FileCard file={item} inlineImage={false} onPreview={() => openDialog({ kind: 'file', ids: rows.map(row => row.id), fileId: item.id })} />
        <p className="muted-text">{channelName(state, byId(state.channels, item.channelId))} · {userName(byId(state.users,
          byId(state.posts, item.postId)?.userId))} · {dayLabel(item.createdAt)}</p>
        <button type="button" className="text-button source-jump" onClick={() => jumpTo(byId(state.posts, item.postId))}>Jump to message</button>
      </div> : <Message key={item.id} post={item} context={context} discussion source jump terms={search.terms} />)}
    </div>
  </>
}

export function PersonalMessages({ context, kind }) {
  const { state, team } = context
  const saved = kind === 'saved'
  const eligible = post => {
    const channel = byId(state.channels, post?.channelId)
    return post && !post.deletedAt && channel?.teamId === team.id && canView(state, channel)
  }
  const rows = saved ? state.savedPosts.filter(row => row?.userId === state.currentUserId && active(row))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .map(row => byId(state.posts, row.postId)).filter(eligible) : state.posts.filter(post => eligible(post) &&
      (post.mentionedUserIds ?? mentions({ ...state, currentUserId: post.userId }, byId(state.channels, post.channelId), post.message))
        .includes(state.currentUserId)).sort(newest)
  return <div className="pane-results scroll">
    {!rows.length && <Empty icon={saved ? Bookmark : AtSign} title={saved ? 'No saved messages yet' : 'No recent mentions'} />}
    {rows.map(post => <Message key={post.id} post={post} context={context} discussion source jump />)}
  </div>
}
