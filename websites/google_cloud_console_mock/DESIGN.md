# Google Cloud Console design

## 1. Visual theme

Use an original cloud operations workspace with a deep navy navigation rail, a warm gray canvas, and white work surfaces. Blue establishes action hierarchy. Indigo, teal, and amber help distinguish service summaries and status. Set the brand as the plain text “Google Cloud Console” in the rail. Use an unadorned top bar for project and account controls.

On Overview, use a low navy project panel with the selected project name and ID on the left. On the right, an original CSS-drawn three-column grid depicts real counts of running VMs, buckets, and IAM principals. Each vertical bar carries a text value and label. The bars scale against the largest displayed count and collapse into a compact metric row on narrow screens. Draw small service glyphs locally with CSS or use locally bundled generic icons. Keep graphics offline.

## 2. Color palette and roles

| Token | Value | Use |
|---|---|---|
| Brand blue | `#1A73E8` | Small accents and charts |
| Action blue | `#1954C7` | Primary buttons and links |
| Action hover | `#1745A2` | Primary button hover |
| Focus ring | `#3979EF` | 2 px keyboard outline with 2 px offset |
| Rail | `#101B34` | Navigation and overview project panel |
| Rail hover | `#202E49` | Inactive navigation hover |
| Rail active | `#293C62` | Selected destination with blue inset edge |
| Rail text | `#EDF3FF` | Navigation and brand |
| Rail muted | `#AAB8D0` | Secondary text in dark regions |
| Canvas | `#F4F5F8` | Workspace page background |
| Surface | `#FFFFFF` | Header, cards, tables, panels |
| Border | `#DDE3ED` | Dividers and outlines |
| Main ink | `#162039` | Primary text |
| Secondary ink | `#526078` | Metadata and descriptions |
| Teal accent | `#087B74` | Storage and series contrast |
| Indigo accent | `#5840B6` | IAM and secondary series |
| Success | `#176949` on `#E8F6EF` | Running and active |
| Warning | `#854A03` on `#FFF2D8` | Forecast warnings and thresholds |
| Error | `#A52B40` on `#FDEEF0` | Errors and destructive controls |
| Neutral | `#44516A` on `#EFF2F7` | Stopped and inherited |

## 3. Typography

Use `"Segoe UI", system-ui, sans-serif`. Use `Consolas, ui-monospace, monospace` for IDs and IP addresses in detail panels. Apply tabular numerals to costs, counts, dates, and sizes.

| Role | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| Brand | 17 px | 700 | 24 px | -0.2 px |
| Page heading | 32 px | 700 | 40 px | -0.8 px |
| Project panel heading | 30 px | 650 | 38 px | -0.6 px |
| Section heading | 20 px | 650 | 28 px | -0.2 px |
| Metric | 27 px | 680 | 34 px | -0.5 px |
| Body and controls | 14 px | 400–600 | 20 px | normal |
| Captions and column heads | 12 px | 500–650 | 18 px | normal |

## 4. Spacing and layout

- Use a 228 px rail and a 64 px top bar. Set the rail brand 20 px from both edges and use 42 px navigation rows with 12 px horizontal inset.
- Give the main column 32 px padding, a 1440 px maximum content width, and a 24 px vertical rhythm. Page title and primary action share a row and wrap when space is limited.
- Overview uses a project panel at least 146 px high, four summary cards in a grid with 16 px gaps, then one wide recent activity table. Use two cards per row below 1100 px and one below 600 px.
- Below 840 px, collapse the rail into a keyboard-accessible menu and reduce content padding to 16 px. Keep tables in their own horizontal scroll region, with the page itself fitting the viewport.
- Place IAM, VM instances, and Buckets in a consistent layout with a title/action band, filters, and a table surface. Keep Billing overview, Reports, and Budgets & alerts in a local tab strip above their content. Use the same tab treatment for bucket Objects and Configuration.

## 5. Components

- **Buttons.** 40 px minimum height, 14 px horizontal padding, 8 px radius, and 14 px semibold labels. Fill primary actions with action blue and white text. Use a white surface and 1 px border for secondary controls. Show destructive labels in error red outside final confirmation.
- **Fields.** Set visible labels above 40 px controls with 10 px horizontal padding, a 1 px border, and an 8 px radius. Keep error text adjacent to the field and associate it with the input. Keep form labels visible when populated.
- **Cards and tables.** Use 12 px card radius and 1 px border. Set table headers to 40 px and base rows to 52 px, with 16 px horizontal cell padding and subtle row separators. Rows may grow for multiple IAM role chips. Align currency and size values to the right. Keep the horizontal scroll surface separate from the page.
- **Status.** Use compact 24 px pills with a 12 px radius. Keep the status text alongside the color indicator. Place names ahead of metadata in row cells.
- **Forms and confirmations.** Use a 480 px right-side panel for quick edits and a centered 420 px confirmation dialog. Use full workspace pages or larger panels for VM, bucket, and budget creation. Keep the primary save action and Cancel visible in a footer, reserve space for errors, and restore focus after dismissal.
- **Reports.** Use original CSS charting with grid lines, currency ticks, and a visible legend. Present matching totals in a table beneath the chart. Use numeric labels and colors that remain distinguishable in grayscale.

## 6. Elevation

- Table and card surfaces use their borders for separation.
- Menus use `0 8px 24px rgb(16 27 52 / 14%)`.
- Panels and dialogs use `0 20px 60px rgb(16 27 52 / 22%)` above a `rgb(16 27 52 / 42%)` scrim.
