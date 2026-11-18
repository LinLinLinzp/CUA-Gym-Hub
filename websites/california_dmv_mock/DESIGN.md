# Design system inspired by California DMV

## 1. Visual theme and atmosphere

The service portal should feel like a California public-service site. Use the California DMV name, plain service labels, blue wayfinding, generous section spacing and clear forms. Home is a compact service directory. Each transaction starts with the user's task and keeps the current step, eligibility and next action visible. Give the principal action one clear position at the end of each form.

The public reference shows a roughly 109px blue utility area and 59px white navigation row at a 1200px desktop viewport, with navy headings, italic uppercase public page titles, white forms and color bands. The public stylesheet defines TT Commons, Playfair Display and a range of DMV blues, mint and gold. Implement the design below with a solid navy masthead, compact navigation, sentence-case titles, rectangular controls and a service-first home layout. These measurements are implementation tokens. [Official home reference](assets/screenshots/home-desktop.png) · [Official public stylesheet](https://www.dmv.ca.gov/portal/wp-content/themes/dmv/dist/css/style.css)

## 2. Color palette and roles

| Role | Token | Use |
| --- | --- | --- |
| Brand/navy | `#163159` | Masthead, large headings, current navigation |
| Canvas | `#F7FAFC` | Page background and quiet content groups |
| Surface | `#FFFFFF` | Cards, forms, nav strip and table |
| Body | `#394655` | Paragraphs, labels and table text |
| Secondary | `#5D6C7A` | Help text, dates and breadcrumb ancestors |
| Action/link | `#0B669E` | Primary buttons, links and selected controls |
| Action hover | `#0A4A68` | Hover fill for primary actions |
| Focus | `#0077C8` | Visible focus ring on light surfaces. Use `#FFD457` on the masthead. |
| Accent | `#FFD457` | Left rule on eligibility and processing notices |
| Border | `#D3D8DD` | Card outlines, separators and grid lines |
| Input border | `#7E8993` | Form fields, inactive choices and outlined controls |
| Selected surface | `#EDF4F8` | Selected choice, current step and service grouping |
| Success | `#006953` on `#D3EEE7` | Saved confirmation and Completed |
| Pending / warning | `#6B490C` on `#FFF6DD` | Submitted and eligibility notices |
| Error | `#B91818` on `#FDF0EC` | Invalid field, blocked action or error summary |
| Neutral status | `#394655` on `#E9EBEE` | Cancelled and historical metadata |

## 3. Typography rules

Use locally bundled Source Sans 3 and Playfair Display. Reserve serif display type for the page title and landing sections. Use tabular numerals for fees and times.

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Page H1 | Playfair Display, Georgia, serif | 42px desktop, 32px mobile | 600 | 1.15 | `-0.015em` |
| Section H2 | Playfair Display, Georgia, serif | 28px desktop, 24px mobile | 600 | 1.2 | `normal` |
| Form and card H3 | Source Sans 3, system-ui, sans-serif | 22px | 700 | 1.25 | `normal` |
| Body | Source Sans 3, system-ui, sans-serif | 17px | 400 | 1.5 | `normal` |
| Navigation and buttons | Source Sans 3, system-ui, sans-serif | 16px | 650 or 700 | 1.25 | `normal` |
| Labels | Source Sans 3, system-ui, sans-serif | 16px | 650 or 700 | 1.3 | `normal` |
| Helper text, status and breadcrumbs | Source Sans 3, system-ui, sans-serif | 14px | 400 for help, 600 for status | 1.4 | `normal` |

## 4. Spacing and layout

- **Header.** Use a 72px solid masthead with a readable California DMV wordmark on the left and MyDMV on the right. Place a 52px white primary nav row beneath with Online Services, Vehicle Registration, Appointments and Locations. Active items have a 3px bottom rule. Render a skip link on focus.
- **Main grid.** Use a 1120px content maximum, 32px desktop gutters and 20px mobile gutters. Breadcrumbs begin 24px below nav. Leave 16px from breadcrumbs to the page title and 24px from the title to the first content block. Use 44px vertical gaps between main sections.
- **Home.** Use one title band and a local search field. The three primary service cards fill one row with a 20px gap and logical keyboard order. Use 24px card padding and align action labels to the baseline. The quick tasks fit above the fold at a typical 1280×800 desktop viewport.
- **Service introductions.** Use a two-column content grid with a 2:1 ratio and 24px gap. Put the main action below the lead and the requirements in an adjacent surface. Put eligibility details and help beneath the introduction.
- **Transactions.** Center a form up to 760px wide. Appointment scheduling can pair an office/date pane with a 264px details sidebar and 24px gap. Keep lookup fields in up to two columns. Use a max width of 440px for short inputs. Show 20px between field groups and 24px before actions.
- **Mobile.** At 760px collapse primary nav into a button-controlled menu, reduce masthead to 64px and stack cards, panels, label/value rows and sidebars. At 390px allow step labels to wrap and use stacked cards for history lists. Controls should have at least 44px hit area. Keep horizontal overflow within a visual region such as the appointment calendar if needed.

## 5. Component patterns

| Component | Properties and behavior |
| --- | --- |
| Primary button | Blue fill, white text, `min-height: 44px`, `padding: 10px 20px`, `border: 1px solid transparent`, `border-radius: 6px`. Hover uses dark teal. Disabled uses neutral border and subdued text. |
| Secondary and tertiary actions | Secondary uses a white fill, 1px action-blue border and blue text with matching radius and height. Text links stay underlined with a visible focus outline. Use a clear label on each submit, e.g. Confirm Appointment, Pay or Submit Address Change. |
| Inputs and selects | White surface, 1px border, `border-radius: 4px`, `min-height: 46px`, `padding: 10px 12px`. Place labels above and helper text below. Link errors and help with `aria-describedby`, set `aria-invalid` on errors, and focus the first invalid control on failed submit. |
| Focus | `outline: 2px solid var(--focus-color)` and `outline-offset: 3px`. Keep focus visible against both selected and inactive surfaces. |
| Service cards and notices | Card has a 1px border, 8px radius and 24px padding. A notice uses a 4px left rule, 16px padding and a concise heading only when needed. Use readily identifiable label text for status. |
| Choice cards and time slots | Button, radio or checkbox controls with real selected/disabled semantics. Use a 2px action outline and selected fill for active choices. Show full office details in the card, and time availability in a date-labelled group. |
| Wizard progress and review | Use an ordered list of named steps, marking the active step with `aria-current="step"`. Use a definition list for selected values and a table for itemized fees. Keep edit links adjacent to the group they edit. Render confirmations as a heading, reference code, saved details and a next-step link. |
| FAQ and inline help | Use a button-triggered disclosure with correctly synchronized expanded state. Keep VIN and HIN labels and the supporting example visible to the user when opened. |
| Confirmation dialog | Use a modal with an accessible title and description, `max-width: 460px`, 24px padding and 8px radius. Focus the safe dismissal choice first, support Escape, contain keyboard focus and restore it to the trigger on dismissal. Leave the appointment card available for status feedback when confirmed. |

## 6. Shadow and elevation

Use `0 2px 8px rgba(22,49,89,0.07)` only on raised service cards. Keep transactional surfaces flat with a visible border. Use `0 12px 32px rgba(22,49,89,0.20)` for the cancellation dialog and `rgba(22,49,89,0.45)` for its backdrop.
