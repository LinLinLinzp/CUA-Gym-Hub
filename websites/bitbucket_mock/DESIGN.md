# Design system inspired by Bitbucket Cloud

## 1. Visual theme and atmosphere

Build an original, light interface for a workspace that handles source browsing, code review and CI. Retain the established workflow labels, blue actions, readable data density, diff markers and status language. Use a dark navy app bar, pale blue rail, horizontal repository tabs and rounded bordered content panels for its own visual identity.

The release screenshots show a search-led workspace shell, dense result lists, a separate pull request diff, and Pipelines with text status labels and step logs. Preserve those visual hierarchies. The measurements and colors below are implementation targets for this design. [Bitbucket navigation release](https://www.atlassian.com/blog/bitbucket/bitbucket-new-navigation-is-here) · [Pull request experience](https://www.atlassian.com/blog/bitbucket/new-pull-request-experience) · [Pipelines refresh](https://www.atlassian.com/blog/bitbucket/a-fresh-look-for-bitbucket-pipelines)

## 2. Color palette and roles

| Token | Hex | Role |
| --- | --- | --- |
| `--brand` | `#1461DA` | Primary actions, focus indicators and selection |
| `--brand-hover` | `#104FAF` | Primary button hover |
| `--link` | `#1555B6` | Inline links and actionable metadata on light surfaces |
| `--app-bar` | `#142744` | Persistent top bar with white foreground |
| `--canvas` | `#F6F8FC` | Main background |
| `--rail` | `#EAF0FA` | Workspace navigation |
| `--surface` | `#FFFFFF` | Content panels, menus, dialogs and form fields |
| `--text` | `#1D2C42` | Body and headings |
| `--muted` | `#52647D` | Metadata, helper copy and subtitles |
| `--border` | `#D5DDEA` | Panel edges and row separators |
| `--input-border` | `#7487A2` | Input boundaries on white |
| `--selected-bg` | `#D7E7FF` | Active rail item, selected step or branch |
| `--hover-bg` | `#F0F5FC` | Hovered rows and secondary actions |
| `--success` / `--success-bg` | `#17634D` / `#E4F4ED` | Successful, merged, approved and completed |
| `--warning` / `--warning-bg` | `#815000` / `#FFF0D6` | Requested changes, pending |
| `--danger` / `--danger-bg` | `#A62D3F` / `#FCE9ED` | Failed, declined, destructive controls and removed diff lines |
| `--running` / `--running-bg` | `#1951A4` / `#E3EEFF` | In progress or open |
| `--neutral` / `--neutral-bg` | `#465774` / `#E8EDF5` | Stopped, skipped, branch and trigger badges |
| `--log-dark` / `--log-dark-text` | `#162338` / `#E0EAFE` | Dark log output, if a log theme control is added |

Use status text and icons wherever status changes the available actions. In diffs, prefix additions and deletions with `+` and `−`, then apply the matching background. Use muted gutters with distinct old and new line numbers.

## 3. Typography rules

Use `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` and `ui-monospace, "SFMono-Regular", Consolas, monospace`. All text must render offline.

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Sans | 18 px | 700 | 24 px | -0.02em |
| Page heading | Sans | 28 px | 700 | 36 px | -0.025em |
| Section heading | Sans | 18 px | 650 | 26 px | -0.01em |
| Row title | Sans | 14 px | 600 | 20 px | 0 |
| Body and controls | Sans | 14 px | 400 or 600 | 20 px | 0 |
| Breadcrumb, secondary metadata | Sans | 12 px | 500 | 18 px | 0 |
| Code, hashes and logs | Monospace | 13 px | 400 | 20 px | 0 |

## 4. Spacing and layout

- Use a 4 px spacing unit with 8 px between related controls, 16 px panel padding, 24 px between panels and 32 px desktop page margins.
- Top bar is 56 px high. Place the 18 px Bitbucket wordmark and workspace switcher left, search at center (up to 520 px wide), and Create plus the user avatar right. Use a local icon set for navigation affordances.
- Below the bar, the 224 px fixed-layout workspace rail holds entries of at least 40 px height. Use a 3 px blue indicator for the current selection, a padded rounded item, and readable focus styles. Repository routes expose a 44 px horizontal tab strip below the repository heading.
- Use a workspace main column with `min-width: 0`, 32 px side padding and 24 px top padding. Directory rows use a 48 px minimum height, growing when titles wrap. Keep headings, filters and action groups in the same order on empty and populated screens.
- On PR Overview use an activity column and an independent 288 px details panel. Files changed uses a 224 px file pane and flexible diff body. Pipeline results use a 280 px step/summary pane and flexible log body. Scroll code and logs within their panels.
- Below 1024 px collapse the rail into a menu and stack auxiliary detail panels when the main reading column would be below 480 px. Below 640 px use 16 px main margins, wrap filter controls and keep essential actions visible. Allow denser tables and code panes to scroll horizontally within their panels.

## 5. Component patterns

| Component | Properties and behavior |
| --- | --- |
| Primary button | `min-height: 36px`, `padding: 0 14px`, `border-radius: 8px`, brand fill, white text and brand-hover fill. Render destructive confirms in the danger color. |
| Secondary button | Same geometry, surface fill, neutral text and 1 px border. Hover uses `--hover-bg`. Icon-only controls have accessible names and an obvious focus state. |
| Inputs and selectors | `min-height: 36px`, `padding: 0 10px`, `border: 1px solid var(--input-border)`, `border-radius: 8px`. Use a visible label, a 2 px focus indicator and an adjacent error message. Textareas use at least 96 px height. |
| Navigation and tabs | Workspace rail selection uses `--selected-bg`. Repository and detail tabs use a 3 px underline and semibold label. Use `aria-current` for page links and an accessible tabs pattern for inline panels. |
| Cards, lists and tables | `border: 1px solid var(--border)`, `border-radius: 12px`, white fill. Use plain row separators, a low-contrast table header and clear link or button hit targets. Branch badges use monospace only where helpful for scanning. |
| Status pill and avatar | Pill `border-radius: 999px`, 12 px text, 18 px minimum height and 8 px horizontal padding. Avatar is a 24 px circle with local initials. Reviewer labels give the name and status in accessible text. |
| Dialog and popover | Dialog `width: min(560px, calc(100vw - 32px))`, 24 px padding, 12 px radius, title in 18 px type and actions right aligned. Overlay `rgb(20 39 68 / 42%)`. Give dialogs initial focus, Escape dismissal and restored trigger focus. Popovers use 8 px padding around the option group and a 10 px radius. |
| Code, diff and log sections | Align gutters and monospace content, keep source text selectable, and give each log section a status icon, duration and keyboard-operable expand button. Default logs to a light neutral panel with text in `--text`. |
| Feedback | Use inline errors for validation, collected checks in the merge panel, and brief accessible success feedback after a committed action. Success is also reflected immediately in the corresponding list or detail view. |

## 6. Shadow and elevation

Use a border for table and content panels. For floating menus use `0 10px 24px rgb(23 42 69 / 16%), 0 2px 4px rgb(23 42 69 / 10%)`. For modal dialogs use `0 24px 64px rgb(23 42 69 / 24%)`. Keep sticky headers above list content and below open menus and dialogs.
