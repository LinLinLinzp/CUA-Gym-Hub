const actor = 'user-alex'
const checking = 'acct-checking-01'
const savings = 'acct-savings-01'
const card = 'acct-card-01'
const key = (number, width = 3) => String(number).padStart(width, '0')
const day = (offset) => new Date(Date.UTC(2026, 10, 18 + offset)).toISOString().slice(0, 10)
const stamp = (offset) => day(offset) + 'T15:30:00.000Z'
const audit = (offset) => ({ createdAt: stamp(offset), createdBy: actor })

const purchases = [
  ['Northline Market', 'Groceries', 68.42], ['Juniper Coffee', 'Dining', 8.65],
  ['Harbor Books', 'Shopping', 24.15], ['Cedar Table', 'Dining', 53.8],
  ['Maple Pharmacy', 'Health', 16.75], ['Metro Fare', 'Transit', 12],
  ['Northline Market', 'Groceries', 93.29], ['Bluebird Outfitters', 'Shopping', 37.5],
  ['Juniper Coffee', 'Dining', 12.25], ['Silver Screen Cinema', 'Entertainment', 32],
  ['Cedar Table', 'Dining', 61.19], ['Brookside Fuel', 'Transit', 42.84],
]

const householdPayees = [
  ['Northline Electric', 'Utilities'], ['Brookside Water', 'Utilities'],
  ['Cedar Court Properties', 'Rent'], ['Juniper Fiber', 'Telecom'],
  ['Alder Mutual', 'Insurance'], ['Willow Home Care', 'Household services'],
  ['Metro Gas Service', 'Utilities'], ['Silverline Mobile', 'Telecom'],
  ['Maple Auto Finance', 'Auto'], ['Harbor Ridge HOA', 'Housing'],
  ['Oak Grove Childcare', 'Education'], ['Westfield Recycling', 'Household services'],
  ['Parkside Property Group', 'Rent'], ['Clearwater Energy', 'Utilities'],
  ['Brookfield Health Plan', 'Insurance'], ['Pine Street Storage', 'Household services'],
  ['Redwood Pest Control', 'Household services'], ['River City Broadband', 'Telecom'],
  ['Lakeview Community Center', 'Memberships'], ['Northgate Dental', 'Health'],
  ['Elm Street Alarm', 'Household services'], ['Fremont Auto Coverage', 'Insurance'],
  ['Stonebridge Leasing', 'Rent'], ['Hillcrest Water District', 'Utilities'],
]

function account(id, productName, type, last4, currentBalance, available, options = {}) {
  return {
    id, productName, type, last4, currency: 'USD', currentBalance,
    ...(type === 'credit_card' ? { availableCredit: available } : { availableBalance: available }),
    status: 'open', ...options,
  }
}

function purchase(id, accountId, index, offset, status = 'posted') {
  const [merchant, category, amount] = purchases[index % purchases.length]
  return {
    id, accountId, merchant, category, description: merchant, type: 'purchase',
    transactionDate: day(offset), status, amount: -amount,
  }
}

export function createInitialData() {
  const profile = { id: actor, firstName: 'Alex', lastName: 'Morgan' }
  const accounts = [
    account(checking, 'Total Checking', 'checking', '4812', 4280.45, 4150.45, { nickname: 'Household' }),
    account(savings, 'Chase Savings', 'savings', '7036', 12350.72, 12350.72, { nickname: 'Rainy day' }),
    account(card, 'Freedom Unlimited', 'credit_card', '9428', 814.62, 5185.38),
    account('acct-checking-02', 'Premier Plus Checking', 'checking', '2904', 1760.2, 1760.2, { nickname: 'Everyday' }),
    account('acct-savings-02', 'Chase Savings', 'savings', '8391', 3250, 3250, { nickname: 'Travel savings' }),
    account('acct-card-02', 'Sapphire Preferred', 'credit_card', '1145', 236.19, 7763.81),
    ...Array.from({ length: 18 }, (_, i) => {
      const type = ['checking', 'savings', 'credit_card'][i % 3]
      const product = ['Total Checking', 'Chase Savings', 'Freedom Unlimited'][i % 3]
      return account('acct-archive-' + key(i + 1, 2), product, type, String(3107 + 137 * i), 0, 0, { status: 'closed' })
    }),
  ]

  const transactions = [
    ...Array.from({ length: 24 }, (_, i) =>
      purchase('txn-card-' + key(i + 1), card, i, i === 0 ? -9 : (i === 1 ? -1 : -4 - i * 2), i === 1 || i === 2 ? 'pending' : 'posted')),
    ...Array.from({ length: 22 }, (_, i) => {
      const item = purchase('txn-checking-' + key(i + 1), checking, i + 3, -i * 2, i === 1 ? 'pending' : 'posted')
      if (i % 7 === 0) return { ...item, merchant: 'Alder Design Studio', description: 'Payroll deposit', category: 'Income', type: 'deposit', amount: 1984.52 }
      if (i === 15) return { ...item, merchant: 'Chase', description: 'Monthly service fee', category: 'Bank fees', type: 'fee', amount: -12 }
      if (i === 16) return { ...item, description: 'Card payment', category: 'Payments', type: 'payment', amount: -120 }
      if (i === 17) return { ...item, description: 'Returned purchase', category: 'Shopping', type: 'refund', amount: 16.75 }
      return item
    }),
    ...Array.from({ length: 18 }, (_, i) => ({
      id: 'txn-savings-' + key(i + 1), accountId: savings,
      description: i % 3 ? 'Savings contribution' : 'Interest deposit',
      category: i % 3 ? 'Savings' : 'Interest', type: 'deposit',
      transactionDate: day(-2 - i * 7), status: 'posted', amount: i % 3 ? 75 + i * 13 : 1.15 + i / 4,
    })),
    ...accounts.slice(3).map((item, i) => {
      const id = 'txn-history-' + key(i + 1)
      const offset = -20 - 4 * i
      if (item.type !== 'savings') return purchase(id, item.id, i, offset)
      return {
        id, accountId: item.id, description: 'Savings contribution', category: 'Savings',
        type: 'deposit', transactionDate: day(offset), status: 'posted', amount: 100 + i * 5,
      }
    }),
  ]

  const transfers = Array.from({ length: 24 }, (_, i) => {
    const status = i % 8 === 0 ? 'scheduled' : i % 8 === 3 ? 'cancelled' : 'completed'
    const offset = i === 0 ? 11 : status === 'scheduled' ? 15 + i : -i - 3
    const record = {
      id: 'trf-' + key(i + 1), fromAccountId: checking, toAccountId: savings,
      transferDate: day(offset), status, amount: 150 + i * 11.75,
      memo: ['Holiday savings', 'Monthly savings', 'Travel fund', 'Household reserve'][i % 4],
      ...audit(status === 'scheduled' ? -2 : offset - 1),
      ...(status === 'cancelled' ? { cancelledAt: stamp(offset), cancelledBy: actor } : {}),
    }
    if (status === 'completed') {
      for (const [direction, accountId, amount] of [['out', checking, -record.amount], ['in', savings, record.amount]]) {
        transactions.push({
          id: record.id + '-' + direction, accountId, transferId: record.id,
          description: direction === 'in' ? 'Transfer from Household' : 'Transfer to Rainy day',
          category: 'Transfers', type: 'transfer', status: 'posted', amount,
          transactionDate: record.transferDate, ...audit(offset),
        })
      }
    }
    return record
  })

  const payees = householdPayees.map(([name, category], i) => ({
    id: i === 0 ? 'payee-utilities-01' : 'payee-' + key(i + 1), name, category,
    accountLast4: String(2064 + i * 211), status: i >= 21 ? 'inactive' : 'active',
    ...(i === 0 ? { nickname: 'Home electric' } : {}), ...audit(i === 0 ? -43 : -82 + i),
  }))

  const billPayments = payees.map((payee, i) => {
    const status = i % 7 === 0 && i < 21 ? 'scheduled' : i % 7 === 2 ? 'cancelled' : 'completed'
    const offset = status === 'scheduled' ? 14 + i : -4 - i * 2
    return {
      id: 'bill-' + key(i + 1), payeeId: payee.id, fromAccountId: checking,
      sendDate: day(offset), status, amount: i === 0 ? 86.24 : (4536 + i * 517) / 100,
      ...audit(status === 'scheduled' ? -2 : offset - 3),
      ...(status === 'cancelled' ? { cancelledAt: stamp(offset - 1), cancelledBy: actor } : {}),
    }
  })

  const disputed = [
    transactions.find((item) => item.id === 'txn-card-008'),
    transactions.find((item) => item.id === 'txn-checking-009'),
    ...transactions.filter((item) => item.accountId.startsWith('acct-archive-') && item.type === 'purchase'),
    ...transactions.filter((item) => item.accountId === card && item.type === 'purchase').slice(-10),
  ]
  const disputes = disputed.map((item, i) => ({
    id: 'dsp-' + key(i + 1), accountId: item.accountId, transactionId: item.id,
    reason: ['duplicate_charge', 'incorrect_amount', 'not_received'][i % 3],
    description: [
      'The merchant posted a second charge for the same order.',
      'The posted amount differs from the amount on my receipt.',
      'The merchant charged me for an order I never received.',
    ][i % 3],
    status: i === 0 ? 'under_review' : i === 1 ? 'submitted' : i % 3 === 0 ? 'closed' : 'resolved',
    amount: -item.amount,
    ...(i < 2 ? audit(i === 0 ? -5 : -1) : {
      createdAt: new Date(Date.parse(item.transactionDate + 'T16:00:00.000Z') + 2 * 86400000).toISOString(),
      createdBy: actor,
    }),
  }))

  const rule = (id, accountId, type, enabled, channels, thresholdAmount) => ({
    id, accountId, type, enabled, channels, thresholdAmount, ...audit(-43),
    updatedAt: stamp(-43), updatedBy: actor,
  })
  const alertRules = [
    rule('alert-checking-low-01', checking, 'low_balance', true, ['email', 'push'], 250),
    ...accounts.slice(1).map((item, i) => {
      const type = item.type === 'credit_card' ? 'payment_due' : 'low_balance'
      return rule('alert-' + key(i + 2), item.id, type, i % 3 !== 0, ['email'], type === 'low_balance' ? 100 + 25 * i : null)
    }),
  ]

  return { profile, accounts, transactions, transfers, payees, billPayments, disputes, alertRules }
}
