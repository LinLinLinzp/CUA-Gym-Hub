# Microsoft Excel for the web — research and implementation guide

Research completed 2026-11-18. This is the planning handoff for a tier-A computer-use sandbox at `websites/microsoft_excel_for_the_web_mock`, served on **5305**. The primary plan is [../TODO.md](../TODO.md); fields and seed fixtures are in [data_model.md](data_model.md); visual tokens are in [../DESIGN.md](../DESIGN.md). `SEED.md` and repository-root `HARBOR_CONTRACT.md` override the generic plan-agent brief.

## Product and scope

Excel for the web is a browser workbook editor used to organize records, calculate results and collaborate around spreadsheets. The sandbox starts signed in as Megan Bowen at Contoso, with home/file discovery and a dense workbook editor. This target needs five complete persisted workflows: workbooks, sheets, formulas, filters and sharing. The selected visual target is the supplied classic-ribbon web editor. Do not combine native Mac title bars, desktop backstage screens, legacy Excel Online branding and a contemporary web ribbon into one shell.

Personas: a sales operations manager opens and shares regional reports; an analyst edits assumptions and checks dependent totals; a project coordinator adds sheets, filters rows and reorganizes data; a reviewer views shared workbooks and uses comments if P2 is implemented. They all need predictable cell addresses, realistic file lists, clear permissions and reload persistence.

## Research sources and decisions

Official sources were checked on 2026-11-18; page UIs may span older Office versions. Microsoft Support's Web sections take precedence over desktop instructions. Design dimensions and implementation limits below are explicit sandbox choices rather than claims of current pixel-exact Microsoft UI.

| Source | Narrow finding / how used |
|---|---|
| [Basic tasks in Excel for the web](https://support.microsoft.com/en-au/excel/basic-tasks-in-excel-for-the-web) | Workbook creation, filename rename, browser editing, automatic saving and Undo. Preserve those entry points while replacing the real storage service with Harbor persistence. |
| [Filter data in a range or table](https://support.microsoft.com/en-us/excel/get-started/filter-data-in-a-range-or-table-in-excel) | Web sections distinguish range filter setup from table headers; filters hide matching/nonmatching source rows and compose across columns. Official web menu/dialog crops downloaded below. |
| [Use AutoSum](https://support.microsoft.com/en-us/excel/use-autosum-to-sum-numbers-in-excel) | Web-specific example proposes SUM next to a numeric range and commits on Enter. AutoSum inserts a real formula in the sandbox. |
| [Share your workbook](https://support.microsoft.com/en-us/excel/get-started/share-your-excel-workbook-with-others?wt.mc_id=otc_excel) | Share includes recipients, edit/view permissions and optional message. Sandbox Send records grants without sending emails. |
| [Coauthoring, Web steps](https://support.microsoft.com/en-us/excel/get-started/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring) | Link settings and Copy link complement recipient invitations. Real coauthoring and incoming edits are outside scope. |
| [Share a section of a workbook](https://support.microsoft.com/en-us/excel/share-a-section-of-a-workbook) | Sheet/range links are navigation targets, with scope and view/edit settings; supports supplied Copy link dialog reference. A range link does not hide the rest of the workbook. |
| [Share access / stop sharing](https://support.microsoft.com/en-us/word/share-access-to-a-file-with-no-sign-in-necessary) | Article explicitly covers Excel for the web; Manage access removes links. Plan includes observable revoke operations. |
| [Insert or delete a worksheet](https://support.microsoft.com/en-us/excel/get-started/insert-or-delete-a-worksheet) | Plus, sheet context commands and reorder interaction. Check applicability against the selected web editor. |
| [Rename a worksheet](https://support.microsoft.com/en-gb/excel/rename-a-worksheet) | Validation guidance for sheet names; includes reserved History, character restrictions and length. Case-insensitive duplicate prevention is a sandbox specification. |
| [Keyboard shortcuts](https://support.microsoft.com/en-us/accessibility/excel/keyboard-shortcuts-in-excel) | Web-specific focus/edit/navigation context; browser conflicts mean shortcut handling should stay within app focus. No global browser-key interception promise. |
| [Graph Excel overview](https://learn.microsoft.com/graph/excel-concept-overview) | Workbook contains worksheet/range/table/chart objects. Used as relationship inspiration only; no real Graph API. |
| [Worksheet resource](https://learn.microsoft.com/en-us/graph/api/resources/workbookworksheet?view=graph-rest-1.0) | Stable worksheet identity across rename/move; name, position and visibility guide sandbox sheet fields. |
| [Range resource](https://learn.microsoft.com/en-us/graph/api/resources/workbookrange?view=graph-rest-1.0) | Distinction between formula/value/address/format guides the cell model; sandbox uses sparse cells and its own cache/dependency convention. |

Research searches also covered screenshots, tutorials, data objects and shortcuts. Mixed-product image search results were visually inspected and marked below. There was no authenticated live-product inspection; do not describe this handoff as verified against a signed-in 2026 tenant. Desktop is the acceptance surface. At narrower widths, preserve a scrollable grid, accessible Share and overflow commands; a separate native/mobile recreation is not required.

## Feature inventory

Each inventory row maps to checked-in TODO item IDs. There are 20 P1 functional feature groups, 3 P1 validation groups, 8 P0 foundations and 6 P2 extensions.

| Priority | IDs | Feature / interaction |
|---|---|---|
| P0 | P00–P07 | Scaffold, standard state API, user-only mutation store, injected worlds, routing/shell, accessible grid, deterministic fixtures and SCHEMA |
| P1 | W01 | Recent/Favorites/Shared, search, list sorting, opening, favorites |
| P1 | W02 | Blank/template creation and workbook rename |
| P1 | W03 | Save a Copy with independent IDs/references |
| P1 | W04 | Workbook soft delete and recycle restore |
| P1 | S01 | Sheet add/select/rename, formula reference updates |
| P1 | S02 | Duplicate/reorder/tab color |
| P1 | S03 | Hide/unhide/delete, last visible sheet validation |
| P1 | E01 | Cell/formula-bar editing, selection, keyboard grid, clear |
| P1 | E02 | TSV paste, internal clipboard, fill, undo/redo |
| P1 | F01 | Bounded formula parser/evaluator and error values |
| P1 | F02 | AutoSum, function picker and editable formula drafts |
| P1 | F03 | Transitive/cross-sheet recalculation and structural correctness |
| P1 | E03 | Font/fill/alignment/number formatting, merge/unmerge |
| P1 | D01 | Range filter setup and Format as Table |
| P1 | D02 | Value checklist filtering with blanks and commit/cancel |
| P1 | D03 | Custom text/number/date predicates, clear and reapply |
| P1 | D04 | Stable whole-record sort with formula/reference integrity |
| P1 | H01 | People picker, role selection, message and local invitation |
| P1 | H02 | Link scope/permission/target and clipboard fallback |
| P1 | H03 | Manage access, permission changes, revoke, viewing mode |
| P1 | V01–V03 | Required UI evidence, build/certification/offline checks and injected-world regression |
| P2 | X01 | Anchored threaded comments |
| P2 | X02 | Local source-linked SVG charts |
| P2 | X03 | Find and Replace |
| P2 | X04 | Freeze/resize/hide rows and columns, zoom/ribbon preferences |
| P2 | X05 | Local CSV import/export and print |
| P2 | X06 | Conditional formatting and validation rules |

TODO contains 23 P1 checkboxes including validation. P2 optional arrays start empty; implement SCHEMA additions before adding further object kinds.

## Major views and interaction patterns

**Home / My Content / Create:** 48px green suite header and search; 68px left rail; main content padded 32px vertically/48px horizontally with max width 1200px. Local 156×116px template thumbnails and names above a file list. File rows 52px tall, Excel icon, name/location, opened metadata, owner/avatar and ellipsis. Tabs have green underline, search keeps empty-state feedback. Existing home screenshot is desktop dark mode, so use the supplied light Fluent tokens as an intentional adapted home rather than copying that image literally.

**Workbook editor:** top green Excel/filename/search/profile header, tabs and classic ribbon groups, name box and formula input, then white grid filling remaining height. Grid scrolling stays separate from the application shell. Sticky row numbers/column letters and bottom tabs keep the sheet navigable. Active cell border and fill handle are green; formulas display computed values in cells and source input in formula bar. A populated sales report should occupy the primary grid; avoid a dashboard of cards in place of the spreadsheet.

**File commands:** compact web File menu with New, Open/Home, Save a Copy, Rename and Delete-related entry points. Desktop backstage references only explain terminology; their native Account/Options/security menus do not become fake web pages.

**Formula edit:** local draft, cell overlay or formula input, cancel/confirm icons, range-reference outlines and function autocomplete/picker. Commit groups direct change and dependent recalculation. Invalid formulas yield documented Excel-like error cells rather than generic JavaScript errors or a fabricated answer.

**Filter/table:** header arrow launches a 280px flyout: sort commands, clear, type-specific submenu, search, checklist, footer. Filter changes apply only on OK. Number/text/date custom predicates use a modal with validation. Underlying cell coordinates remain stable when rows hide. Create Table uses the official range/headers dialog structure, adapted to selected Fluent theme.

**Share / Manage access:** dialog with workbook title, picker/chips, view/edit role, optional message, Send and Copy link. Separate link settings has scope radios and role dropdown. Manage access lists People and Links with role/remove actions. Official Copy link reference uses a blue primary button from an older Fluent variant; selected app uses Excel green consistently as specified in DESIGN.md.

**Empty/error states:** home no workbooks/no matches; workbook unavailable; zero sheets with Add sheet action; filter matches no rows but retains header; invalid sheet/file names; clipboard unavailable with manual copy/paste fallback. These must be functional under unfamiliar injected IDs, not hard-coded featured data.

## Screenshot index and visual authority

All image files were viewed at least in a labeled contact sheet; selected editor, filter, share and official crops were also inspected individually. Preserve existing images. Existing files do not include original download provenance; dates in names are unverified, and no original URL is invented. Crops 02–04 magnify source 01 and are not separate independent measurements. See official/sources.json for freshly downloaded primary-source URLs and sizes.

| File under screenshots/ | Visible layout and use / limitation |
|---|---|
| `01_excel_web_main_classic_ribbon_2024.jpg` | 1000×518 complete classic-ribbon web editor with green suite header, light command strip, formula bar, blank grid and bottom sheet/status bars. Primary editor shell; omit browser chrome. Filename's year is unverified. |
| `02_crop_header_ribbon_left.png` | Magnified left header, File/Home ribbon groups, formula/name box and column headings from 01. Use icon/group spacing, not crop dimensions as CSS sizes. |
| `03_crop_header_ribbon_right.png` | Right ribbon Styles/Cells/Editing/Add-ins/Analyze, Comments/Catch up/Editing/Share cluster. Primary right-side ordering reference; unavailable premium controls can be disabled. |
| `04_crop_sheet_tabs_status_bar.png` | Sheet1, plus/All Sheets and calculation/statistics/zoom footer. Primary bottom-strip structure. |
| `05_excel_web_simplified_ribbon.jpg` | Web editor single-row ribbon with tour worksheet. Optional ribbon mode reference; tour illustrations are not required assets. |
| `06_excel_web_file_info_backstage.jpg` | Desktop Info/Protect/Inspect/Version History screen, not web File UI. Secondary labels only; skip security buttons. |
| `07_excel_web_file_info_version_history.jpg` | Another desktop backstage Info/Manage workbook screenshot. Do not clone desktop navigation or version history. |
| `08_filter_dropdown_menu_reference.jpg` | Data-dense formatted table, checkbox/search/sort/color menu with OK/Cancel. Desktop filter behavior reference; official web crops below have higher priority. |
| `09_excel_start_home_recent_favorites_shared.jpg` | Native dark Excel start screen with Home/New/Open and Recent/Favorites/Shared. Behavioral tabs only; not visual ground truth for a white web home. |
| `10_excel_online_legacy_share_button.jpg` | Legacy browser Excel Online header and highlighted Share. Context only; keep chosen modern header. |
| `11_format_menu_tab_color_reference.jpg` | Desktop Format menu/tab color palette. Useful palette/menu behavior; not editor theme. |
| `12_formulas_tab_autosum_reference.jpg` | Desktop-wide formula ribbon with AutoSum highlighted and small price list. Secondary control concept; official AutoSum crop below overrides it. |
| `13_excel_online_legacy_template_budget.jpg` | Legacy browser personal budget with charts/summary cards embedded in cells. Template density inspiration; not default editor shell. |
| `14_home_ribbon_styles_cells_editing.jpg` | Cropped desktop Home groups with ribbon-collapse chevron. Group/icon context only. |
| `15_invite_people_can_edit_mac.jpg` | Native Mac dark Invite People popover and Can Edit checkbox. Permission concept only; do not reproduce Mac chrome. |
| `16_data_validation_dropdown_reference.jpg` | Native Mac grid with in-cell list choices. P2 list validation behavior only. |
| `excel-shared-section-copy.png` | 597×203 Copy link web dialog: filename, audience/permission row, Copy and close. Relevant dialog structure. Source article: Microsoft's Share a section page above; existing download URL unrecorded. |
| `excel-shared-section-highlight.png` | 654×415 shared range green outline/label in data grid. Optional range-link highlight context. |
| `additional/000001.jpg` | Duplicate legacy Excel Online Share view; secondary. |
| `additional/000002.jpg` | Unrelated mobile file-manager Quick Access screen. Rejected, do not use. |
| `additional/000003.jpg` | Duplicate native Mac dark sharing screenshot. Behavioral context only. |
| `research_filter/000001.jpg` | Bootstrap filter-panel promotional graphic, unrelated to Excel. Rejected. |
| `research_filter/000002.jpg` | Excel Web promotional logo image, no usable controls. Rejected as UI reference. |
| `research_sharing/000001.jpg` | Native Mac desktop Share highlighted; behavioral context only. |
| `research_sharing/000002.jpg` | Duplicate legacy Excel Online Share view. Secondary. |
| `research_web_dialog/000001.jpg` | Duplicate legacy Excel Online Share view; no actual open web dialog. Secondary. |
| `research_web_dialog/000002.jpg` | Native Mac Accept/Reject Changes ribbon; desktop-only, outside scope. |
| `share_web/000001.jpg` | Stock photo with spreadsheet on a laptop; no usable UI detail. Rejected. |
| `share_web/000002.jpg` | Excel logo/title graphic. Rejected as UI reference. |
| `plan_sharing/000001.jpg` | Fresh image-search result, duplicate legacy Share view from Lifewire. No additional visual authority. |
| `plan_sharing/000002.jpg` | Fresh result, stylized promotional “How to Enable Share Workbook” illustration. Rejected as UI reference. |
| `plan_filter/000001.jpg` | Fresh result, duplicate unrelated Bootstrap promotion. Rejected. |
| `plan_filter/000002.jpg` | Fresh result, filter tutorial title graphic, no menu. Rejected. |
| `official/filter-menu.png` | 274×305 Microsoft Web crop: header dropdown, select-item checklist and number values. Primary checklist structure; this crop cuts off the full flyout. |
| `official/filter-number-options.png` | 345×333 Microsoft Web custom-number operator submenu. Primary operator menu content. |
| `official/filter-number-result.png` | 401×161 Microsoft Web worksheet crop with filtered March values and a funnel icon. Filter result/coordinate context; this is not a predicate dialog. |
| `official/format-as-table.png` | 345×200 Microsoft Web table-creation crop. Primary range/headers dialog structure. |
| `official/autosum-formula.png` | 408×234 Microsoft Web AutoSum cell/range example. Primary real formula-draft behavior. |

Fresh image-search provenance: `plan_sharing/000001.jpg` from [Lifewire image](https://www.lifewire.com/thmb/A7Y8sXxcSORt9vKHcYAovD7y8QY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/005-how-to-share-an-excel-file-4691732-d48596bbe6d74bd38321548a65c8ad93.jpg), `plan_sharing/000002.jpg` from [DashboardsExcel image](https://dashboardsexcel.com/cdn/shop/articles/1wat15TFumm7MoMsYfvPrCnlPmTX8FVKR.jpg), `plan_filter/000001.jpg` from CodeWithFaraz's “creating an efficient filter menu panel group with bootstrap for better user experience” image, `plan_filter/000002.jpg` from [SoftwareAccountant title image](https://softwareaccountant.com/wp-content/uploads/2018/12/Excel-Filter-Data.jpg). These were used for image triage, not technical product claims. No screenshot is to be fetched at app runtime; research images are not runtime dependencies.

## State, persistence and verification implications

The model has 12 entity types (User, Workbook, Sheet, Cell, Table, Filter, Sort, Share, ShareLink, Comment, Chart, Operation), plus envelope/preferences. Workbook owns sheets; sheets own sparse cells/ranges; formulas reference stable sheet IDs plus addresses; tables describe cells, not duplicate content. Direct grants and links are separate so an invitation, permission change and revoke can each be verified independently.

Boot calls loadState before routes. One central dispatcher saves whole snapshots only on committed user actions. Standard state-api serves `/go` JSON in dev/preview; Harbor serves it with built assets. Every workflow has authoritative records plus structured operations; formula recalculation is part of an action transaction. No fake live edits, idle synchronization, auto-changing timestamps, random presence or notification timers. Clipboard fallbacks are local and usable offline.

The dev handoff includes A1–A5 UI scenarios in TODO. Dev must create SCHEMA.md and TEST.md, build successfully, and run the actual repository certification command; none of these runtime results have been performed or claimed during planning. The contract-required `factory/hub_tools/dyn_certify.py` was not found in this checkout; TODO retains it as a pending external tooling prerequisite, not a passed check. Fresh sid/browser contexts are necessary when reinjecting worlds because standard dataManager caches a loaded session. Test empty/replaced collections and deep links, not just the supplied realistic seed.

## Deliberate exclusions

Skip authentication, real APIs/cloud storage/email, actual permission security, live collaboration and incoming edits, VBA/macros, external workbook references, full function parity, PivotTables, Power Query and AI services. These do not help the five required local workflows and would violate offline or deterministic runtime constraints. Preserve real Excel brand names/colors in the UI; all “sandbox/mock” terminology belongs only in project documentation.
