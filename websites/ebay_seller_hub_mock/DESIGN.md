# eBay Seller Hub — Design

## Visual direction

Build a calm, inventory-first seller workspace with warm ivory, dark plum, and a marigold accent. Pair an upright navigation rail with a broad work area and a locally drawn editorial still life on Overview. The visual identity comes from strong typography, consistent spacing, and clear data hierarchy. Set “eBay Seller Hub” in plain, single-color text.

## Color roles

| Token | Color | Role |
| --- | --- | --- |
| Ink | #281E30 | Headings and body |
| Secondary | #665A68 | Metadata and secondary copy |
| Rail | #302439 | Navigation and brand area |
| Rail text | #F8F1FA | Navigation labels |
| Rail selection | #4C3A56 | Selected navigation background |
| Canvas | #F7F4EE | Main page |
| Surface | #FFFCF7 | Panels and inputs |
| Rule | #DDD4CA | Panel and row borders |
| Primary | #603877 | Action buttons, focus rings, links |
| Primary hover | #4A2A5D | Action hover |
| Marigold | #F1C66D | Active navigation marker and illustration highlights |
| Success | #235A46 on #E4F0E8 | Active, shipped, resolved |
| Warning | #694509 on #FAEDCD | Awaiting shipment, needs response |
| Error | #8B3039 on #F8E6E8 | Validation and canceled |
| Neutral | #56445E on #EEE6F0 | Draft, ended, and scheduled states |

## Typography

Use local system fonts. Use Georgia for the Overview welcome heading and Segoe UI, system-ui, sans-serif everywhere else. Set IDs and metrics with tabular numbers.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Overview welcome | 46 / 51 px | 400 | −0.035 em |
| Page heading | 32 / 39 px | 700 | −0.025 em |
| Panel heading | 19 / 25 px | 650 | −0.01 em |
| Body and controls | 14 / 21 px | 400–650 | Normal |
| Table and metadata | 13 / 18 px | 400–650 | Normal |
| Metric | 30 / 34 px | 700 | −0.025 em |

## Layout

- Desktop rail 216 px wide, displaying the text brand, five workflow links, and synthetic account name at the bottom. Selected navigation uses a 3 px marigold inset marker.
- Workspace utility row 62 px high with breadcrumb and account name if space permits. Main content has 32 px padding and a 1440 px maximum width. Use an 8 px spacing grid, 24 px section gap, 20 px panel padding, and 12 px panel radius.
- Overview starts with a 200–224 px warm tinted welcome panel, one primary listing action, and a simple parcel, tag, and tape-measure composition. Queue cards share a row. Below, reserve roughly two thirds of the grid for orders and one third for returns or recent activity.
- Workflow screens start with the page title, primary action where relevant, status filters, and a single results toolbar. Keep the results table the dominant surface. Detail screens place history and related records beside the primary content on wider screens.
- At 1024 px reduce horizontal padding to 24 px and tighten the rail. Below 760 px, expose all destinations from an accessible compact navigation menu, stack panels, and let dense tables scroll in their own labeled region. Keep the primary action and active filter visible at narrow widths.

## Components

- Buttons use 40 px minimum height, 12–16 px horizontal padding, 8 px radius, and clear verb labels. Apply white text on the primary fill. Secondary buttons use surface fill with a 1 px rule. Confirm destructive actions in a dialog with a labeled cancel action.
- Inputs use a 40 px minimum height, an 8 px radius, and visible labels. Keep errors near the affected field and preserve entries on invalid submission. Use a 2 px focus outline with a 2 px offset on interactive controls.
- Tables use a 40 px header and 56 px minimum rows with thin dividers, explicit sort affordances, pill-shaped text status labels, and right-aligned numeric columns. Limit thumbnail boxes to 36 × 36 px. Show a meaningful empty state and an action to clear active filters.
- Confirmation dialogs use a 480 px maximum width, 16 px radius, 24 px padding, a dimmed backdrop, and keyboard focus restoration. Use full routes for multi-step creation and item detail. Announce saves and validation feedback accessibly.
- Panels sit flat with a 1 px rule. Use 0 12px 28px #281E3026 for menus and 0 20px 56px #281E3033 for dialogs.

## Original local visuals

Create the still life under the site's local assets during implementation using CSS or hand-drawn shapes. Use original product-category drawings for the local thumbnail set, with repeated thumbnails permitted within each category and stable choices in seed data. Keep artwork free of logos, branding, and customer likenesses. Use accessible text labels for icon-only actions and hide decorative artwork from assistive technology.
