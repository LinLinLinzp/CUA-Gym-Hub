import { useState } from 'react'
import { actions } from './actions.js'
import { alphabetical, current, dateText, matches, newest, platformName, sizeText, tagPath } from './model.js'
import { useStore } from './store.jsx'
import { Dialog, Empty, Field, Icon, LocalLink, PullCommand, Search, Select, Table, useLocalNavigate } from './ui.jsx'

export function TagIndex({ repository, base }) {
  const { state, commit, announce } = useStore()
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')
  const [sort, setSort] = useState('updated')
  const [selection, setSelection] = useState([])
  const [confirming, setConfirming] = useState(false)
  const tags = current(state, 'tags').filter(tag => tag.repositoryId === repository.id)
  const selected = tags.filter(tag => !tag.immutable && selection.includes(tag.id))
  const platforms = [...new Set(tags.flatMap(tag => (tag.platforms ?? []).map(platformName).filter(Boolean)))].sort()
  const visible = tags.filter(tag => matches(query, tag.name)
    && (!platform || (tag.platforms ?? []).some(entry => platformName(entry) === platform)))
    .sort(sort === 'name' ? alphabetical : (a, b) => newest(a, b) || alphabetical(a, b))
  const selectable = visible.filter(tag => !tag.immutable)
  const allSelected = selectable.length > 0 && selectable.every(tag => selection.includes(tag.id))
  function toggle(id) {
    setSelection(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])
  }
  function toggleVisible() {
    const ids = selectable.map(tag => tag.id)
    setSelection(previous => allSelected ? previous.filter(id => !ids.includes(id)) : [...new Set([...previous, ...ids])])
  }
  return <section className="stack">
    <div className="section-head"><h2>Image tags</h2>
      {selected.length > 0 && <div className="inline-actions">
        <span role="status">{selected.length} selected</span>
        <button type="button" className="danger-button" onClick={() => setConfirming(true)}>Delete selected tags</button>
      </div>}
    </div>
    <div className="filters">
      <Search label="Search tags" value={query} onChange={setQuery} placeholder="Tag name" />
      <Select label="Platform" value={platform} onChange={setPlatform}
        options={[[ '', 'All platforms' ], ...platforms.map(item => [item, item])]} />
      <Select label="Sort by" value={sort} onChange={setSort} options={[[ 'updated', 'Last updated' ], ['name', 'Name']]} />
    </div>
    {visible.length ? <Table headers={[
      <input type="checkbox" aria-label="Select all visible mutable tags" checked={allSelected}
        disabled={!selectable.length} onChange={toggleVisible} />,
      'Tag', 'Digest', 'Platforms', 'Compressed size', 'Last pushed',
    ]}>
      {visible.map(tag => <tr key={tag.id} className={selection.includes(tag.id) ? 'checked' : ''}>
        <td><input type="checkbox" aria-label={`Select tag ${tag.name}`} checked={selection.includes(tag.id)}
          disabled={Boolean(tag.immutable)} onChange={() => toggle(tag.id)} /></td>
        <td><LocalLink className="mono object" to={tagPath(base, tag)}>{tag.name}</LocalLink>
          {tag.immutable && <span className="chip warning">Immutable</span>}</td>
        <td>{tag.digest ? <LocalLink className="mono muted" title={tag.digest} to={tagPath(base, tag)}>
          {tag.digest.length > 22 ? `${tag.digest.slice(0, 19)}…` : tag.digest}
        </LocalLink> : '—'}</td>
        <td className="mono">{(tag.platforms ?? []).map(platformName).filter(Boolean).join(', ') || '—'}</td>
        <td className="nowrap">{sizeText(tag.sizeBytes)}</td>
        <td className="nowrap muted">{dateText(tag.pushedAt)}</td>
      </tr>)}
    </Table> : <Empty title={tags.length ? 'No matching tags' : 'No tags yet'} icon="tags">
      {tags.length ? <button type="button" onClick={() => { setQuery(''); setPlatform('') }}>Clear filters</button> :
        <p>Image tags for this repository will appear here.</p>}
    </Empty>}
    {confirming && <Dialog title={selected.length === 1 ? 'Delete tag?' : `Delete ${selected.length} tags?`}
      confirm={selected.length === 1 ? 'Delete tag' : 'Delete tags'}
      onCancel={() => setConfirming(false)} onConfirm={() => {
        commit('tag.deleted', actions.deleteTags(repository.id, selected.map(tag => tag.id)))
        announce(selected.length === 1 ? 'Tag deleted.' : `${selected.length} tags deleted.`)
        setSelection([])
        setConfirming(false)
      }}>
      <p>The following tags will be removed from this repository.</p>
      <ul className="confirm-list">{selected.map(tag => <li key={tag.id}><code>{tag.name}</code></li>)}</ul>
    </Dialog>}
  </section>
}

export function TagDetail({ repository, base, reference, name }) {
  const { state, commit, announce } = useStore()
  const navigate = useLocalNavigate()
  const [adding, setAdding] = useState(false)
  const [tagName, setTagName] = useState('')
  const tag = current(state, 'tags').find(row => row.repositoryId === repository.id && row.name === name)
  if (!tag) return <Empty title="Tag unavailable" icon="tags"><LocalLink to={`${base}/tags`}>Back to tags</LocalLink></Empty>
  const platforms = tag.platforms ?? []
  const source = current(state, 'tags').find(row => row.repositoryId === repository.id && row.id === tag.sourceTagId)
  return <>
    <section className="panel">
      <div className="section-head"><h2 className="wrap"><Icon name="tags" /> {tag.name}</h2>
        <button type="button" className="primary" onClick={() => { setTagName(''); setAdding(true) }}><Icon name="plus" />Add tag</button>
      </div>
      <dl className="details tag-meta">
        <div><dt>Digest</dt><dd><code>{tag.digest || '—'}</code>{tag.immutable && <span className="chip warning">Immutable</span>}</dd></div>
        <div><dt>Last pushed</dt><dd>{dateText(tag.pushedAt)}</dd></div>
        <div><dt>Compressed size</dt><dd>{sizeText(tag.sizeBytes)}</dd></div>
        {source && <div><dt>Source tag</dt><dd><LocalLink className="mono" to={tagPath(base, source)}>{source.name}</LocalLink></dd></div>}
      </dl>
      <PullCommand reference={`${reference}:${tag.name}`} />
    </section>
    <section className="panel">
      <h2>Platforms</h2>
      {platforms.length ? <Table headers={['Platform', 'Compressed size']}>
        {platforms.map((entry, index) => <tr key={`${platformName(entry)}-${index}`}>
          <td className="mono">{platformName(entry) || '—'}</td><td>{sizeText(entry?.sizeBytes)}</td>
        </tr>)}
      </Table> : <p>—</p>}
    </section>
    {adding && <Dialog title="Add tag from this image" confirm="Add tag" onCancel={() => setAdding(false)}
      onConfirm={() => {
        const created = commit('tag.created', actions.createTag(tag.id, tagName))
        announce('Tag added.')
        navigate(tagPath(base, created))
      }}>
      <p>Use the same image as <strong className="mono">{tag.name}</strong> with a new tag name.</p>
      <Field label="Tag name" value={tagName} onChange={setTagName} hint="For example, release-2.8" />
    </Dialog>}
  </>
}

