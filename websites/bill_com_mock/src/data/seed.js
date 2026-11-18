const account = { id: 'org_northline', name: 'Northline Studio', currency: 'USD', activeUserId: 'user_maya' }
const users = [
  { id: 'user_maya', name: 'Maya Ortiz', email: 'maya@northline.example', role: 'AP Manager' },
  { id: 'user_jordan', name: 'Jordan Lee', email: 'jordan@northline.example', role: 'Finance Director' },
  { id: 'user_priya', name: 'Priya Desai', email: 'priya@northline.example', role: 'Studio Operations' },
]
const fundingAccounts = [
  { id: 'fund_operating', name: 'Operating Checking', last4: '0418', type: 'checking' },
  { id: 'fund_reserve', name: 'Studio Reserve', last4: '7632', type: 'savings' },
]

const suppliers = [
  ['Cedarline Paper Co.', 'cedarline', 'Irene Park', 'Studio supplies', 'Recycled matte stock'],
  ['Alder & Finch Printworks', 'alderfinch', 'Theo Banks', 'Printing', 'Offset proof and press run'],
  ['Beacon Frame Shop', 'beaconframe', 'Nina Wells', 'Fabrication', 'Gallery mounting hardware'],
  ['Juniper Network Services', 'junipernet', 'Isaac Bell', 'IT services', 'Network maintenance'],
  ['Hearthside Facilities', 'hearthside', 'Eva Reed', 'Facilities', 'Studio maintenance'],
  ['Ironwood Freight', 'ironwoodfreight', 'Samir Shaw', 'Freight', 'Regional delivery'],
  ['Mosaic Type Foundry', 'mosaictype', 'Adrian Fox', 'Software', 'Typeface seat license'],
  ['Sable Grant Advisory', 'sablegrant', 'Clara Lin', 'Professional services', 'Monthly advisory'],
  ['Westwater Displays', 'westwater', 'Owen Scott', 'Fabrication', 'Exhibit fixtures'],
  ['Pinebox Packaging', 'pinebox', 'Nora Brown', 'Studio supplies', 'Custom mailer cartons'],
  ['Mesa Color Lab', 'mesacolor', 'Victor Ruiz', 'Printing', 'Color calibration proofs'],
  ['Daymark Equipment', 'daymark', 'Ruth Cole', 'Studio supplies', 'Equipment rental'],
  ['August Field Electric', 'augustfield', 'Leo Greene', 'Facilities', 'Lighting service'],
  ['Woven Studio Textiles', 'woventextiles', 'Ada James', 'Studio supplies', 'Linen swatch sets'],
  ['Borough Sign Works', 'boroughsign', 'Elena Ward', 'Fabrication', 'Wayfinding panels'],
  ['Halcyon Archive Systems', 'halcyonarchive', 'Calvin Hart', 'Software', 'Archive subscription'],
  ['Reedline Consulting', 'reedline', 'Olivia Stone', 'Professional services', 'Project consultation'],
  ['Northbank Couriers', 'northbank', 'Felix Long', 'Freight', 'Same-day courier service'],
  ['Tern Workspace Supply', 'ternsupply', 'Sofia Young', 'Studio supplies', 'Workroom replenishment'],
  ['Clearcrest Security', 'clearcrest', 'Dante King', 'IT services', 'Access review'],
  ['Parallel Press House', 'parallelpress', 'Ari Moss', 'Printing', 'Publication binding'],
  ['Copperlane Metals', 'copperlane', 'Mina Hall', 'Fabrication', 'Cut aluminum stock'],
  ['Fallow Office Care', 'fallowcare', 'Ivan Ross', 'Facilities', 'Weekly cleaning'],
  ['Harborlight Storage', 'harborlight', 'Amelia West', 'Facilities', 'Storage unit rental'],
  ['Stillwell Research', 'stillwell', 'Eli Brooks', 'Professional services', 'Survey analysis'],
  ['Pallet & Post Logistics', 'palletpost', 'Mara Quinn', 'Freight', 'Crated shipment'],
  ['Dovetail Deskworks', 'dovetaildesk', 'Hugo Wang', 'Studio supplies', 'Workstation accessories'],
  ['Tallgrass Digital', 'tallgrass', 'Asha White', 'Software', 'Asset review subscription'],
  ['Linden Proofing', 'lindenproof', 'Tess Grant', 'Printing', 'Contract proofs'],
  ['Orchard Glassworks', 'orchardglass', 'Miles Gray', 'Fabrication', 'Display glazing'],
  ['Blue Quarry Systems', 'bluequarry', 'Lena Ray', 'IT services', 'Device provisioning'],
  ['Redfern Bookkeeping', 'redfern', 'Gabe Wood', 'Professional services', 'Month-end support'],
]

const pad = number => String(number).padStart(3, '0')
const date = (month, day) => `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const stamp = (day, time) => `${day}T${time}:00.000Z`
const actor = users[0].id

export function createInitialData() {
  const vendors = suppliers.map(([name, domain, contactName, category], index) => {
    const paymentMethods = index % 4 === 1 ? ['check'] : index % 4 === 3 ? ['ach'] : ['ach', 'check']
    return {
      id: `ven_${pad(index + 1)}`, name, email: `invoices@${domain}.example`, contactName, category,
      paymentMethods, defaultPaymentMethod: paymentMethods[0],
    }
  })
  const bills = []
  const approvals = []
  const payments = []
  const activity = []

  function addEvent(type, bill, createdAt, actorId = actor, approvalId = null, paymentId = null) {
    activity.push({
      id: `evt_${pad(activity.length + 1)}`, type, billId: bill.id, vendorId: bill.vendorId,
      approvalId, paymentId, actorId, createdAt, amount: bill.amount, currency: bill.currency,
    })
  }

  for (let number = 1; number <= 72; number++) {
    const vendorIndex = number === 45 ? 8 : (number - 1) % vendors.length
    const vendor = vendors[vendorIndex]
    const suffix = pad(number)
    const approvalStatus = number <= 10 ? 'draft' : number <= 26 ? 'pending' : number <= 32 ? 'denied' : 'approved'
    const paymentStatus = number <= 44 ? 'unpaid' : number <= 52 ? 'scheduled' : number <= 56 ? 'processing' : 'paid'
    const invoiceDate = number === 1 ? date(11, 9)
      : date(number > 56 ? 9 + number % 2 : number < 33 ? 11 : 10 + number % 2, 1 + number % 10)
    const dueDate = number === 1 ? date(12, 9) : date(number > 56 ? 10 + number % 2 : 11 + number % 2, 12 + number % 17)
    const createdAt = stamp(invoiceDate, '13:30')
    const lineCount = 1 + (number - 1) % 4
    const lineItems = Array.from({ length: lineCount }, (_, index) => {
      const descriptions = [suppliers[vendorIndex][4], 'Handling and preparation', 'Additional materials', 'On-site support']
      const quantity = number === 1 ? 3 : 1 + (number + index * 3) % 9
      const cents = number === 1 ? 7750 : 1200 + (number * 1879 + index * 2417) % 54000
      return { id: `line_${suffix}_${index + 1}`, description: descriptions[index], quantity, unitPrice: cents / 100, amount: cents * quantity / 100 }
    })
    const bill = {
      id: `bill_${suffix}`, vendorId: vendor.id,
      invoiceNumber: ({ 1: 'CLP-1047', 27: 'RF-REVIEW-1027', 33: 'CLP-PAY-1033', 34: 'AFP-CHECK-1034', 45: 'WD-SCHED-1045' })[number]
        || `${suppliers[vendorIndex][1].slice(0, 3).toUpperCase()}-${1000 + number}`,
      invoiceDate, dueDate, memo: number === 1 ? 'Stock for the winter materials library' : `${suppliers[vendorIndex][4]} for the studio`,
      lineItems, amount: lineItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100,
      currency: 'USD', approvalStatus, approvalId: approvalStatus === 'draft' ? null : `apr_${suffix}`,
      paymentStatus, createdBy: actor, createdAt, updatedBy: actor, updatedAt: createdAt,
    }
    bills.push(bill)
    addEvent('bill_created', bill, createdAt)

    if (approvalStatus !== 'draft') {
      const hasPriorDecision = number >= 11 && number <= 14
      const approverId = number <= 20 || number === 27 ? actor : users[number % users.length].id
      const submittedAt = stamp(invoiceDate, hasPriorDecision ? '16:30' : '14:00')
      const decidedAt = approvalStatus === 'pending' ? null : stamp(invoiceDate, '16:00')
      if (hasPriorDecision) {
        const previousId = `apr_${suffix}_prior`
        const previousSubmittedAt = stamp(invoiceDate, '14:00')
        const previousDecidedAt = stamp(invoiceDate, '15:00')
        approvals.push({
          id: previousId, billId: bill.id, approverId, status: 'denied', createdBy: actor,
          createdAt: previousSubmittedAt, decisionNote: 'Confirm quantities against the purchase order.',
          decidedBy: approverId, decidedAt: previousDecidedAt,
        })
        addEvent('approval_submitted', bill, previousSubmittedAt, actor, previousId)
        addEvent('approval_denied', bill, previousDecidedAt, approverId, previousId)
      }
      approvals.push({
        id: bill.approvalId, billId: bill.id, approverId, status: approvalStatus, createdBy: actor,
        createdAt: submittedAt, decisionNote: approvalStatus === 'denied' ? 'Please attach the revised cost breakdown to the invoice description.' : null,
        decidedBy: decidedAt ? approverId : null, decidedAt,
      })
      addEvent('approval_submitted', bill, submittedAt, actor, bill.approvalId)
      if (decidedAt) addEvent(`approval_${approvalStatus}`, bill, decidedAt, approverId, bill.approvalId)
      bill.updatedAt = decidedAt || submittedAt
      bill.updatedBy = decidedAt ? approverId : actor
    }

    function addPayment(status, created, processDate) {
      const cancelledAt = status === 'cancelled' ? stamp(invoiceDate, '17:15') : null
      const payment = {
        id: `pmt_${pad(payments.length + 1)}`, reference: `PAY-${1000 + number}${cancelledAt ? '-C' : ''}`,
        billId: bill.id, vendorId: vendor.id, fundingAccountId: fundingAccounts[number % 2].id,
        method: vendor.defaultPaymentMethod, processDate, amount: bill.amount, currency: bill.currency,
        status, memo: number === 45 ? 'November production run' : '',
        createdBy: actor, createdAt: created, cancelledBy: cancelledAt ? actor : null, cancelledAt,
      }
      payments.push(payment)
      addEvent('payment_scheduled', bill, created, actor, null, payment.id)
      if (cancelledAt) addEvent('payment_cancelled', bill, cancelledAt, actor, null, payment.id)
      bill.updatedAt = cancelledAt || created
      bill.updatedBy = actor
    }
    if (number >= 35 && number <= 42) addPayment('cancelled', stamp(invoiceDate, '17:00'), dueDate)
    if (paymentStatus !== 'unpaid') {
      const processDate = number === 45 ? date(11, 23)
        : paymentStatus === 'scheduled' ? date(11, 21 + number % 8) : date(11, 11 + number % 7)
      addPayment(paymentStatus, stamp(invoiceDate, '18:00'), processDate)
    }
  }
  return {
    account: { ...account },
    users: users.map(user => ({ ...user })),
    vendors,
    fundingAccounts: fundingAccounts.map(funding => ({ ...funding })),
    bills, approvals, payments, activity,
  }
}
