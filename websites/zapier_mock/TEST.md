# Zapier Mock — Test Report

> Round 2 · 2026-11-18  
> Server · http://localhost:5506  
> Windows PowerShell · Node Playwright from `PILOT_PLAYWRIGHT` · Chromium

## Summary

WORKFLOWS: PASS

All eight Chromium suites passed on the existing localhost listener, including a new check of secondary controls. `npm run build` passed and the client state manager still matched the Harbor template byte for byte. Round 1 also verified the built bundle under Vite preview.

| Metric | Count |
| --- | ---: |
| Application routes tested, including the root redirect | 6 |
| Chromium suites passed | 8 |
| Chromium suites failed | 0 |
| Open P0 or P1 bugs | 0 |
| Open P2 bugs | 2 |

## Passing Tests

| Route or workflow | Browser coverage | Verified fields in `/go.current_state` |
| --- | --- | --- |
| Workspace and routing | Opened the root, followed each navigation destination and deep link with its session ID, and returned from missing-record views. Checked signed-in workspace and user labels. | One baseline `set` per fresh browser session ID. Navigation left business records unchanged. |
| Zap inventory | Combined case-insensitive app search, folder and status filters, and A–Z sorting. Moved to page two, cleared filters, and opened a row. | Search, filter, sort, pagination, and open actions left `zaps`, `runs`, and `connections` unchanged. |
| Zap inventory actions | Duplicated a mapped Zap, renamed the copy, moved it to Project Delivery, and confirmed deletion. | Duplicate appended a draft with new Zap and step IDs, remapped `draftSteps[].fields.message.stepId`, cleared the tests and publication fields, and copied the ordered configuration. Rename wrote `zaps[].name` and edit metadata. Move wrote `folderId` and edit metadata. Delete removed only the copy and preserved `runs`. |
| Create and configure | Created a draft, configured a Sheets trigger and Slack action, entered literals, and mapped the trigger email. Checked dependency validation when removing an action referenced by a later step. Left an unsaved editor and verified that the edits were discarded. | Create appended `zaps[]` with `status='draft'`, `enabled=false`, `version=0`, one blank trigger in `draftSteps`, and creation/edit metadata. Saved draft edits updated `name`, ordered `draftSteps`, `updatedAt`, and `updatedBy`. Unsaved edits wrote nothing. |
| Test, publish, and toggle | Tested both steps, verified the resolved email input, checked an invalid publish, published the draft, and toggled it off and on after reloading the editor. Saved a new draft field after publication. | Test wrote each selected step's `lastTest` payload and saved `draftSteps`. Publish wrote `publishedSteps`, `version=1`, `publishedAt`, `enabled=true`, and `status='on'` with the current draft and edit metadata. A later draft save left `publishedSteps` unchanged and cleared the affected draft test. Toggles wrote `enabled`, `status`, `updatedAt`, and `updatedBy`. Tests and publication left `runs` unchanged. |
| History and usage | Searched by run ID and combined errored, Zap, and UTC date filters. Opened the failing Slack step. Checked daily and per-Zap usage for replayed and deleted-Zap history. | Filtering, step inspection, and usage wrote nothing. The chart and tables totaled `runs[].taskCount`. |
| Repair and replay | Opened `run_lead_error`, followed the repair link to the Slack-filtered connection list, tested and reconnected Sales alerts Slack, confirmed replay, and reloaded the new run. Verified the source link and the added task in usage. | Test wrote `connections[].lastTestedAt`, `lastTestResult='expired'`, and edit metadata. Reconnect wrote `status='active'`, `lastReconnectedAt`, and edit metadata on `con_sales_slack`. Replay appended a successful run with a fresh ID, `replayOfRunId='run_lead_error'`, `source='replay'`, `taskCount=1`, `zapVersion=1`, actor/time, copied `triggerInput`, and new `stepResults` with the mapped email. The source run stayed intact. |
| Add and rename connection | Filtered by account, app, and status, viewed linked Zaps, added a synthetic Slack account, renamed it, and found it in the matching step picker. | Add appended `connections[]` with the selected `appId`, synthetic `accountLabel`, `name`, `ownerId`, `status='active'`, and creation/edit metadata. Rename wrote `name`, `updatedAt`, and `updatedBy`. Dependency inspection and search wrote nothing. |
| Delete connection | Confirmed linked Zap names in the dialog, deleted a connected Slack account, and checked the removed connection prompt in the corresponding editor. | One save removed the connection and wrote `enabled=false`, `status='off'`, `updatedAt`, and `updatedBy` to the affected Zap. Both step arrays retained the removed ID. All historical run snapshots stayed unchanged. |
| Apps and bulk replay | Opened Slack from its Apps group. Exercised successful replay, an all-skipped selection, and a mixed selection with two eligible originals and one expired-connection original. | Apps view wrote nothing. Mixed bulk replay appended two linked `runs[]` records in exactly one `set_current` request and reported the skipped original. All-skipped selection wrote nothing. |
| Injected worlds and isolation | Loaded empty arrays, partial records with missing references and evaluator-owned keys, and 350 entries in each main array. Verified default seed counts, pagination, and separate session IDs. | Arrays replaced defaults. Saving a partial Zap preserved its injected custom field, unresolved folder reference, and extra root data. Another session kept its own modified Zap array. |
| Reload, idle, and offline layout | Hard reloaded the editor and replay deep links. Left a second tab open in the same session for 4.2 seconds after a mutation. Verified stable `/go`, no idle posts, no attempted non-local requests, and mobile table containment at 390 pixels. Inspected desktop and mobile screens. | Hard reload and idle left the saved `/go` response unchanged. Only the initial baseline and expected user mutation were posted in the idle test. |
| Secondary controls | Checked button hover, search clearing, previous-page navigation, Escape on row menus and dialogs, focus restoration, blank rename and connection validation, invalid date validation, bulk selection clearing, dependency links, Open Zap, brand navigation, and notification dismissal. | These controls left `/go` unchanged. The separate inventory activation check changed only `zaps` in `state_diff`, setting the selected Zap's `enabled=false` and `status='off'` with edit metadata while retaining `publishedSteps`. |

## Bugs for Dev Agent

No open P0 or P1 issues. The audit fixes and their source locations are recorded in [AUDIT.md](AUDIT.md).

### BUG-001 · P2 · Connection search placeholder is clipped

| Field | Value |
| --- | --- |
| Route | `/connections` |
| Element | Search connections |
| Action | Open the Connections tab at 1366 × 900 |
| Expected | The placeholder shows all three searchable fields |
| Actual | The field clips the last words of “Search by connection, account, or app.” All three search modes work. |
| Console errors | None |
| Fix hint | Shorten the placeholder to fit the search field. |

### BUG-002 · P2 · Run repair notice repeats its destination

| Field | Value |
| --- | --- |
| Route | `/history/runs/run_lead_error` |
| Element | Expired connection notice |
| Action | Open the original errored lead run in a fresh session |
| Expected | The notice names the connection and links to App connections once |
| Actual | It displays “Reconnect Sales alerts Slack in App connections. App connections.” The link opens the correct filtered list. |
| Console errors | None |
| Fix hint | Use the existing link as the destination text in the notice. |

## Visual Alignment Feedback

Reviewed the original design in [DESIGN.md](DESIGN.md) against localhost captures of the Zap inventory and editor, run list and detail, task usage, connections, and app groups. The desktop views use consistent navigation, status treatments, and spacing. At 390 px the navigation fits and the tables scroll inside their frames. No P0 or P1 layout issues surfaced.

## Audit verification

After the fixes, the seven Chromium suites passed on port 5506 and `npm run build` passed again.

| Check | Result |
| --- | --- |
| Partial workflow records | The editor selected independently injected actions without IDs and displayed a field with no label by using its key. Opening and selecting a step left the stored IDs unchanged. Save assigned distinct IDs in `zaps[].draftSteps[].id` and wrote edit metadata. Duplication also generated unique step IDs and remapped the existing `fields.message.stepId` reference. |
| Mobile row menu and task usage | At 390 px, the menu stayed within the viewport and aligned with its row action button. The 350-day usage chart fit the page and left run records unchanged. |
| Harbor state API | A later `set` and a `set_current` left `initial_state` intact. Reset restored the original current state and cleared `state_diff`. |
| Built bundle | Chromium loaded HTML and assets from `dist/` with the state API on localhost. A connections deep link rendered, navigation preserved the session, and creating a Zap wrote `zaps[]` through `set_current`. The editor rendered after hard reload. |

## Round History

### Round 1 → Round 2

- Re-ran all seven existing suites and added the secondary-controls pass.
- Confirmed the four audit regressions stayed fixed and recorded two cosmetic findings.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `186544`. The local evidence is `factory/build/dyn_certify/186544/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
