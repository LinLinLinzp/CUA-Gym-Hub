# SurveyMonkey state model

All values are JSON. Types marked optional can be absent in injected worlds. Seed timestamps are fixed UTC ISO strings. User mutations use `new Date().toISOString()` and stable, unique IDs. The schema below is prospective. The implementation owns the final Harbor `SCHEMA.md`.

## Top-level shape

| Key | Type | Example |
| --- | --- | --- |
| `account` | object with string `userId`, `workspaceName` | `{ "userId": "usr-maya", "workspaceName": "Northline Research" }` |
| `users` | User[] | Maya Chen and three synthetic colleagues |
| `surveys` | Survey[] | Customer Onboarding Pulse |
| `collectors` | Collector[] | May customer follow-up |
| `responses` | Response[] | Identified web entry with a rating and a comment |
| `deletions` | Deletion[] | Empty at seed |
| `exports` | Export[] | Empty at seed |

## Users

A User has string `id`, `name`, and optional `email`. Example values are `usr-maya`, `Maya Chen`, and `maya.chen@example.test`. Survey ownership refers to User IDs. Resolve the account user from `account.userId`; display a neutral fallback when a user record is missing.

## Surveys and questions

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `sv-onboarding` |
| `title`, `description?` | string | Customer Onboarding Pulse, “Feedback after the first 30 days” |
| `ownerId` | string | `usr-maya` |
| `questions` | ordered Question[] | See below |
| `copiedFromId?` | string | `sv-onboarding` on a copy |
| `createdAt`, `updatedAt` | ISO string | `2026-05-12T14:30:00.000Z` |
| `createdBy`, `updatedBy` | string | `usr-maya` |

A Question has string `id` and `prompt`, `type` in `multipleChoice | checkboxes | rating | openText`, and boolean `required`. Multiple choice and checkboxes have ordered `options` with string `id` and `label`, for example `{ "id": "opt-guided", "label": "Guided setup" }`. Rating uses integers 1–5. Question array order determines display order. Survey status is derived from its collectors: Draft with zero, Collecting with any open, Closed with collectors and zero open.

## Collectors

| Field | Type | Example |
| --- | --- | --- |
| `id`, `surveyId`, `name` | string | `col-onboarding-web`, `sv-onboarding`, May customer follow-up |
| `type` | enum | `webLink` or `manual` |
| `status` | enum | `open` or `closed` |
| `settings` | object | `{ "anonymous": false, "allowMultipleResponses": false, "closedMessage": "Thanks for your interest. This survey has ended." }` |
| `closedAt` | ISO string or null | `null` when open |
| `createdAt`, `updatedAt` | ISO string | `2026-05-12T15:10:00.000Z` |
| `createdBy`, `updatedBy` | string | `usr-maya` |

Default to open and anonymous for new collectors. Default `allowMultipleResponses` to true and expose the single-response rule for identified web entry. The Web link is derived from `/r/:collectorId` and the current session. Manual entry uses the same form with internal navigation. Response counts are derived from `responses[].collectorId`.

## Responses

| Field | Type | Example |
| --- | --- | --- |
| `id`, `surveyId`, `collectorId` | string | `rsp-onboarding-001`, `sv-onboarding`, `col-onboarding-web` |
| `status` | enum | `completed` or `partial` |
| `respondent?` | object with optional string `name`, `email` | `{ "name": "Jordan Patel", "email": "jordan.patel@example.test" }` |
| `answers` | object keyed by question ID | `{ "q-setup": "opt-guided", "q-score": 4, "q-comment": "The walkthrough made setup easier." }` |
| `createdAt`, `updatedAt` | ISO string | `2026-05-13T15:10:00.000Z` |
| `submittedAt` | ISO string or null | `null` for partial entries |
| `createdBy`, `updatedBy` | string | Account user ID for manual entry and edits, `respondent` for web submit |

Choice values are option IDs. Checkbox values are arrays of option IDs. Rating values are integers and open-text values are strings. Unanswered questions omit the key. A valid new submission is completed. Seed partial entries supply realistic data for analysis and filters. Store no identity fields for anonymous submissions. When a referenced user, collector or answer option is missing, the relevant list or detail still renders with neutral text.

## Deletions

A deletion record contains string `id`, `surveyId`, `entityId`, `createdBy`, ISO string `createdAt`, enum `action` in `deleteSurvey | clearCollectorResponses | deleteCollector | deleteResponse`, plus string arrays `removedSurveyIds`, `removedCollectorIds` and `removedResponseIds`. `entityId` is the action target even when that target remains available, as in Clear responses. Append the record atomically with the removals. Use empty arrays where the action removes no records of that entity type.

## Exports

An export contains string `id`, `surveyId`, `createdBy`, ISO string `createdAt`, `format: "csv"`, ordered string array `responseIds`, and a `filters` object with nullable string `collectorId`, nullable response `status` and string `query`. Include all filtered response IDs across pages. Export history retains IDs even if the source records are later deleted.

## Seed construction

`createInitialData()` returns a fresh set of objects with deterministic IDs and dates. Use predictable names such as Customer Onboarding Pulse, Customer Renewal Check-in, Employee Engagement Q2, Benefits Enrollment Feedback and Field Training Debrief. An anchor survey should have all four question types, an open web collector, an open manual collector and a closed collector. Give it varied completed and partial responses, at least one matching result for each collector, and distinct English free-text answers. Use the remaining records to exercise owner filters, zero-result views and pagination.
