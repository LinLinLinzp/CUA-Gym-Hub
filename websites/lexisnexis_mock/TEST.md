# LexisNexis Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5418  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested | 10 |
| Browser mutations verified through `/go` | 36 |
| SEED workflows passed | 3 |
| Rechecked audit findings resolved | 3 |
| Failed checks in the final run | 0 |

The final round used installed Playwright Chromium against the Vite dev server on localhost. The production build passed. Round 1 also exercised the primary workflows against built Vite preview. The parent runner handles Docker dynamic certification.

## ✅ Passing Tests

### Research and folders

| Browser exercise | Observed `/go` change |
| --- | --- |
| Search for `delegation clause` on Workspace, apply Cases and Ninth Circuit, open Barton | None. Both filters, the query and the SID survived navigation. |
| Create `QA Arbitration` and child `Record Binder`, then rename the child | Each creation appended a `folders[]` row with the expected `parentId`, trimmed `name`, `status: active`, ID and create metadata. Rename updated the same child’s `name` to `Research Binder`, with update metadata. The duplicate sibling and cancel produced zero writes. |
| Save the search and Barton, then save Barton to a new folder from the picker | Search appended a `folderItems[]` row with `kind: search`, `title: Delegation packet`, `query: delegation clause`, and `filters: {contentType: case, jurisdiction: federal-9th}`. Document appended a row with `kind: document` and `documentId: doc-001`. Inline creation appended the new child folder and linked item in one post. Duplicate save produced zero writes. |
| Rename and annotate the saved search, find it by note, then clear the note | The same item’s `title` changed to `Delegation digest`. `note` changed to `Review appellate waiver language.` and later to `""`. Each save set update metadata. Filtering the folder produced zero writes. |
| Copy the search, move Barton and attempt a duplicate move | Copy appended a new item with a new ID, destination, copied note and create metadata. Move changed the existing document item’s `folderId` and update metadata. The duplicate move produced zero writes. |
| Remove and restore the search, archive and restore the parent | Item `status` changed to `removed` and back to `active`. Folder `status` changed to `archived` and back to `active`. Descendant rows and their item records survived. Canceling removal, reloading and running the saved search produced zero writes. |
| Copy, move and remove selected items | Bulk copy appended one item and reported one duplicate skipped. Bulk move updated two destinations and appended the inline folder in a single post. Bulk removal set both selected items to `removed` in one post. |

### Citations

| Browser exercise | Observed `/go` change |
| --- | --- |
| Lookup `2025 us app lexis 8401`, open Barton’s report, filter decisions and reload | Explicit open appended a `citationActions[]` entry with `type: checked`, `documentId: doc-001`, the entered `query` and create metadata. Lookup, filtering, and reload produced zero additional writes. Document-detail open created a second `checked` action without a query. |
| Copy ALWD with the local link | A single post appended `type: copied`, `format: alwd`, `includeLink: true` and exact `citationText` with the current SID URL. The record matched the preview and Chromium clipboard. The same post set `profile.citationFormat: alwd`. |
| Save that citation to Ninth Circuit Decisions | A single post appended the citation in `folderItems[]` and the `type: saved` action in `citationActions[]`. Both used `folderId: folder-002`, ALWD and the same portable text. `folderItemId` pointed to the saved item. The folder resolved its local link with the active SID. |
| Deny clipboard access, then retry a statute’s header citation | The failed attempt selected the visible text and posted nothing. Retry appended a `copied` action with `format: header`; the ALWD profile preference was preserved. |

### Alerts

| Browser exercise | Observed `/go` change |
| --- | --- |
| Create a weekly alert from filtered research | Appended an active search alert with `source.query: delegation clause`, `source.filters: {contentType: case, jurisdiction: federal-9th}`, `monitor.contentTypes: [case]`, `delivery: {channel: online_and_email, frequency: weekly}` and the entered title, client, description and expiration. A missing title produced zero writes. |
| Edit cadence, scope and delivery, then pause and resume | The same alert retained its original `source`. `delivery.frequency` changed to `monthly` and was removed on switching to `online`. `monitor.contentTypes` expanded to include `statute`. Pause and resume set `status` to `paused` and `active`. Existing record changes wrote update metadata. |
| Create a Shepard’s monitor from the report and a standalone search monitor | Two actions appended separate alerts. The authority monitor stored `source: {documentId: doc-001}`, `monitor.treatments: [criticized]` and `delivery.channel: online`. The standalone search stored its own query and jurisdiction snapshot. |
| Open a seeded result, then mark it read and unread | Opening the linked opinion and returning produced zero writes. Explicit marking changed one `alertResults[]` row. Read set `status: read` and `readAt: updatedAt`. Unread set `status: unread` and `readAt: null`. Both set update actor and timestamp. |
| Cancel then confirm deletion | Cancel produced zero writes. Confirm set the Shepard’s monitor’s `status: deleted` with update metadata. Result counts stayed fixed throughout testing and new alerts displayed the empty results state. |

### Runtime and layout

- Verified one full baseline post for fresh browser sessions and one full `set_current` per successful action. Each intercepted write matched the current server state returned by `/go`. Checked ISO timestamps and `createdBy` or `updatedBy` values on created and mutated records.
- Loaded injected empty arrays, a sparse world with unavailable relationships, and a large world with 300 documents, 250 folders and 250 alerts. Injected profile fields merged, arrays replaced defaults, and an unknown injected key survived writes. A mutation in the large world preserved the other collections.
- Opened and hard-reloaded deep links. Verified an idle tab in the same browser context sent zero posts while a second tab on that SID changed state. A separate SID retained the default world.
- Captured desktop views for all ten route patterns. Each fit a 390px viewport without horizontal overflow. Verified the workspace shortcuts, wordmark, unavailable-page return link, keyboard skip link and primary-button hover. The route and workflow runs observed no page errors or external requests. The route run observed no console errors, and the workflow run observed no failed HTTP responses.
- The workflow runner, audit regression runner, route runner and screenshots are under the gitignored `test-results/` directory.

### Audit regression checks

| Finding | Verified result |
| --- | --- |
| AUDIT-001 | Research offered the injected Nevada jurisdiction, filtered out a Delaware fixture, and retained Nevada after reload. The standalone alert editor offered Nevada too. Creating the alert appended one `alerts[]` record with `source.filters.jurisdiction: nevada`, the entered query, and create metadata. |
| AUDIT-002 | Frequency sorted As available, Daily, Business days, Weekly and Monthly. Equal cadences sorted by title. Online and unspecified schedules appeared last. Sorting left the persisted alerts unchanged. |
| AUDIT-003 | Primary controls had 16px of inline padding and detail panels had a 24px gap. Alert actions wrapped at 320px without horizontal overflow. |

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Checked the original local design against desktop captures of the workspace and citation report and a 320px alert detail capture. The navigation, reading surfaces and action placement remained legible at those sizes.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed and verified with an injected jurisdiction and a browser-created alert.
- AUDIT-002 fixed and verified with every cadence, tied titles and unscheduled delivery fixtures.
- AUDIT-003 fixed and verified with computed spacing and a mobile wrapping check.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `146760`. The local evidence is `factory/build/dyn_certify/146760/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `documents → 0 → title`.
