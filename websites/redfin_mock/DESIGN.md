# Redfin account design

## Visual theme

Design My Redfin as a home-buying journal. Use warm paper, evergreen text, wide property images, and a muted brick-red action color. Set the name `Redfin` in text in the masthead. A horizontal account navigation and a split overview establish an original layout. Use the same shell for every view so the buyer can move between a listing and account activity without looking for a menu.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F7F4EE` | Page background |
| Surface | `#FFFFFF` | Forms and property cards |
| Soft surface | `#ECEFE7` | Tour and agent panels |
| Text | `#202B26` | Headings and body |
| Muted text | `#54635B` | Metadata and secondary copy |
| Brand and primary action | `#A7332F` | Wordmark, primary buttons, selected hearts |
| Primary hover | `#892825` | Hover and pressed action |
| Link and focus | `#24574C` | Text links and keyboard focus |
| Decorative divider | `#DFDCD3` | Card outlines and row dividers |
| Field border | `#7C847D` | Form controls |
| Success | `#285340` on `#E4EEE6` | Confirmed, sent, accepted |
| Pending | `#65490E` on `#FAEDCF` | Requested, submitted |
| Error | `#8D2928` on `#F9E6E3` | Errors, canceled, withdrawn |

## Typography

| Role | Font stack | Size / leading | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | `system-ui, sans-serif` | 26 / 30px | 750 | −0.05em |
| Page heading | `Georgia, serif` | 48 / 52px | 400 | −0.035em |
| Section heading | `Georgia, serif` | 30 / 36px | 400 | −0.025em |
| Card heading | `system-ui, sans-serif` | 17 / 23px | 650 | −0.015em |
| Body and form inputs | `system-ui, sans-serif` | 16 / 24px | 400 | normal |
| Navigation and buttons | `system-ui, sans-serif` | 14 / 20px | 650 | normal |
| Metadata | `system-ui, sans-serif` | 13 / 19px | 500 | normal |

## Spacing and layout

- Use a 72px masthead with the wordmark left and buyer name with initials right. Place a 48px account nav beneath it with Overview, Saved homes, Tours, Offers, and Messages. Put Browse homes in the masthead on desktop and in the scrollable nav on narrow layouts. Mark the current page with an underline and `aria-current`.
- Center content in a 1,264px maximum-width area with 40px desktop horizontal padding and 32px between sections. Overview uses a two-thirds Saved homes column and one-third activity stack with a 24px gutter. Below 900px, collapse the overview to one column and the browse grid to two. Below 600px, use a single property column, 16px gutters, and a 36px page heading.
- The property grid uses three columns and 20px gaps at desktop widths. Cards use a 14px radius, a 16:10 image area, and 16px internal padding. Reserve image height to prevent layout shifts. Show asking price prominently, followed by street address and a line of beds, baths, and square footage.
- Tour and offer queues use scan-friendly rows with 14px vertical padding. Keep the listing address, status, and primary action visible at mobile widths by letting facts wrap naturally. Messages use a 320px conversation list beside a flexible thread. On narrow screens use separate list and detail views with a Messages back link.

## Components and interaction

- Primary buttons use brick red with white type, a 44px minimum height, 16px horizontal padding, and a 9px radius. Secondary buttons use a white surface and a 1px field border. Give destructive actions an explicit label like **Cancel tour** and a confirmation dialog.
- Listing hearts use a 44px white touch target at the upper-right of the image. Name the control `Save [address]` or `Remove [address] from saved homes` and expose selection with `aria-pressed`. Use both icon fill and the accessible state.
- Inputs use a visible label, 44px minimum height, 12px horizontal padding, and an 8px radius. Put errors under the matching field and link them with `aria-describedby`. Use a 2px focus ring with a 3px offset. Status chips always contain text.
- Use dialogs up to 560px wide for tour and offer forms, with a scrollable body and visible cancel and submit actions. Move focus into a dialog when it opens, trap focus, and restore focus when it closes. Report successful mutations with a polite live region and update the relevant row or card immediately.
- Keep card shadow at `0 2px 8px rgb(32 43 38 / 5%)` and dialog shadow at `0 24px 64px rgb(32 43 38 / 20%)`. Use a `rgb(32 43 38 / 48%)` overlay. Respect reduced-motion preferences.

## Local imagery

Create an original local set of Pacific Northwest home exteriors representing craftsman, modern townhouse, split-level, brick bungalow, condo, and contemporary detached homes. Use generated raster imagery with consistent daylight and no visible logos or listing overlays. Store local WebP files under `public/homes/` and assign them by fixed listing IDs. Reuse the asset set across the browse, detail, and account views. Provide a neutral fallback treatment when an injected listing has no valid local asset. Agent avatars can use initials with fixed palette colors.
