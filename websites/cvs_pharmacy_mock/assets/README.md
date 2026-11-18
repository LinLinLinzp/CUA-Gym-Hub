# CVS Pharmacy research and handoff

This signed-in account workspace lets a household member inspect prescriptions, request refills, check in for an existing pickup, and manage vaccine appointments. The default user, Morgan Ellis, manages their own profile and two linked patients. The main use cases are checking a family member’s refill history, preparing for an upcoming pharmacy pickup, and selecting a vaccine visit that fits the household schedule.

## Findings from public CVS documentation

- Prescription Management groups current prescriptions, history, and family records. The history view covers refill information, last fill, and amounts paid, with patient and date filters. The help material also describes hiding older prescriptions from the regular list. [Managing prescriptions](https://www.cvs.com/retail/help/help-subtopic-managing-prescriptions) · [Viewing prescription history](https://www.cvs.com/retail/help/help-subtopic-view-print-prescription-history)
- The refill journey calls for choosing eligible prescriptions and a store and pickup time. Too-early fills and unavailable refills need a legible explanation. CVS surfaces the status of a pickup refill order with prescription details. [Refilling prescriptions](https://www.cvs.com/retail/help/help-subtopic-refilling-prescriptions) · [Order status and tracking](https://www.cvs.com/retail/help/help-subtopic-order-status-tracking)
- CVS describes a pickup credential shown to pharmacy staff at the counter or drive-thru. The planned check-in is an explicit local account action that records arrival and pickup method. [Online prescriptions and pickup](https://www.cvs.com/content/prescriptions-online)
- CVS describes choosing a pharmacy based on vaccine availability and selecting up to three vaccines for one visit. The planned account gives booked visits a confirmation code and offers local rescheduling and cancellation. [Vaccine scheduling](https://www.cvs.com/immunizations/get-vaccinated)

## Feature inventory and layouts

| Priority | Surface | Layout and interaction |
| --- | --- | --- |
| P0 | Shared account shell | Left navigation rail, top account context, keyboard access, reloadable routes, and session-aware links. |
| P0 | Overview | Welcome panel with original illustration, ready pickup and refill previews, and an upcoming visit panel. Each preview links into its full workflow. |
| P1 | Prescriptions and history | Search and patient/status controls above a readable list. Detail pairs medication and store information with refill eligibility and hide/restore actions. History shows fill rows with patient and date filters. |
| P1 | Refill request | Eligible selection, store and pickup window, review summary, and linked receipt. |
| P1 | Pickup | Status groups and a detail page with pickup window, location, item summary, and ready-order check-in. |
| P1 | Vaccine scheduling | Upcoming and past groups, patient and vaccine selection, matching pharmacies, time picker, and receipt. |
| P1 | Appointment changes | Appointment detail, a time picker for rescheduling, and separate cancellation confirmation. |
| P2 | Print history | Reuses the filtered prescription history with print styling. |

## Data and assets

Patients link prescription, fill, order, and appointment records. Stores define reference data and recurring time choices. Refill orders and pickups retain linked IDs and medication line snapshots. Each appointment retains its own confirmation code and lifecycle timestamps. See [the proposed state model](data_model.md) for fields and examples and [the implementation checklist](../TODO.md) for write behavior.

The account layout, styling, and local illustration direction are specified in [DESIGN.md](../DESIGN.md). Public CVS sources inform the workflows. Implementation uses local system typography, original illustrations, and synthetic account data. The scope is account management and appointment logistics. Authentication, billing, clinical decision support, messaging, and staff operations are outside that scope.
