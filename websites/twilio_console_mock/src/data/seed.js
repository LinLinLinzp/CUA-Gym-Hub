const account = {
  id: 'AC00000000000000000000000000000001',
  name: 'Northline Dispatch',
  operator: { id: 'user-01', name: 'Morgan Ellis', email: 'morgan@northline.example' },
}
const locations = [
  ['US', 'Washington, DC', '202'], ['US', 'San Francisco, CA', '415'],
  ['CA', 'Toronto, ON', '647'], ['US', 'Seattle, WA', '206'],
  ['US', 'Boston, MA', '617'], ['CA', 'Vancouver, BC', '604'],
]
const numberNames = [
  'Dispatch East', 'Pickup Desk', 'Toronto Routing', 'Seattle Operations', 'Boston Support', 'Vancouver Hub',
  'Capitol Returns', 'Bay Service Desk', 'Ontario Bookings', 'Pacific Alerts', 'Cambridge Events', 'Coastal Desk',
  'Warehouse East', 'Bay Courier', 'Toronto Evening', 'Seattle Returns', 'Boston Scheduling', 'West Coast Pickup',
  'Regional Hotline', 'San Francisco Relay', 'Toronto Helpdesk', 'Seattle After Hours', 'Boston Returns', 'Vancouver Reminders',
  'Dispatch Overflow', 'Bay Appointments', 'Ontario Alerts', 'Seattle Dispatch', 'Boston Verification', 'Vancouver Dispatch',
  'Regional Support', 'Bay Operations', 'Toronto Deliveries', 'Seattle Field Team', 'Boston Field Team', 'Vancouver Bookings',
]
const serviceNames = [
  'Delivery Updates', 'Appointment Reminders', 'Support Escalations', 'Pickup Notifications', 'Route Changes', 'Access Codes',
  'Returns Desk', 'Courier Coordination', 'Waiting List', 'Field Team Alerts', 'Event Check-In', 'Account Verification',
  'Order Confirmations', 'Evening Dispatch', 'Schedule Changes', 'Feedback Requests', 'Session Recovery', 'Weekend Coverage',
  'Renewal Reminders', 'Welcome Messages', 'Customer Care West', 'Branch Announcements', 'Shipment Exceptions', 'Inventory Alerts',
]
const cases = ['notifications', 'customer_care', 'verification', 'marketing']
const sid = (prefix, index) => prefix + (index + 1).toString(16).padStart(32, '0')
const timestamp = (day, hour = 14, minute = 0) => new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString()

function line(index, firstSubscriber) {
  const [country, city, area] = locations[index % locations.length]
  const tollFree = index % 9 === 0
  const capabilities = index % 7 === 6 ? ['voice'] : index % 5 === 4 ? ['sms'] : ['voice', 'sms', 'mms']
  return {
    phoneNumber: '+1' + (tollFree ? '833' : area) + '555' + String(firstSubscriber + index).padStart(4, '0'),
    country, locality: tollFree ? 'North America' : city, type: tollFree ? 'toll_free' : 'local',
    capabilities, monthlyPrice: tollFree ? 2.15 : country === 'CA' ? 1.35 : 1.15, currency: 'USD',
  }
}

export function createInitialData() {
  const actorId = account.operator.id
  const phoneNumbers = numberNames.map((friendlyName, index) => ({
    ...line(index, 100), id: sid('PN', index), inventoryId: null, friendlyName, status: 'active',
    voiceUrl: index % 3 === 0 ? 'https://hooks.northline.example/inbound/voice' : '',
    voiceMethod: 'POST', smsUrl: '', smsMethod: 'POST', actorId,
    createdAt: timestamp(1 + index % 5), updatedAt: timestamp(4 + index % 6), updatedBy: actorId,
  }))
  const availableNumbers = Array.from({ length: 48 }, (_, index) => ({
    ...line(index, 140), id: 'inventory-' + String(index + 1).padStart(3, '0'), status: 'available',
  }))
  const smsNumbers = phoneNumbers.filter((number) => number.capabilities.includes('sms'))
  const messagingServices = serviceNames.map((friendlyName, index) => ({
    id: sid('MG', index), friendlyName, useCase: cases[index % cases.length],
    senderNumberIds: index === 0 ? [smsNumbers[0].id, smsNumbers[16].id] : index < 16 ? [smsNumbers[index].id] : [],
    inboundMode: index % 4 === 2 ? 'webhook' : 'defer_to_sender',
    inboundUrl: index % 4 === 2 ? 'https://hooks.northline.example/sms/inbound' : '',
    statusCallbackUrl: index % 4 === 0 ? 'https://hooks.northline.example/sms/status' : '',
    actorId, createdAt: timestamp(2 + index % 4), updatedAt: timestamp(6 + index % 8), updatedBy: actorId,
  }))
  const samples = [
    'Your delivery is scheduled for 2–4 PM.', 'Pickup is ready at the north counter.',
    'Your driver is on the way.', 'Your appointment is confirmed for tomorrow.',
    'Your order was transferred to the local depot.', 'Reply here if you need to reschedule.',
    'Your verification code is 481920.',
  ]
  const replies = ['Thanks, I will be there.', 'Please leave it at the front desk.', 'Can I reschedule for Friday?']
  const outcomes = ['delivered', 'delivered', 'failed', 'sent', 'delivered', 'undelivered', 'queued', 'accepted']
  const messages = Array.from({ length: 84 }, (_, index) => {
    const inbound = index % 5 === 1
    const number = smsNumbers[index % smsNumbers.length]
    const service = index % 3 === 0 ? messagingServices.find((item) => item.senderNumberIds.includes(number.id)) : null
    const contact = '+161255501' + String(index).padStart(2, '0')
    const status = inbound ? 'received' : outcomes[index % outcomes.length]
    const createdAt = timestamp(index >= 65 && index < 76 ? 12 : 3 + Math.floor(index / 6), 12 + index % 8, index % 60)
    const errorCode = status === 'failed' ? 30007 : status === 'undelivered' ? 30005 : null
    const errorMessage = errorCode === 30007 ? 'Message filtered' : errorCode === 30005 ? 'Unknown destination handset' : null
    const first = status === 'accepted' ? 'accepted' : inbound ? 'received' : 'queued'
    const deliverySteps = [{ status: first, occurredAt: createdAt, detail: inbound ? 'Inbound message received' : 'Message accepted for processing' }]
    if (first !== status) deliverySteps.push({ status, occurredAt: new Date(Date.parse(createdAt) + 4500).toISOString(), detail: errorMessage || 'Delivery status updated' })
    return {
      id: sid('SM', index), direction: inbound ? 'inbound' : 'outbound',
      from: inbound ? contact : number.phoneNumber, to: inbound ? number.phoneNumber : contact,
      body: inbound ? replies[index % replies.length] : samples[index % samples.length],
      phoneNumberId: number.id, serviceId: service?.id ?? null, status, segments: 1, errorCode, errorMessage,
      deliverySteps, actorId: inbound ? 'system' : actorId, createdAt,
    }
  })
  return { account: { ...account, operator: { ...account.operator } }, phoneNumbers, availableNumbers, messagingServices, messages, logExports: [] }
}
