const locations = [
  ['Portland', 'OR', '97205', 'Cedar Station', '85 Juniper Row'],
  ['Seattle', 'WA', '98109', 'Lakeview', '122 Mercer Walk'],
  ['Denver', 'CO', '80206', 'Cherry Creek', '47 Willow Lane'],
  ['Boston', 'MA', '02118', 'South End', '61 Chandler Court'],
  ['Austin', 'TX', '78704', 'Bluebonnet', '94 Barton Terrace'],
  ['Chicago', 'IL', '60614', 'Lakewood', '218 Lincoln Walk'],
  ['Madison', 'WI', '53703', 'Capitol Square', '83 Wilson Court'],
  ['Sacramento', 'CA', '95816', 'River Park', '119 Almond Way'],
  ['Minneapolis', 'MN', '55408', 'Lakeside', '57 Lyndale Terrace'],
  ['Pittsburgh', 'PA', '15206', 'Highland Park', '168 Summit Row'],
  ['Salt Lake City', 'UT', '84105', 'Liberty Park', '88 Hawthorn Court'],
  ['Raleigh', 'NC', '27605', 'Oakwood', '55 Brookside Drive'],
  ['Richmond', 'VA', '23220', 'Museum District', '42 Grove Terrace'],
  ['Santa Fe', 'NM', '87501', 'Arroyo', '110 Pinyon Way'],
  ['Burlington', 'VT', '05401', 'Maple Landing', '41 Maple Court'],
  ['Columbus', 'OH', '43215', 'Scioto', '73 Olentangy Place'],
  ['Atlanta', 'GA', '30306', 'Virginia Highland', '115 Fern Avenue'],
  ['Tucson', 'AZ', '85719', 'Catalina', '128 Mesquite Lane'],
  ['Providence', 'RI', '02906', 'College Hill', '64 Elm Terrace'],
  ['Boise', 'ID', '83702', 'Foothills', '107 Cottonwood Way'],
  ['Nashville', 'TN', '37206', 'Eastwood', '89 Tulip Grove'],
  ['New Orleans', 'LA', '70115', 'Garden District', '56 Cypress Court'],
  ['Buffalo', 'NY', '14222', 'Elmwood', '83 Birch Place'],
  ['Grand Rapids', 'MI', '49503', 'Heritage Hill', '176 Fulton Walk'],
]

const movers = [
  'Jordan Rivera', 'Amelia Chen', 'Devon Price', 'Sofia Morales', 'Ellis Stone', 'Maya Brooks',
  'Leah Park', 'Adrian Bell', 'Rosa Patel', 'Caleb Green', 'Nora Nguyen', 'Isaac Hayes',
  'Zoe Flores', 'Evan Ross', 'Iris Kim', 'Miles Davis', 'Clara Ortiz', 'Sam Reed',
  'Avery Morgan', 'Owen Walsh', 'Lina Gomez', 'Micah Taylor', 'Riley Scott', 'Theo Martin',
]
const items = ['Ceramic mugs', 'Field notebook', 'Canvas tote', 'Desk lamp', 'Wool scarf', 'Framed print']
const sizes = ['xs', 's', 'm', 'l', 'xl']
const mailServices = ['priority_mail_express', 'priority_mail', 'ground_advantage', 'insured_mail']

const seq = (index, width = 3) => String(index + 1).padStart(width, '0')
const makeId = (prefix, index) => prefix + '-' + seq(index)
const code = (prefix, index) => prefix + '-' + (10482 + index)
const date = (month, day) => '2026-' + month + '-' + String(day).padStart(2, '0')
const stamp = (day, hour) => day + 'T' + hour + ':00:00.000Z'
const metadata = (prefix, i, day, hour) => ({ id: makeId(prefix, i), createdAt: stamp(day, hour), createdBy: 'account-001' })

function address(i, street) {
  const [city, state, zip, , line1] = locations[i]
  return { line1: street || line1, city, state, zip }
}

function makeOffice(location, i) {
  const inventory = Object.fromEntries(sizes.map((size, s) => {
    const base = 28 + i % 8 * 2 + s * 12
    return [size, { available: (i + s + 2) % 5, prices: { 3: base, 6: base * 2 - 4, 12: base * 4 - 12 } }]
  }))
  return { id: makeId('office', i), name: location[3] + ' Post Office', address: address(i, (301 + i * 8) + ' Station Avenue'), inventory }
}

export function createInitialData() {
  const account = {
    id: 'account-001',
    fullName: 'Jordan Rivera',
    email: 'jordan.rivera@example.com',
    mailingAddress: { ...address(0, '214 Alder Loop'), line2: 'Unit 4B' },
  }
  const postOffices = locations.map(makeOffice)
  const changeOfAddressRequests = movers.map((name, i) => {
    const scheduled = i < 5
    const temporary = i % 3 === 0
    return {
      ...metadata('coa', i, date(scheduled ? '11' : '08', 17 - i % 14), '14'),
      confirmationCode: String(42 + i).padStart(16, '0'),
      status: scheduled ? 'scheduled' : i % 5 === 0 ? 'cancelled' : 'completed',
      moveType: ['family', 'individual', 'business'][i % 3],
      forwardingType: temporary ? 'temporary' : 'permanent',
      moverName: i % 3 === 2 ? name.split(' ')[1] + ' Studio' : name,
      contactEmail: name.toLowerCase().replace(' ', '.') + '@example.com',
      oldAddress: i === 0 ? account.mailingAddress : address(i, (40 + i) + ' Garden Lane'),
      newAddress: address(i),
      startDate: date(scheduled ? '12' : '09', 3 + i),
      endDate: temporary ? (scheduled ? '2027-01-02' : date('10', 3 + i)) : null,
      ...(!scheduled && i % 5 === 0 ? { cancelledAt: stamp(date('08', 24), '13'), cancelledBy: account.id, updatedAt: stamp(date('08', 24), '13'), updatedBy: account.id } : {}),
    }
  })
  const holdMailRequests = locations.map((_, i) => {
    const scheduled = i < 5
    const cancelled = !scheduled && i % 5 === 0
    return {
      ...metadata('hold', i, date(scheduled ? '11' : '09', 17 - i % 13), '15'),
      confirmationCode: code('HM', i),
      status: scheduled ? 'scheduled' : cancelled ? 'cancelled' : 'completed',
      address: i === 0 ? account.mailingAddress : address(i),
      startDate: date(scheduled ? '12' : '10', 5 + i % 17),
      endDate: date(scheduled ? '12' : '10', 9 + i % 17 + i % 4),
      durationDays: 5 + i % 4,
      deliveryMethod: i % 2 ? 'carrier_delivery' : 'post_office_pickup',
      ...(cancelled ? { cancelledAt: stamp(date('09', 24), '13'), cancelledBy: account.id, updatedAt: stamp(date('09', 24), '13'), updatedBy: account.id } : {}),
    }
  })
  const packageClaims = locations.map((_, i) => {
    const status = ['draft', 'submitted', 'under_review', 'approved', 'denied'][i % 5]
    const created = metadata('claim', i, date('11', 17 - Math.ceil(i * 0.6)), '16')
    const reason = ['damaged', 'lost', 'missing_contents'][i % 3]
    const evidenceKinds = ['proof_of_value', 'proof_of_insurance', ...(reason === 'damaged' ? ['proof_of_damage'] : [])]
    return {
      ...created, status,
      trackingNumber: '940012345678901234' + seq(i, 4),
      mailingDate: date('10', 13 + i % 11),
      mailService: mailServices[i % 4],
      claimantRole: i % 2 ? 'sender' : 'recipient',
      senderAddress: address((i + 1) % 24),
      recipientAddress: i === 0 ? account.mailingAddress : address(i),
      reason,
      items: [{ id: makeId('item', i), description: items[i % items.length], quantity: 2, unitValue: 18.50 + i }],
      evidence: evidenceKinds.slice(0, status === 'draft' ? 1 : undefined).map((kind, index) => ({
        id: created.id + '-evidence-' + (index + 1),
        kind, fileName: kind.replaceAll('_', '-') + '.pdf', mimeType: 'application/pdf', sizeBytes: 14928 + index * 818,
      })),
      claimAmount: 37 + 2 * i,
      currency: 'USD',
      ...(status === 'draft' ? {} : { confirmationCode: code('CL', i), submittedAt: created.createdAt }),
      ...(status === 'approved' || status === 'denied' ? { resolvedAt: '2026-11-18T12:00:00.000Z', approvedAmount: status === 'approved' ? 37 + 2 * i : 0 } : {}),
    }
  })
  const poBoxes = postOffices.map((office, i) => {
    const status = ['active', 'reserved', 'active', 'expired', 'closed'][i % 5]
    return {
      ...metadata('box', i, date(status === 'reserved' ? '11' : status === 'active' ? '08' : '05', status === 'reserved' ? 18 - i % 15 : status === 'active' ? i + 1 : i % 9 + 1), '17'),
      confirmationCode: code('PB', i),
      status, officeId: office.id, size: sizes[(i + 1) % 5], termMonths: 6,
      autoRenew: i % 3 === 0, applicantName: account.fullName, applicantEmail: account.email,
      mailingAddress: account.mailingAddress, termsAccepted: true,
      ...(status === 'reserved' ? {} : { boxNumber: String(421 + i * 9).padStart(4, '0'), expiresOn: status === 'active' ? '2027-02-' + seq(i, 2) : date('11', i % 9 + 1) }),
    }
  })
  const poBoxTransactions = poBoxes.map((box, i) => ({
    id: makeId('pobox-txn', i), createdAt: box.createdAt, createdBy: account.id, poBoxId: box.id,
    officeId: box.officeId, type: 'reservation', status: 'paid', currency: 'USD', quantity: 1,
    termMonths: box.termMonths, amount: postOffices[i].inventory[box.size].prices[box.termMonths], paymentMethod: 'account_payment',
  }))
  return { account, changeOfAddressRequests, holdMailRequests, packageClaims, postOffices, poBoxes, poBoxTransactions }
}
