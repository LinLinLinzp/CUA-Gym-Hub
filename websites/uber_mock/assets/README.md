# Uber rider account research

## Scope and riders

The account serves a signed-in rider reviewing past trips, gathering receipts and filing trip-specific support requests. Maya Chen is a synthetic Bay Area rider with both personal rides and contract work. The core tasks cover a rider reconciling charges, an independent consultant collecting documentation, and someone trying to recover an item or dispute a fee.

## Workflow findings and implementation priorities

| Priority | Area | Product behavior and local workflow |
| --- | --- | --- |
| P0 | Account shell | Overview links to the five account areas. Keep routing, session context, loading and error states consistent across the account. |
| P0 | Harbor state | Load session defaults or injected data before routing. Expose persisted business actions through the shared state API and document the observable fields. |
| P1 | Trips | Activity provides an entry point to a specific ride and its related receipt or help controls. This account adds a reporting-only expense profile assignment so the trip workflow has an observable, useful write. [Uber Help on trip history and receipts](https://help.uber.com/riders/article/getting-a-trip-receipt?nodeId=846f6cad-6f27-492a-9e0b-d2f056e1298e) |
| P1 | Receipts | Uber documents PDF downloads and resend from a trip. The local account offers both a receipt directory and a trip entry point. Resend queues a locally recorded request. [Uber Help on downloading or resending a receipt](https://help.uber.com/riders/article/getting-a-trip-receipt?nodeId=846f6cad-6f27-492a-9e0b-d2f056e1298e) |
| P1 | Expense profiles | Business profiles associate a work receipt address and payment method with rides. Owners can edit the name, email, payment preference, reporting frequency and provider. Keep the provider as a saved preference. [Creating a business ride profile](https://help.uber.com/en/riders/article/i%CC%87%C5%9F-yolculu%C4%9Fu-profili-olu%C5%9Fturma?nodeId=ca5a9884-4e4f-4649-82dd-1561c3db7e70), [Editing a ride profile](https://help.uber.com/riders/article/how-do-i-edit-my-uber-business-profile?nodeId=b936277f-f8c9-48cf-a125-20c42bd91f17) |
| P1 | Lost items | A completed trip supplies context for the item and callback contact. The local account records the request, shows it in history, and lets the rider mark the item returned. [Uber Help on reporting a lost item](https://help.uber.com/en/riders/article/forgot-something-in-an-uber-we-will-help-you-find-it?nodeId=feab9beb-9eac-47a2-b63a-6915d8821e1d) |
| P1 | Refunds | Fare review is trip-specific and covers issues such as duplicate charges, cancellation fees and an unexpected fare. The local form captures the affected receipt lines and amounts and leaves a submitted request for review. [Uber Help on charge issues](https://help.uber.com/en-GB/riders/article/i-had-a-different-issue-with-my-charge?nodeId=3ddb38fe-f029-41ea-b173-0c7831a27203) |

## Views

- **Overview** opens with a CSS route illustration and a concise account heading. The Recent trips ledger links to the full trip history. The adjacent links lead to receipts, profiles, lost items and refunds.
- **Trips** places search and filters above the ledger. A trip detail shows the pickup and destination in sequence, with fare and trip actions alongside.
- **Receipts** uses the same list controls and a paper-style detail view with a totals column. Download and resend are adjacent to the receipt heading. The charge snapshot retains its original billing data.
- **Expense profiles** shows profile details such as receipt email, payment preference, provider and reporting frequency. Add and Edit use the same labelled form. The list includes archived profiles for historical context.
- **Lost items and refunds** use searchable, status-filtered histories and detail pages keyed by case or request ID. Entry points on trip detail preselect the linked trip. The directory entry points offer a searchable picker for eligible trips.

See [the design guide](../DESIGN.md) for the original transit-ledger composition and local artwork. The research used public help text for workflow facts.

## Data and boundaries

One rider owns payment preferences, trips and expense profiles. Receipts point to trips and retain historical billing snapshots. Receipt actions, lost-item reports and refund requests record the relevant IDs and action details. [State model](data_model.md)

Booking and account access are outside the seed. Delivery, phone contact and settlement have local request states. This gives the verifier stable user actions to inspect and keeps the app usable offline.
