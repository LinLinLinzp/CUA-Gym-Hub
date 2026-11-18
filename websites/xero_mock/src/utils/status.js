import { todayISO } from './money.js';
const labels = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting Approval',
  AUTHORISED: 'Awaiting Payment',
  PAID: 'Paid',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  INVOICED: 'Invoiced',
  BILLED: 'Billed',
  VOIDED: 'Voided',
  DELETED: 'Deleted'
};

export function creditNoteStatus(note) {
  // Older saved sessions can have a full allocation with the previous status.
  if (note.status === 'AUTHORISED' && note.allocations?.length && Number(note.remainingCredit ?? NaN) === 0) return 'PAID';
  return note.status;
}

export function displayStatus(doc, today = todayISO(), kind) {
  const isCreditNote = kind === 'creditNote' || ['ACCRECCREDIT', 'ACCPAYCREDIT'].includes(doc.type);
  const status = isCreditNote ? creditNoteStatus(doc) : doc.status;
  if (status === 'AUTHORISED') {
    if (kind === 'purchaseOrder') return 'Approved';
    if (!isCreditNote && doc.dueDate < today && doc.amountDue > 0) return 'Overdue';
  }
  return labels[status] || status || 'Draft';
}
