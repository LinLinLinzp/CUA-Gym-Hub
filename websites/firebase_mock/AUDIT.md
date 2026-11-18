# Firebase Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 1 |
| Data pipeline gaps | 2 |
| Workflow validation | 1 |
| Design alignment | 1 |
| Schema documentation mismatches | 0 |
| Total | 5 |

The build passed and all eight existing Chromium scenarios passed against both the localhost dev app and the built assets. Additional localhost browser probes confirmed four workflow defects through `/go`. The report leaves source changes to the development round.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · Restoring a version with no source replaces the active policy

- **File** `src/pages/Rules.jsx:54` and `src/pages/Rules.jsx:111`
- **Reproduce** Inject a historical version with its ID and valid project/database IDs but omit `source`. Open Rules, select **Restore**, and confirm.
- **Result** One `rules.restore` write succeeds and moves `firestoreRules.activeVersionId` to a new version without a `source` field. The editor then shows an empty active policy.
- **Fix** Expose restore only for versions with usable source and recheck eligibility at confirmation. Preserve the active policy when a historical record is incomplete. Verify no `set_current` is sent in this case.

## P1 — Incomplete Features

### AUDIT-002 · An invalid Rules expression can be published

- **File** `src/pages/rulesLanguage.js:61` and `src/pages/Rules.jsx:86`
- **Reproduce** In a valid document match block, set `allow get: if true == == false;`, then publish and confirm.
- **Result** The syntax check treats the invalid expression as outside the Playground subset. The enabled Publish action stores and activates it, including an activity record.
- **Fix** Reject malformed expression sequences during syntax validation. Retain an explicit unsupported Playground result for syntactically valid policies beyond the simulated subset. Verify that malformed drafts leave the active version and activity unchanged.

### AUDIT-003 · Publish can leave the Rules pointer scoped to the seed project

- **File** `src/pages/Rules.jsx:41` and `src/pages/Rules.jsx:64`
- **Reproduce** Inject `project` with a different `id` and `databaseId`, set `ruleVersions` to `[]`, and omit `firestoreRules`. Publish a valid source on the injected route.
- **Result** The new `ruleVersions` record uses the injected project and database. `firestoreRules.activeVersionId` points to that record while the enclosing `firestoreRules.projectId` and `firestoreRules.databaseId` retain `northstar-notes` and `(default)`.
- **Fix** Scope the active pointer lookup to the current project/database. Write the current scope with the pointer on publish and restore. Verify both records agree after a scoped injection.

### AUDIT-004 · Hosting creates an incomplete rollback release from sparse history

- **File** `src/pages/Hosting.jsx:65` and `src/pages/Hosting.jsx:135`
- **Reproduce** Inject a Hosting site and a historical release with `id`, `siteId` and `versionId` and omit `fileCount`. Select **Roll back** and confirm.
- **Result** The new live release has no `fileCount` in `/go`, which violates the numeric release shape. The history and activity still report success.
- **Fix** Require a usable file count before exposing and confirming rollback. Keep sparse history visible and give a clear reason when rollback is unavailable. Verify the existing live pointer remains unchanged.

### AUDIT-005 · Compact action buttons depart from the documented minimum height

- **File** `src/styles.css:150`, `src/styles.css:186` and `src/styles.css:209`
- **Issue** Table and pagination actions, Firestore pane actions and Rules history actions override the documented 40px minimum for buttons with 34px.
- **Fix** Apply the documented minimum or define an explicit compact-control exception in `DESIGN.md` if the smaller size is intentional. The main palette, local illustration, fonts, layout and dialog styles align with the design.

## P2 — Minor Issues

No findings.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte match with the Harbor template. Session-aware load merges injected state and saves user changes to browser storage and `/post`. |
| Workspace state sync | Findings | Business actions and their activity records share one store commit. No timer-driven writes. See AUDIT-001 through AUDIT-004 for validation and record issues. |
| `vite.config.js` and `/post` | Pass | Uses the Harbor template plugin. Local endpoint probe verified `set`, `set_current` and `reset`. Reset restores the saved baseline under this template. |
| `/state` and `/go` | Pass | Local checks verified stored state and `{initial_state, current_state, state_diff}` against the session fixture. |
| Session isolation and baseline | Pass | Separate session stayed independent. Updates preserved the initial snapshot, and reset cleared the diff. Reloads and a same-session idle tab produced no additional writes in the existing suite. |
| Injected render and routing | Pass | All five routes rendered for empty, sparse and 300-record fixtures. Direct links, reload, Back and Forward, and session query preservation passed. |
| Offline assets and build | Pass | No external browser traffic in either suite run. Original CSS artwork, local bundle and system typography cover the runtime assets. |
| `SCHEMA.md` | Updated | Endpoint contract, default IDs and injection example added. Confirmed record fields and action mappings remain documented, with a link to the exceptions above. |

## SCHEMA.md Updates

Standardized the endpoint and state schema headings, documented fixed seed IDs and local reset semantics, and supplied a minimal injected workspace. The action table describes complete records so verifiers can distinguish the missing fields found during this audit.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A historical Rules version without source stayed unavailable, and Harbor retained the active policy. Rules, authentication, hosting and Firestore workflows passed.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
