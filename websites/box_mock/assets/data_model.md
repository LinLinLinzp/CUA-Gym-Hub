# Box workspace state model

## State shape

`createInitialData()` returns the following JSON object. IDs use strings. Persist UTC timestamps as ISO strings from `new Date().toISOString()` for user actions. Optional values use `null` on new writes. Readers tolerate their absence in injected data. The examples use fixed dates for seeding.

| Top-level key | Shape | Seed target |
| --- | --- | --- |
| `account` | Account object | Morgan Ellis |
| `users` | User array | 28 coworkers |
| `folders` | Folder array | 36 folders |
| `files` | File array | 60 files |
| `collaborations` | Collaboration array | 48 entries |
| `tasks` | Task array | 30 tasks |
| `taskAssignments` | Task assignment array | About 42 assignments |
| `retentionPolicies` | Retention policy array | 24 policies |
| `retentionAssignments` | Retention assignment array | About 32 assignments |

All mutable domain records start with these common fields.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `folder-client-operations` |
| `createdById`, `updatedById` | user ID | `user-morgan` |
| `createdAt`, `updatedAt` | ISO datetime | `2026-10-07T14:20:00.000Z` |

For a new record, initialize the creation and update metadata to the same actor and time. Use collision-resistant IDs for user-created records and keep those IDs stable on edits.

## Account and users

- `account` has `currentUserId` (user ID, `user-morgan`), `workspaceName` (string, `Northline Studio`), and `canManageRetention` (boolean, `true`).
- A user has `id` (string, `user-leah`), `name` (string, `Leah Brooks`), `email` (string, `leah.brooks@example.test`), and `department` (optional string, `Client Operations`). Use initials for avatars. The account always references a seeded user in the default world. A sparse injected directory gets readable fallbacks and permits only actions whose required actor and record references resolve.

## Folders and files

| Entity | Field | Type and example |
| --- | --- | --- |
| Folder | `parentId` | Folder ID or null for root, e.g. `folder-client-operations` |
| Folder | `name`, `description` | Strings, e.g. `Vendor Onboarding` and `Templates and intake documents` |
| Folder | `ownerId` | User ID, e.g. `user-morgan` |
| Folder | `status` | `active` or `trashed` |
| Folder | `trashedAt`, `trashedById` | Nullable datetime and user ID |
| File | `folderId` | Folder ID or null for root |
| File | `name`, `mimeType`, `previewText` | Strings, e.g. `Vendor Intake Checklist.pdf`, `application/pdf` and `Collect tax and contact details before requesting review.` |
| File | `ownerId`, `sizeBytes` | User ID and integer, e.g. `user-morgan` and `48432` |

Calculate breadcrumbs, counts, effective visibility and inherited access by traversing parent IDs. Guard missing links and cycles on reads. A trashed ancestor hides descendants in active routes. Preserve descendants’ own statuses so restoring a parent leaves separately trashed folders in Trash. Root-level file tasks may use the file owner as the eligible assignee. Match duplicate names among active siblings across both content types.

## Collaborations

| Field | Type and example |
| --- | --- |
| `folderId` | Folder ID, e.g. `folder-vendor-onboarding` |
| `userId`, `inviteeEmail` | Nullable user ID and normalized email, e.g. `user-leah` and `leah.brooks@example.test` |
| `role` | `co_owner`, `editor`, `viewer_uploader`, `previewer_uploader`, `viewer`, `previewer`, or `uploader` |
| `message` | Optional string, e.g. `Please review the onboarding files.` |
| `status` | `active`, `pending`, or `removed` |
| `removedAt`, `removedById` | Nullable datetime and user ID |

The owner comes from the folder record. List direct entries and active inherited entries with source paths. Multiple ancestor grants can be displayed with their sources. Deduplicate users when deriving task eligibility. Reject a direct invite to the owner or to an email with an existing active/pending direct grant. A later re-invite gets a fresh record, leaving the removed entry available to verifiers.

## Tasks and assignments

| Entity | Field | Type and example |
| --- | --- | --- |
| Task | `fileId`, `message` | File ID and string, e.g. `file-vendor-intake-checklist` and `Check the required attachments.` |
| Task | `type` | `general` or `approval` |
| Task | `completionRule` | `all` or `any` |
| Task | `dueDate` | Nullable date-only string, e.g. `2026-12-04` |
| Task | `status` | `open`, `completed`, `approved`, `rejected`, or `deleted` |
| Task | `resolvedAt`, `resolvedById`, `deletedAt`, `deletedById` | Nullable datetimes and user IDs |
| Task assignment | `taskId`, `assigneeId` | Task and user IDs, e.g. `task-vendor-review` and `user-leah` |
| Task assignment | `status` | `pending`, `completed`, `approved`, `rejected`, or `removed` |
| Task assignment | `decidedAt`, `decidedById`, `removedAt`, `removedById` | Nullable datetimes and user IDs |

Allow create and assignment edits only with at least one distinct eligible user. A general task closes when its rule is satisfied. For approval with All assignees, any rejection closes it as Rejected and all approvals close it as Approved. For approval with Any assignee, the first approval closes it as Approved, or all rejections close it as Rejected. Exclude removed assignments from aggregation. These rules define the sandbox’s multi-assignee behavior. After a decision, lock creator edits and deletion. On deletion, mark the task Deleted and its pending assignments Removed with actor and timestamp. Closed tasks keep individual decisions visible, and pending assignments under a closed task are read-only. Use the runtime’s current date to derive overdue presentation from open tasks.

## Retention policies and assignments

| Entity | Field | Type and example |
| --- | --- | --- |
| Policy | `name`, `description` | Strings, e.g. `Vendor Records` and `Keep vendor intake and due diligence records.` |
| Policy | `type`, `scope` | `modifiable` or `non_modifiable`, and `folders` |
| Policy | `duration` | Object with `value` (positive integer or null) and `unit` (`days`, `years`, `indefinite`), e.g. `{ "value": 6, "unit": "years" }` |
| Policy | `startBasis`, `disposition` | `content_created_at` and either `permanently_delete` or `keep` |
| Policy | `status` | `active` or `retired` |
| Policy | `activatedAt`, `activatedById`, `retiredAt`, `retiredById` | Activation and nullable retirement datetimes and user IDs |
| Retention assignment | `policyId`, `folderId` | Policy and folder IDs, e.g. `policy-vendor-records` and `folder-vendor-onboarding` |
| Retention assignment | `kind`, `sourceAssignmentId` | `direct` (null source) or `carried` (source assignment ID) |
| Retention assignment | `status` | `active` or `removed` |
| Retention assignment | `removedAt`, `removedById` | Nullable datetime and user ID |

Validate names and descriptions up to 250 and 500 characters respectively. Offer 30, 60, and 90 days, 1, 3, 6, and 10 years, a custom positive integer, and Indefinite. Cap custom duration at 50 years or 18,250 days. For sandbox edit comparisons, a year is 365 days. An indefinite policy uses null for `duration.value` and the unit `indefinite`. During finite-term edits keep the term finite. Show Keep as the disposition for Indefinite. A folder can hold assignments from multiple policies. Skip repeated active direct assignments for the same pair and derive inherited coverage by ancestry.

Before changing a folder’s parent, compare policy sources on its old ancestry and new ancestry. For each policy that would lose coverage, add one carried assignment on the moved folder and reference a source assignment. The carried assignment covers its subtree. Existing direct coverage moves with the folder. Removing a modifiable direct assignment marks it and any carried assignments rooted exclusively in that source Removed in the same write. Retiring a policy changes its status, keeps its assignment history visible, and disables further application. These folder-level records document coverage, with no scheduled deletion or file-level enforcement.

## Seed construction

Use explicit scenarios plus deterministic fixture generation. Start with Client Operations, Finance, People Operations, Studio Projects, and Corporate Records. Give Client Operations a Vendor Onboarding child and a nested Due Diligence folder. Include Vendor Intake Checklist.pdf in Vendor Onboarding, owned by Morgan, with Leah as an editor. Grant another coworker access at Client Operations to exercise inheritance. Seed a distinct pending email, a removed historical invite, and several folders covered by no policy.

Make Morgan the assignee on an open general task and an open approval task, and the creator on an open task assigned to Leah. Include due dates on either side of the fixed scenario dates and a mix of outcomes. Provide at least one active modifiable policy with a folder that can be removed, one active non-modifiable policy covering an ancestor, an indefinite term, a retired policy, and a directly trashed folder with children. Use stable prefixes such as `user-`, `folder-`, `file-`, `collab-`, `task-`, `task-assignment-`, `policy-`, and `retention-assignment-`. Keep every default reference resolvable. Sort derived lists safely for injected states with unknown references or absent optional values.
