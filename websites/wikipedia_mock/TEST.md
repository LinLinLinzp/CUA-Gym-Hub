# Wikipedia Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5367  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested | 10 |
| Element groups tested | 10 |
| ✅ Passed | 10 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |
| Accepted UI mutations verified in the seeded workflow run | 10 |
| Browser errors and external requests | 0 |

The production build passed. Both suites used the installed Node Playwright from `PILOT_PLAYWRIGHT` with Chromium. Each accepted action produced exactly one successful `set_current` request. Immediately after each action, the suite read the same session through `GET /go?sid=…`, matched the expected records against `current_state` and `state_diff`, and confirmed that other records and `initial_state` were preserved.

## ✅ Passing Tests

- **Workspace and shell** — Verified the text wordmark, keyboard skip link and focus, account navigation, global search, home entry points, index and activity links, and primary-link hover feedback.
- **Catalog** — Mixed-case search found both Cedar Bay articles. Searching for absent text showed the empty state. Topic selection, descending title order, clearing filters, and opening a result worked.
- **Article** — The breadcrumb, tabs, contents fragments, and section edit link worked and retained the session. Watch feedback and pressed state followed the shared membership into Talk.
- **Editor** — Rejected blank and unchanged content. Preview displayed literal markup, changes showed a diff, and cancel discarded the draft. Full and section publishing returned to the article with updated content. The section edit preserved text outside the selected section.
- **History** — Opened a snapshot and its parent diff, returned to history, and compared two snapshots in chronological order. An injected fixture with different timestamp offsets also sorted by actual time.
- **Talk topics** — Rejected missing subject or message and retained the valid subject after message validation. Cancel cleared the draft. A published topic opened its signed thread and appeared in the topics list.
- **Talk thread** — Cancel cleared the draft and whitespace replies were rejected. A posted reply was linked to the selected parent and survived reload. The link back to all topics worked.
- **Watchlist activity** — Page-title search and edit/comment filters worked. Rows opened revision snapshots or anchored talk comments. Removed pages disappeared from activity. The injected timestamp fixture grouped both entries under the correct UTC day.
- **Watched pages** — Included a watched page with no activity. Row links opened articles. Search cleared selection, Cancel kept memberships and restored focus, and confirmation removed exactly the two selected pages.
- **Harbor and route fallbacks** — All nine app routes and the catch-all loaded at 360 px without horizontal page overflow. Missing articles, sections, topics, and revisions provided working return links. Seeded, empty, single-article, and 420-article sessions stayed isolated. Reset restored the baseline and cleared the diff. The copied state manager matched the shared template SHA-256.

### SEED workflow state changes observed in /go

| SEED workflow | UI action | Verified field changes |
|---|---|---|
| Edit articles | Publish a full edit with Minor edit selected and Watch this page cleared | Updated `articles[].body`, `.currentRevisionId`, and `.updatedAt`. Appended `revisions[]` with `id`, `articleId`, `parentRevisionId`, `actorId`, `createdAt`, `status`, `body`, `summary`, `minor`, `section` (null), and `byteDelta` (UTF-8). Removed the prior `watchlist[]` membership and appended a linked `watchlistEvents[]` unwatch event with the same timestamp as the revision. |
| Edit articles | Publish a section edit | Updated `articles[].body`, `.currentRevisionId`, and `.updatedAt`. Appended the same revision fields with `section` set to `Procession` and `parentRevisionId` set to the full-edit revision. The watch arrays stayed unchanged. |
| Talk pages | Publish a topic | Appended `talkTopics[]` with `id`, `articleId`, `subject`, `actorId`, `createdAt`, `updatedAt`, and `status`. Appended `talkComments[]` with `id`, `topicId`, `articleId`, `parentCommentId` (null), `actorId`, `body`, `createdAt`, and `status`. |
| Talk pages | Post a reply to the opening comment | Appended a `talkComments[]` record with the same fields and the opening comment's ID as `parentCommentId`. Updated the linked `talkTopics[].updatedAt` to the reply's `createdAt`. |
| Watchlist | Watch from the article, watch from Talk, and rewatch | Each action appended one `watchlist[]` membership with `id`, `articleId`, `actorId`, `createdAt`, and `status` (`active`). Each appended one `watchlistEvents[]` record with `id`, `watchId`, `articleId`, `actorId`, `createdAt`, `action` (`watch`), and `status` (`completed`). Rewatch used a new membership ID. |
| Watchlist | Unwatch from the article and from Talk | Each action removed the existing `watchlist[]` membership and appended a `watchlistEvents[]` record with the same event fields, `action` set to `unwatch`, and `watchId` retaining the removed membership ID. |
| Watchlist | Confirm removal of two selected pages | Removed the two matching `watchlist[]` memberships and appended two `watchlistEvents[]` unwatch records with the removed membership IDs. Both removals used one save and one timestamp. |

Search, filters, preview, diff, history comparison, validation failures, cancellations, reloads, and a 2.5-second idle period produced no additional writes.

## ❌ Bugs for Dev Agent

No open bugs found in this round.

## Visual Alignment Feedback

Reviewed the 1440 px workspace and all nine main routes at 360 px against the local design brief. The desktop rail, text wordmark, paper panels, and original local CSS illustration rendered as designed. Mobile navigation wrapped into the compact header and the article index stacked above the prose. No visual issue was observed in the reviewed views.

## Round History

- Round 1 verified core workflows and injected-state behavior. Its audit found and fixed UTC grouping and chronology for injected timestamps.
- Round 2 independently reran those checks and verified the exact field-level changes for all ten accepted mutations.
-

TEST COMPLETE: wikipedia_mock — PASS ✅

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `181668`. The local evidence is `factory/build/dyn_certify/181668/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `contributors → 0 → username`.
