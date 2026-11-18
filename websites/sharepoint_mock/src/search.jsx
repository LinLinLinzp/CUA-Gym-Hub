import { ArrowRight, Building2, FileText, Folder, ListChecks, Rows3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { folderTrail, labelType, libraryPath, listPath, normalize, sitePath } from './model'
import { AppLink, Empty, usePaging } from './ui'
import { useWorkspace } from './workspace'

const kinds = {
  site: { label: 'Site', icon: Building2 },
  list: { label: 'List', icon: ListChecks },
  item: { label: 'List item', icon: Rows3 },
  library: { label: 'Document library', icon: Folder },
  folder: { label: 'Folder', icon: Folder },
  file: { label: 'File', icon: FileText },
}

function findResults(data, query, kind, scope) {
  const sites = new Map(data.sites.filter((site) => !scope || site.id === scope).map((site) => [site.id, site]))
  const matches = (parts) => parts.some((part) => normalize(part).includes(query))
  const results = []
  const include = (value) => !kind || value === kind
  const add = (record, type, site, name, context, url) => {
    results.push({ id: type + ':' + record.id, type, name, context, url, site: site.name })
  }

  if (include('site')) {
    for (const site of sites.values()) {
      if (matches([site.name, site.description])) add(site, 'site', site, site.name, labelType(site.type), sitePath(site.id))
    }
  }

  const lists = new Map(data.lists.filter((list) => sites.has(list.siteId)).map((list) => [list.id, list]))
  if (include('list')) {
    for (const list of lists.values()) {
      if (matches([list.name, list.description])) {
        const site = sites.get(list.siteId)
        add(list, 'list', site, list.name, site.name, listPath(site.id, list.id))
      }
    }
  }
  if (include('item')) {
    for (const item of data.listItems) {
      const list = lists.get(item.listId)
      if (!list || !matches([item.title, ...Object.values(item.values ?? {})])) continue
      const site = sites.get(list.siteId)
      add(item, 'item', site, item.title, site.name + ' / ' + list.name,
        listPath(site.id, list.id) + '?item=' + encodeURIComponent(item.id))
    }
  }

  const libraries = new Map(data.libraries.filter((library) => sites.has(library.siteId)).map((library) => [library.id, library]))
  if (include('library')) {
    for (const library of libraries.values()) {
      if (matches([library.name, library.description])) {
        const site = sites.get(library.siteId)
        add(library, 'library', site, library.name, site.name, libraryPath(site.id, library.id))
      }
    }
  }
  if (include('file') || include('folder')) {
    const entries = new Map()
    for (const entry of data.libraryEntries) {
      if (!libraries.has(entry.libraryId)) continue
      if (!entries.has(entry.libraryId)) entries.set(entry.libraryId, [])
      entries.get(entry.libraryId).push(entry)
    }
    for (const [libraryId, records] of entries) {
      const library = libraries.get(libraryId)
      const site = sites.get(library.siteId)
      for (const entry of records) {
        if (!kinds[entry.kind] || !include(entry.kind) || !matches([entry.name])) continue
        const trail = folderTrail(records, entry.parentId)
        if (!trail) continue
        const url = entry.kind === 'folder'
          ? libraryPath(site.id, libraryId, entry.id)
          : libraryPath(site.id, libraryId, entry.parentId) + '?file=' + encodeURIComponent(entry.id)
        add(entry, entry.kind, site, entry.name, [site.name, library.name, ...trail.map((folder) => folder.name)].join(' / '), url)
      }
    }
  }

  return results.sort((a, b) => {
    const aDirect = normalize(a.name).includes(query)
    const bDirect = normalize(b.name).includes(query)
    return Number(bDirect) - Number(aDirect) || a.name.localeCompare(b.name)
  })
}

export default function SearchResults() {
  const { data } = useWorkspace()
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const [kind, setKind] = useState('')
  const [scope, setScope] = useState('')
  const results = useMemo(() => query ? findResults(data, normalize(query), kind, scope) : [], [data, query, kind, scope])
  const paging = usePaging(results, JSON.stringify([query, kind, scope]), 18)
  return <>
    <div className="page-heading"><div><h1>Search results</h1>{query && <p>Results for “{query}”</p>}</div></div>
    <div className="toolbar">
      <select aria-label="Result type" value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="">All result types</option>
        {Object.entries(kinds).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select className="scope-select" aria-label="Site scope" value={scope} onChange={(event) => setScope(event.target.value)}>
        <option value="">All sites</option>
        {data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
    </div>
    {results.length ? <div className="result-list">
      {paging.rows.map((result) => {
        const { icon: Icon, label } = kinds[result.type]
        return <AppLink className="collection-card" key={result.id} to={result.url}>
          <span className="tile"><Icon size={19} /></span>
          <div><h3>{result.name}</h3><p>{label} · {result.context}</p></div>
          <ArrowRight size={16} aria-hidden="true" />
        </AppLink>
      })}
    </div> : <Empty title={query ? 'No results found' : 'Search SharePoint'}>
      {query ? 'Try a different search or scope.' : 'Enter a name or keyword in the search field.'}
    </Empty>}
    {paging.controls}
  </>
}
