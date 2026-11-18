import { pacificNow, services, timeZone } from './display.js'

const mayaId = 'resident-maya-chen'
const credentialId = 'dl-maya-01'
const mayaContact = { firstName: 'Maya', lastName: 'Chen', phone: '9165550142', email: 'maya.chen@example.test' }
const mayaAddress = { line1: '1818 Alder Grove Way', line2: 'Unit 4', city: 'Sacramento', state: 'CA', zip: '95818' }
const separateAddress = { line1: '930 River Walk Drive', city: 'West Sacramento', state: 'CA', zip: '95691' }
const serviceKeys = Object.keys(services)

const officeRows = [
  ['sacramento-broadway', 'Sacramento', '4700 Broadway', 'Sacramento', '95820', 'Sacramento Valley', 48, 30],
  ['sacramento-south', 'South Sacramento', '7775 La Mancha Way', 'Sacramento', '95823', 'Sacramento Valley', 51, 33],
  ['sacramento-north', 'Sacramento North', '5209 North Avenue', 'Carmichael', '95608', 'Sacramento Valley', 51, 27],
  ['davis', 'Davis', '505 Pole Line Road', 'Davis', '95618', 'Sacramento Valley', 44, 31],
  ['woodland', 'Woodland', '825 East Street', 'Woodland', '95776', 'Sacramento Valley', 42, 27],
  ['roseville', 'Roseville', '7200 Galilee Road', 'Roseville', '95678', 'Sacramento Valley', 55, 25],
  ['san-francisco', 'San Francisco', '1377 Fell Street', 'San Francisco', '94117', 'Bay Area', 26, 34],
  ['daly-city', 'Daly City', '1500 Sullivan Avenue', 'Daly City', '94015', 'Bay Area', 25, 39],
  ['oakland', 'Oakland Coliseum', '501 85th Avenue', 'Oakland', '94621', 'Bay Area', 32, 39],
  ['hayward', 'Hayward', '150 Jackson Street', 'Hayward', '94544', 'Bay Area', 35, 43],
  ['san-mateo', 'San Mateo', '425 North Amphlett Boulevard', 'San Mateo', '94401', 'Bay Area', 30, 46],
  ['san-jose', 'San Jose', '111 West Alma Avenue', 'San Jose', '95110', 'Bay Area', 36, 51],
  ['stockton', 'Stockton', '55 South Lincoln Street', 'Stockton', '95203', 'Central Valley', 48, 41],
  ['lodi', 'Lodi', '1222 Pixley Parkway', 'Lodi', '95240', 'Central Valley', 52, 38],
  ['modesto', 'Modesto', '124 Burney Street', 'Modesto', '95354', 'Central Valley', 52, 47],
  ['fresno', 'Fresno', '655 West Olive Avenue', 'Fresno', '93728', 'Central Valley', 57, 56],
  ['clovis', 'Clovis', '2103 Shaw Avenue', 'Clovis', '93611', 'Central Valley', 62, 54],
  ['visalia', 'Visalia', '1711 East Main Street', 'Visalia', '93292', 'Central Valley', 63, 60],
  ['bakersfield', 'Bakersfield', '3120 F Street', 'Bakersfield', '93301', 'Central Valley', 63, 66],
  ['los-angeles', 'Los Angeles', '3615 South Hope Street', 'Los Angeles', '90007', 'Los Angeles', 64, 76],
  ['hollywood', 'Hollywood', '803 Cole Avenue', 'Los Angeles', '90038', 'Los Angeles', 59, 73],
  ['culver-city', 'Culver City', '11400 Washington Boulevard', 'Los Angeles', '90066', 'Los Angeles', 56, 77],
  ['pasadena', 'Pasadena', '49 South Rosemead Boulevard', 'Pasadena', '91107', 'Los Angeles', 68, 73],
  ['glendale', 'Glendale', '1335 West Glenoaks Boulevard', 'Glendale', '91201', 'Los Angeles', 63, 70],
  ['long-beach', 'Long Beach', '3700 East Willow Street', 'Long Beach', '90815', 'Los Angeles', 65, 81],
  ['pomona', 'Pomona', '1600 South Garey Avenue', 'Pomona', '91766', 'Inland Empire', 73, 75],
  ['riverside', 'Riverside', '6280 Brockton Avenue', 'Riverside', '92506', 'Inland Empire', 81, 78],
  ['san-bernardino', 'San Bernardino', '1310 North Waterman Avenue', 'San Bernardino', '92404', 'Inland Empire', 82, 71],
  ['redlands', 'Redlands', '1659 West Lugonia Avenue', 'Redlands', '92374', 'Inland Empire', 86, 74],
  ['anaheim', 'Anaheim', '3170 West Lincoln Avenue', 'Anaheim', '92801', 'Orange County', 69, 79],
  ['santa-ana', 'Santa Ana', '1330 East First Street', 'Santa Ana', '92701', 'Orange County', 72, 84],
  ['laguna-hills', 'Laguna Hills', '23535 Moulton Parkway', 'Laguna Hills', '92653', 'Orange County', 77, 86],
  ['oceanside', 'Oceanside', '4005 Plaza Drive', 'Oceanside', '92056', 'San Diego', 81, 89],
  ['san-diego', 'San Diego', '3960 Normal Street', 'San Diego', '92103', 'San Diego', 85, 94],
  ['chula-vista', 'Chula Vista', '30 North Glover Avenue', 'Chula Vista', '91910', 'San Diego', 88, 97],
  ['merced', 'Merced', '1313 West 12th Street', 'Merced', '95341', 'Central Valley', 55, 51],
]

const givenNames = ['Jordan', 'Alicia', 'Daniel', 'Sofia', 'Priya', 'Isaiah', 'Mina', 'Elena', 'Caleb', 'Lena', 'Luis', 'Nadia']
const surnames = ['Ramirez', 'Nguyen', 'Patel', 'Greene', 'Lopez', 'Owens', 'Park', 'Reed', 'Morales', 'Bennett', 'Kim', 'Hernandez']
const models = [
  ['automobile', 2021, 'Toyota', 'Corolla'],
  ['automobile', 2019, 'Subaru', 'Outback'],
  ['automobile', 2018, 'Honda', 'Civic'],
  ['motorcycle', 2023, 'Yamaha', 'MT-07'],
  ['trailer', 2019, 'Big Tex', 'Utility Trailer'],
  ['vessel', 2022, 'Boston Whaler', 'Montauk'],
  ['automobile', 2020, 'Ford', 'Escape'],
  ['automobile', 2024, 'Hyundai', 'Tucson'],
  ['automobile', 2017, 'Mazda', 'CX-5'],
  ['automobile', 2022, 'Kia', 'Sportage'],
  ['automobile', 2021, 'Ford', 'F-150'],
  ['automobile', 2020, 'Chevrolet', 'Bolt EV'],
]
const streets = ['Willow Creek Drive', 'Cedar Bluff Lane', 'Pine Ridge Avenue', 'Orchard Park Way', 'Sycamore Court', 'Canyon View Drive']
const times = ['08:30', '10:15', '13:15', '08:30', '11:00', '14:30']
const pad = (number, digits = 2) => String(number).padStart(digits, '0')

function dayFrom(date, offset) {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + offset)
  return day
}

function civilDate(date, offset, weekday = false) {
  const day = dayFrom(date, offset)
  if (weekday && day.getUTCDay() === 6) day.setUTCDate(day.getUTCDate() + 2)
  if (weekday && day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}

function termEnd(date) {
  const day = dayFrom(date, 0)
  day.setUTCFullYear(day.getUTCFullYear() + 1)
  return day.toISOString().slice(0, 10)
}

function owner(index) {
  if (index < 4) return { id: mayaId, contact: mayaContact }
  const firstName = givenNames[(index - 4) % givenNames.length]
  const lastName = surnames[(index * 5 + Math.floor(index / givenNames.length)) % surnames.length]
  return {
    id: `resident-${pad(index + 1, 3)}`,
    contact: { firstName, lastName, phone: `91655501${pad(index)}`, email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.test` },
  }
}

function feeLine(code, label, amount) {
  const value = amount.toFixed(2)
  return { code, label, quantity: 1, unitAmount: value, amount: value }
}

function feeLines(index) {
  return [
    feeLine('registration', 'Registration fee', 74),
    feeLine('vehicle_license', 'Vehicle license fee', 120 + (index % 7) * 9),
    feeLine('other', 'Other registration fees', 70 + (index % 5) * 3),
  ]
}

function officeServices(index) {
  if (index === 1) return [serviceKeys[0], serviceKeys[1], serviceKeys[2], serviceKeys[4]]
  return serviceKeys.filter((_, service) => service < 4 || service === 4 && index % 3 === 0 || service === 5 && index % 2 === 0)
}

export function createInitialData() {
  const { date } = pacificNow()
  const offices = officeRows.map(([key, name, line1, city, zip, region, x, y], index) => ({
    id: `office-${key}`, name, address: { line1, city, state: 'CA', zip }, region,
    serviceTypes: officeServices(index),
    hours: [{ days: 'Mon–Tue, Thu–Fri', opens: '08:00', closes: '17:00' }, { days: 'Wed', opens: '09:00', closes: '17:00' }],
    mapPosition: { x, y },
  }))

  const futureSlots = offices.slice(0, -1).flatMap((office) => times.map((time, index) => {
    const officeDate = civilDate(date, index < 3 ? 2 : 6, true)
    const isWednesday = dayFrom(officeDate, 0).getUTCDay() === 3
    return {
      id: `slot-${office.id.slice(7)}-${pad(index + 1, 3)}`, officeId: office.id,
      serviceTypes: [...office.serviceTypes], date: officeDate, time: isWednesday && time < '09:00' ? '09:15' : time,
    }
  }))
  const historySlots = offices.map((office, index) => ({
    id: `slot-${office.id.slice(7)}-history`, officeId: office.id, serviceTypes: [...office.serviceTypes],
    date: civilDate(date, -139 + (index * 3), true), time: '10:30',
  }))
  const appointments = [futureSlots[1], ...historySlots.slice(0, 35)].map((slot, index) => {
    const actor = index < 2 ? owner(0) : owner(4 + index)
    const status = index === 0 ? 'scheduled' : index % 4 === 1 ? 'cancelled' : index % 4 === 0 ? 'scheduled' : 'completed'
    return {
      id: `appt-${pad(index + 1, 3)}`, actorId: actor.id,
      serviceType: index === 0 ? 'automobile_drive_test' : slot.serviceTypes[index % slot.serviceTypes.length],
      officeId: slot.officeId, slotId: slot.id, date: slot.date, time: slot.time, timeZone,
      contact: { ...actor.contact }, confirmationCode: `APT-${pad(2481 + index, 6)}`, status,
      createdAt: `${civilDate(slot.date, -7)}T18:40:00.000Z`,
      ...(status === 'cancelled' ? { cancelledAt: `${civilDate(slot.date, -1)}T19:20:00.000Z` } : {}),
    }
  })

  const vehicles = Array.from({ length: 48 }, (_, index) => {
    const [type, year, make, model] = models[index < 6 ? index : index % models.length]
    const actor = owner(index)
    const business = index === 16 ? 'Sierra Garden Supply LLC' : null
    return {
      id: index < 4 ? `vehicle-maya-${pad(index + 1)}` : `vehicle-${pad(index + 1, 3)}`,
      ownerId: actor.id,
      registeredOwnerName: business || `${actor.contact.firstName} ${actor.contact.lastName}`,
      registeredOwnerLookupName: business || actor.contact.lastName,
      type, year, make, model,
      plateNumber: index === 0 ? '8TYC214' : type === 'vessel' ? `CF${8140 + index}KW` : `${7 + index % 3}${['NLP', 'SFK', 'KVM', 'FRN', 'DJC'][index % 5]}${232 + index * 11}`,
      vinHinSuffix: index === 0 ? '24680' : index === 5 ? 'K7' : pad(3170 + index * 51, 5),
    }
  })

  const registrations = vehicles.map((vehicle, index) => {
    const id = vehicle.id.replace('vehicle-', 'reg-')
    const hasHistory = index === 1 || index >= 13
    const expired = [4, 8, 11].includes(index)
    const expirationDate = civilDate(date, hasHistory ? 240 + index : expired ? -index : 20 + index)
    const office = offices[index % offices.length]
    const residentialAddress = index < 3 ? { ...mayaAddress } : index === 3 ? { ...separateAddress } : {
      line1: `${611 + index * 24} ${streets[index % streets.length]}`, city: office.address.city, state: 'CA', zip: office.address.zip,
    }
    return {
      id, vehicleId: vehicle.id, status: hasHistory ? 'active' : expired ? 'expired' : 'due', expirationDate,
      residentialAddress,
      ...(index % 6 === 0 ? {} : { mailingAddress: index % 6 === 4 ? { ...residentialAddress, line1: `P.O. Box ${1600 + index}` } : null }),
      insuranceStatus: index === 2 ? 'missing' : ['trailer', 'vessel'].includes(vehicle.type) ? 'not_required' : 'on_file',
      smogStatus: index === 7 ? 'missing' : index % 3 === 1 ? 'on_file' : 'not_required',
      renewalOffer: hasHistory || index === 3 ? null : { id: `offer-${id}-current`, termEndDate: termEnd(expirationDate), feeLines: feeLines(index) },
      lastRenewalId: hasHistory ? `rnw-${pad(index === 1 ? 1 : index - 11, 4)}` : null,
    }
  })

  const registrationRenewals = registrations.flatMap((registration, index) => {
    if (!registration.lastRenewalId) return []
    const vehicle = vehicles[index]
    const lines = feeLines(index)
    const cents = lines.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0)
    const card = index % 3 !== 0
    const fee = card ? Math.round(cents * .0195) : 0
    const previousExpiration = dayFrom(registration.expirationDate, 0)
    previousExpiration.setUTCFullYear(previousExpiration.getUTCFullYear() - 1)
    return [{
      id: registration.lastRenewalId, actorId: vehicle.ownerId, vehicleId: vehicle.id,
      registrationId: registration.id, offerId: `offer-${registration.id}-previous`,
      previousExpirationDate: previousExpiration.toISOString().slice(0, 10), newExpirationDate: registration.expirationDate,
      feeLines: lines, subtotal: (cents / 100).toFixed(2), processingFee: (fee / 100).toFixed(2), total: ((cents + fee) / 100).toFixed(2),
      paymentMethod: card ? 'card' : 'bank_account', mailingAddress: registration.mailingAddress ?? registration.residentialAddress,
      confirmationCode: `RNL-${pad(4782 + index, 6)}`, status: index % 5 === 0 ? 'paid' : 'issued',
      createdAt: `${civilDate(date, -93 + index)}T18:50:00.000Z`,
    }]
  })

  const addressChangeRequests = Array.from({ length: 36 }, (_, index) => {
    const vehicleIndex = index < 3 ? index : index + 4
    const vehicle = vehicles[vehicleIndex]
    const registration = registrations[vehicleIndex]
    const credential = index < 2 || index > 2 && (index % 3 !== 2 || index % 5 === 4)
    const forVehicle = index !== 1 && index % 5 !== 4
    const targetCredential = credential ? (index < 2 ? credentialId : `dl-resident-${pad(vehicleIndex + 1, 3)}`) : null
    const submitted = index === 1 || index > 2 && index % 5 === 0
    const elapsed = index === 1 ? 1 : 8 + index * 2
    const address = registration.residentialAddress
    const proposed = index === 1 ? { line1: '2447 Juniper Bend Drive', city: 'Davis', state: 'CA', zip: '95616' } : { ...address }
    const oldAddress = { line1: `${120 + index * 19} ${streets[(index + 1) % streets.length]}`, city: address.city, state: address.state, zip: address.zip }
    return {
      id: `coa-${pad(index + 1, 4)}`, actorId: vehicle.ownerId,
      credentialId: targetCredential, vehicleIds: forVehicle ? [vehicle.id] : [], registrationIds: forVehicle ? [registration.id] : [],
      previousAddresses: [
        ...(credential ? [{ type: 'credential', id: targetCredential, residentialAddress: index === 1 ? { ...mayaAddress } : oldAddress, mailingAddress: null }] : []),
        ...(forVehicle ? [{ type: 'registration', id: registration.id, residentialAddress: oldAddress, mailingAddress: null }] : []),
      ],
      newResidentialAddress: proposed, newMailingAddress: index === 1 ? { line1: 'P.O. Box 1624', city: 'Davis', state: 'CA', zip: '95617' } : null,
      confirmationCode: `COA-${pad(6318 + index, 6)}`, status: submitted ? 'submitted' : 'completed',
      createdAt: `${civilDate(date, -elapsed)}T18:55:00.000Z`,
      ...(submitted ? {} : { completedAt: `${civilDate(date, -elapsed + 2)}T20:45:00.000Z` }),
    }
  })

  return {
    profile: {
      id: mayaId, contact: { ...mayaContact }, garageVehicleIds: vehicles.slice(0, 4).map((vehicle) => vehicle.id),
      credential: { id: credentialId, number: 'X2468013', type: 'DL', expirationDate: civilDate(date, 913), residentialAddress: { ...mayaAddress }, mailingAddress: null },
      canChangeAddressOnline: true,
    },
    offices, appointmentSlots: [...futureSlots, ...historySlots], appointments, vehicles, registrations, registrationRenewals, addressChangeRequests,
  }
}
