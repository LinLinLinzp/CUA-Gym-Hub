# myUSCIS data model

Use plain JSON. Every business write carries a stable ID, the acting profile ID, and an ISO UTC time. IDs are opaque and never array indexes. The examples and counts below specify synthetic fixtures for `createInitialData()`. Keep all dates and IDs fixed in the seed, including nested records. In production actions use `new Date().toISOString()` and generate identifiers at the point of commit.

```js
return {
  profile,
  cases,
  caseEvents,
  trackedCases,
  caseStatusChecks,
  formCatalog,
  formDrafts,
  formSubmissions,
  addressChanges,
}
```

## Shared objects

| Type | Fields and examples |
| --- | --- |
| Address | `line1: string` ("184 Willowbank Lane"), `line2?: string` ("Apt 4B"), `city: string` ("Portland"), `region: string` ("OR"), `postalCode: string` ("97205"), `country: string` ("US"). Keep ZIP codes as strings. |
| Profile | `id: string` ("profile-maya"), `displayName: string` ("Maya Rivera"), `email?: string` ("maya.rivera@example.test"), `physicalAddress?: Address`, `mailingAddress?: Address`, `updatedAt?: ISO timestamp` ("2026-08-03T15:30:00.000Z"). |

## Case data

| Collection | Record fields and examples |
| --- | --- |
| `cases[]` | `id: string` ("case-001"), `receiptNumber: string` ("IOE9700000001"), `formId?: string` ("form-i765"), `formCode: string` ("I-765"), `formTitle: string` ("Application for Employment Authorization"), `status: string` ("under_review"), `filedAt?: ISO timestamp`, `statusUpdatedAt?: ISO timestamp`, `mailingAddress?: Address`, `addressChangeId?: string` ("ac-024"), `submissionId?: string` ("submission-001"). |
| `caseEvents[]` | `id: string` ("event-001-02"), `caseId: string` ("case-001"), `status: string` ("under_review"), `title: string` ("Case is under review"), `description?: string`, `actorId: string` ("system" for fixture history or "profile-maya" for a local filing), `createdAt: ISO timestamp`. |
| `trackedCases[]` | `id: string` ("tracked-001"), `caseId: string`, `actorId: string` ("profile-maya"), `createdAt: ISO timestamp`. One association per actor and case. |
| `caseStatusChecks[]` | `id: string` ("check-001"), `receiptNumber: string`, `caseId: string or null`, `outcome: "found" or "not_found"`, `caseStatus: string or null`, `actorId: string`, `createdAt: ISO timestamp`. Capture status at lookup time. |

Case statuses are `received`, `under_review`, `action_needed`, `decision_issued`, `approved`, and `closed`. Pending statuses eligible for address updates are `received`, `under_review`, and `action_needed`. Map codes to clear labels and handle injected unknown values gracefully. Match normalized receipts and preserve their normalized value in the stored record. Use stable local fixtures such as `IOE9700000001` for a tracked pending case and `IOE9700000033` for an untracked pending case. For this fixture model use three letters and ten digits for valid receipt syntax.

## Filing data

| Collection | Record fields and examples |
| --- | --- |
| `formCatalog[]` | `id: string` ("form-i765"), `code: string` ("I-765"), `title: string`, `category: string` ("Employment"), `description?: string`, `canFileOnline: boolean` (true for enabled local practice flows), `questions?: Question[]`. |
| `formDrafts[]` | `id: string` ("draft-001"), `formId: string`, `actorId: string`, `status: "draft" or "submitted"`, `currentStep: "applicant" or "questions" or "review"`, `answers: Answers`, `createdAt: ISO timestamp`, `updatedAt: ISO timestamp`, `submittedAt?: ISO timestamp`. |
| `formSubmissions[]` | `id: string` ("submission-001"), `draftId: string`, `formId: string`, `actorId: string`, `caseId: string`, `receiptNumber: string`, `answers: Answers`, `signature: string` ("Maya Rivera"), `status: "submitted"`, `createdAt: ISO timestamp`. |

A `Question` has `id: string`, `label: string`, optional `required: boolean`, and optional `options: string[]`. Render questions with options as a select or radio group, and other questions as labeled text fields. `Answers` has optional `applicantName: string`, `email: string`, and `responses: Record<string, string>` keyed by question ID. A valid submitted snapshot includes the required applicant fields and question answers. Drafts allow partial answers. Initialize form options locally for I-90, I-130, I-765 and N-400, for example I-765 “Reason for applying” with “Initial application,” “Renewal,” and “Replacement.” Use short practice inputs for those flows. Mark remaining catalog entries as reference entries with filing availability scoped to this workspace.

Link each submission to exactly one draft and one case with the same receipt number. On submit, allocate a receipt unique among existing cases. Create its `received` case, matching initial event, and tracked link in the same state transition as the submission.

## Address data

| Collection | Record fields and examples |
| --- | --- |
| `addressChanges[]` | `id: string` ("ac-024"), `confirmationNumber: string` ("COA-000024"), `previousPhysicalAddress: Address or null`, `previousMailingAddress: Address or null`, `newPhysicalAddress: Address`, `newMailingAddress: Address`, `mailingSameAsPhysical: boolean`, `caseLinks: {caseId: string, receiptNumber: string}[]`, `status: "submitted"`, `actorId: string`, `createdAt: ISO timestamp`. |

The no-pending-cases choice records an empty `caseLinks` array. Validate that every listed receipt maps uniquely to a pending case. Store full address snapshots, including the resolved mailing address when both addresses match. The profile and cases are operational views of the latest updates. Historical requests are immutable. Keep the current fixture addresses consistent with the latest seeded request.

## Injection and action boundaries

Use empty-safe selectors and render fallbacks for missing fields and relationships. Derive counts, sort order, list filters, and relative dates at render time. Keep uncommitted address fields, wizard inputs, list controls, validation, and notices in view state. Use the store to apply saves to the latest in-memory snapshot. Guard logically duplicate actions such as tracking an already tracked case or submitting a finalized form draft. Prevent a double click on final address submission from issuing two writes. Reject invalid confirmations before mutating state. Update `SCHEMA.md` to match the implemented record contracts and document each observable action for verifier authors.
