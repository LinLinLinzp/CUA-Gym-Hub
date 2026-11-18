# Supabase Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers / stubs | 0 |
| Missing state tracking | 1 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 after documentation update |
| Incomplete workflow behavior | 1 |
| Total open | 2 |

## P0 — Dead/Broken Code

### AUDIT-001 · A second active tab overwrites saved records

- **Files** `src/workspace.jsx:30–41`, `src/utils/dataManager.js:64–75`
- **Reproduction** Open Authentication in two tabs with the same fresh SID. Create `first@example.com` in the first tab and verify it in `/go`. Without reloading the second tab, create `second@example.com` there. Both requests return `200` and both tabs report success. The final `/go` state contains only the second user and its activity record.
- **Cause** Each tab commits from its own in-memory snapshot and passes the full replacement state to the shared template. The first record and activity disappear when the second tab saves. The existing idle-tab check still passes.
- **Fix** Coordinate same-SID writers in the app store. Within that coordination, refresh the authoritative snapshot and revalidate the operation before saving. Ensure the first write has reached the server before another writer starts. Preserve the shared template and add a regression that verifies both records and both activity entries remain in `/go`.

## P1 — Incomplete Features

### AUDIT-002 · Downloads retain the original upload filename after rename

- **File** `src/Storage.jsx:158`
- **Reproduction** Upload `old.txt`, rename it to `new.txt`, and click Download in the renamed row. The bytes are correct, but Chromium suggests `old.txt`. The `/files` response supplies the original filename in `Content-Disposition`, which takes precedence over the link’s `download` attribute.
- **Fix** Use the current object basename when saving the downloaded bytes. Keep the persisted `/files` URL and the shared API template. Assert `suggestedFilename()` and file contents after a rename, and confirm that downloading never writes business state.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | Byte-for-byte match with the Harbor template. Loads and persists via the shared helper. |
| Workspace state sync | ⚠️ | Each of 33 successful single-writer actions produced one POST and one structured activity entry. See AUDIT-001 for concurrent writers. |
| `/post`, `/state`, and `/go` | ✅ | Verified `set`, `set_current`, reads, baseline retention, and `/go` diff shape. Reset restores the baseline as implemented by the shared API. |
| Session isolation and routing | ✅ | Verified SID preservation, direct routes and reloads, and isolation between SIDs. An idle same-SID tab made zero writes. |
| Injected state | ✅ | Verified empty arrays, partial single records, and 300-entry collections. An edit preserved unfamiliar injected fields. |
| Upload and file serving | ⚠️ | Verified restrictions, successful upload, metadata after upload, and exact served bytes. See AUDIT-002 for save-as naming. |
| Production build and assets | ✅ | `npm run build` passed. Source uses original local SVGs and fixtures plus system fonts. The Playwright suite observed only localhost requests. |
| `SCHEMA.md` accuracy | ✅ | Documented all nine top-level fields and checked the action mapping against the store and UI. |

## SCHEMA.md Updates

Added endpoint usage, reset behavior, seed ID patterns, and a minimal injection example. Clarified that state API responses expose top-level project fields and the browser storage keys carry the application namespace. Retained the exact activity and record field mappings.

## Verification

Reviewed the application shell, Tables, Authentication, Storage, Policies, shared UI and store, and checked the stylesheet against `DESIGN.md`. The existing Playwright suite passed on port 5486. Additional checks used separate synthetic SIDs on that port. [TEST.md](TEST.md) records workflow evidence and the two edge cases. Docker certification is assigned to the parent runner.
