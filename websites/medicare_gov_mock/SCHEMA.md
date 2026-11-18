# medicare_gov_mock Schema

**Base URL** `http://localhost:5513/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | Object | `id`, `firstName`, `lastName`, `medicareNumberMasked?`, `zipCode`, `city?`, `state?`, `email?`, `phone?`, `shoppingPlanYear` (integer), `coverage`, `enrollmentWindow?`. Coverage contains `type`, `partAStartDate?`, `partBStartDate?`. The enrollment window contains `code`, `label`, `opensOn`, `closesOn`, `effectiveDate`, `status` (`open` or `closed`). |
| `plans` | Array of objects | `id`, `name`, `carrier`, `type` (`advantage` or `drug`), `zipCodes` (string array), `planYear` (integer), `status` (`available` or `archived`), `network?`, `monthlyPremium`, `drugDeductible?`, `medicalOutOfPocketMax?`, `rating?` (number), `includesDrugCoverage?` (boolean), `benefits?` (string array). |
| `planComparisons` | Array of objects | `id`, `planIds` (two or three distinct strings in selection order), `zipCode`, `planYear` (integer), `status` (`saved`), `actorId`, `createdAt`. |
| `claims` | Array of objects | `id`, `memberId`, `claimNumber`, `providerName`, `part` (`A` or `B`), `status` (`processed`, `pending` or `denied`), `serviceDate`, `processedDate?`, `billedAmount`, `approvedAmount?`, `medicarePaid?`, `memberResponsibility?`, `serviceLines?` (object array), `notes?`. Each service line contains `id`, `description`, `quantity` (integer), `billedAmount`, `approvedAmount?`, `medicarePaid?`, `memberResponsibility?`. |
| `claimReviews` | Array of objects | `id`, `claimId`, `status` (`reviewed`), `note?`, `actorId`, `createdAt`. |
| `enrollments` | Array of objects | `id`, `planId`, `memberId`, `planName`, `planYear` (integer), `zipCode`, `enrollmentPeriodCode`, `reason` (`join_plan` or `change_coverage`), `effectiveDate`, `contact` (object with `email` and `phone?`), `attestationAccepted` (boolean), `status` (`submitted`, `closed` or `withdrawn`), `confirmationNumber`, `actorId`, `createdAt`. |

Fields are strings unless a different type is shown. Amounts and premiums are USD numbers. A trailing `?` marks an optional field. Calendar dates use `YYYY-MM-DD`. The store writes `createdAt` as an ISO 8601 UTC timestamp. The client merges injected objects over defaults and replaces arrays. The first stored snapshot can be a partial injection, so use `current_state` to check the full state after the client loads.

### Default IDs

- Member `member-001`.
- Available plans `plan-2027-<zip>-ma-01` through `-ma-12` and `plan-2027-<zip>-pd-01` through `-pd-06`, for ZIPs `53703` and `53704`.
- Archived plans `plan-<year>-history-01` and `plan-<year>-history-02`, for 2015–2026.
- Claims `claim-001` through `claim-042`. Service line IDs use the claim ID and suffix `-line-01` or `-line-02`.
- Historical enrollments `enrollment-history-<year>-01` and `enrollment-history-<year>-02`, for 2015–2026.
- Saved comparisons and claim reviews start empty.

## Minimal Inject Example

```json
{
  "plans": [],
  "planComparisons": [],
  "claims": [],
  "claimReviews": [],
  "enrollments": []
}
```

## Observable State Changes (for LLM evaluation)

| User Action | State Field Changed |
| --- | --- |
| Save comparison | Appends one `planComparisons` entry with `id`, ordered `planIds`, `zipCode`, `planYear`, `status: "saved"`, `actorId` and `createdAt`. |
| Mark as reviewed | Appends one `claimReviews` entry with `id`, `claimId`, `status: "reviewed"`, `actorId`, `createdAt` and a trimmed `note` when supplied. Repeat review by the same actor for the same claim does not add an entry. |
| Submit enrollment request | Appends one `enrollments` entry with `id`, `planId`, `memberId`, `planName`, `planYear`, `zipCode`, `enrollmentPeriodCode`, `reason`, `effectiveDate`, `contact.email`, optional trimmed `contact.phone`, `attestationAccepted: true`, `status: "submitted"`, `confirmationNumber`, `actorId` and `createdAt`. A pending request for the same member, plan and effective date prevents another entry. |

Each successful action sends one whole-state `set_current`. Navigation, filters, form edits, comparison selection, preview and cancel produce no business writes. Active coverage comes from `account.coverage`.
