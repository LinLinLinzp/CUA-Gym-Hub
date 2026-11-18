# Google Search Console Mock — Audit Report

> Round 1  
> 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Incomplete workflow paths | 2 |
| **Total** | **3** |

`npm run build` and all five existing Chromium workflow groups passed on `http://localhost:5471`. They covered properties, URL inspection, sitemaps, direct routes and reloads, injected empty, sparse and large worlds, isolated sessions, and idle traffic. The audit reproduced three gaps that those checks did not cover. Docker certification belongs to the parent runner.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · A stale tab silently overwrites another tab’s saved action · Resolved on 2026-11-18

- **File** `src/App.jsx:73`, `src/App.jsx:92`
- **Feature** State persistence for user actions in two tabs sharing a `sid`.
- **Issue** Each tab commits against its own `fresh.current` snapshot. In Chromium, open Properties and Sitemaps in two tabs in one browser context with the same `sid`. Inspect a URL in the first tab and verify the saved record through `/go`. Submit a sitemap in the already-open second tab. `/go` shows the sitemap and loses the confirmed inspection record. The initial baseline is preserved. The same overwrite can affect other record collections.
- **Fix** Apply each user-driven mutation against the latest session state and coordinate writes from same-session tabs. Keep the shared templates unchanged, retain full structured state, and avoid background posts. Cover sequential actions from two already-loaded tabs and verify both records through `/go`.

## P1 — Incomplete Features

### AUDIT-002 · Pending property details and removal are unreachable from the property list

- **File** `src/pages/Properties.jsx:32`
- **Element** The pending `atlas-outfitters.example` row.
- **Issue** The property name and the Verify action both open verification. The verification sheet has no route to property details or removal. Direct navigation to `/properties/prop_atlas` shows the working Remove property button, but the list provides no way to reach it.
- **Fix** Link pending names to the existing detail page and keep the separate Verify action. Verify that a pending property can be reached and removed from the list without activating it.

### AUDIT-003 · Submitting a sitemap while a filter is active can hide the saved row

- **File** `src/pages/Sitemaps.jsx:43`
- **Element** Submit on the sitemap report, including the Success drilldown from Overview.
- **Issue** Submission enters Pending and resets sort and pagination. The active status and search filters continue to apply. With the Success filter selected, Chromium showed the success notification and `/go` showed the new Pending record, but the report gave no path directly to that record.
- **Fix** Provide a direct detail link in the confirmation, or make the new row visible by updating the active filters. Verify the outcome with a nonmatching status and search filter.

## P2 — Minor Issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matches the shared template. |
| App state sync | Fail | Standard single-tab actions persist structured records. Same-session stale tabs can overwrite confirmed writes. See AUDIT-001. |
| `vite.config.js` `/post` | Pass | Shared template wired for dev and preview. Local `set`, `set_current` and `reset` checks passed. |
| `vite.config.js` `/go` and `/state` | Pass | API checks confirmed the baseline, current state and top-level diff. |
| Session isolation (`?sid=`) | Pass | Separate `sid` values stayed isolated and route links preserved `sid`. |
| `.initial.json` handling | Pass | Updating an established session preserved the baseline. The shared template resets current state to that baseline. |
| Injected worlds and idle writes | Pass | Empty, sparse and large injected worlds rendered. The suite observed zero post-baseline writes during its idle check. |
| Offline assets and design | Pass | CSS and inline icons are shipped locally. Chromium observed zero external requests. Spot checks matched the documented palette, typography, layout and elevation. |
| `SCHEMA.md` | Pass | Keys, record fields, seed counts and the injection example were checked against the source and local API. |

## SCHEMA.md Updates

Added endpoint, injection and reset instructions, a minimal verified-property example and the lifecycle event counts. Clarified the status recorded by `added` and `restored` events on immediate verification.

## Reproduction scripts

The targeted Chromium and API checks are in the ignored `.scratch/audit.cjs` and `.scratch/audit-api.cjs` files. Run them from this app directory against port 5471. The existing workflow suite is `.scratch/verify.cjs`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A sitemap submission from an already open tab preserved the other tab’s URL inspection in Harbor. Property, indexing and sitemap acceptance checks also passed.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
