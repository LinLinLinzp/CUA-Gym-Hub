# Patreon Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent
> Round 2 retest: all three findings resolved. See [TEST.md](TEST.md).

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches remaining | 0 |
| Workflow edge cases | 2 |
| Design alignment | 1 |
| Total | 3 |

## P0 — Dead/Broken Code

No findings. The Posts, Tiers, Members and Messages controls are wired through their normal entry points. The standard workflow suite passed against the dev server and built bundle. Each run observed exactly one `set_current` per accepted action across 21 actions.

## P1 — Incomplete Features

### AUDIT-001 · Equal-timestamp replies display out of order

- **File** — `src/pages/Messages.jsx:7` and `src/pages/Messages.jsx:97`.
- **Element** — Conversation transcript and latest-message snippet.
- **Issue** — The transcript breaks timestamp ties by random message ID, and the inbox uses the last item from that same ordering. With a frozen clock and two replies whose UUIDs sort in reverse send order, `/go` showed both replies appended correctly with the same `createdAt`. The transcript displayed the second reply first and the inbox snippet showed the first reply.
- **Fix** — Use stable state-array order for messages with equal timestamps. Cover two consecutive replies with the Harbor clock frozen and verify that the latest reply appears at the end of the transcript and in the inbox snippet after reload.

### AUDIT-002 · Member date filters disagree with the displayed join date

- **File** — `src/pages/Members.jsx:11`, `src/pages/Members.jsx:46` and `src/pages/Members.jsx:106`.
- **Element** — Joined from, Joined to, Joined column and CSV join date.
- **Issue** — Filters and CSV derive a UTC calendar date. The directory and member detail render in the browser time zone. Under `America/Los_Angeles`, a member with `joinedAt: '2026-05-04T00:30:00Z'` displayed May 3, 2026. Joined to May 3 excluded the row, and Joined to May 4 included it.
- **Fix** — Use one calendar-day convention for the member display, filters and export. Exercise both bounds and the CSV with a timestamp near midnight in a non-UTC time zone.

### AUDIT-003 · Compact buttons undershoot the design’s control size

- **File** — `src/styles.css`, selectors `.note footer button` and `.icon-button`.
- **Element** — Edit and Remove for notes, dialog Close and notification Dismiss.
- **Issue** — The styles set minimum heights of 33 px and 32 px respectively. `DESIGN.md` specifies a 40 px minimum for controls. The icon buttons also set a 32 px width.
- **Fix** — Give these controls a minimum 40 px interactive area while preserving their visual alignment. Check the member detail, dialog and notification at narrow widths.

## P2 — Minor Issues

No findings.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| dataManager.js | Pass | Hash matches the shared template. The client reads `sid`, loads injected state and saves full JSON snapshots. |
| Workspace state sync | Pass | One centralized mutation path. Full workflow suite observed one write per accepted action and no state saves for read-only or canceled actions. |
| Vite `/post`, `/state` and `/go` | Pass | Local HTTP checks covered `set`, `set_current`, reset and the exact diff shape. |
| Session isolation and initial snapshot | Pass | Separate session remained isolated. `set_current` preserved an established baseline, and shared-template reset restored it. |
| Injected worlds and idle behavior | Pass | Empty, single and large worlds, missing optional fields and links, direct routes and reloads passed. Idle tabs and elapsed schedules sent no writes. The CSV cleanup timer only releases the download URL. |
| Offline assets and production build | Pass | Local artifacts and system fonts. The workflow suite recorded no external requests. `npm run build` passed. |
| SCHEMA.md accuracy | Pass | Record shapes and action footprints match the implementation. |

## SCHEMA.md Updates

Added endpoint and reset semantics, deterministic seed IDs and a minimal injection example. Kept the observable state changes table aligned with the implementation.

## Handoff

See [TEST.md](TEST.md) for completed workflow coverage and the passing regression checks. Docker dynamic certification and commits belong to the parent runner.

