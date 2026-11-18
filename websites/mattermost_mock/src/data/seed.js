import { builtins, defaultCategory } from './channelActions.js'
import { newChannel, newMember, newPost, newThreadMember, preferenceDefaults, stamp } from './records.js'
import { byTime, mentions } from './selectors.js'
import { people, topics, townMessages, engineeringMessages, releaseMessages, notes, releaseReplies, replyNotes } from './seedContent.js'
import { fixtureData } from './seedFixtures.js'

const time = (day, hour = 8, minute = 0) => '2026-11-' + String(day).padStart(2, '0') + 'T' +
  String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00.000Z'
const base = time(1)
const teamId = 'team-acme'
const alex = 'usr-alex-morgan'
const sarah = 'usr-sarah-chen'
const jordan = 'usr-jordan-lee'

function makeUsers() {
  return people.map(([name, position], index) => {
    const [firstName, lastName] = name.split(' ')
    const username = name.toLowerCase().replace(' ', '.')
    const status = index === people.length - 1 ? 'inactive' : 'active'
    const presence = status === 'inactive' ? 'offline' : ['online', 'online', 'away', 'online', 'online', 'dnd', 'offline'][index % 7]
    return { id: 'usr-' + username.replace('.', '-'), username, firstName, lastName, email: username + '@acme.example', position,
      status, presence, isGuest: false, ...stamp(base) }
  })
}

function makeChannels(users) {
  const joined = index => index < 19 || [36, 37, 38, 39].includes(index)
  const channelMembers = []
  const subjects = {}
  const channels = topics.map(([name, displayName, purpose, subject, type = 'O', archived], index) => {
    const id = 'ch-' + name
    const creator = joined(index) ? users[0] : users[(index % 23) + 1]
    const channel = newChannel({ id, teamId, name, displayName, purpose, type, createdBy: creator.id, time: base })
    subjects[id] = subject
    if (index === 0) Object.assign(channel, { header: 'Team-wide updates, questions, and announcements', isDefault: true })
    if (index === 2) channel.header = 'Rollout coordination, incident follow-ups, and engineering reviews'
    if (index === 3) channel.header = 'November release sign-off · 10:30 readiness sync'
    if (name === 'reference') channel.readOnly = true
    if (archived) Object.assign(channel, { status: 'archived', archivedBy: creator.id, archivedAt: time(12), updatedAt: time(12) })
    const group = index === 0 ? users : [...new Set([creator, users[1], users[2],
      ...Array.from({ length: 7 }, (_, offset) => users[(index * 3 + offset) % 30 + 1])])].slice(0, 7)
    group.forEach(user => channelMembers.push({
      ...newMember({ id: 'cm-' + id + '-' + user.id, channelId: id, userId: user.id, actor: creator.id, time: base,
        role: user.id === creator.id || user.id === sarah ? 'channel_admin' : 'channel_user' }),
      isFavorite: user.id === alex && [2, 3, 11].includes(index), muted: user.id === alex && index === 1,
    }))
    return channel
  })
  const groups = Array.from({ length: 4 }, (_, index) => [users[0], ...users.slice(12 + index * 3, 15 + index * 3)])
  const conversations = [...users.slice(1, 13).map(user => [users[0], user]), ...groups]
  conversations.forEach((participants, index) => {
    const group = participants.length > 2
    const id = 'ch-' + (group ? 'group-' + (index - 11) : 'dm-' + participants[1].username.replace('.', '-'))
    const displayName = participants.slice(1).map(user => user.firstName + ' ' + user.lastName).join(', ')
    channels.push(newChannel({ id, teamId, name: id, displayName, type: group ? 'G' : 'D', createdBy: alex, time: base }))
    participants.forEach(user => channelMembers.push(newMember({ id: 'cm-' + id + '-' + user.id, channelId: id, userId: user.id, actor: alex, time: base })))
    subjects[id] = group ? ['the QA readout', 'the support handoff', 'the customer notes', 'the rollout schedule'][index - 12]
      : ['the release checklist', 'the regression results', 'the engineering review', 'the support update',
        'the design handoff', 'the incident follow-up', 'the launch brief', 'the metrics report',
        'the review findings', 'the release notes', 'the customer demo', 'the review calendar'][index]
  })
  return { channels, channelMembers, subjects }
}

function makeMessages(channels, channelMembers, subjects, identity) {
  const posts = []
  const rootsByChannel = new Map()
  const release = 'ch-release-2026-11'
  const engineering = 'ch-engineering'
  const town = 'ch-town-square'
  channels.forEach((channel, channelIndex) => {
    const count = channelIndex === 0 ? 20 : channelIndex <= 11 ? 8 : 3
    const authors = channelMembers.filter(row => row.channelId === channel.id).map(row => row.userId)
    const canned = { [town]: townMessages, [engineering]: engineeringMessages, [release]: releaseMessages }[channel.id]
    const rows = Array.from({ length: count }, (_, index) => {
      let id = 'post-' + channel.name + '-' + String(index + 1).padStart(3, '0')
      let userId = authors[(channelIndex + index * 3 + Math.floor(index / 3)) % authors.length]
      let day = channelIndex === 0 ? Math.min(17, index + 1) : channel.status === 'archived' ? 3 + index * 2 : Math.min(17, 5 + channelIndex % 7 + index)
      let hour = 9 + index % 5
      if (channel.id === release && index === 0) { id = 'post-release-plan'; userId = sarah; day = 15; hour = 9 }
      if (channel.id === engineering && index === 0) { id = 'post-engineering-runbook'; userId = alex; day = 14; hour = 10 }
      const message = canned?.[index] ?? notes[(channelIndex + index * 5) % notes.length](subjects[channel.id])
      const mentionedUserIds = mentions({ ...identity, currentUserId: userId, channelMembers }, channel, message)
      return newPost({ id, channelId: channel.id, userId, message, mentionedUserIds, time: time(day, hour, (index * 11 + channelIndex) % 60) })
    })
    rootsByChannel.set(channel.id, rows)
    posts.push(...rows)
  })

  const primary = posts.find(post => post.id === 'post-release-plan')
  const selected = [primary, ...channels.slice(0, 13).flatMap(channel =>
    rootsByChannel.get(channel.id).filter(root => root !== primary && root.id !== 'post-engineering-runbook').slice(0, 3))]
  const threadRoots = selected.slice(0, 40)
  const deletedRoot = threadRoots.at(-1)
  Object.assign(deletedRoot, { deletedAt: time(17, 16), deletedBy: deletedRoot.userId, updatedAt: time(17, 16) })
  const repliesByRoot = new Map()
  threadRoots.forEach((root, index) => {
    const isRelease = root === primary
    const authors = channelMembers.filter(row => row.channelId === root.channelId).map(row => row.userId)
    const count = isRelease ? 12 : index <= 30 ? 3 : 2
    const rows = Array.from({ length: count }, (_, offset) => {
      const userId = isRelease && offset === 0 ? jordan : authors[(index + offset * 2 + 1) % authors.length]
      const message = isRelease ? releaseReplies[offset] : replyNotes[(index * 3 + offset) % replyNotes.length]
      const createdAt = isRelease ? time(15 + Math.floor(offset / 4), 13, offset * 4 % 60) :
        time(Math.min(17, Number(root.createdAt.slice(8, 10)) + 1), 15, offset * 7)
      const id = isRelease ? 'post-release-reply-' + String(offset + 1).padStart(2, '0') : root.id + '-reply-' + (offset + 1)
      return newPost({ id, channelId: root.channelId, rootId: root.id, userId, message, time: createdAt })
    })
    if (index === 7) Object.assign(rows.at(-1), { deletedAt: time(17, 15), deletedBy: rows.at(-1).userId, updatedAt: time(17, 15) })
    repliesByRoot.set(root.id, rows)
    posts.push(...rows)
  })
  return { posts, rootsByChannel, threadRoots, repliesByRoot }
}

function makeThreads({ rootsByChannel, threadRoots, repliesByRoot }, channelMembers) {
  const extra = ['ch-engineering', 'ch-release-2026-11', 'ch-support', 'ch-security-review']
    .map(id => rootsByChannel.get(id).at(-1))
  const roots = [...threadRoots, ...extra]
  const threads = roots.map(root => {
    const list = (repliesByRoot.get(root.id) ?? []).filter(post => !post.deletedAt)
    const updatedAt = list.at(-1)?.createdAt ?? root.createdAt
    return { id: root.id, rootPostId: root.id, channelId: root.channelId, replyCount: list.length,
      lastReplyAt: list.at(-1)?.createdAt ?? null,
      participantIds: [...new Set([!root.deletedAt && root.userId, ...list.map(post => post.userId)].filter(Boolean))],
      createdAt: list[0]?.createdAt ?? root.createdAt, updatedAt }
  })
  const threadMemberships = []
  roots.forEach((root, index) => {
    const authors = channelMembers.filter(row => row.channelId === root.channelId && row.userId !== alex).map(row => row.userId)
    const list = repliesByRoot.get(root.id)?.filter(row => !row.deletedAt) ?? []
    const thread = threads[index]
    const others = index < 28 ? 2 : 1
    const follows = [...Array.from({ length: others }, (_, offset) => authors[(index + offset) % authors.length]),
      ...(index < 15 || index >= 41 ? [alex] : [])]
    follows.forEach(userId => {
      const read = userId !== alex || index % 3 === 0 && index !== 0
      threadMemberships.push({ ...newThreadMember({ id: 'thm-' + root.id + '-' + userId, userId, threadId: root.id, time: thread.createdAt }),
        following: true, followedAt: thread.createdAt, lastReadAt: read ? thread.updatedAt : null,
        lastReadPostId: read ? list.at(-1)?.id ?? root.id : null, updatedAt: thread.updatedAt })
    })
  })
  return { threads, threadMemberships }
}

function makePinsAndSaves(channels, { posts, rootsByChannel, repliesByRoot }) {
  const pinned = channels.slice(0, 14).flatMap((channel, index) => {
    const roots = rootsByChannel.get(channel.id).filter(post => !post.deletedAt && post.id !== 'post-engineering-runbook')
    return index === 3 ? [roots[0], repliesByRoot.get(roots[0].id)[2]] : roots.slice(0, 2)
  })
  const removed = channels.slice(3, 7).map(channel => rootsByChannel.get(channel.id).at(-1))
  const pins = [...pinned, ...removed].map((post, index) => {
    const status = index < pinned.length ? 'active' : 'removed'
    const timePinned = post.createdAt > time(15, 9) ? post.createdAt : time(15, 9)
    const unpinnedAt = status === 'removed' ? time(17, 17) : null
    if (status === 'active') post.isPinned = true
    return { id: post.id === 'post-release-plan' ? 'pin-release-plan' : 'pin-' + post.id, postId: post.id, channelId: post.channelId,
      status, pinnedBy: sarah, pinnedAt: timePinned, unpinnedAt, unpinnedBy: unpinnedAt ? alex : null,
      createdAt: timePinned, updatedAt: unpinnedAt ?? timePinned }
  })
  const saved = posts.filter(post => !post.deletedAt && (post.channelId === 'ch-town-square' || post.channelId === 'ch-engineering') &&
    !post.rootId).slice(0, 27)
  const savedPosts = saved.map((post, index) => ({ id: 'save-' + post.id, userId: alex, postId: post.id,
    status: index < 24 ? 'active' : 'removed', ...stamp(time(17, 15, index)) }))
  return { pins, savedPosts }
}

function fixtureRecord(id, fixture, channelId, userId, createdAt, postId = null, status = 'staged') {
  const [name, mimeType, size] = fixture
  return { id, channelId, postId, uploadedBy: userId, name, storedName: name, mimeType, size, extension: name.split('.').at(-1),
    url: '/fixtures/' + name, status, ...stamp(createdAt) }
}

function makeFiles({ rootsByChannel, repliesByRoot }) {
  const release = rootsByChannel.get('ch-release-2026-11')
  const engineering = rootsByChannel.get('ch-engineering')
  const releaseReplies = repliesByRoot.get('post-release-plan')
  const attach = [
    [release[0], 0], [engineering[0], 1], [engineering[5], 9], [release[6], 3], [engineering[2], 4], [releaseReplies[0], 5],
    [releaseReplies[10], 2], [rootsByChannel.get('ch-it-operations')[1], 6], [rootsByChannel.get('ch-town-square')[8], 7],
    [release[3], 5], [engineering[3], 8],
  ]
  const otherRoots = ['ch-customer-success', 'ch-incident-response', 'ch-product', 'ch-platform', 'ch-support', 'ch-design-systems',
    'ch-security-review', 'ch-reference', 'ch-qa'].map(id => rootsByChannel.get(id)[1]).concat(release[1], engineering[7])
  otherRoots.forEach((root, index) => attach.push([root, index % fixtureData.length]))
  const otherReplies = [...repliesByRoot.values()].slice(1, 7).map(rows => rows[0])
  otherReplies.forEach((post, index) => attach.push([post, (index + 3) % fixtureData.length]))
  const roots = attach.map(([post]) => post).filter(post => !post.rootId)
  for (let index = 0; index < 8; index++) attach.push([roots[index], (attach.find(([post]) => post === roots[index])[1] + 2) % fixtureData.length])
  const files = attach.map(([post, fixture], index) => {
    const id = index === 0 ? 'file-release-checklist' : 'file-posted-' + String(index + 1).padStart(2, '0')
    post.fileIds.push(id)
    return fixtureRecord(id, fixtureData[fixture], post.channelId, post.userId, post.createdAt, post.id, 'posted')
  })
  const staged = [
    fixtureRecord('file-staged-platform', fixtureData[9], 'ch-platform', alex, time(17, 16, 11)),
    fixtureRecord('file-staged-release', fixtureData[7], 'ch-release-2026-11', alex, time(17, 16, 22)),
    fixtureRecord('file-cancelled-incident', fixtureData[4], 'ch-incident-response', alex, time(16), null, 'cancelled'),
  ]
  return [...files, ...staged]
}

export function createInitialData() {
  const users = makeUsers()
  const teams = [{ id: teamId, name: 'acme', displayName: 'Acme', description: 'Product and engineering collaboration', ...stamp(base) }]
  const teamMembers = users.map((user, index) => ({ id: 'team-member-' + user.id, teamId, userId: user.id,
    role: index === 0 || index === 12 ? 'team_admin' : 'team_user', status: 'active', ...stamp(base) }))
  const identity = { currentUserId: alex, currentTeamId: teamId, users, teams, teamMembers }
  const { channels, channelMembers, subjects } = makeChannels(users)
  const messages = makeMessages(channels, channelMembers, subjects, identity)
  const { posts } = messages
  const { threads, threadMemberships } = makeThreads(messages, channelMembers)
  const savesAndPins = makePinsAndSaves(channels, messages)
  const files = makeFiles(messages)
  channelMembers.forEach(row => {
    if (row.userId !== alex) return
    const local = posts.filter(post => post.channelId === row.channelId && !post.deletedAt).sort(byTime)
    const unread = ['ch-town-square', 'ch-engineering', 'ch-release-2026-11', 'ch-customer-success', 'ch-dm-sarah-chen'].includes(row.channelId)
    const cursor = local.at(unread && local.length >= 3 ? -3 : -1)
    row.lastReadPostId = cursor?.id ?? null
    row.lastViewedAt = cursor?.createdAt ?? null
    row.updatedAt = row.lastViewedAt ?? base
  })
  const own = new Map(channelMembers.filter(row => row.userId === alex).map(row => [row.channelId, row]))
  const sidebarCategories = Object.entries(builtins).map(([type, [name, order]]) => ({
    id: 'cat-acme-alex-' + type, userId: alex, teamId, name, type, order, collapsed: false, ...stamp(base),
    channelIds: channels.filter(channel => own.has(channel.id) &&
      (own.get(channel.id).isFavorite ? type === 'favorites' : type === defaultCategory(channel))).map(channel => channel.id),
  }))
  const drafts = [
    ['release-thread', 'ch-release-2026-11', 'post-release-plan', 'I’ll double-check the fallback contact before sign-off.', ['file-staged-release']],
    ['platform-channel', 'ch-platform', null, 'I’ve attached the updated rollout topology.', ['file-staged-platform']],
    ['support-channel', 'ch-support', null, 'Can we confirm Thursday’s coverage?', []],
  ].map(([name, channelId, rootId, message, fileIds]) => ({ id: 'draft-alex-' + name, userId: alex, channelId,
    rootId, message, fileIds, ...stamp(time(17, 17)) }))
  const emojis = ['thumbsup', 'eyes', 'white_check_mark', 'tada', 'heart', 'clap', 'rocket', 'thinking']
  const reactionPosts = posts.filter(post => !post.deletedAt && own.has(post.channelId)).slice(0, 45)
  const reactions = reactionPosts.flatMap((post, index) => [alex, sarah].map((userId, offset) => ({
    id: 'reaction-' + post.id + '-' + userId, postId: post.id, userId, emojiName: emojis[(index + offset * 3) % emojis.length],
    status: index % 13 === 0 && offset ? 'removed' : 'active', ...stamp(time(17, 17, index)),
  })))
  const preferences = users.map(user => ({ id: user.id === alex ? 'pref-alex' : 'pref-' + user.id, userId: user.id,
    ...preferenceDefaults, presence: user.presence, ...stamp(base) }))
  return {
    schemaVersion: 1, ...identity, channels, channelMembers, posts, threads, threadMemberships, ...savesAndPins,
    files, drafts, reactions, sidebarCategories, preferences, activityLog: [],
  }
}
