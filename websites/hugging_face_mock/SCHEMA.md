# hugging_face_mock Schema

**Base URL**: `http://localhost:5496/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the initial state on the server.

Seed IDs and timestamps are fixed. User actions generate unique IDs and ISO 8601 timestamps. Object references below are string IDs. Incoming arrays replace their seeded counterparts, omitted keys use their defaults, and unknown references receive fallback labels. Open an injected session in a fresh browser context or under a new session ID so the client loads the server state.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | Active profile `{id, username, displayName, email}` |
| `users[]` | Directory profiles with the same fields as `account` |
| `models[]` | Shared repository fields plus `task`, `license`, `gating`, and integer `downloads` |
| `datasets[]` | Shared repository fields plus `format`, `license`, `gating`, integer `downloads`, `splits[]`, and `sampleRows[]` |
| `spaces[]` | Shared repository fields plus `sdk`, nullable `hardware`, `runtimeStatus`, and nullable `lastStartedAt` |
| `accessRequests[]` | `{id, repoType, repoId, requesterId, consent, purpose, status, createdAt, updatedAt, reviewedAt, reviewedBy, rejectionReason}` |
| `accessTokens[]` | `{id, ownerId, name, role, permissions, suffix, status, createdAt, revokedAt, revokedBy}` |
| `activity[]` | `{id, action, actorId, repoType, repoId, createdAt, details}` |

All repositories have `{id, ownerId, owner, name, slug, description, tags, visibility, createdBy, createdAt, updatedAt, likes, likedBy, files}`. The `owner` username and `slug` form the URL within the repository kind. Visibility is `public` or `private`. Both `tags` and `likedBy` are string arrays. The displayed like count is integer `likes` plus the length of `likedBy`.

- File records have `{id, path, content, sizeBytes, createdAt, updatedAt, createdBy, updatedBy}`. Size is the UTF-8 byte count.
- Dataset splits have `{name, rowCount}`. Samples have `{split, values}` where values map column names to JSON cell values. Both arrays start empty for new datasets.
- Model and dataset gating can be `off`, `auto`, or `manual`. Private repositories have gating off. Space SDKs are `gradio`, `docker`, and `static`. Space status is `running`, `paused`, or `static`. Static Spaces have null hardware and start time.
- Request records reference a `model` or `dataset`. Consent is boolean. Status is `pending`, `accepted`, or `rejected`. Review time, reviewer, and reason are nullable. Automatic acceptance sets the review timestamp and leaves reviewer null.
- Token roles are `read`, `write`, and `fine-grained`. Permissions are strings from `repo:read`, `repo:write`, and `space:manage`. Preset roles have an empty permissions list. Status is `active` or `revoked`. Revocation fields are null while active. Only the four-character suffix persists.
- Activity uses singular repository types. Account token actions use null `repoType` and `repoId`. Each accepted action appends one event using the same timestamp as its domain writes.

### Default IDs

- Active account `user-maya` (`maya-chen`). Other profiles are `user-nora`, `user-ilyas`, `user-sofia`, and `user-leo`.
- Seed repository IDs use the singular kind and slug, such as `model-alder-retriever`, `dataset-coastal-survey-notes`, and `space-embedding-atlas`. Seed README IDs append `-readme`.
- Review fixtures are `request-alder-nora`, `request-alder-ilyas`, `request-estuary-sofia`, `request-estuary-leo`, and `request-beacon-maya`.
- Account tokens are `token-eval-001`, `token-publish-002`, and `token-script-003`. Seed activity IDs are `activity-seed-0`, `activity-seed-1`, and `activity-seed-2`.

## Minimal Inject Example

This state loads an empty workspace with the default active account.

```json
{
  "users": [],
  "models": [],
  "datasets": [],
  "spaces": [],
  "accessRequests": [],
  "accessTokens": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Domain write | Activity action and details |
| --- | --- | --- |
| Create model, dataset, or Space | Append to `models[]`, `datasets[]`, or `spaces[]` including the complete shared fields, type settings, and a starter `files[].path = README.md`. Start with empty `likedBy` and zero counts. Compute Spaces start running with `cpu-basic` hardware and `lastStartedAt = createdAt`. | `repository.created`, `{slug, visibility}` |
| Save repository settings | Update changed `description`, `tags`, `visibility`, and type-specific fields `task`, `format`, `license`, or `hardware`, plus `updatedAt`. Switching a gated repository to private also sets `gating = off`. | `repository.updated`, `{changes}` with exact changed fields before timestamp |
| Like or unlike model | Add or remove the actor in `models[].likedBy`. | `model.like_changed`, `{liked}` |
| Save dataset text file | Append or replace `datasets[].files[]` by path, preserving ID and create fields when editing. Update file `content`, `sizeBytes`, `updatedAt`, `updatedBy`, and repository `updatedAt`. | `dataset.file_saved`, `{fileId, path, operation}` with `created` or `updated` |
| Pause Space | Set `spaces[].runtimeStatus = paused` and update `updatedAt`. | `space.paused`, `{fromStatus, toStatus}` |
| Restart Space | Set `spaces[].runtimeStatus = running` and refresh `updatedAt` and `lastStartedAt`, including on a running Space. | `space.restarted`, `{fromStatus, toStatus}` |
| Save gating | Set `models[].gating` or `datasets[].gating` and `updatedAt`. | `repository.gating_changed`, `{fromMode, toMode}` |
| Request access | Append a consented `accessRequests[]` record with the actor and repository IDs, purpose, timestamps, and applicable review fields. Manual requests start pending and automatic requests start accepted. | `access.requested`, `{requestId, status}` |
| Approve, reject, or return to pending | Update `accessRequests[].status`, `updatedAt`, `reviewedAt`, `reviewedBy`, and `rejectionReason`. A non-rejection clears the reason. | `access.reviewed`, `{requestId, fromStatus, toStatus}` |
| Create access token | Append to `accessTokens[]` with the submitted settings, owner ID, suffix, active status, creation timestamp, and null revocation fields. | `token.created`, `{tokenId}` |
| Revoke access token | Update `accessTokens[].status = revoked`, `revokedAt`, and `revokedBy`. | `token.revoked`, `{tokenId}` |

Bootstrap writes the merged baseline on first load in a browser session. Search, filtering, sorting, selecting splits, opening files, navigation, drafts, cancellation, validation failures, and idle time produce no business writes.
