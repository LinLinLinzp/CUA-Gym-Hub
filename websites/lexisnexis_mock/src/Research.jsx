import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { array, byId, docPath, filterSnapshot, includes, jurisdictionOptions, jurisdictions, nameOf, norm, reportable, reportPath, researchPath, types } from './model.js'
import { useWorkspace } from './store.jsx'
import { Badge, Icon, List, Missing, Moment, PageHead, Panel, Select, SiteLink, useSidNavigate } from './ui.jsx'
import { SaveToFolder } from './Folders.jsx'
import { CitationPreview, checkCitation, citationFormats } from './Citations.jsx'
import { AlertEditor } from './Alerts.jsx'

export function SearchBox({ query = '', filters, sort, hero }) {
  return <SearchForm key={query} query={query} filters={filters} sort={sort} hero={hero} />
}

function SearchForm({ query, filters, sort, hero }) {
  const [draft, setDraft] = useState(query)
  const navigate = useSidNavigate()
  return <form className="search-bar" role="search" onSubmit={(event) => {
    event.preventDefault()
    navigate(researchPath(draft, filters, sort))
  }}><label className="field"><span>{hero ? 'Search terms' : 'Search research'}</span>
    <input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. delegation clause or 214 F.4th 731" /></label>
    <button className="primary"><Icon name="search" />Search</button>
  </form>
}

function searchScore(doc, query) {
  if (!query) return 1
  const heading = [doc.title, doc.citation, ...array(doc.citationAliases)]
  if (heading.some((part) => norm(part) === norm(query))) return 5
  if (heading.some((part) => includes(part, query))) return 4
  if (array(doc.topics).some((topic) => includes(topic, query))) return 3
  const body = typeof doc.body === 'string' ? [doc.body] : array(doc.body)
  return includes([doc.excerpt, ...body].join(' '), query) ? 2 : 0
}

export function Research() {
  const { state } = useWorkspace()
  const [params] = useSearchParams()
  const navigate = useSidNavigate()
  const [modal, setModal] = useState('')
  const query = params.get('q')?.trim() || ''
  const filters = filterSnapshot(Object.fromEntries(params))
  const sort = params.get('sort') || 'relevance'
  const documents = state.documents
    .filter((doc) => (!filters.contentType || doc.type === filters.contentType) && (!filters.jurisdiction || doc.jurisdiction === filters.jurisdiction))
    .map((doc) => ({ doc, score: searchScore(doc, query) })).filter(({ score }) => score)
    .sort((a, b) => {
      const days = String(b.doc.date || '').localeCompare(String(a.doc.date || ''))
      return sort === 'newest' ? days : sort === 'oldest'
        ? (a.doc.date && b.doc.date ? -days : days)
        : b.score - a.score || days
    })
  const setFilter = (key, value) => navigate(researchPath(query, { ...filters, [key]: value }, sort))
  return <>
    <PageHead title="Research" description="Search cases, statutes and practice materials."
      actions={query && <><button onClick={() => setModal('save')}>Save search</button><button className="primary" onClick={() => setModal('alert')}>Create search alert</button></>} />
    <Panel>
      <div className="toolbar">
        <SearchBox query={query} filters={filters} sort={sort} />
        <div className="filters">
          <Select label="Content type" options={types} empty="All content types" value={filters.contentType} onChange={(value) => setFilter('contentType', value)} />
          <Select label="Jurisdiction" options={jurisdictionOptions(state.documents, filters.jurisdiction)} empty="All jurisdictions" value={filters.jurisdiction} onChange={(value) => setFilter('jurisdiction', value)} />
          <Select label="Sort by" options={{ relevance: 'Relevance', newest: 'Newest first', oldest: 'Oldest first' }} value={sort} onChange={(value) => navigate(researchPath(query, filters, value))} />
          {Object.keys(filters).length > 0 && <button onClick={() => navigate(researchPath(query, {}, sort))}>Clear filters</button>}
        </div>
      </div>
      <List count={documents.length} label="result" empty={query ? 'No results match this search. Try another term or clear a filter.' : 'No documents match the current filters.'}>
        {documents.map(({ doc }) => <li className="row" key={doc.id}>
          <div className="row-main"><span className="row-icon"><Icon name="file" /></span><div className="row-copy">
            <SiteLink to={docPath(doc.id)}>{nameOf(doc)}</SiteLink>
            <p className="meta">{[doc.citation, doc.court || doc.source, types[doc.type]].filter(Boolean).join(' · ') || 'Source unavailable'}</p>
            {doc.excerpt && <p className="result-excerpt">{doc.excerpt}</p>}
          </div></div><div className="row-data"><Badge value={doc.signal} /><Moment value={doc.date} /></div>
        </li>)}
      </List>
    </Panel>
    {modal === 'save' && <SaveToFolder item={{ kind: 'search', title: query, query, filters }} onClose={() => setModal('')} />}
    {modal === 'alert' && <AlertEditor type="search" source={{ query, filters }} onClose={() => setModal('')} />}
  </>
}

export function Document() {
  const { documentId } = useParams()
  return <DocumentView key={documentId} documentId={documentId} />
}

function DocumentView({ documentId }) {
  const { state, commit } = useWorkspace()
  const navigate = useSidNavigate()
  const [modal, setModal] = useState('')
  const doc = byId(state.documents, documentId)
  if (!doc) return <Missing title="Document unavailable" description="This document is no longer in the research library." to="/research" label="Back to research" />
  const paragraphs = typeof doc.body === 'string' ? [doc.body] : array(doc.body)
  const text = paragraphs.length ? paragraphs : [doc.excerpt || 'The text of this document is unavailable.']
  return <>
    <div className="doc-head"><PageHead title={nameOf(doc)} description={[doc.citation, doc.court || doc.source].filter(Boolean).join(' · ') || 'Source unavailable'}>
      <nav className="crumbs" aria-label="Breadcrumb"><SiteLink to="/research">Research</SiteLink><Icon name="chevron" size={13} /><span>Document</span></nav>
    </PageHead></div>
    <div className="stack">
      <Panel>
        <div className="toolbar actions-bar"><div className="actions">
          <button className="primary" onClick={() => setModal('save')}><Icon name="folder" />Save to folder</button>
          {Object.keys(citationFormats(doc)).length > 0 && <button onClick={() => setModal('copy')}>Copy citation</button>}
          {reportable(doc, state.citingReferences) && <button onClick={() => {
            if (!checkCitation(commit, doc.id)) navigate(reportPath(doc.id))
          }}>View citation report</button>}
        </div></div>
        <dl className="data-grid">
          <div><dt>Content type</dt><dd>{types[doc.type] || 'Unspecified'}</dd></div>
          <div><dt>Jurisdiction</dt><dd>{jurisdictions[doc.jurisdiction] || doc.jurisdiction || 'Unspecified'}</dd></div>
          <div><dt>Published</dt><dd><Moment value={doc.date} /></dd></div>
          {doc.signal && <div><dt>Treatment</dt><dd><Badge value={doc.signal} /></dd></div>}
        </dl>
      </Panel>
      <Panel className="reading"><article><h2>{doc.type === 'case' ? 'Opinion' : 'Document text'}</h2>{text.map((part, index) => <p key={index}>{part}</p>)}</article></Panel>
    </div>
    {modal === 'save' && <SaveToFolder item={{ kind: 'document', documentId, title: nameOf(doc) }} onClose={() => setModal('')} />}
    {modal === 'copy' && <CitationPreview doc={doc} onClose={() => setModal('')} />}
  </>
}
