export const channels = [
  { type: 'Default', name: 'Website', statuses: ['Member', 'Converted'] },
  { type: 'Default', name: 'Content Syndication', statuses: ['Member', 'Engaged'] },
  { type: 'Event', name: 'Trade Show', statuses: ['Invited', 'Registered', 'No Show', 'Attended'] },
  { type: 'Event with Webinar', name: 'Webinar', statuses: ['Invited', 'Registered', 'No Show', 'Attended'] },
  { type: 'Engagement', name: 'Nurture', statuses: ['Member', 'Engaged'] },
  { type: 'Email', name: 'Email Send', statuses: ['Member', 'Sent', 'Opened', 'Clicked'] },
]

export const stages = ['Prospect', 'MQL', 'SQL', 'Customer']
export const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia', 'Singapore']
export const statusesFor = (program) => channels.find(channel => channel.name === program?.channel)?.statuses ?? []

