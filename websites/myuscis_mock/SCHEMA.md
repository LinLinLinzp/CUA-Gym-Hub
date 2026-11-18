# myuscis_mock Schema

**Base URL** `http://localhost:5511/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

Use a fresh `sid` for each injected fixture. The browser replaces default arrays with injected arrays and merges injected objects into defaults. Each business action saves a complete snapshot through `set_current`. The shared API retains the first baseline and reports top-level changes under `state_diff.<key>.modified` or `state_diff.<key>.added`. Reset restores the stored baseline or defaults on the server. Use a fresh browser context to load the restored state because same-session reloads use the browser cache.

## State Schema

| Key | Type | Record shape |
| --- | --- | --- |
| `profile` | object | `id`, `displayName`, `email?`, `physicalAddress?: Address`, `mailingAddress?: Address`, `updatedAt?` |
| `cases` | array | `id`, `receiptNumber`, `formId?`, `formCode`, `formTitle`, `status`, `filedAt?`, `statusUpdatedAt?`, `mailingAddress?: Address or null`, `addressChangeId?`, `submissionId?` |
| `caseEvents` | array | `id`, `caseId`, `status`, `title`, `description?`, `actorId`, `createdAt` |
| `trackedCases` | array | `id`, `caseId`, `actorId`, `createdAt` |
| `caseStatusChecks` | array | `id`, `receiptNumber`, `caseId: string or null`, `outcome: found or not_found`, `caseStatus: string or null`, `actorId`, `createdAt` |
| `formCatalog` | array | `id`, `code`, `title`, `category`, `description?`, `canFileOnline: boolean`, `questions?: Question[]` |
| `formDrafts` | array | `id`, `formId`, `actorId`, `status: draft or submitted`, `currentStep: applicant, questions, or review`, `answers: Answers`, `createdAt`, `updatedAt`, `submittedAt?` |
| `formSubmissions` | array | `id`, `draftId`, `formId`, `actorId`, `caseId`, `receiptNumber`, `answers: Answers`, `signature`, `status: submitted`, `createdAt` |
| `addressChanges` | array | `id`, `confirmationNumber`, `previousPhysicalAddress: Address or null`, `previousMailingAddress: Address or null`, `newPhysicalAddress: Address`, `newMailingAddress: Address`, `mailingSameAsPhysical: boolean`, `caseLinks: {caseId, receiptNumber}[]`, `status: submitted`, `actorId`, `createdAt` |

Fields are strings unless a type is given. A question mark marks an optional field. All timestamps use ISO UTC. Action IDs are generated at commit time and records link by ID.

- `Address` contains `line1`, `line2?`, `city`, `region`, `postalCode`, and `country`. ZIP codes remain strings and the address flow records the country as `US`.
- `Question` contains `id`, `label`, `required?: boolean`, and `options?: string[]`.
- `Answers` contains `applicantName?`, `email?`, and `responses?: Record<string, string>` keyed by question ID.
- Case statuses are `received`, `under_review`, `action_needed`, `decision_issued`, `approved`, and `closed`. The first three are eligible for address changes.
- Receipts normalize by trimming, uppercasing, and removing hyphens. A valid receipt has three letters and ten digits. A lookup captures the status at the time of the check.
- New filings allocate a receipt from `IOE9800000001` upward, skipping receipts already in the case registry. New address confirmations use the first available `COA-` followed by a six-digit number.

### Default IDs

- Profile `profile-maya`. Cases `case-001` through `case-048`. Tracking records `tracked-001` through `tracked-032`. Case checks `check-001` through `check-024`.
- The four filing-enabled catalog entries are `form-i765`, `form-i90`, `form-i130`, and `form-n400`. Other catalog IDs follow the same lowercase, hyphen-free form-code pattern, such as `form-i485`.
- Active drafts `draft-001` through `draft-024`. Finalized drafts `draft-025` through `draft-036`. Submissions `submission-001` through `submission-012`. Address requests `ac-001` through `ac-024`.

## Minimal Inject Example

This state replaces the case registry with one pending case and clears the related history, tracking, and lookup collections.

```json
{
  "cases": [
    {
      "id": "case-injected",
      "receiptNumber": "TST0000000001",
      "formCode": "I-765",
      "formTitle": "Application for Employment Authorization",
      "status": "received"
    }
  ],
  "caseEvents": [],
  "trackedCases": [],
  "caseStatusChecks": []
}
```

## Observable State Changes (for LLM evaluation)

| Action | Writes to `current_state` |
| --- | --- |
| Check a syntactically valid receipt | Append one `caseStatusChecks[]` record with `id`, normalized `receiptNumber`, `caseId`, `outcome`, `caseStatus`, `actorId`, and `createdAt`. Unknown receipts have null case fields. |
| Track a case | Append one `trackedCases[]` record with `id`, `caseId`, `actorId`, and `createdAt`. |
| Start a form | Append one `formDrafts[]` record with `id`, `formId`, `actorId`, `status: draft`, `currentStep: applicant`, empty `answers`, `createdAt`, and `updatedAt`. |
| Save a draft or advance a valid step | Update the same draft's `answers`, `currentStep`, and `updatedAt`. |
| Submit a signed form with `canFileOnline: true` | Update the same draft's `answers`, `currentStep: review`, `status: submitted`, `submittedAt`, and `updatedAt`. Append one full record each to `formSubmissions[]`, `cases[]`, `caseEvents[]`, and `trackedCases[]`. The new case is `received` and links to the submission. Its initial event and tracking entry share the case ID. |
| Submit an address change | Append one full `addressChanges[]` record. Update `profile.physicalAddress`, `profile.mailingAddress`, and `profile.updatedAt`. Update `mailingAddress` and `addressChangeId` on exactly the linked case records. Selecting no pending cases stores empty `caseLinks` and leaves `cases` unchanged. |
| View or reload records, filter, enter uncommitted input, go back, cancel, fail validation, or repeat a finalized submission | No business-state writes. |

## Featured fixtures

| Purpose | Exact fixture |
| --- | --- |
| Applicant | `profile-maya`, Maya Rivera, `maya.rivera@example.test` |
| Tracked pending case | `case-001`, `IOE9700000001`, Under review |
| Untracked pending case | `case-033`, `IOE9700000033`, Received |
| Additional untracked pending case | `case-038`, `IOE9700000038`, Received |
| Closed case | `case-002`, `IOE9700000002`, Closed |
| Enabled filing | `form-i765`, I-765. Select `Renewal` for Reason for applying and enter `C09` for Eligibility category. |
| Resumable filing | `draft-001`, I-765, Applicant details |
| Latest address request | `ac-024`, `COA-000024`, current address at 184 Willowbank Lane, Apt 4B, Portland, OR 97205 |
