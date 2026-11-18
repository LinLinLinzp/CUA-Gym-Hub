# Firebase — implementation plan

> Status: DEV COMPLETE  
> Last updated by plan agent, 2026-11-18  
> References: [Design](DESIGN.md) · [Research](assets/README.md) · [Data model](assets/data_model.md) · [Harbor contract](../../HARBOR_CONTRACT.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Workspace and runtime

- [x] Set up Vite and React with a lockfile and a successful `npm run build`. Configure port 5485 with strict port binding. Use the unchanged `templates/state-api.js` Vite plugin and copy the unchanged `templates/dataManager.js` to `src/utils/dataManager.js`. Export deterministic `createInitialData()` from `src/data/seed.js`. Title the app **Firebase**.
- [x] Implement one store that awaits `loadState('firebase', createInitialData)` before rendering the shell and calls `saveState('firebase', nextState)` once per successful business action. Commit each operation and its audit record together. Keep drafts, filters, resource selections and canceled or invalid forms in UI state. Use the template's `GET /state`, `POST /post` and JSON `GET /go` endpoints with session isolation. Preserve `sid` in router links and use `withSid()` for links outside the router. Render injected empty, sparse and large lists on every route.
- [x] Build the pre-opened Northstar Field Notes workspace with the text wordmark, top project bar and horizontal product navigation in [DESIGN.md](DESIGN.md). Provide `/` (Overview), `/authentication` (Authentication), `/firestore` (Firestore), `/firestore/rules` (Rules) and `/hosting` (Hosting). Overview links to all four workflow routes and derives counts and recent activity from current state. Back, forward and direct reload preserve the route and session. Provide accessible forms, dialogs, focus return, clear validation and visible success feedback.
- [x] Write `SCHEMA.md` from implemented state. Include every top-level key, nested record and exact observable fields for every mutating action. Keep the built app self-contained and serve all assets locally. Use synthetic account data throughout.

## P1 — Required workflows

- [x] **Authentication users.** Show Identifier, Provider, Created, Last sign-in, UID and Status. Search identifier or UID, filter by provider and status, and paginate or window populated results. Add an email/password user record from the Add user dialog with a unique normalized email and generated UID. A synthetic password may be entered and validated locally. Clear it when the form exits and exclude it from persisted state. Row actions allow Disable or Enable and Delete with confirmation. Keep the current query across successful actions. **State writes** — Add appends `authUsers` with `uid, projectId, email, providerIds, disabled, emailVerified, lastSignInAt, createdAt, createdBy, updatedAt, updatedBy`. Disable/Enable writes `disabled, updatedAt, updatedBy` on that UID. Delete removes the UID. Append `auth.user.create`, `auth.user.disable`, `auth.user.enable` or `auth.user.delete` to `activity`. See [Authentication users](assets/data_model.md#authentication-users).
- [x] **Cloud Firestore data.** Provide a path breadcrumb and a collection list, searchable document list and typed field detail panel. Start a collection with its first document in one form and one commit. Support explicit IDs and Auto ID. Add documents, add/edit/delete fields, and delete documents and collections with confirmation. Allow nested collection browsing and creation from a document. Offer string, number, boolean, null, timestamp, map and array controls. Validate duplicate sibling IDs and field names, numeric and date values, and structured JSON before committing. Keep the closest surviving selection after deletion. **State writes** — Create collection appends `firestoreCollections` and its first record to `firestoreDocuments`. Add document appends `firestoreDocuments`. Field operations update `fields, updatedAt, updatedBy` on the selected document. Deletion removes records at the selected path and its descendants using segment boundaries. Append one matching `firestore.*` action to `activity`, with removed paths for subtree deletions. See [Firestore](assets/data_model.md#firestore).
- [x] **Firestore Security Rules.** Open Rules from the Firestore view and directly from Overview. Show the active source, a locally editable draft and a searchable version list sorted newest first. Expose syntax feedback and a Playground for the documented example subset. Provide operation, document path and authentication inputs with explicit allow, deny or unsupported results. Publish valid changed source and support restoring a historical version through a new publication. Incomplete input, canceled actions and unsupported Playground evaluations leave the active version unchanged. **State writes** — Publish appends `ruleVersions` and updates `firestoreRules.activeVersionId, updatedAt, updatedBy`. Restore does the same with `restoredFromVersionId` on the new version. Append `rules.publish` or `rules.restore` to `activity`. The Playground checks the draft without saving. See [Rules](assets/data_model.md#rules).
- [x] **Firebase Hosting.** Show a site selector, active version, searchable release history and a domain list. Roll back to a prior served version through confirmation. Preserve history and append a new rollback release with the selected version ID. Add a custom domain, show locally generated setup records, and remove custom domains with confirmation. Display seeded connection statuses and show new domains as Needs setup. **State writes** — Rollback appends `hostingReleases` and updates `hostingSites.currentReleaseId, updatedAt, updatedBy` for the selected site. Add appends `hostingDomains`. Remove deletes the selected custom domain record. Append `hosting.release.rollback`, `hosting.domain.add` or `hosting.domain.remove` to `activity`. See [Hosting](assets/data_model.md#hosting).

## P2 — Secondary features

Scope the first delivery to the P0 and P1 items above.

## Data seed

- [x] Populate one project with a fixed signed-in operator and at least 36 Auth users. Include enabled and disabled users, email/password, Google, phone and anonymous providers, varied timestamps and entries with no last sign-in.
- [x] Populate 24 named collection records and at least 96 documents, including 24 or more in the busiest collection and nested paths under at least two documents. Include every supported field type and several similarly named paths to exercise lookup and deletion.
- [x] Populate 24 rule versions with varied source and timestamps, and a consistent active version. Include sources and inputs that exercise both allow and deny in the local Playground.
- [x] Populate two Hosting sites with 24 release records per site and at least 24 domains across both sites. Include default domains, several connected custom domains and examples of in-progress setup. Use fixed IDs, English labels and reserved addresses throughout. Seed an activity list spanning all four products.

## Verification handoff

- [x] Run the build and use the installed Playwright from `PILOT_PLAYWRIGHT` against localhost:5485. Start the persistent server with `Start-Process -WindowStyle Hidden` and the absolute local Vite entry point. Keep scratch files ignored or remove them.
- [x] In separate sessions, exercise Auth add, filter, disable, enable and delete. Exercise Firestore collection, document, nested and typed field edits, and subtree deletion. Exercise Rules simulation, publish and restore. Exercise Hosting site selection, rollback and domain add/remove. Assert the exact records and relations in `/go` for each write, including deletions. Confirm invalid and canceled actions make no write.
- [x] Verify fresh loads and reloads, independent sessions, quiet idle tabs after baseline, injected empty/sparse/large arrays, session-preserving links, desktop and narrow layouts, and keyboard dialog operation. Record actual results and changed fields in `TEST.md` during the test phase. Parent runner handles Docker certification and commits.

## Out of scope

Workspace login, credential verification, sending password reset messages, live DNS and TLS provisioning, real deployment or Firebase SDK calls, Firestore indexes and backups, billing and IAM administration.
