# Marriott Bonvoy account research

This account workspace serves two common tasks. A traveler managing an upcoming trip needs to find and edit the booking or make a request of the hotel. A member reconciling a completed trip needs to find the itemized hotel bill and see whether the stay and points posted.

## Workflow references

- **Stays (P1).** Marriott documents upcoming reservation changes and cancellations with a review step, plus past stays in account activity. Use the property, stay dates and confirmation number as the entry points for managing a reservation. [Change or cancel a reservation](https://help.marriott.com/s/article/change-cancel-marriott-reservation) · [Find past reservations](https://help.marriott.com/s/article/find-past-reservations-account)
- **Points (P1).** Account history exposes hotel-stay credits. Marriott directs members to file a Missing Stay Request from activity when eligible credit has failed to post after the waiting period, and requires the hotel bill as evidence. Seed eligible stays with bills and aged checkouts so a member can complete the workflow. Use the linked synthetic bill as evidence in the account UI. [Request missing stay credit](https://help.marriott.com/s/article/missing-marriott-stay-credit) · [Qualifying activity](https://help.marriott.com/s/article/what-is-qualifying-activity)
- **Folio (P1).** Marriott offers downloadable bills for qualifying stays and a copy request for bills that are unavailable online. Show both paths in the same searchable Folios area and link to bill detail from a Past stay. Use the seeded folio availability status to cover both cases reliably. [Access a hotel bill](https://help.marriott.com/s/article/access-marriott-hotel-bill)
- **Requests (P1).** Marriott describes requests such as extra towels or pillows in its mobile help. The account workspace makes stay service requests and submitted case history available together with folio-copy and missing-credit cases. The case history and self-service withdrawal are local workflow design decisions. [Marriott mobile service features](https://help.marriott.com/s/article/order-room-service-mobile-app)

## Screen inventory

| Priority | Screen | Layout and behavior |
| --- | --- | --- |
| P0 | Overview and navigation | Text brand in left rail, member status in the account header, balance and original artwork, followed by next stay and recent activity links. |
| P1 | Stays and stay detail | Status views, destination search and chronological controls. Detail anchors the dates, reservation details and context-specific actions. |
| P1 | Points | Balance above a ledger with signed points, labeled transaction types, filters and a missing-credit action. |
| P1 | Folios and folio detail | Bill lookup by property or identifier. Detail shows charges and totals plus the appropriate download or copy action. |
| P1 | Requests and request detail | Filterable cases and a request form with stay context. Detail shows case status, related records and history. |

The overview, list controls, detail pages and dialogs use the original visual system in [DESIGN.md](../DESIGN.md). All imagery should be created for the app and kept local.

The [data model](data_model.md) links the member’s stays to points entries, folios, requests and action records by id. The account starts signed in so the test task can begin with travel management. Hotel booking, payments, login, outbound support messages and production account access are outside the account workflow.
