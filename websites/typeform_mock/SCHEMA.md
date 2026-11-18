# typeform_mock Schema

**Base URL** `http://localhost:5391/`  
**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the recorded baseline.

The top-level diff reports changed keys as `{modified: value}` and new keys as `{added: value}`. Identifiers are strings. Dates are UTC ISO 8601 strings, with `null` for unpublished dates. The seed uses fixed IDs. User actions generate IDs with the corresponding record prefix.

## State Schema

| Top-level key | Shape |
| --- | --- |
| `account` | `{ id, name, email, organization }`, signed-in account |
| `workspaces` | `[{ id, name }]` |
| `forms` | Form records described below |
| `responses` | `[{ id, formId, formVersion, endingId, actorId, status, createdAt, answers }]`. Version is a number, status is `completed`, and ending ID can be null for an injected snapshot without endings. |
| `responseExports` | `[{ id, formId, responseIds, format, actorId, createdAt }]`. Format is `csv` and response IDs are in CSV row order. |
| `activity` | `[{ id, action, formId, actorId, createdAt, entityIds? }]`. Entity IDs are strings. |

| Nested record | Shape |
| --- | --- |
| Form | `{ id, workspaceId, title, status, createdBy, updatedBy, createdAt, updatedAt, publishedAt, publishedVersion, publishedSnapshot, questions, endings, logic, duplicatedFromId? }`. Status is `draft`, `published`, or `closed`. Published version starts at zero and increases on publish. |
| Question | `{ id, title, description, type, required, choices }`. Type is `short_text`, `long_text`, `email`, `number`, `multiple_choice`, or `yes_no`. Required is a boolean. Question array order is the default flow. |
| Choice | `{ id, label }`. The choice ID is the saved answer value. |
| Ending | `{ id, title, description }`. The first draft or snapshot ending is the default. |
| Branch rule | `{ id, sourceQuestionId, condition, destination }`. Condition is `null` for a fallback. Destination is `{ type, id }`, where type is `question` or `ending`. Question targets must follow the source question. |
| Condition | `{ questionId, operator, value }`. Operators are `equals`, `not_equals`, `greater_than`, and `less_than`. The last two require a numeric question. Values are numbers, booleans, choice IDs, or strings according to question type. |
| Published snapshot | `null` or `{ title, questions, endings, logic }` from the time of publication. |
| Answer | `{ questionId, questionTitle, type, value, choiceLabel? }`. Value is a string, number, or boolean. Labels are recorded at submission. Unanswered questions are omitted. |

Conditional branches are evaluated in array order per source. A comparison against a skipped or unanswered question fails. The first matching condition wins, then the fallback if present, then the next question or default ending. Invalid injected branches are skipped during playback. Date filters compare the UTC date portion of the recorded submission.

### Default IDs

- Signed-in account `user_morgan`.
- Workspaces `ws_research`, `ws_people`, `ws_product`, `ws_marketing`, `ws_events`, and empty `ws_archive`.
- Published branch fixture `form_onboarding` in `ws_research`. Its questions are `q_onboarding_track`, `q_onboarding_blocker`, and `q_onboarding_followup`. Choice `c_need_help` matches `lr_onboarding_help` and routes to the blocker. Rule `lr_onboarding_fallback` routes to the follow-up. The default ending is `end_thanks`.
- Example draft `form_interviews`, closed form `form_routines`, historical response `response_onboarding_001`, export `export_onboarding`, and activity `activity_onboarding`.

## Minimal Inject Example

Send this as the `state` value of a `set` request with a fresh sid. Open `/workspaces/ws_audit?sid=<sid>` to see the empty workspace and create a form. Omitted top-level keys use defaults.

```json
{
  "workspaces": [{ "id": "ws_audit", "name": "Audit workspace" }],
  "forms": [],
  "responses": [],
  "responseExports": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful business action below writes the complete merged world once using `saveState`. In the table, **edit stamp** means `forms[].updatedAt` and `forms[].updatedBy`. An activity append has the full activity shape above. Actor IDs use the current account ID for admin actions and a generated `respondent_` ID for a public submission.

| User action | Exact writes | Activity action and entity IDs |
| --- | --- | --- |
| Create form | Append a complete draft to `forms[]`. Set the workspace, name, timestamps, creator and updater, zero version, null publish date and snapshot, empty questions and logic, and a default ending. | `form_created` |
| Rename form | `forms[].title` and edit stamp | `form_renamed` |
| Duplicate form | Append a complete draft to `forms[]`, with `duplicatedFromId`, fresh nested IDs and remapped references, null snapshot and publish date, zero version, and new creation and edit metadata. | `form_duplicated`, source form ID |
| Move form | `forms[].workspaceId` and edit stamp | `form_moved` |
| Confirm form deletion | Remove the form from `forms[]` and its submissions from `responses[]` | `form_deleted`, form ID and removed response IDs |
| Add, edit, duplicate, reorder, or remove question | `forms[].questions` and edit stamp. `forms[].logic` is also written when the change invalidates a branch. | `questions_updated`, affected question and removed rule IDs |
| Add, edit, set default, or remove ending | `forms[].endings` and edit stamp. `forms[].logic` is also written when an ending removal invalidates a branch. | `endings_updated`, affected ending and removed rule IDs |
| Add, edit, reorder, or remove rule | Ordered `forms[].logic` and edit stamp | `logic_updated`, affected rule ID |
| Publish | `forms[].status`, `forms[].publishedAt`, `forms[].publishedVersion`, `forms[].publishedSnapshot`, and edit stamp | `form_published` |
| Close responses or reopen | `forms[].status` and edit stamp | `form_closed` or `form_reopened` |
| Submit published form | Append one complete response to `responses[]` | |
| Confirm response deletion | Remove the confirmed response IDs from `responses[]` | `responses_deleted`, removed response IDs |
| Export CSV | Append one complete record to `responseExports[]` | |

First load establishes the Harbor baseline. Navigation, preview, unsaved inputs, filters, sorting, selection, details, branch diagram, and response summary are local UI state. Invalid and canceled actions produce no business write.
