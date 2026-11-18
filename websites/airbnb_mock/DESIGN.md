# Design System Inspired by Airbnb

> Sources: reference screenshots in `assets/screenshots/` (filters modal, home search bar + guest picker,
> search list + map, reservation confirmed), public reconstructions of Airbnb's DLS (Rausch / Hof / Foggy
> palette, Cereal type scale), and live-site measurements. The 2025 "Summer Release" redesign is the target:
> Homes / Experiences / Services tabs, carousels on the home page, list-plus-map search, total-price display.

## 1. Visual Theme & Atmosphere

Airbnb is a photo-first, white-canvas product. Almost every surface is pure white, text is warm near-black
(`#222222`), and the only saturated colour is **Rausch** pink-red (`#FF385C`). It is used sparingly: the
search button, the Reserve/Confirm CTA (as a gradient), the logo, a saved-heart fill, and focus states in a
few places. Visual weight comes from large rounded photos, generous white space and thin `#DDDDDD` dividers
rather than from heavy shadows or coloured panels.

Corners are soft everywhere (8–12px on controls/cards, fully rounded pills for the search bar, chips and map
pins). Shadows are subtle and reserved for floating elements (search pill, popovers, the sticky reserve card,
modals). Typography is a single geometric sans (Airbnb Cereal) used at moderate weights — 400 body, 500/600
for titles and prices; nothing is heavier than 700 and nothing is ALL CAPS except tiny legal text.

## 2. Color Palette & Roles

### Primary
- **Rausch / Brand** (`#FF385C`): logo, search button, saved-heart fill, active map pin ring, small brand accents
- **Rausch Dark** (`#E00B41`): hover/pressed for Rausch buttons
- **Reserve gradient**: `linear-gradient(to right, #E61E4D 0%, #E31C5F 50%, #D70466 100%)` — Reserve, Confirm and pay, Request to book, Submit review
- **Background** (`#FFFFFF`): page and card background
- **Text Primary / Hof** (`#222222`): all headings, body, icons, links (links are #222 + underline)
- **Text Secondary / Foggy** (`#6A6A6A`): card subtitles, helper text, meta lines, placeholders in the search pill

### Accent
- **Guest favorite / Superhost** (`#222222` text on white pill; Superhost medal icon `#FF385C`)
- **Luxe purple** (`#460479`) — "Luxe" standout-stay label only
- **Discount strike** (`#6A6A6A` with `text-decoration: line-through`) — original price before discount

### Interactive
- **Primary dark button** (`#222222` bg, white text): "Show 1,000+ places", "Save", "Continue", "Send", "Done"
- **Primary dark hover** (`#000000`)
- **Secondary / outline button**: white bg, `1px solid #222222`, text `#222222`; hover bg `#F7F7F7`
- **Text button / link**: `#222222`, underline, weight 600; hover bg `#F7F7F7` rounded 8px (e.g. "Clear all", "Show more")
- **Focus ring**: `0 0 0 2px #FFFFFF, 0 0 0 4px #222222`
- **Hover surface** (`#F7F7F7`): menu rows, icon buttons, inactive search segments
- **Active search segment** (`#FFFFFF` on a `#EBEBEB` pill) — when one segment of the expanded search bar is open the pill turns `#EBEBEB` and the active segment is white with shadow

### Surface & Borders
- **Card / Surface** (`#FFFFFF`)
- **Subtle surface** (`#F7F7F7`): message bubbles from others, skeletons, chip hover, calendar in-range
- **Suggested destination tile** (`#F0ECE7`): warm neutral background for the Where panel's destination icon tiles
- **Border default** (`#DDDDDD`): section dividers, card outlines (reserve card, wishlist dialog rows)
- **Border light** (`#EBEBEB`): header bottom border, list separators
- **Input border** (`#B0B0B0`): text inputs, steppers (circle buttons), checkboxes
- **Disabled** (`#EBEBEB` bg / `#B0B0B0` text or border): disabled stepper −, past calendar days

### Status
- **Success** (`#008A05`): "Free cancellation" emphasis (rare), success icons in toasts
- **Warning** (`#E07912`): "Rare find" / low-availability notes, expiring review window
- **Warning tint** (`#FFF3E9`): pending-reservation status pill background, paired with Warning text
- **Error** (`#C13515`): form validation text + icon, error borders (`2px solid #C13515`, bg `#FFF8F6`)
- **Info** (`#428BFF`): info icons (rare)
- **Unread badge** (`#FF385C` dot 8px, or numeric badge 18px tall white text on `#FF385C`)

### Offline map palette (no remote tiles allowed)
- Land `#F3F1EC`, parks `#D8EBC9`, water `#AADAFF`, major road `#FFFFFF` with `#E3E0DA` casing, minor road `#FBFAF8`, labels `#6A6A6A` 12px

## 3. Typography Rules

Font: Airbnb Cereal is proprietary — bundle **`@fontsource-variable/dm-sans`** (closest open geometric sans) and set
`font-family: "Airbnb Cereal VF", "DM Sans Variable", "DM Sans", Circular, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;`
No Google Fonts / CDN links (Harbor contract).

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Checkout / page H1 ("Confirm and pay", "Trips", "Wishlists") | DM Sans | 32px | 600 | 36px | -0.02em |
| Listing title H1 | DM Sans | 26px | 600 | 30px | -0.01em |
| Section H2 ("What this place offers") | DM Sans | 22px | 600 | 26px | -0.01em |
| Carousel row title ("Popular homes in Asheville ›") | DM Sans | 20px | 600 | 24px | normal |
| Card title ("Cabin in Asheville") | DM Sans | 15px | 600 | 19px | normal |
| Card meta / subtitle | DM Sans | 15px | 400 | 19px | normal, color #6A6A6A |
| Body (description, messages) | DM Sans | 16px | 400 | 24px | normal |
| Secondary body | DM Sans | 14px | 400 | 18px | normal |
| Price (card) | DM Sans | 15px | 600 (amount) / 400 ("for 3 nights") | 19px | normal |
| Price (reserve card) | DM Sans | 22px | 600 | 26px | normal |
| Search pill label ("Where", "Check in") | DM Sans | 12px | 600 | 16px | normal |
| Search pill value / placeholder | DM Sans | 14px | 400 | 18px | normal (#6A6A6A placeholder) |
| Button primary | DM Sans | 16px | 600 | 20px | normal |
| Button small / chip | DM Sans | 14px | 500 | 18px | normal |
| Caption / badge | DM Sans | 12px | 600 | 16px | normal |
| Legal / footer | DM Sans | 14px | 400 | 18px | normal |

## 4. Spacing & Layout

- Base unit: 4px. Common steps 4, 8, 12, 16, 24, 32, 48, 64, 80.
- **Page gutters**: 80px ≥1440px, 40px 744–1439px, 24px <744px. Max width: 2520px for browse pages; **1120px** centered for listing, checkout, trip detail; 1280px for wishlists/trips grid.
- **Header (home, expanded)**: total ~178px — top row 80px (logo / tabs / right menu) + search pill 66px + 32px bottom padding; bottom border `1px solid #EBEBEB`.
- **Header (compact, all other pages)**: 80px tall, compact search pill 48px tall centered.
- **Expanded search pill**: width 850px, height 66px, radius 9999px, border `1px solid #DDDDDD`, shadow (see §6). Segments: Where 1.6fr, Check in 1fr, Check out 1fr, Who 1.4fr; inner padding 14px 32px; dividers 1px #DDDDDD 32px tall (hidden next to hovered/active segment). Search button 48px circle `#FF385C` inside right padding 8px; expands to pill with "Search" label (icon + text) when any segment is active.
- **Home carousels**: row title 20px/600 + "›" link; right side two 32px circle arrow buttons; cards 7 per row ≥1640, 6 ≥1440, 5 ≥1128, 4 ≥950, 3 ≥744, 2 below; column gap 16px; rows separated by 40px.
- **Search results**: list column = 58% of width (padding-left 80px → 24px right), map column 42% sticky (top 80px, height calc(100vh − 80px)), map radius 0 on desktop. List grid 3 columns ≥1440, 2 ≥950; column gap 24px; row gap 40px. Paging 18 per page.
- **Card image** aspect ratio 20:19 (search & home), radius 16px (home) / 12px (search, wishlist), image dots (5 max) bottom center, heart 24px at top 16px right 16px, badge top 16px left 16px.
- **Listing page**: photo grid 1120×~560px — one 50% hero + 2×2 grid, gap 8px, outer radius 12px (only outer corners). Content split 58% / 33% with 8% gap; reserve card sticky top 104px (80 header + 24).
- **Checkout**: two columns 1fr / 0.85fr, gap 96px; right card sticky top 104px; left sections separated by 1px #DDDDDD with 32px vertical padding.
- **Messages**: three panes — list 375px, thread flex 1, details 375px (collapsible); full height under 80px header.
- **Border radius**: buttons 8px; inputs 8px; cards 12–16px; modals 12px (filters/wishlist/review), 16px for the "Share" sheet; chips/pills 9999px; stepper buttons 32px circles; avatars 50%.
- **Modal widths**: Filters 780px (max-height 90vh, header 64px, footer 80px); Save-to-wishlist 568px; Create wishlist 568px; Share 568px; Photo tour full-screen white.

## 5. Component Patterns

### Buttons
```css
.btn-primary-brand { background: linear-gradient(to right,#E61E4D 0%,#E31C5F 50%,#D70466 100%); color:#fff; border:0; border-radius:8px; padding:14px 24px; font:600 16px/20px var(--font); }
.btn-primary-brand:hover { background-position: 100% 50%; filter: brightness(0.98); }
.btn-primary-dark { background:#222; color:#fff; border-radius:8px; padding:14px 24px; font:600 16px/20px var(--font); }
.btn-primary-dark:hover { background:#000; }
.btn-primary-dark:disabled { background:#DDDDDD; color:#fff; cursor:not-allowed; }
.btn-outline { background:#fff; border:1px solid #222; color:#222; border-radius:8px; padding:13px 23px; font:600 16px/20px var(--font); }
.btn-outline:hover { background:#F7F7F7; }
.btn-text { background:none; border:0; color:#222; text-decoration:underline; font-weight:600; padding:10px; margin:-10px; border-radius:8px; }
.btn-text:hover { background:#F7F7F7; }
.icon-btn { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; }
.icon-btn:hover { background:#F7F7F7; }
```

### Inputs (Airbnb floating-label inputs)
```css
.field { border:1px solid #B0B0B0; border-radius:8px; padding:26px 12px 10px; position:relative; }
.field label { position:absolute; top:8px; left:12px; font:400 12px/16px var(--font); color:#6A6A6A; }
.field input { border:0; outline:0; font:400 16px/20px var(--font); color:#222; width:100%; }
.field:focus-within { box-shadow:0 0 0 2px #222; border-color:transparent; }
.field.error { border:2px solid #C13515; background:#FFF8F6; }
.field-error-text { color:#C13515; font:400 12px/16px var(--font); display:flex; gap:8px; margin-top:8px; }
```
Stacked fields (card number / expiration / CVV) share borders: top field radius 8px 8px 0 0, bottom 0 0 8px 8px.

### Stepper (guests, rooms & beds)
32px circle, `1px solid #B0B0B0`, icon 12px #6A6A6A; hover border #222; disabled border #EBEBEB icon #EBEBEB, cursor not-allowed. Value 16px #222, min-width 32px centered.

### Chips (filters, amenities)
`border:1px solid #DDDDDD; border-radius:9999px; padding:10px 16px; font:400 14px/18px; icon 20px left`. Hover border #222. Selected: `border:2px solid #222; background:#F7F7F7; padding:9px 15px`.

### Segmented control (Type of place: Any type | Room | Entire home)
Container `background:#F7F7F7; border-radius:12px; padding:4px; height:56px`. Selected segment: white, radius 10px, `box-shadow: 0 0 0 1px #DDDDDD`, text 600. Unselected text #222 400.

### Toggle switch
48×32px track, `#B0B0B0` off / `#222` on, white 28px knob; on-state shows a ✓ in the knob.

### Listing card
- Image carousel (20:19), radius 12–16px; on hover: chevrons (32px white circles, opacity .9, shadow) appear left/right; dots (6px, white, inactive 60% opacity) bottom center.
- Heart: 24px; unsaved = `fill: rgba(0,0,0,0.5); stroke:#fff; stroke-width:2`; saved = `fill:#FF385C; stroke:#fff`. Hover scale 1.04.
- Badge: "Guest favorite" white pill `padding:4px 10px; border-radius:9999px; font:600 13px/16px; box-shadow:0 1px 2px rgba(0,0,0,.18)`.
- Text block (margin-top 12px): row 1 title (`600 15px`, ellipsis) + right `★ 4.92` (and "(128)" on search cards); row 2 subtitle (#6A6A6A, listing name or "Hosted by Tom"); row 3 beds or dates (#6A6A6A); row 4 price: `**$612** for 3 nights` with amount underlined on search when dates are set; or `**$204** night`.

### Map price pin
`height:28px; padding:0 8px; border-radius:9999px; background:#fff; color:#222; font:600 14px/28px; box-shadow:0 0 0 1px rgba(0,0,0,.08),0 2px 4px rgba(0,0,0,.18);` Hover/selected: `background:#222; color:#fff; transform:scale(1.077); z-index:2`. Visited (card previously opened): `background:#EBEBEB`. Saved listing: small Rausch heart before the price.

### Search pill (compact)
48px tall, radius 9999px, border `1px solid #DDDDDD`, shadow `0 1px 2px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.05)`; hover shadow `0 2px 4px rgba(0,0,0,.18)`. Three text buttons: "Anywhere" | "Any week" | "Add guests" (14px 500; last one #6A6A6A 400) separated by 1px #DDDDDD 24px lines, then 32px Rausch circle with white magnifier 12px stroke 4.

### Menu (account dropdown)
Trigger: pill 42px tall, `border:1px solid #DDDDDD; border-radius:9999px; padding:5px 5px 5px 12px; gap:12px` with ☰ 16px icon + 30px avatar; hover shadow `0 2px 4px rgba(0,0,0,.18)`. Panel: width 240px, top 52px right 0, radius 12px, `box-shadow:0 2px 16px rgba(0,0,0,.12)`, padding 8px 0; rows 14px, padding 12px 16px, hover #F7F7F7; bold (600) first group; divider 1px #DDDDDD margin 8px 0.

### Modal
Overlay `rgba(0,0,0,0.5)` (filters / dialogs) with fade 200ms; panel white, radius 12px, slide-up 400ms `cubic-bezier(0.2,0,0,1)`. Header 64px: close ✕ (16px, 32px hit circle, hover #F7F7F7) left, title centered 16px/600, bottom border 1px #EBEBEB. Footer 80px: top border 1px #DDDDDD, "Clear all" text button left, dark primary right. Escape closes.

### Toast
Bottom-left 24px, `background:#222; color:#fff; border-radius:12px; padding:16px 20px; box-shadow:0 8px 28px rgba(0,0,0,.28)`, optional square 40px thumbnail on the left, action link white underlined ("Change", "Undo", "View"). Auto-dismiss 5s (UI only — never writes state).

### Message bubbles
Others: left aligned, avatar 40px + name 14px/600 + time 12px #6A6A6A above text; bubble `background:#F7F7F7; border-radius:16px; padding:12px 16px` max-width 70%. Me: right aligned `background:#222; color:#fff; border-radius:16px` (no avatar). System events (e.g. "Reservation confirmed · Dec 12–15"): centered 12px #6A6A6A with horizontal rules.

### Star rating input (review)
40px stars, outline #222 1.5px, filled #222 (Airbnb uses black stars, not yellow); hover fills up to cursor. Category rows: label 16px left, 5 × 24px stars right.

## 6. Shadow & Elevation

| Element | Shadow |
|---|---|
| Expanded search pill | `0 3px 12px 0 rgba(0,0,0,0.1)` (resting), `0 6px 20px rgba(0,0,0,0.2)` (active panel open) |
| Compact search pill | `0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)` |
| Search panels (where / dates / who) | `0 6px 20px rgba(0,0,0,0.2)`, radius 32px |
| Dropdown / popover / account menu | `0 2px 16px rgba(0,0,0,0.12)` |
| Reserve card (sticky) | `0 6px 16px rgba(0,0,0,0.12)` + `1px solid #DDDDDD` |
| Modal | `0 8px 28px rgba(0,0,0,0.28)` |
| Map pin | `0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.18)` |
| Carousel arrow / image chevron | `0 0 0 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.18)` |
| Header on scroll (home) | none — only `border-bottom:1px solid #EBEBEB` |

## 7. Iconography & Imagery

- Line icons, 1.5–2px stroke, 16–24px, colour #222 (use `lucide-react` with `strokeWidth={1.75}`).
- Logo: inline SVG Bélo mark (Rausch, 32px tall) + wordmark "airbnb" in Rausch, 700, 22px, letter-spacing -0.02em. Below 1128px show only the Bélo.
- Listing photos: local JPGs from `public/images/listings/` (copied from `assets/listing_photos/`). Never remote URLs.
- Avatars: generated circles with initials (white 600 text) on a deterministic colour from `['#222222','#484848','#6A6A6A','#008489','#A61D55','#D93900','#C13515','#428BFF','#460479','#00A699']`.
- 2025 header tabs use illustrated 3D-ish icons (house / hot-air balloon / bell). Recreate as small inline SVG/emoji-free illustrations 48px (house roof in warm tones, balloon in Rausch/teal, service bell in grey-gold); active tab label #222 600 with 2px #222 underline, inactive #6A6A6A 500.

## 8. Motion

- Hover transitions 150–200ms ease; search panel open 200ms `cubic-bezier(0.2,0,0,1)`; modal 400ms.
- Heart save: scale 0.8 → 1.15 → 1 over 300ms.
- Respect `prefers-reduced-motion`.
