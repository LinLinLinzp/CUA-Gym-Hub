import { daysFrom, lineItem, localInstant, pickupWindow, todayAt } from '../domain.js'

const idFor = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const vaccinesCatalog = [
  ['flu', 'Flu (influenza)'], ['covid', 'COVID-19'], ['tdap', 'Tdap'],
  ['shingles', 'Shingles'], ['pneumococcal', 'Pneumococcal'], ['rsv', 'RSV'],
  ['hepa', 'Hepatitis A'], ['hepb', 'Hepatitis B'],
]
const locations = [
  ['Maple Square', '184 Maple Square', 'Brookline', '02446'],
  ['Beacon Commons', '710 Beacon Walk', 'Newton', '02459'],
  ['Cedar Point', '42 Cedar Landing', 'Somerville', '02143'],
  ['Porter Crossing', '105 Porter Court', 'Cambridge', '02140'],
  ['Willow Lane', '260 Willow Lane', 'Medford', '02155'],
  ['Harbor Square', '91 Harbor Square', 'Boston', '02128'],
  ['Arbor Hill', '17 Arbor Rise', 'Jamaica Plain', '02130'],
  ['Oak Terrace', '450 Oak Terrace', 'Quincy', '02169'],
  ['Birch Village', '783 Birch Place', 'Dedham', '02026'],
  ['Riverbend', '36 Riverbend Way', 'Watertown', '02472'],
  ['Juniper Center', '192 Juniper Road', 'Waltham', '02453'],
  ['Chestnut Grove', '520 Chestnut Grove', 'Needham', '02492'],
]
const medications = [
  ['Atorvastatin', '20 mg', 30], ['Lisinopril', '10 mg', 90], ['Metformin ER', '500 mg', 60],
  ['Levothyroxine', '50 mcg', 30], ['Amlodipine', '5 mg', 30], ['Sertraline', '50 mg', 30],
  ['Losartan', '25 mg', 30], ['Omeprazole', '20 mg', 30, 'capsules'], ['Rosuvastatin', '10 mg', 90],
  ['Bupropion XL', '150 mg', 30], ['Cetirizine', '10 mg', 30], ['Hydrochlorothiazide', '25 mg', 30],
  ['Famotidine', '20 mg', 60], ['Montelukast', '10 mg', 30], ['Vitamin D3', '1,000 IU', 30],
  ['Escitalopram', '10 mg', 30], ['Naproxen', '250 mg', 30], ['Doxycycline', '100 mg', 14, 'capsules'],
]

export function createInitialData() {
  const now = new Date()
  const zone = 'America/New_York'
  const today = todayAt({ timeZone: zone }, now)
  const date = (offset) => daysFrom(today, offset)
  const instant = (offset, time = '12:00') => localInstant(date(offset), time, zone)
  const account = { id: 'acct-001', name: 'Morgan Ellis', preferredStoreId: 'store-001' }
  const patients = [
    { id: 'patient-001', name: 'Morgan Ellis', relationship: 'self' },
    { id: 'patient-002', name: 'Jamie Ellis', relationship: 'partner' },
    { id: 'patient-003', name: 'Avery Ellis', relationship: 'dependent' },
  ]
  const vaccines = vaccinesCatalog.map(([id, name]) => ({ id: 'vax-' + id, name }))
  const stores = locations.map(([label, street, city, postalCode], index) => ({
    id: idFor('store', index), name: 'CVS Pharmacy · ' + label, storeNumber: String(1001 + index).padStart(5, '0'),
    address: { street, city, region: 'MA', postalCode }, timeZone: zone, driveThru: index % 3 === 0,
    vaccineIds: vaccines.filter((_, option) => index < 2 || option < 3 || (index + option) % 3 !== 0).map(({ id }) => id),
    pickupWindowStarts: ['09:00', '11:00', '14:00', '16:00', '18:00'],
    vaccineSlotTimes: ['09:30', '10:00', '11:30', '14:30', '16:00'],
    serviceDays: index % 4 === 3 ? [1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6],
  }))
  const prescriptions = Array.from({ length: 36 }, (_, index) => {
    const [medication, strength, quantity, unit = 'tablets'] = medications[index % medications.length]
    const variation = index % 12
    return {
      id: idFor('rx', index), rxNumber: String(6528014 + index * 37),
      patientId: patients[Math.floor(index / 12)].id, medication, strength, quantity, unit,
      storeId: stores[Math.floor(index / 12) * 2 + (index > 11 ? index % 2 : 0)].id,
      status: variation === 5 ? 'inactive' : 'active', hidden: variation === 4,
      refillsRemaining: variation === 7 ? 0 : 1 + index % 4,
      lastFilledOn: date(-28 - index % 22), nextRefillOn: date(variation === 3 ? 9 : -3 - index % 5),
      expiresOn: date(variation === 6 ? -4 : 120 + index),
      estimatedCopay: [8.5, 12, 5, 16.4, 3.75, 10, 22.5][index % 7],
      prescriber: ['Jordan Rivera', 'Taylor Park', 'Devin Brooks'][index % 3],
      createdAt: instant(-400 + index), createdBy: 'pharmacy-staff',
    }
  })
  const pickupOrders = Array.from({ length: 36 }, (_, index) => {
    const rx = prescriptions[index < 6 ? [8, 20, 32, 9, 21, 33][index] : index]
    const status = index < 2 ? 'ready' : index < 4 ? 'preparing' : index < 6 ? 'checked_in' : index % 9 === 0 ? 'cancelled' : 'picked_up'
    const startsAt = instant(index < 4 ? 1 + index % 3 : index < 6 ? -1 : -7 - index * 3, '14:00')
    return {
      id: idFor('pickup', index), patientId: rx.patientId, storeId: rx.storeId,
      items: [lineItem(rx)], estimatedTotal: rx.estimatedCopay, pickupWindow: pickupWindow(startsAt), status,
      ...(index < 30 ? { refillOrderId: idFor('refill', index) } : {}),
      ...(index < 2 ? { pickupCode: 'P' + (41826 + index * 29) } : {}),
      ...(status === 'checked_in' ? { checkInMethod: 'counter', checkedInAt: instant(-1, '14:10'), checkedInBy: account.id, updatedAt: instant(-1, '14:10'), updatedBy: account.id } : {}),
      createdAt: instant(index < 6 ? -4 : -8 - index * 3), createdBy: index < 30 ? account.id : 'pharmacy-staff',
    }
  })
  const refillOrders = pickupOrders.slice(0, 30).map((pickup) => ({
    id: pickup.refillOrderId, pickupOrderId: pickup.id, patientId: pickup.patientId, storeId: pickup.storeId,
    items: pickup.items.map((item) => ({ ...item })), estimatedTotal: pickup.estimatedTotal, pickupWindow: { ...pickup.pickupWindow },
    status: pickup.status === 'picked_up' ? 'fulfilled' : pickup.status === 'cancelled' ? 'cancelled' : 'submitted',
    createdAt: pickup.createdAt, createdBy: account.id,
  }))
  const prescriptionFills = Array.from({ length: 48 }, (_, index) => {
    const rx = prescriptions[index % prescriptions.length]
    const filledOn = index < 36 ? rx.lastFilledOn : daysFrom(rx.lastFilledOn, -40 - index)
    return {
      id: idFor('fill', index), prescriptionId: rx.id, patientId: rx.patientId, storeId: rx.storeId,
      filledOn, quantity: rx.quantity, amountPaid: rx.estimatedCopay,
      createdAt: localInstant(filledOn, '13:00', zone), createdBy: 'pharmacy-staff',
    }
  })
  const vaccineAppointments = Array.from({ length: 30 }, (_, index) => {
    const store = stores[index % stores.length]
    const patient = patients[index % patients.length]
    const status = index < 6 ? 'scheduled' : index % 5 === 0 ? 'cancelled' : 'completed'
    const plannedOffset = index < 6 ? 2 + index : -12 - index * 6
    const weekday = new Date(date(plannedOffset) + 'T00:00:00Z').getUTCDay()
    const offset = store.serviceDays.includes(weekday) ? plannedOffset : plannedOffset + 1
    return {
      id: idFor('appt', index), patientId: patient.id, storeId: store.id,
      vaccineIds: index % 4 === 0 ? ['vax-flu', 'vax-tdap'] : [store.vaccineIds[index % store.vaccineIds.length]],
      scheduledFor: instant(offset, '10:00'), status, confirmationCode: 'V' + (48261 + index * 13),
      createdAt: instant(Math.min(-2, offset - 9)), createdBy: account.id,
      ...(status === 'cancelled' ? { cancelledAt: instant(offset - 2), updatedAt: instant(offset - 2), updatedBy: account.id } : {}),
    }
  })
  return { account, patients, stores, prescriptions, prescriptionFills, refillOrders, pickupOrders, vaccines, vaccineAppointments }
}
