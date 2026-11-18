import { event, newId, requireThat, stamp, upsert } from './commands.js'
import { calculateInvoice, manualLine, nextNumber } from './invoice.js'
import { boundary, periodRow, periodStats, periodTerms, windowAt } from './periods.js'
import { addDays, cents, currencies, find, today, validDate, visible } from '../utils/format.js'

export const periodUnits = ['weekly', 'monthly', 'yearly', 'custom']
export const deliveryModes = ['send_automatically', 'create_draft']
export const activeForClient = (state, clientId, ignoreId) => state.retainers.find(row =>
  row.clientId === clientId && row.id !== ignoreId && row.status === 'active' && !visible(row, 'deleted'))
export const linkedRecords = (state, retainer) => Boolean(retainer && (state.timeEntries.some(row => row.retainerId === retainer.id) ||
  state.invoices.some(row => row.retainerId === retainer.id) || state.retainerPeriods.some(row => row.retainerId === retainer.id && row.feeInvoiceId)))

export function retainerForm(state, old, clientId) {
  return {
    clientId: old?.clientId || clientId || '', startDate: old?.startDate || today(),
    periodUnit: old?.periodUnit || 'monthly', customPeriodDays: old?.customPeriodDays || 14,
    feePerPeriod: old?.feePerPeriod ?? '', includedHours: old ? (Number(old.includedMinutes) || 0) / 60 : '',
    excessHourlyRate: old?.excessHourlyRate ?? 0, currency: old?.currency || find(state.clients, clientId)?.currency || state.business?.currency || 'USD',
    nextIssueDate: old ? old.nextIssueDate || '' : today(), infinite: old ? old.invoicesRemaining == null : true,
    invoicesRemaining: old?.invoicesRemaining ?? 6, deliveryMode: old?.deliveryMode || 'create_draft',
    invoiceNotes: old?.invoiceNotes || '', invoiceTerms: old?.invoiceTerms || '',
  }
}

export function validateRetainer(state, values, id) {
  const old = find(state.retainers, id)
  requireThat(!id || old && !visible(old, 'deleted'), 'This retainer is unavailable for editing.')
  const client = find(state.clients, values.clientId)
  const count = values.infinite ? null : Number(values.invoicesRemaining)
  const active = count !== 0
  requireThat(client && (visible(client) || old?.clientId === client.id), 'Choose an available client.')
  requireThat(!active || !activeForClient(state, client.id, id), 'This client already has an active retainer.')
  const customPeriodDays = values.periodUnit === 'custom' ? Number(values.customPeriodDays) : null
  requireThat(periodUnits.includes(values.periodUnit) && (customPeriodDays === null || Number.isInteger(customPeriodDays) && customPeriodDays > 0 && customPeriodDays <= 3650), 'Choose a valid period and enter 1–3650 days for a custom period.')
  requireThat(validDate(values.startDate) && (values.startDate === old?.startDate || values.startDate >= today()), 'Choose a start date on or after today.')
  const nextIssueDate = active ? values.nextIssueDate : null
  requireThat(!active || (validDate(nextIssueDate) && (nextIssueDate === old?.nextIssueDate || nextIssueDate >= today())), 'Choose a next issue date on or after today.')
  requireThat(count === null || Number.isSafeInteger(count) && count >= (old ? 0 : 1) && String(values.invoicesRemaining).trim() !== '', 'Enter a valid number of remaining invoices.')
  const includedMinutes = Math.round(Number(values.includedHours) * 60)
  const fee = cents(values.feePerPeriod), excess = cents(values.excessHourlyRate)
  requireThat(Number.isSafeInteger(includedMinutes) && includedMinutes >= 0 && Number(values.includedHours) >= 0 &&
    Number.isSafeInteger(fee) && fee > 0 && Number.isSafeInteger(excess) && excess >= 0, 'Enter a positive fee and nonnegative included hours and excess rate.')
  requireThat(currencies.includes(values.currency) && deliveryModes.includes(values.deliveryMode), 'Choose a currency and invoice delivery mode.')
  const changedWindow = old && (old.startDate !== values.startDate || (old.periodUnit || 'monthly') !== values.periodUnit || (old.customPeriodDays || null) !== customPeriodDays)
  const linked = linkedRecords(state, old)
  requireThat(!linked || (!changedWindow && old.clientId === client.id && old.currency === values.currency), 'Service dates, cadence, client and currency are fixed after time or billing has been linked.')
  const changedIssue = !old || old.nextIssueDate !== nextIssueDate
  return {
    fields: {
      clientId: client.id, startDate: values.startDate, periodUnit: values.periodUnit, customPeriodDays,
      feePerPeriod: fee / 100, includedMinutes, excessHourlyRate: excess / 100, currency: values.currency,
      nextIssueDate, scheduleAnchorDate: changedIssue && active ? nextIssueDate : old?.scheduleAnchorDate || nextIssueDate || values.startDate,
      scheduleIndex: changedIssue ? 0 : Number(old?.scheduleIndex) || 0,
      periodIndex: changedWindow ? 0 : Number(old?.periodIndex) || 0,
      invoicesRemaining: count, deliveryMode: values.deliveryMode,
      invoiceNotes: String(values.invoiceNotes || '').trim(), invoiceTerms: String(values.invoiceTerms || '').trim(),
      status: active ? 'active' : 'inactive',
    }, old, changedWindow,
  }
}

export function saveRetainer(state, values, id) {
  const { fields, old, changedWindow } = validateRetainer(state, values, id)
  const retainer = {
    ...old, ...fields, ...stamp(state, old), id: old?.id || newId('ret'), visibility: old?.visibility || 'active',
  }
  let periods = state.retainerPeriods
  if (changedWindow) periods = periods.filter(row => row.retainerId !== retainer.id)
  else periods = periods.map(row => row.retainerId === retainer.id && !row.feeInvoiceId && row.endDate > today()
    ? { ...row, ...periodTerms(retainer), ...stamp(state, row) } : row)
  if (!old || changedWindow || !periods.some(row => row.retainerId === retainer.id)) {
    periods = [...periods, periodRow({ ...state, retainerPeriods: periods }, retainer, windowAt(retainer, 0))]
  }
  const next = { ...state, retainerPeriods: periods, retainers: upsert(state.retainers, retainer) }
  if (!old && canIssue(retainer)) return issueFee(next, retainer, 'retainer.created')
  return event(next, old ? 'retainer.updated' : 'retainer.created', 'retainer', retainer.id, [retainer.clientId,
    ...periods.filter(row => row.retainerId === retainer.id && !state.retainerPeriods.includes(row)).map(row => row.id)])
}

export function setProjectRetainer(state, projectId, retainerId) {
  const project = find(state.projects, projectId)
  requireThat(project, 'This project is unavailable.')
  const chosen = retainerId || null
  if (chosen === (project.retainerId || null)) return state
  const retainer = find(state.retainers, chosen)
  requireThat(!chosen || retainer?.clientId === project.clientId && retainer?.status === 'active' && !visible(retainer, 'deleted'), 'Choose an active retainer for this project’s client.')
  const next = { ...project, ...stamp(state, project), retainerId: chosen }
  return event({ ...state, projects: upsert(state.projects, next) }, 'project.retainer_changed', 'project', project.id, [project.clientId, chosen, project.retainerId])
}

export function canIssue(retainer, date = today()) {
  return retainer && retainer.status === 'active' && !visible(retainer, 'deleted') && retainer.invoicesRemaining !== 0 &&
    validDate(retainer.nextIssueDate) && retainer.nextIssueDate <= date
}
function issueFee(state, retainer, action) {
  const client = find(state.clients, retainer.clientId)
  requireThat(client, 'The billing client is unavailable.')
  const index = Number(retainer.periodIndex) || 0
  const window = windowAt(retainer, index)
  requireThat(validDate(window.startDate) && validDate(window.endDate), 'Set a valid service period before issuing an invoice.')
  const period = periodRow(state, retainer, window)
  requireThat(!period.feeInvoiceId && !state.invoices.some(row => row.kind === 'retainer_fee' && row.retainerId === retainer.id && row.retainerPeriodStart === period.startDate),
    'A fee invoice has already been issued for this service period.')
  const id = newId('inv')
  const sent = retainer.deliveryMode === 'send_automatically'
  const at = new Date().toISOString()
  const line = manualLine({ name: 'Retainer Fee', kind: 'retainer_fee', rate: period.feePerPeriod, description: `Service period ${period.startDate} through ${addDays(period.endDate, -1)}` })
  const invoice = {
    ...stamp(state, {}, at), ...calculateInvoice([line], 0), id, invoiceNumber: nextNumber(state), reference: '',
    clientId: client.id, projectId: null, kind: 'retainer_fee', retainerId: retainer.id, retainerPeriodStart: period.startDate,
    issueDate: retainer.nextIssueDate, dueDate: addDays(retainer.nextIssueDate, Number(state.business?.netDays ?? 30)), currency: period.currency,
    discountPercent: 0, notes: retainer.invoiceNotes || '', terms: retainer.invoiceTerms || '',
    visibility: 'active', status: sent ? 'sent' : 'draft', sentAt: sent ? at : null,
  }
  const scheduleIndex = (Number(retainer.scheduleIndex) || 0) + 1
  const invoicesRemaining = retainer.invoicesRemaining == null ? null : Math.max(0, Number(retainer.invoicesRemaining) - 1)
  const active = invoicesRemaining !== 0
  const scheduleAnchorDate = retainer.scheduleAnchorDate || retainer.nextIssueDate
  const nextRetainer = {
    ...retainer, ...stamp(state, retainer, at), scheduleIndex: retainer.scheduleAnchorDate ? scheduleIndex : 1, scheduleAnchorDate, periodIndex: index + 1,
    invoicesRemaining, status: active ? 'active' : 'inactive',
    nextIssueDate: active ? boundary(scheduleAnchorDate, retainer.periodUnit, retainer.customPeriodDays, retainer.scheduleAnchorDate ? scheduleIndex : 1) : null,
  }
  const recipient = client.email || client.contacts?.find(contact => contact.email)?.email
  return event({
    ...state, invoices: [...state.invoices, invoice], retainers: upsert(state.retainers, nextRetainer),
    retainerPeriods: upsert(state.retainerPeriods, { ...period, ...stamp(state, period, at), feeInvoiceId: id }),
  }, action, 'retainer', retainer.id, [retainer.clientId, period.id, id],
  sent && { invoiceId: id, to: recipient ? [recipient] : [], message: retainer.invoiceNotes || '', attachPdf: true })
}
export function issueNextInvoice(state, id, expectedDate) {
  const retainer = find(state.retainers, id)
  requireThat(canIssue(retainer) && (!expectedDate || retainer.nextIssueDate === expectedDate), 'No fee invoice is due for this schedule date.')
  return issueFee(state, retainer, 'retainer.fee_issued')
}

export function changeRetainerVisibility(state, id, visibility) {
  const original = find(state.retainers, id)
  requireThat(original, 'This retainer is unavailable.')
  if (visible(original, visibility)) return state
  requireThat(!visible(original, 'deleted') || visibility === 'active', 'Restore the retainer before making that change.')
  const status = Number(original.invoicesRemaining ?? -1) === 0 ? 'inactive' : original.status || 'inactive'
  if (visibility === 'active' && status === 'active') requireThat(!activeForClient(state, original.clientId, id), 'This client already has an active retainer.')
  return event({ ...state, retainers: upsert(state.retainers, { ...original, ...stamp(state, original), visibility, status }) },
    'retainer.' + (visibility === 'active' ? 'restored' : visibility), 'retainer', id, [original.clientId])
}

export function canBillExcess(retainer, period, stats) {
  return Boolean(!visible(retainer, 'deleted') && validDate(period?.endDate) && period.endDate <= today() && Number(period.excessHourlyRate) > 0 && stats?.openExcess > 0)
}
export function excessTerms(state, retainerId, periodStart) {
  const retainer = find(state.retainers, retainerId)
  const period = state.retainerPeriods.find(row => row.retainerId === retainerId && row.startDate === periodStart)
  if (!retainer || !period) return null
  const stats = periodStats(state, period)
  if (!canBillExcess(retainer, period, stats)) return null
  let remaining = stats.openExcess
  const lines = []
  const entries = [...stats.entries].sort((a, b) => (b.workDate || '').localeCompare(a.workDate || '') || b.id.localeCompare(a.id))
  for (const entry of entries) {
    const minutes = Math.min(remaining, Math.max(0, Number(entry.durationMinutes) - (stats.allocated.get(entry.id) || 0)))
    if (!minutes) continue
    const rate = Number(period.excessHourlyRate)
    const source = { type: 'time_entry', id: entry.id, minutes, amount: cents(rate * minutes / 60) / 100, includeReceipt: false }
    lines.push(manualLine({
      kind: 'retainer_excess', name: 'Retainer Excess Time', description: [entry.workDate, entry.notes].filter(Boolean).join(' · '),
      quantity: Math.round(100 * minutes / 60) / 100, rate, sources: [source],
    }))
    remaining -= minutes
    if (!remaining) break
  }
  return {
    clientId: retainer.clientId, currency: period.currency, kind: 'retainer_excess', retainerId, retainerPeriodStart: periodStart,
    notes: retainer.invoiceNotes, terms: retainer.invoiceTerms, lines,
  }
}
