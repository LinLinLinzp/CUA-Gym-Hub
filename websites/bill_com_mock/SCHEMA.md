# bill_com_mock Schema

**Base URL** `http://localhost:5443/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the initial server snapshot

Use `current_state` for exact record comparisons. Amounts are numeric USD values. Invoice, due, and process dates use `YYYY-MM-DD`. New and updated transaction timestamps are ISO strings. All relationships are string IDs.

## State Schema

| Top-level key | Record shape and relationships |
| --- | --- |
| `account` | Object with `id`, `name`, `currency`, and `activeUserId` → users. |
| `users[]` | `id`, `name`, `email`, `role`. |
| `vendors[]` | `id`, `name`, `email`, `contactName`, `category`, `paymentMethods[]` (`ach`, `check`), `defaultPaymentMethod`. Contact fields and the default method may be absent. |
| `fundingAccounts[]` | `id`, `name`, `last4`, `type`. Only fictional masked account labels are displayed. |
| `bills[]` | `id`, `vendorId` → vendors, `invoiceNumber`, `invoiceDate`, `dueDate`, optional `memo`, `lineItems[]`, `amount`, `currency`, `approvalStatus` (`draft`, `pending`, `approved`, `denied`), `approvalId` → latest approval or null, `paymentStatus` (`unpaid`, `scheduled`, `processing`, `paid`), `createdBy` and `updatedBy` → users, `createdAt`, `updatedAt`. Each line item has `id`, `description`, `quantity`, `unitPrice`, `amount`. The bill sums the rounded line totals. |
| `approvals[]` | `id`, `billId` → bills, `approverId` and `createdBy` → users, `status` (`pending`, `approved`, `denied`), `createdAt`, `decisionNote`, `decidedBy` → users, `decidedAt`. Decision fields start null. |
| `payments[]` | `id`, `reference`, `billId` → bills, `vendorId` → vendors, `fundingAccountId` → funding accounts, `method` (`ach`, `check`), `processDate`, `amount`, `currency`, `status` (`scheduled`, `processing`, `paid`, `cancelled`), optional `memo`, `createdBy` → users, `createdAt`, `cancelledBy` → users or null, `cancelledAt` or null. |
| `activity[]` | `id`, `type`, `billId` → bills, `vendorId` → vendors, `approvalId` → approvals or null, `paymentId` → payments or null, `actorId` → users, `createdAt`, `amount`, `currency`. Events capture the bill's vendor and amount at the time of the transaction. |

### Default IDs

| Key | Seed IDs |
| --- | --- |
| `account` | `org_northline` |
| `users` | `user_maya` (active), `user_jordan`, `user_priya` |
| `vendors` | `ven_001` through `ven_032` |
| `fundingAccounts` | `fund_operating`, `fund_reserve` |
| `bills` | `bill_001` through `bill_072` |
| `approvals` | `apr_011` through `apr_072`, plus `apr_011_prior` through `apr_014_prior` |
| `payments` | `pmt_001` through `pmt_036` |
| `activity` | `evt_001` through `evt_232` |

### Minimal Inject Example

Post the following payload on a fresh SID to open an empty workspace. The account retains its other seeded fields, and the empty arrays replace the seeded collections.

```json
{
  "action": "set",
  "state": {
    "account": { "name": "Empty workspace" },
    "users": [],
    "vendors": [],
    "fundingAccounts": [],
    "bills": [],
    "approvals": [],
    "payments": [],
    "activity": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User action | Bill changes | Related writes |
| --- | --- | --- |
| Save draft | Insert invoice fields and computed line items, amount and currency. Set `approvalStatus=draft`, `approvalId=null`, `paymentStatus=unpaid`, `createdBy/At`, `updatedBy/At`. | Append `bill_created` activity with both optional links null. |
| Save changes | For a draft or denied bill, update `vendorId`, `invoiceNumber`, `invoiceDate`, `dueDate`, `memo`, `lineItems`, `amount`, `currency`, `updatedBy/At`. Preserve the ID, creation fields and statuses. | Append `bill_updated` activity with both optional links null. |
| Send or resubmit for approval | Change `approvalStatus` from draft or denied to pending, set `approvalId` to the new approval and update `updatedBy/At`. | Append a pending approval with `billId`, `approverId`, `createdBy/At`, null decision fields. Preserve previous approvals. Append `approval_submitted` with the new `approvalId`. |
| Save and send for approval | Insert the bill and apply the submission changes in the same snapshot. | Append `bill_created`, the pending approval, and `approval_submitted` activity. |
| Approve or deny | Change `approvalStatus` from pending to approved or denied, update `updatedBy/At`, and retain `approvalId`. | Change the assigned approval from pending to the same status. Set `decisionNote` to a trimmed note, or null for approval without a note. Denial requires a note. Set `decidedBy/At` and append `approval_approved` or `approval_denied` with `approvalId`. |
| Schedule payment | Change `paymentStatus` from unpaid to scheduled and update `updatedBy/At`. Keep approval approved. | Insert a scheduled payment with its reference, bill/vendor/funding IDs, method, process date, the entire bill amount and currency, memo, `createdBy/At`, and null cancellation fields. Append `payment_scheduled` with `paymentId`. |
| Confirm cancellation | Change `paymentStatus` from scheduled to unpaid and update `updatedBy/At`. Keep the approval unchanged. | Change the scheduled payment to cancelled, set `cancelledBy/At` and append `payment_cancelled` with `paymentId`. Keep the payment in history. |

All transactions take the actor from `account.activeUserId` and share one timestamp across their changed and appended records. Read-only activity, form editing before confirmation, rejected transactions, and idle time leave the business state unchanged. Seed data includes 72 bills, 32 vendors, 66 approvals, 36 payments, linked activity, three users and two funding accounts.

