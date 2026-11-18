# VA.gov account design

## 1. Visual theme

Use a personal account workspace with a deep navy rail, warm off-white workspace, and a cobalt overview panel. A quiet serif headline gives the overview a different rhythm from the denser service pages. The primary H1 is “Welcome, Jordan” with the first name derived from the profile. The wordmark reads “VA.gov” in plain text.

The overview panel includes original geometric CSS artwork on the right. Use three wide, offset concentric arc outlines and a translucent disk as a cropped background motif. Keep them in the rightmost 40% with low opacity and hide them from assistive technology. Create the artwork within the app's local styles and reuse its accent colors in the four service icons. Use local code for those icons and for any other interface visuals.

## 2. Color palette

| Role | Value | Usage |
| --- | --- | --- |
| Rail | `#142A43` | Sidebar and mobile brand bar |
| Rail text | `#F7FAFF` | Rail labels and wordmark |
| Rail active | `#254664` | Selected link with a 3px `#AED1FF` inset bar |
| Hero | `#214B85` | Overview panel with white headline |
| Hero art | `#8FB8EB`, `#D6E4F8` | Rings and disk at 18–28% opacity |
| Workspace | `#F6F4EF` | Main page background |
| Surface | `#FFFFFF` | Header, panels and inputs |
| Text | `#182C40` | Headings and body |
| Muted text | `#4B6073` | Metadata and help text |
| Border | `#D8E0E7` | Dividers and panel boundaries |
| Input border | `#76889A` | Input outlines |
| Action | `#174F9C` | Primary buttons and links |
| Action hover | `#123D77` | Hover and pressed appearance |
| Selected tint | `#E9F1FC` | Selected filters and informational callouts |
| Success | `#1F6147` on `#E5F4EB` | Paid, received, or confirmed feedback as applicable |
| Attention | `#774D0B` on `#F8EDCE` | Pending or open items |
| Error | `#9C3028` on `#FBE9E6` | Validation and error feedback |
| Focus | `#0E5AB9` | 3px outline with 3px offset, light blue on dark surfaces |

## 3. Typography

| Role | Font stack | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 27px | 750 | 1.15 | −0.04em |
| Overview H1 | Georgia, serif | 48px | 400 | 1.1 | −0.03em |
| Service H1 | Georgia, serif | 36px | 400 | 1.2 | −0.02em |
| H2 | Segoe UI, system-ui, sans-serif | 21px | 650 | 1.3 | −0.02em |
| Body | Segoe UI, system-ui, sans-serif | 16px | 400 | 1.55 | normal |
| Metadata | Segoe UI, system-ui, sans-serif | 14px | 400–600 | 1.4 | normal |

Use tabular numerals for record IDs and currency columns.

## 4. Spacing and layout

- Desktop rail width 232px. White account header height 72px. Content region has 40px desktop padding and is capped at 1240px inside the workspace. Sidebar links use a 44px minimum height with 12px side margins.
- Use a 4, 8, 12, 16, 24, 32, 40px spacing scale. Set standard panel padding to 24px, radius to 12px, and gap to 20px. Use 16px radius and 32px padding on the overview panel.
- At 1280px and above, show the four service links in one equal-width row. At 900–1279px, show a two-by-two group. Below 900px, use a compact header with brand text and a menu button, and 20px content padding. Below 560px, stack service links, fit filter controls to the full width, and show record rows as stacked labeled values.
- Display recent activity on the overview as up to four dated links derived from records. Service pages begin with a breadcrumb, title, optional primary action, then filter controls above the list. Detail views organize the state, corresponding metadata and action in reading order.

## 5. Component patterns

- Primary buttons have a 44px minimum height, 8px radius, 16px horizontal padding, and white text on the action color. Secondary buttons use a 1px border and white surface. Display inline validation beside the field and summarize errors on form submit.
- Search, select and date fields use labels above, 44px minimum height, 8px radius, 12px side padding, and a 1px input border.
- Status labels use a 13px semibold font, 6px radius, and 4px 8px padding. Use text as well as color to communicate status.
- Cards and list rows use 1px dividers. Give each record a clear named link with its destination. On mobile, show column names beside values when the header is collapsed.
- Use an inline review step for longer submissions and a compact dialog for canceling an appointment or confirming a refill. Dialogs use a 480px maximum width, 24px padding, a visible dismiss control, focus containment, Escape dismissal, and focus restoration. Put successful submission feedback at the top of the resulting detail and announce it in a live region.

## 6. Elevation

Use a `0 1px 3px rgba(20, 42, 67, 0.07)` shadow for panels and `0 16px 44px rgba(20, 42, 67, 0.22)` for dialogs. Dim underlying content with a 48% navy backdrop.
