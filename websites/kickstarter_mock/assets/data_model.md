# Creator workspace state model

`createInitialData()` returns a fresh object with keys `account`, `projects`, `rewards`, `backers`, `surveys`, `surveyResponses` and `updates`. Every key except `account` is an array. This is the planned persistence contract. The implementation documents the final contract in `SCHEMA.md`.

## Common formats

- IDs are nonempty strings. Fixed seed IDs use descriptive prefixes. New records receive a unique ID on their first successful mutation, with the same ID retained on later mutations.
- Creator-owned records use `createdBy` and `updatedBy` as account IDs and `createdAt` and `updatedAt` as ISO 8601 strings. Set both actors and timestamps when creating a record. Subsequent mutations preserve creation metadata. New action timestamps come from `new Date().toISOString()`.
- Monetary amounts are JSON numbers in the associated project currency, with at most two decimal places. Currency is a three-letter code such as `USD`. Quantities are integers. `null` denotes an explicitly unset optional value.
- Seed timestamps are fixed. At render time, display optional results conservatively when an injected world omits fields or references. Preserve additional injected fields when applying a mutation. Keep temporary input, filters and selections in UI state.

## Account

`account` is `{ id: string, name: string, initials: string, studioName: string }`. Example:

```json
{"id":"creator-maya","name":"Maya Chen","initials":"MC","studioName":"Lantern House Studio"}
```

The account is used to display identity and attribute creator mutations. There is no account-edit workflow.

## Projects

A project record has `id`, `title`, `blurb`, `category`, `location`, `story`, `risks` (strings), `coverKey` (local art key or `null`), `currency` (string), `fundingGoal` (number or `null`), `deadline` (YYYY-MM-DD string or `null`), `status` (`draft`, `live`, `funded`, `unsuccessful`), `pledgedAmount` (number), `backerCount` (integer), `launchedAt` (ISO string or `null`) and common creator metadata. Interpret the chosen deadline through the end of that displayed calendar date. Display `pledgedAmount` and `backerCount` as collection summaries, which can describe a larger audience than the seeded backer roster.

```json
{"id":"project-floodlights","title":"After the Floodlights","blurb":"A documentary about the last year of a neighborhood football ground.","category":"Film & Video","location":"Cleveland, OH","story":"We follow the groundskeepers and players through one final season.","risks":"Festival submissions may shift the public premiere.","coverKey":"floodlights","currency":"USD","fundingGoal":22000,"deadline":"2026-12-15","status":"live","pledgedAmount":16420,"backerCount":287,"launchedAt":"2026-11-05T16:00:00.000Z","createdBy":"creator-maya","createdAt":"2026-10-05T15:00:00.000Z","updatedBy":"creator-maya","updatedAt":"2026-11-15T19:00:00.000Z"}
```

Lifecycle transitions from `draft` to `live` only through explicit launch. Require title, blurb, category, location, story, a currency, positive goal, future deadline and an active tier. Seed `funded` and `unsuccessful` projects directly. A past deadline can affect a time label, but writes no status transition.

## Rewards

A reward is `{ id, projectId, type, title, description, minimumPledge, estimatedDelivery, items, quantityLimit, claimedQuantity, deliveryMethod, shipping, status, archivedAt }` plus common creator metadata. `type` is `tier` or `add_on`. `estimatedDelivery` uses YYYY-MM. `items` contains `{ name: string, quantity: integer }`. `quantityLimit` is a positive integer or `null`; `claimedQuantity` is a nonnegative integer. `deliveryMethod` is `digital`, `shipping` or `pickup`. `shipping` contains `{ destination: string, amount: number }` for shipped rewards and is empty for the other methods. `status` is `active` or `archived`. `archivedAt` is an ISO string or `null`.

```json
{"id":"reward-floodlights-screening","projectId":"project-floodlights","type":"tier","title":"Screening Pass","description":"Two seats at the first community screening.","minimumPledge":35,"estimatedDelivery":"2027-04","items":[{"name":"Screening ticket","quantity":2}],"quantityLimit":80,"claimedQuantity":41,"deliveryMethod":"digital","shipping":[],"status":"active","archivedAt":null,"createdBy":"creator-maya","createdAt":"2026-10-07T15:00:00.000Z","updatedBy":"creator-maya","updatedAt":"2026-10-07T15:00:00.000Z"}
```

## Backers

A backer is `{ id: string, projectId: string, rewardId: string | null, name: string, pledgeAmount: number, paymentStatus: "pending" | "paid" | "failed", createdAt: string }`. Use fictional names. `rewardId` joins a tier from the same project. Backers provide a selectable project population and response context. Backer records are seeded or injected.

```json
{"id":"backer-thread-014","projectId":"project-common-thread","rewardId":"reward-thread-print","name":"Jules Navarro","pledgeAmount":48,"paymentStatus":"paid","createdAt":"2026-08-26T11:32:00.000Z"}
```

## Surveys

A survey is `{ id, projectId, title, intro, collectShippingAddress, questions, status, sentAt, sentBy, recipientBackerIds, recipientCount }` plus common creator metadata. `title` and `intro` are strings. `collectShippingAddress` is boolean. `status` is `draft` or `sent`. Unsent records initialize `sentAt` and `sentBy` to `null`, `recipientBackerIds` to `[]` and `recipientCount` to `0`.

Each question is `{ id: string, label: string, type: "short_text" | "single_choice", required: boolean, options: string[] }`. The array encodes question order. Require distinct nonempty choices for `single_choice` and use an empty choice list for `short_text`. Keep question IDs stable across edits and reordering. Only paid backers linked to a current-project reward are eligible to receive a survey. Resolve recipient IDs at confirmation, deduplicate, and store the same snapshot used for `recipientCount`.

```json
{"id":"survey-thread-fulfillment","projectId":"project-common-thread","title":"Choose your print","intro":"Help us prepare your parcel.","collectShippingAddress":true,"questions":[{"id":"question-thread-paper","label":"Which paper finish would you like?","type":"single_choice","required":true,"options":["Matte","Textured"]}],"status":"sent","sentAt":"2026-10-02T16:00:00.000Z","sentBy":"creator-maya","recipientBackerIds":["backer-thread-014","backer-thread-015"],"recipientCount":2,"createdBy":"creator-maya","createdAt":"2026-09-25T14:00:00.000Z","updatedBy":"creator-maya","updatedAt":"2026-10-02T16:00:00.000Z"}
```

## Survey responses

A response is `{ id: string, surveyId: string, backerId: string, status: "submitted", answers: { [questionId]: string }, shippingAddress: object | null, createdAt: string }`. `shippingAddress`, when present, is `{ line1, city, region, postalCode, country }` with string values. The creator views existing submissions. A recipient listed on a sent survey with no submitted response is pending. Use at most one seeded response per survey and backer pair.

```json
{"id":"response-thread-014","surveyId":"survey-thread-fulfillment","backerId":"backer-thread-014","status":"submitted","answers":{"question-thread-paper":"Matte"},"shippingAddress":{"line1":"142 Pine Lane","city":"Cleveland","region":"OH","postalCode":"44113","country":"US"},"createdAt":"2026-10-04T21:00:00.000Z"}
```

## Updates

An update is `{ id, projectId, title, body, audience, status, publishedAt, publishedBy }` plus common creator metadata. `title` and `body` are strings. `audience` is `public` or `backers_only`, and `status` is `draft` or `published`. Drafts use `null` for `publishedAt` and `publishedBy`. When publishing, use the current form values and update the same draft or create a published update directly. The published detail is read-only in this scope.

```json
{"id":"update-floodlights-01","projectId":"project-floodlights","title":"A rain delay and a new interview","body":"We spent Saturday under the south stand with groundskeeper Elena. Her stories will anchor the opening sequence.","audience":"backers_only","status":"published","publishedAt":"2026-11-12T17:00:00.000Z","publishedBy":"creator-maya","createdBy":"creator-maya","createdAt":"2026-11-11T13:00:00.000Z","updatedBy":"creator-maya","updatedAt":"2026-11-12T17:00:00.000Z"}
```

## Seed relationships

| Project ID | Portfolio role | Linked records for workflow tests |
| --- | --- | --- |
| `project-floodlights` | Live documentary, **After the Floodlights** | `reward-floodlights-screening` has claims, `reward-floodlights-poster` is an unclaimed add-on, `survey-floodlights-fulfillment` is draft, `update-floodlights-01` is published and `update-floodlights-02` is draft. |
| `project-night-bus` | Funded photo book, **Field Notes from the Night Bus** | `survey-night-bus-fulfillment` is a draft. Include paid, pending and failed rows so send eligibility can be asserted. |
| `project-common-thread` | Funded textile and illustration anthology, **The Common Thread** | `survey-thread-fulfillment` includes both `backer-thread-014` and `backer-thread-015`. Only the first of these recipients has a response. |
| `project-signal-grain` | Draft recording and liner-note collection, **Signal & Grain** | `reward-signal-grain-digital` is an active unclaimed tier. Tests can set a future deadline relative to the test clock before launch. |

Distribute the remaining campaigns across statuses and culture categories. Distribute 48 responses across eligible sent surveys, preserving at least one pending recipient where partial completion is demonstrated. Use fixed lists and deterministic iteration to populate the seed. Derive display statistics from the resulting records or project summary fields without persisting them on view.
