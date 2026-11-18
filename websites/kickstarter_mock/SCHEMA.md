# Kickstarter Mock Schema

**Base URL** `http://localhost:5366/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

The shared state manager merges an injected object over the seed, replaces arrays supplied by the injection and posts the full merged world once on the first boot in a browser profile for that session. The API retains the first stored baseline, which can be the original partial injection. `state_diff` reports the full value for each changed top-level key under `modified` or `added`. A successful business action sends the full next JSON state in one `set_current` POST and preserves unrelated records and fields. Reset restores the server's initial snapshot. Use a fresh session ID when testing a new injection because the browser caches previously loaded sessions.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `{ id, name, initials, studioName }` (strings). Identifies the signed-in creator and supplies the actor for mutations. |
| `projects` | array | `{ id, title, blurb, category, location, story, risks, coverKey, currency, fundingGoal, deadline, status, pledgedAmount, backerCount, launchedAt, ...metadata }`. `coverKey` is a local art key or null. `currency` is a currency code. `fundingGoal` is a number or null. `deadline` is a date or null. `pledgedAmount` is numeric and `backerCount` is an integer. `status` is `draft`, `live`, `funded` or `unsuccessful`. `launchedAt` is a timestamp or null. |
| `rewards` | array | `{ id, projectId, type, title, description, minimumPledge, estimatedDelivery, items, quantityLimit, claimedQuantity, deliveryMethod, shipping, status, archivedAt, ...metadata }`. `type` is `tier` or `add_on`. `minimumPledge` is a number. `estimatedDelivery` is `YYYY-MM`. `items` contains `{ name, quantity }` with integer quantities. `quantityLimit` is an integer or null and `claimedQuantity` is an integer. `deliveryMethod` is `digital`, `shipping` or `pickup`. `shipping` contains `{ destination, amount }` with numeric costs, or is empty. `status` is `active` or `archived`. `archivedAt` is a timestamp or null. |
| `backers` | array | `{ id, projectId, rewardId, name, pledgeAmount, paymentStatus, createdAt }`. `rewardId` is a tier ID or null. `pledgeAmount` is a number. `paymentStatus` is `pending`, `paid` or `failed`. |
| `surveys` | array | `{ id, projectId, title, intro, collectShippingAddress, questions, status, sentAt, sentBy, recipientBackerIds, recipientCount, ...metadata }`. `collectShippingAddress` is boolean. Each ordered question is `{ id, label, type, required, options }`. `type` is `short_text` or `single_choice`, `required` is boolean, and `options` is an array of strings. Survey `status` is `draft` or `sent`. `sentAt` and `sentBy` are a timestamp and account ID or null. `recipientBackerIds` is an array of unique backer IDs and `recipientCount` is its length. |
| `surveyResponses` | array | `{ id, surveyId, backerId, status, answers, shippingAddress, createdAt }`. `status` is `submitted`. `answers` maps question IDs to strings. `shippingAddress` is null or `{ line1, city, region, postalCode, country }` with string values. An eligible recipient with no submitted record is shown as pending. |
| `updates` | array | `{ id, projectId, title, body, audience, status, publishedAt, publishedBy, ...metadata }`. `audience` is `public` or `backers_only`. `status` is `draft` or `published`. `publishedAt` and `publishedBy` are a timestamp and account ID or null. |

IDs and textual fields are strings. A calendar date uses `YYYY-MM-DD` and timestamps are ISO 8601. Creator metadata is `createdBy`, `createdAt`, `updatedBy`, `updatedAt`. Inserts set both actors from `account.id` and both timestamps from the same new ISO timestamp. Edits retain creation metadata and set the update actor and timestamp. Project, reward, survey and update IDs are stable after insertion. Question IDs stay with the question when reordered.

### Default IDs

The seed includes 28 projects, 72 rewards, 96 backers, 24 surveys, 48 survey responses and 64 updates. The signed-in account ID is `creator-maya`. Representative fixed IDs for the main workflows are listed below.

| Project ID | Related fixed IDs |
| --- | --- |
| `project-floodlights` | `reward-floodlights-screening` (claimed tier), `reward-floodlights-poster` (unclaimed add-on), `survey-floodlights-fulfillment` (draft), `update-floodlights-01` (backers-only published), `update-floodlights-02` (draft), `update-floodlights-03` (public published) |
| `project-night-bus` | `reward-night-bus-book`, `survey-night-bus-fulfillment` (draft), `backer-night-bus-001` (paid and eligible) |
| `project-common-thread` | `reward-thread-print`, `survey-thread-fulfillment` (sent), `backer-thread-014` (answered), `backer-thread-015` (pending), `question-thread-paper`, `response-thread-014` |
| `project-signal-grain` | `reward-signal-grain-digital` (active tier on a draft project) |

## Minimal Inject Example

Send this JSON as the `state` object in an injection. It opens a one-project catalog with a draft campaign and empty related collections. Omitted account fields merge over the default creator.

```json
{
  "projects": [
    {"id": "project-local-example", "title": "Studio Print Dispatch", "status": "draft"}
  ],
  "rewards": [],
  "backers": [],
  "surveys": [],
  "surveyResponses": [],
  "updates": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Mutated collection and fields |
| --- | --- |
| Save a new project draft | Append `projects[]` with `id`, `title`, `blurb`, `category`, `location`, `story`, `risks`, `coverKey`, `currency`, `fundingGoal`, `deadline`, `status: "draft"`, `pledgedAmount: 0`, `backerCount: 0`, `launchedAt: null` and creator metadata. |
| Save campaign edits | Update `title`, `blurb`, `category`, `location`, `story`, `risks`, `coverKey`, `updatedBy` and `updatedAt` on the same project. A draft also updates `currency`, `fundingGoal` and `deadline`. |
| Confirm launch | Update the saved draft to `status: "live"` and set `launchedAt`, `updatedBy` and `updatedAt`. Requires the core campaign copy, currency, positive goal, current or future deadline and an active tier. |
| Save new reward | Append `rewards[]` with `id`, `projectId`, `type`, `title`, `description`, `minimumPledge`, `estimatedDelivery`, `items`, `quantityLimit`, `deliveryMethod`, `shipping`, `status: "active"`, `claimedQuantity: 0`, `archivedAt: null` and creator metadata. |
| Save reward edits | Update `type`, `title`, `description`, `minimumPledge`, `estimatedDelivery`, `items`, `quantityLimit`, `deliveryMethod`, `shipping`, `updatedBy` and `updatedAt` on the same unclaimed, unarchived reward. |
| Confirm reward archive | Set `status: "archived"`, `archivedAt`, `updatedBy` and `updatedAt` on the same unclaimed reward. |
| Save new survey draft | Append `surveys[]` with `id`, `projectId`, `title`, `intro`, `collectShippingAddress`, `questions`, `status: "draft"`, `sentAt: null`, `sentBy: null`, `recipientBackerIds: []`, `recipientCount: 0` and creator metadata. |
| Save survey edits | Update `title`, `intro`, `collectShippingAddress`, `questions`, `updatedBy` and `updatedAt` on the same draft. |
| Confirm survey send | Set `status: "sent"`, `sentAt`, `sentBy`, `recipientBackerIds`, `recipientCount`, `updatedBy` and `updatedAt` on the saved draft. Snapshot recipients are unique paid backers linked to a reward in the funded project. The action preserves `surveyResponses[]`. |
| Save new update draft | Append `updates[]` with `id`, `projectId`, `title`, `body`, `audience`, `status: "draft"`, `publishedAt: null`, `publishedBy: null` and creator metadata. |
| Save update draft edits | Update `title`, `body`, `audience`, `updatedBy` and `updatedAt` on the same draft. Draft status and null publication fields are retained. |
| Confirm update publication | Write the current `title`, `body`, `audience`, `status: "published"`, `publishedAt`, `publishedBy`, `updatedBy` and `updatedAt` on the same draft. Direct publication appends a record with those fields plus `id`, `projectId`, `createdBy` and `createdAt`. |

Browsing, filters, unsaved editing, validation errors, previews, cancelled confirmations and idle time produce zero `set_current` requests. Sent survey content and published update content remain read-only. The campaign preview includes active tiers and published public updates.

