# Account state model

The state is one JSON-serializable object with `account`, `users`, `models`, `datasets`, `spaces`, `accessRequests`, `accessTokens`, and `activity`. In the tables, timestamps are ISO 8601 strings. Use fixed IDs and timestamps in seed data and browser-generated unique IDs plus `new Date().toISOString()` for user actions. All dates below are examples.

## Account and users

`account` is a profile object. `users[]` contains directory profiles with the same shape. Treat `account.id` as the active actor and seed the matching profile in the directory. The app can resolve the active actor directly from `account` even when the injected directory is empty.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `user-maya` |
| `username` | string | `maya-chen` |
| `displayName` | string | `Maya Chen` |
| `email` | string | `maya.chen@example.test` |

## Repository records

Put records in `models[]`, `datasets[]`, or `spaces[]`. The collection determines the singular repository type used in references. A namespace is the stable route handle for an owner. `ownerId` references `users[].id` or the active account. Compare owner IDs to identify owned repositories. For injected sparse data with a namespace but no owner ID, the active username may identify the owner.

| Shared field | Type | Example |
| --- | --- | --- |
| `id` | string | `model-alder-retriever` |
| `ownerId` | string | `user-maya` |
| `owner` | string | `maya-chen` |
| `name` | string | `Alder Retriever` |
| `slug` | string | `alder-retriever` |
| `description` | string | `Sentence embeddings tuned for civic planning records.` |
| `tags` | string[] | `["embeddings","civic-data"]` |
| `visibility` | enum | `public`, `private` |
| `createdBy` | user ID string | `user-maya` |
| `createdAt`, `updatedAt` | timestamp | `2026-05-06T12:00:00.000Z` |
| `likes` | nonnegative integer | `24` seeded likes excluding actors in `likedBy` |
| `likedBy` | user ID string[] | `["user-maya"]` |
| `files` | file record[] | one starter `README.md` |

Create accepts a trimmed name and generates a lowercase dashed slug. Require a nonempty slug of up to 96 characters with letters, numbers, dashes, underscores, or periods, starting and ending with a letter or number. Verify uniqueness within kind and namespace before committing. Display the generated slug in the form so the destination is clear. Keep names and slugs stable through the P1 metadata editors.

| Collection | Additional field | Type and examples |
| --- | --- | --- |
| `models[]` | `task` | string, e.g. `feature-extraction`, `text-generation`, `image-classification` |
| `models[]` | `license` | string, e.g. `apache-2.0`, `mit`, `other` |
| `models[]`, `datasets[]` | `gating` | enum `off`, `auto`, `manual` |
| `models[]`, `datasets[]` | `downloads` | nonnegative integer, e.g. `3710` |
| `datasets[]` | `format` | string, e.g. `parquet`, `csv`, `jsonl` |
| `datasets[]` | `license` | string, e.g. `cc-by-4.0`, `cc0-1.0`, `other` |
| `datasets[]` | `splits` | array of `{name, rowCount}`, e.g. `[{ "name": "train", "rowCount": 4200 }]` |
| `datasets[]` | `sampleRows` | array of `{split, values}`, e.g. `[{ "split": "train", "values": {"record": "West quay", "category": "zoning"} }]` |
| `spaces[]` | `sdk` | enum `gradio`, `docker`, `static` |
| `spaces[]` | `hardware` | string, e.g. `cpu-basic`, `cpu-upgrade`, `t4-small`. Use null for Static |
| `spaces[]` | `runtimeStatus` | enum `running`, `paused`, `static` |
| `spaces[]` | `lastStartedAt` | timestamp or null for Static |

File records are `{id, path, content, sizeBytes, createdAt, updatedAt, createdBy, updatedBy}`. The path and content are strings, the actors are user IDs, and size is a nonnegative UTF-8 byte count. A good fixture is `README.md` with “# Alder Retriever” and a short project summary. An update keeps the same ID and create fields and changes content, size, update timestamp, and update actor. Limit the P1 editor to simple filenames and small text fixtures. Use text rendering for user-entered content.

New repositories default to zero likes, zero downloads where applicable, and gating off where applicable. A new compute Space gets `running`, `cpu-basic` unless configured, and a start timestamp. A new Static Space gets `static` and null hardware/start time. Private repositories appear only for the owner and cannot have gating enabled. If an edit makes a gated repository private, set gating off in the same write and retain historical requests. A public gated resource shows its card to everyone but restricts file links, direct file views, and dataset sample rows to the owner or accepted user.

## Access requests

`accessRequests[]` is the current state of each submission. Both the request and its decisions reference the same ID. Scope lookups to `repoType`, `repoId`, and `requesterId` and preserve prior transitions in activity. An automatic request has immediate accepted status, a matching `reviewedAt`, and null `reviewedBy`. A manual request starts without review metadata. On any review, timestamp the decision and set the actor. Clear the rejection reason on transitions other than rejection. Resolve missing profiles or repositories gracefully.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `request-map-001` |
| `repoType` | enum | `model`, `dataset` |
| `repoId` | repository ID string | `model-alder-retriever` |
| `requesterId` | user ID string | `user-nora` |
| `consent` | boolean | `true` |
| `purpose` | string | `Benchmarking search over municipal notes.` |
| `status` | enum | `pending`, `accepted`, `rejected` |
| `createdAt`, `updatedAt` | timestamp | `2026-05-09T09:30:00.000Z` |
| `reviewedAt` | nullable timestamp | `null` for a fresh manual submission |
| `reviewedBy` | nullable user ID string | `user-maya` for a manual decision |
| `rejectionReason` | nullable string | `Please describe your evaluation dataset.` |

## Access tokens

`accessTokens[]` retains synthetic token metadata, including revoked entries. Trim token names and require a name. Use permissions `repo:read`, `repo:write`, and `space:manage` for the local Fine-grained form. Use an empty permission list for preset roles. The display-only dummy value can start with `hf_demo_`; store just its suffix in the record.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `token-eval-001` |
| `ownerId` | user ID string | `user-maya` |
| `name` | string | `Evaluation notebooks` |
| `role` | enum | `read`, `write`, `fine-grained` |
| `permissions` | string[] | `["repo:read"]` |
| `suffix` | string | `D8Q3` |
| `status` | enum | `active`, `revoked` |
| `createdAt` | timestamp | `2026-05-15T13:00:00.000Z` |
| `revokedAt` | nullable timestamp | `null` while active |
| `revokedBy` | nullable user ID string | `user-maya` |

## Activity records

`activity[]` is an append-only record of accepted user-driven state changes. A record is `{id, action, actorId, repoType, repoId, createdAt, details}`. Use a unique string ID, the acting account ID, an ISO timestamp, the affected repository type and ID (both null for account tokens), and a JSON object as details. Use the same timestamp for an action and its domain writes.

| Action enum | Details object example | Domain fields written |
| --- | --- | --- |
| `repository.created` | `{slug: "alder-retriever", visibility: "public"}` | Append the repository to its collection |
| `repository.updated` | `{changes: {visibility: "private", gating: "off"}}` | Change submitted settings, any required gating reset, and `updatedAt` |
| `model.like_changed` | `{liked: true}` | Update `models[].likedBy` |
| `dataset.file_saved` | `{fileId: "file-001", path: "notes.txt", operation: "created"}` | Upsert `datasets[].files[]` and change repository `updatedAt`. Use `updated` for an edit |
| `space.paused`, `space.restarted` | `{fromStatus: "running", toStatus: "paused"}` | Update `runtimeStatus` and `updatedAt`. Also set `lastStartedAt` on restart |
| `repository.gating_changed` | `{fromMode: "off", toMode: "manual"}` | Set `gating` and `updatedAt` |
| `access.requested` | `{requestId: "request-map-001", status: "pending"}` | Append the submission to `accessRequests[]` |
| `access.reviewed` | `{requestId: "request-map-001", fromStatus: "pending", toStatus: "accepted"}` | Set submitted decision and review fields on the existing request |
| `token.created`, `token.revoked` | `{tokenId: "token-eval-001"}` | Append metadata on creation or update status and revocation fields on revoke |

## Suggested `createInitialData()` fixtures

- Return new plain arrays and objects each time, with 30 records per repository kind and five synthetic directory profiles. Use six owned repositories per kind, community repositories across multiple fictional maintainers, and varied metrics and fixed dates. Include private owned examples, public examples, varied tasks and formats, all three SDKs, and at least one running and one paused owned compute Space. Repository namespaces and slug combinations are unique per kind.
- Provide at least two pending incoming requests on an owned manual repository for approve/reject checks. Include an accepted and a rejected incoming request, one sent request, and separate community manual and automatic gated repositories without an existing request by the active user. Seed stable IDs for all fixtures.
- Provide some dataset cards with train/validation/test rows and other cards with no samples. Use text and small numeric values in sample rows and finite nonnegative counts. Seed at least two active tokens and one revoked token.
- Seed a small linked activity history for the overview. Use read-time fallback arrays and labels. Preserve durable state shape during rendering and retain unknown injected keys across mutation updates.
