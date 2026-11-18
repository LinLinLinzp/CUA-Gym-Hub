# Firebase Mock — Test Report

> Round 1, Playwright QA  
> Date 2026-11-18  
> Server http://localhost:5485  
> Tested by playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Primary routes tested | 5 |
| Seed workflows passed | 4 |
| Chromium suite scenarios passed | 16 (8 on Vite dev and 8 on built assets) |
| Additional passing checks | 7 (5 desktop visual reviews, a supplemental controls scenario, and the isolated reset API check) |
| Open findings | 6 (1 P0, 3 P1, 2 P2) |

The production build passed. The built-asset run served the emitted HTML, CSS and JavaScript from disk through the Chromium test harness and used the localhost Harbor state endpoints.

## ✅ Passing Tests

- **Overview and navigation** — All four product cards and the Firebase wordmark navigated to the expected routes. Verified the skip link, fallback route and recovery link, active tabs, deep links, reload, and browser Back and Forward. Internal links retained the session ID.
- **Authentication** — Searched email and UID, filtered by provider and status, and paginated in both directions. Added a normalized email/password account, then disabled, enabled and deleted it without losing the active search. Checked duplicate email feedback, canceled deletion, and Escape and focus return in the dialog.
- **Firestore** — Created root and nested collections with first documents, used explicit and auto-generated document IDs, searched documents, and navigated collection and document breadcrumbs. Checked all seven field types, controls for adding and removing draft field rows, committed field edits and deletions, and confirmed document and collection subtree deletion. Similarly prefixed paths survived and selection returned to a remaining resource. Duplicate IDs and field names, invalid paths and invalid map, number and timestamp values triggered validation.
- **Rules** — Previewed the active source and a historical version, exercised history search and pagination, discarded a draft, and ran unauthenticated and authenticated Playground simulations. Checked allow, deny, unsupported and invalid-path feedback. Published a valid draft and restored a historical version using confirmation. A missing semicolon blocked publication.
- **Hosting** — Switched sites, searched releases, paginated releases and domains, rolled back a release, viewed DNS setup and removed a custom domain. Checked invalid and duplicate hostnames and canceled rollback and removal. The just-restored version was unavailable as another rollback target.
- **Harbor** — Verified an isolated session through `/post` and `/go`, then confirmed reset restored its baseline and cleared its diff. Fresh sessions sent one baseline write. Reload and an idle same-session tab sent no extra writes after another tab committed a change. Empty arrays, single sparse records and 300-record fixtures rendered across all five routes. Search reached the last injected record in each searchable list. Checked page width at 375, 390 and 1280 pixels.

### State changes verified through `/go`

Each successful action in the seeded workflows sent one `set_current` request and appended one `activity` entry with `id, projectId, actorId, createdAt, action, targetId, details`. The checks verified the original snapshot, the top-level `state_diff`, and unaffected records. Navigation, filters, draft controls, Playground runs, previews and the tested invalid or canceled actions left business state unchanged. The separate malformed-rule probe below found a validation exception.

| Workflow / activity action | Entity changes verified | Activity details verified |
| --- | --- | --- |
| `auth.user.create` | Appended `authUsers` record with `uid, projectId, email, providerIds, disabled, emailVerified, lastSignInAt, createdAt, createdBy, updatedAt, updatedBy`. Password stayed out of persisted state. | Selected UID, `{ email }` |
| `auth.user.disable`, `auth.user.enable` | Updated `authUsers[].disabled, updatedAt, updatedBy` on the selected UID. | Selected UID, `{ disabled }` |
| `auth.user.delete` | Removed the selected UID from `authUsers`. | Removed UID, `{ email }` |
| `firestore.collection.create` | Appended `firestoreCollections` record with `id, path, parentDocumentPath, projectId, databaseId, createdAt, createdBy` and the initial `firestoreDocuments` record in the same write. | Collection path, `{ databaseId, firstDocumentPath }` |
| First document on collection creation and `firestore.document.create` | Appended `firestoreDocuments` record with `id, path, collectionPath, projectId, databaseId, fields, createdAt, createdBy, updatedAt, updatedBy`. Typed fields persisted as `{ name, type, value }`. | Standalone document creation targeted its document path, `{ databaseId, collectionPath }` |
| `firestore.field.add`, `firestore.field.update`, `firestore.field.delete` | Updated the selected document's `fields, updatedAt, updatedBy`. | Document path, `{ databaseId, fieldName, fieldType }` |
| `firestore.document.delete`, `firestore.collection.delete` | Removed exact-path and descendant records from `firestoreCollections` and `firestoreDocuments`. | Selected path, `{ databaseId, removedCollectionPaths, removedDocumentPaths }` |
| `rules.publish`, `rules.restore` | Appended `ruleVersions` record with `id, projectId, databaseId, source, createdAt, createdBy` and `restoredFromVersionId` on restore. Updated `firestoreRules.activeVersionId, updatedAt, updatedBy`. | New version ID, `{ databaseId, previousVersionId }` plus `restoredFromVersionId` on restore |
| `hosting.release.rollback` | Appended `hostingReleases` record with `id, siteId, versionId, kind, fileCount, rolledBackFromReleaseId, rollbackTargetReleaseId, createdAt, createdBy`. Updated the selected site's `currentReleaseId, updatedAt, updatedBy`. | New release ID, `{ siteId, rolledBackFromReleaseId, rollbackTargetReleaseId, versionId }` |
| `hosting.domain.add` | Appended `hostingDomains` record with `id, siteId, hostname, type, status, dnsRecords, createdAt, createdBy`. Hostname was normalized, status was `needs_setup`, and TXT and A records had `type, host, value`. | New domain ID, `{ siteId, hostname }` |
| `hosting.domain.remove` | Removed the selected custom record from `hostingDomains`. | Removed domain ID, `{ siteId, hostname }` |

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Restore activates a version without a policy

| Field | Value |
| --- | --- |
| Route and element | `/firestore/rules`, Restore |
| Action | Inject an active version with valid source and a historical version in the same project and database with its `source` omitted. Restore the historical version and confirm. |
| Expected | The active policy and history stay intact. |
| Actual | `/go` shows a new active version without `source` and an appended `rules.restore` event. |
| Console errors | No application exception. |
| Fix hint | Use the same source eligibility check when rendering Restore and when confirming it. |

### BUG-002 · P1 · Malformed Rules expression can become active

| Field | Value |
| --- | --- |
| Route and element | `/firestore/rules`, Rules source and Publish |
| Action | Inside a valid document match, enter `allow get: if true == == false;` and confirm Publish. |
| Expected | Syntax validation blocks the write. |
| Actual | Publish activates the malformed source and appends `rules.publish` in `/go`. |
| Console errors | No application exception. |
| Fix hint | Reject invalid token sequences while preserving the unsupported Playground result for valid expressions outside its subset. |

### BUG-003 · P1 · Rules publication retains stale project and database scope

| Field | Value |
| --- | --- |
| Route and element | `/firestore/rules`, Publish |
| Action | Inject a different `project.id` and `project.databaseId` and an empty `ruleVersions` array. Omit `firestoreRules`, then publish valid source. |
| Expected | The new version and its active pointer share the injected scope. |
| Actual | `/go` shows the new version correctly scoped while `firestoreRules.projectId` and `firestoreRules.databaseId` still contain `northstar-notes` and `(default)`. |
| Console errors | No application exception. |
| Fix hint | Write project and database scope with the active pointer and check scope on lookup. |

### BUG-004 · P1 · Sparse Hosting release produces incomplete rollback

| Field | Value |
| --- | --- |
| Route and element | `/hosting`, Roll back |
| Action | Inject a live release and an older release with a version ID but no `fileCount`. Roll back to the older one and confirm. |
| Expected | The current release remains live when the target lacks the numeric file count required by the release schema. |
| Actual | `/go` shows a new live rollback release without `fileCount` and an appended rollback event. |
| Console errors | No application exception. |
| Fix hint | Check target completeness before offering rollback and again at confirmation. |

### BUG-005 · P2 · The first page load can produce a favicon 404

| Field | Value |
| --- | --- |
| Route and element | Shared HTML shell, reproduced on `/firestore/rules` |
| Action | Open the route in a fresh Chromium session and inspect console errors. |
| Expected | No missing-resource console errors. |
| Actual | Chromium requested `/favicon.ico` and received HTTP 404. The app still rendered. |
| Fix hint | Reference an original local favicon in the HTML shell. |

## Visual Alignment Feedback

Reviewed all five desktop views against the repo's original design and checked narrow-screen layout in Chromium. The text wordmark, dark masthead, horizontal tabs, service diagram and workspace panels follow the design.

### VISUAL-001 · P2 · Compact action buttons differ from design

| Field | Value |
| --- | --- |
| Views | Authentication, Firestore, Rules, Hosting |
| Reference | `DESIGN.md` |
| Observed | Table and Rules history actions measured 34 px. The stylesheet also defines 34 px overrides for some Firestore and pagination actions. The design specifies 40 px for primary buttons. The measured primary **Start collection** action met 40 px. |
| Follow-up | Document the intended minimum for secondary compact controls. |

## Round History

- Re-ran the existing eight scenarios against dev and built assets. All passed in both runs.
- Reproduced the four state defects in `AUDIT.md`. Verified compact button sizing and recorded the missing favicon from Chromium console output.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `140848`. The local evidence is `factory/build/dyn_certify/140848/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `authUsers → 0 → uid`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A historical Rules version without source stayed unavailable, and Harbor retained the active policy. Rules, authentication, hosting and Firestore workflows passed.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
