import React, { useRef, useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { Confirm, Empty, Icon, Modal, ProfileTile } from '../components/ui.jsx'
import { dateTimeLabel, relativeTime, timeZoneFor } from '../utils/dates.js'
import { createId, feedTypes, findRecord, initials, profileName, records, text } from '../utils/records.js'
import { boardStreams, changeStreamOrder, compatibleTypes, feedFor, orderedActive, removeBoard, saveBoard, saveStream } from '../features/streams.js'

export function Streams() {
  const { state, actor, commit } = useWorkspace()
  const boards = orderedActive(state.streamBoards)
  const [selection, setSelection] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [search, setSearch] = useState('')
  const [refreshed, setRefreshed] = useState(null)
  const [message, setMessage] = useState('')
  const columnsRef = useRef(null)
  const board = findRecord(boards, selection) || boards[0]
  const streams = board?.id ? boardStreams(state, board.id) : []
  const selectedStream = findRecord(streams, dialog?.streamId)

  function select(id) {
    setSelection(id)
    setRefreshed(null)
    if (columnsRef.current) columnsRef.current.scrollLeft = 0
  }

  function open(kind, returnFocus, streamId) {
    setDialog({ kind, returnFocus, streamId })
  }

  function saveBoardName(name) {
    const editing = dialog.kind === 'rename-board'
    const newId = editing ? board.id : createId('board')
    const error = commit((current, change) => saveBoard(current, change, { boardId: editing ? board.id : null, newId, name }))
    if (!error) {
      select(newId)
      setDialog(null)
      setMessage(editing ? 'Board renamed.' : 'Board created.')
    }
    return error
  }

  function deleteBoard() {
    const index = boards.indexOf(board)
    const error = commit((current, change) => removeBoard(current, change, board.id))
    if (!error) {
      select((boards[index + 1] || boards[index - 1])?.id)
      setDialog(null)
      setMessage('Board removed.')
    }
    return error
  }

  function saveStreamFields(fields) {
    const error = commit((current, change) => saveStream(current, change, {
      ...fields, streamId: selectedStream?.id, boardId: board.id, newId: selectedStream ? null : createId('stream'),
    }))
    if (!error) {
      setDialog(null)
      setMessage(selectedStream ? 'Stream updated.' : 'Stream added.')
    }
    return error
  }

  function updateOrder(id, operation, destination) {
    const error = commit((current, change) => changeStreamOrder(current, change, id, operation, destination))
    if (!error) {
      setDialog(null)
      setMessage(operation === 'remove' ? 'Stream removed.' : 'Stream moved.')
    }
    return error
  }

  function streamAction(operation, streamId, trigger) {
    if (operation === 'left' || operation === 'right') {
      const error = updateOrder(streamId, operation)
      if (error) setMessage(error)
    } else {
      open(operation, trigger, streamId)
    }
  }

  const zone = timeZoneFor(state.workspace?.timeZone)
  const now = new Date()

  return <>
    <div className="page-heading">
      <div><h1>Streams</h1><p>Follow conversations and posts across your social profiles.</p></div>
      <button className="primary" disabled={!actor} onClick={(event) => open('new-board', event.currentTarget)}><Icon name="plus" />New board</button>
    </div>
    {message && <p className="notice" role="status">{message}<button className="quiet icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}><Icon name="close" /></button></p>}
    <div className="streams-layout">
      <aside className="panel board-index">
        <h2>Boards</h2>
        {boards.length > 0 ? <ul>{boards.map((item, index) => <li key={item.id || index}>
          <button disabled={!item.id} aria-pressed={item === board} onClick={() => select(item.id)}>
            <Icon name="streams" />{text(item.name) || 'Untitled board'}
          </button>
        </li>)}</ul> : <p className="muted">No boards yet.</p>}
      </aside>
      <section className="streams-workspace" aria-label="Stream feeds">
        {board ? <>
          <div className="panel stream-toolbar">
            <div className="stream-board-heading">
              <h2>{text(board.name) || 'Untitled board'}</h2>
              {actor && board.id && <ActionMenu label="Board actions" items={[
                ['Rename board', 'rename-board'],
                ['Remove board', 'remove-board'],
              ]} onAction={(action, trigger) => open(action, trigger)} />}
            </div>
            <div className="stream-controls">
              <label className="search-box"><Icon name="search" /><input aria-label="Filter feed posts" type="search" placeholder="Filter feed posts"
                value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <button onClick={() => setRefreshed(new Date())}><Icon name="refresh" />Refresh</button>
              <button className="primary" disabled={!actor || !board.id} onClick={(event) => open('add-stream', event.currentTarget)}><Icon name="plus" />Add stream</button>
            </div>
          </div>
          {refreshed && <p className="refresh-note" role="status">Feeds refreshed at {dateTimeLabel(refreshed, zone)} {zone}.</p>}
          {streams.length ? <div className="stream-columns" ref={columnsRef}>
            {streams.map((stream, index) => {
              const profile = findRecord(state.profiles, stream.profileId)
              const cards = feedFor(state.feedItems, stream, profile, search)
              return <section className="panel feed-column" key={stream.id || index} aria-label={text(stream.name) || 'Untitled stream'}>
                <div className="feed-header">
                  <div className="feed-title">
                    <ProfileTile profile={profile} />
                    <h3>{text(stream.name) || 'Untitled stream'}</h3>
                    {actor && stream.id && <ActionMenu label={`Actions for ${text(stream.name) || 'stream'}`} items={[
                      ['Edit stream', 'edit-stream'],
                      ['Move to board', 'move-stream', !boards.some((item) => item.id && item.id !== board.id)],
                      ['Move left', 'left', index === 0],
                      ['Move right', 'right', index === streams.length - 1],
                      ['Remove', 'remove-stream'],
                    ]} onAction={(action, trigger) => streamAction(action, stream.id, trigger)} />}
                  </div>
                  <p>{profileName(profile)}</p>
                  <div className="feed-kind">
                    <span>{feedTypes[stream.type] || 'Unknown type'}{stream.type === 'keyword_search' && stream.query ? ` · ${text(stream.query)}` : ''}</span>
                    <span>{cards.length} {cards.length === 1 ? 'post' : 'posts'}</span>
                  </div>
                </div>
                {cards.length ? <ul className="feed-list">{cards.map((item, cardIndex) => <li key={item.id || cardIndex}>
                  <div className="feed-author">
                    <span className="person-tile">{initials(item.authorName)}</span>
                    <div><strong>{text(item.authorName) || 'Unknown author'}</strong><span>{text(item.authorHandle)}</span></div>
                    <time dateTime={item.createdAt} title={dateTimeLabel(item.createdAt, zone)}>{relativeTime(item.createdAt, now)}</time>
                  </div>
                  <p>{text(item.body) || 'No caption available.'}</p>
                </li>)}</ul> : <Empty title={profile ? 'No matching posts' : 'Profile unavailable'}>{profile && search ? 'Try a different search.' : undefined}</Empty>}
              </section>
            })}
          </div> : <div className="panel"><Empty icon="streams" title="No streams on this board">Add a stream to start following a feed.</Empty></div>}
        </> : <div className="panel"><Empty icon="streams" title="No boards available">Create a board to organize your streams.</Empty></div>}
      </section>
    </div>
    {dialog && <StreamDialog dialog={dialog} close={() => setDialog(null)} board={board} streams={streams} selectedStream={selectedStream}
      boards={boards} profiles={state.profiles} saveBoardName={saveBoardName} deleteBoard={deleteBoard}
      saveStreamFields={saveStreamFields} updateOrder={updateOrder} />}
  </>
}

function ActionMenu({ label, items, onAction }) {
  const details = useRef(null)
  function close() { details.current.open = false }
  return <details className="action-menu" ref={details}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}
    onKeyDown={(event) => { if (event.key === 'Escape') { close(); details.current.querySelector('summary').focus() } }}>
    <summary className="icon-button quiet" aria-label={label} title={label}><Icon name="more" /></summary>
    <div className="menu-items">{items.map(([name, action, disabled]) => <button key={action} disabled={disabled}
      onClick={() => {
        const trigger = details.current.querySelector('summary')
        close()
        trigger.focus()
        onAction(action, trigger)
      }}>{name}</button>)}</div>
  </details>
}

function StreamDialog({ dialog, close, board, streams, selectedStream, boards, profiles, saveBoardName, deleteBoard, saveStreamFields, updateOrder }) {
  const common = { onClose: close, returnFocus: dialog.returnFocus }
  switch (dialog.kind) {
    case 'new-board':
    case 'rename-board': {
      const editing = dialog.kind === 'rename-board'
      return <BoardForm {...common} title={editing ? 'Rename board' : 'New board'}
        action={editing ? 'Save board name' : 'Create board'} initial={editing ? text(board?.name) : ''} save={saveBoardName} />
    }
    case 'remove-board':
      return <Confirm {...common} title="Remove board?" action="Remove board" onConfirm={deleteBoard}>
        Removing {text(board?.name) || 'this board'} will also remove {streams.length} {streams.length === 1 ? 'stream' : 'streams'}.
      </Confirm>
    case 'add-stream':
    case 'edit-stream':
      return <StreamForm {...common} stream={selectedStream} profiles={profiles} save={saveStreamFields} />
    case 'move-stream':
      return <MoveForm {...common} boards={boards.filter((item) => item.id && item.id !== board?.id)}
        save={(id) => updateOrder(selectedStream?.id, 'move', id)} />
    case 'remove-stream':
      return <Confirm {...common} title="Remove stream?" action="Remove stream" onConfirm={() => updateOrder(selectedStream?.id, 'remove')}>
        Remove {text(selectedStream?.name) || 'this stream'} from {text(board?.name) || 'the board'}?
      </Confirm>
    default:
      return null
  }
}

function FormDialog({ title, action, onClose, returnFocus, onSubmit, children }) {
  const [error, setError] = useState('')
  return <Modal title={title} compact onClose={onClose} returnFocus={returnFocus}>
    <form onChange={() => setError('')} onSubmit={(event) => { event.preventDefault(); setError(onSubmit()) }}>
      <div className="form-fields">{children}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <footer className="modal-actions">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary">{action}</button>
      </footer>
    </form>
  </Modal>
}

function BoardForm({ title, action, initial, save, ...common }) {
  const [name, setName] = useState(initial)
  return <FormDialog {...common} title={title} action={action} onSubmit={() => save(name)}>
    <label>Board name<input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
  </FormDialog>
}

function StreamForm({ stream, profiles, save, ...common }) {
  const [name, setName] = useState(text(stream?.name))
  const [profileId, setProfileId] = useState(text(stream?.profileId))
  const [type, setType] = useState(text(stream?.type) || 'my_posts')
  const [query, setQuery] = useState(text(stream?.query))
  const profile = findRecord(profiles, profileId)
  const types = compatibleTypes(profile)
  const editing = Boolean(stream)

  function changeProfile(id) {
    setProfileId(id)
    if (!compatibleTypes(findRecord(profiles, id)).includes(type)) setType('my_posts')
  }

  return <FormDialog {...common} title={editing ? 'Edit stream' : 'Add stream'} action={editing ? 'Save changes' : 'Add stream'}
    onSubmit={() => save({ name, profileId, type, query })}>
    <label>Stream title<input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
    <label>Social profile<select aria-label="Social profile" value={profileId} onChange={(event) => changeProfile(event.target.value)}>
      <option value="">Choose a profile</option>
      {profileId && !profile && <option value={profileId}>Unavailable profile</option>}
      {records(profiles).filter((item) => item.id).map((item) => <option key={item.id} value={item.id}>{profileName(item)}</option>)}
    </select></label>
    <label>Stream type<select aria-label="Stream type" value={type} disabled={!profile} onChange={(event) => setType(event.target.value)}>
      {!types.includes(type) && <option value={type}>{profile ? 'Choose a supported type' : 'Choose a profile first'}</option>}
      {types.map((key) => <option key={key} value={key}>{feedTypes[key]}</option>)}
    </select></label>
    {type === 'keyword_search' && profile && <label>Keyword or phrase<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. #RepairClub" /></label>}
  </FormDialog>
}

function MoveForm({ boards, save, ...common }) {
  const [destination, setDestination] = useState('')
  return <FormDialog {...common} title="Move to board" action="Move stream" onSubmit={() => save(destination)}>
    <label>Destination board<select aria-label="Destination board" value={destination} onChange={(event) => setDestination(event.target.value)} autoFocus>
      <option value="">Choose a board</option>
      {boards.map((item) => <option key={item.id} value={item.id}>{text(item.name) || 'Untitled board'}</option>)}
    </select></label>
  </FormDialog>
}
