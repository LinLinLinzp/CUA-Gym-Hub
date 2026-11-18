# Google Search Console design system

## 1. Visual theme and atmosphere

A warm white workspace uses an ink-colored horizontal masthead and indigo actions. Reports read like structured technical documents with strong type hierarchy, compact tables and pale status blocks. Use the full words **Google Search Console** in the masthead, with consistent text treatment across the name. Use locally drawn CSS shapes and a CSS status distribution bar where its segments represent actual fixture counts. Show the account initials in a plain circle.

## 2. Color roles

| Token | Value | Role |
|---|---|---|
| Masthead | `#181D30` | Workspace strip |
| Masthead text | `#F7F8FF` | Brand and account text |
| Canvas | `#F6F5F1` | Main background |
| Surface | `#FFFFFF` | Reports, navigation and sheets |
| Text | `#20263A` | Heading and body |
| Muted text | `#505B72` | Secondary labels and metadata |
| Border | `#DCE0E8` | Card edges and table dividers |
| Primary | `#4144A5` | Actions, links and selected tab |
| Primary hover | `#323583` | Hovered primary action |
| Primary tint | `#EEEDFF` | Selected and pending surfaces |
| Success | `#14634F` on `#E1F4EC` | Verified, indexed, sitemap success |
| Warning | `#774305` on `#FFF0DA` | Issues and unverified account rows |
| Error | `#A1373F` on `#FCEBEC` | Fetch failure, blockers and destructive actions |
| Neutral | `#505B72` on `#EDF0F6` | Unknown states and metadata chips |

Use clear text on every state tag. Use a 2px outline with a 2px offset for visible focus and use a lighter focus color on the dark masthead.

## 3. Typography

Use `"Segoe UI", system-ui, sans-serif` for UI text and `ui-monospace, Consolas, monospace` for URL scope, canonical values and DNS instructions where monospacing aids reading.

| Role | Size | Weight | Line height | Letter spacing |
|---|---:|---:|---:|---:|
| Brand | 18px | 650 | 24px | −0.2px |
| Page title | 34px | 680 | 42px | −0.8px |
| Section title | 20px | 650 | 28px | −0.2px |
| Card number | 30px | 650 | 36px | −0.5px |
| Body and controls | 14px | 400 or 600 | 21px | normal |
| Table label and metadata | 12px | 600 | 18px | 0.1px |

Use tabular numerals for counts, dates and pagination. Allow long URLs to wrap in result headings and detail views. A table can truncate a long URL when the full text remains available on opening its row.

## 4. Layout and spacing

- **Workspace strip.** 60px minimum height. Center the content within a 1360px maximum width with 32px horizontal gutters at desktop widths. Put brand and property control on the left, account identity on the right.
- **Navigation and inspection.** 58px minimum height and white surface. Place Overview, Properties, URL Inspection and Sitemaps on the left. Place the global inspection form on the right, roughly 400px wide with a visible submit button.
- **Main canvas.** 1320px maximum content width with 32px side gutters, 36px top spacing, 24px between major sections and 16px between closely related controls. Use two equal-width overview cards and a full-width recent-inspections table.
- **Reports.** 12px card radius, typically 20px card padding, 44px header height and 48px minimum body-row height in tables. Keep pagination and page-size or result counts together in the footer. Details use full-width status cards with aligned key/value fields.
- **Smaller screens.** Below 920px, put inspection on its own row beneath navigation. Below 640px, use 16px side gutters and stack overview cards and form controls as needed. Keep long tables scrollable within their own region and maintain visible navigation and labels.

## 5. Components

- **Buttons and inputs.** 40px minimum height, 7px radius and 12px horizontal padding. Primary buttons have solid indigo and white text. Secondary buttons have white surface, border and dark text. Use concise form labels and place errors below their input with accessible descriptions.
- **Property selector.** The workspace button opens a searchable popover up to 360px wide. Scroll the list in place and anchor the Add property action at its foot. Use the property's title and type on each row and text for its current or pending state.
- **Property add and verification.** Use a right-aligned sheet up to 480px wide with 24px padding. Stack two radio choices above the scope input. Keep the active step as the heading and the action row reachable when content scrolls. Present synthetic verification instructions and a method-specific value in a copyable monospace block.
- **Status and inspection panels.** Use short title-case status text with optional counts, a 12px radius on the containing card and an unobtrusive tint. Separate Google Index and Live Test with text tabs and a 3px active underline. Show inline queued and blocked messaging near the action.
- **Tables, confirmations and feedback.** Use table headers as sort buttons with a visible direction indicator. Use explicit detail links in cells. Confirm removal in a centered dialog up to 420px wide with the target scope or URL visible. On dismissal, restore focus to the opener when it remains available. Announce result notifications in a live region.

## 6. Elevation

Use a 1px border for resting surfaces, `0 8px 24px rgba(24,29,48,.14)` for a popover, `0 12px 42px rgba(24,29,48,.24)` for a sheet or modal, and a `rgba(24,29,48,.40)` overlay behind modal surfaces. Keep layout steady while data boots, with a neutral loading indicator and reduced-motion support.
