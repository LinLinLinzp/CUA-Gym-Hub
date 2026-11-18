import { createRecord, requireFields, requireValue, transaction, updateRecord, validDate, validNumber } from './ledger.js'
import { find, money, number, round, rows, sum, today } from './model.js'
import { activeReference } from './orders.js'

export const paymentConfig = {
  custpymt: { party: 'customerId', partyKey: 'customers', partyTitle: 'Customer', target: 'invoiceId', targetTitle: 'Invoice', key: 'invoices', code: 'custinvc' },
  vendpymt: { party: 'vendorId', partyKey: 'vendors', partyTitle: 'Vendor', target: 'billId', targetTitle: 'Bill', key: 'vendorBills', code: 'vendbill' },
}

export function outstanding(state, code, partyId) {
  const config = paymentConfig[code]
  return rows(state, config.key).filter((row) => row[config.party] === partyId && row.status === 'Open' && number(row.amountRemaining) > 0)
}

export function paymentDraft(state, code, source) {
  const { party, target } = paymentConfig[code]
  const sourceBalance = number(source?.amountRemaining)
  const customer = code === 'custpymt'
  return {
    [party]: source?.[party] || '', payment: sourceBalance || '', tranDate: today(),
    locationId: source?.locationId || state.preferences?.defaultLocationId || '',
    paymentMethodId: rows(state, 'paymentMethods').find((entry) => entry.id === 'pm_ach')?.id || rows(state, 'paymentMethods')[0]?.id || '',
    undepFunds: customer && !!find(state, 'accounts', 'acct_1050'), accountId: find(state, 'accounts', 'acct_1000')?.id || '',
    applied: source && sourceBalance > 0 ? [{ [target]: source.id, amount: sourceBalance }] : [],
  }
}

export function savePayment(state, code, draft) {
  return transaction(state, (env) => {
    const config = paymentConfig[code]
    const customer = code === 'custpymt'
    const party = activeReference(state, config.partyKey, draft[config.party], draft.originalPartyId)
    const method = activeReference(state, 'paymentMethods', draft.paymentMethodId)
    const account = activeReference(state, 'accounts', customer && draft.undepFunds ? 'acct_1050' : draft.accountId)
    requireFields({ [config.partyTitle]: party, Date: draft.tranDate, 'Payment Method': method, Account: account, Payment: draft.payment })
    requireValue(validDate(draft.tranDate), 'Enter a valid transaction date.')
    const entered = round(number(draft.payment))
    requireValue(validNumber(draft.payment) && entered > 0, 'Payment must be greater than zero.')
    const seen = new Set()
    const applicable = outstanding(env.state, code, party.id)
    const applied = rows(draft, 'applied').map((entry) => {
      const key = entry[config.target]
      const target = applicable.find((row) => row.id === key)
      requireValue(target && !seen.has(key), `A selected ${config.targetTitle.toLowerCase()} is no longer open for this ${config.partyTitle.toLowerCase()}.`)
      seen.add(key)
      const amount = round(number(entry.amount))
      requireValue(validNumber(entry.amount) && amount > 0, 'Each selected application must be greater than zero.')
      requireValue(amount <= number(target.amountRemaining), `The applied amount (${money(amount)}) exceeds the balance (${money(target.amountRemaining)}).`)
      return { [config.target]: target.id, amount, ...(customer && { discount: 0 }) }
    })
    const total = round(sum(applied, (line) => line.amount))
    requireValue(total <= entered, `The total amount applied (${money(total)}) exceeds the payment amount (${money(entered)}).`)
    requireValue(customer || (applied.length && total === entered), 'Apply the whole payment to the selected bills.')
    const record = createRecord(env, code, {
      [config.party]: party.id, tranDate: draft.tranDate, paymentMethodId: method.id, checkNum: draft.checkNum || '',
      locationId: draft.locationId || null, accountId: account.id, applied, memo: draft.memo || '',
      ...(customer ? { payment: entered, undepFunds: !!draft.undepFunds, arAccountId: 'acct_1100', appliedTotal: total,
        unapplied: round(entered - total), status: draft.undepFunds ? 'Not Deposited' : 'Deposited' }
        : { total: entered, status: 'Cleared' }),
    })
    for (const entry of applied) {
      const target = find(env.state, config.key, entry[config.target])
      const amountPaid = round(number(target.amountPaid) + entry.amount)
      const amountRemaining = Math.max(0, round(number(target.amountRemaining) - entry.amount))
      updateRecord(env, config.code, target, { amountPaid, amountRemaining, status: amountRemaining ? 'Open' : 'Paid In Full' }, 'Status')
    }
    return record
  })
}
