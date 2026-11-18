import { totalsFor, weekdayHours } from './format.js'

const names = [
  'Maya Chen', 'Mateo Alvarez', 'Amara Okafor', 'Daniel Kim', 'Leila Haddad', 'Elliot Brooks',
  'Iris Nguyen', 'Jordan Blake', 'Zoe Mercer', 'Arjun Shah', 'Carmen Silva', 'Owen Fletcher',
  'Yasmin Ali', 'Nora Patel', 'Theo Bennett', 'Samira Khan', 'Miles Wright', 'Sofia Moreno',
  'Ezra Coleman', 'Priya Rao', 'Hugo Martin', 'Naomi Reed', 'Lina Park', 'Isaac Romero',
  'Avery Walsh', 'Adrian Foster', 'Anika Das', 'Felix Bauer', 'Clara James', 'Remy Laurent',
  'Luca Rossi', 'Nadia Campos', 'Jonah Price', 'Mina Ito', 'Quinn Harper', 'Sasha Rivera',
  'Elena Novak', 'Darius King', 'Rina Sato', 'Hannah Shaw', 'Caleb Scott', 'Rosa Jimenez',
  'Milo Turner', 'Bianca Santos', 'Kai Sullivan', 'Freya Evans', 'Noah Bell', 'Tessa Moore',
]
const departments = ['People', 'Engineering', 'Finance', 'Design', 'Operations', 'Sales']
const titles = ['People Partner', 'Software Engineer', 'Financial Analyst', 'Product Designer', 'Operations Analyst', 'Account Executive']
const locations = ['New York', 'Austin', 'Seattle', 'London']
const actorId = 'acct_maya'
const fixedId = (prefix, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`
const iso = (day) => day.toISOString().slice(0, 10)
const daysBefore = (day, count) => iso(new Date(Date.parse(day) - count * 86400000))
const leaveTypes = ['vacation', 'sick', 'personal']

export function createInitialData() {
  const employees = names.map((name, index) => {
    const department = index === 13 ? 3 : index % departments.length
    const terminated = index > 43
    const startDate = iso(new Date(Date.UTC(2024, index % 12, 1 + index % 24)))
    return {
      id: fixedId('emp', index), name,
      workEmail: `${name.toLowerCase().replace(' ', '.')}@juniper.example`,
      jobTitle: index < 6 ? `${departments[department]} Lead` : titles[department],
      department: departments[department], location: locations[index % locations.length],
      employmentType: index % 9 === 7 ? 'contractor' : index % 7 === 6 ? 'part_time' : 'full_time',
      status: terminated ? 'terminated' : 'active', managerId: index < 6 ? null : fixedId('emp', department),
      startDate,
      endDate: terminated ? '2026-04-17' : null, endReason: terminated ? 'Voluntary departure' : null,
      actorId, createdAt: `${daysBefore(startDate, 14)}T14:00:00.000Z`, updatedAt: terminated ? '2026-04-17T14:00:00.000Z' : null,
    }
  })
  const employeeChanges = employees.filter(({ endDate }) => endDate).map((employee, index) => ({
    id: fixedId('ech', index), employeeId: employee.id, action: 'terminated', status: employee.status,
    changes: {
      status: { previous: 'active', next: employee.status },
      endDate: { previous: null, next: employee.endDate },
      endReason: { previous: null, next: employee.endReason },
    },
    actorId, createdAt: employee.updatedAt,
  }))
  const models = [
    ['MacBook Pro 14″', 'laptop'], ['ThinkPad T14', 'laptop'], ['Dell Latitude 5450', 'laptop'],
    ['Surface Pro 10', 'tablet'], ['Dell OptiPlex Micro', 'desktop'], ['iPad Air', 'tablet'],
    ['MacBook Air 13″', 'laptop'], ['Mac mini', 'desktop'],
  ]
  const devices = Array.from({ length: 56 }, (_, index) => {
    const [model, category] = models[index % models.length]
    const holder = index < 35 ? employees[(index + 3) % employees.length] : null
    return {
      id: fixedId('dev', index), assetTag: `JW-${1001 + index}`,
      serial: `JNW6M${String(index + 1).padStart(3, '0')}`, model, category,
      condition: ['new', 'good', 'good', 'fair'][index % 4], location: holder?.location || locations[index % 4],
      status: holder ? 'assigned' : index > 51 ? 'retired' : 'available',
      assignedEmployeeId: holder?.id || null, actorId, createdAt: '2025-01-08T15:00:00.000Z',
      updatedAt: holder ? '2025-02-10T18:30:00.000Z' : null,
    }
  })
  const deviceAssignments = devices.filter(({ assignedEmployeeId }) => assignedEmployeeId).map((device, index) => ({
    id: fixedId('das', index), deviceId: device.id, previousEmployeeId: null,
    nextEmployeeId: device.assignedEmployeeId, action: 'assigned', status: 'assigned', actorId, createdAt: device.updatedAt,
  }))
  const notes = ['Family visit', 'Medical appointment', 'Personal commitments', 'Travel plans', 'Rest and recovery', 'Family event']
  const ptoRequests = Array.from({ length: 48 }, (_, index) => {
    const upcoming = index >= 40
    const month = upcoming ? 10 : 1 + Math.floor(index / 4)
    const firstDay = upcoming ? (index > 43 ? 30 : 23) : 2 + 3 * (index % 4)
    const dateValue = new Date(Date.UTC(2026, month, firstDay))
    while (dateValue.getUTCDay() !== 1) dateValue.setUTCDate(dateValue.getUTCDate() + 1)
    const startDate = iso(dateValue)
    dateValue.setUTCDate(dateValue.getUTCDate() + index % 4)
    const endDate = iso(dateValue)
    const status = upcoming ? 'pending' : ['approved', 'approved', 'declined', 'cancelled'][index % 4]
    return {
      id: fixedId('pto', index), employeeId: employees[(index + 13) % 44].id,
      type: leaveTypes[index % 3], startDate, endDate, hours: weekdayHours(startDate, endDate),
      note: notes[index % notes.length], status, actorId,
      createdAt: upcoming ? '2026-11-16T17:00:00.000Z' : `${daysBefore(startDate, 10)}T17:00:00.000Z`,
      updatedAt: upcoming ? null : `${daysBefore(startDate, 7)}T15:00:00.000Z`,
    }
  })
  const ptoBalances = employees.flatMap((employee, index) => leaveTypes.map((type, typeIndex) => ({
    id: `bal_${index + 1}_${type}`, employeeId: employee.id, type,
    allocatedHours: [120, 80, 40][typeIndex],
    usedHours: ptoRequests.filter((request) => request.employeeId === employee.id && request.type === type && request.status === 'approved')
      .reduce((sum, request) => sum + request.hours, 0),
  })))
  const ptoActions = ptoRequests.filter(({ updatedAt }) => updatedAt).map((request, index) => ({
    id: fixedId('pac', index), requestId: request.id, employeeId: request.employeeId,
    action: request.status, status: request.status, hours: request.hours,
    balanceDeltaHours: request.status === 'approved' ? request.hours : 0,
    note: request.status === 'declined' ? 'Coverage was unavailable.' : null,
    actorId, createdAt: request.updatedAt,
  }))
  const payrollRuns = Array.from({ length: 26 }, (_, index) => {
    const month = Math.floor(index / 2)
    const firstHalf = index % 2 === 0
    const periodStart = iso(new Date(Date.UTC(2025, 11 + month, firstHalf ? 1 : 16)))
    const periodEnd = iso(new Date(Date.UTC(2025, 11 + month + (firstHalf ? 0 : 1), firstHalf ? 15 : 0)))
    const payDate = iso(new Date(Date.parse(periodEnd) + 5 * 86400000))
    const offCycle = index % 5 === 0
    const approvedAt = index < 22 ? `${payDate}T14:00:00.000Z` : null
    const createdAt = `${approvedAt || periodEnd < '2026-11-16' ? periodEnd : '2026-11-16'}T14:00:00.000Z`
    const lineItems = Array.from({ length: 3 + index % 6 }, (_, lineIndex) => {
      const employeeId = employees[(lineIndex + index) % 44].id
      const baseGross = offCycle ? 0 : 2400 + lineIndex * 120 + index * 15
      const bonus = offCycle ? 500 + lineIndex * 100 : 0
      const gross = baseGross + bonus
      const taxes = Math.round(gross * 22) / 100
      const deductions = offCycle ? 0 : 65
      return { id: `pl_${index + 1}_${lineIndex + 1}`, employeeId, baseGross, bonus, gross, taxes, deductions, net: Math.round((gross - taxes - deductions) * 100) / 100 }
    })
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(periodStart))
    return {
      id: fixedId('pay', index), name: `${monthName} · ${offCycle ? 'Off-cycle' : firstHalf ? 'First half' : 'Second half'}`,
      type: offCycle ? 'off_cycle' : 'regular', status: approvedAt ? 'approved' : 'draft',
      periodStart, periodEnd, payDate, currency: 'USD', actorId, createdAt, updatedAt: approvedAt,
      approvedBy: approvedAt ? actorId : null, approvedAt, lineItems, totals: totalsFor(lineItems),
    }
  })
  const payrollActions = payrollRuns.flatMap((run, index) => {
    const record = { runId: run.id, actorId, employeeIds: run.lineItems.map(({ employeeId }) => employeeId), totals: { ...run.totals } }
    const creation = { ...record, id: fixedId('pya', index), status: 'draft', action: 'created', createdAt: run.createdAt }
    return run.approvedAt ? [creation, { ...record, id: fixedId('pya', index + 26), status: 'approved', action: 'approved', createdAt: run.approvedAt }] : [creation]
  })
  return {
    company: { id: 'co_juniper', name: 'Juniper Works', currency: 'USD' },
    actor: { id: actorId, name: 'Maya Chen', role: 'Workspace administrator' },
    employees, employeeChanges, devices, deviceAssignments, ptoRequests, ptoBalances, ptoActions, payrollRuns, payrollActions,
  }
}
