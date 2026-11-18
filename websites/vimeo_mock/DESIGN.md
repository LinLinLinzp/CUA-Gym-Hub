# Vimeo workspace design system

## Visual theme

Design the workspace as a working film catalog. A light paper canvas frames cinematic imagery, with a deep aubergine masthead, muted coral actions, and a narrow typographic hierarchy. Use a plain-text Vimeo wordmark in the account masthead. Synthetic studio name: Northline Documentary Studio.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#26202C` | Main text |
| Masthead | `#281C2C` | Header and dark player surround |
| On dark | `#FFF9F5` | Header text |
| Canvas | `#F6F1EB` | Workspace background |
| Surface | `#FFFCF8` | Panels and forms |
| Muted | `#6A5C67` | Secondary metadata |
| Border | `#DED3CD` | Dividers |
| Action | `#9C3B2F` | Primary actions, white text |
| Action hover | `#7D2C23` | Primary hover |
| Selection | `#F2DFDA` | Selected row or chip |
| Focus | `#8D3A68` | Focus ring on light surfaces |
| Success | `#26674C` | Positive state |
| Warning | `#804516` | Password mode or contextual warning |
| Error | `#9E3135` | Errors and destructive text |

Use text labels on badges and a contrasting pale ring on dark surfaces. Use neutral privacy pills with distinct icons and full labels.

## Typography

| Role | Face | Size / line height | Weight |
| --- | --- | --- | --- |
| Plain-text wordmark | System sans | 23 / 28px | 750 |
| Page title | Georgia, serif | 42 / 46px | 400 |
| Panel heading | System sans | 20 / 26px | 650 |
| Card title | System sans | 16 / 22px | 650 |
| Body and controls | System sans | 14 / 20px | 400–600 |
| Metadata | System sans | 12 / 17px | 500 |
| Timeline | System monospace | 12 / 17px | 500 |

Use 34 / 40px page titles below 700px. Use system stacks throughout.

## Layout

- Use a 64px horizontal masthead with Vimeo at left, Library and Showcases next, and the account identity at right. Place a labeled Upload video or New showcase action in the relevant page heading. Wrap navigation to a second line when space runs out.
- Center a content area of up to 1440px with 40px desktop, 24px medium, and 16px narrow padding. Use an 8px spacing scale.
- Give Library a concise page heading followed by a 48px search and filter strip, then its count and 16:9 cards. Use a 20px gap and a responsive 240px minimum card width. The compact list view uses aligned thumbnail, title, privacy, date, and overflow columns.
- Give video details breadcrumbs and a title row with Review and Share actions. Use an approximately 7:4 preview-to-metadata split on wide screens. In Review, reserve 360px for the comments panel and give the timeline the width of the preview. Stack panels below 960px.
- Give Showcases the same masthead and a two- to four-column cover grid. In the editor put settings next to a larger ordered member list. Show each member's thumbnail, title and move/remove controls. Stack panels below 960px.

## Components

- Buttons and fields are at least 40px high with 8px radius. Use aubergine text on outlined secondary buttons and rust fill on the primary action. Provide a 2px focus outline, visible labels, and text for state-changing controls.
- Cards use 12px radius, 1px borders, square-edged interior dividers, and 16px metadata padding. Place duration on the lower-right of the thumbnail as light monospace type on a dark filled pill.
- Open Share from a labeled button in a contained panel. Use a centered dialog up to 520px wide for confirmations and up to 680px for Add videos. Trap focus, support Escape, and restore focus on close. Keep inline errors near controls and announce saved results politely.
- Use `0 1px 3px #281C2C14` for subtle panel elevation and `0 16px 48px #281C2C26` for dialogs. The dark player has a visible scrub track and timestamp marker buttons with accessible names.
- Use operational copy only. Empty states identify the missing content and link to the next available action. Preserve text wrapping for long injected titles and comments.

## Original local imagery

Create original 16:9 frames for the seed catalog and store them under `public/media/`. Use cinematic scenes appropriate to the studio's films, such as fog above a marsh, hands fitting a letterpress block, a lit cinema at dusk, and an abstract stage-light study. Supply enough compositions and crops to distinguish rows visually. Group the imagery by subject rather than using identical placeholder gradients. Add a short original local clip or clips to support playback and review. Use a locally created fallback for missing thumbnail keys. Keep all media original and local.
