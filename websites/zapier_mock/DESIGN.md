# Zapier workspace design

## Visual theme

Use a pale slate workspace with a dark indigo navigation rail and generous margins around dense operational tables. Present the Zapier name as plain type and use a warm orange accent sparingly. Use CSS-drawn connector lines and small colored initials to represent integrations. Draw navigation and status icons locally with CSS or use bundled open-source icons.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Navigation | `#17203A` | Full-height rail |
| Navigation selection | `#2B385C` | Active route and menu hover |
| Navigation copy | `#DDE5F7` | Rail labels |
| Workspace | `#F0F3F9` | Main background |
| Surface | `#FFFFFF` | Panels and forms |
| Raised tint | `#F6F8FC` | Table headers and row hover |
| Text | `#172239` | Headings and body |
| Secondary text | `#4E5B73` | Metadata and captions |
| Border | `#D9E1EE` | Dividers and input outlines |
| Primary action | `#3048A6` | Solid buttons and links |
| Primary hover | `#253783` | Hover and pressed buttons |
| Brand accent | `#FF673D` | Small accent next to wordmark |
| Focus | `#516DE4` | Two-pixel focus outline with two-pixel offset |
| Success | `#17604B` on `#DEF5EA` | On, Active, Success |
| Attention | `#754711` on `#FFF0D2` | On hold, Expired |
| Error | `#9E2842` on `#FBE8ED` | Errored, validation |
| Neutral | `#46556F` on `#EAF0F8` | Draft, Off, Filtered |

## Type

Use `system-ui, 'Segoe UI', sans-serif`. Use `ui-monospace, Consolas, monospace` for run IDs and payload inspection only. Use tabular numerals for dates and counts.

| Role | Size | Line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Wordmark | 22px | 28px | 700 | −0.025em |
| Page heading | 32px | 40px | 700 | −0.035em |
| Panel heading | 18px | 24px | 650 | −0.01em |
| Body and controls | 14px | 20px | 400/600 | Normal |
| Metadata | 12px | 18px | 500 | Normal |

## Layout

- At desktop widths use a 232px rail, a 60px context header, and 32px main padding. Limit the main reading width to 1440px. Put the user identity at the foot of the rail.
- Give each main view a header row with its heading and primary action, a toolbar beneath it, and a white results surface. Use 24px between regions, 16px inner panel padding, 8px between related controls, and a 12px panel radius. Tables use 42px headers and 56px minimum rows.
- Give the editor a two-column grid with a 300px step list and a flexible detail form. Stack trigger and action cards vertically. Use a thin connector line between cards and an explicit `Add action` control after the last step.
- Below 960px reduce outer padding to 20px, wrap table tools, and allow table scroll within its frame. Below 720px use a top navigation strip and stack editor columns with step selection above the form.

## Components

- Primary buttons use a 40px minimum height, 8px radius, 14px horizontal padding, and white text. Secondary buttons use a white surface and 1px border. Size row menus and switches with a 36px minimum hit area. Give row controls accessible names that include their target.
- Search inputs reserve room for a leading icon and clear action. Filter controls show their selected values and pair with a `Clear filters` action when applicable. Use separate messages for an empty inventory and an empty filtered result.
- Render status chips with 6px horizontal padding, 4px vertical padding, and 6px radius. Keep the status label visible in every table and detail view. Use a real button or switch for Zap activation.
- Run details group step status, inputs, outputs, and errors in a two-column layout that stacks on narrow screens. Task usage uses a compact daily bar chart with an adjacent accessible table. Derive both from the same filtered run records.
- Use centered, keyboard-accessible dialogs up to 480px wide for discrete edits and confirmations. Restore focus to the invoking control when it still exists. Show a compact alert near the relevant form when validation fails.

## Elevation

- Tables and forms use borders with `0 1px 2px #1722390A`.
- Menus use `0 8px 24px #17223926` over a 1px border.
- Dialogs use `0 16px 48px #17223933` with a `#11182B66` backdrop.
