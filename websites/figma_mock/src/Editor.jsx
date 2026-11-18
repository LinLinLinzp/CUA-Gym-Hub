import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mutate, newRecordId } from './data/actions.js'
import {
  availableComponent, byPosition, destination, editable, fileName, filePath, find, folderPath, geometryOf,
  mainFor, pageName, records, roleFor,
} from './data/model.js'
import { CommentDock, CommentPins } from './comments.jsx'
import { AssetDock, ComponentDialog, LayerDock, PublishDialog } from './components.jsx'
import { Share } from './Share.jsx'
import { SessionLink, useWorkspace } from './store.jsx'
import { Icon, Empty } from './ui.jsx'
import { withSid } from './utils/dataManager.js'

const clamp = (value) => Math.max(0, Math.min(1, value))
const tools = ['Layers', 'Assets', 'Comments']

export function Editor({ fileId }) {
  const { state } = useWorkspace()
  const file = find(state, 'files', fileId)
  const role = roleFor(state, file)
  if (!role) return <main className="recovery">
    <SessionLink to="/" className="wordmark">Figma</SessionLink>
    <Empty title={file?.status === 'trashed' ? 'This design is in Trash' : file ? 'This design is restricted' : 'Design unavailable'}>
      <p>{file?.status === 'trashed' ? 'Restore the file from Trash to open it again.' : file ? 'Your account needs access to open this design.' : 'The file link may be out of date.'}</p>
      <SessionLink to={file?.status === 'trashed' ? '/trash' : '/'} className="button primary">{file?.status === 'trashed' ? 'Open Trash' : 'Back to files'}</SessionLink>
    </Empty>
  </main>
  return <DesignWorkspace file={file} role={role} />
}

function DesignWorkspace({ file, role }) {
  const { state, commit, notify } = useWorkspace()
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const [dock, setDock] = useState('Layers')
  const [selectedId, setSelected] = useState(null)
  const [assetId, setAsset] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [showResolved, setShowResolved] = useState(false)
  const [modal, setModal] = useState(null)
  const pages = records(state, 'pages').filter((item) => item.id && item.fileId === file.id).sort(byPosition)
  const threads = records(state, 'commentThreads').filter((item) => item.id && item.fileId === file.id)
  const linkedThread = threads.find((item) => item.id === query.get('thread') && pages.some((page) => page.id === item.pageId))
  const linkedThreadId = linkedThread?.id
  const page = pages.find((item) => item.id === (linkedThread?.pageId ?? query.get('page'))) || pages[0]
  const pageId = page?.id
  const layers = records(state, 'layers').filter((item) => item.id && item.fileId === file.id && item.pageId === pageId).sort(byPosition)
  const linkedLayerId = layers.find((item) => item.id === query.get('layer'))?.id
  const selection = layers.find((item) => item.id === selectedId)
  const asset = find(state, 'components', assetId)
  const canEdit = editable(state, file)
  const container = find(state, 'folders', file.folderId)

  useEffect(() => {
    setPlacing(false)
    setAnchor(null)
  }, [pageId])

  useEffect(() => {
    if (linkedThreadId) {
      setDock('Comments')
      setPlacing(false)
      setAnchor(null)
    }
  }, [linkedThreadId])

  useEffect(() => {
    if (!linkedThreadId && linkedLayerId) {
      setSelected(linkedLayerId)
      setDock('Layers')
    }
  }, [linkedThreadId, linkedLayerId])

  useEffect(() => {
    function onKey(event) {
      if (event.defaultPrevented || modal || event.target.closest?.('input, textarea, select, [contenteditable=true]') && event.key !== 'Escape') return
      if (event.key === 'Escape' && (placing || anchor)) {
        event.preventDefault()
        setPlacing(false)
        setAnchor(null)
      }
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey && !event.altKey && page) {
        event.preventDefault()
        setDock('Comments')
        setAnchor(null)
        setPlacing(true)
        if (linkedThreadId) navigate(withSid(filePath(file.id, page.id)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, placing, anchor, modal, linkedThreadId, file.id, navigate])

  function perform(fields, message) {
    if (!commit((current) => mutate(current, { fileId: file.id, pageId: page?.id, ...fields }))) return false
    if (message) notify(message)
    return true
  }
  function switchPage(nextPageId) {
    setSelected(null)
    setPlacing(false)
    setAnchor(null)
    navigate(withSid(filePath(file.id, nextPageId)))
  }
  function openThread(thread) {
    if (!pages.some((item) => item.id === thread.pageId)) return
    setDock('Comments')
    setPlacing(false)
    setAnchor(null)
    navigate(withSid(filePath(file.id, thread.pageId, thread.id)))
  }
  function startComment() {
    if (!page) return
    setDock('Comments')
    setAnchor(null)
    setPlacing(true)
    if (linkedThread) navigate(withSid(filePath(file.id, page.id)))
  }
  function canvasClick(event) {
    if (!placing) return
    const layerId = event.target.closest('[data-layer-id]')?.dataset.layerId ?? null
    const box = event.currentTarget.getBoundingClientRect()
    const target = layers.find((item) => item.id === layerId)
    const geometry = geometryOf(target)
    setAnchor({
      layerId,
      x: clamp(event.detail === 0 ? target ? (geometry.x + geometry.width / 2) / 960 : 0.5 : (event.clientX - box.left) / box.width),
      y: clamp(event.detail === 0 ? target ? (geometry.y + geometry.height / 2) / 600 : 0.5 : (event.clientY - box.top) / box.height),
    })
    setPlacing(false)
  }
  function addLayer(type, componentId) {
    const newId = newRecordId('layer')
    if (perform({ type, newId, componentId }, type === 'insert' ? 'Instance inserted' : 'Shape added')) {
      setSelected(newId)
      setDock('Layers')
    }
  }
  function saveComment(body) {
    const newId = newRecordId('thread')
    if (perform({ type: 'comment', newId, body, ...anchor }, 'Comment posted')) {
      openThread({ id: newId, pageId: page.id })
    }
  }

  const pinned = threads.filter((item) => item.pageId === page?.id && (item.status !== 'resolved' || showResolved || item.id === linkedThreadId))
  return <div className="editor">
    <header className="editor-header">
      <SessionLink to="/" className="button back-button"><Icon name="back" />Back to files</SessionLink>
      <div className="breadcrumb">
        <SessionLink to={container?.status !== 'archived' && container?.id ? folderPath(container.id) : file.folderId ? '/' : '/drafts'}>{destination(state, file)}</SessionLink>
        <span aria-hidden="true">/</span><h1 title={fileName(file)}>{fileName(file)}</h1>
      </div>
      {role === 'view' && <span className="badge warning editor-role">Can view</span>}
      <button type="button" className="primary" onClick={() => setModal('share')}>Share</button>
    </header>
    <div className="editor-toolbar">
      <div className="page-tabs" aria-label="Design pages">
        {pages.map((item) => <button type="button" className="quiet" key={item.id} aria-current={item.id === page?.id ? 'page' : undefined} onClick={() => switchPage(item.id)}>{pageName(item)}</button>)}
      </div>
      <div className="tool-tabs" aria-label="Editor tools">
        {tools.map((tool) => <button type="button" className="quiet" key={tool} aria-pressed={dock === tool}
          onClick={() => { setDock(dock === tool ? null : tool); if (tool !== 'Comments' || dock === 'Comments') { setPlacing(false); setAnchor(null) } }}>{tool}</button>)}
      </div>
    </div>
    <div className="editor-body">
      <main className="stage">
        {page ? <div className="document">
          <div className="artboard-label"><span>{pageName(page)}</span><span>960 × 600</span></div>
          {placing && <div className="placing-hint" role="status">Click the canvas to place a comment. Press Esc to cancel.</div>}
          <div className={'artboard' + (placing ? ' placing' : '')} aria-label={pageName(page) + ' canvas'} onClick={canvasClick}>
            {placing && <button type="button" className="canvas-target" aria-label="Place comment at canvas center" />}
            {layers.map((layer) => <CanvasLayer key={layer.id} layer={layer} selected={layer.id === selectedId} placing={placing}
              onSelect={() => { setSelected(layer.id); setDock('Layers') }} />)}
            {dock === 'Comments' && <CommentPins threads={pinned} all={threads} current={linkedThreadId} anchor={anchor} openThread={openThread} />}
            {!layers.length && !placing && <div className="blank-canvas"><span>◇</span><p>Blank canvas</p></div>}
          </div>
        </div> : <Empty title="No pages in this file" />}
      </main>
      {dock && <aside className={'dock' + (placing ? ' placing-dock' : '')} aria-label={dock}>
        <div className="dock-heading"><h2>{dock}</h2><button type="button" className="icon-button quiet" aria-label={'Close ' + dock}
          onClick={() => { setDock(null); setPlacing(false); setAnchor(null) }}><Icon name="close" /></button></div>
        {dock === 'Layers' && <LayerDock layers={layers} page={page} canEdit={canEdit} selected={selection}
          select={setSelected} addShape={() => addLayer('shape')} component={() => setModal('component')} edit={() => setModal('edit')} />}
        {dock === 'Assets' && <AssetDock file={file} canEdit={canEdit} page={page} selected={asset} select={setAsset}
          publish={() => setModal('publish')} insert={() => addLayer('insert', assetId)} edit={() => setModal('asset-edit')} />}
        {dock === 'Comments' && <CommentDock key={file.id} threads={threads} current={linkedThread} page={page} anchor={anchor} placing={placing}
          start={startComment} cancel={() => { setAnchor(null); setPlacing(false) }} save={saveComment} showResolved={showResolved}
          toggleResolved={setShowResolved} openThread={openThread} closeThread={() => navigate(withSid(filePath(file.id, page?.id)))}
          perform={perform} />}
      </aside>}
    </div>
    {modal === 'share' && <Share fileId={file.id} onClose={() => setModal(null)} />}
    {['component', 'edit', 'asset-edit'].includes(modal) && <ComponentDialog
      layer={selection} component={modal === 'asset-edit' ? asset : modal === 'edit' ? find(state, 'components', selection?.componentId) : null}
      onClose={() => setModal(null)} onSave={(fields) => {
        if (perform({ ...fields, layerId: selection?.id, newId: newRecordId('component') }, fields.type === 'component' ? 'Component created' : 'Component updated')) setModal(null)
      }} />}
    {modal === 'publish' && <PublishDialog file={file} onClose={() => setModal(null)} onSave={(componentIds) => {
      if (perform({ type: 'publish', componentIds }, 'Library published')) setModal(null)
    }} />}
  </div>
}

function boxStyle(box, width = 960, height = 600) {
  return { left: box.x / width * 100 + '%', top: box.y / height * 100 + '%', width: box.width / width * 100 + '%', height: box.height / height * 100 + '%' }
}

function CanvasLayer({ layer, selected, placing, onSelect }) {
  const { state } = useWorkspace()
  const component = layer.kind === 'instance' ? find(state, 'components', layer.componentId) : null
  const ownFile = find(state, 'files', layer.fileId)
  const main = availableComponent(state, component, ownFile) ? mainFor(state, component) : null
  const geometry = geometryOf(layer)
  const source = main || layer
  const origin = geometryOf(main)
  const childLayers = main ? records(state, 'layers').filter((item) => item.fileId === main.fileId && item.pageId === main.pageId).sort(byPosition) : []
  function children(parentId, visited) {
    return childLayers.filter((child) => child.parentLayerId === parentId && !visited.has(child.id)).map((child) => {
      const box = geometryOf(child)
      const next = new Set(visited).add(child.id)
      return <LayerArtwork key={child.id} child={child} box={box} origin={origin} descendants={children(child.id, next)} />
    })
  }
  return <button type="button" data-layer-id={layer.id} aria-label={layer.name || 'Untitled layer'}
    className={'canvas-layer ' + (layer.kind || 'shape') + (selected ? ' selected' : '')}
    style={{ ...boxStyle(geometry), backgroundColor: source.fill || undefined }}
    onClick={() => { if (!placing) onSelect() }}>
    {source.text || (layer.kind === 'instance' && !main ? layer.name || 'Instance' : null)}
    {main && children(main.id, new Set([main.id]))}
  </button>
}

function LayerArtwork({ child, box, origin, descendants }) {
  return <><span className={'layer-art ' + (child.kind || 'shape')}
    style={{ ...boxStyle({ ...box, x: box.x - origin.x, y: box.y - origin.y }, origin.width, origin.height), backgroundColor: child.fill || undefined }}>{child.text}</span>{descendants}</>
}

