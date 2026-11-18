const stamp = '2026-10-15T16:00:00.000Z'
const actor = 'staff-001'
const meta = { createdAt: stamp, createdBy: actor, updatedAt: stamp, updatedBy: actor }
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const monthStart = day => day.slice(0, 8) + '01'

function shiftMonth(day, offset) {
  const date = new Date(monthStart(day))
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 10)
}

const propertyNames = [
  'Alder Court', 'Juniper Landing', 'Millstone Flats', 'Fern Hollow', 'Riverbend Commons', 'Cedar Row',
  'Hawthorne Place', 'Willow Gate', 'Maple Terrace', 'Northbank Lofts', 'Larkspur House', 'Oakridge Court',
  'Brookfield Place', 'Magnolia Row', 'Laurel Commons', 'Birchwood Court', 'Westhaven Flats', 'Wren Crossing',
  'Spruce Square', 'Pinecroft', 'Orchard View', 'Bridgewater Place', 'Dogwood Terrace', 'Evergreen Landing',
  'Cottonwood Grove', 'Mosswood House', 'Parkside Annex', 'Stonebridge Court',
]
const firstNames = ['Maya', 'Elliot', 'Tessa', 'Noah', 'Amara', 'Jules', 'Sofia', 'Isaac', 'Leah', 'Owen', 'Nina', 'Theo']
const lastNames = ['Rivera', 'Foster', 'Chen', 'Bennett', 'Patel', 'Hughes', 'Ortiz', 'Kim', 'Hayes', 'Brooks', 'Ali', 'Reed']
const services = [
  ['Lena Marsh', 'staff', 'General'], ['Sam Mercer', 'staff', 'Facilities'], ['Jordan Ellis', 'staff', 'Coordination'],
  ['Beacon Fixture Services', 'vendor', 'Plumbing'], ['Harborline Electric', 'vendor', 'Electrical'],
  ['Cascade Climate Works', 'vendor', 'HVAC'], ['Bridgeport Appliance Service', 'vendor', 'Appliance'],
  ['Fernway Locks', 'vendor', 'Locksmith'], ['Oak Current Maintenance', 'vendor', 'General'],
  ['Nora Bell', 'staff', 'Facilities'], ['Canyon Pipeworks', 'vendor', 'Plumbing'], ['Alder Electric Works', 'vendor', 'Electrical'],
]
const issues = [
  ['Kitchen tap leaking', 'plumbing', 'Water collects around the faucet base when the tap is running.'],
  ['Hallway lights flickering', 'electrical', 'Two fixtures flicker near the east stairwell.'],
  ['Heat pump blowing cool air', 'hvac', 'The thermostat calls for heat but the vents stay cool.'],
  ['Dishwasher will not drain', 'appliance', 'Water remains in the tub after the cycle ends.'],
  ['Entry latch sticks', 'general', 'The latch binds when the door closes. Check the strike plate.'],
  ['Water under vanity', 'plumbing', 'Water is pooling below the sink. Inspect the supply connections.'],
  ['Bedroom outlet has no power', 'electrical', 'Resident confirmed that other outlets in the room work.'],
]
const orderStages = [
  ['open', []],
  ['assigned', ['assigned']],
  ['scheduled', ['assigned', 'scheduled']],
  ['in_progress', ['assigned', 'scheduled', 'started']],
  ['completed', ['assigned', 'scheduled', 'started', 'completed']],
  ['canceled', ['canceled']],
]
const statusFor = { created: 'open', assigned: 'assigned', scheduled: 'scheduled', started: 'in_progress', completed: 'completed', canceled: 'canceled' }

export function createInitialData() {
  const account = { id: actor, name: 'Jordan Ellis', workspaceName: 'Cedarline Property Services', role: 'Property Manager' }
  const properties = propertyNames.map((name, index) => {
    const cityIndex = index % 3
    return {
      id: id('prop', index), name, address1: (104 + index * 19) + ' ' + name,
      city: ['Portland', 'Beaverton', 'Vancouver'][cityIndex],
      region: cityIndex === 2 ? 'WA' : 'OR', postalCode: ['97205', '97005', '98660'][cityIndex],
      type: ['multifamily', 'multifamily', 'single_family', 'multifamily', 'commercial'][index % 5],
      status: index >= 26 ? 'archived' : 'active',
      notes: index % 3 === 0 ? 'Service access is through the east entrance.' : '',
      ...meta,
    }
  })
  const units = properties.flatMap((property, index) => [0, 1, 2].map(offset => ({
    id: id('unit', index * 3 + offset), propertyId: property.id,
    label: ['101', '102', '203'][offset], beds: (index + offset) % 4, baths: [1, 1.5, 2][offset],
    marketRent: 1190 + index * 28 + offset * 185,
    rentReady: property.status === 'active' && (index + offset) % 4 !== 0, status: property.status, ...meta,
  })))
  const leases = Array.from({ length: 48 }, (_, index) => {
    const renewal = index >= 44
    const previous = index - 44
    const unitIndex = renewal ? previous : index
    const unit = units[unitIndex]
    const firstName = firstNames[unitIndex % firstNames.length]
    const lastName = lastNames[(unitIndex + Math.floor(unitIndex / 12)) % lastNames.length]
    const term = index < 4 ? ['2025-12-01', '2026-11-30'] : [
      ['2026-04-01', '2027-03-31'], ['2026-11-01', '2027-10-31'], ['2027-01-01', '2027-12-31'],
      ['2025-10-01', '2026-09-30'], ['2026-02-01', '2027-01-31'], ['2026-05-01', '2027-04-30'],
      ['2026-01-01', '2026-12-10'], ['2026-07-01', '2027-06-30'],
    ][index % 8]
    const ended = !renewal && index >= 8 && index % 11 === 0 && term[0] <= '2026-09-15' && term[1] >= '2026-09-15'
    return {
      id: id('lease', index), propertyId: unit.propertyId, unitId: unit.id, residentName: firstName + ' ' + lastName,
      residentEmail: (firstName + '.' + lastName).toLowerCase() + '@example.com',
      startDate: renewal ? '2026-12-01' : term[0], endDate: renewal ? '2027-11-30' : term[1],
      monthlyRent: unit.marketRent + (renewal ? 65 : 0), deposit: 750 + (index % 5) * 75,
      status: ended ? 'ended' : 'recorded',
      ...(ended ? { endedOn: '2026-09-15', endReason: 'Resident relocated' } : {}),
      ...(renewal ? { renewedFromLeaseId: id('lease', previous) } : {}), ...meta,
    }
  })
  const assignees = services.map(([name, type, trade], index) => ({ id: id('asgn', index), name, type, trade }))
  const workOrders = Array.from({ length: 42 }, (_, index) => {
    const property = properties[index % 26]
    const unit = units[(index % 26) * 3 + (index % 3)]
    const [title, category, description] = issues[index % issues.length]
    const [status, actions] = orderStages[index % orderStages.length]
    const assigneeId = assignees[index % assignees.length].id
    const day = (offset) => '2026-11-' + String(1 + (index % 16) + offset).padStart(2, '0')
    const timestamp = (offset) => day(offset) + 'T16:00:00.000Z'
    const note = 'Tested the repair and confirmed normal operation.'
    const reason = 'Duplicate resident request'
    let fromStatus
    const history = ['created', ...actions].map((action, stageIndex) => {
      const toStatus = statusFor[action]
      const event = {
        id: id('event', index * 6 + stageIndex), action, ...(fromStatus ? { fromStatus } : {}), toStatus,
        createdAt: timestamp(stageIndex), createdBy: actor,
        ...(action === 'assigned' ? { assigneeId } : {}),
        ...(action === 'scheduled' ? { scheduledFor: day(3) } : {}),
        ...(action === 'completed' ? { note } : {}),
        ...(action === 'canceled' ? { note: reason } : {}),
      }
      fromStatus = toStatus
      return event
    })
    return {
      id: id('wo', index), propertyId: property.id, unitId: index % 4 === 0 ? null : unit.id,
      title, category, description, priority: ['urgent', 'normal', 'high', 'low'][index % 4],
      permissionToEnter: ['yes', 'unknown', 'no'][index % 3], status,
      ...(actions.includes('assigned') ? { assigneeId } : {}),
      ...(actions.includes('scheduled') ? { scheduledFor: day(3) } : {}),
      ...(actions.includes('started') ? { startedAt: timestamp(3) } : {}),
      ...(status === 'completed' ? { completedAt: timestamp(4), completionNote: note } : {}),
      ...(status === 'canceled' ? { canceledAt: timestamp(1), cancelReason: reason } : {}),
      ...meta, createdAt: timestamp(0), updatedAt: history.at(-1).createdAt, history,
    }
  })
  const rentCharges = []
  for (let index = 0; index < 72; index += 1) {
    const lease = leases[index % 48]
    const fee = index >= 48 && index % 3 === 0
    const preferred = index < 48 ? '2026-11-01' : '2026-10-01'
    const termEnd = lease.endedOn || lease.endDate
    const withinTerm = day => [lease.startDate, day, termEnd].sort()[1]
    let postedOn = withinTerm(preferred)
    const firstCharge = rentCharges[index % 48]
    if (!fee && firstCharge && monthStart(postedOn) === monthStart(firstCharge.postedOn)) {
      const offset = lease.startDate < monthStart(postedOn) ? -1 : 1
      postedOn = withinTerm(shiftMonth(postedOn, offset))
    }
    const fifth = postedOn.slice(0, 8) + '05'
    const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(postedOn))
    rentCharges.push({
      id: id('charge', index), leaseId: lease.id, type: fee ? 'fee' : 'rent',
      description: fee ? 'Parking fee' : month + ' rent', postedOn, dueOn: postedOn > fifth ? postedOn : fifth,
      amount: fee ? 45 + (index % 4) * 10 : lease.monthlyRent, status: 'posted', ...meta,
      createdAt: postedOn + 'T16:00:00.000Z', updatedAt: postedOn + 'T16:00:00.000Z',
    })
  }
  const rentPayments = rentCharges.slice(0, 48).map((charge, index) => ({
    id: id('payment', index), leaseId: charge.leaseId, chargeId: charge.id, receivedOn: charge.postedOn,
    amount: index % 4 === 0 ? charge.amount / 2 : charge.amount,
    method: ['bank_transfer', 'check', 'cash'][index % 3], reference: 'Receipt ' + (1048 + index),
    status: 'recorded', ...meta, createdAt: charge.createdAt, updatedAt: charge.createdAt,
  }))
  return { account, properties, units, leases, assignees, workOrders, rentCharges, rentPayments }
}
