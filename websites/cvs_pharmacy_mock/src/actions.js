import {
  actor, codeFor, find, isUpcoming, lineItem, offers, pickupSlots, pickupWindow,
  refillReason, replaceRecord, totalFor, uniqueId, vaccineSlots,
} from './domain.js'

const fail = (error) => ({ error })
const stamp = (now, by) => ({ updatedAt: now.toISOString(), updatedBy: by })

export function setVisibility(state, id, hidden) {
  const rx = find(state.prescriptions, id)
  const by = actor(state)
  if (!rx || !by || Boolean(rx.hidden) === hidden) return fail('This prescription can no longer be updated.')
  return { next: { ...state, prescriptions: replaceRecord(state.prescriptions, id, { hidden, ...stamp(new Date(), by) }) } }
}

export function submitRefill(state, { patientId, ids, storeId, startsAt }) {
  const now = new Date()
  const by = actor(state)
  const store = find(state.stores, storeId)
  const prescriptions = Array.from(new Set(ids), (id) => find(state.prescriptions, id))
  if (!by || !find(state.patients, patientId)) return fail('Choose an available patient before requesting a refill.')
  if (!prescriptions.length) return fail('Select at least one prescription.')
  if (prescriptions.some((rx) => rx?.patientId !== patientId || refillReason(state, rx, now))) {
    return fail('A selected prescription is no longer eligible. Review your selection and try again.')
  }
  if (!store || !pickupSlots(store, now).some(({ instant }) => instant === startsAt)) {
    return fail('Choose an available pickup window.')
  }
  const id = uniqueId('refill')
  const pickupId = uniqueId('pickup')
  const items = prescriptions.map(lineItem)
  const common = { patientId, storeId, items, estimatedTotal: totalFor(items), pickupWindow: pickupWindow(startsAt), createdAt: now.toISOString(), createdBy: by }
  const refill = { id, ...common, pickupOrderId: pickupId, status: 'submitted' }
  const pickup = { id: pickupId, ...common, refillOrderId: id, status: 'preparing' }
  return {
    next: {
      ...state,
      refillOrders: [...(Array.isArray(state.refillOrders) ? state.refillOrders : []), refill],
      pickupOrders: [...(Array.isArray(state.pickupOrders) ? state.pickupOrders : []), pickup],
    },
    refill,
  }
}

export function checkIn(state, id, method) {
  const order = find(state.pickupOrders, id)
  const store = find(state.stores, order?.storeId)
  const by = actor(state)
  if (order?.status !== 'ready' || !store || !by || !find(state.patients, order.patientId)) {
    return fail('This order can no longer be checked in.')
  }
  if (method !== 'counter' && !(method === 'drive_thru' && store.driveThru === true)) {
    return fail('Choose an available pickup method.')
  }
  const now = new Date()
  return {
    next: { ...state, pickupOrders: replaceRecord(state.pickupOrders, id, {
      status: 'checked_in', checkedInAt: now.toISOString(), checkedInBy: by, checkInMethod: method, ...stamp(now, by),
    }) },
  }
}

export function saveAppointment(state, { id, patientId, vaccineIds, storeId, scheduledFor }) {
  const now = new Date()
  const by = actor(state)
  const visit = find(state.vaccineAppointments, id)
  if (id && !isUpcoming(visit, now)) return fail('Only upcoming appointments can be rescheduled.')
  const patient = visit?.patientId ?? patientId
  const vaccines = visit ? visit.vaccineIds : vaccineIds
  const store = find(state.stores, storeId)
  if (!by || !find(state.patients, patient)) return fail('Choose an available patient.')
  if (!Array.isArray(vaccines) || vaccines.length < 1 || vaccines.length > 3 ||
      new Set(vaccines).size !== vaccines.length || vaccines.some((vaccineId) => !find(state.vaccines, vaccineId))) {
    return fail('Choose one to three available vaccines.')
  }
  if (!store || !offers(store, vaccines)) return fail('Choose a pharmacy that offers all selected vaccines.')
  if (!vaccineSlots(state, store, patient, now, visit).some(({ instant }) => instant === scheduledFor)) {
    return fail('Choose a different available appointment time.')
  }
  if (visit) {
    const fields = { storeId, scheduledFor, rescheduledAt: now.toISOString(), ...stamp(now, by) }
    return { next: { ...state, vaccineAppointments: replaceRecord(state.vaccineAppointments, id, fields) }, appointment: { ...visit, ...fields } }
  }
  const newId = uniqueId('appt')
  const appointment = {
    id: newId, patientId: patient, vaccineIds: vaccines, storeId, scheduledFor, status: 'scheduled',
    confirmationCode: codeFor(newId, 'V'), createdAt: now.toISOString(), createdBy: by,
  }
  return {
    next: { ...state, vaccineAppointments: [...(Array.isArray(state.vaccineAppointments) ? state.vaccineAppointments : []), appointment] },
    appointment,
  }
}

export function cancelAppointment(state, id) {
  const now = new Date()
  const by = actor(state)
  if (!by || !isUpcoming(find(state.vaccineAppointments, id), now)) return fail('Only upcoming appointments can be cancelled.')
  return { next: { ...state, vaccineAppointments: replaceRecord(state.vaccineAppointments, id, {
    status: 'cancelled', cancelledAt: now.toISOString(), ...stamp(now, by),
  }) } }
}
