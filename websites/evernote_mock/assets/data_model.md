# Proposed Harbor data model

## State shape and conventions

`createInitialData()` returns plain JSON-compatible records. IDs are strings and stay stable across edits and moves. Seed IDs and dates are fixed. New business records receive a unique ID and a timestamp from `new Date().toISOString()`. Actor fields store the synthetic account ID. Use one timestamp for all rows modified by the same action. The examples below describe one connected group of seed records.

| Key | Type | Representative value |
| --- | --- | --- |
| `user` | object | `{ id: "usr_maya", name: "Maya Chen", email: "maya.chen@example.test" }` |
| `preferences` | object | `{ defaultNotebookId: "nb_inbox", defaultTaskNoteId: "note_things_to_do", updatedBy: "usr_maya", updatedAt: "2026-10-26T15:00:00.000Z" }` |
| `notebooks` | notebook[] | `[nb_inbox, nb_vendor_reviews, …]` as records |
| `notes` | note[] | `[note_things_to_do, note_vendor_scorecard, …]` as records |
| `tasks` | task[] | `[task_check_vendor_references, …]` as records |

`user.id`, `user.name` and `user.email` are strings. Preference default IDs and update metadata accept `null` for an unconfigured world. The account is synthetic and fixed within a given session. Preserve custom state fields when applying updates. Sort derived copies of the arrays instead of mutating stored records.

## Notebook record

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `nb_vendor_reviews` |
| `name` | string | Vendor Reviews |
| `status` | `active\|deleted` | `active` |
| `createdBy`, `updatedBy` | string | `usr_maya` |
| `createdAt`, `updatedAt` | ISO datetime string | `2026-10-28T14:30:00.000Z` |
| `deletedAt` | ISO datetime string or null | `null` |
| `deletedBy` | string or null | `null` |

Active notebook names are unique after trimming and case folding. A notebook's active note count is computed from `notes[].notebookId` and note status. The effective default uses the configured notebook if active, then the first active notebook in deterministic name and ID order. The fallback operates on reads. Only an explicit create or set-default flow persists a default preference.

## Note record

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `note_vendor_scorecard` |
| `notebookId` | notebook ID string | `nb_vendor_reviews` |
| `title` | string | November Vendor Scorecard |
| `content` | multiline plain-text string | `Score support response times before the renewal meeting.\n\nOpen question: confirm the weekend escalation contact.` |
| `tags` | string[] | `["vendors", "renewal", "follow-up"]` |
| `status` | `active\|trashed` | `active` |
| `createdBy`, `updatedBy` | string | `usr_maya` |
| `createdAt`, `updatedAt` | ISO datetime string | `2026-11-12T14:00:00.000Z` |
| `trashedAt` | ISO datetime string or null | `null` |
| `trashedBy` | string or null | `null` |
| `sourceNoteId` | optional note ID string | `note_vendor_scorecard` on a duplicate |

A note holds one notebook ID and any number of tag labels. Tags are stored on the note and the picker derives its suggestions from active notes. Note excerpts derive from plain text. Trash preserves the original notebook reference, editor content, tags and ID. Direct editing and moving require an active note. Task records remain independent of body text and are joined by task `noteId`.

## Task record

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `task_check_vendor_references` |
| `noteId` | note ID string | `note_vendor_scorecard` |
| `title` | string | Check vendor references |
| `description` | string | Ask the office coordinator for two comparable references. |
| `dueDate` | YYYY-MM-DD string or null | `2026-11-25` |
| `flagged` | boolean | `true` |
| `status` | `open\|completed\|deleted` | `open` |
| `completedAt`, `deletedAt` | ISO datetime strings or null | `null` for both |
| `completedBy`, `deletedBy` | strings or null | `null` for both |
| `createdBy`, `updatedBy` | string | `usr_maya` |
| `createdAt`, `updatedAt` | ISO datetime string | `2026-11-13T14:00:00.000Z` |
| `sourceTaskId` | optional task ID string | `task_check_vendor_references` on a duplicate |

New tasks start open with null completion and deletion metadata. Completion sets `completedAt` and `completedBy`. Reopening clears both. Deleting retains any completion metadata, stamps deletion fields and hides the record. A duplicated task copies title, description, due date, flag, status and completion metadata, and gets new ID, actor and creation/update stamps with deletion metadata cleared. Only open or completed tasks are eligible for duplication.

When a new task has no explicit destination, use the configured task note if active. If absent or trashed, offer an active case-insensitive Things to do match in the effective default notebook or create it on submit. If no active notebook exists, offer a field for the new notebook name in the same flow. Persist any fallback destination records and new default IDs atomically. When deleting the current default task note indirectly by trashing it, leave the preference in place so restoring the note can make it effective again unless the user has since selected a new default.

## Injected record handling

- Missing notebook or note status reads as active. Missing task status reads as open. Missing strings and tag arrays use empty display fallbacks. Omit an invalid date from date sorting or show the undated group. Do not store a fallback during reading.
- Show notes with missing notebook references under All Notes with a neutral notebook label. Allow an explicit move to repair the link. Show an orphan task in the account-wide list under No note, and allow relinking. Tasks with a known trashed parent stay out of active task views until its restore.
- Explicit invalid or deleted IDs in browser routes show a recovery view. If a seed preference points outside an injected array, resolve the effective destination from current active records. Never recreate a record during boot.
- Persist notebook deletion, linked note trashing and compound creates in one store mutation so each `/go` snapshot is internally consistent.

## Seed catalog

Populate 24 notebooks covering these work areas. Derive stable, meaningful IDs from each name. Avoid assigning notes to every notebook so the directory demonstrates its empty state.

| Work area | Notebook names |
| --- | --- |
| Daily operations | Inbox, Weekly Planning, Office Move, Vendor Reviews, Team Rituals, Process Library |
| Internal teams | People Operations, Finance, Customer Support, IT Requests, Compliance, Facilities |
| Projects | Web Refresh, Spring Launch, Partner Enablement, Training Pilot, Inventory Audit, Accessibility Reviews |
| Reference and handoff | Meeting Archive, Templates, Client Handoffs, Research, Travel Planning, Onboarding |

- Write 56 notes with distinct titles and meaningful short prose. Include Things to do in Inbox, November Vendor Scorecard in Vendor Reviews, Move Day Runbook in Office Move, and Call Escalation Guide in Customer Support. Most notes should be active, with at least four trashed across active notebooks and at least four notebooks empty. Give some notes shared tags such as `follow-up`, `meeting`, `process`, `vendors` and `budget`. Include several untagged notes.
- Write 40 tasks across at least twelve active notes and two trashed notes. Aim for a mix of open and completed, flagged and unflagged, plus dated and undated. Seed verb-led actions with concise context, such as Check vendor references and Confirm loading dock access. Keep due dates fixed and spread across the seed period. Due groups are derived from the current clock, with no calendar judgments embedded in the seed.
- Seed one default notebook and one default task note using the IDs above. Every new seed test session should begin with the same records.
