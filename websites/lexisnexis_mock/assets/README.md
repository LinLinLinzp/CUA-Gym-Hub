# LexisNexis workflow research

A signed-in legal research workspace for an associate organizing active matters, a paralegal collecting authorities for a brief, or a librarian checking later treatment and monitoring new decisions. All account details, opinions and client matters are synthetic. The public help center supplied workflow behavior. The visual design comes from the original workspace specification. [Design](../DESIGN.md)

## Feature inventory and view layout

| Priority | View | Work performed |
| --- | --- | --- |
| P0 | Workspace | Navigation rail, prominent search, recent folder links and unread alert results. Summaries derive from current records. |
| P0 | Research and document | Search toolbar, filter row, result list and document reader. Launch folder saves, citation tools and monitor creation from the relevant view. |
| P1 | Research folders | Folder list and detail with breadcrumbs and screen-level actions. Separate child folders from saved material. Use one folder picker for saving and curation. |
| P1 | Citations | Lookup form and ranked matches lead to a report with overall treatment and filterable citing decisions. Citation preview supports copying and saving into a folder. |
| P1 | Alerts | Searchable and filterable monitor list. Detail separates monitor configuration from dated results. Form sections cover source, monitoring and delivery. |
| P2 | Folder selection | Add row selection and a shared toolbar for bulk curation after P1 passes. |

## Workflow evidence

- Research folders can hold both documents and the search definition used to find them. A saved search can be run again with its saved filters. Folder items support notes, move, copy, removal and recovery. [Saving a search](https://supportcenter.lexisnexis.com/app/answers/answer_view/a_id/1102123/~/how-do-i-save-a-search-to-a-folder-in-lexis%2B%3F-) · [Managing folder items](https://supportcenter.lexisnexis.com/app/answers/answer_view/a_id/1102129/~/how-to-manage-and-organize-items-in-a-folder-on-lexis%2B-)
- Citation tools serve two purposes. Copy Citation formats a reference for reuse. Shepard’s shows subsequent citing treatment and gives a researcher context for assessing an authority. The workspace uses synthetic treatment data and adds explicit copy, check and save records for verification. [Copying citations](https://supportcenter.lexisnexis.com/app/lexisplus/a_id/1100592) · [Shepard’s tools](https://supportcenter.lexisnexis.com/app/answers/answer_view/a_id/1089373/~/shepards-tools-on-lexis%2B)
- Search alerts follow a search and its selected scope. Shepard’s alerts follow the authority’s report. Alert management supports editing delivery preferences, reviewing results, and pausing or deleting monitors. The training workspace uses fixed result fixtures for deterministic practice. [Search alert setup](https://supportcenter.lexisnexis.com/app/answers/answer_view/a_id/1129978/~/how-to-create-search-alerts-on-lexis%2B-) · [Shepard’s alert setup](https://supportcenter.lexisnexis.com/app/answers/answer_view/a_id/1087284/~/how-to-use-shepard%E2%80%99s-alerts-on-lexis%2B-) · [Alert management](https://supportcenter.lexisnexis.com/app/lexisplus/a_id/1090734)

## Data and scope

One document corpus powers search, folders, reports and alert results. Folder items are separate from documents so the same authority can appear in several matters. Citing references connect two document IDs. Each alert owns its monitoring and delivery settings, and result rows carry individual read status. [Data model](data_model.md)

The workspace starts signed in. Identity, billing, live legal content, external sharing and email sending are outside scope. [Implementation priorities](../TODO.md)
