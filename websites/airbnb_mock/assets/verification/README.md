# Development verification

The app was implemented from the provided brief, data model, design tokens and local reference screenshots. No AUDIT.md or TEST.md existed. This directory records dev checks; it does not replace the independent playwright agent’s TEST.md.

- `npm run build`: passes, with the runtime bundle approximately 395 KB before gzip. All fonts and listing images are local.
- `npm run verify` (with the app’s state API already listening on port 5300): verifies seed relations, card validation, prices/refund tiers, destination search, booking and cancellation, requests and withdrawal, wishlist records, message operations, review lifecycle, server `/go` diffs and session isolation. It also renders 24 routes under default, empty-array, 300-listing and minimal single-record worlds (96 combinations).
- The verification runner’s full idle check passed with zero additional state posts over 71 seconds. `SKIP_IDLE=1 npm run verify` was used for subsequent targeted checks after changes to validation and rendering.
- Production preview was checked on port 5300: root and deep-link HTML, `/post`, `/state`, `/go`, baseline preservation, per-session isolation, multipart `/upload`, and byte-identical `/files` download.
- The copied data manager is byte-identical to `templates/dataManager.js`. Vite uses the provided state API plugin for dev and preview.
- The unmodified Harbor `factory/hub_tools/dyn_certify.py` harness passes render/sync/idle certification against the built `dist/`. Staging and certification output were placed under a temporary factory root so shared repository paths were not changed. Docker build cache metadata used `BUILDX_CONFIG=/tmp/airbnb-buildx` to stay within writable paths.
- The browser access host was unavailable, so no manual interactive browser review was performed. The Harbor-generated home screenshot was visually inspected. Independent browser workflow coverage and TEST.md remain for the playwright agent.

`harbor-certification.json` and `home.png` contain the certification output. `state-and-render-checks.txt` contains the latest code-level workflow and rendering results.

The catalog’s prescribed deterministic `3 + (i % 6)` review rule yields 312 generated listing reviews, plus 5 Emily reviews and 5 host-to-Emily reviews (322 total). The approximate review counts in the original brief do not match that formula.

## Review-fix verification (2026-11-18)

AUDIT-001 through AUDIT-004, BUG-001 through BUG-008 and VISUAL-001 have code fixes recorded in TODO.md. AUDIT.md and TEST.md remain unchanged for independent re-review.

- `npm run build`: passes.
- `npm run verify`: passes all workflow state checks, 96 route renders and the full 71-second idle check.
- New React renderer regressions cover sending, switching threads and navigating away with Promise-returning `scrollIntoView`; carousel overflow, resize, scroll boundaries and content replacement.
- Seed checks confirm all five cancellation policies, 75 messages, unchanged unread counts and no host-block overlap with active seeded reservations. A targeted check also verified the limited policy's full/partial/no-refund tiers and editing res_002's existing dates.
- Harbor certification rerun against the current built dist: render=true, sync=true (one baseline post), idle=true (zero idle posts), no page errors. The harness was copied unchanged to a temporary factory staging directory; the shared factory tree was not modified.
- `harbor-certification.json` and `home.png` were refreshed. The home capture shows disabled arrows on rows without overflow.
- Independent browser workflow and visual re-testing of these fixes remains for the playwright agent.

## Round 2 review-fix verification (2026-11-18)

The latest AUDIT.md and TEST.md report no open P0/P1 issues. The five remaining P2 findings (AUDIT-005, BUG-009, BUG-010, VISUAL-003 and VISUAL-004) are now fixed and checked off in TODO.md. Both reports remain unchanged for independent re-review.

- Each code change passes `npm run build`.
- Targeted React renderer checks confirm that past trips display a published 3-star review as `Reviewed ★3`, and hide the badge after removal.
- All six default home carousels have ten unique listings: destination homes first, followed by similar homes ranked by country, property type and price. Every Paris-row card passes the next-month availability check. Card counts per viewport continue to follow DESIGN.md.
- The price histogram starts with 40 grey bars, darkens the selected bins after narrowing the range, and returns to grey after Clear all.
- A fresh seed contains `Request sent · Kai has 24 hours to respond` in conv_005 and retains all 75 messages. Existing session snapshots retain their injected/persisted data; use a fresh sid when re-testing the seed copy.
- `npm run verify` passes against the state API on port 5300: all workflow persistence checks, message/carousel regressions, 96 route renders across four worlds and zero additional state posts over 71 idle seconds. See `round2-state-and-render-checks.txt`. Independent browser visual re-testing and Harbor recertification of this round remain for the testing agent.

## Round 3 review-fix verification (2026-11-18)

AUDIT.md has no open findings, and TEST.md has no open P0/P1 findings. BUG-011 is fixed and checked off in TODO.md. Both reports remain unchanged for independent re-review.

- Home rows now contain only listings from their named destination, up to ten. The Paris row retains its next-month availability check. The prescribed seed and state schema are unchanged.
- Targeted rendering checks passed for all six rows with the default seed, no Asheville homes, all Paris homes blocked for the next-month window, and no listings. Empty local rows do not borrow homes from other destinations. Links retain `sid`.
- Carousel arrows retain their existing overflow, resize and boundary behavior. Rows with too few local homes have disabled arrows at wide viewports and scroll when they overflow narrower viewports.
- `npm run verify` passed on port 5300: workflow state checks, message/carousel regressions, 96 route renders and zero extra posts over 71 idle seconds. See `round3-state-and-render-checks.txt`.
- The unchanged Harbor certification harness passed against this session's rebuilt `dist/` staged in a temporary factory tree: render=true, sync=true (one baseline post), idle=true (zero idle posts), no page errors. `harbor-certification.json` and `home.png` are refreshed; the screenshot was visually inspected. The shared factory dist was not modified.
- Independent browser workflow re-testing of BUG-011 remains for the playwright agent.

## Round 4 dev verification (2026-11-18)

AUDIT.md Round 4 reports no open findings. TEST.md Round 4 independently confirms BUG-011 and all six SEED workflows pass, with no open P0/P1 or functional P2 bugs. No application code changes were needed in this pass.

- `npm run verify` passed workflow state checks, message/carousel regressions, 96 route renders across four data worlds, and zero additional state posts over 71 seconds. See `round4-state-and-render-checks.txt`.
- `npm run build` passed and refreshed the app-local `dist/` (`index-BG-6f_Rb.js`). The copied data manager still matches `templates/dataManager.js` byte for byte.
- Optional VISUAL-005 is retained under the TODO requirement to preserve the seed. The separate factory dist was not changed; TEST.md documents its packaging rebuild requirement.

## Round 5 review-fix verification (2026-11-18)

- The current reports contain no open P0/P1 findings. AUDIT-006 is addressed by naming the existing suggestion-tile and pending-status colours in DESIGN.md.
- VISUAL-006 uses the report's current-page-pin approach: search map pins follow the paginated cards, while projection and map-bound filtering retain all matching listings. Other map consumers retain their full listing sets.
- Targeted React rendering checks passed: pages 1, 2 and 4 render 18, 18 and 6 pins matching the cards; a page change hides the old mini preview; empty results render no pins; map-bound filtering retains all 60 matching homes; `sid` survives pagination; no business actions run.
- `npm run verify` passes all workflow state checks, message/carousel regressions, 96 route renders and zero additional state posts over 71 idle seconds on port 5300. See `round5-state-and-render-checks.txt`.
- `npm run build` passes. The data manager remains byte-identical to the template. AUDIT.md and TEST.md remain unchanged for independent browser re-review. The separate factory dist was not changed and will need repackaging for this source update.
- Optional VISUAL-005 remains accepted, preserving the prescribed seed and destination-only home rows.
