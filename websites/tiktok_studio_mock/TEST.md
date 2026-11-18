# TikTok Studio Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5361  
> Tested by: playwright agent using the installed Node Playwright and Chromium

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns covered, including the fallback | 10 |
| SEED workflows passed | 4 of 4 |
| Accepted actions verified in each full-suite session | 17 |
| Initial baseline writes in each full-suite session | 1 |
| Additional state writes during the idle-tab check | 0 |
| Browser errors or external requests in the full suites | 0 |
| Open test failures | 0 |

Local replay sessions for the full suites were `qa-1795009688883` (Vite) and `qa-1795009690692` (compiled UI). Each used `/go?sid=…` to verify mutations against its initial state.

## Passing Tests

| Workflow | UI coverage | Persisted fields verified with `/go` |
| --- | --- | --- |
| Posts | Searched captions and hashtags, used status and audience filters and sort, opened and reloaded edit, validated missing caption and media, previewed a local sample, published, edited, drilled into analytics, confirmed delete, uploaded a local WebM, scheduled in America/New_York, and canceled the schedule. | `posts[]` gained published and scheduled records with distinct IDs, trimmed `caption`, `media`, `coverUrl`, `visibility`, interaction flags, `status`, `actorId`, timestamps, and zero metrics. Edits preserved media and creation time and wrote `updatedById`. Scheduled time `2099-01-02T18:30` became `2099-01-02T23:30:00.000Z`. Removing posts set `status: 'deleted'` and matching `deletedAt` and `updatedAt`. |
| Drafts | Rejected an empty draft, saved caption-only and media-only drafts, searched and sorted the list, reopened saved fields after reload, edited, discarded, and published or scheduled through the draft composer. | `drafts[]` appended or updated the same draft ID with `caption`, `media`, `status`, `updatedAt`, and `updatedById`. Discard set `status: 'discarded'` and `discardedAt`. Conversion set `status: 'converted'`, `postId`, and `convertedAt` and created a post with the matching `sourceDraftId` in one write. |
| Comments | Searched the inbox and used post, reply status, and sort controls. Rejected a blank reply, posted a trimmed reply, hearted and unhearted, and tested single and bulk delete and their cancel paths. | `comments[]` appended a visible reply with `body`, `parentCommentId`, `postId`, `actorId`, and timestamps. Heart set `likedByCreator`, `likedAt`, and `likedById`. Unheart cleared those fields to `false`, `null`, and `null`. Moderation set `status: 'deleted'` and `deletedAt` and preserved the reply's parent link. Bulk moderation wrote matching timestamps in one update. |
| Analytics | Exercised all four date presets, invalid and valid custom ranges, metric selection, chart data, account snapshot save and reopen, ranked post drill-down, and post CSV export and reopen after reload. | `analyticsReports[]` appended records with `scope`, `postId`, `metric`, `startDate`, `endDate`, `sampleCount`, `totals`, `actorId`, `format`, and `status`. Compared inclusive post totals and download rows with fixture samples. A separately injected snapshot displayed its stored totals independently of current analytics. |

- **Build and serving** `npm run build` passed. The full Chromium suite passed against Vite and against the built HTML and JS/CSS from `dist/` with the same localhost state API. The compiled run used Playwright routing for those files while Vite continued serving local public assets and API endpoints.
- **Deep links and injection** Loaded all routes in empty, missing-ID, or normal sessions as applicable. Reloaded edit, draft, and post analytics routes. Single records with missing optional fields and a dangling post reference rendered. Reached record 250 through pagination in Posts, Drafts, and Comments. A separate session write preserved an extra injected key and left the main session unchanged.
- **API** Checked `/state`, `/post` `set`, `set_current`, and `reset`, and `/go` initial/current/diff with fresh session IDs. Repeat `set` and `set_current` preserved the initial snapshot. Reset restored current state from it.
- **Read-only actions** Navigation, filtering, viewing, failed validation, canceled confirmations, and hard reloads did not write business state. A second idle tab generated no writes over 2.5 seconds. In a separate run with a controlled clock, advancing beyond a scheduled draft post's due time and reloading left its scheduled record and the post count unchanged.
- **Offline and upload** Intercepted external requests in the injected asset test and observed zero attempts. The ambiguous URLs fell back for avatar, cover, and video. A delayed localhost upload verified that sample selection and save were unavailable until the upload completed.
- **Navigation and keyboard** Followed the brand link, all Overview shortcuts, the latest draft and post links, the composer Cancel link, and the missing-page recovery link. Verified `sid` preservation, the Comments Unanswered filter from Overview, Previous and Next pagination, the keyboard skip link, and the chart data disclosure. Escape closed a confirmation and restored focus to its trigger. Removing the cover and video updated the composer preview. The entire check produced zero `set_current` requests and left `/go` current state equal to its baseline.

## Visual Alignment Feedback

Inspected the desktop Overview, Posts, Drafts, Create, Comments, and Analytics against the site's own [design brief](DESIGN.md), including the forest masthead, ivory workspace, serif titles, and bundled editorial covers. Also inspected the 375 px Overview. All six views had no page-level horizontal overflow at 375 px.

## Bugs for Dev Agent

No open findings. The offline media and overlapping upload actions identified in [AUDIT.md](AUDIT.md) passed targeted regression checks.

## Round History

Round 2 reran the source and compiled UI suites and the targeted regressions for offline media, overlapping upload actions, and scheduled draft conversion. It added navigation, keyboard, and visual checks. The parent runner owns Docker dynamic certification.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `87796`. The local evidence is `factory/build/dyn_certify/87796/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `posts → 0 → caption`.
