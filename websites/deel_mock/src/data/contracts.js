import { cents, contractTypes, find, list, newId, number, utcDate } from './model.js'

export const contractUnits = { fixed_rate: ['month', 'week'], pay_as_you_go: ['hour', 'day', 'task'] }

export function agreementError(form, state) {
  if (!form.title.trim() || !form.scope.trim()) return 'Enter an agreement title and scope.'
  if (!find(state.legalEntities, form.legalEntityId)) return 'Select a legal entity.'
  if (!Object.hasOwn(contractTypes, form.type)) return 'Select an agreement type.'
  if (!utcDate(form.startDate)) return 'Enter a valid start date.'
  if (form.endDate && (!utcDate(form.endDate) || form.endDate < form.startDate)) return 'End date must be on or after the start date.'
  if (form.workerId === 'new') {
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !form.country.trim() || !form.role.trim()) {
      return 'Enter the contractor’s name, valid email, country and role.'
    }
  } else if (find(state.workers, form.workerId)?.type !== 'contractor') {
    return 'Select a contractor.'
  }
  return ''
}

function positiveAmount(value) {
  const amount = number(value)
  return amount !== null && cents(amount) > 0 && Number.isSafeInteger(cents(amount))
}

export function termsError(form) {
  if (!/^[A-Z]{3}$/.test(form.currency)) return 'Enter a three-letter currency code.'
  const notice = number(form.noticeDays)
  if (!Number.isSafeInteger(notice) || notice < 0) return 'Enter a whole number of notice days.'
  if (form.type === 'milestone') {
    if (!form.milestones.length || form.milestones.some(item =>
      !item.title.trim() || !positiveAmount(item.amount) || (item.dueDate && !utcDate(item.dueDate)))) {
      return 'Each milestone needs a title, positive amount and valid due date if provided.'
    }
  } else {
    if (!contractUnits[form.type]?.includes(form.rateUnit)) return 'Select a rate unit.'
    if ((form.type === 'fixed_rate' || form.rate !== '') && !positiveAmount(form.rate)) return 'Enter a positive rate.'
  }
  return ''
}

const eventFor = (action, contract) => ({
  action: 'contract.' + action, entityType: 'contract', entityId: contract.id, relatedIds: [contract.workerId].filter(Boolean),
})

export function saveContract(form, id, send) {
  return (state, { actor, at }) => {
    const contracts = list(state.contracts)
    const existing = find(contracts, id)
    if (id && existing?.status !== 'draft') return { error: 'Only draft contracts can be saved or sent.' }
    const error = agreementError(form, state) || termsError(form)
    if (error) return { error }
    const workers = list(state.workers)
    let workerId = form.workerId
    let worker
    if (workerId === 'new') {
      const email = form.email.trim().toLowerCase()
      const match = workers.find(item => item.type === 'contractor' && item.id && item.email?.trim().toLowerCase() === email)
      workerId = match?.id || newId('wrk')
      if (!match) worker = {
        id: workerId, name: form.name.trim(), email, country: form.country.trim(), role: form.role.trim(),
        type: 'contractor', team: '', legalEntityId: form.legalEntityId, annualVacationDays: null, createdBy: actor, createdAt: at,
      }
    }
    const existingNumbers = new Set(contracts.map(item => item.number))
    let serial = 1001
    while (existingNumbers.has('CTR-' + serial)) serial += 1
    const milestone = form.type === 'milestone'
    const contract = {
      ...existing, id: existing?.id || newId('ctr'), number: existing?.number || 'CTR-' + serial,
      workerId, legalEntityId: form.legalEntityId, title: form.title.trim(), scope: form.scope.trim(), type: form.type,
      status: send ? 'pending_signature' : 'draft', currency: form.currency, startDate: form.startDate, endDate: form.endDate || null,
      noticeDays: Number(form.noticeDays), rate: milestone || form.rate === '' ? null : cents(Number(form.rate)) / 100,
      rateUnit: milestone ? null : form.rateUnit,
      milestones: milestone ? form.milestones.map(item => ({
        id: item.id || newId('ms'), title: item.title.trim(), dueDate: item.dueDate || null, amount: cents(Number(item.amount)) / 100,
      })) : [],
      createdBy: existing?.createdBy || actor, createdAt: existing?.createdAt || at, updatedAt: at,
      clientSignedAt: send ? at : null, sentAt: send ? at : null, contractorSignedAt: null, cancelledAt: null,
    }
    const changes = { contracts: existing ? contracts.map(item => item.id === id ? contract : item) : [...contracts, contract] }
    if (worker) changes.workers = [...workers, worker]
    const action = send ? 'sent' : existing ? 'updated' : 'created'
    return { changes, id: contract.id, event: eventFor(action, contract), message: send ? 'Contract signed and sent.' : 'Draft saved.' }
  }
}

export function cancelContract(id) {
  return (state, { at }) => {
    const contract = find(state.contracts, id)
    if (contract?.status !== 'pending_signature') return { error: 'Only contracts awaiting signature can be cancelled.' }
    const updated = { ...contract, status: 'cancelled', cancelledAt: at, updatedAt: at }
    return {
      changes: { contracts: list(state.contracts).map(item => item.id === id ? updated : item) },
      event: eventFor('cancelled', updated), id, message: 'Contract cancelled.',
    }
  }
}
