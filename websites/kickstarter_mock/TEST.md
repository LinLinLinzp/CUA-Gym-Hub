# Kickstarter Mock — Test Report

> Round: 1  
> Date: 2026-11-18  
> Server: http://localhost:5366  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 19 baseline URLs, covering all 12 application route patterns and recovery views |
| Elements tested | 28 grouped functional cases, plus build, session and layout checks |
| ✅ Passed | 28 functional cases |
| ❌ Failed | 0 functional cases |
| ⚠️ Skipped (out of scope) | 0 planned cases |

`npm run build` passed. Installed Node Playwright from `PILOT_PLAYWRIGHT` drove Chromium against Vite dev and the built Vite preview on port 5366. The workflow suite passed in both modes. Preview also passed a separate deep-link, local artwork, draft persistence and reload smoke test.

---

## ✅ Passing Tests

- **`/` and project navigation** — The catalog displayed 28 seeded projects for Maya Chen. Title and category search ignored case, status and sorting changed the results, and clearing filters restored the catalog. Cards, project tabs, breadcrumbs, the brand link and missing-record recovery links navigated. The primary CTA and project card showed hover feedback. Direct visits and hard reloads rendered the editors and detail views. Router navigation kept `?sid=`.
- **Campaign** — Created and edited a draft with local cover art, validated its title and amount, previewed unsaved changes, and returned to the editor with those changes intact. Launch was disabled without an active tier. Adding a tier enabled launch. Escape dismissed the confirmation and returned focus to the launch button. Confirming launch changed the same project to Live and disabled editing of the goal, currency and deadline.
- **Rewards** — Created a shipping tier with an item, a quantity limit and a zero-cost shipping destination. Added and removed item and destination rows, and checked validation for a missing title, missing destination and invalid quantity. Also created a digital add-on, edited its pledge amount and delivery method, and archived it. Search and type and availability filters worked. Archived and claimed rewards were read-only. The campaign preview showed the active tier and excluded the archived add-on.
- **Backer surveys** — Created a new draft for the funded Night Bus project using an isolated seed injection with its existing draft removed. Exercised the shipping and required checkboxes, short-text and single-choice questions, adding and removing questions and choices, moving questions in both directions and the recipient preview. Saving a reorder preserved the question IDs. Confirmed send snapshotted five paid backers with project rewards and preserved `surveyResponses[]`. Send was disabled for a live project and for an injected draft where a survey was already sent. On the seeded Common Thread survey, reward and response filters and answered and pending details opened correctly.
- **Updates** — Validated a missing title and publish body. Filtered the update list, previewed an unsaved backers-only draft, saved and edited it, and published it by confirming. Published a Public update directly from the new-update form. The campaign preview displayed the Public update, and the published backers-only update was available in the creator workspace as a read-only detail. Draft projects could compose updates with publication disabled.
- **Harbor behavior** — Compared `current_state` and `state_diff` at `/go?sid=…` before and after every write. Each of the 14 business actions sent one SID-scoped `set_current` request and preserved other records and collections. Browsing, filters, unsaved previews, validation failures, cancelled confirmations, reload and idle time with a second tab open produced zero business writes. `/post` set and reset verified session isolation. Empty, single-record and 250-project injections loaded, and records with missing optional fields or related IDs rendered fallbacks. Chromium reported zero page or console errors, failed HTTP responses or off-origin HTTP requests during the passing suites.

### Observed `/go` state changes

Insert rows list every field added to the new record. Existing record rows list the fields whose values changed in the test. Edits and transitions also wrote `updatedBy`, which remained `creator-maya`. `createdAt` and `updatedAt` passed ISO timestamp checks.

| Seed workflow | UI action | Collection | Fields added or changed |
|---------------|-----------|------------|-------------------------|
| Campaign | Save new draft | `projects[]` | `id`, `title`, `blurb`, `category`, `location`, `fundingGoal`, `currency`, `deadline`, `story`, `risks`, `coverKey`, `status`, `pledgedAmount`, `backerCount`, `launchedAt`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt` |
| Campaign | Edit a draft | `projects[]` | `fundingGoal`, `story`, `updatedAt` |
| Campaign | Confirm launch | `projects[]` | `status` (`live`), `launchedAt`, `updatedAt` |
| Rewards | Save a tier and save an add-on, two writes | `rewards[]` | `id`, `projectId`, `type`, `title`, `description`, `minimumPledge`, `estimatedDelivery`, `items`, `quantityLimit`, `deliveryMethod`, `shipping`, `status`, `claimedQuantity`, `archivedAt`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt` |
| Rewards | Edit the add-on | `rewards[]` | `minimumPledge`, `deliveryMethod`, `updatedAt` |
| Rewards | Confirm archive | `rewards[]` | `status` (`archived`), `archivedAt`, `updatedAt` |
| Backer surveys | Save new survey | `surveys[]` | `id`, `projectId`, `title`, `intro`, `collectShippingAddress`, `questions`, `status`, `sentAt`, `sentBy`, `recipientBackerIds`, `recipientCount`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`. Each question contained `id`, `label`, `type`, `required`, `options`. |
| Backer surveys | Save draft edits | `surveys[]` | `intro`, `collectShippingAddress`, `questions` (order), `updatedAt` |
| Backer surveys | Confirm send | `surveys[]` | `status` (`sent`), `sentAt`, `sentBy`, `recipientBackerIds`, `recipientCount`, `updatedAt` |
| Updates | Save a backers-only draft | `updates[]` | `id`, `projectId`, `title`, `body`, `audience`, `status`, `publishedAt`, `publishedBy`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt` |
| Updates | Edit the draft | `updates[]` | `body`, `updatedAt` |
| Updates | Confirm publication of the backers-only draft | `updates[]` | `status` (`published`), `publishedAt`, `publishedBy`, `updatedAt` |
| Updates | Confirm direct Public publication | `updates[]` | `id`, `projectId`, `title`, `body`, `audience`, `status`, `publishedAt`, `publishedBy`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt` |

---

## ❌ Bugs for Dev Agent

No P0 or P1 workflow or Harbor state bugs were observed.

## Visual Alignment Feedback

Reviewed local captures of the catalog, campaign preview, survey responses, rewards, updates and mobile campaign editor against the original design in `DESIGN.md`. At 390 px the tested pages stayed within the viewport, and the horizontal project navigation was operable.

### VISUAL-001 · P2 · Mobile deep links can hide the selected tab

| Field | Value |
|-------|-------|
| View | `/projects/project-floodlights/updates` at 390 px |
| Reference | `DESIGN.md`, project navigation |
| Mock | `.mock-states/qa-kick-updates.png` (gitignored local capture) |
| Issue | On direct entry, the scrollable navigation starts at Overview. The selected Updates tab and its underline are offscreen until the navigation is scrolled. The Updates heading and controls are visible and work. |
| Suggestion | Bring the active tab into the visible part of the navigation on entry when needed. |

---

## Round History

### Round 1

- All four seed workflows passed in dev and built preview. One P2 mobile navigation issue remains. The parent runner handles Docker dynamic certification and commits.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `141232`. The local evidence is `factory/build/dyn_certify/141232/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `projects → 0 → title`.
