import { byId, canView, channelName, member, members, userName } from '../data/selectors.js'
import { addMembers, createChannel, isLastChannelAdmin, joinChannel, makeChannelAdmin, removeMember, setArchived, startConversation, updateChannel } from '../data/channelActions.js'
import { makeId } from '../data/records.js'
import { BrowseChannels, ChannelForm, Confirm, MemberList, PeoplePicker } from './Channels.jsx'
import { Dialog } from './UI.jsx'

export function ChannelDialogs({ dialog, state, team, close, show, change, openChannel, goHome, notify }) {
  if (!team) return null
  const kind = dialog.kind
  const channel = byId(state.channels, dialog.channelId)
  const label = channelName(state, channel)
  const available = channel && canView(state, channel)

  if (kind === 'create') return <ChannelForm kind={kind} close={close} apply={values => {
    const id = makeId('ch')
    if (!change(createChannel, team.id, values, id)) return
    openChannel({ id, type: values.type, name: values.name.trim() }, { markRead: false })
    show({ kind: 'add', channelId: id })
    notify('Created ' + values.displayName.trim())
  }} />

  if (kind === 'browse' || kind === 'find') return <Dialog title={kind === 'find' ? 'Find channels' : 'Browse Channels'} close={close} wide={kind === 'browse'}>
    <BrowseChannels state={state} team={team} compact={kind === 'find'} inDialog onOpen={item => { close(); openChannel(item) }}
      onCreate={() => show({ kind: 'create' })} onJoin={item => {
        if (!change(joinChannel, item.id)) return
        close()
        openChannel(item, { markRead: false })
        notify('Joined ' + channelName(state, item))
      }} />
  </Dialog>

  if (kind === 'people') return <PeoplePicker state={state} team={team} close={close} initial={channel
    ? members(state, channel.id).filter(row => row.userId !== state.currentUserId).map(row => row.userId) : []} apply={userIds => {
    let target
    change((current, time) => {
      const result = startConversation(current, team.id, userIds, time, makeId('ch'))
      target = result.channel
      return result.next
    })
    if (target) {
      close()
      openChannel(target, { markRead: false })
    }
  }} />

  if (!available) return null

  if (['rename', 'header', 'purpose'].includes(kind)) return <ChannelForm key={kind} channel={channel} kind={kind} close={close} apply={values => {
    const changed = change(updateChannel, channel.id, values)
    if (changed) {
      if (kind === 'rename') openChannel({ ...channel, name: values.name.trim() }, { replace: true, markRead: false })
      notify('Channel updated')
    }
    close()
  }} />

  if (kind === 'members') return <MemberList state={state} channel={channel} close={close}
    add={() => show({ kind: 'add', channelId: channel.id })}
    makeAdmin={userId => show({ kind: 'makeAdmin', channelId: channel.id, userId })}
    remove={userId => show({ kind: 'remove', channelId: channel.id, userId })} />

  if (kind === 'makeAdmin') {
    const person = userName(byId(state.users, dialog.userId))
    const showMembers = () => show({ kind: 'members', channelId: channel.id })
    return <Confirm key={kind} title="Make channel admin" description={`Make ${person} a channel admin for ${label}?`}
      submit="Make channel admin" close={showMembers} apply={() => {
        if (!change(makeChannelAdmin, channel.id, dialog.userId)) throw new Error('This member could not be made a channel admin.')
        notify(person + ' is now a channel admin')
        showMembers()
      }} />
  }

  if (kind === 'add') return <PeoplePicker key={channel.id} state={state} team={team} channel={channel} close={close} apply={userIds => {
    if (change(addMembers, channel.id, userIds)) notify('Channel members added')
    close()
  }} />

  if (kind === 'leave' || kind === 'remove') {
    const leaving = kind === 'leave'
    const title = leaving ? 'Leave Channel' : 'Remove member'
    const handoff = leaving && isLastChannelAdmin(state, channel.id, member(state, channel.id))
    const description = handoff ? 'Make another member a channel admin before leaving ' + label + '.' :
      leaving ? 'Leave ' + label + '?' : 'Remove this member from ' + label + '?'
    return <Confirm title={title} description={description}
      submit={leaving ? 'Leave Channel' : 'Remove'} close={close} danger disabled={handoff} apply={() => {
        if (change(removeMember, channel.id, leaving ? state.currentUserId : dialog.userId)) {
          if (leaving) goHome()
          notify(leaving ? 'Left ' + label : 'Member removed')
        }
        close()
      }}>
      {handoff && <button type="button" className="secondary" onClick={() => show({ kind: 'members', channelId: channel.id })}>View channel members</button>}
    </Confirm>
  }

  if (kind === 'archive' || kind === 'restore') {
    const archived = kind === 'archive'
    const title = archived ? 'Archive Channel' : 'Unarchive Channel'
    return <Confirm title={title} description={archived ? 'Archive ' + label + '? Its message history will remain available to members.' : 'Restore ' + label + ' to active channels?'}
      submit={title} close={close} danger={archived} apply={() => {
        if (change(setArchived, channel.id, archived)) notify(archived ? 'Channel archived' : 'Channel restored')
        close()
      }} />
  }
  return null
}
