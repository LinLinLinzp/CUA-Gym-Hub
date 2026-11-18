# Xero developer validation

Implemented the P0 shell, every P1 primary workflow, the P2 secondary screens,
and deterministic seeds from TODO.md. No AUDIT.md or TEST.md existed when this
work began. The supplied SEED.md and HARBOR_CONTRACT.md take precedence over
the generic dev agent instructions.

## Passed checks

| Command | Evidence |
| --- | --- |
| `npm run build` | Production Vite bundle generated successfully |
| `npm run check:seed` | Fixed unique ids; exact entity counts; invoice/bill arithmetic; paid-document allocations; reconciled item references; balanced Balance Sheet and Trial Balance; 18/2/5 unreconciled lines; intended match suggestions |
| `npm run check:workflows` | Create/approve/email invoice; payments/removal; bills/batch; suggested/multiple/partial/adjusted matches; create, transfer, discussion and reversal; saved report snapshot/publish/export/favourite; validation; ledger consistency; compared date ranges and penny-level cash allocation regression cases |
| `npm run check:secondary` | Quotes and purchase orders convert into structured draft documents; credit allocation; repeating generation; journal validation; bank rule/cash coding; CSV deduplication; statement status; cash/summary/VAT reports; settings/tracking/layout; attachment metadata; account creation; batch removal |
| `npm run check:render` | 232 page renders across seeded, empty, single-record and 500-record worlds with missing optional fields, including secondary pages and deep-linked details |
| `npm run check:preview` | Built preview deep links return the SPA; `/go` preserves initial/current/diff; sessions remain separate; multipart upload and file download work |
| `npm run check:runtime` | Injected arrays replace defaults, objects merge, boot posts one baseline, cached reload posts nothing, 60 seconds idle adds no POSTs, explicit save updates `/go` |
| `cmp src/utils/dataManager.js ../../templates/dataManager.js` | Identical, unchanged template |

`check:preview` and `check:runtime` expect the preview or dev server on **5406**.
The final preview uses `npm run preview -- --port 5406`; both server configs
have strictPort enabled. State and upload artifacts are sid-scoped and ignored
by git. No test modified the default session.

## Round 1 fixes — 2026-11-18

Read AUDIT.md (no open P0/P1 issues) and TEST.md before changing code.
Fixed BUG-001–005 and VISUAL-001–004; the audit/test reports remain unchanged.

- New/copy/add-another bill editors keep a blank invoiceNumber. The reducer
  enforces this invariant for all bill saves, including previously copied data.
  Payments use the supplier reference even for a legacy bill with a sales number.
  Regression checks verify that creating a bill leaves the sales counter unchanged
  and that the next sales invoice receives its expected number.
- Partial bill payments log Payment made; partial invoice payments retain Payment
  received. Saved-report actions log Edited, Refreshed, Published, Archived and
  Restored consistently. SCHEMA.md documents these exact writes.
- Repeating counts use non-deleted repeating records. Payment, supplier and transfer
  pickers use their visible field names; the Create new menu forwards its name.
- Invoice numbers/dates stay on one line, references truncate with a full-text
  tooltip, bank-card headings keep their menu alongside the title, matching rows
  display readable transaction types, profit totals have a single row each, and
  Amounts are is a compact control.

Validation: production build; seed, primary workflow (including the new financial
integrity regressions), secondary workflow and 232 render checks all pass. Live
state/API checks on port 5406 pass, including session isolation, deep links,
attachments, injection, a single baseline POST and a 60-second idle harness check.
The harness uses the template data manager in Node; it is not a browser idle test.
The built dist also passes check:preview on the production preview server at
port 5406 (deep links, state diffs, session isolation, and upload/download).
The render check emits React Router's expected useLayoutEffect-on-server warnings.
An initial build invocation at the repository root failed because that directory
has no package.json; the corrected invocation in websites/xero_mock passes.

## Round 2 fixes — 2026-11-18

Read the current audit/test reports: no open P0/P1 issues. Fixed all three P2
findings and left AUDIT.md and TEST.md unchanged for their owning agents.

- BUG-006: Invoice/bill edits preserve approval/submission timestamps and actors
  unless their status changes. Workflow regressions cover both document types
  in both statuses, alongside actual draft-to-submit/approve transitions.
- BUG-007: Whole-batch deletion keeps the original bill ids, payment ids and total,
  adds deletedBy, reverses payments and unreconciles the statement. Regressions
  also verify repeat deletion and unchanged single-payment removal bookkeeping.
- VISUAL-005: Dashboard supplies Home as its page title while retaining the
  organisation name as its H1.

Passed: npm run build, check:seed, check:workflows, check:secondary, check:render
(232 renders), check:preview against the new production build on port 5406, and
byte comparison of dataManager.js with the unchanged template. Updated SCHEMA.md
and ticked the corresponding TODO items.

## Acceptance evidence and remaining limitation

TEST.md Round 2 supplies browser evidence for W1–W4, injected worlds, hard reloads,
one baseline POST, and zero idle POSTs over 60s on dev / 70s on built dist. That
closes the previously pending idle TODO. These are the playwright agent's
recorded results, not new browser tests by the dev agent. Browser revalidation of
BUG-006/007 and VISUAL-005 remains for the playwright agent.

The official certifier factory/hub_tools/dyn_certify.py is absent from this
checkout, so it could not be rerun here.

## Round 3 fixes — 2026-11-18

Read SEED.md, HARBOR_CONTRACT.md, the dev-agent instructions, AUDIT.md Round 3,
TEST.md Round 3 and TODO.md. Neither report has open P0/P1 findings, and all
existing TODO items were complete. Fixed the remaining P2 BUG-008 without
editing AUDIT.md or TEST.md.

The document reducer captures the previous status before updating the existing
record. Editor submissions and approvals now append Submitted/Approved history
for both new and existing documents when entering that status, alongside the
existing Created/Edited event. Unchanged-status edits retain the original
approval/submission timestamps and actors and do not duplicate status events.
SCHEMA.md documents these exact writes; the new TODO item is checked.

Validation: check:workflows first reproduced the bug (Edited with no Approved),
then passed after the fix. Regression coverage includes invoices and bills for
Draft → Submitted, Draft → Approved and Submitted → Approved, checks linked ids,
actor and timestamp, and ensures unchanged-status edits add only Edited. The
same script also passes its primary workflow and ledger checks. npm run build
passes. check:preview passes its deep-link, state/diff, session-isolation and
upload/download smoke checks against the dev server on port 5406. dataManager.js
remains byte-identical to the template. Browser revalidation of BUG-008 remains
for the playwright agent.

## Round 4 fixes — 2026-11-18

Read the current SEED.md, HARBOR_CONTRACT.md, dev-agent instructions, TODO.md,
AUDIT.md Round 4 and TEST.md Round 4. There are no open P0/P1 findings and all
previous TODO items were checked. Fixed the three remaining P2 findings and
left AUDIT.md and TEST.md unchanged.

- BUG-009: Conversion rejects linked or INVOICED/BILLED records, including
  injected records without their link, before changing documents, counters or
  history. QU-0005 links to Bayside Club invoice inv_0046; PO-0004 links to
  Office Supplies Company bill bill_0027. The quote header hides Create invoice
  for INVOICED records. Copying a secondary document clears its conversion links.
- BUG-010: Secondary history uses Sent, Accepted, Declined, Approved, Submitted,
  Invoiced, Copied to bill and Deleted. Conversion details contain the target
  invoice/bill id. Editor saves add Submitted/Approved on entry to that status,
  including new records; unchanged-status edits add only Edited. The new
  regression first reproduced `send` instead of `Sent`, then passed after the fix.
- VISUAL-006: Secondary headers and list cells use the shared StatusPill, with
  readable labels in tabs too. Approved purchase orders have a green pill;
  awaiting-payment credit notes retain the shared invoice/bill wording.

Passed: npm run build, check:seed, check:workflows, check:secondary and
check:render (232 seeded/empty/single/500-record cases). A focused server-render
check also verifies converted/linkless records hide conversion actions, linked
invoice/bill URLs preserve sid, and headers/lists/tabs show the expected labels
and status classes. check:preview passes against dev and built preview on port
5406 (deep links, state diffs, session isolation, upload/download). dataManager.js
is byte-identical to the unchanged template. SCHEMA.md documents the seeded
links and exact history writes. Browser revalidation remains with the playwright
agent; the official factory/hub_tools/dyn_certify.py is absent from this checkout.
