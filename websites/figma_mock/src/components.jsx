import { useId, useState } from 'react'
import { availableComponent, fileName, filePath, find, mainFor, matches, records, roleFor } from './data/model.js'
import { SessionLink, useWorkspace } from './store.jsx'
import { FormFooter, Modal } from './ui.jsx'

const componentName = (component) => component?.name || 'Untitled component'
const layerName = (layer) => layer?.name || 'Untitled layer'
const assetByName = (first, second) => componentName(first).localeCompare(componentName(second)) || String(first.id).localeCompare(String(second.id))

export function LayerDock({ layers, page, canEdit, selected, select, addShape, component, edit }) {
  const { state } = useWorkspace()
  const eligible = ['frame', 'shape', 'text'].includes(selected?.kind)
  const definition = find(state, 'components', selected?.componentId)
  const rendered = new Set()
  const childrenByParent = new Map()
  layers.forEach((layer) => {
    const key = layer.parentLayerId
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key).push(layer)
  })
  const layerIds = new Set(layers.map((layer) => layer.id))
  function node(layer, depth) {
    if (rendered.has(layer.id)) return null
    rendered.add(layer.id)
    return <li key={layer.id}><button type="button" aria-pressed={layer.id === selected?.id} style={{ '--indent': Math.min(depth, 8) }}
      onClick={() => select(layer.id)}><span className={'layer-icon ' + layer.kind} aria-hidden="true">{layer.kind === 'text' ? 'T' : '□'}</span>
      <span>{layerName(layer)}</span><small>{layer.kind === 'component' ? 'Main' : layer.kind}</small></button>
      {childrenByParent.has(layer.id) && <ul>{childrenByParent.get(layer.id).map((item) => node(item, depth + 1))}</ul>}
    </li>
  }
  const tree = layers.filter((layer) => !layerIds.has(layer.parentLayerId)).map((layer) => node(layer, 0))
  for (const layer of layers) if (!rendered.has(layer.id)) tree.push(node(layer, 0))
  return <div className="dock-content">
    {canEdit && <div className="panel-actions"><button type="button" onClick={addShape} disabled={!page}>+ Add shape</button></div>}
    {layers.length ? <ul className="layer-list">{tree}</ul> : <p className="hint">{page && canEdit ? 'Add a shape to start designing.' : 'No layers on this page.'}</p>}
    {selected && <section className="selection">
      <h3>{layerName(selected)}</h3>
      {selected.kind === 'instance' && <ComponentDetails component={definition} showLink />}
      {selected.kind === 'component' && <ComponentDetails component={definition} />}
      {canEdit && eligible && <button type="button" className="primary" onClick={component}>Create component</button>}
      {canEdit && selected.kind === 'component' && mainFor(state, definition) === selected && <button type="button" onClick={edit}>Edit component</button>}
    </section>}
  </div>
}

function ComponentDetails({ component, showLink }) {
  const { state } = useWorkspace()
  const source = find(state, 'files', component?.fileId)
  if (!mainFor(state, component) || !roleFor(state, source)) return <p className="hint">Source component unavailable.</p>
  return <div className="asset-details">
    <span className={'badge' + (component.status === 'published' ? ' success' : '')}>{component.status === 'published' ? 'Published' : 'Local'}</span>
    {component.description && <p>{component.description}</p>}<small>Source · {fileName(source)}</small>
    {showLink && <SessionLink to={filePath(source.id, component.pageId, null, component.mainLayerId)}>Go to main component</SessionLink>}
  </div>
}

export function AssetDock({ file, canEdit, page, selected, select, publish, insert, edit }) {
  const { state } = useWorkspace()
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const available = records(state, 'components').filter((item) => item.id && availableComponent(state, item, file))
  const candidates = available.filter((item) => matches(item.name, query) || matches(item.description, query)).sort(assetByName)
  const groups = [['Local components', candidates.filter((item) => item.fileId === file.id)],
    ['Published libraries', candidates.filter((item) => item.fileId !== file.id)]]
  const current = candidates.find((item) => item.id === selected?.id)
  return <div className="dock-content">
    {canEdit && <div className="panel-actions"><button type="button" onClick={publish}>Publish library</button></div>}
    <label className="field">Search assets<input type="search" placeholder="Search components" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {groups.map(([label, items]) => <section className="asset-group" key={label}>
      <h3>{label}</h3>
      {items.length ? <ul className="asset-list">{items.map((item) => <li key={item.id}>
        <button type="button" onClick={() => select(item.id)} aria-pressed={item.id === current?.id}>
          <span className="asset-glyph" aria-hidden="true" /><span><b>{componentName(item)}</b><small>{fileName(find(state, 'files', item.fileId))}</small></span>
        </button></li>)}</ul> : <p className="hint">{query ? 'No matching components.' : label === 'Local components' ? 'Create a component from a layer to use it here.' : 'No published libraries available.'}</p>}
    </section>)}
    {current && <section className="selection"><h3>{componentName(current)}</h3><ComponentDetails component={current} showLink />
      {canEdit && <div className="panel-actions"><button type="button" className="primary" onClick={insert} disabled={!page}>Insert instance</button>
        {current.fileId === file.id && <button type="button" onClick={edit}>Edit component</button>}</div>}
    </section>}
  </div>
}

export function ComponentDialog({ layer, component, onClose, onSave }) {
  const descriptionId = useId()
  const [name, setName] = useState(component?.name || layer?.name || '')
  const [description, setDescription] = useState(component?.description || '')
  const disabled = !name.trim() || (component && name.trim() === component.name && description.trim() === (component.description ?? ''))
  return <Modal title={component ? 'Edit component' : 'Create component'} onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault()
      if (!disabled) onSave({ type: component ? 'component-edit' : 'component', componentId: component?.id, name, description })
    }}>
      <label className="field">Component name<input data-focus required value={name} onChange={(event) => setName(event.target.value)} />
        {!name.trim() && <small>Enter a nonblank name.</small>}</label>
      <div className="field">
        <label htmlFor={descriptionId}>Description</label>
        <textarea id={descriptionId} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <FormFooter onClose={onClose} label={component ? 'Save component' : 'Create component'} disabled={disabled} />
    </form>
  </Modal>
}

export function PublishDialog({ file, onClose, onSave }) {
  const { state } = useWorkspace()
  const [selected, setSelected] = useState([])
  const candidates = records(state, 'components').filter((item) => item.id && item.fileId === file.id &&
    item.status !== 'published' && mainFor(state, item)).sort(assetByName)
  return <Modal title="Publish library" onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (selected.length) onSave(selected) }}>
      <p>Choose the components to make available in other files.</p>
      {candidates.length ? <div className="publish-list">{candidates.map((item) => <label className="check" key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected(event.target.checked
          ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
        <span><b>{componentName(item)}</b><small>{find(state, 'pages', item.pageId)?.name || 'Untitled page'}</small></span>
      </label>)}</div> : <p className="hint">There are no unpublished components in this file.</p>}
      <FormFooter onClose={onClose} label="Publish selected" disabled={!selected.length} />
    </form>
  </Modal>
}

