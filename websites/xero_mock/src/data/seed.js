import { calcDocumentTotals, addDays, dueDateFromTerms, round2 } from '../utils/money.js';
import { buildReport } from '../utils/ledger.js';
const stamp = '2026-04-01T09:00:00.000Z',
  pad = n => String(n).padStart(4, '0');
export function createInitialData() {
  const organisation = {
    id: 'org_brightwater',
    name: 'Brightwater Creative Ltd',
    legalName: 'Brightwater Creative Ltd',
    shortCode: '!kX9pQ',
    countryCode: 'GB',
    baseCurrency: 'GBP',
    timezone: 'Europe/London',
    registrationNumber: '10456723',
    taxNumber: 'GB 284 1937 62',
    industry: 'Graphic design and marketing services',
    address: {
      line1: 'Unit 4, 27 Shoreditch High Street',
      city: 'London',
      postalCode: 'E1 6PN',
      country: 'United Kingdom'
    },
    phone: '020 7946 0321',
    email: 'accounts@brightwatercreative.co.uk',
    website: 'www.brightwatercreative.co.uk',
    financialYearEnd: {
      day: 31,
      month: 3
    },
    conversionDate: '2026-04-01',
    vatScheme: 'Accrual',
    vatPeriod: 'Quarterly',
    lockDate: null,
    invoiceSettings: {
      invoicePrefix: 'INV-',
      nextInvoiceNumber: 47,
      quotePrefix: 'QU-',
      nextQuoteNumber: 7,
      creditNotePrefix: 'CN-',
      nextCreditNoteNumber: 4,
      purchaseOrderPrefix: 'PO-',
      nextPurchaseOrderNumber: 5,
      defaultSalesLineAmountType: 'Exclusive',
      defaultPurchaseLineAmountType: 'Exclusive',
      salesPaymentTerms: {
        day: 30,
        type: 'DAYSAFTERBILLDATE'
      },
      billsPaymentTerms: {
        day: 20,
        type: 'OFFOLLOWINGMONTH'
      },
      defaultBrandingThemeId: 'bt_standard'
    }
  };
  const users = [['hannah', 'Hannah Clarke', 'Adviser'], ['tom', 'Tom Reid', 'Standard'], ['priya', 'Priya Shah', 'Invoice only'], ['marcus', 'Marcus Bell', 'Read only']].map(([id, name, role]) => ({
    id: `usr_${id}`,
    name,
    role,
    email: `${id}@brightwatercreative.co.uk`
  }));
  const currentUser = {
    ...users[0],
    firstName: 'Hannah',
    lastName: 'Clarke',
    initials: 'HC',
    canApprove: true
  };
  const taxRates = [['OUTPUT2', '20% (VAT on Income)', 20, 'sales'], ['INPUT2', '20% (VAT on Expenses)', 20, 'purchases'], ['RROUTPUT', '5% (VAT on Income)', 5, 'sales'], ['RRINPUT', '5% (VAT on Expenses)', 5, 'purchases'], ['ZERORATEDOUTPUT', 'Zero Rated Income', 0, 'sales'], ['ZERORATEDINPUT', 'Zero Rated Expenses', 0, 'purchases'], ['EXEMPTOUTPUT', 'Exempt Income', 0, 'sales'], ['EXEMPTINPUT', 'Exempt Expenses', 0, 'purchases'], ['NONE', 'No VAT', 0, 'both']].map(([taxType, name, rate, appliesTo]) => ({
    id: `tax_${taxType.toLowerCase()}`,
    taxType,
    name,
    rate,
    appliesTo,
    status: 'ACTIVE'
  }));
  const accounts = ACCOUNT_ROWS.map(([code, name, type, taxType]) => ({
    id: `acc_${code}`,
    code,
    name,
    type,
    taxType,
    class: ['REVENUE', 'SALES', 'OTHERINCOME'].includes(type) ? 'REVENUE' : ['DIRECTCOSTS', 'EXPENSE', 'OVERHEADS', 'DEPRECIATN'].includes(type) ? 'EXPENSE' : ['BANK', 'CURRENT', 'INVENTORY', 'PREPAYMENT', 'FIXED', 'NONCURRENT'].includes(type) ? 'ASSET' : type === 'EQUITY' ? 'EQUITY' : 'LIABILITY',
    description: code === '200' ? 'Income from normal business activity' : '',
    status: code === '449' ? 'ARCHIVED' : 'ACTIVE',
    showOnDashboard: ['200', '400', '469', '478'].includes(code),
    enablePayments: type === 'BANK',
    bankAccountId: type === 'BANK' ? `ba_${code}` : null,
    systemAccount: {
      610: 'DEBTORS',
      800: 'CREDITORS',
      820: 'GST',
      960: 'RETAINEDEARNINGS',
      860: 'ROUNDING'
    }[code] || null
  }));
  const customers = ['Ridgeway University', 'Boom FM', 'City Agency', 'Marine Systems Ltd', 'Bayside Club', 'Hamilton Smith Ltd', 'Coco Café', 'Rex Media Group', 'Petrie McLoud Watson & Associates', 'Gateway Motors', 'Young Bros Transport', 'Basket Case', 'SMART Agency', 'Espresso 31', 'Hoyt Productions', 'Fernhill Primary School', 'Port & Philip Freight', 'Oakleaf Organic Grocers', 'Kensington Dental Group', 'Truxton Property Management'],
    suppliers = ['Net Connect', 'PowerDirect', 'MCO Cleaning Services', 'Central Copiers', 'Swanston Security', 'Office Supplies Company', 'ABC Furniture', '24 Locks', 'Melrose Parking', 'Liam Patel Design', 'Printwell Ltd', 'Barclays Bank', 'Xero UK', 'Google Workspace', 'Adobe Systems Software Ireland', 'HM Revenue & Customs', 'Royal Mail', 'Amazon Business'];
  const contacts = [...customers.map((name, i) => ({
    id: `con_c${String(i + 1).padStart(2, '0')}`,
    name,
    isCustomer: true,
    isSupplier: i === 19
  })), ...suppliers.map((name, i) => ({
    id: `con_s${String(i + 1).padStart(2, '0')}`,
    name,
    isCustomer: false,
    isSupplier: true
  })), {
    id: 'con_x01',
    name: 'Hannah Clarke',
    isCustomer: false,
    isSupplier: false
  }, {
    id: 'con_c99',
    name: 'Bluebell Florists',
    isCustomer: true,
    isSupplier: false,
    contactStatus: 'ARCHIVED'
  }].map((c, i) => ({
    ...c,
    accountNumber: c.name.replace(/[^A-Z]/g, '').slice(0, 4) + String(i + 1).padStart(2, '0'),
    contactStatus: c.contactStatus || 'ACTIVE',
    firstName: ['Eleanor', 'James', 'Sophie', 'Oliver', 'Amelia', 'Harry'][i % 6],
    lastName: ['Marsh', 'Bennett', 'Turner', 'Williams', 'Davies', 'Wilson'][i % 6],
    email: i === 0 ? 'accounts.payable@ridgeway.ac.uk' : `accounts@${c.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 24)}.co.uk`,
    phone: `020 7946 ${String(100 + i).padStart(4, '0')}`,
    mobile: '',
    website: '',
    billingAddress: {
      line1: `${12 + i} ${['High Street', 'Station Road', 'Market Street', 'Church Lane'][i % 4]}`,
      line2: '',
      city: ['London', 'Manchester', 'Bristol', 'Leeds'][i % 4],
      region: '',
      postalCode: ['E1 6PN', 'M13 9PL', 'BS1 4ST', 'LS1 2AB'][i % 4],
      country: 'United Kingdom'
    },
    deliveryAddress: null,
    taxNumber: '',
    defaultSalesAccountCode: c.isCustomer ? '200' : null,
    defaultSalesTaxType: c.isCustomer ? 'OUTPUT2' : null,
    defaultPurchaseAccountCode: c.isSupplier ? '429' : null,
    defaultPurchaseTaxType: c.isSupplier ? 'INPUT2' : null,
    salesPaymentTerms: [0, 2, 7].includes(i) ? {
      day: 30,
      type: 'DAYSAFTERBILLDATE'
    } : null,
    billsPaymentTerms: null,
    notes: '',
    starred: [0, 7].includes(i),
    createdAt: stamp,
    updatedAt: stamp
  }));
  const items = ITEM_ROWS.map(([code, name, price], i) => ({
    id: `itm_${code.toLowerCase().replaceAll('-', '_')}`,
    code,
    name,
    isSold: i < 12,
    isPurchased: i >= 12,
    salesDescription: i < 12 ? name : '',
    salesUnitPrice: i < 12 ? price : null,
    salesAccountCode: i < 12 ? '200' : null,
    salesTaxType: i < 12 ? 'OUTPUT2' : null,
    purchaseDescription: i >= 12 ? name : '',
    purchaseUnitPrice: i >= 12 ? price : null,
    purchaseAccountCode: i >= 12 ? '461' : null,
    purchaseTaxType: i >= 12 ? 'INPUT2' : null,
    isTracked: false,
    status: 'ACTIVE'
  }));
  const bankAccounts = [{
    id: 'ba_090',
    accountCode: '090',
    name: 'Business Current Account',
    bankName: 'Barclays',
    sortCode: '20-45-67',
    accountNumber: '43218765',
    openingStatementBalance: 24350,
    showOnDashboard: true,
    type: 'BANK'
  }, {
    id: 'ba_091',
    accountCode: '091',
    name: 'Business Savings Account',
    bankName: 'Barclays',
    sortCode: '20-45-67',
    accountNumber: '73920184',
    openingStatementBalance: 40000,
    showOnDashboard: true,
    type: 'BANK'
  }, {
    id: 'ba_092',
    accountCode: '092',
    name: 'Company Credit Card',
    bankName: 'Barclaycard',
    sortCode: '',
    accountNumber: '4417',
    openingStatementBalance: 0,
    showOnDashboard: false,
    type: 'CREDITCARD'
  }].map(b => ({
    ...b,
    openingBalanceDate: '2026-03-31',
    currencyCode: 'GBP',
    feedStatus: 'connected',
    status: 'ACTIVE'
  }));
  const invoices = [],
    bills = [],
    payments = [],
    bankStatementLines = [],
    bankTransactions = [],
    bankTransfers = [],
    batchPayments = [],
    historyEvents = [];
  const contact = id => contacts.find(c => c.id === id),
    doc = (id, type, contactId, date, dueDate, reference, lines, status, extra = {}) => {
      const x = {
        id,
        type,
        contactId,
        contactName: contact(contactId)?.name,
        date,
        dueDate,
        reference,
        invoiceNumber: type === 'ACCREC' ? `INV-${id.slice(-4)}` : '',
        currencyCode: 'GBP',
        brandingThemeId: 'bt_standard',
        lineAmountTypes: 'Exclusive',
        lineItems: lines.map((l, i) => ({
          id: `li_${id}_${i + 1}`,
          quantity: 1,
          discountRate: 0,
          accountCode: type === 'ACCREC' ? '200' : '429',
          taxType: type === 'ACCREC' ? 'OUTPUT2' : 'INPUT2',
          tracking: [],
          ...l
        })),
        amountPaid: 0,
        amountCredited: 0,
        status,
        sentToContact: ['AUTHORISED', 'PAID'].includes(status),
        paymentIds: [],
        creditNoteIds: [],
        attachments: [],
        createdAt: `${date}T09:00:00.000Z`,
        createdBy: 'usr_tom',
        updatedAt: `${date}T09:00:00.000Z`,
        approvedAt: ['AUTHORISED', 'PAID'].includes(status) ? `${date}T10:00:00.000Z` : null,
        approvedBy: ['AUTHORISED', 'PAID'].includes(status) ? 'usr_hannah' : null,
        ...extra
      };
      return {
        ...x,
        ...calcDocumentTotals(x, taxRates)
      };
    };
  function pay(d, date, amount = d.total, extra = {}) {
    const p = {
      id: `pay_${d.id.replace('_', '')}`,
      type: d.type === 'ACCREC' ? 'ACCRECPAYMENT' : 'ACCPAYPAYMENT',
      documentType: d.type === 'ACCREC' ? 'invoice' : 'bill',
      documentId: d.id,
      documentNumber: d.invoiceNumber || d.reference,
      contactId: d.contactId,
      bankAccountId: 'ba_090',
      date,
      amount,
      reference: d.invoiceNumber || d.reference,
      isReconciled: true,
      statementLineId: null,
      batchPaymentId: null,
      source: 'manual',
      status: 'AUTHORISED',
      createdAt: `${date}T10:00:00.000Z`,
      createdBy: 'usr_tom',
      ...extra
    };
    payments.push(p);
    d.amountPaid = amount;
    d.amountDue = round2(d.total - amount - d.amountCredited);
    d.status = d.amountDue === 0 ? 'PAID' : 'AUTHORISED';
    d.paymentIds = [p.id];
    if (d.amountDue === 0) d.fullyPaidOnDate = date;
    return p;
  }
  for (const [i, row] of INVOICE_ROWS.entries()) {
    const [date, c, lines, status, paymentDate] = row,
      id = `inv_${pad(i + 1)}`,
      ls = lines.map(([code, quantity = 1, price]) => {
        const item = items.find(t => t.code === code);
        return {
          itemCode: code,
          description: item?.name || 'Packaging design – organic range',
          quantity,
          unitAmount: price ?? item?.salesUnitPrice ?? 2000
        };
      }),
      d = doc(id, 'ACCREC', `con_c${String(c).padStart(2, '0')}`, date, addDays(date, 30), c === 1 ? `Retainer ${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][Number(date.slice(5, 7)) - 4]} 2026` : `${contact(`con_c${String(c).padStart(2, '0')}`)?.name} project`, ls, status);
    if (i === 6) {
      d.amountCredited = 60;
      d.creditNoteIds = ['cn_0002'];
    }
    if (paymentDate) pay(d, paymentDate, round2(d.total - d.amountCredited), i === 26 ? {
      isReconciled: false,
      reference: 'Boom FM BACS'
    } : {});
    if (status === 'VOIDED') Object.assign(d, {
      voidedAt: '2026-07-02T09:00:00.000Z',
      voidReason: 'Raised in error – duplicate'
    });
    invoices.push(d);
  }
  const addBill = (cid, date, due, ref, amount, code, tax, status = 'PAID', paidDate = due) => {
    const id = `bill_${pad(bills.length + 1)}`,
      d = doc(id, 'ACCPAY', cid, date, due, ref, [{
        description: ref,
        unitAmount: amount,
        accountCode: code,
        taxType: tax
      }], status);
    if (tax === 'NONE') d.lineAmountTypes = 'NoTax';
    if (status === 'PAID') pay(d, paidDate);
    bills.push(d);
    return d;
  };
  for (const month of ['04', '05', '06', '07', '08', '09', '10', '11']) {
    addBill('con_c20', `2026-${month}-01`, `2026-${month}-05`, month === '11' ? 'RENT-NOV26' : `TPM-RENT-${month}26`, 1950, '469', 'EXEMPTINPUT', month === '11' ? 'AUTHORISED' : 'PAID');
    addBill('con_s01', `2026-${month}-01`, `2026-${month}-04`, month === '11' ? 'NC-88213' : `NC-${88000 + Number(month)}`, 45, '489', 'INPUT2', month === '11' ? 'AUTHORISED' : 'PAID');
  }
  addBill('con_s02', '2026-06-15', '2026-07-15', 'PD-1047120', 240, '445', 'INPUT2');
  addBill('con_s02', '2026-08-15', '2026-09-14', 'PD-1047450', 230, '445', 'INPUT2');
  addBill('con_s02', '2026-10-15', '2026-11-14', 'PD-1047721', 260, '445', 'INPUT2', 'AUTHORISED');
  const copier = addBill('con_s04', '2026-07-20', '2026-07-31', 'CC-Q2-2210', 105, '453', 'INPUT2');
  addBill('con_s04', '2026-10-20', '2026-11-20', 'CC-Q3-2291', 105, '453', 'INPUT2', 'AUTHORISED');
  for (const m of ['09', '10', '11']) addBill('con_s03', `2026-${m}-01`, m === '11' ? '2026-12-20' : `2026-${m}-20`, `MCO-${m}26`, 150, '408', 'INPUT2', m === '11' ? 'AUTHORISED' : 'PAID');
  addBill('con_s05', '2026-06-01', '2026-06-30', 'SS-260601', 600, '473', 'INPUT2');
  const office = addBill('con_s06', '2026-07-15', '2026-07-31', 'OSC-0726', 72, '461', 'INPUT2');
  addBill('con_s06', '2026-11-05', '2026-12-05', 'OSC-1126', 119, '461', 'INPUT2', 'DRAFT');
  addBill('con_s07', '2026-11-08', '2026-12-08', 'ABC-4901', 950, '710', 'INPUT2', 'SUBMITTED');
  addBill('con_s08', '2026-11-11', '2026-12-11', '24L-1126', 80, '473', 'INPUT2', 'SUBMITTED');
  addBill('con_s09', '2026-10-01', '2026-10-31', 'MP-1026', 200, '493', 'INPUT2', 'AUTHORISED');
  addBill('con_s10', '2026-10-16', '2026-11-15', 'LP-1026', 1200, '315', 'NONE', 'AUTHORISED');
  addBill('con_s10', '2026-11-12', '2026-12-12', 'LP-1126', 800, '315', 'NONE', 'DRAFT');
  addBill('con_s11', '2026-08-20', '2026-09-19', 'PW-0826', 425, '320', 'INPUT2');
  addBill('con_s11', '2026-11-09', '2026-12-09', 'PW-1126', 255, '320', 'INPUT2', 'SUBMITTED');
  addBill('con_s18', '2026-11-14', '2026-12-14', 'AB-1126', 54.16, '453', 'INPUT2', 'DRAFT');
  const batch = {
    id: 'bp_0001',
    type: 'PAYBATCH',
    bankAccountId: 'ba_090',
    date: '2026-07-31',
    reference: 'July suppliers',
    paymentIds: [...copier.paymentIds, ...office.paymentIds],
    billIds: [copier.id, office.id],
    total: 212.4,
    isReconciled: true,
    createdAt: '2026-07-31T10:00:00.000Z',
    createdBy: 'usr_tom'
  };
  batchPayments.push(batch);
  for (const p of payments) if (batch.paymentIds.includes(p.id)) Object.assign(p, {
    batchPaymentId: batch.id,
    source: 'batch'
  });
  function btx(date, contactId, description, amount, accountCode, taxType = 'NONE', bankAccountId = 'ba_090', type = 'SPEND', extra = {}) {
    const x = {
      id: `btx_${pad(bankTransactions.length + 1)}`,
      type,
      bankAccountId,
      contactId,
      contactName: contact(contactId)?.name || description,
      date,
      reference: description,
      lineAmountTypes: 'Inclusive',
      lineItems: [{
        id: `li_btx_${bankTransactions.length}`,
        description,
        quantity: 1,
        unitAmount: amount,
        accountCode,
        taxType,
        discountRate: 0
      }],
      isReconciled: true,
      source: 'manual',
      status: 'AUTHORISED',
      createdAt: `${date}T10:00:00.000Z`,
      createdBy: 'usr_tom',
      ...extra
    };
    Object.assign(x, calcDocumentTotals(x, taxRates));
    bankTransactions.push(x);
    return x;
  }
  for (const month of ['04', '05', '06', '07', '08', '09', '10']) {
    btx(`2026-${month}-28`, 'con_s12', 'Monthly bank charges', 12.5, '404');
    btx(`2026-${month}-15`, 'con_s13', 'Xero subscription', 35, '485', 'INPUT2');
    btx(`2026-${month}-17`, 'con_s14', 'Google Workspace', 11.4, '485', 'INPUT2');
    btx(`2026-${month}-25`, 'con_x01', "Director's salary", 3000, '478');
    btx(`2026-${month}-12`, 'con_s15', 'Adobe Creative Cloud', 19.99, '463', 'INPUT2', 'ba_092');
  }
  for (const [i, amount] of [31.2, 33.1, 34.05, 36.4, 36.88, 37.95].entries()) {
    const month = String(i + 4).padStart(2, '0');
    btx(`2026-${month}-${['04', '06', '09'].includes(month) ? 30 : 31}`, 'con_s12', 'Savings interest', amount, '270', 'NONE', 'ba_091', 'RECEIVE');
  }
  btx('2026-08-07', 'con_s16', 'VAT return Q1', 3128.4, '820');
  for (const [date, name, amount, code, tax] of [['2026-05-14', 'Capital Cab Co', 18.6, '493', 'INPUT2'], ['2026-06-03', 'British Airways', 212, '494', 'ZERORATEDINPUT'], ['2026-06-19', 'Pret A Manger', 9.85, '420', 'INPUT2'], ['2026-07-09', 'Amazon Business', 45.99, '453', 'INPUT2'], ['2026-08-21', 'Royal Mail', 21.3, '425', 'ZERORATEDINPUT'], ['2026-09-30', 'Capital Cab Co', 22.4, '493', 'INPUT2']]) btx(date, null, name, amount, code, tax, 'ba_092', 'SPEND', {
    contactName: name
  });
  btx('2026-11-14', 'con_s06', 'Ink cartridges', 48, '461', 'INPUT2', 'ba_090', 'SPEND', {
    id: 'btx_0099',
    isReconciled: false
  });
  const transfer = (from, to, date, amount, reference) => bankTransfers.push({
    id: `btr_${pad(bankTransfers.length + 1)}`,
    fromBankAccountId: from,
    toBankAccountId: to,
    date,
    amount,
    reference,
    fromIsReconciled: true,
    toIsReconciled: true,
    source: 'manual',
    createdAt: `${date}T10:00:00.000Z`,
    createdBy: 'usr_tom'
  });
  transfer('ba_090', 'ba_091', '2026-06-30', 5000, 'Transfer to savings');
  transfer('ba_090', 'ba_091', '2026-09-30', 5000, 'Transfer to savings');
  for (const m of [5, 6, 7, 8, 9, 10]) {
    const prev = `2026-${String(m - 1).padStart(2, '0')}`;
    transfer('ba_090', 'ba_092', `2026-${String(m).padStart(2, '0')}-25`, round2(bankTransactions.filter(t => t.bankAccountId === 'ba_092' && t.date.startsWith(prev)).reduce((s, t) => s + t.total, 0)), 'Credit card repayment');
  }
  const historyLines = [];
  for (const p of payments) if (p.isReconciled && !p.batchPaymentId) historyLines.push({
    date: p.date,
    bankAccountId: p.bankAccountId,
    amount: (p.type === 'ACCRECPAYMENT' ? 1 : -1) * p.amount,
    payee: contact(p.contactId)?.name,
    reference: p.reference,
    record: p,
    kind: 'payment'
  });
  for (const t of bankTransactions) if (t.isReconciled) historyLines.push({
    date: t.date,
    bankAccountId: t.bankAccountId,
    amount: (t.type === 'SPEND' ? -1 : 1) * t.total,
    payee: t.contactName,
    reference: t.reference,
    record: t,
    kind: 'bankTransaction'
  });
  for (const t of bankTransfers) for (const side of ['from', 'to']) historyLines.push({
    date: t.date,
    bankAccountId: t[`${side}BankAccountId`],
    amount: (side === 'from' ? -1 : 1) * t.amount,
    payee: 'TRANSFER',
    reference: t.reference,
    record: t,
    kind: 'bankTransfer',
    side
  });
  historyLines.push({
    date: batch.date,
    bankAccountId: batch.bankAccountId,
    amount: -batch.total,
    payee: 'BATCH PAYMENT JULY SUPPLIERS',
    reference: batch.reference,
    record: batch,
    kind: 'batchPayment'
  });
  historyLines.sort((a, b) => a.date.localeCompare(b.date));
  const seq = {};
  for (const h of historyLines) {
    seq[h.bankAccountId] = (seq[h.bankAccountId] || 0) + 1;
    const id = `bsl_${h.bankAccountId.slice(-3)}_${String(seq[h.bankAccountId]).padStart(3, '0')}`;
    h.record[h.side ? `${h.side}StatementLineId` : 'statementLineId'] = id;
    if (h.kind === 'batchPayment') for (const p of payments) if (p.batchPaymentId === h.record.id) p.statementLineId = id;
    bankStatementLines.push({
      id,
      bankAccountId: h.bankAccountId,
      date: h.date,
      amount: h.amount,
      payee: (h.payee || '').toUpperCase(),
      reference: h.reference,
      description: 'BANK TRANSACTION',
      type: h.amount < 0 ? 'DEBIT' : 'CREDIT',
      status: 'reconciled',
      reconciliation: {
        method: 'match',
        matched: [{
          kind: h.kind,
          id: h.record.id,
          amount: Math.abs(h.amount)
        }],
        adjustments: [],
        reconciledAt: `${addDays(h.date, 1)}T10:00:00.000Z`,
        reconciledBy: 'usr_tom'
      },
      discussNote: '',
      importedAt: `${h.date}T06:00:00.000Z`,
      source: 'feed'
    });
  }
  for (const [bank, specs] of [['090', UNRECONCILED], ['091', [['2026-10-31', 'GROSS INTEREST', 'INTEREST', 38.42], ['2026-11-09', 'TRANSFER FROM 43218765', 'SAVINGS', 5000]]], ['092', [['2026-11-02', 'AMAZON BUSINESS', 'AMAZON', -79], ['2026-11-08', 'BRITISH AIRWAYS', 'FLIGHT', -186.4], ['2026-11-12', 'ADOBE *CREATIVE CLOUD', 'ADOBE', -19.99], ['2026-11-12', 'CAPITAL CAB CO', 'TAXI', -24], ['2026-11-15', 'UBER EATS', 'MEAL', -58.2]]]]) for (const [i, [date, payee, reference, amount]] of specs.entries()) bankStatementLines.push({
    id: `bsl_${bank}_U${String(i + 1).padStart(2, '0')}`,
    bankAccountId: `ba_${bank}`,
    date,
    payee,
    reference,
    amount,
    type: amount < 0 ? 'DEBIT' : 'CREDIT',
    description: amount < 0 ? 'DIRECT DEBIT / CARD PAYMENT' : 'BACS CREDIT',
    status: 'unreconciled',
    reconciliation: null,
    discussNote: '',
    source: 'feed',
    importedAt: `${date}T06:00:00.000Z`
  });
  const manualJournals = [{
    id: 'mj_0001',
    narration: 'Conversion balances',
    date: '2026-03-31',
    status: 'POSTED',
    showOnCashBasis: true,
    lines: [['090', 24350, 0], ['091', 40000, 0], ['720', 8600, 0], ['950', 0, 1000], ['960', 0, 71950]].map(([accountCode, debit, credit], i) => ({
      id: `mjl_1_${i}`,
      accountCode,
      debit,
      credit,
      taxType: 'NONE'
    })),
    createdAt: stamp,
    createdBy: 'usr_hannah'
  }, {
    id: 'mj_0002',
    narration: 'Depreciation Apr–Sep 2026',
    date: '2026-09-30',
    status: 'POSTED',
    showOnCashBasis: true,
    lines: [{
      id: 'mjl_2_1',
      accountCode: '416',
      debit: 860,
      credit: 0,
      taxType: 'NONE'
    }, {
      id: 'mjl_2_2',
      accountCode: '721',
      debit: 0,
      credit: 860,
      taxType: 'NONE'
    }],
    createdAt: '2026-09-30T10:00:00.000Z',
    createdBy: 'usr_hannah'
  }];
  const creditNotes = [doc('cn_0001', 'ACCRECCREDIT', 'con_c12', '2026-06-30', '2026-06-30', 'Courtesy credit', [{
    description: 'Courtesy credit',
    unitAmount: 100,
    accountCode: '200',
    taxType: 'OUTPUT2'
  }], 'DRAFT'), doc('cn_0002', 'ACCRECCREDIT', 'con_c06', '2026-06-10', '2026-06-10', 'Discount agreed', [{
    description: 'Discount agreed',
    unitAmount: 50,
    accountCode: '200',
    taxType: 'OUTPUT2'
  }], 'PAID'), doc('cn_0003', 'ACCPAYCREDIT', 'con_s06', '2026-11-01', '2026-11-01', 'Returned stationery', [{
    description: 'Returned stationery',
    unitAmount: 12,
    accountCode: '461',
    taxType: 'INPUT2'
  }], 'AUTHORISED')].map((c, i) => ({
    ...c,
    creditNoteNumber: `CN-${pad(i + 1)}`,
    remainingCredit: i === 1 ? 0 : c.total,
    amountDue: i === 1 ? 0 : c.total,
    fullyPaidOnDate: i === 1 ? '2026-06-10' : null,
    allocations: i === 1 ? [{
      id: 'alloc_0001',
      invoiceId: 'inv_0007',
      amount: 60,
      date: '2026-06-10',
      createdAt: '2026-06-10T10:00:00.000Z',
      createdBy: 'usr_tom'
    }] : []
  }));
  for (const [kind, docs] of [['invoice', invoices], ['bill', bills]]) for (const d of docs) {
    for (const action of ['Created', ...(['AUTHORISED', 'PAID', 'VOIDED'].includes(d.status) ? ['Approved'] : []), ...(d.sentToContact ? ['Sent'] : []), ...(d.status === 'PAID' ? ['Paid'] : [])]) historyEvents.push({
      id: `hist_${d.id}_${action}`,
      entityType: kind,
      entityId: d.id,
      action,
      details: `${d.invoiceNumber || d.reference} · ${d.contactName}`,
      userId: 'usr_tom',
      userName: 'Tom Reid',
      createdAt: d.createdAt
    });
  }
  const state = {
    organisation,
    currentUser,
    users,
    accounts,
    taxRates,
    contacts,
    items,
    invoices,
    bills,
    payments,
    batchPayments,
    bankAccounts,
    bankStatementLines,
    bankTransactions,
    bankTransfers,
    manualJournals,
    creditNotes,
    historyEvents,
    emailLog: [],
    reportExports: [],
    favouriteReports: ['ProfitAndLoss', 'BalanceSheet', 'AgedReceivablesSummary'],
    savedReports: [],
    trackingCategories: [{
      id: 'trk_dept',
      name: 'Department',
      status: 'ACTIVE',
      options: [{
        id: 'opt_design',
        name: 'Design'
      }, {
        id: 'opt_marketing',
        name: 'Marketing'
      }, {
        id: 'opt_photo',
        name: 'Photography'
      }]
    }],
    brandingThemes: [{
      id: 'bt_standard',
      name: 'Standard',
      isDefault: true,
      paymentTermsText: 'Payment due within 30 days. Bank: Barclays 20-45-67 43218765'
    }, {
      id: 'bt_special',
      name: 'Special projects',
      paymentTermsText: '50% deposit, balance on delivery.'
    }],
    contactGroups: [{
      id: 'grp_retainer',
      name: 'Retainer clients',
      contactIds: ['con_c01', 'con_c08']
    }, {
      id: 'grp_education',
      name: 'Education',
      contactIds: ['con_c01', 'con_c16']
    }, {
      id: 'grp_utilities',
      name: 'Utilities & premises',
      contactIds: ['con_s01', 'con_s02', 'con_s03']
    }],
    quotes: ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'INVOICED', 'DRAFT'].map((status, i) => ({
      ...doc(`qu_${pad(i + 1)}`, 'ACCREC', `con_c${String(i + 1).padStart(2, '0')}`, '2026-11-01', '2026-12-01', 'Creative proposal', [{
        description: 'Design services',
        unitAmount: 750
      }], status),
      quoteNumber: `QU-${pad(i + 1)}`,
      invoiceId: status === 'INVOICED' ? 'inv_0046' : null,
      title: 'Creative services proposal',
      expiryDate: '2026-12-01'
    })),
    purchaseOrders: ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'BILLED'].map((status, i) => ({
      ...doc(`po_${pad(i + 1)}`, 'ACCPAY', 'con_s06', '2026-11-01', '2026-12-01', 'Office supplies', [{
        description: 'Office supplies',
        unitAmount: 150
      }], status),
      purchaseOrderNumber: `PO-${pad(i + 1)}`,
      billId: status === 'BILLED' ? 'bill_0027' : null
    })),
    repeatingInvoices: [0, 1].map(i => ({
      id: `ri_000${i + 1}`,
      templateInvoice: invoices[i ? 31 : 30],
      schedule: {
        period: 1,
        unit: 'MONTHLY',
        startDate: '2026-04-01',
        nextScheduledDate: '2026-12-01',
        endDate: null
      },
      saveAs: 'DRAFT',
      status: 'ACTIVE'
    })),
    bankRules: [['Barclays monthly charges', 'BARCLAYS', '404', 'NONE', 'con_s12'], ['Pret business meals', 'PRET', '420', 'INPUT2', null], ['Google Workspace', 'GOOGLE', '485', 'INPUT2', 'con_s14']].map(([name, value, accountCode, taxType, contactId], i) => ({
      id: `rule_00${i + 1}`,
      name,
      type: 'SPEND',
      bankAccountId: null,
      conditions: [{
        field: 'payee',
        operator: 'contains',
        value
      }],
      matchAll: true,
      contactId,
      lines: [{
        accountCode,
        taxType,
        description: name,
        percent: 100
      }],
      referenceSource: 'payee',
      status: 'ACTIVE',
      createdAt: stamp,
      createdBy: 'usr_hannah'
    })),
    dashboardLayout: {
      widgets: ['bank_ba_090', 'bank_ba_091', 'invoicesOwed', 'billsToPay', 'cashInOut', 'profitLoss', 'watchlist', 'tasks', 'recentPayments'],
      hidden: []
    }
  };
  for (const [i, [reportType, title, status, settings]] of [['ProfitAndLoss', 'Profit and Loss – Q1 FY27', 'published', {
    fromDate: '2026-04-01',
    toDate: '2026-06-30'
  }], ['BalanceSheet', 'Balance Sheet – 30 Sep 2026', 'draft', {
    asAtDate: '2026-09-30'
  }], ['AgedReceivablesSummary', 'Aged Receivables – 31 Oct 2026', 'published', {
    asAtDate: '2026-10-31',
    ageingBy: 'dueDate'
  }]].entries()) {
    const opts = {
        compare: {
          periods: 0,
          periodType: 'month'
        },
        basis: 'accrual',
        hideZeroRows: true,
        ...settings
      },
      r = buildReport(state, reportType, opts);
    state.savedReports.push({
      id: `rep_${pad(i + 1)}`,
      reportType,
      title,
      status,
      settings: opts,
      columns: r.columns,
      rows: r.rows,
      summary: r.summary,
      note: '',
      createdAt: '2026-10-08T09:00:00.000Z',
      updatedAt: '2026-10-08T09:00:00.000Z',
      createdBy: i === 1 ? 'usr_tom' : 'usr_hannah',
      publishedAt: status === 'published' ? '2026-11-02T10:30:00.000Z' : null,
      publishedBy: status === 'published' ? 'usr_hannah' : null
    });
  }
  return state;
}
const ACCOUNT_ROWS = [["090", "Business Current Account", "BANK", "NONE"], ["091", "Business Savings Account", "BANK", "NONE"], ["092", "Company Credit Card", "BANK", "NONE"], ["200", "Sales", "REVENUE", "OUTPUT2"], ["260", "Other Revenue", "REVENUE", "OUTPUT2"], ["270", "Interest Income", "OTHERINCOME", "NONE"], ["310", "Cost of Goods Sold", "DIRECTCOSTS", "INPUT2"], ["315", "Subcontractor Costs", "DIRECTCOSTS", "NONE"], ["320", "Direct Printing Costs", "DIRECTCOSTS", "INPUT2"], ["400", "Advertising & Marketing", "OVERHEADS", "INPUT2"], ["401", "Audit & Accountancy fees", "OVERHEADS", "INPUT2"], ["404", "Bank Charges", "OVERHEADS", "NONE"], ["408", "Cleaning", "OVERHEADS", "INPUT2"], ["412", "Consulting", "OVERHEADS", "INPUT2"], ["416", "Depreciation", "DEPRECIATN", "NONE"], ["420", "Entertainment-100% business", "OVERHEADS", "INPUT2"], ["425", "Postage, Freight & Courier", "OVERHEADS", "ZERORATEDINPUT"], ["429", "General Expenses", "OVERHEADS", "INPUT2"], ["433", "Insurance", "OVERHEADS", "EXEMPTINPUT"], ["437", "Interest Paid", "OVERHEADS", "NONE"], ["441", "Legal Expenses", "OVERHEADS", "INPUT2"], ["445", "Light, Power, Heating", "OVERHEADS", "INPUT2"], ["449", "Motor Vehicle Expenses", "OVERHEADS", "INPUT2"], ["453", "Office Expenses", "OVERHEADS", "INPUT2"], ["461", "Printing & Stationery", "OVERHEADS", "INPUT2"], ["463", "IT Software and Consumables", "OVERHEADS", "INPUT2"], ["469", "Rent", "OVERHEADS", "EXEMPTINPUT"], ["473", "Repairs & Maintenance", "OVERHEADS", "INPUT2"], ["477", "Salaries", "OVERHEADS", "NONE"], ["478", "Directors' Remuneration", "OVERHEADS", "NONE"], ["485", "Subscriptions", "OVERHEADS", "INPUT2"], ["489", "Telephone & Internet", "OVERHEADS", "INPUT2"], ["493", "Travel - National", "OVERHEADS", "INPUT2"], ["494", "Travel - International", "OVERHEADS", "ZERORATEDINPUT"], ["610", "Accounts Receivable", "CURRENT", "NONE"], ["620", "Prepayments", "PREPAYMENT", "NONE"], ["630", "Inventory", "INVENTORY", "NONE"], ["710", "Office Equipment", "FIXED", "INPUT2"], ["711", "Less Accumulated Depreciation on Office Equipment", "FIXED", "NONE"], ["720", "Computer Equipment", "FIXED", "INPUT2"], ["721", "Less Accumulated Depreciation on Computer Equipment", "FIXED", "NONE"], ["800", "Accounts Payable", "CURRLIAB", "NONE"], ["810", "Other Creditors", "CURRLIAB", "NONE"], ["820", "VAT", "CURRLIAB", "NONE"], ["825", "PAYE Payable", "CURRLIAB", "NONE"], ["830", "Corporation Tax", "CURRLIAB", "NONE"], ["840", "Historical Adjustment", "CURRLIAB", "NONE"], ["850", "Suspense", "CURRLIAB", "NONE"], ["860", "Rounding", "CURRLIAB", "NONE"], ["877", "Tracking Transfers", "CURRLIAB", "NONE"], ["900", "Loan", "TERMLIAB", "NONE"], ["950", "Capital - Ordinary Shares", "EQUITY", "NONE"], ["960", "Retained Earnings", "EQUITY", "NONE"], ["970", "Owner A Funds Introduced", "EQUITY", "NONE"]];
const ITEM_ROWS = [["DESIGN-HR", "Design \u2013 hourly rate", 95], ["STRAT-HR", "Strategy consultation (per hour)", 120], ["COPY-PG", "Copywriting \u2013 per page", 125], ["BRAND-PKG", "Brand identity package", 2400], ["WEB-BUILD", "Website build (fixed fee)", 4800], ["HOSTING", "Website hosting (annual)", 240], ["SEO-AUDIT", "SEO audit", 750], ["RETAINER", "Monthly marketing retainer", 1500], ["SOCIAL-MGMT", "Social media management (monthly)", 900], ["PHOTO-DAY", "Photography \u2013 day rate", 650], ["PHOTO-HALF", "Photography \u2013 half day", 400], ["PRINT-A5", "A5 flyers (per 500)", 85], ["PAPER-A4", "A4 paper (box of 5 reams)", 24], ["INK-CART", "Printer ink cartridge", 48]];
const INVOICE_ROWS = [["2026-04-03", 1, [["RETAINER", 1.0, 1500.0]], "PAID", "2026-04-28"], ["2026-04-08", 2, [["BRAND-PKG", 1.0, 2400.0]], "PAID", "2026-05-06"], ["2026-04-15", 3, [["DESIGN-HR", 12.0, 95.0]], "PAID", "2026-05-12"], ["2026-04-22", 4, [["WEB-BUILD", 1.0, 4800.0]], "PAID", "2026-05-20"], ["2026-05-01", 1, [["RETAINER", 1.0, 1500]], "PAID", "2026-05-29"], ["2026-05-07", 5, [["PHOTO-DAY", 2.0, 650.0]], "PAID", "2026-06-04"], ["2026-05-14", 6, [["STRAT-HR", 8.0, 120.0]], "PAID", "2026-06-10"], ["2026-05-21", 7, [["PRINT-A5", 4.0, 85.0]], "PAID", "2026-06-02"], ["2026-05-28", 9, [["SEO-AUDIT", 1.0, 750.0]], "PAID", "2026-06-25"], ["2026-06-02", 1, [["RETAINER", 1.0, 1500]], "PAID", "2026-06-30"], ["2026-06-09", 8, [["SOCIAL-MGMT", 1.0, 900.0]], "PAID", "2026-07-08"], ["2026-06-16", 10, [["WEB-BUILD", 1.0, 4800.0], ["HOSTING", 1.0, 240.0]], "PAID", "2026-07-14"], ["2026-06-23", 11, [["BRAND-PKG", 1.0, 2400.0]], "PAID", "2026-07-21"], ["2026-06-30", 12, [["DESIGN-HR", 6.0, 95.0]], "VOIDED", null], ["2026-07-01", 1, [["RETAINER", 1.0, 1500]], "PAID", "2026-07-30"], ["2026-07-08", 8, [["SOCIAL-MGMT", 1.0, 900]], "PAID", "2026-08-06"], ["2026-07-15", 13, [["DESIGN-HR", 20.0, 95.0]], "PAID", "2026-08-12"], ["2026-07-22", 14, [["PHOTO-DAY", 1.0, 650.0], ["PRINT-A5", 2.0, 85.0]], "PAID", "2026-08-19"], ["2026-08-03", 1, [["RETAINER", 1.0, 1500]], "PAID", "2026-09-01"], ["2026-08-10", 8, [["SOCIAL-MGMT", 1.0, 900]], "PAID", "2026-09-08"], ["2026-08-17", 15, [["STRAT-HR", 15.0, 120.0]], "PAID", "2026-09-15"], ["2026-08-24", 17, [["DESIGN-HR", 5.0, 95.0], ["SEO-AUDIT", 1.0, 750.0]], "AUTHORISED", null], ["2026-09-01", 1, [["RETAINER", 1.0, 1500]], "PAID", "2026-09-29"], ["2026-09-08", 5, [["PHOTO-HALF", 3.0, 400.0]], "AUTHORISED", null], ["2026-09-15", 8, [["SOCIAL-MGMT", 1.0, 900]], "PAID", "2026-10-13"], ["2026-09-22", 16, [["PRINT-A5", 10.0, 85.0]], "PAID", "2026-10-20"], ["2026-10-01", 2, [["STRAT-HR", 2.5, 120.0], ["BRAND-PKG", 1.0, 2400.0]], "PAID", "2026-11-05"], ["2026-10-06", 3, [["DESIGN-HR", 9.0, 95.0], ["STRAT-HR", 1.0, 120.0]], "AUTHORISED", null], ["2026-10-08", 6, [["COPY-PG", 10.0, 125.0]], "AUTHORISED", null], ["2026-10-09", 3, [["COPY-PG", 12.0, 125.0]], "AUTHORISED", null], ["2026-10-12", 1, [["RETAINER", 1.0, 1500]], "AUTHORISED", null], ["2026-10-13", 8, [["SOCIAL-MGMT", 1.0, 900]], "AUTHORISED", null], ["2026-10-20", 18, [["CUSTOM", 1, 2000]], "AUTHORISED", null], ["2026-10-27", 10, [["DESIGN-HR", 4.0, 95.0], ["HOSTING", 1.0, 240.0]], "AUTHORISED", null], ["2026-10-30", 20, [["PHOTO-DAY", 1.0, 650.0]], "AUTHORISED", null], ["2026-11-02", 19, [["PHOTO-HALF", 2.0, 400.0]], "DRAFT", null], ["2026-11-03", 8, [["SOCIAL-MGMT", 1.0, 900]], "SUBMITTED", null], ["2026-11-04", 11, [["WEB-BUILD", 1.0, 4800.0]], "SUBMITTED", null], ["2026-11-06", 1, [["RETAINER", 1.0, 1500]], "AUTHORISED", null], ["2026-11-09", 13, [["DESIGN-HR", 14.0, 95.0]], "SUBMITTED", null], ["2026-11-10", 15, [["COPY-PG", 6.0, 125.0]], "SUBMITTED", null], ["2026-11-12", 14, [["PRINT-A5", 3.0, 85.0]], "DRAFT", null], ["2026-11-13", 4, [["HOSTING", 1.0, 240.0], ["SEO-AUDIT", 1.0, 750.0]], "DRAFT", null], ["2026-11-16", 16, [["PHOTO-HALF", 1.0, 400.0]], "DRAFT", null], ["2026-11-17", 9, [["STRAT-HR", 6.0, 120.0]], "DRAFT", null], ["2026-11-17", 5, [["DESIGN-HR", 3.0, 95.0]], "DRAFT", null]];
const UNRECONCILED = [["2026-11-03", "RIDGEWAY UNIVERSITY", "INV-0031", 1800.0], ["2026-11-04", "NET CONNECT LTD", "DD NC-88213", -54.0], ["2026-11-05", "BOOM FM LTD", "BOOM FM BACS", 3240.0], ["2026-11-06", "CITY AGENCY", "INV-0028 INV-0030", 2970.0], ["2026-11-07", "BARCLAYS BANK", "MONTHLY FEE", -18.5], ["2026-11-09", "TRANSFER TO 73920184", "SAVINGS", -5000.0], ["2026-11-10", "PRET A MANGER", "CARD 4417", -4.8], ["2026-11-10", "TRUXTON PROPERTY", "RENT-NOV26", -1950.0], ["2026-11-11", "HAMILTON SMITH LTD", "INV-0029", 1494.0], ["2026-11-12", "LINKEDIN PREMIUM", "LNKD*PREM", -29.99], ["2026-11-12", "BAYSIDE CLUB", "PART PAYMENT INV-0024", 600.0], ["2026-11-13", "POWERDIRECT", "PD-1047721", -312.0], ["2026-11-14", "CENTRAL COPIERS", "CC-Q3-2291", -126.0], ["2026-11-16", "KENSINGTON DENTAL", "INV-0036", 960.0], ["2026-11-16", "ROYAL MAIL", "POSTAGE", -42.0], ["2026-11-17", "GOOGLE *WORKSPACE", "GSUITE", -11.4], ["2026-11-17", "OAKLEAF ORGANIC", "INV-0033", 2400.0], ["2026-11-17", "XERO UK", "XERO SUBSCRIPTION", -35.0]];
