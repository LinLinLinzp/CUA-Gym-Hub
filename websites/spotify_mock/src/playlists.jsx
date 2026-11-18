import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  accountId, artistNames, canEdit, canRead, canSavePlaylist, inviteStatus, isOwner, label, lookup, matches, members, orderedItems, route,
} from './data/model.js'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import {
  Art, covers, DetailHero, Dialog, Empty, Icon, PersonLink, SaveButton, SearchField, SiteLink, TrackList, useSiteNavigate,
} from './ui.jsx'
import { BackLink } from './collection.jsx'

export function PlaylistForm({ playlist, onClose }) {
  const { dispatch } = useAccount()
  const navigate = useSiteNavigate()
  const [name, setName] = useState(playlist?.name ?? '')
  const [description, setDescription] = useState(playlist?.description ?? '')
  const [visibility, setVisibility] = useState(playlist?.collaborative ? 'private' : playlist?.visibility ?? 'private')
  const [artKey, setArtKey] = useState(playlist?.artKey || '')
  const [error, setError] = useState('')
  const nameInput = useRef(null)
  function submit(event) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a playlist name.')
      nameInput.current.focus()
      return
    }
    if (playlist && name === (playlist.name ?? '') && description === (playlist.description ?? '') &&
        visibility === (playlist.collaborative ? 'private' : playlist.visibility ?? 'private') && artKey === (playlist.artKey || '')) {
      onClose()
      return
    }
    const playlistId = playlist?.id || `playlist-${crypto.randomUUID()}`
    const changed = dispatch({ type: playlist ? 'editPlaylist' : 'createPlaylist', playlistId, name, description, visibility, artKey },
      playlist ? 'Playlist details saved.' : 'Playlist created.')
    onClose()
    if (!playlist && changed) navigate(route('playlist', playlistId))
  }
  return <Dialog title={playlist ? 'Edit playlist' : 'Create playlist'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <label>Name <input ref={nameInput} data-initial-focus value={name} maxLength={100}
        aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : undefined}
        onChange={(event) => { setName(event.target.value); setError('') }} /></label>
      {error && <p id="name-error" className="error">{error}</p>}
      <label>Description <textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
      <label>Visibility <select value={visibility} disabled={playlist?.collaborative} onChange={(event) => setVisibility(event.target.value)}>
        <option value="private">Private</option><option value="public">Public</option>
      </select></label>
      {playlist?.collaborative && <p className="metadata">Collaborative playlists are private.</p>}
      {playlist && <fieldset className="cover-picker">
        <legend>Cover artwork</legend>
        {covers.map(([key, name]) => <button type="button" className="cover-choice" key={key} title={name} aria-label={`Use ${name} cover`} aria-pressed={artKey === key} onClick={() => setArtKey(key)}>
          <Art record={{ artKey: key }} />
        </button>)}
      </fieldset>}
      <footer className="dialog-actions">
        <button className="button" type="button" onClick={onClose}>Cancel</button>
        <button className="button primary" type="submit">{playlist ? 'Save changes' : 'Create playlist'}</button>
      </footer>
    </form>
  </Dialog>
}

function AddTracks({ playlist, onClose }) {
  const { state, dispatch } = useAccount()
  const [query, setQuery] = useState('')
  const present = new Set(orderedItems(state, playlist.id).map((item) => item.trackId))
  const tracks = state.tracks.filter((track) => matches(query, label(track), artistNames(state, track), label(lookup(state.albums, track.albumId), '')))
  return <Dialog title="Add tracks" onClose={onClose} wide>
    <SearchField label="Search tracks" value={query} onChange={setQuery} placeholder="Search by track, artist, or album" />
    {tracks.length > 0 ? <ul className="picker">
      {tracks.map((track) => {
        const added = present.has(track.id)
        return <li key={track.id}>
          <Art record={lookup(state.albums, track.albumId) || track} />
          <span><strong>{label(track)}</strong><small>{artistNames(state, track) || 'Unknown artist'}</small></span>
          <button className="button small" type="button" disabled={added} aria-label={`${added ? 'Added' : 'Add'} ${label(track)}`}
            onClick={() => dispatch({ type: 'addTrack', playlistId: playlist.id, trackId: track.id }, `Added ${label(track)}.`)}>{added ? 'Added' : 'Add'}</button>
        </li>
      })}
    </ul> : <p className="metadata dialog-description">No matching tracks.</p>}
    <footer className="dialog-actions"><button className="button primary" type="button" onClick={onClose}>Done</button></footer>
  </Dialog>
}

function Collaborators({ playlist, onClose }) {
  const { state, dispatch, announce } = useAccount()
  const [recipientId, setRecipient] = useState('')
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [activeInvite, setActiveInvite] = useState(null)
  const linkInput = useRef(null)
  const currentMembers = members(state, playlist)
  const invites = state.playlistInvites.filter((invite) => invite.playlistId === playlist.id && invite.status === 'pending')
  const selected = lookup(invites, activeInvite) || invites.at(-1)
  const inviteLink = selected ? new URL(withSid(`/invite/${encodeURIComponent(selected.token)}`), window.location.origin).href : ''
  const eligible = state.users.filter((user) => user.id !== accountId(state) && !currentMembers.some((member) => member.userId === user.id))
  const act = (type, fields, message) => dispatch({ type, playlistId: playlist.id, ...fields }, message)
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopyError('')
      announce('Invitation link copied.')
    } catch {
      linkInput.current?.select()
      setCopyError('Copy the selected link to share it.')
    }
  }
  return <Dialog title="Manage collaborators" onClose={onClose} wide>
    <p className="metadata dialog-description">{label(playlist)}</p>
    {!playlist.collaborative ? <div className="form-stack">
      <p>Give invited listeners access to add, remove, and reorder tracks. Enabling collaboration makes this playlist private.</p>
      <footer className="dialog-actions"><button className="button primary" type="button"
        onClick={() => act('enableCollaboration', {}, 'Collaboration enabled.')}>Enable collaboration</button></footer>
    </div> : <>
      <section className="collaboration-section">
        <h3>Collaborators</h3>
        {currentMembers.length ? <ul className="management-list">
          {currentMembers.map((member) => {
            const name = label(lookup(state.users, member.userId), 'Unknown listener')
            return <li key={member.id}><span><PersonLink id={member.userId} /><small>Editor</small></span>
              {member.userId !== accountId(state) && <button className="button small" type="button" aria-label={`Remove collaborator ${name}`}
                onClick={() => act('removeMember', { memberId: member.id }, `Removed ${name}.`)}>Remove</button>}
            </li>
          })}
        </ul> : <p className="metadata">No editors have joined yet.</p>}
      </section>
      <section className="collaboration-section">
        <h3>Invite collaborators</h3>
        <form className="invite-form" onSubmit={(event) => {
          event.preventDefault()
          if (act('createInvite', { recipientId }, 'Invitation link created.')) {
            setActiveInvite(null)
            setCopyError('')
          }
        }}>
          <label>Who can use the link?<select value={recipientId} onChange={(event) => setRecipient(event.target.value)}>
            <option value="">Anyone with the link</option>
            {eligible.map((user) => <option key={user.id} value={user.id}>{label(user)}</option>)}
          </select></label>
          <button className="button primary" type="submit">Generate invite link</button>
        </form>
        {selected && <>
          <div className="invite-form copy-line">
            <label>Invitation link <input ref={linkInput} readOnly value={inviteLink} onFocus={(event) => event.target.select()} /></label>
            <button className="button" type="button" onClick={copyLink}>Copy link</button>
          </div>
          {copyError && <p className="metadata">{copyError}</p>}
        </>}
      </section>
      <section className="collaboration-section">
        <h3>Pending invitations</h3>
        {invites.length ? <ul className="management-list">
          {invites.map((invite, index) => {
            const name = invite.recipientId ? label(lookup(state.users, invite.recipientId), 'Unknown listener') : 'Anyone with the link'
            const deadline = new Date(invite.expiresAt)
            const timing = Number.isNaN(deadline.getTime()) || deadline <= new Date() ? 'Expired' : `Expires ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
            return <li key={invite.id}>
              <span><strong>{name}</strong><small>{timing}</small></span>
              {invite.id !== selected?.id && <button className="text-button" type="button" aria-label={`Show invitation link ${index + 1}`}
                onClick={() => { setActiveInvite(invite.id); setCopyError('') }}>Show link</button>}
              <button className="button small danger-text" type="button" aria-label={`Revoke invitation ${index + 1} for ${name}`}
                onClick={() => { act('revokeInvite', { inviteId: invite.id }, 'Invitation revoked.'); setCopyError('') }}>Revoke</button>
            </li>
          })}
        </ul> : <p className="metadata">No pending invitations.</p>}
      </section>
      <section className="collaboration-section">
        {confirmDisable ? <>
          <p>Editors will lose access and pending invitations will be revoked.</p>
          <footer className="dialog-actions">
            <button className="button" type="button" onClick={() => setConfirmDisable(false)}>Cancel</button>
            <button className="button danger" type="button" onClick={() => {
              if (act('disableCollaboration', {}, 'Collaboration turned off.')) setConfirmDisable(false)
            }}>Confirm turn off</button>
          </footer>
        </> : <button className="button danger-text" type="button" onClick={() => setConfirmDisable(true)}>Turn off collaboration</button>}
      </section>
    </>}
  </Dialog>
}

export function Playlist() {
  const { id } = useParams()
  const { state, dispatch } = useAccount()
  const [dialog, setDialog] = useState(null)
  const navigate = useSiteNavigate()
  const playlist = lookup(state.playlists, id)
  const dismiss = () => setDialog(null)
  if (!canRead(state, playlist)) return <Empty title="Playlist unavailable">
    <p>This playlist may be private, deleted, or moved.</p><SiteLink className="button" to="/library">Return to Your Library</SiteLink>
  </Empty>
  const owner = isOwner(state, playlist)
  const editable = canEdit(state, playlist)
  const editors = playlist.collaborative ? members(state, playlist).filter((member) => member.userId !== playlist.ownerId) : []
  const number = orderedItems(state, id).length
  return <>
    <BackLink />
    <DetailHero type={playlist.collaborative ? 'Collaborative playlist' : 'Playlist'} record={playlist} metadata={<>
      <PersonLink id={playlist.ownerId} /> · {number} {number === 1 ? 'track' : 'tracks'} · {playlist.visibility === 'public' ? 'Public' : 'Private'}
    </>}>
      <div className="action-row">
        {editable && <button className="button primary" type="button" onClick={() => setDialog('tracks')}><Icon name="plus" />Add tracks</button>}
        {canSavePlaylist(state, playlist) && <SaveButton type="playlist" record={playlist} />}
        {owner && <>
          <button className="button" type="button" onClick={() => setDialog('edit')}>Edit details</button>
          <button className="button" type="button" onClick={() => setDialog('collaborators')}><Icon name="people" size={17} />Manage collaborators</button>
          <button className="button danger-text" type="button" onClick={() => setDialog('delete')}>Delete playlist</button>
        </>}
      </div>
    </DetailHero>
    {playlist.collaborative && <section className="collaborator-strip" aria-label="Playlist collaborators">
      <Icon name="people" /><strong>Collaborators</strong>
      {editors.length ? <ul>{editors.map((member) => <li key={member.id}><PersonLink id={member.userId} /></li>)}</ul>
        : <span className="metadata">No editors yet</span>}
    </section>}
    <section className="page-section">
      <h2>Tracks</h2>
      {number ? <TrackList playlist={playlist} editable={editable} /> : <Empty title="This playlist is empty">
        {editable && <button className="button" type="button" onClick={() => setDialog('tracks')}><Icon name="plus" />Add tracks</button>}
      </Empty>}
    </section>
    {dialog === 'edit' && owner && <PlaylistForm playlist={playlist} onClose={dismiss} />}
    {dialog === 'tracks' && editable && <AddTracks playlist={playlist} onClose={dismiss} />}
    {dialog === 'collaborators' && owner && <Collaborators playlist={playlist} onClose={dismiss} />}
    {dialog === 'delete' && owner && <Dialog title={`Delete ${label(playlist)}?`} onClose={dismiss}>
      <p className="dialog-description">This will remove the playlist from the library and close collaborator access.</p>
      <footer className="dialog-actions"><button className="button" type="button" onClick={dismiss}>Cancel</button>
        <button className="button danger" type="button" onClick={() => {
          if (dispatch({ type: 'deletePlaylist', playlistId: id }, 'Playlist deleted.')) navigate('/library')
        }}>Delete playlist</button></footer>
    </Dialog>}
  </>
}

const inviteMessages = {
  missing: 'This invitation could not be found.',
  unavailable: 'This playlist is no longer accepting collaborators.',
  revoked: 'The playlist owner revoked this invitation.',
  expired: 'This invitation has expired. Ask the owner for a new link.',
  used: 'This invitation has already been used.',
  restricted: 'This invitation was meant for another listener.',
  member: 'You already have access to this playlist.',
}
export function Invite() {
  const { token } = useParams()
  const { state, dispatch } = useAccount()
  const navigate = useSiteNavigate()
  const invite = state.playlistInvites.find((entry) => entry.token === token)
  const status = inviteStatus(state, invite)
  const playlist = lookup(state.playlists, invite?.playlistId)
  const canShow = playlist && status !== 'restricted' && (!invite.recipientId || invite.recipientId === accountId(state))
  return <>
    <BackLink />
    <section className="invite-page">
      {canShow && <Art record={playlist} loading="eager" />}
      <div>
        <p className="eyebrow">Playlist invitation</p>
        <h1>{canShow ? label(playlist) : 'Join a playlist'}</h1>
        {status === 'joinable' ? <>
          <p><PersonLink id={invite.invitedBy} /> invited you to contribute to this playlist.</p>
          <button className="button primary" type="button" onClick={() => {
            if (dispatch({ type: 'joinPlaylist', playlistId: playlist.id, inviteId: invite.id }, `You joined ${label(playlist)}.`)) {
              navigate(route('playlist', playlist.id))
            }
          }}>Join playlist <Icon name="arrow" size={17} /></button>
        </> : <>
          <p className={status === 'expired' ? 'warning' : 'metadata'}>{inviteMessages[status]}</p>
          <SiteLink className="button" to={canRead(state, playlist) ? route('playlist', playlist.id) : '/library'}>
            {canRead(state, playlist) ? 'Open playlist' : 'Return to Your Library'}
          </SiteLink>
        </>}
      </div>
    </section>
  </>
}


