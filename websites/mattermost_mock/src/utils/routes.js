import { withSid } from './dataManager.js'

const segment = value => encodeURIComponent(value)
export const teamPath = team => '/' + segment(team.name)
export const browsePath = team => teamPath(team) + '/channels'
export const threadsPath = team => teamPath(team) + '/threads'
export const channelPath = (team, channel) => ['D', 'G'].includes(channel.type)
  ? teamPath(team) + '/messages/' + segment(channel.id)
  : browsePath(team) + '/' + segment(channel.name)
export const postPath = (team, post) => teamPath(team) + '/pl/' + segment(post.id)
export { withSid as appPath }
