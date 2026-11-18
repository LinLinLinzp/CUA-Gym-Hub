# Design System Inspired by Azure DevOps

## 1. Visual theme and atmosphere

Microsoft's screenshots use dense, quiet work surfaces, bright blue primary actions, colored state indicators and compact tabs. Preserve the service vocabulary and the information hierarchy. Use an original desktop shell with a navy service rail, a project strip, and horizontal local tabs. The light screenshots establish the content density and the order of controls. The dark tokens below are for the P2 preference. [Microsoft web portal navigation](https://learn.microsoft.com/en-us/azure/devops/project/navigation/?view=azure-devops) · [Visual references](assets/README.md#visual-reference-index)

The values below specify the implementation. The white surfaces, colored badges, text density and blue actions come from visual review of the work-item, pull-request and pipeline screenshots. The navy shell, blue-gray background, type scale and component dimensions are design choices for this app.

## 2. Color palette and roles

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| Brand | `#0078D4` | `#79BAFF` | Azure DevOps logo text and branded accent |
| Service rail | `#182C43` | `#142234` | Full-height navigation below header |
| Rail item | `#DEE9F5` | `#DEE9F5` | Text on rail |
| Rail selection | `#304F70` | `#304F70` | Active service behind text and icon |
| Rail hover | `#263E59` | `#263E59` | Hovered service |
| Canvas | `#EEF3F8` | `#151F2C` | Main workspace |
| Surface | `#FFFFFF` | `#1E2B3B` | Header, table, board card, panel |
| Subtle surface | `#F4F7FB` | `#243449` | Table headers, tabs band, lane backgrounds |
| Text | `#192B3D` | `#ECF3FB` | Main text |
| Muted text | `#53677D` | `#B8CBDD` | Secondary data, metadata |
| Border | `#D7E1EC` | `#3B5066` | Separators and quiet outlines |
| Input border | `#75899F` | `#7890A9` | Field controls |
| Primary action | `#1264A5` | `#86C4FF` | Button fill, active tab underline, primary focus |
| Primary hover | `#0C5087` | `#A6D4FF` | Hovered primary button |
| Primary button text | `#FFFFFF` | `#112335` | Solid button text |
| Link | `#105F9D` | `#90CBFF` | Text links |
| Selected row | `#E6F2FF` | `#2A4564` | Focused/selected working row |
| Success | `#107C41` | `#78D8A2` | Approved, succeeded, closed |
| Warning | `#8C5700` | `#F3C565` | Pending approval and WIP |
| Error | `#AD2428` | `#FF9C9E` | Rejected, failed, validation |
| In progress | `#106BB2` | `#93C7FF` | Active, running |
| Neutral status | `#546A82` | `#ADC0D3` | New, queued, canceled, ready |

Use status icons and accessible text labels with color. Use the main text color for compact white or tinted badges. Give links an underline on hover and a visible focus outline.

## 3. Typography

Use `"Segoe UI", system-ui, -apple-system, sans-serif`. Code and logs use `"Cascadia Mono", ui-monospace, SFMono-Regular, Consolas, monospace`. Provide no external font requests.

| Role | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- |
| Page title | 25 px | 650 | 32 px | −0.3 px |
| Panel/dialog title | 19 px | 650 | 26 px | 0 |
| Board lane / section title | 15 px | 650 | 22 px | 0 |
| Body / field | 14 px | 400 | 22 px | 0 |
| Table / tabs / action | 13 px | 550 | 20 px | 0 |
| Metadata | 12 px | 400 | 18 px | 0 |
| YAML / diff / log | 13 px | 400 | 20 px | 0 |

## 4. Spacing and layout

- Use a 54 px top header and a 176 px service rail. Header contains brand, organization context, search and the user menu. The project strip begins to the right of the rail and shows the active project/team and breadcrumb. Local service tabs run horizontally beneath it.
- At 1440 × 900, use a 32 px working-area inset, 16 px between panels, and a 4/8/12/16/24/32 px spacing scale. Put the page title before its action cluster. Keep the tabs, filters and current selection visible while the main list scrolls.
- Board lanes are 252 px minimum with 12 px between them, a 40 px sticky header, and 8 px between cards. Keep scrolling inside the board and ensure the keyboard Move menu remains visible. For horizontal release stages use a 172 px minimum card width.
- File navigator width is 224 px. Work item and PR detail use a fluid main column and a 280 px metadata column at 1100 px and above. YAML editor and run logs have a fluid code pane and a 260 px list of tasks or stages.
- At widths below 1024 px reduce the content inset to 20 px and collapse the rail behind a labeled Services button. At 768 px allow tabs and board lanes to scroll horizontally, stack side metadata and make drawers full width. Preserve access to actions and their labels throughout.

## 5. Component patterns

| Component | Implementation |
| --- | --- |
| Primary and secondary buttons | 34 px min-height, 12 px horizontal padding, 6 px radius, 1 px border, 13 px label. Primary uses action tokens. Secondary uses surface fill with a visible border. Set disabled appearance and expose a reason when a prerequisite is missing. |
| Tabs | 38 px min-height with a 3 px selected underline. Keyboard navigation and focus are visible. Pair statuses, IDs and counts with text where useful. |
| Inputs and menus | 34 px input min-height, 1 px input border, 6 px radius and 10 px inset. Use a 2 px focus outline with 2 px offset. Keep validation next to the associated control. Put focus on the first invalid field on submit. |
| Table | 36 px header and 42 px rows, 12 px horizontal cell padding, 1 px row separators. Use left-aligned names, right-aligned numeric fields where applicable, and `font-variant-numeric: tabular-nums` for IDs and durations. Wrap titles and move long metadata to a secondary line when needed. |
| Board card | 10 px padding, 8 px radius, 1 px border, type glyph next to ID, then a linked title and compact owner/tag row. Show drop target before committing. |
| Dialog / drawer | 520 px standard dialog, 420 px run/release drawer, 24 px inset, 10 px radius, sticky action footer. Trap and restore focus, close with Escape where safe, and keep drafts visible after validation. |
| PR diff, YAML and logs | Line-number gutter, monospace text, persistent selected file or step. Use labeled add/remove markers in diffs and a dark log pane (`#122030` background, `#E6EDF5` text) in either theme. Put logs in a selectable, scrollable text area. |
| Stage and approval | Ordered stage cards with icon, name, status and applicable Deploy/Logs action. Place approver status and Comment above Approve and Reject in the drawer. |
| Empty state and feedback | Use one concise description and the relevant action. Show loading only while the store initializes. Announce success or failure with a status region and reflect the outcome in the underlying record view. |

## 6. Shadows and elevation

- Board cards and info panels use `0 1px 2px rgba(24,44,67,.10)` with their 1 px border.
- Popovers use `0 8px 20px rgba(24,44,67,.16)`.
- Dialogs and drawers use `0 16px 48px rgba(17,33,55,.24)` over a `rgba(14,25,39,.44)` scrim.
