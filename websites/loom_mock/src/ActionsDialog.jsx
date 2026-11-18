import { useEffect, useRef, useState } from 'react'
import { getSample, samples } from './data/media.js'
import { durationLabel, folderName, isActive, records, status, useWorkspace, videoTitle } from './store.jsx'

export function Dialog({ title, close, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    const element = dialog.current
    element.showModal()
    return () => {
      element.close()
      if (trigger?.isConnected && trigger !== document.body) trigger.focus()
      queueMicrotask(() => {
        if (document.activeElement === document.body) document.querySelector('h1')?.focus({ preventScroll: true })
      })
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); close() }}
    onClick={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="dialog-content">
      <h2 id="dialog-title">{title}</h2>
      {children}
    </div>
  </dialog>
}

const initialSample = Object.keys(samples)[0]

function titleFor(type) {
  return {
    newVideo: 'New video', newFolder: 'New folder', renameVideo: 'Rename video', editVideo: 'Edit details',
    renameFolder: 'Rename folder', move: 'Move video', bulkMove: 'Move videos', archiveVideo: 'Archive video',
    bulkArchive: 'Archive videos', archiveFolder: 'Archive folder', restoreVideo: 'Restore video',
    restoreFolder: 'Restore folder', deleteVideo: 'Delete video permanently',
    deleteFolder: 'Delete folder permanently', deleteComment: 'Delete comment',
  }[type]
}

const replace = (items, target, changes) => records(items).map((item) => item.id === target.id ? { ...item, ...changes } : item)

export function ActionsDialog({ action, close, onCreated, onArchived, onBatch, activeFolders }) {
  const { state, commit } = useWorkspace()
  const { type, item, folderId, ids } = action
  const [name, setName] = useState(item?.title ?? item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [sampleKey, setSampleKey] = useState(initialSample)
  const [destination, setDestination] = useState(type === 'bulkMove' ? undefined : item?.folderId ?? folderId ?? null)
  const [error, setError] = useState('')
  const folders = records(state.folders)
  const videos = records(state.videos)
  const selectedVideos = videos.filter((video) => ids?.includes(video.id))
  const folderMembers = videos.filter((video) => video.folderId === item?.id && status(video) !== 'deleted')
  const namedFolder = type === 'newFolder' || type === 'renameFolder'
  const hasName = namedFolder || ['newVideo', 'editVideo', 'renameVideo'].includes(type)
  const hasDescription = type === 'newVideo' || type === 'editVideo'
  const isMove = type === 'move' || type === 'bulkMove'
  const selectsFolder = isMove || type === 'newVideo'
  const noMove = type === 'bulkMove' ? selectedVideos.every((video) => (video.folderId ?? null) === destination)
    : (item?.folderId ?? null) === destination
  const destruct = type.startsWith('delete')
  const folderClash = (value) => activeFolders.some((folder) => folder.id !== item?.id &&
    typeof folder.name === 'string' && folder.name.trim().toLowerCase() === value.toLowerCase())
  const title = titleFor(type)

  function submit(event) {
    event.preventDefault()
    const clean = name.trim()
    if (hasName && !clean) return setError(namedFolder ? 'Enter a folder name.' : 'Enter a video title.')
    if (namedFolder && folderClash(clean)) return setError('An active folder already has this name.')
    if (type === 'restoreFolder' && folderClash(folderName(item).trim())) {
      return setError('An active folder already has this name. Rename the active folder before restoring this one.')
    }
    if (isMove && (destination === undefined || noMove)) return

    const id = type === 'newVideo' || type === 'newFolder' ? crypto.randomUUID() : null
    commit((previous, meta) => {
      const timestamp = meta.updatedAt
      const deleted = { ...meta, status: 'deleted', deletedAt: timestamp }
      const archived = { ...meta, status: 'archived', archivedAt: timestamp }
      const restored = { ...meta, status: 'active', archivedAt: null }
      const created = { id, status: 'active', createdAt: timestamp, ownerId: meta.updatedBy, ...meta }
      switch (type) {
        case 'newVideo':
          return { ...previous, videos: [...videos, {
            ...created, title: clean, description: description.trim(), folderId: destination,
            sampleKey, durationSeconds: getSample(sampleKey).duration,
          }] }
        case 'newFolder':
          return { ...previous, folders: [...folders, { ...created, name: clean }] }
        case 'renameVideo':
        case 'editVideo':
          if (clean === item.title && (!hasDescription || description.trim() === (item.description ?? ''))) return previous
          return { ...previous, videos: replace(videos, item, {
            ...meta, title: clean, ...(hasDescription ? { description: description.trim() } : {}),
          }) }
        case 'renameFolder':
          if (clean === item.name) return previous
          return { ...previous, folders: replace(folders, item, { ...meta, name: clean }) }
        case 'move':
          return { ...previous, videos: replace(videos, item, { ...meta, folderId: destination }) }
        case 'bulkMove':
          return { ...previous, videos: videos.map((video) => ids.includes(video.id) && (video.folderId ?? null) !== destination
            ? { ...video, ...meta, folderId: destination } : video) }
        case 'archiveVideo':
          return { ...previous, videos: replace(videos, item, archived) }
        case 'bulkArchive':
          return { ...previous, videos: videos.map((video) => ids.includes(video.id) ? { ...video, ...archived } : video) }
        case 'archiveFolder':
          return { ...previous, folders: replace(folders, item, archived) }
        case 'restoreFolder':
          return { ...previous, folders: replace(folders, item, restored) }
        case 'restoreVideo':
          return { ...previous, videos: replace(videos, item, {
            ...restored, folderId: activeFolders.some((folder) => folder.id === item.folderId) ? item.folderId : null,
          }) }
        case 'deleteFolder':
        case 'deleteVideo': {
          const removed = new Set(type === 'deleteFolder' ? folderMembers.map((video) => video.id) : [item.id])
          return {
            ...previous,
            ...(type === 'deleteFolder' ? { folders: replace(folders, item, deleted) } : {}),
            videos: videos.map((video) => removed.has(video.id) ? { ...video, ...deleted } : video),
            comments: records(previous.comments).map((comment) => removed.has(comment.videoId) && isActive(comment)
              ? { ...comment, ...deleted } : comment),
          }
        }
        case 'deleteComment':
          return { ...previous, comments: replace(previous.comments, item, deleted) }
        default:
          return previous
      }
    }, {
      newVideo: 'Video created.', newFolder: 'Folder created.', renameVideo: 'Video renamed.',
      editVideo: 'Video details saved.', renameFolder: 'Folder renamed.', move: 'Video moved.', bulkMove: 'Videos moved.',
      archiveVideo: 'Video archived.', bulkArchive: 'Videos archived.', archiveFolder: 'Folder archived.',
      restoreVideo: 'Video restored.', restoreFolder: 'Folder restored.', deleteVideo: 'Video deleted.',
      deleteFolder: 'Folder deleted.', deleteComment: 'Comment deleted.',
    }[type])
    close()
    if (type === 'newVideo') onCreated(id)
    if (type === 'archiveFolder' || type === 'archiveVideo') onArchived(type, item.id)
    if (type === 'bulkArchive' || type === 'bulkMove') onBatch()
  }

  const memberCount = folderMembers.length
  const memberText = memberCount + (memberCount === 1 ? ' video' : ' videos')
  const question = {
    archiveVideo: <>Move <strong>{videoTitle(item)}</strong> to Archive? You can restore it later.</>,
    bulkArchive: <>Move <strong>{selectedVideos.length} selected videos</strong> to Archive?</>,
    archiveFolder: <>Archive <strong>{folderName(item)}</strong>? Its recordings will be hidden until the folder is restored.</>,
    restoreVideo: <>Restore <strong>{videoTitle(item)}</strong> to {activeFolders.find((folder) => folder.id === item?.folderId)?.name || 'My Library'}?</>,
    restoreFolder: <>Restore <strong>{folderName(item)}</strong> and show its active recordings again?</>,
    deleteVideo: <>Permanently delete <strong>{videoTitle(item)}</strong> and its discussion?</>,
    deleteFolder: <>Permanently delete <strong>{folderName(item)}</strong>, its {memberText}, and their discussions?</>,
    deleteComment: <>Delete this comment from the discussion?</>,
  }[type]

  return <Dialog title={title} close={close}>
    <form onSubmit={submit}>
      {hasName && <label>{namedFolder ? 'Folder name' : 'Title'}
        <input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError('') }}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'action-error' : undefined} />
      </label>}
      {hasDescription && <div className="dialog-field">
        <label htmlFor="description">Description</label>
        <textarea id="description" rows="3" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>}
      {type === 'newVideo' && <div className="dialog-field">
        <label htmlFor="local-sample">Local sample</label>
        <select id="local-sample" value={sampleKey} onChange={(event) => setSampleKey(event.target.value)}>
          {Object.entries(samples).map(([key, sample]) => <option value={key} key={key}>
            {sample.label} · {durationLabel(sample.duration)}
          </option>)}
        </select>
      </div>}
      {selectsFolder && <div className="dialog-field">
        <label htmlFor="destination">Destination</label>
        <select id="destination" autoFocus={isMove} value={destination === undefined ? '__choose' : destination ?? ''}
          onChange={(event) => setDestination(event.target.value || null)}>
          {type === 'bulkMove' && <option value="__choose" disabled>Choose a destination</option>}
          {type === 'move' && item?.folderId != null && !activeFolders.some((folder) => folder.id === item.folderId) &&
            <option value={item.folderId} disabled>Previous folder unavailable (current)</option>}
          <option value="">My Library{type === 'move' && item?.folderId == null ? ' (current)' : ''}</option>
          {activeFolders.map((folder) => <option key={folder.id} value={folder.id}>
            {folderName(folder)}{type === 'move' && item?.folderId === folder.id ? ' (current)' : ''}
          </option>)}
        </select>
      </div>}
      {question && <p>{question}</p>}
      {error && <p className="field-error" id="action-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={close} autoFocus={!hasName && !selectsFolder}>Cancel</button>
        <button type="submit" className={'button ' + (destruct ? 'danger' : 'primary')}
          disabled={isMove && (destination === undefined || noMove)}>
          {destruct ? (type === 'deleteComment' ? 'Delete comment' : 'Delete permanently')
            : isMove ? 'Move' : type.startsWith('archive') || type === 'bulkArchive' ? 'Archive'
            : type.startsWith('restore') ? 'Restore' : type.startsWith('new') ? 'Create' : 'Save'}
        </button>
      </div>
    </form>
  </Dialog>
}
