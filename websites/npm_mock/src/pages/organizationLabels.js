export const memberName = (member) => member.displayName || member.username || 'Unnamed member'
export const validName = (name) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
