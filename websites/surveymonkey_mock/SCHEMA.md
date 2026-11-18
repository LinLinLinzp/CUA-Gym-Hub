# surveymonkey_mock Schema

**Base URL**: `http://localhost:5390/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`  
**State read**: `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`

`state_diff` reports each changed top-level key under `modified` or `added`. Use a fresh `sid` when injecting a new browser world. On first load for that session, injected arrays replace default arrays and injected objects merge with defaults. The template retains the first baseline for the session and restores it on reset. Reloads in an existing browser session can use its local cache.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `{ userId, workspaceName }` |
| `users` | array | `{ id, name, email? }` per user |
| `surveys` | array | `{ id, title, description?, ownerId, questions, copiedFromId?, createdAt, createdBy, updatedAt, updatedBy }` per survey |
| `collectors` | array | `{ id, surveyId, name, type, status, settings, closedAt, createdAt, createdBy, updatedAt, updatedBy }` per collector |
| `responses` | array | `{ id, surveyId, collectorId, status, respondent?, answers, submittedAt, createdAt, createdBy, updatedAt, updatedBy }` per response |
| `deletions` | array | `{ id, action, entityId, surveyId, removedSurveyIds, removedCollectorIds, removedResponseIds, createdAt, createdBy }` per deletion |
| `exports` | array | `{ id, surveyId, format, filters, responseIds, createdAt, createdBy }` per export |

IDs, actors and timestamps are strings. Timestamps use UTC ISO 8601. New user records use UUID-backed IDs with an entity prefix and timestamps from the runtime clock. `account.userId`, `surveys[].ownerId` and account-driven actor fields refer to `users[].id`. Account mutations use `account.userId`, with a fallback of `workspace-user` if absent. Web submissions use the actor `respondent`.

- A question is `{ id, prompt, type, required, options? }`. Types are `multipleChoice`, `checkboxes`, `rating`, and `openText`. Choice types carry ordered `{ id, label }` options. Question order is the array order.
- A collector belongs to `surveyId` and is `webLink` or `manual`. Its status is `open` or `closed`. `closedAt` is a timestamp when closed and `null` when open. `settings` contains boolean `anonymous`, boolean `allowMultipleResponses`, and string `closedMessage`. The single-response setting applies to identified web submissions in that collector. Survey status is derived from collector availability. A survey with no collectors is Draft.
- A response belongs to both `surveyId` and `collectorId`. Its status is `completed` or `partial`. `submittedAt` is a timestamp for completed records and `null` for partial records. Optional `respondent` contains optional `name` and `email`. Email is normalized for new identified entries. Anonymous entries omit the entire object.
- `responses[].answers` is an object keyed by question ID. The value is an option ID for multiple choice, an array of option IDs for checkboxes, an integer from 1 to 5 for rating, or text for open text. Unanswered keys are omitted.
- Deletion actions are `deleteSurvey`, `clearCollectorResponses`, `deleteCollector`, and `deleteResponse`. `entityId` is the target of the action. All three removed-ID fields are arrays, including when empty.
- Export `format` is `csv`. In `filters`, `collectorId` is a collector ID or `null`, `status` is `completed`, `partial` or `null`, and `query` is the trimmed search string. `responseIds` preserves CSV row order across all filtered pages.

### Default IDs

- The signed-in user is `usr-maya`. The other owners are `usr-daniel`, `usr-priya` and `usr-jordan`.
- The 30 survey IDs use `sv-` followed by `onboarding`, `renewal`, `engagement`, `benefits`, `training`, `support`, `partner`, `workshop`, `product`, `software`, `handoff`, `events`, `manager`, `access`, `vendors`, `portal`, `hybrid`, `research`, `reporting`, `docs`, `brand`, `community`, `newhire`, `operations`, `retreat`, `security`, `billing`, `leadership`, `mobile` or `budget`.
- The first 22 surveys have `col-<slug>-web`. The first 15 also have `col-<slug>-manual`. Onboarding adds `col-onboarding-archive`. `col-support-manual` starts with zero responses.
- The 64 response IDs follow `rsp-<slug>-<three-digit sequence>` starting at `001` within each survey. Onboarding has `001` through `014`, renewal through product each have `001` through `003`, and software through community each have `001` through `002`.
- Questions use `q-<slug>-approach`, `q-<slug>-score` and `q-<slug>-comment`, plus `q-onboarding-resources`. Approach choices use `opt-<slug>-1` through `opt-<slug>-3`. The resource choices use `opt-quickstart`, `opt-office-hours` and `opt-help-center`.

## Minimal Inject Example

Send this body to `POST /post?sid=<fresh-sid>` for an empty library with a synthetic account.

```json
{
  "action": "set",
  "state": {
    "account": { "userId": "usr-audit", "workspaceName": "Research Workspace" },
    "users": [{ "id": "usr-audit", "name": "Jamie Example" }],
    "surveys": [],
    "collectors": [],
    "responses": [],
    "deletions": [],
    "exports": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact state fields |
| --- | --- |
| Create survey | Append `surveys[]` with `id,title,description,ownerId,questions: [],createdAt,createdBy,updatedAt,updatedBy`. |
| Save survey details | Update `surveys[id].title,description,updatedAt,updatedBy`. |
| Add/edit question | Append or replace `surveys[id].questions[]` with `id,prompt,type,required,options?` and update survey `updatedAt,updatedBy`. Existing option IDs are kept when choices are changed in place. |
| Move or remove question | Reorder or remove from `surveys[id].questions[]` and update survey `updatedAt,updatedBy`. |
| Copy survey | Append `surveys[]` as a fresh draft with `copiedFromId`, regenerated question and option IDs, current owner and actor stamps. |
| Delete survey | Remove `surveys[id]` and linked `collectors[]` and `responses[]`. Append `deletions[]` with `action: deleteSurvey` and all removed IDs. |
| Create collector | Append `collectors[]` with `id,surveyId,name,type,status: open,settings,closedAt: null,createdAt,createdBy,updatedAt,updatedBy`. |
| Rename collector or save settings | Update `collectors[id].name` or `collectors[id].settings` respectively, plus `updatedAt,updatedBy`. |
| Close or reopen collector | Update `collectors[id].status,closedAt,updatedAt,updatedBy`. |
| Clear collector responses | Remove its `responses[]` and append `deletions[]` with `action: clearCollectorResponses`, `entityId` equal to the collector ID and all removed response IDs. |
| Delete empty collector | Remove `collectors[id]` and append `deletions[]` with `action: deleteCollector` and `removedCollectorIds: [id]`. |
| Submit web or manual response | Append `responses[]` with `id,surveyId,collectorId,status: completed,respondent?,answers,submittedAt,createdAt,createdBy,updatedAt,updatedBy`. |
| Edit response | Update `responses[id].answers,updatedAt,updatedBy`. |
| Delete response | Remove `responses[id]` and append `deletions[]` with `action: deleteResponse` and `removedResponseIds: [id]`. |
| Download CSV | Append `exports[]` with `id,surveyId,format,filters,responseIds,createdAt,createdBy`. |

Each successful mutation saves the entire next state once. Browsing, previewing, clipboard copying, filtering, invalid input, canceled dialogs and idle time add no business records.
