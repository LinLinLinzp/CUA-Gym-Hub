# Yelp account research and feature inventory

Yelp helps consumers find local businesses, assess them through reviews, and act on their plans. This account-focused sandbox covers four jobs. A diner can find and manage a table. A homeowner can send and track a service inquiry. A repeat visitor can save a place for later or write about a visit. The account overview gives all four a common starting point.

## Public workflow references

- Business discovery uses a term and location. Listings generally expose categories, ratings, price, and address. Use this public data vocabulary for the local dataset. [Yelp Places API overview](https://docs.developer.yelp.com/docs/places-intro)
- Consumers start a review on a listing and manage their own reviews in the account. Yelp documents an 85-character posting minimum and an edit window. The sandbox lets users edit their own seeded reviews regardless of age so those records stay usable under Harbor's task clock. [Writing reviews](https://www.yelp-support.com/article/How-do-I-write-a-review?l=en_CA) · [Editing reviews](https://www.yelp-support.com/article/How-do-I-edit-one-of-my-reviews?l=en_US) · [Removing reviews](https://www.yelp-support.com/article/How-do-I-remove-a-review-that-I-posted?l=en_US)
- A saved business belongs to a named list, with Want to go as the default bookmark list. Saving from a listing and later removing from a collection both have direct account entry points. [Saving businesses](https://www.yelp-support.com/article/How-do-I-bookmark-or-save-businesses-that-I-d-like-to-review-or-try?l=felemenk) · [Creating lists](https://www.yelp-support.com/article/How-do-I-create-or-remove-a-list?l=en_US)
- Eligible businesses can accept project details through a quote request. Yelp surfaces sent requests through Inbox and provides project archiving. The sandbox consolidates the submitted request and its archive action under Quote requests and uses seeded records for any existing offer. [Requesting quotes](https://www.yelp-support.com/article/How-do-I-message-a-business-or-request-a-quote?l=en_US) · [Archiving projects](https://www.yelp-support.com/article/How-can-I-remove-projects-on-Yelp?app=1&l=en_US)
- A dining booking begins with date, time, and party size, then an available slot and guest details. Booking and cancellation are documented. The sandbox adds account-based rescheduling with the existing booking ID so users can manage the booking without external messages. [Making reservations](https://www.yelp-support.com/article/How-do-I-make-dining-or-nightlife-reservations-on-Yelp?l=en_CA) · [Reservation status and cancellation](https://docs.developer.yelp.com/docs/faq-1)

## Views and priorities

| Priority | View | Layout and interactions |
| --- | --- | --- |
| P0 | Account overview and navigation | White top bar, plum account navigation, illustrative introduction, four linked summaries, and recent activity derived from state |
| P0 | Loading, empty and missing-record states | Neutral boot feedback, route-specific empty messages, recovery links, and resilient layout under injected data |
| P1 | Discover and business detail | Filterable business results, then listing information, review history, and eligible actions in a second column |
| P1 | Reviews | Owned review rows with an inline action menu or labeled controls. Draft rating and text in a focused editor. Confirm removal with a reason |
| P1 | Bookmarks | Collection overview and searchable saved-business detail. Choose or create a collection from the save form and remove from the selected list |
| P1 | Quote requests | Active and Archived tabs with service, business, date, and status. Quote form supplies project scope and ZIP. Request detail provides archive and displays any seeded offer |
| P1 | Reservations | Upcoming and History views. Slot selection progresses to guest information and confirmation. Detail supplies modify and cancel controls |
| P2 | Sorting and related listings | List controls retain record identity, and related listings link to local detail pages |

The state model connects a signed-in user and businesses to reviews, collections, bookmarks, quote requests, and reservations through stable IDs. Lists and summary counts read these same records. Removed and cancelled entries keep their status and timestamps for Harbor. See [data_model.md](data_model.md) for fields and [DESIGN.md](../DESIGN.md) for the visual direction.

The account begins signed in. Authentication, uploads, payments, and external communications are outside this training flow. The design uses original illustrations and fictional details throughout.
