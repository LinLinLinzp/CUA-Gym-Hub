# Marketo workspace design

## Visual theme

Use an ink-colored horizontal masthead and a warm-white operations workspace. Show Marketo as plain white text in the masthead. A short navigation row and a wide inventory table give marketers room to compare programs and audiences. Violet identifies the current section and primary actions. Teal and amber distinguish operational states. Use the same shell on every route.

Use original CSS shapes, simple local icon drawings and text initials. Reserve icons for navigation, sort state, type recognition and actionable controls. Tables and form controls provide the visual detail on workflow screens.

## Color palette

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#201B35` | Masthead and primary text |
| Canvas | `#F7F6F3` | Workspace background |
| Surface | `#FFFFFF` | Tables, dialogs and navigation |
| Strong text | `#231F31` | Labels and headings |
| Secondary text | `#625B71` | Supporting detail and metadata |
| Divider | `#E5E0EA` | Surface borders and table rules |
| Input border | `#837B91` | Input and native select boundaries |
| Action | `#5937B5` | Primary button and links |
| Action hover | `#462892` | Primary hover and pressed |
| Lavender tint | `#EEE8FF` | Selected navigation and tags |
| Teal | `#176754` on `#E6F4EE` | Active or completed |
| Amber | `#87520E` on `#FCF0D8` | Scheduled |
| Neutral | `#5D536D` on `#F1EEF5` | Draft, archived or inactive |
| Error | `#A02D43` on `#FBEAF0` | Validation and destructive text |

Pair status colors with text labels. Use a 2px `#7255D0` focus ring with a 2px offset. Use a white focus ring on the masthead.

## Typography

Use `system-ui, 'Segoe UI', sans-serif`. Apply tabular numbers to counts and dates.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | 23px | 720 | 28px | −0.04em |
| Page heading | 32px | 700 | 40px | −0.035em |
| Section heading | 19px | 650 | 26px | −0.015em |
| Navigation and buttons | 14px | 650 | 20px | normal |
| Table and body | 14px | 400 | 21px | normal |
| Metadata | 12px | 550 | 17px | normal |

## Layout

- Use a 64px masthead with the wordmark and `Demand Operations` workspace name on the left and a Maya Chen identity label on the right. The sidebar width is 0px. Put Programs, Lists and Smart Campaigns in the separate 52px navigation band, with a 3px active underline.
- Center main content at `max-width: 1440px` with 40px horizontal padding and 32px top padding. Space major blocks 24px apart. Below 900px use 20px padding and wrap toolbar controls as needed. Allow tables to scroll horizontally within their card on narrow viewports.
- The inventory heading shows the resource name and an adjacent primary create button. Below it, a table card contains a 64px search/filter toolbar, 44px headers, 54px data rows and a pagination footer. Show 15 rows per page by default, a result count and Previous/Next. Use a compact empty-state row with a contextual action.
- Details show a breadcrumb above the title. Keep action buttons at the title's right edge. Use 44px route tabs with visible selected states and content cards below. Encode the selected tab in `tab` (for example, `/programs/program-001?tab=members&sid=example`), and program scope in `programId`. Display edit and create dialogs in an overlay. Use a right drawer for picking multiple people or inspecting choices while preserving workspace context.

## Components

- Primary and secondary buttons use `min-height: 40px`, `padding: 0 14px`, and `border-radius: 8px`. The primary uses solid Action with white text. The secondary uses a white surface and input border. Icon-only buttons have accessible names and at least a 36px target.
- Inputs and selects use `min-height: 40px`, a 1px input border, `border-radius: 8px` and 12px horizontal padding. Place visible labels above inputs with 6px spacing. Show validation beneath the responsible field. Use real buttons for sortable headers with `aria-sort` on the corresponding header.
- Tables use a 1px divider, 12px outer radius and horizontal row separators. Use `#FAF9FC` for headers and `#F7F3FF` for row hover. Put the navigable name in an anchor. Keep selection checkboxes and row menus independently operable.
- Status pills use 6px rounding, 4px vertical and 8px horizontal padding. Linked assets use ordinary text links. Keep rules and Flow steps in compact stacked form rows with drag-free reorder buttons and explicit Save and Cancel.
- Dialogs use `width: min(540px, calc(100vw - 32px))`, 24px inner padding and a 14px radius. People drawers are up to 460px wide. Put Cancel and the named confirm action in the footer. Trap dialog focus, close on Escape and return focus to the launcher. Toasts are brief and announce only committed outcomes.

## Elevation

- Table and detail cards use a 1px divider with no drop shadow.
- Menus use `0 8px 20px #201B351A` above their invoking surface.
- Dialogs use `0 24px 64px #201B3533` with a `#201B3566` backdrop.
