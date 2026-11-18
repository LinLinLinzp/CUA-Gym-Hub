import { totals } from '../utils/derived.js'
import { addressText, plusDays, round, sum } from '../utils/model.js'
import { customerIdFor, itemIdFor } from './reference.js'
import { invoiceFixtures, salesFixtures } from './salesFixtures.js'
import { header, in2026, linkedPriceLine, priceLine, when } from './transactionSeed.js'

const partialFulfillments = {
  10426: [24, 0], 10434: [6, 40], 10435: [0, 2], 10436: [2, 10], 10437: [20, 2], 10438: [30, 200], 10439: [1, 2],
}
const splitShipments = { 10417: 2, 10420: 2, 10423: 2, 10425: 2 }
const partialPayments = [[20888, 1000, '10-20'], [20894, 200, '10-30'], [20898, 2000, '11-12']]
const combinedPayments = [[20875, 20880, '08-10'], [20877, 20882, '08-20'], [20883, 20890, '09-24']]

function customerFields(state, customer) {
  return {
    customerId: customer.id, termsId: customer.termsId, salesRepId: customer.salesRepId, shipMethodId: customer.shipMethodId,
    taxItemId: customer.taxItemId, taxRate: state.taxItems.find((row) => row.id === customer.taxItemId).rate, discountRate: 0,
    locationId: customer.defaultLocationId, departmentId: 'dept_1', billAddress: addressText(customer.billAddress),
  }
}

export function salesSeed(state) {
  const shipmentSpecs = []
  const salesOrders = salesFixtures.map(([num, date, customerNum, status, items, shippingCost, memo = '']) => {
    const customer = state.customers.find((row) => row.id === customerIdFor(customerNum))
    const tranDate = in2026(date)
    const locationId = customer.defaultLocationId
    const lines = items.map((item, index) => {
      const base = priceLine(state, item, index)
      const stock = state.items.find((row) => row.id === base.itemId).type === 'inventoryItem'
      const quantityFulfilled = stock ? (partialFulfillments[num]?.[index] ?? (['Billed', 'Pending Billing'].includes(status) ? base.quantity : 0)) : 0
      const isClosed = status === 'Cancelled' || num === 10427 || (num === 10426 && !quantityFulfilled)
      return { ...base, locationId, quantityFulfilled, quantityBilled: 0, isClosed }
    })
    const approved = !['Pending Approval', 'Cancelled'].includes(status)
    const order = header('salesOrder', num, tranDate, {
      ...customerFields(state, customer), status, memo, createdById: customer.salesRepId, shipDate: plusDays(tranDate, 3),
      shipMethodId: num === 10447 ? 'ship_ltl' : customer.shipMethodId, shipAddress: addressText(customer.shipAddress),
      shippingCost, lines, ...totals(lines, { ...customerFields(state, customer), shippingCost }),
      otherRefNum: 'PO-' + (70000 + num % 1000 * 7), approvedById: approved ? 'emp_101' : null,
      approvedAt: approved ? when(tranDate, '18') : null, closedAt: status === 'Closed' ? when(plusDays(tranDate, num === 10426 ? 4 : 1)) : null,
      cancelledAt: status === 'Cancelled' ? when(tranDate, '17') : null,
    })
    const shipping = lines.filter((line) => line.quantityFulfilled > 0)
    if (shipping.length) {
      const split = splitShipments[num]
      shipmentSpecs.push([plusDays(tranDate, 2), order, split ? shipping.slice(0, split) : shipping])
      if (split) shipmentSpecs.push([plusDays(tranDate, 16), order, shipping.slice(split)])
    }
    return order
  })
  shipmentSpecs.sort(([a, parentA], [b, parentB]) => a.localeCompare(b) || parentA.internalId - parentB.internalId)
  const itemFulfillments = shipmentSpecs.map(([date, order, ship], index) => header('itemFulfillment', 8201 + index, date, {
    createdFromId: order.id, createdFromType: 'salesOrder', status: 'Shipped', departmentId: 'dept_2',
    customerId: order.customerId, locationId: order.locationId, shipMethodId: order.shipMethodId, shipAddress: order.shipAddress,
    trackingNumbers: '1Z999AA10' + String(123456784 + index), shippedAt: when(date, '22'),
    lines: ship.map((line, index) => ({
      lineId: `l${index + 1}`, line: index + 1, orderLineId: line.lineId, itemId: line.itemId,
      description: line.description, quantity: line.quantityFulfilled, units: line.units, locationId: line.locationId,
    })),
  }))
  const invoices = invoiceFixtures.map(([num, date, sourceId, invoiceItems, status, due, shippingCost]) => {
    const order = salesOrders.find((row) => row.internalId === sourceId)
    const customer = state.customers.find((row) => row.id === (order?.customerId || customerIdFor(sourceId)))
    const terms = state.terms.find((row) => row.id === customer.termsId)
    const tranDate = in2026(date)
    const lines = (invoiceItems.length ? invoiceItems : order.lines.map((line) => [state.items.find((item) => item.id === line.itemId).itemId, line.quantity]))
      .map(([sku, quantity], i) => {
        const line = order?.lines.find((entry) => entry.itemId === itemIdFor(sku))
        if (line && status !== 'Voided') line.quantityBilled += quantity
        return line ? { ...linkedPriceLine(line, quantity, i), taxable: line.taxable }
          : { ...priceLine(state, [sku, quantity], i), orderLineId: null }
      })
    const defaults = customerFields(state, customer)
    const summary = totals(lines, { ...defaults, shippingCost })
    return header('invoice', num, tranDate, {
      ...defaults, createdFromId: order?.id || null, createdFromType: order ? 'salesOrder' : null, status,
      otherRefNum: order?.otherRefNum || '', shipDate: order?.shipDate || null, shippingCost,
      dueDate: due ? in2026(due) : plusDays(tranDate, terms.days), lines, ...summary, amountPaid: 0,
      amountRemaining: status === 'Voided' ? 0 : summary.total, voidedAt: status === 'Voided' ? when(plusDays(tranDate, 1), '17') : null,
      voidedById: status === 'Voided' ? 'emp_101' : null, lastEmailedAt: null, toBeEmailed: false, toBePrinted: false,
    })
  })
  const findInvoice = (num) => invoices.find((row) => row.internalId === num)
  const combined = new Set(combinedPayments.flatMap(([a, b]) => [a, b]))
  const payments = invoices.filter((invoice) => invoice.status === 'Paid In Full' && !combined.has(invoice.internalId))
    .map((invoice) => [plusDays(invoice.tranDate, 21), [[invoice, invoice.total]]])
  for (const [a, b, date] of combinedPayments) payments.push([in2026(date), [a, b].map((num) => {
    const invoice = findInvoice(num)
    return [invoice, invoice.total]
  })])
  for (const [num, amount, date] of partialPayments) payments.push([in2026(date), [[findInvoice(num), amount]]])
  payments.sort(([a], [b]) => a.localeCompare(b))
  const customerPayments = payments.map(([date, targets], index) => {
    const { customerId, locationId } = targets[0][0]
    const municipal = state.customers.find((row) => row.id === customerId).category === 'Municipal'
    const payment = round(sum(targets, ([, amount]) => amount))
    const undepFunds = date > '2026-11-01'
    const applied = targets.map(([invoice, amount]) => {
      invoice.amountPaid = round(invoice.amountPaid + amount)
      invoice.amountRemaining = round(invoice.total - invoice.amountPaid)
      return { invoiceId: invoice.id, amount, discount: 0 }
    })
    return header('customerPayment', 6101 + index, date, {
      customerId, locationId, payment, paymentMethodId: municipal ? 'pm_check' : 'pm_ach', checkNum: municipal ? String(10110 + index) : '',
      undepFunds, accountId: undepFunds ? 'acct_1050' : 'acct_1000', arAccountId: 'acct_1100', status: undepFunds ? 'Not Deposited' : 'Deposited',
      applied, appliedTotal: payment, unapplied: 0,
    })
  })
  return { salesOrders, itemFulfillments, invoices, customerPayments }
}
