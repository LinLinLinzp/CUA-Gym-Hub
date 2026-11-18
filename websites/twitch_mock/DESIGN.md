# Twitch creator workspace design

## Visual direction

Use a warm paper canvas and charcoal text with restrained Twitch purple. Give the pre-signed-in Fieldnote Live account the feel of a small editorial studio. A horizontal section bar and asymmetric content columns define the desktop layout. Use “Twitch” as ordinary typeset text and an `FL` initials avatar. Use local CSS-generated artwork built from paper textures, off-register geometric color blocks and linework for channel and video covers. Use distinct palettes and compositions for printmaking, photography, ceramics, and book arts. Every cover should have a stable local fallback based on category. Leave the area around headings and controls quiet.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F3ED` | Page background |
| Surface | `#FFFDFA` | Forms, tables, popovers |
| Text | `#241F2B` | Primary text |
| Muted text | `#615968` | Metadata and secondary copy |
| Border | `#DDD5E0` | Dividers and card edges |
| Control border | `#897D90` | Input outline |
| Purple | `#6427C9` | Primary action, focus ring, selected navigation |
| Purple hover | `#5320AA` | Primary hover |
| Purple wash | `#EEE5FA` | Selected tabs and rows |
| Published | `#21634A` on `#E8F3EC` | Published, scheduled |
| Pending | `#754713` on `#FAEFD8` | Unpublished, timed out |
| Danger | `#9D2447` on `#FBE9EF` | Error, banned, cancelled, destructive actions |

All status badges pair color with a readable label. Use light text on solid primary buttons and a visible 2px focus ring with a 2px offset.

## Typography

| Role | Font | Size / line height | Weight |
| --- | --- | --- | --- |
| Page title | Georgia, serif | 44px / 1.08 | 700 |
| Section title | Segoe UI, system-ui, sans-serif | 21px / 1.3 | 650 |
| Wordmark | Segoe UI, system-ui, sans-serif | 25px / 1 | 800 |
| Body and controls | Segoe UI, system-ui, sans-serif | 14px / 1.5 | 400–650 |
| Metadata | Segoe UI, system-ui, sans-serif | 12px / 1.45 | 500 |
| Time and metrics | Inherit, tabular numerals | 13px / 1.45 | 500–600 |

## Layout

- Use a 64px top bar for the wordmark and account identity, followed by a 48px navigation row with Overview, Stream Settings, Video Producer, Moderation and Schedule. Show the active route with purple text and an underline.
- Center the header and content at max-width 1280px with a 32px content gutter. Use 24px section gaps, 16px compact card gaps, and a spacing scale of 4, 8, 12, 16, 24, 32 and 48px. Use 12px card radii and 8px for controls.
- On Overview use a 7:5 split. Place stream info and the Edit Stream Info button against a local visual on the left. Show the next scheduled stream, recent video, and moderation summary on the right using live selectors over the current local state. Link each summary to its owning view.
- Use a compact list in Video Producer with 88×50px cover images, 64px minimum row height, a checkbox column and an action column. Use a 280px viewer list, a flexible detail card and a full-width log below in Moderation. Use a 240px date navigator alongside a flexible dated agenda in Schedule. Keep Stream Settings form sections within a 760px reading width.
- Below 900px stack multi-column views. Below 600px use 16px gutters, a 34px page title and a horizontally scrollable nav. Wrap filters, convert video rows to cards or contain their scroll region, and keep primary actions reachable without page-level horizontal scrolling.

## Components and states

- Buttons use a 40px minimum height and 14px horizontal padding. Primary buttons use filled purple, secondary buttons use a surface and control border, and destructive buttons use solid danger. Pair standalone icons with accessible names. Keep the same action wording in menus and confirmations.
- Form labels are persistent. Place validation below the relevant input and associate it programmatically. Use a custom tag chip with a labeled removal button and show the Go Live Notification counter beside its field. Use semantic form inputs and keyboard-operable searchable category selection.
- Use a 560px maximum dialog width for editors and a 420px maximum for confirmations. Constrain dialog height to the viewport, trap focus, dismiss with Escape and restore focus to the launcher. Use overlays at `rgba(36, 31, 43, .44)`. Announce success through a polite live region.
- Use `0 1px 2px rgba(36, 31, 43, .06)` on cards and `0 16px 48px rgba(36, 31, 43, .20)` on dialogs. Use semantic headings, table header associations, and a readable inline empty state. Give filters a clear reset and use explicit action labels on loading, zero-data and missing-record views.
