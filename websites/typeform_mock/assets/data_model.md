# Planned Harbor state model

The fields below define the planned verifier-facing JSON. The implementation phase records the final fields and action effects in `SCHEMA.md`. All IDs are strings. All dates are ISO 8601 strings, with `null` for an absent date. Parenthetical dates below are abbreviated examples.

## Top-level data

| Key | Type | Example |
| --- | --- | --- |
| `account` | Account object | `{id:"user_morgan", name:"Morgan Ellis", email:"morgan@rowanstudio.example", organization:"Rowan Studio"}` |
| `workspaces` | Workspace array | `[{id:"ws_research", name:"Customer Research"}, {id:"ws_people", name:"People Operations"}]` |
| `forms` | Form array | `form_onboarding` in `ws_research` |
| `responses` | Response array | `response_onboarding_001` for `form_onboarding` |
| `responseExports` | Export array | `export_01`, covering `response_onboarding_001` |
| `activity` | Activity array | `activity_01`, action `form_published` |

## Forms and nested records

| Record | Fields and types | Example |
| --- | --- | --- |
| Form | `id`, `workspaceId`, `title`, `createdBy`, `updatedBy` strings. `status` enum `draft/published/closed`. `createdAt`, `updatedAt`, optional `publishedAt` dates. `publishedVersion` nonnegative integer. `questions`, `endings`, `logic` arrays. `publishedSnapshot` object or null. Optional `duplicatedFromId` string. | `form_onboarding`, `ws_research`, “Customer onboarding check-in”, `user_morgan`, `published`, version 1 |
| Question | `id`, `title`, `description` strings. `type` enum `short_text/long_text/email/number/multiple_choice/yes_no`. `required` boolean. `choices` array for multiple choice. Array order controls presentation. | `q_onboarding_track`, “Where are you in setup?”, multiple choice, required |
| Choice | `id`, `label` strings | `c_need_help`, “I need help” |
| Ending | `id`, `title`, `description` strings. First ending is the default. | `end_thanks`, “Thanks for sharing”, “Your feedback helps us improve onboarding.” |
| Logic rule | `id`, `sourceQuestionId` strings. `condition` object or null. `destination` target object. Array order controls matching priority per source. | `lr_onboarding_help`, `q_onboarding_track`, destination `{type:"question", id:"q_onboarding_blocker"}` |
| Condition | `questionId` string. `operator` enum `equals/not_equals/greater_than/less_than`. `value` string, number, or boolean. A null condition is a fallback. | `{questionId:"q_onboarding_track", operator:"equals", value:"c_need_help"}` |
| Target | `type` enum `question/ending`. `id` string. | `{type:"ending", id:"end_thanks"}` |
| Published snapshot | `title` string. Copies of `questions`, `endings`, and `logic` at publish. | Version 1 with three questions and a branch that skips the second question on fallback |

Condition questions may be the source or an earlier question. If the condition question was skipped, the comparison fails, including `not_equals`. An omitted fallback advances to the next question or to the default ending. If an injected target is missing, treat the rule as unusable and advance safely. The logic editor rejects invalid or backward targets and keeps one fallback per source, after keyed conditions. Keyed conditions compare booleans for yes/no, numbers for numeric questions, choice IDs for multiple choice, and text for text and email.

## Responses and actions

| Record | Fields and types | Example |
| --- | --- | --- |
| Response | `id`, `formId`, `endingId`, `actorId` strings. `formVersion` integer. `status` enum `completed` for new submissions. `createdAt` ISO date. `answers` array. | `response_onboarding_001`, `form_onboarding`, version 1, `end_thanks`, `respondent_001`, completed |
| Answer | `questionId`, `questionTitle`, `type` strings. `value` string, number, or boolean. Optional `choiceLabel` string. Skip unanswered questions. | `{questionId:"q_onboarding_track", questionTitle:"Where are you in setup?", type:"multiple_choice", value:"c_need_help", choiceLabel:"I need help"}` |
| Export | `id`, `formId`, `actorId` strings. `responseIds` string array. `format` enum `csv`. `createdAt` ISO date. | `export_01`, `form_onboarding`, `user_morgan`, `["response_onboarding_001"]`, csv |
| Activity | `id`, `action`, `formId`, `actorId` strings. `createdAt` ISO date. Optional `entityIds` string array. | `activity_01`, `responses_deleted`, `form_onboarding`, `user_morgan`, `["response_onboarding_001"]` |

## Business actions

Form and response records join by `formId`. A form links to a workspace via `workspaceId`. Answers remain interpretable when question titles or choice labels change. Activity and exports retain historical IDs even after the referenced records are removed.

- Create and duplicate stamp creator, updater, and both timestamps on the new draft. Rename, move, question or ending edits, logic saves, publish, close, and reopen stamp `updatedBy` and `updatedAt` on the affected form. Increment version only on publish and preserve the last published snapshot throughout draft editing.
- Append an `activity` record for each successful admin mutation of forms, questions, endings, or rules and for confirmed response deletion. Use explicit codes such as `form_created`, `form_renamed`, `form_duplicated`, `form_moved`, `form_deleted`, `questions_updated`, `endings_updated`, `logic_updated`, `form_published`, `form_closed`, `form_reopened`, and `responses_deleted`. Include affected nested or deleted IDs in `entityIds`, where applicable. Capture the IDs of responses removed by confirmed form deletion.
- Use `new Date().toISOString()` at the time of a successful user action. Use the signed-in account for admin actions and a generated anonymous respondent ID for local completion. A response submission or export is recorded by its own top-level record. CSV uses one row per response and answer columns keyed by question ID, with historical prompts available for deleted questions. Escape fields containing delimiters, quotes, or newlines and neutralize spreadsheet formula prefixes in text cells.
- Keep sorting, search, filtering, selection, dialog state, and preview answers in the UI. A failed validation or canceled confirmation leaves persisted state unchanged. Deleting draft questions and options updates draft logic references in the same save and preserves any published snapshot and collected answers.

## Seed

`createInitialData()` returns the six top-level keys above. Make the function deterministic with fixed IDs and fixed UTC timestamps, using realistic English titles and varied answer text. Keep the default payload compact enough for responsive state saves.

- Use six named workspaces, including Customer Research, People Operations, Product Operations, Marketing, Events, and an empty Archive workspace. Seed 30 forms across five active workspaces, with enough in the default workspace to test searching, status filtering, and sorting. Include published, draft, closed, and response-free examples.
- Seed at least 80 question records, with all six supported types. Seed at least 24 ordered logic rules across several forms. Include `form_onboarding` as a reproducible branch fixture with a matching “I need help” choice that routes to the blocker prompt, and a fallback that skips that prompt.
- Seed at least 72 responses across live and closed forms, with at least 24 on `form_onboarding`. Include spaced dates, varied responses, numeric and boolean answers, and omitted answers on skipped branches. Ensure each seeded response points to a form and valid published version.
- Include several historical CSV export and activity records tied to real seed IDs. Default examples and respondent details are synthetic. Use reserved domains such as `.example` for email addresses.
