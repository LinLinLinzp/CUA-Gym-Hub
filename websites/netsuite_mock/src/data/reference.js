import { customerFixtures, employeeFixtures, inventoryFixtures, serviceFixtures, vendorFixtures } from './referenceFixtures.js'

export const seedTimestamp = '2026-06-01T16:00:00.000Z'
export const itemIdFor = (sku) => 'item_' + sku.toLowerCase().replaceAll('-', '')
export const customerIdFor = (number) => `cust_${number}`
export const vendorIdFor = (number) => `vend_${number}`

const company = {
  name: 'Cascade Industrial Supply', legalName: 'Cascade Industrial Supply, Inc.', accountId: 'ACME',
  domain: 'acme.app.netsuite.com', address: '4120 NW Yeon Ave, Portland, OR 97210', phone: '(503) 555-0142',
  currency: 'USD', fiscalYearStart: '01', taxId: '93-1847720', edition: 'US',
}
const currentUser = {
  employeeId: 'emp_101', name: 'Jordan Ellis', email: 'jordan.ellis@cascadeindustrial.com',
  role: 'Administrator', roleCenter: 'Classic', initials: 'JE',
}
const preferences = {
  dateFormat: 'M/D/YYYY', salesOrderDefaultStatus: 'Pending Approval', purchaseOrderSupervisorApprovalDefault: false,
  creditLimitHandling: 'Warn', allowNegativeInventory: false, defaultLocationId: 'loc_1', listRowsPerPage: 50, showConfirmationBanners: true,
}
const counters = {
  nextInternalId: 5001, salesOrder: 10459, itemFulfillment: 8233, invoice: 20904, customerPayment: 6121,
  purchaseOrder: 4533, itemReceipt: 3319, vendorBill: 1117, vendorPayment: 1209,
  inventoryAdjustment: 1051, inventoryTransfer: 1017, customer: 1041, vendor: 2023,
}
const departments = ['Sales', 'Operations', 'Purchasing', 'Finance', 'Administration'].map((name, i) => ({ id: `dept_${i + 1}`, internalId: i + 1, name, inactive: false }))
const classes = ['Fluid Handling', 'Power Transmission', 'Fasteners & Hardware', 'Safety & PPE', 'Electrical', 'Material Handling', 'Services']
  .map((name, i) => ({ id: `cls_${i + 1}`, internalId: i + 1, name, inactive: false }))
const employees = employeeFixtures.map(([internalId, name, title, department, flags]) => {
  const [firstName, lastName] = name.split(' ')
  return {
    id: `emp_${internalId}`, internalId, entityId: `E${internalId}`, name, firstName, lastName, title,
    departmentId: departments.find((row) => row.name === department)?.id,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cascadeindustrial.com`, phone: `(503) 555-0${internalId}`,
    supervisorId: internalId === 101 ? null : 'emp_101', isSalesRep: flags === 'salesRep', isBuyer: internalId === 105,
    ...(internalId === 101 && { isSupervisor: true }), ...(internalId === 105 && { purchaseApprovalLimit: 10000 }), inactive: false,
  }
})
const locations = [
  ['01: Portland', 'Portland Main Warehouse', company.address, 'emp_106'],
  ['02: Reno', 'Reno Distribution Center', '1355 Capital Blvd, Reno, NV 89502', 'emp_107'],
  ['03: Columbus', 'Columbus East Warehouse', '2800 Fisher Rd, Columbus, OH 43204', 'emp_101'],
].map(([name, fullName, address, managerId], i) => ({
  id: `loc_${i + 1}`, internalId: i + 1, name, fullName, address, managerId, inactive: false, makeInventoryAvailable: true,
}))
const terms = [
  ['due', 'Due on receipt', 0], ['n15', 'Net 15', 15], ['n30', 'Net 30', 30], ['n45', 'Net 45', 45],
  ['n60', 'Net 60', 60], ['1n30', '1% 10 Net 30', 30, 1, 10], ['2n30', '2% 10 Net 30', 30, 2, 10],
].map(([key, name, days, discountPercent = 0, discountDays = 0]) => ({ id: `term_${key}`, name, days, discountPercent, discountDays }))
const shipMethods = [
  ['upsg', 'UPS Ground'], ['ups2', 'UPS 2nd Day Air'], ['fdxg', 'FedEx Ground'],
  ['ltl', 'FedEx Freight LTL'], ['truck', 'Company Truck'], ['will', 'Customer Pickup (Will Call)'],
].map(([key, name]) => ({ id: `ship_${key}`, name, inactive: false }))
const paymentMethods = [
  ['ach', 'ACH'], ['check', 'Check'], ['wire', 'Wire'], ['visa', 'VISA'], ['mc', 'Master Card'], ['amex', 'American Express'],
].map(([key, name]) => ({ id: `pm_${key}`, name }))
const taxItems = [
  ['OR', 'OR - No Sales Tax', 0], ['WA', 'WA State Sales Tax', 8.9], ['ID', 'ID State Sales Tax', 6],
  ['NV', 'NV Washoe County', 8.265], ['CA', 'CA Sacramento County', 8.75], ['OH', 'OH Franklin County', 7.5],
  ['Exempt', 'Exempt - Resale/Gov', 0],
].map(([state, name, rate]) => ({ id: `tax_${state.toLowerCase()}`, state: state === 'Exempt' ? null : state, name, rate }))
const accounts = [
  [1000, 'Operating Checking', 'Bank'], [1010, 'Payroll Checking', 'Bank'], [1050, 'Undeposited Funds', 'Other Current Asset'],
  [1100, 'Accounts Receivable', 'Accounts Receivable'], [1200, 'Inventory Asset', 'Other Current Asset'], [1300, 'Prepaid Expenses', 'Other Current Asset'],
  [1500, 'Warehouse Equipment', 'Fixed Asset'], [2000, 'Accounts Payable', 'Accounts Payable'], [2100, 'Inventory Received Not Billed', 'Other Current Liability'],
  [2200, 'Sales Tax Payable', 'Other Current Liability'], [2300, 'Accrued Liabilities', 'Other Current Liability'], [3000, 'Retained Earnings', 'Equity'],
  [3100, 'Common Stock', 'Equity'], [4000, 'Sales – Products', 'Income'], [4100, 'Sales – Services', 'Income'],
  [4200, 'Freight & Handling Income', 'Income'], [4900, 'Sales Discounts', 'Income'], [5000, 'Cost of Goods Sold', 'Cost of Goods Sold'],
  [5100, 'Freight In', 'Cost of Goods Sold'], [5200, 'Inventory Shrinkage', 'Cost of Goods Sold'], [5210, 'Damaged Goods Write-off', 'Cost of Goods Sold'],
  [5220, 'Cycle Count Variance', 'Cost of Goods Sold'], [6000, 'Salaries & Wages', 'Expense'], [6100, 'Rent Expense', 'Expense'],
  [6300, 'Shop Supplies', 'Expense'], [6400, 'Freight Out', 'Expense'], [6500, 'Equipment Rental', 'Expense'], [6600, 'Office Supplies', 'Expense'],
].map(([number, name, type]) => ({ id: `acct_${number}`, internalId: number, number, name, type, inactive: false }))

const shortcutBase = '/app/accounting/transactions/'
const shortcuts = [
  ['Enter Sales Orders', shortcutBase + 'salesord'], ['Fulfill Orders', shortcutBase + 'itemshipmanager'],
  ['Receive Orders', shortcutBase + 'receiveorders'], ['Adjust Inventory', shortcutBase + 'invadjst'],
  ['Open Invoices', shortcutBase + 'transactionlist?Transaction_TYPE=CustInvc&status=Open'],
  ['Current Inventory Status', '/app/reporting/reportrunner?reporttype=INVSTATUS'],
].map(([label, path], index) => ({ id: `short_${index + 1}`, label, path }))
const reps = { Priya: 'emp_102', Marcus: 'emp_103', Elena: 'emp_104' }
const stateZip = { OR: '97210', WA: '98660', ID: '83702', NV: '89502', CA: '95814', OH: '43204', KS: '67211',
  TX: '77002', IN: '46204', WI: '53202', IL: '61101', NC: '28202', PA: '18101', LA: '70802', NH: '03101', OK: '74103', MI: '49503' }
const cityZip = { Portland: '97203', Reno: '89502', Columbus: '43204', Longview: '98632', Pendleton: '97801', Bend: '97701',
  Salem: '97301', Tacoma: '98402', Spokane: '99201', Boise: '83702', 'Carson City': '89701', Sacramento: '95814',
  'South San Francisco': '94080', Marion: '43302', Toledo: '43604', Dayton: '45402', 'Kettle Falls': '99141', Kent: '98032',
  'Port Angeles': '98362', Seattle: '98134', 'Klamath Falls': '97601', Nampa: '83651', Elko: '89801', 'South Lake Tahoe': '96150',
  Fresno: '93725', Stockton: '95206', Akron: '44308', Cincinnati: '45202', Mansfield: '44902', Gresham: '97030',
  Hillsboro: '97124', Eugene: '97402', Medford: '97501', Yakima: '98903', Vancouver: '98660', "Coeur d'Alene": '83814',
  Wichita: '67211', Cleveland: '44114', 'Long Beach': '90813', Tualatin: '97062', Beaverton: '97005', Sparks: '89431', Oakland: '94607' }
const streets = ['Industrial Way', 'Commerce Drive', 'Foundry Road', 'Mill Park Avenue', 'Distribution Boulevard', 'Enterprise Court']
const contacts = ['Dana Whitfield', 'Chris Holloway', 'Morgan Alvarez', 'Drew Simmons', 'Riley Tran', 'Taylor Novak',
  'Sidney Greene', 'Parker Mendoza', 'Devin Scott', 'Reese Bennett', 'Jules Moreno', 'Avery Hollis']
const areaCodes = { OR: 503, WA: 360, ID: 208, NV: 775, CA: 916, OH: 614, KS: 316, TX: 713, IN: 317, WI: 414, IL: 815, NC: 704, PA: 610, LA: 225, NH: 603, OK: 918, MI: 616 }
const emailDomain = (name) => name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 3).join('') + '.com'
const address = (company, city, state, ordinal, kind) => ({
  addressee: company, attention: kind, addr1: `${1100 + ordinal * 38} ${streets[ordinal % streets.length]}`, addr2: '', city, state,
  zip: cityZip[city] || stateZip[state], country: 'United States',
})
const termsId = (name) => terms.find((entry) => entry.name === name)?.id || 'term_n30'
const warehouseId = (state) => ['NV', 'CA'].includes(state) ? 'loc_2' : state === 'OH' ? 'loc_3' : 'loc_1'

const customers = customerFixtures.map(([internalId, companyName, city, state, term, rep, creditLimit, category, flag], index) => {
  const location = warehouseId(state)
  const billAddress = address(companyName, city, state, index, 'Accounts Payable')
  if (internalId === 1001) billAddress.addr1 = '8800 N Columbia Blvd'
  if (internalId === 1038) billAddress.addr1 = '1402 W Washington Ave'
  return {
    id: customerIdFor(internalId), internalId, entityId: `C${internalId}`, companyName, isPerson: false,
    status: 'CUSTOMER-Closed Won', category, salesRepId: reps[rep],
    email: internalId === 1001 ? 'ap@pacificrimfab.com' : 'ap@' + emailDomain(companyName),
    phone: `(${areaCodes[state]}) 555-${String(187 - index).padStart(4, '0')}`, fax: '', url: '',
    termsId: termsId(term), creditLimit, creditHold: flag === 'hold' ? 'On' : 'Auto', taxable: flag !== 'exempt',
    taxItemId: flag === 'exempt' ? 'tax_exempt' : `tax_${state.toLowerCase()}`, defaultLocationId: location,
    shipMethodId: internalId === 1001 ? 'ship_truck' : ['ship_upsg', 'ship_fdxg', 'ship_truck'][index % 3], priceLevel: 'Base Price',
    billAddress, shipAddress: { ...billAddress, attention: 'Receiving' }, primaryContact: contacts[index % contacts.length],
    comments: '', inactive: flag === 'inactive', dateCreated: '2021-03-15', createdAt: '2021-03-15T16:00:00.000Z', createdById: 'emp_101',
    lastModifiedAt: seedTimestamp, lastModifiedById: 'emp_101',
  }
})
const vendors = vendorFixtures.map(([internalId, companyName, city, state, term, category, inactive], index) => {
  const office = address(companyName, city, state, index + 12, 'Order Desk')
  if (internalId === 2001) office.addr1 = '2200 E Pawnee St'
  return {
    id: vendorIdFor(internalId), internalId, entityId: `V${internalId}`, companyName,
    legalName: internalId === 2001 ? companyName + ' LLC' : companyName, category,
    email: internalId === 2001 ? 'orders@northwindpump.com' : 'orders@' + emailDomain(companyName),
    phone: `(${areaCodes[state]}) 555-${String(110 + index).padStart(4, '0')}`, accountNumber: `CIS-${44102 + index * 7}`,
    termsId: termsId(term), taxId: internalId === 2001 ? '48-1120934' : '', is1099Eligible: category === 'Subcontractor',
    currency: 'USD', creditLimit: null, address: office, primaryContact: internalId === 2001 ? 'Lisa Moreno' : contacts[(index + 3) % contacts.length],
    defaultExpenseAccountId: { 2011: 'acct_6400', 2013: 'acct_6600', 2014: 'acct_6500', 2021: 'acct_6500' }[internalId] || null,
    comments: '', inactive, dateCreated: '2019-08-02', createdAt: '2019-08-02T16:00:00.000Z', createdById: 'emp_101', lastModifiedAt: seedTimestamp, lastModifiedById: 'emp_101',
  }
})
const classIds = { Fluid: 'cls_1', Fasteners: 'cls_3', 'Power Trans.': 'cls_2', Safety: 'cls_4', Electrical: 'cls_5', 'Material Handling': 'cls_6' }
const itemAudit = { createdAt: '2020-02-10T17:00:00.000Z', createdById: 'emp_101', lastModifiedAt: seedTimestamp, lastModifiedById: 'emp_101' }

const items = inventoryFixtures.map(([sku, displayName, product, unit, basePrice, purchasePrice, vendor, stock, reorder], index) => {
  const preferredVendorId = vendorIdFor(vendor)
  const vendorCode = index === 0 ? 'NW-CI050' : sku
  return {
    id: itemIdFor(sku), internalId: 101 + index, itemId: sku, displayName, type: 'inventoryItem', subtype: null,
    classId: classIds[product], departmentId: null, upcCode: index === 0 ? '0841237105017' : '', manufacturer: vendors.find((row) => row.id === preferredVendorId)?.companyName.split(' ')[0],
    mpn: vendorCode, unitsType: unit === 'Ea' ? 'Each' : unit, stockUnit: unit, saleUnit: unit, purchaseUnit: unit,
    salesDescription: index === 0 ? '1/2 HP cast iron centrifugal pump, 115/230V, 1" NPT' : displayName,
    purchaseDescription: index === 0 ? 'NW-CI050 centrifugal pump 1/2HP' : displayName,
    basePrice, purchasePrice, averageCost: purchasePrice, lastPurchasePrice: purchasePrice, costingMethod: 'Average', preferredVendorId,
    vendors: [{ vendorId: preferredVendorId, vendorCode, purchasePrice, preferred: true }],
    incomeAccountId: 'acct_4000', cogsAccountId: 'acct_5000', assetAccountId: 'acct_1200', expenseAccountId: null,
    taxable: true, weight: index === 0 ? 38 : null, weightUnit: 'lb',
    locations: locations.map((location, i) => ({ locationId: location.id, onHand: stock[i], reorderPoint: reorder[i],
      preferredStockLevel: reorder[i] * 2, bin: `${['A','R','C'][i]}-${String(index % 8 + 1).padStart(2,'0')}-${String(index % 5 + 3).padStart(2,'0')}` })),
    inactive: false, ...itemAudit,
  }
})
items.push(...serviceFixtures.map(([sku, displayName, kind, subtype, basePrice, purchasePrice, vendor, account, taxable], index) => {
  const unit = sku === 'SVC-INSTALL' ? 'Hr' : 'Ea'
  const preferredVendorId = vendor ? vendorIdFor(vendor) : null
  return {
    id: itemIdFor(sku), internalId: 149 + index, itemId: sku, displayName, type: kind === 'service' ? 'serviceItem' : 'nonInventoryItem',
    subtype, classId: 'cls_7', departmentId: null, unitsType: unit === 'Ea' ? 'Each' : 'Time', saleUnit: unit, purchaseUnit: unit,
    salesDescription: displayName, purchaseDescription: displayName, basePrice, purchasePrice, preferredVendorId,
    vendors: preferredVendorId ? [{ vendorId: preferredVendorId, vendorCode: sku, purchasePrice, preferred: true }] : [],
    incomeAccountId: account >= 6000 ? null : `acct_${account}`, expenseAccountId: account >= 6000 ? `acct_${account}` : null,
    taxable, locations: [], inactive: false, ...itemAudit,
  }
}))

export function referenceData() {
  return structuredClone({
    company, currentUser, preferences, counters, employees, locations, departments, classes, accounts, terms, shipMethods, paymentMethods, taxItems,
    customers, vendors, items, shortcuts,
  })
}
