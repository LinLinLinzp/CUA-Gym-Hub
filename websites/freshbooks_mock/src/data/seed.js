import { addDays, cents } from '../utils/format.js'
import { calculateInvoice, expenseSource, timeSource } from './invoice.js'
import { boundary, periodTerms, windowAt, windowFor } from './periods.js'

const owner = 'usr_maya'
const opened = '2026-02-02'
const at = date => date + 'T15:30:00.000Z'
const meta = (id, date = opened, user = owner) => ({ id, createdAt: at(date), createdBy: user, updatedAt: at(date), updatedBy: user })
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/, '')
const businessAddress = () => ({ street: '42 Beacon Street', city: 'Boston', region: 'MA', postalCode: '02108', country: 'US' })

const clientNames = [
  ['northstar', 'Northstar Dental Group'], ['harbor_street', 'Harbor Street Design'], ['greenway', 'Greenway Property Partners'],
  ['alder', 'Alder Media Studio'], ['canopy', 'Canopy Coffee Roasters'], ['keystone', 'Keystone Physical Therapy'],
  ['juniper', 'Juniper Floral & Events'], ['whitecap', 'Whitecap Architecture'], ['morrow', 'Morrow Print Studio'],
  ['bricklane', 'Bricklane Fitness'], ['beaconworks', 'Beaconworks Collective'], ['silverline', 'Silverline Research'],
  ['prairie', 'Prairie Home Organics'], ['cedarpoint', 'Cedar Point Pediatrics'], ['starlight', 'Starlight Community Arts'],
  ['fable', 'Fable Learning Co.'], ['redbridge', 'Redbridge Fabrication'], ['wilson', 'Wilson & Hart Legal'],
  ['hearthwood', 'Hearthwood Interiors'], ['coastwell', 'Coastwell Recovery'], ['oakline', 'Oakline Food Hall'],
  ['winding', 'Winding River Retreats'], ['fieldspar', 'Fieldspar Engineering'], ['cobalt', 'Cobalt Music School'],
  ['stonepier', 'Stone Pier Markets'], ['ravine', 'Ravine Robotics'], ['parkside', 'Parkside Nutrition'],
  ['lumen', 'Lumen Urban Farm'], ['paperrow', 'Paper Row Publishing'], ['marigold', 'Marigold Sports Medicine'],
]
const projectNames = [
  'Practice Operations Review', 'Studio Onboarding', 'Tenant Experience Program', 'Publishing Calendar and Workflow',
  'Wholesale Setup', 'Intake Process Redesign', 'Events Scheduling', 'Project Profitability Review',
  'Production Planning', 'Member Retention Program', 'Annual Planning Workshop', 'Research Intake Portal',
  'Inventory Controls', 'Care Coordination', 'Spring Fundraising Campaign', 'Customer Journey Mapping',
  'Capacity Planning', 'Document Management', 'Procurement Workflow', 'Quality Improvement',
  'Vendor Onboarding', 'Seasonal Staffing', 'Field Services Planning', 'Enrollment Experience',
  'Market Expansion', 'Support Triage', 'Operations Playbook', 'Launch Readiness',
  'Editorial Systems', 'Clinic Readiness', 'Patient Communications', 'Workshop Materials',
]
const serviceNames = [
  'Process Improvement', 'Operations Advisory', 'Data Analysis', 'Workshop Facilitation', 'Project Management', 'Reporting',
  'Vendor Review', 'Change Management', 'Implementation Support', 'Planning Session', 'Systems Design', 'Service Desk',
  'Quality Assurance', 'Inventory Design', 'Resource Modeling', 'Design Review', 'Financial Analysis', 'Market Research',
  'Training Delivery', 'Documentation', 'Stakeholder Interviews', 'Systems Configuration', 'Operational Audit', 'Transition Support',
]
const categoryNames = [
  ['uncategorized', 'Uncategorized Expenses'], ['printing', 'Printing & Copying'], ['software', 'Software Subscriptions'],
  ['transportation', 'Ground Transportation'], ['contractors', 'Contractor Services'], ['airfare', 'Airfare'],
  ['meals', 'Meals'], ['office', 'Office Expenses'], ['equipment', 'Computer Equipment'], ['internet', 'Internet & Phone'],
  ['lodging', 'Lodging'], ['shipping', 'Shipping & Postage'], ['training', 'Training'], ['dues', 'Professional Dues'],
  ['parking', 'Parking & Tolls'], ['supplies', 'Office Supplies'],
]
const merchants = [
  'Morrow Print Studio', 'Canopy Coffee Roasters', 'Amtrak', 'Notion', 'Cambridge Office Supply', 'Verizon Business',
  'United Airlines', 'Lyft', 'Seaport Hotel', 'Figma', 'UPS', 'Framebridge', 'Staples', 'Lakeside Parking',
  'Conference Board', 'Nimbus Cloud Services', 'Cedar & Sage Catering', 'Delta Air Lines', 'Boston Design Week', 'Beacon IT Services',
]
const purchaseDescriptions = [
  'Workshop packets', 'Client working lunch', 'Site visit travel', 'Team workspace subscription', 'Project binder supplies',
  'Business data plan', 'Travel for client review', 'Ride to stakeholder meeting', 'Overnight for implementation visit',
  'Collaborative design subscription', 'Client materials delivery', 'Office signs and frames', 'Presentation supplies', 'Parking during site visit',
  'Professional membership', 'Client portal hosting', 'Planning session catering', 'Travel for project kickoff', 'Professional development', 'Equipment setup',
]
const workNotes = [
  'Reviewed intake workflows', 'Prepared weekly operating report', 'Facilitated planning workshop',
  'Mapped client onboarding touchpoints', 'Updated process documentation', 'Reviewed vendor proposals',
  'Reconciled capacity plan with team', 'Created handoff and training materials', 'Collected stakeholder feedback',
  'Validated dashboard reporting inputs', 'Coordinated implementation milestones', 'Reviewed follow-up actions from kickoff',
]
const team = [
  ['maya', 'Maya Chen', 'owner'], ['imani', 'Imani Brooks', 'controller'], ['nico', 'Nico Alvarez', 'consultant'],
  ['avery', 'Avery Shah', 'consultant'], ['elena', 'Elena Morris', 'consultant'],
]
const channels = ['cash', 'check', 'bank_transfer', 'credit_card', 'other']
const workDate = (index, stride) => index % 7 === 1
  ? addDays('2026-02-13', (index * stride) % 45)
  : addDays('2026-09-15', (index * stride) % 65)

const line = (id, fields) => ({ id, kind: 'manual', serviceId: null, name: '', description: '', rate: 0, quantity: 1, taxPercent: 0, sources: [], ...fields })
function makeInvoice(client, id, number, date, lines, fields = {}) {
  const { discountPercent = 0, amountPaid = 0, status = 'draft', ...rest } = fields
  return {
    ...meta(id, date), ...calculateInvoice(lines, discountPercent, amountPaid),
    clientId: client.id, projectId: null, invoiceNumber: 'INV-' + number, kind: 'standard', reference: '',
    issueDate: date, dueDate: addDays(date, 30), currency: client.currency, discountPercent, notes: '', terms: 'Net 30',
    status, visibility: 'active', sentAt: status === 'draft' ? null : at(date), retainerId: null, retainerPeriodStart: null, ...rest,
  }
}

export function createInitialData() {
  const business = { id: 'biz_birch_vale', name: 'Birch & Vale Advisory', email: 'billing@birchvale.example', currency: 'USD', netDays: 30, address: businessAddress() }
  const users = team.map(([key, name, role]) => ({ ...meta('usr_' + key), name, role, email: `${key}@birchvale.example` }))
  const clients = clientNames.map(([key, name], i) => {
    const currency = i % 6 === 4 ? 'CAD' : 'USD'
    return {
      ...meta('cli_' + key), name, email: `ap@${key}.example`, currency,
      contacts: i % 3 === 0 ? [{ id: `contact_${key}_ops`, name: i === 0 ? 'Erin Patel' : ['Mina Ellis', 'Rae Novak', 'Morgan Flores', 'Alex Brown', 'Drew Martin'][i % 5],
        email: i === 0 ? 'erin@northstardental.example' : `ops@${key}.example` }] : [],
      billingAddress: i === 0 ? { ...businessAddress(), street: '205 Federal Street', postalCode: '02110' } : {
        street: `${19 + i * 11} ${['Prospect Street', 'Harrison Avenue', 'Summer Street', 'Harbor Road'][i % 4]}`,
        city: currency === 'CAD' ? ['Toronto', 'Ottawa'][i % 2] : ['Boston', 'Cambridge', 'Providence'][i % 3],
        region: currency === 'CAD' ? 'ON' : i % 3 === 2 ? 'RI' : 'MA', postalCode: currency === 'CAD' ? 'K1P 5G4' : i % 3 === 2 ? '02903' : '02110',
        country: currency === 'CAD' ? 'CA' : 'US',
      },
      visibility: i === 29 ? 'archived' : 'active',
    }
  })
  clients[0].email = 'ap@northstardental.example'
  const services = serviceNames.map((name, i) => ({
    ...meta(i === 0 ? 'svc_process' : i === 1 ? 'svc_advisory' : 'svc_' + slug(name)), name,
    description: i === 0 ? 'Process review and recommendations' : name + ' and follow-up',
    defaultRate: 125 + (i % 11) * 10, defaultTaxPercent: i % 8 === 4 ? 5 : 0, active: i < 23,
  }))
  const expenseCategories = categoryNames.map(([key, name]) => ({
    ...meta('cat_' + key), name, parentId: key === 'supplies' || key === 'equipment' ? 'cat_office' : null, active: true,
  }))

  const retainers = clients.flatMap((client, i) => {
    if (i === 1 || i === 29) return []
    const key = clientNames[i][0]
    const periodUnit = i === 0 || i === 2 || i % 4 === 3 ? 'monthly' : ['weekly', 'yearly', 'custom'][i % 3]
    const startDate = i === 0 ? '2026-10-01' : i === 2 ? '2026-11-01' : i < 8 ? '2026-09-01' : addDays('2026-10-01', i - 8)
    const customPeriodDays = periodUnit === 'custom' ? 14 : null
    const issued = i === 0 || (i >= 3 && i <= 6)
    const status = i > 3 && i % 7 === 0 ? 'inactive' : 'active'
    const scheduleAnchorDate = i === 2 ? '2026-11-18' : startDate
    const scheduleIndex = issued ? 1 : 0
    return [{
      ...meta('ret_' + key, startDate), clientId: client.id, startDate, periodUnit, customPeriodDays,
      feePerPeriod: i === 0 ? 1800 : 900 + i * 110, includedMinutes: i === 0 ? 720 : (i === 3 ? 360 : 360 + (i % 7) * 90),
      excessHourlyRate: i === 0 ? 185 : 150 + (i % 8) * 10, currency: client.currency, scheduleAnchorDate, scheduleIndex,
      periodIndex: scheduleIndex, nextIssueDate: status === 'active' ? boundary(scheduleAnchorDate, periodUnit, customPeriodDays, scheduleIndex) : null,
      invoicesRemaining: status === 'inactive' ? 0 : i === 0 ? 4 : i % 3 === 0 ? 6 - scheduleIndex : null,
      deliveryMode: i % 3 === 2 ? 'send_automatically' : 'create_draft', invoiceNotes: i === 0 ? 'Practice operations advisory retainer' : 'Advisory services for the agreed service period',
      invoiceTerms: 'Net 30', status, visibility: i > 10 && i % 9 === 0 ? 'archived' : i > 10 && i % 13 === 0 ? 'deleted' : 'active',
    }]
  })
  const projects = projectNames.map((name, i) => {
    const client = clients[i < 30 ? i : i === 30 ? 0 : 1]
    const billingType = i % 12 === 10 ? 'internal' : i % 9 === 7 ? 'flat' : 'hourly'
    const retainer = retainers.find(row => row.clientId === client.id && row.status === 'active' && row.visibility === 'active')
    return {
      ...meta(i === 0 ? 'proj_northstar_ops' : 'proj_' + slug(name)), name, clientId: client.id, billingType,
      hourlyRate: billingType === 'hourly' ? i === 0 ? 180 : 140 + (i % 8) * 15 : null,
      expenseMarkupPercent: i % 3 === 0 ? 10 : 0, retainerId: i % 4 === 0 ? retainer?.id || null : null,
      status: i % 11 === 9 ? 'completed' : 'active',
    }
  })
  const invoices = Array.from({ length: 46 }, (_, i) => {
    const client = i === 0 ? clients[0] : clients[(i * 7) % clients.length]
    const project = projects.find(row => row.clientId === client.id)
    const date = i === 0 ? '2026-11-04' : workDate(i, 13)
    const id = i === 0 ? 'inv_northstar_1048' : `inv_advisory_${1050 + i}`
    const svc = services[i % services.length]
    const amountPaid = i === 0 ? 900 : i < 34 && i % 6 === 0 ? 250 + 5 * i : 0
    const status = i === 0 || i < 34 && i % 6 === 0 ? 'partial'
      : i < 34 ? 'paid' : i % 3 === 0 ? 'draft' : 'sent'
    const items = [
      line(id + '_1', { name: svc.name, serviceId: svc.id, description: i === 0 ? 'Practice operations review and roadmap' : svc.description, quantity: i === 0 ? 12 : 5 + i % 9, rate: i === 0 ? 180 : svc.defaultRate, taxPercent: svc.defaultTaxPercent }),
    ]
    if (i % 5 === 3) items.push(line(id + '_2', { name: 'Working Session', description: 'Review and next steps with project leads', rate: 195, quantity: 2 }))
    const invoice = makeInvoice(client, id, i === 0 ? 1048 : 1050 + i, date, items, {
      projectId: project?.id || null, status, amountPaid, reference: i % 3 === 0 ? `PO-${286 + i * 3}` : '',
      visibility: i === 38 || i === 44 ? 'archived' : i === 45 ? 'deleted' : 'active',
      discountPercent: i % 7 === 5 ? 5 : 0, notes: i % 6 === 0 ? 'Thank you for working with Birch & Vale Advisory.' : '',
    })
    return status === 'paid' ? { ...invoice, amountPaid: invoice.total, amountDue: 0 } : invoice
  })

  const periods = []
  function ensurePeriod(retainer, window) {
    let row = periods.find(item => item.retainerId === retainer.id && item.startDate === window.startDate)
    if (!row) {
      row = { ...meta(`rp_${retainer.id.slice(4)}_${window.startDate}`, window.startDate), retainerId: retainer.id, ...window, ...periodTerms(retainer), feeInvoiceId: null }
      periods.push(row)
    }
    return row
  }
  for (const retainer of retainers) {
    const period = ensurePeriod(retainer, windowAt(retainer, 0))
    if (!retainer.periodIndex) continue
    const client = clients.find(row => row.id === retainer.clientId)
    const id = retainer.id === 'ret_northstar' ? 'inv_ret_northstar_oct' : 'inv_fee_' + retainer.id.slice(4)
    period.feeInvoiceId = id
    invoices.push(makeInvoice(client, id, 1100 + invoices.length, retainer.scheduleAnchorDate, [
      line(id + '_1', { name: 'Retainer Fee', kind: 'retainer_fee', rate: period.feePerPeriod, description: `Service period ${period.startDate} through ${addDays(period.endDate, -1)}` }),
    ], { kind: 'retainer_fee', retainerId: retainer.id, retainerPeriodStart: period.startDate, status: retainer.deliveryMode === 'send_automatically' ? 'sent' : 'draft', notes: retainer.invoiceNotes }))
  }

  const timeEntries = Array.from({ length: 144 }, (_, i) => {
    const project = projects[(i * 11) % projects.length]
    const assigned = i === 0 ? projects[0] : i % 10 === 9 ? null : project
    const user = i === 0 ? users[2] : users[i % users.length]
    const client = clients.find(row => row.id === assigned?.clientId)
    const date = i === 0 ? '2026-11-10' : workDate(i, 9)
    const billable = Boolean(assigned && assigned.billingType === 'hourly' && i % 8 !== 3)
    const entry = {
      ...meta(i === 0 ? 'te_northstar_unbilled' : `te_advisory_${String(i).padStart(3, '0')}`, date, user.id),
      userId: user.id, clientId: client?.id || null, projectId: assigned?.id || null, serviceId: services[i % services.length].id,
      workDate: date, durationMinutes: i === 0 ? 165 : 15 + (i * 7 % 16) * 15, notes: workNotes[i % workNotes.length],
      billable, status: billable ? 'unbilled' : 'non_billable', invoiceId: null, retainerId: null, retainerPeriodStart: null,
      timerId: null, visibility: 'active',
    }
    if (i >= 1 && i <= 5) {
      const workDate = addDays('2026-10-02', (i - 1) * 6)
      return {
        ...entry, ...meta(entry.id, workDate, user.id), clientId: clients[0].id, projectId: projects[0].id,
        workDate, durationMinutes: [180, 210, 135, 165, 150][i - 1], billable: true, status: 'billed', retainerId: 'ret_northstar', retainerPeriodStart: '2026-10-01',
      }
    }
    if (i >= 6 && i <= 8) {
      const workDate = addDays('2026-09-03', (i - 6) * 8)
      return {
        ...entry, ...meta(entry.id, workDate, user.id), clientId: clients[3].id, projectId: projects[3].id,
        workDate, durationMinutes: 155, billable: true, status: 'billed', retainerId: 'ret_alder', retainerPeriodStart: '2026-09-01',
      }
    }
    if (i > 8 && i % 4 === 1 && entry.clientId && entry.clientId !== 'cli_northstar' && entry.clientId !== 'cli_alder') {
      const retainer = retainers.find(row => row.clientId === entry.clientId && row.status === 'active' && row.visibility !== 'deleted')
      const window = retainer && windowFor(retainer, date)
      if (window) {
        const period = ensurePeriod(retainer, window)
        return { ...entry, billable: true, status: 'billed', retainerId: retainer.id, retainerPeriodStart: period.startDate }
      }
    }
    return entry
  })

  const expenses = Array.from({ length: 80 }, (_, i) => {
    const k = i % merchants.length
    const project = projects[(i * 7) % projects.length]
    const client = clients.find(row => row.id === project.clientId)
    const date = i === 0 ? '2026-11-12' : workDate(i, 11)
    const billable = i === 0 || i % 3 === 2
    const assigned = billable || i % 6 === 1
    const receipt = i === 0 ? { url: '/receipts/print-studio.svg', originalName: 'morrow-print-november.svg', storedName: 'print-studio.svg', size: 1056, contentType: 'image/svg+xml' } : null
    return {
      ...meta(i === 0 ? 'exp_northstar_print' : `exp_advisory_${String(i).padStart(3, '0')}`, date), merchant: merchants[k],
      categoryId: 'cat_' + ['printing','meals','transportation','software','supplies','internet','airfare','transportation','lodging','software','shipping','office','equipment','parking','dues','software','meals','airfare','training','contractors'][k],
      expenseDate: date, description: purchaseDescriptions[k], source: i % 4 === 2 ? 'imported' : 'manual',
      currency: client.currency, total: i === 0 ? 120 : (3150 + i * 817 % 47000) / 100,
      taxes: i % 4 === 0 ? [{ name: 'Sales Tax', percent: null, amount: i === 0 ? 7.5 : (240 + i * 57 % 1700) / 100 }] : [],
      clientId: assigned ? client.id : null, projectId: assigned ? project.id : null, billable, status: billable ? 'unbilled' : 'non_billable',
      markupPercent: billable && i % 2 === 0 ? 10 : 0, includeReceiptOnInvoice: i === 0,
      invoiceId: null, receipt, visibility: i > 16 && i % 13 === 0 ? 'archived' : i > 16 && i % 17 === 0 ? 'deleted' : 'active',
    }
  })

  for (const invoice of invoices.slice(34, 43)) {
    const tracked = timeEntries.find(row => row.clientId === invoice.clientId && row.status === 'unbilled' && row.id !== 'te_northstar_unbilled')
    const paid = expenses.find(row => row.clientId === invoice.clientId && row.currency === invoice.currency && row.visibility === 'active' &&
      row.status === 'unbilled' && row.id !== 'exp_northstar_print')
    const lines = [...invoice.lines]
    if (tracked) {
      const { rate, source } = timeSource({ projects, services }, tracked)
      lines.push(line(invoice.id + '_time', { kind: 'time', serviceId: tracked.serviceId, name: 'Tracked advisory work', description: tracked.notes, rate, quantity: Math.round(tracked.durationMinutes * 100 / 60) / 100, sources: [source] }))
      Object.assign(tracked, { invoiceId: invoice.id, status: 'billed' })
    }
    if (paid) {
      const source = expenseSource(paid)
      lines.push(line(invoice.id + '_expense', { kind: 'expense', name: paid.merchant, description: paid.description, rate: source.amount, sources: [source] }))
      Object.assign(paid, { invoiceId: invoice.id, status: 'billed' })
    }
    Object.assign(invoice, calculateInvoice(lines, invoice.discountPercent, invoice.amountPaid))
  }

  const excess = timeEntries[8]
  const excessPeriod = periods.find(row => row.retainerId === 'ret_alder' && row.startDate === '2026-09-01')
  const allocated = { type: 'time_entry', id: excess.id, minutes: 60, amount: excessPeriod.excessHourlyRate, includeReceipt: false }
  invoices.push(makeInvoice(clients[3], 'inv_excess_alder_sep', 1170, '2026-10-02', [
    line('line_excess_alder_sep', { kind: 'retainer_excess', name: 'Retainer Excess Time', description: excess.notes, rate: excessPeriod.excessHourlyRate, sources: [allocated] }),
  ], { kind: 'retainer_excess', status: 'sent', retainerId: 'ret_alder', retainerPeriodStart: excessPeriod.startDate }))

  const payments = invoices.slice(0, 34).flatMap((invoice, i) => {
    const split = i === 1 || i === 3
    const day = i === 0 ? '2026-11-10' : addDays(invoice.issueDate, 3 + i % 5)
    const make = (amount, date, part) => ({
      ...meta(i === 0 ? 'pay_northstar_1048' : `pay_advisory_${i}_${part}`, date, users[1].id), invoiceId: invoice.id, clientId: invoice.clientId,
      paymentDate: date, currency: invoice.currency, amount, method: i === 0 ? 'check' : channels[i % channels.length],
      reference: i === 0 ? 'CHK-512' : `RCPT-${8800 + 2 * i + part}`, notes: i === 0 ? 'First installment' : split ? (part ? 'Final installment' : 'First installment') : '',
      status: 'recorded',
    })
    const first = split ? Math.floor(cents(invoice.amountPaid) / 2) / 100 : invoice.amountPaid
    return split ? [make(first, day, 0), make((cents(invoice.amountPaid) - cents(first)) / 100, addDays(day, 4), 1)] : [make(first, day, 0)]
  })
  return {
    business, currentUserId: owner, users, clients, projects, services, expenseCategories, invoices, payments,
    timeEntries, activeTimer: null, expenses, retainers, retainerPeriods: periods, activityEvents: [],
  }
}
