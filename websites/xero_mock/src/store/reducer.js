import { calcDocumentTotals, round2, addDays, iso, dueDateFromTerms } from '../utils/money.js';
import { candidatesFor } from '../utils/reconcile.js';
let counter = 0;
export const newId = prefix => `${prefix}_${Date.now().toString(36)}${++counter}`;
const stamp = () => new Date().toISOString();
export function reduceAction(prev, action) {
  const s = structuredClone(prev),
    now = stamp(),
    actor = s.currentUser?.id || 'usr_hannah',
    kind = action.kind || 'invoice',
    key = kind === 'bill' ? 'bills' : kind === 'invoice' ? 'invoices' : kind === 'bankTransaction' ? 'bankTransactions' : kind === 'quote' ? 'quotes' : kind === 'purchaseOrder' ? 'purchaseOrders' : kind === 'creditNote' ? 'creditNotes' : `${kind}s`,
    list = k => s[k] || (s[k] = []),
    get = (k, id) => list(k).find(x => x.id === id),
    meta = {
      createdAt: now,
      createdBy: actor
    },
    updated = {
      updatedAt: now,
      updatedBy: actor
    };
  const history = (entityType, entityId, event, details = '') => list('historyEvents').push({
    id: newId('hist'),
    entityType,
    entityId,
    action: event,
    details,
    userId: actor,
    userName: s.currentUser?.name || 'Hannah Clarke',
    createdAt: now
  });
  const validateDoc = (d, status) => {
    if (!d.contactId || !get('contacts', d.contactId)) throw Error('Contact is required');
    if (!d.date || !d.dueDate || d.dueDate < d.date) throw Error('Due date must be on or after the issue date');
    const lines = (d.lineItems || []).filter(l => l.description || Number(l.unitAmount));
    if (!lines.length) throw Error('Add at least one line item');
    if (lines.some(l => !Number.isFinite(Number(l.quantity)) || !Number(l.quantity) || !Number.isFinite(Number(l.unitAmount)))) throw Error('Quantity must not be zero and prices must be valid numbers');
    if (['SUBMITTED', 'AUTHORISED'].includes(status) && lines.some(l => !list('accounts').some(a => a.code === l.accountCode && a.status !== 'ARCHIVED'))) throw Error('Each line requires an active account');
    if (s.organisation?.lockDate && d.date <= s.organisation.lockDate) throw Error('This date is locked');
    return lines;
  };
  function updatePaid(d) {
    const ps = list('payments').filter(p => p.documentId === d.id && p.status !== 'DELETED');
    d.amountPaid = round2(ps.reduce((sum, p) => sum + p.amount, 0));
    d.amountDue = round2(d.total - d.amountPaid - Number(d.amountCredited || 0));
    d.paymentIds = ps.map(p => p.id);
    d.status = d.amountDue === 0 ? 'PAID' : 'AUTHORISED';
    d.fullyPaidOnDate = d.amountDue === 0 ? ps.map(p => p.date).sort().at(-1) : null;
    Object.assign(d, updated);
  }
  function payment(data, source = 'manual') {
    const dk = data.documentType === 'bill' ? 'bills' : 'invoices',
      d = get(dk, data.documentId),
      amount = round2(data.amount);
    if (!d || d.status !== 'AUTHORISED' || !Number.isFinite(amount) || amount <= 0 || amount > Number(d.amountDue)) throw Error('Payment amount must not exceed the amount due and must be greater than zero');
    if (!get('bankAccounts', data.bankAccountId)) throw Error('Choose a bank account');
    if (!data.date) throw Error('Payment date is required');
    const p = {
      id: newId('pay'),
      type: dk === 'bills' ? 'ACCPAYPAYMENT' : 'ACCRECPAYMENT',
      documentType: dk === 'bills' ? 'bill' : 'invoice',
      documentId: d.id,
      documentNumber: dk === 'bills' ? d.reference : d.invoiceNumber || d.reference,
      contactId: d.contactId,
      bankAccountId: data.bankAccountId,
      date: data.date,
      amount,
      reference: data.reference || '',
      isReconciled: false,
      statementLineId: null,
      batchPaymentId: null,
      source,
      status: 'AUTHORISED',
      ...meta,
      ...data
    };
    p.amount = amount;
    list('payments').push(p);
    updatePaid(d);
    history(p.documentType, d.id, d.status === 'PAID' ? 'Paid' : p.documentType === 'bill' ? 'Payment made' : 'Payment received', `${amount} on ${p.date}`);
    return p;
  }
  function unreconcile(lineId) {
    const line = get('bankStatementLines', lineId);
    if (!line || line.status !== 'reconciled') return;
    for (const m of [...(line.reconciliation?.matched || []), ...(line.reconciliation?.adjustments || []).map(a => ({
      kind: 'bankTransaction',
      id: a.bankTransactionId
    }))]) {
      const k = {
          payment: 'payments',
          bankTransaction: 'bankTransactions',
          bankTransfer: 'bankTransfers',
          batchPayment: 'batchPayments'
        }[m.kind],
        item = get(k, m.id);
      if (!item) continue;
      if (m.kind === 'bankTransfer') {
        const side = item.fromBankAccountId === line.bankAccountId ? 'from' : 'to';
        item[`${side}IsReconciled`] = false;
        item[`${side}StatementLineId`] = null;
      } else {
        item.isReconciled = false;
        item.statementLineId = null;
        if (m.kind === 'batchPayment') for (const p of list('payments').filter(p => p.batchPaymentId === item.id)) {
          p.isReconciled = false;
          p.statementLineId = null;
        }
      }
    }
    line.status = 'unreconciled';
    line.reconciliation = null;
    history('statementLine', line.id, 'Unreconciled');
  }
  function removePayment(p) {
    if (!p || p.status === 'DELETED') return;
    if (p.statementLineId) unreconcile(p.statementLineId);
    p.status = 'DELETED';
    p.deletedAt = now;
    p.deletedBy = actor;
    if (p.batchPaymentId) {
      const batch = get('batchPayments', p.batchPaymentId);
      if (batch) {
        batch.paymentIds = (batch.paymentIds || []).filter(id => id !== p.id);
        batch.billIds = (batch.billIds || []).filter(id => id !== p.documentId);
        batch.total = round2(batch.total - p.amount);
        if (!batch.paymentIds.length) batch.status = 'DELETED';
      }
    }
    const d = get(p.documentType === 'bill' ? 'bills' : 'invoices', p.documentId);
    if (d) {
      updatePaid(d);
      history(p.documentType, d.id, 'Payment removed', String(p.amount));
    }
  }
  switch (action.type) {
    case 'saveDocument':
      {
        const data = action.data,
          d = action.id ? get(key, action.id) : null;
        if (action.id && !d) throw Error('Document not found');
        if (d && (!['DRAFT', 'SUBMITTED', 'AUTHORISED'].includes(d.status) || d.amountPaid > 0)) throw Error('This document cannot be edited. Remove the payments to edit.');
        const previousStatus = d?.status,
          status = action.status || previousStatus || 'DRAFT',
          lines = validateDoc(data, status);
        if (kind === 'invoice' && list('invoices').some(x => x.id !== action.id && x.status !== 'DELETED' && x.invoiceNumber === data.invoiceNumber)) throw Error('Invoice number already exists');
        const record = {
          currencyCode: 'GBP',
          amountPaid: 0,
          amountCredited: 0,
          paymentIds: [],
          creditNoteIds: [],
          attachments: [],
          sentToContact: false,
          ...d,
          ...data,
          ...(kind === 'bill' ? { invoiceNumber: '' } : {}),
          lineItems: lines,
          id: d?.id || action.newId || newId(kind === 'invoice' ? 'inv' : kind === 'bill' ? 'bill' : 'btx'),
          type: kind === 'invoice' ? 'ACCREC' : kind === 'bill' ? 'ACCPAY' : data.type,
          status,
          contactName: get('contacts', data.contactId)?.name,
          ...(d ? updated : meta)
        };
        Object.assign(record, calcDocumentTotals(record, list('taxRates')));
        if (status === 'AUTHORISED' && previousStatus !== 'AUTHORISED') Object.assign(record, {
          approvedAt: now,
          approvedBy: actor
        });
        if (status === 'SUBMITTED' && previousStatus !== 'SUBMITTED') Object.assign(record, {
          submittedAt: now,
          submittedBy: actor
        });
        if (d) Object.assign(d, record);else {
          list(key).push(record);
          if (kind === 'invoice') {
            const settings = s.organisation.invoiceSettings;
            if (record.invoiceNumber === `${settings.invoicePrefix || 'INV-'}${String(settings.nextInvoiceNumber).padStart(4, '0')}`) settings.nextInvoiceNumber++;
          }
        }
        history(kind, record.id, d ? 'Edited' : 'Created', record.invoiceNumber || record.reference);
        if (['SUBMITTED', 'AUTHORISED'].includes(status) && previousStatus !== status) history(kind, record.id, status === 'AUTHORISED' ? 'Approved' : 'Submitted');
        break;
      }
    case 'documentAction':
      {
        for (const id of action.ids || [action.id]) {
          const d = get(key, id);
          if (!d) throw Error('Document not found');
          const event = action.event;
          if (event === 'approve') {
            if (!['DRAFT', 'SUBMITTED'].includes(d.status)) throw Error('Only draft or submitted documents can be approved');
            validateDoc(d, 'AUTHORISED');
            Object.assign(d, {
              status: 'AUTHORISED',
              approvedAt: now,
              approvedBy: actor
            }, updated);
          }
          if (event === 'delete') {
            if (!['DRAFT', 'SUBMITTED'].includes(d.status)) throw Error('Only draft or submitted documents can be deleted');
            Object.assign(d, {
              status: 'DELETED',
              deletedAt: now,
              deletedBy: actor
            });
          }
          if (event === 'void') {
            if (d.status !== 'AUTHORISED' || d.amountPaid > 0) throw Error('Only unpaid approved documents can be voided');
            Object.assign(d, {
              status: 'VOIDED',
              voidedAt: now,
              voidedBy: actor,
              voidReason: action.reason || ''
            });
          }
          if (event === 'sent' || event === 'unsent') {
            if (!['AUTHORISED', 'PAID'].includes(d.status)) throw Error('Approve this document first');
            Object.assign(d, {
              sentToContact: event === 'sent',
              sentAt: event === 'sent' ? now : null
            });
          }
          history(kind, id, {
            approve: 'Approved',
            delete: 'Deleted',
            void: 'Voided',
            sent: 'Sent',
            unsent: 'Marked as unsent'
          }[event] || event, action.reason || '');
        }
        break;
      }
    case 'email':
      {
        const d = get(key, action.id),
          data = action.data;
        if (!d || !['AUTHORISED', 'PAID'].includes(d.status)) throw Error('Approve this document before sending');
        if (!data.to?.length || data.to.some(x => !/^\S+@\S+\.\S+$/.test(x))) throw Error('Enter valid email addresses');
        list('emailLog').push({
          id: newId('em'),
          documentType: kind,
          documentId: d.id,
          ...data,
          sentAt: now,
          sentBy: actor
        });
        d.sentToContact = true;
        d.sentAt = now;
        history(kind, d.id, 'Sent', data.to.join(', '));
        break;
      }
    case 'payment':
      payment(action.data);
      break;
    case 'removePayment':
      removePayment(get('payments', action.id));
      break;
    case 'batch':
      {
        const data = action.data,
          rows = data.rows.filter(r => Number(r.amount) > 0);
        if (!rows.length) throw Error('Enter at least one payment');
        const batch = {
          id: action.newId || newId('bp'),
          type: 'PAYBATCH',
          bankAccountId: data.bankAccountId,
          date: data.date,
          reference: data.reference,
          billIds: [],
          paymentIds: [],
          total: 0,
          isReconciled: false,
          ...meta
        };
        for (const row of rows) {
          const p = payment({
            ...row,
            documentType: 'bill',
            bankAccountId: batch.bankAccountId,
            date: batch.date,
            reference: batch.reference,
            batchPaymentId: batch.id
          }, 'batch');
          batch.billIds.push(p.documentId);
          batch.paymentIds.push(p.id);
          batch.total = round2(batch.total + p.amount);
        }
        list('batchPayments').push(batch);
        break;
      }
    case 'discuss':
      {
        const l = get('bankStatementLines', action.id);
        if (!l) throw Error('Statement line not found');
        l.discussNote = action.note;
        l.discussUpdatedAt = now;
        l.discussUpdatedBy = actor;
        break;
      }
    case 'reconcile':
      {
        const line = get('bankStatementLines', action.id);
        if (!line || line.status !== 'unreconciled') throw Error('This line has already been reconciled');
        const data = action.data,
          method = data.method,
          matched = [],
          adjustments = [],
          positive = line.amount > 0;
        const createBankTxn = (values, source, signedAmount) => {
          const tx = {
            id: newId('btx'),
            type: signedAmount < 0 ? 'SPEND' : 'RECEIVE',
            bankAccountId: line.bankAccountId,
            date: line.date,
            reference: line.reference,
            contactId: values.contactId,
            contactName: get('contacts', values.contactId)?.name || values.contactName || line.payee,
            lineAmountTypes: 'Inclusive',
            lineItems: [{
              id: newId('li'),
              quantity: 1,
              unitAmount: Math.abs(signedAmount),
              discountRate: 0,
              description: values.description,
              accountCode: values.accountCode,
              taxType: values.taxType || 'NONE',
              tracking: []
            }],
            source,
            status: 'AUTHORISED',
            isReconciled: true,
            statementLineId: line.id,
            ...meta
          };
          Object.assign(tx, calcDocumentTotals(tx, list('taxRates')));
          list('bankTransactions').push(tx);
          history('bankTransaction', tx.id, 'Created');
          return tx;
        };
        if (method === 'create') {
          if (!data.accountCode || !list('accounts').some(a => a.code === data.accountCode && a.status !== 'ARCHIVED') || !data.description || !data.contactId && !data.contactName) throw Error('Who, What and Why are required');
          let contactId = data.contactId;
          if (!contactId) {
            const existing = list('contacts').find(c => c.name.toLowerCase() === data.contactName.toLowerCase() && c.contactStatus !== 'ARCHIVED');
            contactId = existing?.id || newId('con');
            if (!existing) list('contacts').push({
              id: contactId,
              name: data.contactName,
              contactStatus: 'ACTIVE',
              isCustomer: positive,
              isSupplier: !positive,
              ...meta
            });
          }
          const tx = createBankTxn({
            ...data,
            contactId
          }, data.bankRuleId ? 'bank-rule' : 'reconcile-create', line.amount);
          if (data.bankRuleId) {
            tx.bankRuleId = data.bankRuleId;
            const rule = get('bankRules', data.bankRuleId);
            if ((rule?.lines || []).length > 1) {
              let allocated = 0;
              tx.lineItems = rule.lines.map((r, i) => {
                const amount = i === rule.lines.length - 1 ? round2(Math.abs(line.amount) - allocated) : round2(Math.abs(line.amount) * r.percent / 100);
                allocated = round2(allocated + amount);
                return {
                  id: newId('li'),
                  quantity: 1,
                  unitAmount: amount,
                  discountRate: 0,
                  description: r.description || data.description,
                  accountCode: r.accountCode,
                  taxType: r.taxType || 'NONE',
                  tracking: []
                };
              });
              Object.assign(tx, calcDocumentTotals(tx, list('taxRates')));
            }
          }
          matched.push({
            kind: 'bankTransaction',
            id: tx.id,
            amount: tx.total
          });
        } else if (method === 'transfer') {
          if (data.otherBankAccountId === line.bankAccountId || !get('bankAccounts', data.otherBankAccountId)) throw Error('Choose a different bank account');
          const t = {
            id: newId('btr'),
            fromBankAccountId: positive ? data.otherBankAccountId : line.bankAccountId,
            toBankAccountId: positive ? line.bankAccountId : data.otherBankAccountId,
            date: line.date,
            amount: Math.abs(line.amount),
            reference: data.description || line.reference,
            fromIsReconciled: !positive,
            toIsReconciled: positive,
            fromStatementLineId: positive ? null : line.id,
            toStatementLineId: positive ? line.id : null,
            source: 'reconcile-transfer',
            bankRuleId: data.bankRuleId || null,
            ...meta
          };
          list('bankTransfers').push(t);
          matched.push({
            kind: 'bankTransfer',
            id: t.id,
            amount: t.amount
          });
        } else {
          const candidates = candidatesFor(s, line),
            selected = data.selected || [];
          if (!selected.length) throw Error('Select matching transactions');
          const total = round2(selected.reduce((n, r) => n + Number(r.amount), 0) + (data.adjustments || []).reduce((n, r) => n + Number(r.amount), 0));
          if (total !== Math.abs(line.amount)) throw Error('Out by must be 0.00');
          const seen = new Set();
          for (const choice of selected) {
            const c = candidates.find(c => c.id === choice.id && c.kind === choice.kind),
              amount = round2(choice.amount);
            if (!c || seen.has(c.id) || !Number.isFinite(amount) || amount <= 0 || amount > c.amount) throw Error('Invalid matching amount');
            seen.add(c.id);
            if (['invoice', 'bill'].includes(c.kind)) {
              const p = payment({
                documentType: c.kind,
                documentId: c.id,
                amount,
                bankAccountId: line.bankAccountId,
                date: line.date,
                reference: line.reference,
                isReconciled: true,
                statementLineId: line.id
              }, 'reconcile');
              matched.push({
                kind: 'payment',
                id: p.id,
                amount
              });
            } else {
              if (amount !== c.amount) throw Error('Existing transactions must be matched in full');
              const k = {
                  payment: 'payments',
                  bankTransaction: 'bankTransactions',
                  bankTransfer: 'bankTransfers',
                  batchPayment: 'batchPayments'
                }[c.kind],
                item = get(k, c.id);
              if (c.kind === 'bankTransfer') {
                const side = item.fromBankAccountId === line.bankAccountId ? 'from' : 'to';
                item[`${side}IsReconciled`] = true;
                item[`${side}StatementLineId`] = line.id;
              } else {
                item.isReconciled = true;
                item.statementLineId = line.id;
                if (c.kind === 'batchPayment') for (const p of list('payments').filter(p => p.batchPaymentId === item.id)) {
                  p.isReconciled = true;
                  p.statementLineId = line.id;
                }
              }
              matched.push({
                kind: c.kind,
                id: item.id,
                amount
              });
            }
          }
          for (const adj of data.adjustments || []) {
            if (!Number.isFinite(Number(adj.amount)) || !Number(adj.amount)) throw Error('Enter a valid adjustment');
            const tx = createBankTxn({
              description: adj.kind === 'bankFee' ? 'Bank fee' : 'Minor adjustment',
              accountCode: adj.kind === 'bankFee' ? '404' : '860',
              taxType: 'NONE'
            }, 'reconcile-adjustment', positive ? adj.amount : -adj.amount);
            adjustments.push({
              kind: adj.kind,
              bankTransactionId: tx.id,
              amount: round2(adj.amount)
            });
          }
        }
        line.status = 'reconciled';
        line.reconciliation = {
          method,
          matched,
          adjustments,
          reconciledAt: now,
          reconciledBy: actor
        };
        history('statementLine', line.id, 'Reconciled', method);
        break;
      }
    case 'unreconcile':
      unreconcile(action.id);
      break;
    case 'removeRedo':
      {
        const item = get(key, action.id);
        if (item?.statementLineId) unreconcile(item.statementLineId);
        if (kind === 'payment') removePayment(item);else if (item) {
          item.status = 'DELETED';
          item.deletedAt = now;
          item.deletedBy = actor;
        }
        break;
      }
    case 'saveBankTransaction':
      {
        const data = action.data,
          d = action.id ? get('bankTransactions', action.id) : null;
        if (d?.isReconciled) throw Error('Unreconcile this transaction before editing');
        if (!get('bankAccounts', data.bankAccountId)) throw Error('Choose a bank account');
        const lines = validateDoc({
            ...data,
            dueDate: data.date
          }, 'AUTHORISED'),
          record = {
            ...d,
            ...data,
            lineItems: lines,
            id: d?.id || action.newId || newId('btx'),
            status: 'AUTHORISED',
            isReconciled: false,
            source: 'manual',
            contactName: get('contacts', data.contactId)?.name,
            ...(d ? updated : meta)
          };
        Object.assign(record, calcDocumentTotals(record, list('taxRates')));
        if (record.total <= 0) throw Error('Amount must be greater than zero');
        if (d) Object.assign(d, record);else list('bankTransactions').push(record);
        history('bankTransaction', record.id, d ? 'Edited' : 'Created');
        if (action.statementLineId) {
          const line = get('bankStatementLines', action.statementLineId);
          if (!line || line.status !== 'unreconciled' || Math.abs(line.amount) !== record.total) throw Error('The transaction total must equal the unreconciled statement line');
          return reduceAction(s, {
            type: 'reconcile',
            id: line.id,
            data: {
              method: 'match',
              selected: [{
                kind: 'bankTransaction',
                id: record.id,
                amount: record.total
              }]
            }
          });
        }
        break;
      }
    case 'transfer':
      {
        const d = action.data;
        if (d.fromBankAccountId === d.toBankAccountId || !get('bankAccounts', d.fromBankAccountId) || !get('bankAccounts', d.toBankAccountId)) throw Error('Choose two different bank accounts');
        if (!Number.isFinite(Number(d.amount)) || Number(d.amount) <= 0 || !d.date) throw Error('Enter a valid date and positive amount');
        list('bankTransfers').push({
          ...d,
          id: action.newId || newId('btr'),
          amount: round2(d.amount),
          fromIsReconciled: false,
          toIsReconciled: false,
          source: 'manual',
          ...meta
        });
        break;
      }
    case 'deleteTransfer':
      {
        const t = get('bankTransfers', action.id);
        if (t?.fromIsReconciled || t?.toIsReconciled) throw Error('Unreconcile both sides first');
        if (t) {
          t.status = 'DELETED';
          t.deletedAt = now;
        }
        break;
      }
    case 'saveReport':
      {
        const r = {
          ...action.data,
          id: action.newId || newId('rep'),
          ...meta,
          updatedAt: now
        };
        if (r.status === 'published') Object.assign(r, {
          publishedAt: now,
          publishedBy: actor
        });
        list('savedReports').push(r);
        history('report', r.id, r.status === 'published' ? 'Published' : 'Created');
        break;
      }
    case 'reportAction':
      {
        const r = get('savedReports', action.id);
        if (!r) throw Error('Report not found');
        if (action.event === 'delete') {
          s.savedReports = list('savedReports').filter(x => x.id !== r.id);
          break;
        }
        if (r.status === 'published' && ['edit', 'refresh'].includes(action.event)) throw Error('Published reports are read-only');
        if (action.event === 'publish') Object.assign(r, {
          status: 'published',
          publishedAt: now,
          publishedBy: actor
        });
        if (action.event === 'archive') {
          r.previousStatus = r.status;
          r.status = 'archived';
        }
        if (action.event === 'restore') r.status = r.previousStatus || 'draft';
        if (action.event === 'edit' || action.event === 'refresh') Object.assign(r, action.data);
        r.updatedAt = now;
        history('report', r.id, {
          edit: 'Edited',
          refresh: 'Refreshed',
          publish: 'Published',
          archive: 'Archived',
          restore: 'Restored'
        }[action.event] || action.event);
        break;
      }
    case 'exportReport':
      list('reportExports').push({
        ...action.data,
        id: newId('rx'),
        ...meta
      });
      break;
    case 'favourite':
      s.favouriteReports = list('favouriteReports').includes(action.id) ? list('favouriteReports').filter(x => x !== action.id) : [...list('favouriteReports'), action.id];
      break;
    case 'saveContact':
      {
        const data = action.data,
          name = data.name?.trim();
        if (!name) throw Error('Contact name is required');
        if (list('contacts').some(c => c.id !== action.id && c.contactStatus !== 'ARCHIVED' && c.name?.toLowerCase() === name.toLowerCase())) throw Error('A contact with this name already exists');
        if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) throw Error('Enter a valid email');
        const c = get('contacts', action.id);
        if (c) Object.assign(c, data, {
          name
        }, updated);else list('contacts').push({
          contactStatus: 'ACTIVE',
          ...data,
          name,
          id: action.newId || newId('con'),
          ...meta
        });
        history('contact', c?.id || action.newId, c ? 'Edited' : 'Created');
        break;
      }
    case 'contactAction':
      {
        for (const id of action.ids || [action.id]) {
          const c = get('contacts', id);
          if (!c) continue;
          if (action.event === 'archive') {
            if ([...list('invoices'), ...list('bills')].some(d => d.contactId === id && d.status === 'AUTHORISED' && d.amountDue > 0)) throw Error('This contact has outstanding items and cannot be archived');
            c.contactStatus = 'ARCHIVED';
          }
          if (action.event === 'restore') c.contactStatus = 'ACTIVE';
          if (action.event === 'star') c.starred = !c.starred;
          Object.assign(c, updated);
        }
        break;
      }
    case 'group':
      {
        let group = get('contactGroups', action.id);
        if (!group) {
          if (!action.name?.trim()) throw Error('Enter a group name');
          group = {
            id: newId('grp'),
            name: action.name.trim(),
            contactIds: []
          };
          list('contactGroups').push(group);
        }
        group.contactIds = [...new Set([...(group.contactIds || []), ...action.ids])];
        break;
      }
    case 'saveItem':
      {
        if (!action.data.code?.trim() || !action.data.name?.trim()) throw Error('Code and name are required');
        if (list('items').some(i => i.id !== action.id && i.code?.toLowerCase() === action.data.code.toLowerCase())) throw Error('Item code already exists');
        const item = get('items', action.id);
        if (item) Object.assign(item, action.data, updated);else list('items').push({
          ...action.data,
          id: action.newId || newId('itm'),
          status: 'ACTIVE',
          ...meta
        });
        break;
      }
    case 'deleteItem':
      s.items = list('items').filter(i => i.id !== action.id);
      break;
    case 'watchlist':
      {
        const a = get('accounts', action.id);
        if (a) a.showOnDashboard = !a.showOnDashboard;
        break;
      }
    case 'secondarySave':
      {
        const data = action.data,
          prefix = kind === 'quote' ? 'QU-' : kind === 'purchaseOrder' ? 'PO-' : 'CN-',
          numberKey = kind === 'quote' ? 'quoteNumber' : kind === 'purchaseOrder' ? 'purchaseOrderNumber' : 'creditNoteNumber',
          nextKey = kind === 'quote' ? 'nextQuoteNumber' : kind === 'purchaseOrder' ? 'nextPurchaseOrderNumber' : 'nextCreditNoteNumber',
          d = get(key, action.id),
          previousStatus = d?.status;
        if (!data.contactId || !data.date) throw Error('Contact and date are required');
        const lines = validateDoc({
          ...data,
          dueDate: data.expiryDate || data.deliveryDate || data.date
        }, action.status === 'DRAFT' ? 'DRAFT' : 'AUTHORISED');
        const record = {
          ...d,
          ...data,
          id: d?.id || action.newId || newId(kind === 'quote' ? 'qu' : kind === 'purchaseOrder' ? 'po' : 'cn'),
          status: action.status || 'DRAFT',
          lineItems: lines,
          contactName: get('contacts', data.contactId)?.name,
          ...(d ? updated : meta)
        };
        const settings = s.organisation.invoiceSettings;
        if (!d) {
          record[numberKey] = `${prefix}${String(settings[nextKey] || 1).padStart(4, '0')}`;
          settings[nextKey] = (settings[nextKey] || 1) + 1;
        }
        Object.assign(record, calcDocumentTotals(record, list('taxRates')));
        if (kind === 'creditNote') {
          record.type = data.type || 'ACCRECCREDIT';
          record.allocations = d?.allocations || [];
          record.remainingCredit = round2(record.total - record.allocations.reduce((sum, a) => sum + a.amount, 0));
          record.amountDue = record.remainingCredit;
          if (record.status === 'AUTHORISED' && record.remainingCredit === 0) record.status = 'PAID';
          record.fullyPaidOnDate = record.status === 'PAID'
            ? d?.fullyPaidOnDate || record.allocations.map(a => a.date).filter(Boolean).sort().at(-1) || record.date
            : null;
        }
        if (d) Object.assign(d, record);else list(key).push(record);
        history(kind, record.id, d ? 'Edited' : 'Created');
        if (['SUBMITTED', 'AUTHORISED'].includes(record.status) && previousStatus !== record.status) history(kind, record.id, record.status === 'AUTHORISED' ? 'Approved' : 'Submitted');
        break;
      }
    case 'secondaryAction':
      {
        const d = get(key, action.id);
        if (!d) throw Error('Document not found');
        if (action.event === 'convert') {
          if (d.invoiceId || d.billId || ['INVOICED', 'BILLED'].includes(d.status)) throw Error('This document has already been converted');
          const invoice = kind === 'quote',
            target = invoice ? 'invoices' : 'bills',
            newDocumentId = action.newId || newId(invoice ? 'inv' : 'bill'),
            settings = s.organisation.invoiceSettings,
            number = invoice ? `${settings.invoicePrefix || 'INV-'}${String(settings.nextInvoiceNumber || 1).padStart(4, '0')}` : '';
          const copy = {
            ...d,
            id: newDocumentId,
            type: invoice ? 'ACCREC' : 'ACCPAY',
            invoiceNumber: number,
            status: 'DRAFT',
            date: action.date,
            dueDate: addDays(action.date, 30),
            amountPaid: 0,
            amountCredited: 0,
            amountDue: d.total,
            paymentIds: [],
            creditNoteIds: [],
            sentToContact: false,
            ...meta
          };
          delete copy.invoiceId;
          delete copy.billId;
          list(target).push(copy);
          if (invoice) settings.nextInvoiceNumber++;
          d[invoice ? 'invoiceId' : 'billId'] = newDocumentId;
          d.status = invoice ? 'INVOICED' : 'BILLED';
          history(invoice ? 'invoice' : 'bill', newDocumentId, 'Created', `Copied from ${d.quoteNumber || d.purchaseOrderNumber}`);
        } else if (action.event === 'send') {
          if (!action.data.to?.length || action.data.to.some(x => !/^\S+@\S+\.\S+$/.test(x))) throw Error('Enter valid email addresses');
          list('emailLog').push({
            ...action.data,
            id: newId('em'),
            documentType: kind,
            documentId: d.id,
            sentAt: now,
            sentBy: actor
          });
          d.status = kind === 'quote' ? 'SENT' : d.status;
          d.sentToContact = true;
          d.sentAt = now;
        } else if (action.event === 'delete') {
          if (d.allocations?.length) throw Error('Remove credit allocations first');
          d.status = 'DELETED';
          d.deletedAt = now;
        } else {
          if (action.event === 'AUTHORISED') validateDoc({
            ...d,
            dueDate: d.deliveryDate || d.expiryDate || d.date
          }, 'AUTHORISED');
          d.status = action.event;
        }
        Object.assign(d, updated);
        const eventLabel = {
          ACCEPTED: 'Accepted',
          DECLINED: 'Declined',
          AUTHORISED: 'Approved',
          SUBMITTED: 'Submitted',
          convert: kind === 'quote' ? 'Invoiced' : 'Copied to bill',
          send: 'Sent',
          delete: 'Deleted'
        }[action.event] || action.event;
        history(kind, d.id, eventLabel, action.event === 'convert' ? d.invoiceId || d.billId : '');
        break;
      }
    case 'allocateCredit':
      {
        const c = get('creditNotes', action.id);
        if (!c || c.status !== 'AUTHORISED' || c.type === 'ACCPAYCREDIT') throw Error('Choose an approved sales credit note');
        let total = 0;
        for (const allocation of action.allocations) {
          const d = get('invoices', allocation.invoiceId),
            amount = round2(allocation.amount);
          if (!d || d.status !== 'AUTHORISED' || d.contactId !== c.contactId || !Number.isFinite(amount) || amount <= 0 || amount > d.amountDue) throw Error('Allocation must not exceed the amount due');
          total = round2(total + amount);
        }
        if (total > c.remainingCredit) throw Error('Allocation exceeds the remaining credit');
        for (const allocation of action.allocations) {
          const amount = round2(allocation.amount),
            d = get('invoices', allocation.invoiceId);
          d.amountCredited = round2(Number(d.amountCredited || 0) + amount);
          d.amountDue = round2(d.total - d.amountPaid - d.amountCredited);
          d.creditNoteIds = [...new Set([...(d.creditNoteIds || []), c.id])];
          if (d.amountDue === 0) {
            d.status = 'PAID';
            d.fullyPaidOnDate = action.date;
          }
          (c.allocations ||= []).push({
            id: newId('alloc'),
            invoiceId: d.id,
            amount,
            date: action.date,
            ...meta
          });
          Object.assign(d, updated);
          history('invoice', d.id, 'Credit allocated', String(amount));
          history('creditNote', c.id, 'Credit allocated', `${amount} to ${d.id}`);
        }
        c.remainingCredit = round2(c.remainingCredit - total);
        c.amountDue = c.remainingCredit;
        if (c.remainingCredit === 0) {
          c.status = 'PAID';
          c.fullyPaidOnDate = action.date;
        }
        Object.assign(c, updated);
        break;
      }
    case 'repeatingAction':
      {
        const r = get('repeatingInvoices', action.id);
        if (!r) throw Error('Repeating invoice not found');
        if (action.event === 'generate') {
          const d = r.templateInvoice || {},
            settings = s.organisation.invoiceSettings,
            id = action.newId || newId('inv'),
            date = action.date,
            record = {
              ...d,
              id,
              type: 'ACCREC',
              status: r.saveAs === 'DRAFT' ? 'DRAFT' : 'AUTHORISED',
              date,
              dueDate: dueDateFromTerms(date, {
                day: r.schedule?.dueDateDay ?? 30,
                type: r.schedule?.dueDateType || 'DAYSAFTERBILLDATE'
              }),
              invoiceNumber: `${settings.invoicePrefix || 'INV-'}${String(settings.nextInvoiceNumber || 1).padStart(4, '0')}`,
              amountPaid: 0,
              amountCredited: 0,
              paymentIds: [],
              creditNoteIds: [],
              sentToContact: false,
              ...meta
            };
          Object.assign(record, calcDocumentTotals(record, list('taxRates')));
          list('invoices').push(record);
          settings.nextInvoiceNumber++;
          const next = new Date(`${r.schedule.nextScheduledDate || date}T12:00:00`);
          if (r.schedule.unit === 'WEEKLY') next.setDate(next.getDate() + 7 * Number(r.schedule.period || 1));else next.setMonth(next.getMonth() + Number(r.schedule.period || 1));
          r.schedule.nextScheduledDate = iso(next);
          history('invoice', id, 'Created', 'Created from repeating invoice');
        } else r.status = action.event;
        break;
      }
    case 'saveRepeating':
      {
        if (!action.data.templateInvoice?.contactId || !action.data.schedule?.nextScheduledDate || Number(action.data.schedule?.period) <= 0) throw Error('Contact, positive repeat interval and next invoice date are required');
        const r = get('repeatingInvoices', action.id);
        if (r) Object.assign(r, action.data, updated);else list('repeatingInvoices').push({
          ...action.data,
          id: action.newId || newId('ri'),
          status: 'ACTIVE',
          ...meta
        });
        break;
      }
    case 'saveJournal':
      {
        const data = action.data,
          lines = (data.lines || []).filter(l => Number(l.debit) || Number(l.credit)),
          dr = round2(lines.reduce((n, l) => n + Number(l.debit || 0), 0)),
          cr = round2(lines.reduce((n, l) => n + Number(l.credit || 0), 0));
        if (!data.narration?.trim() || !data.date || !lines.length) throw Error('Narration, date and journal lines are required');
        if (dr !== cr) throw Error(`Total is out by ${round2(dr - cr)}`);
        if (lines.some(l => !list('accounts').some(a => a.code === l.accountCode) || Number(l.debit) < 0 || Number(l.credit) < 0 || Number(l.debit) && Number(l.credit))) throw Error('Each line must use one debit or credit and a valid account');
        list('manualJournals').push({
          ...data,
          lines: lines.map(l => ({
            ...l,
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0)
          })),
          id: action.newId || newId('mj'),
          ...meta
        });
        break;
      }
    case 'voidJournal':
      {
        const j = get('manualJournals', action.id);
        if (j) {
          j.status = 'VOIDED';
          j.voidedAt = now;
          j.voidedBy = actor;
        }
        break;
      }
    case 'saveRule':
      {
        if (action.data.type !== 'TRANSFER' && round2((action.data.lines || []).reduce((n, l) => n + Number(l.percent || 0), 0)) !== 100) throw Error('Allocation percentages must total 100%');
        if (!action.data.name?.trim() || !action.data.conditions?.length || action.data.conditions.some(c => !String(c.value || '').trim())) throw Error('Name and condition values are required');
        if (action.data.type === 'TRANSFER') {
          if (!get('bankAccounts', action.data.transferBankAccountId)) throw Error('Choose a transfer bank account');
        } else if (!action.data.lines?.length || action.data.lines.some(l => !list('accounts').some(a => a.code === l.accountCode) || !Number.isFinite(Number(l.percent)) || Number(l.percent) < 0)) throw Error('Valid allocation accounts and percentages are required');
        const rule = get('bankRules', action.id);
        if (rule) Object.assign(rule, action.data, updated);else list('bankRules').push({
          ...action.data,
          id: action.newId || newId('rule'),
          status: 'ACTIVE',
          ...meta
        });
        break;
      }
    case 'deleteRule':
      s.bankRules = list('bankRules').filter(r => r.id !== action.id);
      break;
    case 'cashCode':
      {
        let next = s;
        for (const row of action.rows) next = reduceAction(next, {
          type: 'reconcile',
          id: row.id,
          data: {
            method: 'create',
            contactId: row.contactId,
            contactName: row.contactName,
            accountCode: row.accountCode,
            taxType: row.taxType,
            description: row.description
          }
        });
        return next;
      }
    case 'statementStatus':
      {
        const l = get('bankStatementLines', action.id);
        if (!l || l.status === 'reconciled') throw Error('Unreconcile this line first');
        l.status = action.status;
        l.deletedAt = action.status === 'deleted' ? now : null;
        break;
      }
    case 'importStatements':
      {
        if (!get('bankAccounts', action.bankAccountId)) throw Error('Choose a bank account');
        for (const row of action.rows) {
          if (!row.date || !Number.isFinite(Number(row.amount))) throw Error('Each row needs a date and amount');
          if (list('bankStatementLines').some(l => l.bankAccountId === action.bankAccountId && l.date === row.date && l.amount === Number(row.amount) && l.reference === (row.reference || '') && l.payee === (row.payee || ''))) continue;
          list('bankStatementLines').push({
            ...row,
            id: newId('bsl'),
            bankAccountId: action.bankAccountId,
            amount: round2(row.amount),
            status: 'unreconciled',
            type: Number(row.amount) < 0 ? 'DEBIT' : 'CREDIT',
            reconciliation: null,
            discussNote: '',
            importedAt: now,
            importedBy: actor,
            source: 'import'
          });
        }
        break;
      }
    case 'markReconciled':
      {
        for (const choice of action.items) {
          const k = {
              payment: 'payments',
              bankTransaction: 'bankTransactions',
              batchPayment: 'batchPayments',
              bankTransfer: 'bankTransfers'
            }[choice.kind],
            item = get(k, choice.id);
          if (!item) continue;
          if (choice.kind === 'bankTransfer') {
            const side = item.fromBankAccountId === action.bankAccountId ? 'from' : 'to';
            item[`${side}IsReconciled`] = true;
          } else {
            item.isReconciled = true;
            if (choice.kind === 'batchPayment') for (const p of list('payments').filter(p => p.batchPaymentId === item.id)) p.isReconciled = true;
          }
          item.reconciledAt = now;
          item.reconciledBy = actor;
        }
        break;
      }
    case 'saveBrandingThemes':
      s.brandingThemes = action.data;
      break;
    case 'saveSettings':
      s.organisation = {
        ...s.organisation,
        ...action.data,
        ...updated
      };
      break;
    case 'saveTaxRate':
      {
        if (!action.data.name?.trim() || !Number.isFinite(Number(action.data.rate)) || Number(action.data.rate) < 0 || Number(action.data.rate) > 100) throw Error('Enter a name and a valid tax rate');
        const id = newId('tax');
        list('taxRates').push({
          ...action.data,
          id,
          taxType: id.toUpperCase(),
          rate: Number(action.data.rate),
          status: 'ACTIVE',
          ...meta
        });
        break;
      }
    case 'trackingOption':
      {
        const c = get('trackingCategories', action.id);
        if (c && action.name?.trim()) {
          if (action.optionId) {
            const o = (c.options || []).find(o => o.id === action.optionId);
            if (o) o.name = action.name.trim();
          } else (c.options || (c.options = [])).push({
            id: newId('opt'),
            name: action.name.trim()
          });
        }
        break;
      }
    case 'dashboardLayout':
      s.dashboardLayout = action.data;
      break;
    case 'saveAccount':
      {
        const data = action.data;
        if (!/^[a-zA-Z0-9]{1,10}$/.test(data.code || '') || !data.name?.trim()) throw Error('Enter a unique code (1–10 characters) and a name');
        if (list('accounts').some(a => a.id !== action.id && a.code === data.code)) throw Error('Account code already exists');
        const a = get('accounts', action.id);
        if (a?.systemAccount || a?.type === 'BANK') throw Error('System and bank accounts cannot be edited here');
        if (a && a.code !== data.code) {
          const old = a.code;
          for (const collection of ['invoices', 'bills', 'creditNotes', 'quotes', 'purchaseOrders', 'bankTransactions']) for (const d of list(collection)) for (const l of d.lineItems || []) if (l.accountCode === old) l.accountCode = data.code;
          for (const j of list('manualJournals')) for (const l of j.lines || []) if (l.accountCode === old) l.accountCode = data.code;
          for (const r of list('repeatingInvoices')) for (const l of r.templateInvoice?.lineItems || []) if (l.accountCode === old) l.accountCode = data.code;
          for (const r of list('bankRules')) for (const l of r.lines || []) if (l.accountCode === old) l.accountCode = data.code;
          for (const item of list('items')) for (const k of ['salesAccountCode', 'purchaseAccountCode']) if (item[k] === old) item[k] = data.code;
          for (const c of list('contacts')) for (const k of ['defaultSalesAccountCode', 'defaultPurchaseAccountCode']) if (c[k] === old) c[k] = data.code;
        }
        if (a) Object.assign(a, data, updated);else list('accounts').push({
          ...data,
          id: newId('acc'),
          status: 'ACTIVE',
          ...meta
        });
        break;
      }
    case 'archiveAccount':
      {
        const a = get('accounts', action.id);
        if (a?.systemAccount || a?.type === 'BANK') throw Error('System and bank accounts cannot be archived');
        if (a) a.status = a.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
        break;
      }
    case 'addBankAccount':
      {
        const data = action.data;
        if (!data.name?.trim() || !data.accountNumber?.trim()) throw Error('Name and account number are required');
        const id = action.newId || newId('ba'),
          code = String(93 + list('bankAccounts').length - 3).padStart(3, '0');
        if (list('accounts').some(a => a.code === code)) throw Error('Bank account code is already used');
        list('bankAccounts').push({
          ...data,
          id,
          accountCode: code,
          type: 'BANK',
          currencyCode: 'GBP',
          openingStatementBalance: Number(data.openingStatementBalance || 0),
          openingBalanceDate: action.date,
          status: 'ACTIVE',
          showOnDashboard: true,
          ...meta
        });
        list('accounts').push({
          id: newId('acc'),
          code,
          name: data.name,
          type: 'BANK',
          class: 'ASSET',
          bankAccountId: id,
          taxType: 'NONE',
          status: 'ACTIVE'
        });
        break;
      }
    case 'schedule':
      {
        const b = get('bills', action.id);
        if (b) b.plannedPaymentDate = action.date;
        break;
      }
    case 'attachments':
      {
        const d = get(key, action.id);
        if (d) {
          d.attachments = [...(d.attachments || []), ...action.files];
          Object.assign(d, updated);
        }
        break;
      }
    case 'removeBatch':
      {
        const b = get('batchPayments', action.id);
        if (b && b.status !== 'DELETED') {
          const original = {
            billIds: [...(b.billIds || [])],
            paymentIds: [...(b.paymentIds || [])],
            total: b.total
          };
          if (b.statementLineId) unreconcile(b.statementLineId);
          for (const id of original.paymentIds) removePayment(get('payments', id));
          Object.assign(b, original, {
            status: 'DELETED',
            deletedAt: now,
            deletedBy: actor
          });
        }
        break;
      }
    case 'note':
      if (!action.text?.trim()) throw Error('Enter a note');
      history(kind, action.id, 'Note', action.text.trim());
      break;
    default:
      return prev;
  }
  return s;
}
