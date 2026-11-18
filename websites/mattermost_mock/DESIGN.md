# Design System Inspired by Mattermost

## 1. Visual theme and atmosphere

Use Mattermost's Denim appearance: navy navigation surrounding a quiet white, dense conversation workspace. Compact icon controls, strong text hierarchy, thin borders and ample line height distinguish it from a dashboard of floating cards. Desktop channels, threads, pinned messages and file sharing are the visual priorities.

Primary layout reference: `assets/screenshots/channel_view_thread_rhs_denim.jpg` (2002×1126); inbox reference: `doc_crt-thread-view.jpg` (1280×800). Both were visually inspected. Reference screenshots come from different releases and display scales: the full-frame image includes a native desktop tab strip, which must be omitted in this browser app. Use proportions below at browser CSS scale rather than copying screenshot pixel dimensions. Tokens are implementation targets estimated from the images, not measurements asserted to come from a live account or official token export. Prefer current documented behavior when older screenshot chrome differs.

## 2. Color palette and roles

### Primary

- **Brand/action blue** `#1C58D9`: primary buttons, selected controls, links.
- **Global header** `#14213D`: darkest navy topbar.
- **Team rail** `#192A4D`: vertical rail background.
- **Sidebar** `#1E325C`: channel navigation background.
- **Background** `#FFFFFF`: message surfaces and panes.
- **Text primary** `#3D3C40`: body, headings, author names.

### Accent

- **Sidebar text** `#B8C2D6`: inactive names and category headings.
- **Sidebar active text** `#FFFFFF`: current channel and unread names.
- **Active stripe** `#5D89EA`: 3px left edge on selected channel.
- **Mention/link blue** `#3868A8`: inline mentions and references.

### Interactive

- **Sidebar hover** `rgba(255,255,255,.08)`; selected `rgba(255,255,255,.16)`.
- **Surface hover** `#F5F6F8`; selected chip/result `#EDF2FA`.
- **Button hover** `#1649B5`; disabled background `#E8EBF0`, disabled text `#A0A4AD`.
- **Focus** `0 0 0 2px #FFFFFF, 0 0 0 4px #1C58D9`.

### Surface and borders

- **Secondary surface** `#F8F9FB`: pane headers, hover toolbar, attachment metadata area.
- **Border** `#E0E1E5`: 1px pane separators, cards and inputs.
- **Muted text** `#767881`; placeholder `#8B8D95`.
- **Backdrop** `rgba(0,0,0,.48)`.
- **Pinned strip** `#FFF4D6`; pinned icon/divider `#AD8A2B`.
- **Code** background `#F1F2F4`, text `#C34E66` for inline code.

### Status

- **Success/online** `#3DB887`; **warning/away** `#E8B33F`; **error/DND** `#D64550`; **offline** `#8B8D95`.
- Status is an icon plus meaningful label, never color alone.

## 3. Typography rules

Use locally installed `@fontsource/open-sans` (400/600/700) for UI/body with `Arial, sans-serif` fallback. Headings can use locally installed Metropolis if already available; otherwise use Open Sans 600. Do not download runtime fonts. These choices are reconstruction targets from the inspected images, not verified font metadata.

| Role | Font | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| Team heading | Open Sans | 16px | 600 | 24px | 0 |
| Channel heading | Open Sans | 16px | 600 | 24px | 0 |
| Dialog heading | Open Sans | 20px | 600 | 28px | -.2px |
| Author | Open Sans | 14px | 600 | 20px | 0 |
| Message body | Open Sans | 14px | 400 | 22px | 0 |
| Sidebar item | Open Sans | 14px | 400/600 unread | 28px | 0 |
| Category | Open Sans | 11px | 600 | 20px | .4px; uppercase |
| Timestamp/metadata | Open Sans | 12px | 400 | 18px | 0 |
| Button/menu | Open Sans | 14px | 600/400 | 20px | 0 |
| Code | ui-monospace, monospace | 13px | 400 | 20px | 0 |

## 4. Spacing and layout

- Full viewport, no outer margins. `box-sizing:border-box`; minimum usable desktop viewport 1024×700. Baseline visual checks 1440×900 and 1280×800.
- Topbar 40px tall, spans viewport; app switcher/Channels/back-forward at left, search centered across content (`width:min(600px,45vw)`, 28px high), help/mentions/saved/settings/avatar at right.
- Team rail 64px wide below topbar; 40px team tiles with 12px inset, 12px gap and selected rounded outline. Sidebar 240px wide below topbar, left of content.
- Sidebar team header 56px; Find channels input 28px; 8–16px section insets; channel row 28px; DM avatars 20px; row ellipsis for long names. Sidebar scroll independent of center.
- Channel header 64px high with title/star first row and member/pin/files/header context second row; 16px horizontal padding. A bookmark strip, if implemented, is 32px below header.
- Main flex child `min-width:0`, fills remaining height. Timeline scrolls independently; flex sticky composer below, 16px left/right/bottom inset. Timeline 20px horizontal inset; avatar column 44px including gutter; adjacent message groups 16px apart, same-author successive lines 4px.
- Avatar 32px circle in normal rows; author/timestamp on a single baseline. Date separators 12px muted label centered between 1px lines; New Messages uses gold line/label.
- Right pane width 400px at 1440px viewport, min 340px if space is limited; border-left 1px. Pane header 48–64px, 16px inset; body has own scroll; reply composer 12px inset. One pane at a time.
- Threads inbox replaces center timeline with a roughly 360px root list and remaining-width selected discussion; no second nested thread pane. Cards are separated rows with 16px padding, selected pale blue.
- Browse channels is a wide main view or 840px dialog, 48px heading area, 40px search/filter row and 64px result rows; do not compress it into a dropdown.
- Standard dialog width 600px, max `calc(100vw - 32px)`, max-height `calc(100vh - 64px)`; settings width 880px with 200px left navigation. Dialog padding 24px, footer gap 8px.
- Spacing scale 4/8/12/16/20/24/32px. Input/button radius 4px, dialog 8px, avatar 50%, file cards 4px. Avoid large rounded cards across the timeline.
- Below 1000px, right pane overlays content (without reducing center to unusable width); below 760px, rail/sidebar become drawer and thread/files/pins use full-width screens. Back controls preserve source.

## 5. Component patterns

- **Primary button:** height 36px; padding `0 16px`; blue fill, white 14px/600; border `1px solid transparent`; radius 4px. Secondary: white with `1px solid #D2D5DC`, primary text. Destructive: error red with explicit confirmation dialog. Disabled buttons use actual `disabled` semantics.
- **Icon button:** 28–32px square, 18–20px line icon, transparent background, 4px radius; hover pale gray on white, translucent white on navy; accessible label and 500ms transient tooltip. No persistent state driven by tooltip timer.
- **Inputs:** 40px high, 12px padding, 1px gray border; focus blue border/outline; labels 12px semibold above; errors 12px red below. Textarea min-height 80px. Search has leading magnifier and clear X.
- **Composer:** `border:2px solid #DCDDDF`, radius 4px, white; focus-within blue. Body min-height 56px and max-height 180px with scroll. Footer 32px with formatting, paperclip, emoji, send. Attachment chips above footer use file icon, title, size, X and real transient progress. Thread placeholder `Reply to this thread...`.
- **Message row:** hover/focus background `#F8F9FB`; toolbar absolutely positioned top-right, white 1px border, small shadow, 28px icon buttons. Hide until hover or keyboard focus. More menu 220px wide; rows 32px; separators and red Delete. Menus include Reply, Mark as Unread, Save Message, Pin to Channel, Copy Link, Edit, Delete as permissions permit.
- **Reaction:** 24px high rounded 4px pill with emoji+12px count; gray background, own reaction pale blue with blue border. Add-reaction outlined icon beside pills.
- **Thread summary:** participant avatars 16px slightly overlapped, blue unread dot, blue `N replies`, optional `Following` pale-blue chip and muted latest reply time. Click target also keyboard-operable.
- **Pinned message:** thin pale gold band and small pin label; preserve ordinary post hierarchy, avoid huge yellow cards. Pane rows use compact author/time, message content, source jump and More.
- **File card:** document attachment 280×64px maximum width 100%; 32px type icon, 14px semibold filename, 12px muted metadata; 1px border and subtle shadow. Images max-width 360px, max-height 240px with `object-fit:contain`, bounded preview. Keep bytes/title visible for all nonimages.
- **Settings:** left vertical tabs and right sections with label/value/Edit or proper controls; blue Save/footer Cancel. Old aubergine screenshot is not the visual target.
- **Empty states:** restrained centered icon, title and one useful action, e.g. `No pinned messages yet`/`Browse channels`. Skeleton/loading screen is neutral and never creates seed replacements.

## 6. Shadow and elevation

- Flat timeline and panes; cards `0 1px 3px rgba(0,0,0,.12)`.
- Hover toolbar/popover `0 2px 8px rgba(0,0,0,.16)`; menu z-index 40.
- Overlay pane/drawer `-4px 0 16px rgba(0,0,0,.16)`; z-index 50.
- Dialog `0 12px 32px rgba(0,0,0,.28)`; backdrop z-index 80, dialog 81; tooltip 100, toast 110.

## 7. Reference precedence

1. Full Denim channel + Thread image establishes shell, density, hierarchy and file cards.
2. Official current pin/menu/thread images establish action names and pane behavior; source URLs are in `assets/screenshots/sources.json`.
3. `doc_crt-thread-view.jpg` establishes inbox composition, not a mandatory plugin rail or native window chrome.
4. Search/settings crops establish control arrangement only. Marketing panels, onboarding, old themes, native tabs and unrelated search results are not screens to recreate.
